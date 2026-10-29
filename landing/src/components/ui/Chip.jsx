import styled from '@emotion/styled'
import { colors } from '../../styles/colors'

/**
 * Chip
 *
 * Tag-style pill used in industries, developer skill lists, work cards.
 * `$on` flips the color (selected state in the contact form).
 *
 * The state props are `$`-prefixed (transient props) on
 * purpose. Emotion filters transient props out of the DOM for
 * string tags like `span`, and `is-prop-valid` would happily
 * forward plain `on` / `onInk` to the DOM — `on` is a legacy
 * HTML attribute and any `on[A-Z]` name looks like an event
 * handler to React — which produces "Received `true` for a
 * non-boolean attribute" and "Unknown event handler property"
 * warnings. Keep the `$` prefix.
 */

const Chip = styled.span`
  display: inline-block;
  border: 3px solid ${(p) => (p.$onInk ? colors.paper : colors.ink)};
  background: ${(p) => (p.$on ? colors.ink : 'transparent')};
  color: ${(p) => {
    if (p.$on) return colors.paper
    if (p.$onInk) return colors.paper
    return colors.ink
  }};
  font-family: var(--mono);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.03em;
  padding: 7px 13px;
  text-transform: uppercase;
`

export default Chip
