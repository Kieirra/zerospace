import type { CostSegment } from '../../wiki.types.ts';

export interface RowColumn {
  label: string;
  isDesktopOnly?: boolean;
  isWide?: boolean;
  width?: string;
}

export interface Row {
  id: string;
  name: string;
  cells: (string | CostSegment[] | undefined)[];
}

export interface RowGroup {
  title?: string;
  rows: Row[];
}

export const keepFilledColumns = (columns: RowColumn[], groups: RowGroup[]) => {
  const filled = columns
    .map((column, index) => ({ column, index }))
    .filter(({ index }) => groups.some(({ rows }) => rows.some(({ cells }) => cells[index] !== undefined)));
  return {
    columns: filled.map(({ column }) => column),
    groups: groups.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({ ...row, cells: filled.map(({ index }) => row.cells[index]) })),
    })),
  };
};

export const hasLongWord = (name: string) => /\S{16,}/.test(name);

export const toGridTemplate = (columns: RowColumn[], hasFixedWidths = false) =>
  ['minmax(min-content,1fr)', ...columns.map((column) => toTrack(column, hasFixedWidths))].join(' ');

const DEFAULT_COLUMN_WIDTH = '4.5rem';

const toTrack = ({ isWide, width }: RowColumn, hasFixedWidths: boolean) => {
  if (isWide) return 'minmax(0,2fr)';
  return hasFixedWidths ? (width ?? DEFAULT_COLUMN_WIDTH) : 'auto';
};
