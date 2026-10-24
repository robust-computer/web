/**
 * issues/002.js
 *
 * One Field Notes post. Exported as `issue002`. Same shape as
 * issue001: slug, title, issuePrefix, pubDate, author,
 * description, ogImage, twitterImage, body (markdown).
 *
 * Remember the second step: add the import and an entry in the
 * `feed` array in `data/feed.js`.
 */
export const issue002 = {
  slug: 'issue-002',
  title: 'Building in Public',
  issuePrefix: 'Issue 002',
  pubDate: '2026-10-24',
  author: 'Aeryn',
  description:
    'My experience getting this brand off the ground.',
  ogImage: '/field-notes/issue-002/og.png',
  twitterImage: '/field-notes/issue-002/twitter.png',
  body: `
My experience getting this brand off the ground

# Let's Take a Look

![IBM PC-compatible clones (circa 1990)](/field-notes/issue-002/computer.png)

### What Building in Public Means

Building in public means sharing the process of making something, not just the finished product. Progress, decisions, mistakes, and lessons, out in the open while they are still happening. This issue is my first honest attempt at it.

### Boom, That's My Brand!

**Picture this:** you paste a link into a chat or a post, and a clean preview appears: a logo, a title, a line of description. It looks like magic. Some scraper likely fetches a nice image from the page. **It is not magic.** Someone had to make every single piece of it, and that someone was me. Without that effort, the preview would be empty or broken, and if it were done lazily, it would look too small, pixelated, or missing entirely.

![Main Site's Link Preview Card](/field-notes/issue-002/metadata.png)
![Individual Slug's Preview Card](/field-notes/issue-002/metadata2.png)

## How It Actually Went

### It Started as a Doodle

Robust Computer began with the mascots, as a doodle. A CRT monitor for a head, no brand, no plan, just a character I liked drawing. From there, the brand slowly started to take shape.

![The First Drawing](/field-notes/issue-002/drawing.png)

### Then Came the Fonts

I have a lot of experience and a lot of opinions on type, so I went straight to fonts. I settled on a mix of IBM Plex Mono for the hard accents and Barlow for the bold lettering, and the brand started to feel real. I will spare you the full rant on serif versus sans-serif, but trust me, it was considered.

![Main Logo (Typeface)](/field-notes/issue-002/typeface.png)

### Redrawing Everything as SVG

My drawings from GIMP and my lettering from Canva were made of raster strokes, and raster strokes fall apart when you scale them. So I redrew every one of them as SVG because vectors go from a phone screen to a billboard without losing a pixel.

### SVGs on the Site, Then Back to PNGs

The SVGs went onto the site, where they looked great at every size. Then I hit the part nobody mentions: link previews, search engines, and social cards do not want vectors. They want PNGs. So after all that work going from raster to vector, I went right back to raster for the metadata.

## The Part Nobody Warns You About

### Vectors Versus Rasters

Here is the tension. SVGs are great on the page because they scale forever. But search engines and social platforms mostly do not render SVG in link previews. They want rasters, in very specific sizes, and one logo quietly becomes twenty files.

### One Logo, Twenty Files

The checklist I did not know I needed:

- The master SVGs for the site itself
- A favicon set in several sizes
- An Apple touch icon
- An OG image _(updatable via scripts + having different OGs for separate pages)_
- A Twitter card image _(same issues as OG images, but needs its own size and handling)_
- Square crops for places like Instagram and LinkedIn
- Meta titles and descriptions for every page
- A sitemap and a robots file
- Canonical URLs

And then you test how all of it renders on each platform, because they all crop a little differently.
Personally, I used [Outrank's metadata checker](https://www.outrank.so/seotools/website-metadata-checker) to test how my pages would appear on different platforms. Those are the screenshots above.

## Taming the Pile

### One Source of Truth

The first instinct is to dump everything straight into the \u0060public\u0060 folder, but that quickly becomes unmanageable as the number of assets grows.
I found it much easier to expand my \u0060public\u0060 folder into a structured hierarchy, like \u0060public/brand\u0060 for logos and badges, \u0060public/icons\u0060 for favicons and touch icons, and so on.
The page you're looking at right now is being served with assets organized in \u0060public/issue-002\u0060.

\u0060\u0060\u0060javascript
// brand/assets.js
// Maps asset variants to their respective file paths
const variantToSrc = {
  icon: '/icons/icon.svg',
  icon404: '/icons/icon-var-404.svg',
  iconVarAngry: '/icons/icon-var-angry.svg',
  bannerAlt: '/brand/banner-cut.svg',
  banner2: '/brand/banner2.svg',
  banner2Alt: '/brand/banner2-cut.svg',
}
\u0060\u0060\u0060

Now a component asks for the asset it needs from \u0060variantToSrc\u0060 instead of remembering a path, and renaming a file means changing exactly one line.

### What I Would Tell Someone Starting Out

- Keep one master SVG and export everything else from it, so you are never redrawing the same picture.
- Decide your image sizes early and name the files clearly.
- Test your link previews before you announce anything, not after.
- Expect the small stuff to take longer than the big stuff.

## Why Share This

### The Unglamorous Part

This is the groundwork that never makes it into a launch post. Sharing it is the whole point of building in public: the next person gets a shorter list of surprises.

> If you are building something of your own, I hope this saves you a few hours. If it does not, at least you know you are not the only one with twenty copies of the same logo.

Reach out to us on social media: [Instagram](https://www.instagram.com/robust.computer/) | [X](https://x.com/Robust_Computer) | [Facebook](https://www.facebook.com/r0bust.c0mputer/) | [LinkedIn](https://www.linkedin.com/company/robust.computer)

Or email us at [hello@robust.computer](mailto:hello@robust.computer)
`,
}
