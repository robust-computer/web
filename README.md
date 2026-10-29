<div align="center">
  <img src="landing/public/brand/banner2-cut.svg" width="560" alt="Robust Computer">
</div>

**Version 0.15.3**

Full-stack web app for Robust Computer's Marketing Site & API

## Tech stack

| Project | Stack | Dev Port | Purpose |
|---------|-------|----------|---------|
| `landing/` | React + Vite | 3000 | Marketing site |
| `server/` | Express + MongoDB | 5000 | API |

Package manager: **Yarn**

<div align="left">
  <img src="landing/public/icons/icon-var-installer.svg" width="200" alt="">
</div>

## Installation

```bash
yarn install
yarn install:all
yarn dev
```

Before `yarn dev` will boot the server, create your local env files at the
repo root. Copy the committed [`.env.example`](.env.example) and fill in real values:

```bash
cp .env.example .env.dev
cp .env.example .env.prod
```

The server selects between these via `NODE_ENV` (set by the
`scripts/dev.js` wrapper - see [Scripts](#Scripts)). The Vite app points `envDir` at the
repo root and reads whichever file the wrapper chose.

The file is shared by the server and `landing/`.

- **`.env.dev`** — local development values.
- **`.env.prod`** — reference / production-side script use. Real values live
  on Railway and Vercel

> NOTE: See [Environment Variables](#environment-variables) below for the full contract per project.

### Switching env at boot

```bash
yarn dev          # default — loads .env.dev (dev DB)
yarn dev:prod     # loads .env.prod (prod DB, prod URLs)
```

<div align="left">
  <img src="landing/public/icons/icon-var-tree.svg" width="200" alt="">
</div>

## Project Structure

```
robust-computer/
├── landing/                # Marketing site (React + Vite, port 3000)
│   ├── public/                  # Static assets (images, fonts, feed files, robots.txt, sitemap.xml)
│   ├── src/
│   │   ├── api.js               # fetch wrapper (api + ApiError)
│   │   ├── components/
│   │   │   ├── brand/           # Logo, Zer0Text
│   │   │   ├── modals/          # Modal
│   │   │   ├── sections/        # Page-level shells (Hero, Navbar, Footer, FieldNotes, ...)
│   │   │   ├── seo/             # SEO
│   │   │   └── ui/              # Generic primitives
│   │   ├── context/             # LocaleContext
│   │   ├── data/                # brand, feed, developerPreviews, issues/
│   │   ├── hooks/               # State + effects
│   │   ├── i18n/                # en, es, fr
│   │   ├── pages/               # Home, About, Contact, ...
│   │   ├── styles/              # index.css, colors.js, animations.js, ...
│   │   └── utils/               # Pure helpers
│   └── vite.config.js
│
│
├── scripts/                # Repo-root tooling (build-rss, dev, mailpit)
│
│
├── server/                 # API server (Express + MongoDB, port 5000)
│   └── src/
│       ├── middleware/          # rateLimit.js
│       ├── models/              # Enquiry, Subscriber, BugReport
│       ├── routes/              # contact, newsletter, bug-report
│       └── utils/
│           ├── email.js         # Mailer dispatcher
│           ├── newsletterBroadcast.js
│           └── email/           # layout, per-type templates, fonts
│
│
├── package.json            # root scripts, version controller
```

### Style Component Conventions
**Folders that produce visual UI. Each layer wraps the next.**

| Folder | Purpose |
|---|---|
| `pages/`    | Route-level components. Page-specific styled components live at the top, then a default export with hook calls → clean JSX return |
| `sections/` | Page-level shells composed of `ui/` primitives (landing: `Hero`, `Navbar`, `Footer`, `FieldNotes`) |
| `ui/`       | Reusable primitives. Must be generic — no project-specific knowledge |


Page-level components rule: Each file in `pages/` or `sections/` should contain _only_
- Imports
- page-specific `styled-components` (the ones that can't be promoted to `ui/`)
- a default export with **hook calls → clean JSX return**

If you find yourself writing a non-styled component, useEffect logic, a
helper function, or a state mutation inside a page, move it to
`hooks/`, `utils/`, or `context/` first.

### Logical Component Conventions
**Folders that produce behavior. Nothing in here renders JSX on its own.**

| Folder      | Purpose |
|-------------|---------|
| `hooks/`    | Page-level behavior (state + effects). Each page consumes a small number of focused hooks |
| `data/`     | brand, feed, developerPreviews, issues/ |
| `utils/`    | Pure helpers (formatters, validators, permission calculators) |
| Others      | `modals/` (reusable dialogs), `styles/` (design tokens), `middleware/`, etc. |

<div align="left">
  <img src="landing/public/icons/icon-var-script.svg" width="200" alt="">
</div>

## Scripts

### dev ([`dev.js`](/scripts/dev.js))

`yarn dev` boots `landing/` + `server/` together, defaulting to `.env.dev`. `yarn dev:prod` is shorthand for `--env=prod` and points the server at prod.

```bash
yarn dev          # .env.dev — dev DB, dev URLs
yarn dev:prod     # .env.prod — prod DB, prod URLs
```

### mail ([`mailpit.js`](/scripts/mailpit.js))

`yarn mail` boots Mailpit, a local SMTP catcher (UI on `:8025`, SMTP on `:1025`), so server emails land in an in-browser inbox during dev. The server's `config.js` auto-points at `localhost:1025` when `NODE_ENV=development`, no wiring required.

```bash
yarn mail         # foreground; Ctrl+C to stop
```

### feeds ([`build-rss.mjs`](/scripts/build-rss.mjs))

The feed files — RSS, plain text, sitemap, and the per-post social cards — are generated from the posts in `landing/src/data/feed.js` and committed to the repo, so they're easy to leave stale. `feeds:build` rewrites all of them in one pass; run it after editing a post. `feeds:broadcast` emails the subscribers. `feeds:preview` serves the result locally so you can read it the way a feed reader would, and `yarn smoke:feeds` checks that the committed files still agree with each other and with the posts.

```bash
yarn feeds:build          # write all feeds + sitemap + per-issue cards (no broadcast)
yarn feeds:broadcast-dev  # fire the broadcast against dev subscribers
yarn feeds:broadcast      # fire the broadcast against prod subscribers
yarn feeds:preview        # validate + serve a reader-shaped preview (localhost:8080/__preview)
```

### smoke ([`smoke-landing.mjs`](/scripts/smoke-landing.mjs), [`smoke-feeds.mjs`](/scripts/smoke-feeds.mjs), [`smoke-server.mjs`](/scripts/smoke-server.mjs))

Three headless checks for the dev stack. `smoke:landing` loads every page and confirms it renders, its buttons work, and its links point somewhere real. `smoke:feeds` confirms the committed feed files are valid, agree with each other, and still match the posts in the repo. `smoke:server` confirms the dev database is reachable and that Mailpit caught the test emails. The landing and feed checks read from disk by default — pass `--base-url=<url>` to check a running server instead.

```bash
yarn smoke:landing                          # every route renders, no dead links
yarn smoke:feeds                            # feed artifacts are valid, consistent, and fresh
yarn smoke:server                           # dev Mongo + Mailpit captures each send
```

<div align="left">
  <img src="landing/public/icons/icon-var-versioning.svg" width="200" alt="">
</div>

## Versioning

| Branch | Purpose |
|--------|---------|
| `feature:[feature-name]` | Feature development |
| `dev` | Integration, testing |
| `main` | Production releases |

### Release Flow
1. Create feature branch
2. Commit feature branch → merge to `dev`
2. Update version controllers on `dev` (`package.json`s + `README.md`)
3. Run `yarn smoke:landing` and `yarn smoke:server` to confirm stable 
2. Commit `dev` → Squash-merge `dev` to `main` with version tag
3. Fast-forward `dev` to `main`
4. Delete feature branch

> FORMAT: `MAJOR.MINOR.PATCH` (e.g., `v1.1.1`)

<div align="left">
  <img src="landing/public/icons/icon-var-deploy.svg" width="200" alt="">
</div>

## Deployment

| App | URL | Host |
|-----|-----|------|
| Landing | robust.computer | Vercel |
| API     | api.robust.computer | Railway |

Landing is a Vercel project rooted at `landing/`. The API is a Railway service rooted at `server/`.

> NOTE: Auto-deploys on push to `main`.

### Environment Variables

The full contract lives in [`.env.example`](.env.example). Each app reads its own vars through its own `config.js` — `landing/src/config.js` and `server/src/config.js`. `NODE_ENV` and `PORT` default to `'development'` / `5000` for bare-`node` startup, but Railway and `scripts/dev.js` set both in practice.

| Host | Variables |
|---|---|
| **Vercel** — Landing | `VITE_API_URL`, `VITE_LANDING_URL` |
| **Railway** — Server | `NODE_ENV`, `PORT`, `MONGODB_URI`, `LANDING_URL`, `API_URL`, `NEWSLETTER_ADMIN_SECRET` · prod: `RESEND_API_KEY` · opt.: `DKIM_DOMAIN`, `DKIM_KEY_SELECTOR`, `DKIM_PRIVATE_KEY` |
| **Local dev** — Server | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` · opt.: `MAILPIT_HTTP_PORT` |

> `RESEND_API_KEY` is required in production — `server/src/config.js` throws at boot without it. The `DKIM_*` trio is optional: when set, it uploads the key to Resend for the "Signed by: robust.computer" lock; until then Resend signs with `resend.dev`. In dev, `SMTP_*` points at Mailpit (`localhost:1025`); Mailpit ignores auth, so `SMTP_USER` / `SMTP_PASS` can be empty or any dummy value. `MAILPIT_HTTP_PORT` defaults to `8025` and `SMTP_PORT` to `1025` — override either in `.env.dev` when running Mailpit on a non-default port.
