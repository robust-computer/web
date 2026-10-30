import styled from '@emotion/styled'
import { Link } from 'react-router-dom'
import pkg from '../../../../package.json'
import { Button } from '../ui'
import { Logo, Zer0Text } from '../brand'
import { ticketIn } from '../../styles/animations'
import { colors } from '../../styles/colors'
import { heroFull, heroShort, heroTiny, heroStack, mobile } from '../../styles/breakpoints'
import { useLocale } from '../../context/LocaleContext'

/**
 * Hero
 *
 * Home page opening. Headline, lead, two CTAs on the left; the
 * "worker with computer-monitor head" poster on the right with a
 * tilted ticket floating over it.
 *
 * The ticket is a real surface, not a static decoration:
 *   - the right tag reads from the version in package.json
 *     ("RELEASE 0.1.0" today, "RELEASE 0.2.0" after a bump)
 *   - the body reads the most recent Field Notes post from
 *     `data/feed.js` (the single source of truth — the
 *     /public/rss.xml is regenerated from the same array) and
 *     renders its title, pub date, and one-sentence excerpt. If
 *     the array is empty, it shows a placeholder.
 *
 * The "Release X.Y.Z" tag uses a separate chrome string
 * (`heroChrome.releasePrefix`) so each locale can order the
 * label and the version however reads naturally — e.g.
 */

/* Fills the opening viewport above the promises bar. The inner
   grid stays on --page, which keeps the ticket parked on the art. */
const Wrap = styled.section`
  width: 100%;
  max-width: var(--max);
  margin-inline: auto;
  flex: 1;
  display: flex;
  align-items: center;
  background: ${colors.paper};
  border-bottom: 3px solid ${colors.ink};

  ${heroStack} {
    /* When the hero stacks, the Opening drops the 100dvh clamp
       (see Home.jsx), so the hero grows to fit its content
       rather than overflowing. */
    flex: none;
    align-items: flex-start;
  }
`

const Inner = styled.div`
  width: 100%;
  max-width: var(--page);
  margin-inline: auto;
  display: grid;
  /* Two columns: copy on the left, the poster + ticket on the
     right. The art column is fluid — it takes the smaller of a
     width cap and a height cap, so the row always fits the
     viewport instead of falling off a cliff into the stacked
     layout. The height cap is derived from what the row has
     left after the chrome (--chrome), the pinned promises bar
     and this block's own padding:
       100dvh - chrome - 63 (promises) - 136 (padding). */
  --hero-art: min(720px, 50vw, calc(100dvh - var(--chrome, 145px) - 199px));
  grid-template-columns: minmax(0, 1fr) var(--hero-art);
  gap: 56px;
  padding: 64px 56px 72px;
  align-items: center;

  /* Full tier (1576w+ AND 1320h+): both axes have room for the
     full-size 960px art and the 96px headline. */
  ${heroFull} {
    --hero-art: 960px;
    gap: 72px;
  }

  ${heroShort} {
    /* Short tier (760-1079 tall): keep the row, shrink the art
       to whatever height is left (720 → ~520 cap). The width cap
       is lower here (44vw) so the copy column stays wide enough
       for the headline and the two CTAs to sit on one line. */
    --hero-art: min(520px, 44vw, calc(100dvh - var(--chrome, 145px) - 135px));
    gap: 40px;
    padding: 32px 40px 40px;
  }

  ${heroTiny} {
    /* Tiny tier (521-759 tall): everything shrinks a step. */
    --hero-art: min(360px, 52vw, calc(100dvh - var(--chrome, 145px) - 111px));
    gap: 28px;
    padding: 20px 28px 28px;
  }

  ${heroStack} {
    grid-template-columns: 1fr;
    padding: 48px 24px 56px;
    gap: 40px;
  }
`

const Headline = styled.h1`
  font-family: var(--display);
  font-weight: 800;
  /* Snaps to discrete sizes — no continuous growth — so the
     headline locks to the hero's layout tiers.
     96px on the full tier, 72px on the default 2-col row,
     56px on the short tier, 48px on the tiny tier, 56px when
     stacked, 48px on phones. */
  font-size: 72px;
  line-height: 0.92;
  margin: 0 0 26px;
  text-transform: uppercase;
  letter-spacing: -0.015em;
  color: ${colors.ink};

  ${heroFull} {
    font-size: 96px;
  }

  ${heroShort} {
    font-size: 56px;
  }

  ${heroTiny} {
    font-size: 48px;
    margin-bottom: 20px;
  }

  ${heroStack} {
    font-size: 56px;
  }

  ${mobile} {
    font-size: 48px;
  }
`

const Lead = styled.p`
  font-size: 22px;
  max-width: 26em;
  margin: 0 0 34px;
  color: ${colors.ink};

  ${heroShort} {
    font-size: 18px;
    margin-bottom: 24px;
  }

  ${heroTiny} {
    font-size: 16px;
    margin-bottom: 18px;
  }
`

const CTAs = styled.div`
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
`

const Art = styled.div`
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;

  ${heroStack} {
    order: -1;
    justify-content: center;
  }
`

const ArtFrame = styled.div`
  position: relative;
  /* Fills the grid column, whose width is --hero-art. */
  width: 100%;

  ${heroStack} {
    /* Cap the art when stacked so the ticket can sit at a
       reasonable size below it without overflowing the column. */
    width: min(100%, 320px);
    margin-inline: auto;
  }
`

const ArtImg = styled(Logo)`
  display: block;
  /* The poster is a square SVG — the column width drives both
     sides, so the art scales with the tier. */
  width: 100%;
  height: auto;
  max-width: none;
  filter: drop-shadow(12px 12px 0 ${colors.ink});

  ${heroFull} {
    filter: drop-shadow(16px 16px 0 ${colors.ink});
  }

  ${heroShort} {
    filter: drop-shadow(10px 10px 0 ${colors.ink});
  }

  ${heroStack} {
    filter: drop-shadow(8px 8px 0 ${colors.ink});
  }
`

// Ticket comes up from below the art and settles into its
// tilted position. The `ticketIn` keyframes live in
// `src/styles/animations.js` so other surfaces (a future
// modal opener, a CTA, etc.) can reuse the same entrance.
//
// 0.3s delay lets the hero settle first; the
// `cubic-bezier(0.22, 1, 0.36, 1)` is the same ease the rest of
// the site uses, so it feels native.
const Ticket = styled.div`
  position: absolute;
  left: -36px;
  bottom: 16px;
  width: 320px;
  background: ${colors.ticket};
  border: 4px solid ${colors.ink};
  box-shadow: 7px 7px 0 ${colors.ink};
  padding: 18px 20px 20px;
  transform: rotate(-2.5deg);
  z-index: 2;
  color: ${colors.ink};
  animation: ${ticketIn} 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
  /* Hint the browser to promote the ticket to its own layer so
     the animation runs on the compositor (no layout/paint). */
  will-change: transform, opacity;

  ${heroFull} {
    left: -50px;
    bottom: 20px;
    width: 398px;
    box-shadow: 9px 9px 0 ${colors.ink};
  }

  ${heroShort} {
    /* Tracks the smaller art — the ticket never grows wider
       than the poster it sits on. */
    left: -24px;
    bottom: 12px;
    width: min(320px, 76%);
    padding: 14px 16px 16px;
  }

  ${heroTiny} {
    left: -18px;
    bottom: 8px;
    width: min(240px, 62%);
    padding: 10px 12px 12px;
    box-shadow: 5px 5px 0 ${colors.ink};
  }

  ${heroStack} {
    position: static;
    transform: rotate(-2.5deg);
    width: 100%;
    margin-top: -60px;
    border-width: 3px;
    box-shadow: 6px 6px 0 ${colors.ink};
    padding: 12px 14px 14px;
  }

  @media (prefers-reduced-motion: reduce) {
    /* Skip the entrance — show the ticket in its final position
       immediately. The base transform / opacity still apply, so
       the visual result is identical to the no-animation case. */
    animation: none;
  }
`

const TicketTag = styled.div`
  font-family: var(--mono);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.05em;
  display: flex;
  justify-content: space-between;
  border-bottom: 4px dashed ${colors.ink};
  padding-bottom: 10px;
  margin-bottom: 13px;
  text-transform: uppercase;
  color: ${colors.ink};

  ${heroShort} {
    font-size: 13px;
    border-bottom-width: 3px;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }

  ${heroTiny} {
    font-size: 11px;
    border-bottom-width: 3px;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }

  ${heroStack} {
    font-size: 11px;
    border-bottom-width: 3px;
    padding-bottom: 7px;
    margin-bottom: 8px;
  }
`

const TicketBody = styled.pre`
  margin: 0;
  font-family: var(--mono);
  font-size: 18px;
  line-height: 1.55;
  white-space: pre-wrap;
  color: ${colors.ink};

  ${heroShort} {
    font-size: 15px;
  }

  ${heroTiny} {
    font-size: 13px;
  }

  ${heroStack} {
    font-size: 13px;
  }
`

// The stamp renders either as a plain span (no post yet) or as
// a router link (`as={Link}`) when there is a latest issue.
// The `$link` prop turns on the hover treatment.
//
// `shouldForwardProp` keeps `$link` off the DOM. Emotion's
// default filter only drops non-HTML props when the styled
// component renders a string tag; switching to `as={Link}`
// makes the target a component, and Emotion then forwards
// everything except `theme` — which put a literal
// `$link="true"` on the <a> and tripped React's
// "Invalid attribute name" / "non-boolean attribute" warnings.
//
// The filter must also reject `as`: Emotion decides whether the
// `as` prop is honored by asking the filter about the prop name
// "as" (a custom filter that allows it disables `as` entirely,
// and the stamp stops rendering as a router link).
const TicketStamp = styled('span', {
  shouldForwardProp: (prop) => prop !== '$link' && prop !== 'as',
})`
  margin-top: 12px;
  display: inline-block;
  background: ${colors.ink};
  color: ${colors.paper};
  font-family: var(--mono);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.05em;
  padding: 4px 11px;
  text-transform: uppercase;
  text-decoration: none;

  ${heroFull} {
    margin-top: 13px;
    font-size: 15px;
    padding: 4px 13px;
  }

  ${heroShort} {
    margin-top: 10px;
    font-size: 12px;
    padding: 3px 10px;
  }

  ${heroTiny} {
    margin-top: 9px;
    font-size: 11px;
    padding: 3px 9px;
  }

  ${heroStack} {
    margin-top: 10px;
    font-size: 11px;
    padding: 3px 9px;
  }

  ${(p) => p.$link && `
    cursor: pointer;
    &:hover,
    &:focus-visible {
      background: ${colors.gold};
      color: ${colors.ink};
    }
  `}
`

const Hero = ({ latest, ticketBody }) => {
  const { hero, heroChrome } = useLocale()
  return (
    <Wrap>
      <Inner>
        <div>
          <Headline><Zer0Text>{hero.headline}</Zer0Text></Headline>
          <Lead>
            {hero.lead}
          </Lead>
          <CTAs>
            <Button as={Link} to="/contact">
              <Zer0Text>{heroChrome.start}</Zer0Text>
            </Button>
            <Button as={Link} to="/about" variant="alt">
              <Zer0Text>{heroChrome.team}</Zer0Text>
            </Button>
          </CTAs>
        </div>
        <Art>
          <ArtFrame>
            <ArtImg variant="bannerAlt" h={960} alt="The Robust Computer mascot" />
            <Ticket>
              <TicketTag>
                <span><Zer0Text>{heroChrome.buildLog}</Zer0Text></span>
                <span><Zer0Text>{`${heroChrome.releasePrefix} ${pkg.version}`}</Zer0Text></span>
              </TicketTag>
              <TicketBody>{ticketBody}</TicketBody>
              {latest?.to ? (
                <TicketStamp
                  as={Link}
                  to={latest.to}
                  $link
                  aria-label={`Read ${latest.title}`}
                >
                  <Zer0Text>{heroChrome.shipped}</Zer0Text>
                </TicketStamp>
              ) : (
                <TicketStamp><Zer0Text>{heroChrome.shipped}</Zer0Text></TicketStamp>
              )}
            </Ticket>
          </ArtFrame>
        </Art>
      </Inner>
    </Wrap>
  )
}

export default Hero
