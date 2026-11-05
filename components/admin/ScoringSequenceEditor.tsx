"use client";
export default function ScoringSequenceEditor<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: readonly T[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  const title = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
  const move = (index: number, direction: number) => {
    const next = [...value];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };
  return (
    <fieldset className="space-y-3 rounded border border-white/15 p-3">
      <legend className="text-sm font-semibold">{label}</legend>
      {value.map((key, index) => (
        <div key={key} className="flex flex-wrap items-center gap-2">
          <span className="min-w-36 flex-1 text-sm">
            {index + 1}. {title(key)}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={index === 0}
            aria-label={`Move ${key} up in ${label}`}
            onClick={() => move(index, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={index === value.length - 1}
            aria-label={`Move ${key} down in ${label}`}
            onClick={() => move(index, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={value.length === 1}
            aria-label={`Remove ${key} from ${label}`}
            onClick={() => onChange(value.filter((item) => item !== key))}
          >
            Remove
          </button>
        </div>
      ))}
      <label className="block text-sm">
        Add criterion
        <select
          className="input-esports"
          value=""
          onChange={(event) => {
            if (event.target.value) onChange([...value, event.target.value as T]);
          }}
        >
          <option value="">Choose a statistic</option>
          {choices
            .filter((key) => !value.includes(key))
            .map((key) => (
              <option key={key} value={key}>
                {title(key)}
              </option>
            ))}
        </select>
      </label>
      <p className="text-xs text-text-muted">
        Applied in this order. Exact ties use stable record identity. Team totals are always compared first.
      </p>
    </fieldset>
  );
}
