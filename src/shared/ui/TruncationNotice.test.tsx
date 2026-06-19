import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TruncationNotice from './TruncationNotice';

describe('TruncationNotice (#33)', () => {
  it('renders nothing when the result is under the cap', () => {
    const { container } = render(<TruncationNotice shown={12} cap={50} noun="users" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warns when the result fills the cap (data may be hidden)', () => {
    render(<TruncationNotice shown={50} cap={50} noun="users" />);
    expect(screen.getByRole('status')).toHaveTextContent(/showing the first 50 users/i);
    expect(screen.getByRole('status')).toHaveTextContent(/refine your search/i);
  });
});
