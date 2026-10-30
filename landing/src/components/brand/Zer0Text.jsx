import { Fragment } from 'react'
import styled from '@emotion/styled'
import { zer0 } from '../../utils/zer0'

/**
 * landing/src/components/ui/Zer0Text.jsx
 *
 * Apply the brand's 0-for-O rule AND render each 0 in IBM Plex
 * Mono so the slashed/dotted zero (mono) replaces the regular
 * oval zero (Barlow). The non-zero characters stay in whatever
 * font the parent uses.
 *
 * Usage
 *   <Zer0Text>About</Zer0Text>           →  AB[mono]0[/mono]UT
 *   <Zer0Text>Open</Zer0Text>            →  [mono]0[/mono]PEN
 *   <Zer0Text>247 open tabs</Zer0Text>   →  247 [mono]0[/mono]PEN TABS
 *
 * The transformation (uppercase + O→0) is delegated to
 * `utils/zer0.js`, the single source of truth. This component
 * adds the rendering concern: wrapping each 0 in a span that
 * uses Plex Mono.
 */

// Plex Mono is the mono font. Its default zero glyph is the
// dotted one — the whole point of the brand — so no OpenType
// feature is needed (IBM Plex Mono ships no 'zero' feature;
// the dotted zero is simply the default outline).
const Zero = styled.span`
  font-family: var(--mono);
`

const Zer0Text = ({ children }) => {
  const text = zer0(String(children))
  // Split on "0" while keeping the separator, so each "0" is its
  // own segment. Empty strings between adjacent zeros are dropped
  // by React, which is fine.
  const parts = text.split(/(0)/)
  return parts.map((part, i) =>
    part === '0' ? <Zero key={i}>0</Zero> : <Fragment key={i}>{part}</Fragment>
  )
}

export default Zer0Text
