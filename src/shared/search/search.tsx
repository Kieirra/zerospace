import clsx from 'clsx';
import { entityHref } from '../../wiki/wiki.helpers.ts';
import { useSearch } from './hooks/use-search.ts';

export const Search = () => {
  const { inputRef, isOpen, query, results, activeIndex, isLoaded, open, changeQuery, handleKeyDown, handleBlur } =
    useSearch();
  const isListVisible = isOpen && isLoaded && query.trim() !== '';

  return (
    <div onBlur={handleBlur}>
      <button
        type="button"
        aria-label="Search"
        onClick={open}
        className={clsx(
          'flex size-12 items-center justify-center text-muted hover:text-text md:hidden',
          isOpen && 'invisible',
        )}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      </button>
      <div
        className={clsx(
          'items-center',
          'md:relative md:inset-auto md:flex md:h-auto md:bg-transparent md:p-0',
          isOpen && 'absolute inset-x-0 top-0 z-10 flex h-12 bg-bg px-4',
          !isOpen && 'hidden',
        )}
      >
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search"
          aria-expanded={isListVisible}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={isListVisible && results.length > 0 ? `search-option-${activeIndex}` : undefined}
          placeholder="Search"
          autoComplete="off"
          value={query}
          onFocus={open}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          className={clsx(
            'h-9 w-full bg-surface px-3 md:w-56',
            'text-text placeholder:text-muted',
          )}
        />
        {isListVisible && (
          <ul
            id="search-results"
            role="listbox"
            className={clsx(
              'absolute inset-x-4 top-full mt-1 max-h-[70dvh] overflow-y-auto md:inset-x-auto md:right-0 md:w-80',
              'bg-surface-raised py-1 shadow-lg shadow-black/60',
            )}
          >
            {results.length === 0 && <li className="px-3 py-3 text-muted">No results</li>}
            {results.map((item, index) => (
              <li key={item.id} id={`search-option-${index}`} role="option" aria-selected={index === activeIndex}>
                <a
                  href={entityHref(item.id)}
                  tabIndex={-1}
                  className={clsx(
                    'flex min-h-12 items-center justify-between gap-3 px-3',
                    index === activeIndex && 'bg-surface-hover',
                  )}
                >
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 text-sm text-muted">
                    <span className="capitalize">{item.kind}</span> · {item.faction}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
