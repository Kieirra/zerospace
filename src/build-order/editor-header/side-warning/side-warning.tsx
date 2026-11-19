import { KIND_COLORS } from '../../build-order.constants.ts';

interface SideWarningProps {
  // Tooltip and accessible name.
  text: string;
}

// Warning triangle next to a side menu, its text in the tooltip.
export const SideWarning = ({ text }: SideWarningProps) => (
  <span role="img" aria-label={text} title={text} className="inline-flex cursor-help" style={{ color: KIND_COLORS.idle }}>
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path d="M8 1.5L15 14H1Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6V9.5M8 11.5V11.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </span>
);
