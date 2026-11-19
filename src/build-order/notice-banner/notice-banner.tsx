interface NoticeBannerProps {
  text: string;
}

export const NoticeBanner = ({ text }: NoticeBannerProps) => (
  <p role="status" className="border-l-2 border-accent-soft bg-surface px-4 py-2 text-sm text-muted">
    {text}
  </p>
);
