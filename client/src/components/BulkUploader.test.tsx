import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BulkUploader from './BulkUploader';

vi.mock('../services/api', () => ({
  uploadCV: vi.fn(),
}));

vi.mock('../services/signalr', () => ({
  startCVUploadHub: vi.fn().mockResolvedValue({
    on: vi.fn(),
    off: vi.fn(),
    invoke: vi.fn(),
    state: 'Connected',
  }),
  getCVUploadHubConnection: vi.fn().mockReturnValue({
    state: 'Connected',
    invoke: vi.fn(),
  }),
}));

describe('BulkUploader', () => {
  it('renders dropzone prompt correctly', () => {
    const handleParsed = vi.fn();
    render(<BulkUploader onDraftsParsed={handleParsed} />);

    expect(screen.getByText(/Drag & drop CVs here/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF or Word \(\.docx\)/i)).toBeInTheDocument();
  });
});
