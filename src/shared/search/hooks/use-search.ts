import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { entityHref } from '../../../wiki/wiki.helpers.ts';
import { isEditableTarget, searchItems } from '../search.helpers.ts';
import type { SearchItem } from '../search.helpers.ts';

export const useSearch = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState<SearchItem[]>();
  const results = items ? searchItems(items, query) : [];

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || isEditableTarget(event.target)) return;
      event.preventDefault();
      setIsOpen(true);
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || items) return;
    fetch('/search-index.json')
      .then((response) => response.json())
      .then(setItems);
  }, [isOpen, items]);

  const open = () => setIsOpen(true);

  const close = () => {
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowDown') moveActive(event, 1);
    if (event.key === 'ArrowUp') moveActive(event, -1);
    if (event.key === 'Enter' && results[activeIndex]) {
      window.location.assign(entityHref(results[activeIndex].id));
    }
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
  };

  const moveActive = (event: KeyboardEvent, step: number) => {
    event.preventDefault();
    setActiveIndex((index) => Math.min(Math.max(index + step, 0), Math.max(results.length - 1, 0)));
  };

  return {
    inputRef,
    isOpen,
    query,
    results,
    activeIndex,
    isLoaded: items !== undefined,
    open,
    changeQuery,
    handleKeyDown,
    handleBlur,
  };
};
