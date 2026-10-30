/**
 * landing/src/styles/breakpoints.js
 *
 * Single source of truth for every media-query breakpoint.
 *
 * Two layout tiers across the app:
 *   - mobile  — phones (≤ 760px)
 *   - default — everything else (tablet, desktop, …)
 *
 * The Hero — five tiers, two axes (width × height).
 *
 * The hero used to stack on `width ≤ 1200 OR height ≤ 1215`,
 * which meant the two-column row only existed on windows that
 * were both wide AND tall (1920×1400 and up). Any normal laptop
 * (1440×900, 1536×864, 1920×1080) fell off a cliff into the
 * stacked layout because the *height* rule fired on its own.
 *
 * Now the width and height axes are independent:
 *
 *   - full  — width ≥ 1576 AND height ≥ 1320: the full-size row
 *     (960px art, 96px headline). Both axes have room for it.
 *   - mid   — the default 2-column row (720px art, 72px
 *     headline). Everything that is 2-column but not full:
 *     901-1575 wide at ≥1080 tall, or ≥1576 wide at 1080-1319
 *     tall. The art itself is fluid — it takes the smaller of a
 *     width cap and a height cap (see Hero.jsx).
 *   - short — 2-column, height-led (760-1079 tall): the row
 *     stays two-column and the art shrinks to whatever the
 *     viewport can carry.
 *   - tiny  — 2-column, everything shrinks (521-759 tall).
 *
 * The width rule is the one that bites: below 1200px the copy
 * column gets squeezed by the art, so the row stacks
 * (1024×600, 1024×728). 1280×800 and up still holds two
 * columns — the short tier drops the art to ~505px there.
 *   - stack — 1-column: the width is too narrow for two columns
 *     (≤ 1200) or the viewport is too short for any row (≤ 520).
 *
 * The height thresholds come from the space the row actually
 * needs: the art + the inner padding + the page chrome
 * (TopBar + Navbar ≈ 160px) + the pinned promises bar (≈ 63px).
 *   960px art → 960 + 136 + 160 + 63 = 1319 → full tier at 1320
 *   720px art → 720 + 136 + 160 + 63 = 1079 → mid tier at 1080
 *
 * The Navbar collapses into a hamburger at ≤ 1200px. Inline
 * page links stay visible above that — at narrower widths
 * the row can't fit brand + links + CTA without crowding,
 * so the nav switches to a single hamburger button.
 *
 * Use the pre-built media-query strings in styled-components:
 *
 *   const Foo = styled.div`
 *     ${mobile} {
 *       padding: 24px;
 *     }
 *   `
 *
 * `fromMobile` is the inverse (≥ 761px) — use it when it's
 * cleaner to declare a desktop default and override on mobile.
 */

export const BP_MOBILE = '760px'
export const BP_MOBILE_PLUS = '761px'

/* Hero tiers. The numbers are derived in the comment above —
   see the "Hero" block in this file's header. */
export const BP_HERO_STACK_W = '1200px'
export const BP_HERO_STACK_W_PLUS = '1201px'
export const BP_HERO_STACK_H = '520px'

export const BP_HERO_FULL_W_MIN = '1576px'
export const BP_HERO_FULL_H_MIN = '1320px'

export const BP_HERO_SHORT_H_MIN = '760px'
export const BP_HERO_SHORT_H_MAX = '1079px'

export const BP_HERO_TINY_H_MAX = '759px'

export const BP_NAV_HAMBURGER = '1200px'
export const BP_NAV_HAMBURGER_PLUS = '1201px'

export const mobile = `@media (max-width: ${BP_MOBILE})`
export const fromMobile = `@media (min-width: ${BP_MOBILE_PLUS})`

/* Full tier: both axes have room for the 960px art. */
export const heroFull = `@media (min-width: ${BP_HERO_FULL_W_MIN}) and (min-height: ${BP_HERO_FULL_H_MIN})`

/* Mid tier: the default 2-col row — no query needed, it is the
   base style in Hero.jsx (720px art, 72px headline, fluid art
   column). It covers everything that is 2-column but not full:
   901-1575 wide at ≥1080 tall, or ≥1576 wide at 1080-1319 tall. */

/* Short tier: 2-col, height-led — the art shrinks to fit. */
export const heroShort = `@media (min-width: ${BP_HERO_STACK_W_PLUS}) and (min-height: ${BP_HERO_SHORT_H_MIN}) and (max-height: ${BP_HERO_SHORT_H_MAX})`

/* Tiny tier: 2-col, everything shrinks (521-759 tall). */
export const heroTiny = `@media (min-width: ${BP_HERO_STACK_W_PLUS}) and (max-height: ${BP_HERO_TINY_H_MAX})`

/* Stack tier: 1-col. Narrow screens, or viewports too short to
   carry any two-column row. Declared last so it wins over the
   tiers above wherever the two overlap. */
export const heroStack = `@media (max-width: ${BP_HERO_STACK_W}), (max-height: ${BP_HERO_STACK_H})`

export const navHamburger = `@media (max-width: ${BP_NAV_HAMBURGER})`
export const fromNavHamburger = `@media (min-width: ${BP_NAV_HAMBURGER_PLUS})`