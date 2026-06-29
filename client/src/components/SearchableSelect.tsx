import { useState } from 'react';
import { Form } from 'react-bootstrap';

export interface Option {
  id: number;
  name: string;
}

const filterByQuery = (options: Option[], query: string) =>
  options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

/** Searchable single-select from a fixed option list. Not creatable. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  id,
}: {
  options: Option[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  id?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) ?? null;
  const filtered = filterByQuery(options, query);

  return (
    <div className="position-relative">
      <Form.Control
        id={id}
        autoComplete="off"
        placeholder={placeholder}
        value={open ? query : selected?.name ?? ''}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      />
      {selected && !open && (
        <button
          type="button"
          className="btn-close position-absolute"
          style={{ right: '0.6rem', top: '0.7rem', fontSize: '0.65rem' }}
          aria-label="Clear selection"
          onClick={() => onChange(null)}
        />
      )}
      {open && (
        <div className="searchable-menu">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-muted small">No matches</div>
          ) : (
            filtered.map((o) => (
              <button
                type="button"
                key={o.id}
                className="searchable-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                {o.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Searchable multi-select; selected values render as removable badges. Not creatable. */
export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: Option[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => value.includes(o.id));
  const available = filterByQuery(
    options.filter((o) => !value.includes(o.id)),
    query
  );

  return (
    <div className="position-relative">
      {selected.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-1">
          {selected.map((o) => (
            <span
              key={o.id}
              className="badge bg-primary-subtle text-primary d-inline-flex align-items-center gap-1"
            >
              {o.name}
              <button
                type="button"
                className="btn-close"
                style={{ fontSize: '0.5rem' }}
                aria-label={`Remove ${o.name}`}
                onClick={() => onChange(value.filter((v) => v !== o.id))}
              />
            </span>
          ))}
        </div>
      )}
      <Form.Control
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      />
      {open && (
        <div className="searchable-menu">
          {available.length === 0 ? (
            <div className="px-3 py-2 text-muted small">No matches</div>
          ) : (
            available.map((o) => (
              <button
                type="button"
                key={o.id}
                className="searchable-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange([...value, o.id]);
                  setQuery('');
                }}
              >
                {o.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
