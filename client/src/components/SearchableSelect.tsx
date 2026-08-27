import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Form } from 'react-bootstrap';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface Option<T = number | string> {
  id: T;
  name: string;
  label?: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
  color?: string;
  disabled?: boolean;
}

export type DropdownOption<T = number | string> = Option<T>;

export interface SearchableDropdownProps<T = number | string> {
  options: Option<T>[];
  value: T | null | T[];
  onChange: (val: any) => void;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  id?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  emptyMessage?: string;
  renderOption?: (option: Option<T>, isSelected: boolean) => React.ReactNode;
}

export default function SearchableDropdown<T = number | string>({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Select an option...',
  searchPlaceholder,
  id: customId,
  isInvalid = false,
  disabled = false,
  clearable = true,
  size = 'md',
  className = '',
  emptyMessage = 'No matches found',
  renderOption,
}: SearchableDropdownProps<T>) {
  const autoId = useId();
  const inputId = customId || autoId;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Normalise selected values
  const selectedValues = useMemo<T[]>(() => {
    if (multiple) {
      return Array.isArray(value) ? value : [];
    }
    return value !== null && value !== undefined ? [value as T] : [];
  }, [value, multiple]);

  const selectedOptions = useMemo(() => {
    return options.filter((o) => selectedValues.includes(o.id));
  }, [options, selectedValues]);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const matchName = o.name.toLowerCase().includes(q);
      const matchLabel = o.label ? o.label.toLowerCase().includes(q) : false;
      const matchSubtitle = o.subtitle ? o.subtitle.toLowerCase().includes(q) : false;
      return matchName || matchLabel || matchSubtitle;
    });
  }, [options, query]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Reset highlight on query change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Auto scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const items = listRef.current.querySelectorAll('.searchable-item');
      if (items[highlightedIndex] && typeof items[highlightedIndex].scrollIntoView === 'function') {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, open]);

  const handleSelect = (option: Option<T>) => {
    if (option.disabled) return;

    if (multiple) {
      const exists = selectedValues.includes(option.id);
      const next = exists
        ? selectedValues.filter((v) => v !== option.id)
        : [...selectedValues, option.id];
      onChange(next);
      setQuery('');
    } else {
      onChange(option.id);
      setOpen(false);
      setQuery('');
    }
  };

  const handleRemove = (idToRemove: T, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onChange(selectedValues.filter((v) => v !== idToRemove));
    } else {
      onChange(null);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiple ? [] : null);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        break;
      case 'Tab':
        setOpen(false);
        setQuery('');
        break;
      default:
        break;
    }
  };

  const singleSelectedOption = !multiple && selectedOptions.length > 0 ? selectedOptions[0] : null;

  return (
    <div
      ref={containerRef}
      className={`searchable-dropdown-root position-relative ${className}`.trim()}
      onKeyDown={handleKeyDown}
    >
      {/* Multi-select tokens */}
      {multiple && selectedOptions.length > 0 && (
        <div className="token-row mb-1">
          {selectedOptions.map((o) => (
            <span key={String(o.id)} className="token">
              {o.color && (
                <span
                  className="token__dot me-1"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: o.color,
                    display: 'inline-block',
                  }}
                />
              )}
              {o.name}
              {!disabled && (
                <button
                  type="button"
                  className="token__remove"
                  aria-label={`Remove ${o.name}`}
                  onClick={(e) => handleRemove(o.id, e)}
                >
                  <X size={12} strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Main Input / Trigger */}
      <div className="position-relative">
        <Form.Control
          id={inputId}
          autoComplete="off"
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : multiple ? query : singleSelectedOption ? singleSelectedOption.name : ''}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setQuery('');
            }
          }}
          onClick={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          isInvalid={isInvalid}
          className="searchable-dropdown__input"
          style={{ paddingRight: clearable && (singleSelectedOption || (multiple && selectedOptions.length > 0)) ? '3rem' : '2rem' }}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${inputId}-menu`}
        />

        {/* Clear Button */}
        {clearable && !disabled && (singleSelectedOption || (multiple && selectedOptions.length > 0)) && !open && (
          <button
            type="button"
            className="btn-close position-absolute"
            style={{
              right: '1.8rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.65rem',
              zIndex: 2,
            }}
            aria-label="Clear selection"
            onClick={handleClear}
          />
        )}

        {/* Dropdown Chevron */}
        <ChevronDown
          size={14}
          className="position-absolute end-0 top-50 translate-middle-y me-2.5 text-muted pointer-events-none"
          style={{
            opacity: 0.6,
            transition: 'transform 0.15s ease',
            transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Floating Menu */}
      {open && (
        <div
          id={`${inputId}-menu`}
          ref={listRef}
          className="searchable-menu"
          role="listbox"
          aria-label={placeholder}
        >
          {filteredOptions.length === 0 ? (
            <div className="searchable-dropdown__empty d-flex align-items-center justify-content-center p-3 text-muted">
              <Search size={14} className="me-2 opacity-50" />
              <span>{emptyMessage}</span>
            </div>
          ) : (
            filteredOptions.map((option, idx) => {
              const isSelected = selectedValues.includes(option.id);
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  type="button"
                  key={String(option.id)}
                  disabled={option.disabled}
                  className={`searchable-item d-flex align-items-center justify-content-between ${
                    isSelected ? 'searchable-item--selected' : ''
                  } ${isHighlighted ? 'searchable-item--highlighted' : ''}`.trim()}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  {renderOption ? (
                    renderOption(option, isSelected)
                  ) : (
                    <div className="d-flex align-items-center gap-2 text-truncate me-2">
                      {option.color && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: option.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {option.icon && <span className="me-1">{option.icon}</span>}
                      <div className="text-truncate">
                        <div className="searchable-item__name text-truncate">
                          {option.name}
                        </div>
                        {option.subtitle && (
                          <div className="searchable-item__subtitle small text-muted text-truncate">
                            {option.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="d-flex align-items-center gap-1 flex-shrink-0">
                    {option.badge && (
                      <span className={`badge bg-${option.badgeVariant || 'secondary'}-subtle text-${option.badgeVariant || 'secondary'} border px-1.5 py-0.5`}>
                        {option.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check size={14} className="text-primary ms-1 flex-shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** Convenience wrapper for single select (matches legacy signature) */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  id,
  isInvalid,
  disabled,
  clearable = true,
  size,
}: {
  options: Option[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  id?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <SearchableDropdown<number>
      options={options}
      value={value}
      onChange={onChange}
      multiple={false}
      placeholder={placeholder}
      id={id}
      isInvalid={isInvalid}
      disabled={disabled}
      clearable={clearable}
      size={size}
    />
  );
}

/** Convenience wrapper for multi select (matches legacy signature) */
export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder,
  id,
  isInvalid,
  disabled,
  clearable = true,
  size,
}: {
  options: Option[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  id?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <SearchableDropdown<number>
      options={options}
      value={value}
      onChange={onChange}
      multiple={true}
      placeholder={placeholder}
      id={id}
      isInvalid={isInvalid}
      disabled={disabled}
      clearable={clearable}
      size={size}
    />
  );
}
