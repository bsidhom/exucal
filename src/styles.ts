// The styles more than one component shares, composed into a component's
// `static styles` as `[buttonStyles, css\`…\`]`, so that each component's
// own sheet holds only what is its own.

import { css } from "lit";

/** A button in the app's look: the text's font, a thin border, and no fill. */
export const buttonStyles = css`
  button {
    font: inherit;
    padding: 0.5rem 1rem;
    border: 1px solid currentColor;
    border-radius: 0.5rem;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
`;

/** The line under a control that says what it does. */
export const hintStyles = css`
  .hint {
    max-width: 16rem;
    font-size: 0.75rem;
    font-weight: 400;
    opacity: 0.8;
  }
`;
