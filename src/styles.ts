// The styles more than one component shares, composed into a component's
// `static styles` as `[pressableStyles, css\`…\`]`, so that each
// component's own sheet holds only what is its own.

import { css } from "lit";

/**
 * The feedback every button in the app gives, so that a press is seen
 * to land: a tint of the text's color on hover, a deeper tint and a
 * slight shrink while pressed, the browser's focus ring for a keyboard,
 * and a faded, inert look when disabled. A component composes this
 * sheet and adds its own shape; the transitions stand down under
 * `prefers-reduced-motion`.
 */
export const pressableStyles = css`
  button {
    transition:
      background-color 120ms,
      opacity 120ms,
      transform 80ms;
    -webkit-tap-highlight-color: transparent;
  }

  button:hover:not(:disabled) {
    background-color: color-mix(in srgb, currentColor 8%, transparent);
  }

  button:active:not(:disabled) {
    background-color: color-mix(in srgb, currentColor 18%, transparent);
    transform: scale(0.96);
  }

  button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }

    button:active:not(:disabled) {
      transform: none;
    }
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
