interface RepeatFieldProps {
  isRepeated: boolean;
  onChange: (repeat: boolean) => void;
}

// 'Loop until the end' of the step panel (D6): the unit is made again on its building until every step outside the
// loops is done.
export const RepeatField = ({ isRepeated, onChange }: RepeatFieldProps) => (
  <label className="flex cursor-pointer items-center gap-2 pl-[72px]">
    <input
      type="checkbox"
      checked={isRepeated}
      onChange={(event) => onChange(event.target.checked)}
      className="cursor-pointer accent-accent"
    />
    Loop until the end
  </label>
);
