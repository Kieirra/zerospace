const TILES = 9;
const ROWS = 6;

// Loading placeholder: header, palette and list in grey.
export const EditorSkeleton = () => (
  <div aria-busy="true" aria-label="Loading the editor" className="flex animate-pulse flex-col gap-4">
    <div className="flex flex-col gap-3 border border-line bg-panel px-5 py-4">
      <div className="h-7 w-96 bg-surface-raised" />
      <div className="h-7 w-full bg-surface" />
    </div>
    <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-3.5">
      <div className="grid grid-cols-3 gap-1.5 border border-line bg-panel p-3">
        {Array.from({ length: TILES }, (_, index) => (
          <div key={index} className="h-[112px] bg-surface" />
        ))}
      </div>
      <div className="flex flex-col gap-2 border border-line bg-panel p-4">
        {Array.from({ length: ROWS }, (_, index) => (
          <div key={index} className="h-6 bg-surface" />
        ))}
      </div>
    </div>
  </div>
);
