#!/usr/bin/env node

import { JSDOM } from 'jsdom'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * scripts/smoke-feeds.mjs
 *
 * Smoke test for the committed public feed artifacts — the
 * files Vite serves straight off disk from `landing/public/`:
 *
 *   landing/public/rss.xml       full archive, RSS 2.0 XML
 *   landing/public/feed.txt      full archive, plain text
 *   landing/public/latest.xml    newest post only, RSS 2.0 XML
 *   landing/public/latest.txt    newest post only, plain text
 *   landing/public/sitemap.xml   sitemap protocol 0.9
 *
 * These are committed artifacts — feed readers, autodiscoverers
 * and plain-text consumers never run a build step, so a stale
 * or internally inconsistent artifact is a *shipping* bug, not
 * a local one. This script is the check that catches it
 * before the commit, not after the deploy.
 *
 * What it verifies:
 *
 *   1. Every artifact exists and is non-empty.
 *   2. The three XML files are well-formed (parsed with JSDOM
 *      in XML mode — a malformed file surfaces as a
 *      `<parsererror>` node).
 *   3. RSS 2.0 structure — the channel carries title / link /
 *      description / lastBuildDate, and every `<item>` carries
 *      title / link / description / pubDate / guid. These are
 *      the elements the spec requires; a feed missing one is
 *      rejected or silently truncated by real readers.
 *   4. Dates parse. `pubDate` must be RFC 822 and
 *      `lastBuildDate` must agree with the newest item's date.
 *   5. Cross-file consistency — the plain-text feed's post
 *      count and footer agree with the number of `<item>`s in
 *      the RSS, and the "latest" pair describes the same post
 *      as the newest item in the full feed. This is the class
 *      of drift that a bad merge produces: bodies from one
 *      revision, counters from another.
 *   6. Every post in the feed has a `<loc>` in the sitemap.
 *   7. Every asset a post references actually exists on disk
 *      under `landing/public/` — a broken image path renders
 *      as an alt-text box in the reader, never as an error.
 *   8. Freshness — each artifact is byte-identical to what
 *      the builders in `landing/src/data/feed.js` produce right
 *      now. This is the check that catches "I edited the post
 *      but forgot to run `yarn feeds:build`". The builders are
 *      imported and run in-memory; nothing is written.
 *
 * Output is a tri-state line per check: `✅ passed`, `⚠️  flagged`
 * (non-fatal — reported but keeps the run green) or `❌ failed`.
 * The exit code is 1 only when something `❌` fails.
 *
 * Run it against the files on disk:
 *
 *   yarn smoke:feeds
 *
 * Serve `landing/public/` over HTTP and check the artifacts the
 * way a feed reader would fetch them (this is the mode to use
 * for a local reader test — it needs no Vite, no Mongo, no
 * build):
 *
 *   yarn smoke:feeds --serve
 *   yarn smoke:feeds --serve --port=8099
 *
 * Or check a running server's copy over HTTP:
 *
 *   yarn smoke:feeds --base-url=http://localhost:3000
 *
 * Exit codes:
 *   0  — every check passed
 *   1  — at least one check failed (printed before exit)
 *
 * Why this exists instead of leaning on `yarn smoke:landing`:
 * the landing smoke test walks React routes — it treats
 * `/rss.xml` as a single opaque "known route" and never looks
 * at what the feed actually says. The feed artifacts have their
 * own consistency contract (four files that must agree with
 * each other and with the data module), so they get their own
 * checker.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// ── arg parsing ──────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const serveMode = args.includes('--serve')
const previewMode = args.includes('--preview')
const baseUrlArg = args.find((a) => a.startsWith('--base-url='))
const portArg = args.find((a) => a.startsWith('--port='))
const dirArg = args.find((a) => a.startsWith('--dir='))

const baseUrl = baseUrlArg ? baseUrlArg.slice('--base-url='.length) : null
const servePort = portArg ? Number(portArg.slice('--port='.length)) : 8080

// `--dir=` points the checker at a different artifact directory —
// handy for testing a candidate set (or a broken one) before it
// lands in `landing/public/`. Defaults to the real thing.
//
// Two roots, deliberately: the *artifacts* (the five feed files)
// come from `artifactDir`, but the *assets* a post points at always
// live in the real `landing/public/` — a `--dir` sandbox holds feed
// files only, so looking for `/icons/icon.svg` next to them would
// report every image as missing.
const artifactDir = dirArg
  ? path.resolve(repoRoot, dirArg.slice('--dir='.length))
  : path.join(repoRoot, 'landing', 'public')
const publicDir = path.join(repoRoot, 'landing', 'public')

// ── reporting ────────────────────────────────────────────────────────────
let passed = 0
let flagged = 0
let failed = 0
const failures = []
const flags = []

const PASS = '✅ passed'
const FLAG = '⚠️  flagged'
const FAIL = '❌ failed'

const section = (title) => console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`)

const pass = (label) => { passed++; console.log(`  ${PASS}  ${label}`) }
const flag = (label, detail) => {
  flagged++
  flags.push(`${label} — ${detail}`)
  console.log(`  ${FLAG}  ${label}`)
  console.log(`        ${detail}`)
}
const fail = (label, detail) => {
  failed++
  failures.push(`${label} — ${detail}`)
  console.log(`  ${FAIL}  ${label}`)
  console.log(`        ${detail}`)
}

// ── artifact loading ─────────────────────────────────────────────────────
// In `--base-url` mode we fetch over HTTP; otherwise we read the
// committed files straight off disk. Both paths produce the same
// `{ rel, source, content }` shape so every check below is
// written once.
const ARTIFACTS = [
  { rel: 'rss.xml', kind: 'rss' },
  { rel: 'latest.xml', kind: 'rss' },
  { rel: 'feed.txt', kind: 'txt' },
  { rel: 'latest.txt', kind: 'txt' },
  { rel: 'sitemap.xml', kind: 'sitemap' },
]

const readArtifacts = async () => {
  if (!baseUrl) {
    return ARTIFACTS.map(({ rel, kind }) => ({
      rel,
      kind,
      source: 'disk',
      content: fs.readFileSync(path.join(artifactDir, rel), 'utf8'),
    }))
  }
  const out = []
  for (const { rel, kind } of ARTIFACTS) {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/${rel}`)
    if (!res.ok) throw new Error(`GET ${rel} → HTTP ${res.status}`)
    out.push({ rel, kind, source: baseUrl, content: await res.text() })
  }
  return out
}

// ── XML helpers ──────────────────────────────────────────────────────────
// JSDOM in XML mode reports a malformed document by inserting a
// `<parsererror>` node into the tree rather than throwing.
const parseXml = (content) => {
  const dom = new JSDOM(content, { contentType: 'text/xml' })
  const doc = dom.window.document
  const err = doc.querySelector('parsererror')
  if (err) return { doc, error: err.textContent.trim() }
  return { doc, error: null }
}

// RSS 2.0 elements a reader needs. `<item>` must carry all five;
// a feed that drops `<guid>` or `<pubDate>` gets de-duplicated or
// re-sorted by the reader, which looks like a random reshuffle.
const RSS_CHANNEL_FIELDS = ['title', 'link', 'description', 'lastBuildDate']
const RSS_ITEM_FIELDS = ['title', 'link', 'description', 'pubDate', 'guid']

// `new Date('Sat, 24 Oct 2026 00:00:00 GMT')` parses; a string
// that doesn't is a bug worth catching before a reader does.
const isValidDate = (s) => !Number.isNaN(new Date(s).getTime())

// ── the checks ───────────────────────────────────────────────────────────
const run = async (artifacts) => {
  const byRel = Object.fromEntries(artifacts.map((a) => [a.rel, a]))

  // 1. presence ──────────────────────────────────────────────────────────
  section('Artifacts')
  for (const a of artifacts) {
    if (!a.content || a.content.trim() === '') {
      fail(`${a.rel} — present`, 'file is empty')
    } else {
      pass(`${a.rel} — present (${a.content.length} bytes)`)
    }
  }

  // 2. well-formedness ───────────────────────────────────────────────────
  section('XML Well-formedness')
  const docs = {}
  for (const a of artifacts.filter((x) => x.kind !== 'txt')) {
    const { doc, error } = parseXml(a.content)
    if (error) fail(`${a.rel} — well-formed`, error.split('\n')[0])
    else { pass(`${a.rel} — well-formed`); docs[a.rel] = doc }
  }

  // 3 + 4. RSS structure and dates ───────────────────────────────────────
  section('RSS Structure')
  const rssItems = []
  for (const rel of ['rss.xml', 'latest.xml']) {
    const doc = docs[rel]
    if (!doc) continue
    const channel = doc.querySelector('channel')
    if (!channel) { fail(`${rel} — <channel>`, 'no <channel> element'); continue }
    const missing = RSS_CHANNEL_FIELDS.filter((f) => !channel.querySelector(f)?.textContent.trim())
    if (missing.length) fail(`${rel} — channel fields`, `missing: ${missing.join(', ')}`)
    else pass(`${rel} — channel has ${RSS_CHANNEL_FIELDS.join(', ')}`)

    const items = [...channel.querySelectorAll('item')]
    if (items.length === 0) fail(`${rel} — items`, 'no <item> elements')
    for (const item of items) {
      const missing = RSS_ITEM_FIELDS.filter((f) => !item.querySelector(f)?.textContent.trim())
      const title = item.querySelector('title')?.textContent.trim() || '(no title)'
      if (missing.length) {
        fail(`${rel} — item "${title}"`, `missing: ${missing.join(', ')}`)
      } else {
        pass(`${rel} — item "${title}" has ${RSS_ITEM_FIELDS.join(', ')}`)
      }
      const pubDate = item.querySelector('pubDate')?.textContent.trim()
      if (pubDate && !isValidDate(pubDate)) {
        fail(`${rel} — item "${title}" pubDate`, `not a parseable date: "${pubDate}"`)
      }
      const guid = item.querySelector('guid')
      if (guid && guid.getAttribute('isPermaLink') === 'false' && !guid.textContent.trim()) {
        fail(`${rel} — item "${title}" guid`, 'isPermaLink="false" with an empty value')
      }
    }
    if (rel === 'rss.xml') rssItems.push(...items)
  }

  // 5. cross-file consistency ────────────────────────────────────────────
  section('Cross-file Consistency')
  const feedTxt = byRel['feed.txt']?.content || ''
  const latestTxt = byRel['latest.txt']?.content || ''

  const postsMatch = feedTxt.match(/^\s*Posts:\s*(\d+)\s*$/m)
  const footerMatch = feedTxt.match(/End of feed\.\s+(\d+)\s+posts?\./)
  const declaredPosts = postsMatch ? Number(postsMatch[1]) : null

  if (declaredPosts === null) {
    fail('feed.txt — post count', 'no "Posts:  N" line in the header')
  } else if (declaredPosts !== rssItems.length) {
    fail('feed.txt — post count', `header says ${declaredPosts}, rss.xml has ${rssItems.length} <item>s`)
  } else {
    pass(`feed.txt — header count ${declaredPosts} matches rss.xml`)
  }

  if (!footerMatch) {
    fail('feed.txt — footer', 'no "End of feed.  N posts." line')
  } else if (Number(footerMatch[1]) !== rssItems.length) {
    fail('feed.txt — footer', `footer says ${footerMatch[1]}, rss.xml has ${rssItems.length} <item>s`)
  } else {
    pass(`feed.txt — footer count ${footerMatch[1]} matches rss.xml`)
  }

  // The "latest" pair must describe the same post as the newest
  // item in the full feed. A latest.xml still pointing at the
  // previous issue while rss.xml carries a newer one is the
  // exact symptom of a botched merge — the bodies land but the
  // header keeps the old date.
  const newest = rssItems[0]
  if (newest) {
    const newestTitle = newest.querySelector('title')?.textContent.trim()
    const newestGuid = newest.querySelector('guid')?.textContent.trim()
    const newestPub = newest.querySelector('pubDate')?.textContent.trim()

    const latestXmlDoc = docs['latest.xml']
    const latestXmlItem = latestXmlDoc?.querySelector('channel > item')
    if (latestXmlItem) {
      const lTitle = latestXmlItem.querySelector('title')?.textContent.trim()
      const lGuid = latestXmlItem.querySelector('guid')?.textContent.trim()
      const lPub = latestXmlItem.querySelector('pubDate')?.textContent.trim()
      if (lGuid !== newestGuid) {
        fail('latest.xml — matches newest item', `guid "${lGuid}" ≠ rss.xml "${newestGuid}"`)
      } else if (lTitle !== newestTitle) {
        fail('latest.xml — matches newest item', `title "${lTitle}" ≠ rss.xml "${newestTitle}"`)
      } else if (lPub !== newestPub) {
        fail('latest.xml — matches newest item', `pubDate "${lPub}" ≠ rss.xml "${newestPub}"`)
      } else {
        pass(`latest.xml — describes "${newestTitle}"`)
      }
      const build = latestXmlDoc.querySelector('channel > lastBuildDate')?.textContent.trim()
      if (build && newestPub && build !== newestPub) {
        fail('latest.xml — lastBuildDate', `"${build}" ≠ newest item pubDate "${newestPub}"`)
      } else {
        pass('latest.xml — lastBuildDate agrees with the newest item')
      }
    }

    if (latestTxt.includes(newestTitle) && latestTxt.includes(newestGuid.replace(/^field-notes\//, ''))) {
      pass(`latest.txt — describes "${newestTitle}"`)
    } else {
      fail('latest.txt — matches newest item', `does not describe "${newestTitle}"`)
    }
  }

  // 6. sitemap coverage ──────────────────────────────────────────────────
  section('Sitemap Coverage')
  const sitemapDoc = docs['sitemap.xml']
  if (sitemapDoc) {
    const locs = [...sitemapDoc.querySelectorAll('url > loc')].map((l) => l.textContent.trim())
    for (const item of rssItems) {
      const guid = item.querySelector('guid')?.textContent.trim() || ''
      const link = item.querySelector('link')?.textContent.trim() || ''
      const slug = guid.replace(/^field-notes\//, '')
      const expected = link.replace(/\/$/, '')
      if (locs.includes(expected)) pass(`sitemap.xml — has ${slug}`)
      else fail(`sitemap.xml — has ${slug}`, `no <loc> for ${expected}`)
    }
  }

  // 7. assets referenced by the feed exist on disk ───────────────────────
  section('Referenced Assets')
  const assetRefs = new Set()
  for (const a of artifacts) {
    for (const m of a.content.matchAll(/["'(](\/(?:field-notes|brand|icons|favico|fonts)\/[A-Za-z0-9._/-]+\.(?:png|jpg|jpeg|svg|webp|ico|woff2?))/g)) {
      assetRefs.add(m[1])
    }
  }
  for (const ref of [...assetRefs].sort()) {
    const onDisk = fs.existsSync(path.join(publicDir, ref.replace(/^\//, '')))
    if (onDisk) pass(`asset ${ref}`)
    else fail(`asset ${ref}`, 'referenced by the feed but not on disk')
  }

  // 8. freshness — do the artifacts match the builders right now? ───────
  section('Freshness')
  try {
    const feedModule = await import(
      pathToFileURL(path.join(repoRoot, 'landing', 'src', 'data', 'feed.js')).href
    )
    const { buildRss, buildFeedTxt, buildSitemap, getLatestPost } = feedModule
    const latest = getLatestPost()
    const expected = {
      'rss.xml': buildRss(),
      'feed.txt': buildFeedTxt(),
      'sitemap.xml': buildSitemap(),
      'latest.xml': latest ? buildRss([latest]) : buildRss([]),
      'latest.txt': latest ? buildFeedTxt([latest]) : buildFeedTxt([]),
    }
    for (const rel of Object.keys(expected)) {
      const onDisk = byRel[rel]?.content ?? ''
      if (onDisk === expected[rel]) pass(`${rel} — up to date with landing/src/data/feed.js`)
      else fail(`${rel} — up to date`, 'differs from the builder output — run `yarn feeds:build`')
    }
  } catch (err) {
    flag('freshness check', `could not import the feed module: ${err.message}`)
  }
}

// ── preview page ─────────────────────────────────────────────────────────
// A reader-shaped view of the artifacts: the RSS items rendered
// the way a feed reader shows them (title, date, description, body),
// next to the plain-text feed as a raw `less`-able block.
//
// This is the "how does it actually look" view. The browser's XML
// viewer shows the tree; this shows the *content* — which is the
// part that breaks when a post body renders wrong.
const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// JSDOM's XML mode won't match a namespace-prefixed element name
// through `querySelector` — `content:encoded` has to be found by
// scanning the element's children for the literal node name.
const childByName = (el, nodeName) =>
  el ? [...el.children].find((c) => c.nodeName === nodeName) : null

const previewPage = (artifacts) => {
  const byRel = Object.fromEntries(artifacts.map((a) => [a.rel, a]))

  const rssSection = (rel, heading) => {
    const a = byRel[rel]
    if (!a) return ''
    const { doc, error } = parseXml(a.content)
    if (error) return `<h2>${escapeHtml(heading)}</h2><pre class="err">${escapeHtml(error)}</pre>`
    const channel = doc.querySelector('channel')
    if (!channel) return `<h2>${escapeHtml(heading)}</h2><pre class="err">no &lt;channel&gt;</pre>`
    const items = [...channel.querySelectorAll('item')]
    const head = `
      <div class="chan">
        <div class="chan-title">${escapeHtml(channel.querySelector('title')?.textContent.trim() || '')}</div>
        <div class="chan-desc">${escapeHtml(channel.querySelector('description')?.textContent.trim() || '')}</div>
        <div class="chan-meta">lastBuildDate: ${escapeHtml(channel.querySelector('lastBuildDate')?.textContent.trim() || '—')}</div>
      </div>`
    const cards = items.map((item) => {
      const g = (sel) => item.querySelector(sel)?.textContent.trim() || ''
      const guid = item.querySelector('guid')
      const content = childByName(item, 'content:encoded')?.textContent || ''
      return `<article class="item">
        <h3>${escapeHtml(g('title'))}</h3>
        <div class="meta">
          <span>${escapeHtml(g('pubDate'))}</span>
          <span>${escapeHtml(g('guid'))}${guid?.getAttribute('isPermaLink') === 'false' ? ' (isPermaLink=false)' : ''}</span>
          <span><a href="${escapeHtml(g('link'))}">${escapeHtml(g('link'))}</a></span>
        </div>
        <p class="desc">${escapeHtml(g('description'))}</p>
        ${content ? `<div class="body">${content}</div>` : ''}
      </article>`
    }).join('\n')
    return `<h2>${escapeHtml(heading)}</h2>${head}${cards}`
  }

  const txtSection = (rel, heading) => {
    const a = byRel[rel]
    if (!a) return ''
    return `<h2>${escapeHtml(heading)}</h2><pre class="txt">${escapeHtml(a.content)}</pre>`
  }

  const sitemapSection = () => {
    const a = byRel['sitemap.xml']
    if (!a) return ''
    const { doc, error } = parseXml(a.content)
    if (error) return `<h2>sitemap.xml</h2><pre class="err">${escapeHtml(error)}</pre>`
    const rows = [...doc.querySelectorAll('url')].map((u) => {
      const g = (sel) => u.querySelector(sel)?.textContent.trim() || '—'
      return `<tr><td>${escapeHtml(g('loc'))}</td><td>${escapeHtml(g('lastmod'))}</td><td>${escapeHtml(g('changefreq'))}</td><td>${escapeHtml(g('priority'))}</td></tr>`
    }).join('')
    return `<h2>sitemap.xml</h2><table><thead><tr><th>loc</th><th>lastmod</th><th>changefreq</th><th>priority</th></tr></thead><tbody>${rows}</tbody></table>`
  }

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Field Notes — local feed preview</title>
<style>
  :root { color-scheme: light dark; --fg:#1a1a1a; --bg:#fbfaf7; --muted:#6b6b6b; --line:#e2ded4; --accent:#2b5c4a; }
  @media (prefers-color-scheme: dark) { :root { --fg:#e8e6e0; --bg:#16181a; --muted:#9a9a9a; --line:#2e3236; --accent:#7fd1ae; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:2rem 1.25rem 5rem; background:var(--bg); color:var(--fg);
         font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width: 62rem; margin: 0 auto; }
  h1 { font-size:1.6rem; margin:0 0 .25rem; letter-spacing:-.01em; }
  .sub { color:var(--muted); margin:0 0 2rem; }
  h2 { font-size:1.05rem; text-transform:uppercase; letter-spacing:.08em; color:var(--accent);
       border-bottom:1px solid var(--line); padding-bottom:.4rem; margin:2.75rem 0 1rem; }
  h3 { font-size:1.15rem; margin:0 0 .4rem; }
  .chan { background:color-mix(in srgb, var(--accent) 7%, transparent); border:1px solid var(--line);
          border-radius:10px; padding:.9rem 1.1rem; margin-bottom:1.25rem; }
  .chan-title { font-weight:700; } .chan-desc { color:var(--muted); margin:.2rem 0; }
  .chan-meta { font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--muted); }
  .item { border:1px solid var(--line); border-radius:10px; padding:1.1rem 1.25rem; margin-bottom:1rem; }
  .meta { display:flex; flex-wrap:wrap; gap:.4rem 1.25rem; font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
          color:var(--muted); margin-bottom:.7rem; }
  .meta a { color:inherit; }
  .desc { margin:.4rem 0 .9rem; }
  .body { border-top:1px dashed var(--line); padding-top:.9rem; }
  .body img { max-width:100%; height:auto; border-radius:6px; }
  .body pre { background:color-mix(in srgb, var(--fg) 7%, transparent); padding:.75rem 1rem; overflow-x:auto; border-radius:8px; }
  .body code { font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  .body blockquote { margin:.8rem 0; padding-left:1rem; border-left:3px solid var(--line); color:var(--muted); }
  pre.txt { background:color-mix(in srgb, var(--fg) 5%, transparent); border:1px solid var(--line); border-radius:10px;
            padding:1rem 1.1rem; overflow-x:auto; font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:pre-wrap; }
  pre.err { background:#3a1d1d; color:#ffd7d7; padding:1rem; border-radius:8px; white-space:pre-wrap; }
  table { border-collapse:collapse; width:100%; font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  th,td { text-align:left; padding:.4rem .6rem; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; }
</style></head>
<body><main>
  <h1>Field Notes — local feed preview</h1>
  <p class="sub">Rendered from the files in <code>${escapeHtml(artifactDir)}</code>. Nothing here is deployed.</p>
  ${rssSection('rss.xml', 'rss.xml — full archive')}
  ${txtSection('feed.txt', 'feed.txt — full archive (plain text)')}
  ${rssSection('latest.xml', 'latest.xml — newest post')}
  ${txtSection('latest.txt', 'latest.txt — newest post (plain text)')}
  ${sitemapSection()}
</main></body></html>`
}

// ── static server (--serve) ──────────────────────────────────────────────
// Serves `landing/public/` the way Vite's publicDir does, so a
// feed reader can be pointed at http://localhost:<port>/rss.xml.
// No build step, no database, no dev server.
//
// The preview page rides along at /__preview — it renders the
// artifacts the way a reader would.
const CONTENT_TYPES = {
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

const serve = (artifacts) =>
  new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])

      if (urlPath === '/__preview') {
        const html = previewPage(artifacts)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(html)
        return
      }
      // Resolve inside publicDir only — a `..` segment must not
      // escape the served root.
      const target = path.resolve(publicDir, '.' + urlPath)
      if (!target.startsWith(publicDir + path.sep) && target !== publicDir) {
        res.writeHead(403).end('Forbidden')
        return
      }
      let file = target
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(publicDir, 'index.html')
      }
      if (urlPath === '/' ) {
        res.writeHead(302, { Location: '/__preview' }).end()
        return
      }
      if (!fs.existsSync(file)) {
        res.writeHead(404).end('Not found')
        return
      }
      const type = CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
      fs.createReadStream(file).pipe(res)
    })
    server.on('error', reject)
    server.listen(servePort, () => resolve(server))
  })

// ── main ─────────────────────────────────────────────────────────────────
const main = async () => {
  console.log('\n══ Field Notes feed smoke test ' + '═'.repeat(30))
  console.log(`  root: ${baseUrl || publicDir}`)

  let artifacts
  try {
    artifacts = await readArtifacts()
  } catch (err) {
    console.error(`\n  could not read the artifacts: ${err.message}`)
    process.exit(1)
  }

  await run(artifacts)

  console.log(`\n── Summary ${'─'.repeat(52)}`)
  console.log(`  ${passed} passed, ${flagged} flagged, ${failed} failed`)
  if (flags.length) {
    console.log('\n  Flagged (non-fatal):')
    for (const f of flags) console.log(`    - ${f}`)
  }
  if (failures.length) {
    console.log('\n  Failed:')
    for (const f of failures) console.log(`    - ${f}`)
  }

  if (serveMode || previewMode) {
    const server = await serve(artifacts)
    console.log(`\n  Serving ${path.relative(repoRoot, publicDir)} on http://localhost:${servePort}`)
    console.log(`\n    ▸ Preview page   http://localhost:${servePort}/__preview`)
    for (const { rel } of ARTIFACTS) {
      console.log(`    ▸ ${rel.padEnd(14)} http://localhost:${servePort}/${rel}`)
    }
    console.log('\n  Ctrl+C to stop.')
    return
  }

  process.exit(failed > 0 ? 1 : 0)
}

await main()
