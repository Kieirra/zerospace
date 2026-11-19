import { KIND_COLORS } from '../build-order.constants.ts';

interface ClickIconProps {
  size: 15 | 24;
}

// Mouse cursor with a click ripple (apercu.html `#i-click`): the pointer tip sits at (7, 7) of the 20 × 20 box.
export const ClickIcon = ({ size }: ClickIconProps) => (
  <svg
    viewBox="0 0 20 20"
    width={size}
    height={size}
    aria-hidden="true"
    className="inline-block shrink-0 overflow-visible"
    style={{ color: KIND_COLORS.click }}
  >
    <path d="M4 7A3 3 0 0 1 7 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M1.2 7A5.8 5.8 0 0 1 7 1.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity=".65"
    />
    <path
      d="M7 7L7 18.2L9.8 15.6L11.7 19.4L13.7 18.5L11.8 14.7L15.6 14.7Z"
      fill="currentColor"
      stroke="#0d0d12"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

