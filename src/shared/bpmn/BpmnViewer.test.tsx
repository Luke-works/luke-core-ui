import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Spy on importXML so we can make it fail and assert Retry re-runs the import.
const { importXML } = vi.hoisted(() => ({ importXML: vi.fn() }));

vi.mock('bpmn-js/lib/Viewer', () => ({
  default: class {
    importXML = importXML;
    get() {
      return {
        zoom: () => {},
        viewbox: () => ({ inner: { x: 0, y: 0, width: 1, height: 1 }, outer: { width: 1, height: 1 } }),
        add: () => {},
        remove: () => {},
      };
    }
    destroy() {}
  },
}));
vi.mock('diagram-js/lib/navigation/movecanvas', () => ({ default: {} }));

import BpmnViewer from './BpmnViewer';

beforeAll(() => {
  // jsdom has no ResizeObserver; the viewer observes its container.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('BpmnViewer (#36)', () => {
  beforeEach(() => {
    importXML.mockReset();
    importXML.mockRejectedValue(new Error('unsupported element'));
  });

  it('renders an explicit error state with Retry when import fails (not a blank canvas)', async () => {
    render(<BpmnViewer xml="<broken/>" />);

    await waitFor(() => expect(screen.getByText(/couldn't render this diagram/i)).toBeInTheDocument());
    expect(screen.getByText(/unsupported element/i)).toBeInTheDocument();
    expect(importXML).toHaveBeenCalledTimes(1);

    // Retry re-runs the import effect.
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(importXML).toHaveBeenCalledTimes(2));
  });
});
