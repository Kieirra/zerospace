import { useState } from 'react';

export const useHighlight = () => {
  const [highlightedStepUid, setHighlightedStepUid] = useState<string | null>(null);
  return { highlightedStepUid, highlight: setHighlightedStepUid };
};
