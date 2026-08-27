import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SearchableDropdown, {
  SearchableMultiSelect,
  SearchableSelect,
} from './SearchableSelect';

describe('SearchableDropdown', () => {
  const sampleOptions = [
    { id: 1, name: 'React', subtitle: 'Frontend library' },
    { id: 2, name: 'TypeScript', subtitle: 'Typed JavaScript', badge: 'Popular' },
    { id: 3, name: 'C# / .NET', subtitle: 'Backend framework' },
    { id: 4, name: 'MySQL', subtitle: 'Relational database', disabled: true },
  ];

  it('renders placeholder and opens menu on focus/click', () => {
    render(
      <SearchableDropdown
        options={sampleOptions}
        value={null}
        onChange={vi.fn()}
        placeholder="Choose a technology..."
      />
    );

    const input = screen.getByPlaceholderText('Choose a technology...');
    expect(input).toBeInTheDocument();

    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Typed JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('filters options by search query matching name and subtitle', () => {
    render(
      <SearchableDropdown
        options={sampleOptions}
        value={null}
        onChange={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'typed' } });

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  it('calls onChange with selected option id on click', () => {
    const handleChange = vi.fn();
    render(
      <SearchableDropdown
        options={sampleOptions}
        value={null}
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByText('TypeScript'));

    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('navigates with keyboard ArrowDown and selects with Enter', () => {
    const handleChange = vi.fn();
    render(
      <SearchableDropdown
        options={sampleOptions}
        value={null}
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('supports multi-select mode with token badges and removal', () => {
    const handleChange = vi.fn();
    render(
      <SearchableMultiSelect
        options={sampleOptions}
        value={[1, 2]}
        onChange={handleChange}
        placeholder="Filter by skills..."
      />
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();

    const removeBtn = screen.getByLabelText('Remove React');
    fireEvent.click(removeBtn);

    expect(handleChange).toHaveBeenCalledWith([2]);
  });
});
