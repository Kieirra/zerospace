import { MAX_AUTHOR_LENGTH } from '../build-order.constants.ts';
import { getSidesHeroPool, isEmptyBuild } from '../build-editor/build-editor.helpers.ts';
import { toAuthorWidthCh, toHeroOptions, toSideOptions } from './editor-header.helpers.ts';
import { HistoryButtons } from './history-buttons/history-buttons.tsx';
import { ResetButton } from './reset-button/reset-button.tsx';
import { ShareButton } from './share-button/share-button.tsx';
import { SideSelect } from './side-select/side-select.tsx';
import { TitleField } from './title-field/title-field.tsx';
import type { Build, BuildCatalog, Side } from '../build-order.types.ts';
import type { HistoryButtonsProps } from './history-buttons/history-buttons.tsx';
import type { ShareButtonProps } from './share-button/share-button.tsx';

interface EditorHeaderProps {
  build: Build;
  sides: Side[];
  catalog: BuildCatalog;
  history: HistoryButtonsProps;
  share: ShareButtonProps;
  onFaction: (factionId: string) => void;
  onMercenary: (mercenaryId: string) => void;
  onHero: (heroId: string) => void;
  onTitle: (title: string) => void;
  onAuthor: (author: string) => void;
  // The author field is left: its typing makes one undo entry.
  onAuthorDone: () => void;
  onReset: () => void;
}

const AUTHOR_PLACEHOLDER = 'your name';

// One line: title and author on the left; sides, setup hero, Undo, Redo, Reset and Share on the right.
export const EditorHeader = ({
  build,
  sides,
  catalog,
  history,
  share,
  onFaction,
  onMercenary,
  onHero,
  onTitle,
  onAuthor,
  onAuthorDone,
  onReset,
}: EditorHeaderProps) => {
  const faction = sides.find(({ id }) => id === build.factionId);
  const mercenary = sides.find(({ id }) => id === build.mercenaryId);
  const heroOptions = toHeroOptions(getSidesHeroPool(sides, build.factionId, build.mercenaryId), catalog, build);
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border border-line bg-panel px-5 py-3">
      {/* Under 768 px the header takes two lines, the title and author first (Kieirra 2026-11-19). */}
      <div className="flex items-baseline gap-2 max-md:w-full">
        <TitleField title={build.title} onChange={onTitle} />
        <label className="flex items-baseline gap-1.5 text-sm text-muted">
          by
          <input
            value={build.author}
            maxLength={MAX_AUTHOR_LENGTH}
            placeholder={AUTHOR_PLACEHOLDER}
            onChange={(event) => onAuthor(event.target.value)}
            onBlur={onAuthorDone}
            onKeyDown={(event) => event.key === 'Enter' && onAuthorDone()}
            style={{ width: `${toAuthorWidthCh(build.author, AUTHOR_PLACEHOLDER)}ch` }}
            className="box-content border border-line bg-bg px-2 py-0.5 text-text placeholder:text-muted/60"
          />
        </label>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <SideSelect label="Faction" value={build.factionId} options={toSideOptions(sides, 'faction')} accent={faction?.accent} onChange={onFaction} />
        {/* No game without a mercenary (Kieirra 2026-11-19): no « No mercenary » choice. */}
        <SideSelect
          label="Mercenary"
          value={build.mercenaryId ?? ''}
          options={toSideOptions(sides, 'mercenary')}
          accent={mercenary?.accent}
          onChange={onMercenary}
        />
        {heroOptions.length > 0 && (
          <SideSelect label="Hero" value={build.heroId ?? ''} options={heroOptions} accent={faction?.accent} onChange={onHero} />
        )}
        <HistoryButtons {...history} />
        <ResetButton isDisabled={isEmptyBuild(build)} onReset={onReset} />
        <ShareButton {...share} />
      </div>
    </header>
  );
};
