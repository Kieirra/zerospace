import { memo } from 'react';
import { NoticeBanner } from '../../notice-banner/notice-banner.tsx';
import { FullTimeline } from '../../timeline/full-timeline/full-timeline.tsx';
import { TimelineEditingContext } from '../../timeline/timeline-editing.ts';
import { toGlobalErrorTexts } from './editor-timeline.helpers.ts';
import type { TimelineEditing } from '../../timeline/timeline-editing.ts';
import type { TimelineViewProps } from '../../timeline/timeline.types.ts';

interface EditorTimelineProps extends TimelineViewProps {
  editing: TimelineEditing;
}

// The editor's main area: the errors of no step, then the live timeline; a click on a mark
// selects its step, dragging it changes its time. Memoized: the hover-free renders (title, author) skip the heaviest
// part of the page.
export const EditorTimeline = memo(({ editing, ...props }: EditorTimelineProps) => {
  const errors = toGlobalErrorTexts(props.result);
  return (
    <section aria-labelledby="live-timeline-title" className="min-w-0 border border-line bg-panel p-3">
      <h2 id="live-timeline-title" className="label-caps mb-2.5 text-xs">
        Timeline · live
      </h2>
      {errors.length > 0 && (
        <div className="mb-2.5 flex flex-col gap-1.5">
          {errors.map((text) => (
            <NoticeBanner key={text} text={text} />
          ))}
        </div>
      )}
      <TimelineEditingContext value={editing}>
        <FullTimeline {...props} />
      </TimelineEditingContext>
    </section>
  );
});
