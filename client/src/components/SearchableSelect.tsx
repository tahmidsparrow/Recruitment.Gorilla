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
  id: customId,
  isInvalid = false,
  disabled = false,
  clearable = true,
  size = 'md',
  className = '',
  emptyMessage = 'No options found',
  renderOption,
}: SearchableDropdownProps<T>) {
  const autoId = useId();
  const inputId = customId || autoId;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      const items = listRef.current.querySelectorAll('.dropdown-popover__item');
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
    setOpen(false);
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
      className={`dropdown-custom-root position-relative ${className}`.trim()}
      onKeyDown={handleKeyDown}
    >
      {/* Multi-select tokens */}
      {multiple && selectedOptions.length > 0 && (
        <div className="dropdown-token-group mb-1.5">
          {selectedOptions.map((o) => (
            <span key={String(o.id)} className="dropdown-token">
              {o.color && (
                <span
                  className="dropdown-token__dot"
                  style={{ backgroundColor: o.color }}
                />
              )}
              <span className="dropdown-token__text">{o.name}</span>
              {!disabled && (
                <button
                  type="button"
                  className="dropdown-token__remove"
                  aria-label={`Remove ${o.name}`}
                  onClick={(e) => handleRemove(o.id, e)}
                >
                  <X size={11} strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Main Trigger Input Box */}
      <div className="position-relative d-flex align-items-center">
        {/* Leading dot / icon when closed */}
        {!open && singleSelectedOption?.color && (
          <span
            className="dropdown-dot position-absolute ms-2.5 pointer-events-none"
            style={{ backgroundColor: singleSelectedOption.color, zIndex: 3 }}
          />
        )}

        <Form.Control
          ref={inputRef}
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
          className={`dropdown-trigger-input ${open ? 'dropdown-trigger-input--open' : ''} ${
            !open && singleSelectedOption?.color ? 'ps-4' : ''
          }`}
          style={{
            paddingRight: clearable && (singleSelectedOption || (multiple && selectedOptions.length > 0)) ? '3rem' : '2.2rem',
          }}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${inputId}-menu`}
        />

        <div className="dropdown-trigger-actions position-absolute end-0 me-2 d-flex align-items-center gap-1">
          {clearable && !disabled && (singleSelectedOption || (multiple && selectedOptions.length > 0)) && !open && (
            <button
              type="button"
              className="dropdown-clear-btn"
              aria-label="Clear selection"
              onClick={handleClear}
            >
              <X size={12} strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`dropdown-chevron text-muted pointer-events-none ${
              open ? 'dropdown-chevron--rotated text-primary' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Floating Popover Menu */}
      {open && (
        <div
          id={`${inputId}-menu`}
          ref={listRef}
          className="dropdown-popover-menu"
          role="listbox"
          aria-label={placeholder}
        >
          {/* Popover Filter Header if options list is long */}
          {options.length > 4 && (
            <div className="dropdown-popover__search">
              <Search size={13} className="dropdown-popover__search-icon" aria-hidden="true" />
              <input
                type="text"
                autoComplete="off"
                className="dropdown-popover__search-input"
                placeholder="Type to search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className="dropdown-popover__search-clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear search text"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="dropdown-popover__list">
            {/* Top "All" reset option for single select when clearable */}
            {clearable && !multiple && !query && (
              <button
                type="button"
                className={`dropdown-popover__item ${
                  !singleSelectedOption ? 'dropdown-popover__item--selected' : ''
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleClear(e);
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="dropdown-dot"
                    style={{ backgroundColor: 'var(--text-muted, #94a3b8)', opacity: 0.5 }}
                  />
                  <span className="dropdown-popover__item-name text-muted">
                    {placeholder.startsWith('All') ? placeholder : `All (${placeholder})`}
                  </span>
                </div>
                {!singleSelectedOption && (
                  <Check size={14} className="text-primary ms-1 flex-shrink-0" strokeWidth={2.5} />
                )}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="dropdown-popover__empty">
                <Search size={15} className="dropdown-popover__empty-icon" />
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
                    className={`dropdown-popover__item ${
                      isSelected ? 'dropdown-popover__item--selected' : ''
                    } ${isHighlighted ? 'dropdown-popover__item--highlighted' : ''}`.trim()}
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
                            className="dropdown-dot"
                            style={{
                              backgroundColor: option.color,
                              boxShadow: `0 0 6px ${option.color}40`,
                            }}
                          />
                        )}
                        {option.icon && <span className="dropdown-icon">{option.icon}</span>}
                        <div className="text-truncate">
                          <div className="dropdown-popover__item-name text-truncate">
                            {option.name}
                          </div>
                          {option.subtitle && (
                            <div className="dropdown-popover__item-subtitle text-truncate">
                              {option.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                      {option.badge && (
                        <span className="dropdown-pill-badge">{option.badge}</span>
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
