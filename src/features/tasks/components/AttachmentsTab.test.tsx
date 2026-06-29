import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttachmentsTab from './AttachmentsTab';
import { useTaskAttachments } from '@/features/tasks/hooks/useTaskAttachments';
import type { Attachment } from '@/features/tasks/api/types';

vi.mock('@/features/tasks/hooks/useTaskAttachments', () => ({
  useTaskAttachments: vi.fn(),
}));

const mockHook = vi.mocked(useTaskAttachments);

function att(over: Partial<Attachment>): Attachment {
  return {
    id: 'a1', name: 'w9.pdf', type: null, description: null, taskId: 't1',
    processInstanceId: 'PID-1', createTime: null, removable: true,
    url: '/api/documents/doc_1/content', ...over,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const state = (over: Record<string, unknown>) => ({ data: undefined, isLoading: false, isError: false, ...over }) as any;

describe('AttachmentsTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('classifies attachments by the Luke mirror type', () => {
    mockHook.mockReturnValue(
      state({
        data: [
          att({ id: 'a1', name: 'w9.pdf', type: 'luke-task-attachment' }),
          att({ id: 'a2', name: 'id-scan.png', type: 'luke-process-attachment' }),
        ],
      }),
    );
    render(<AttachmentsTab taskId="t1" />);

    expect(screen.getByText('w9.pdf')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('id-scan.png')).toBeInTheDocument();
    expect(screen.getByText('Process')).toBeInTheDocument();

    // Opens via the content URL reference (never S3, never bytes in Camunda).
    const link = screen.getAllByRole('link', { name: /open/i })[0];
    expect(link).toHaveAttribute('href', '/api/documents/doc_1/content');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows the empty state when there are no attachments', () => {
    mockHook.mockReturnValue(state({ data: [] }));
    render(<AttachmentsTab taskId="t1" />);
    expect(screen.getByText('No attachments')).toBeInTheDocument();
  });

  it('shows an error state when the load fails', () => {
    mockHook.mockReturnValue(state({ isError: true }));
    render(<AttachmentsTab taskId="t1" />);
    expect(screen.getByText(/couldn't load attachments/i)).toBeInTheDocument();
  });
});
