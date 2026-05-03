import { render, screen } from '@testing-library/react';

test('test runner is configured', () => {
  render(<div>Distribution Management System</div>);
  expect(screen.getByText('Distribution Management System')).toBeInTheDocument();
});
