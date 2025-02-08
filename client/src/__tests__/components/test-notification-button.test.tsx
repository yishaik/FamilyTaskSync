import { render, fireEvent } from '@testing-library/react';
import { TestNotificationButton } from '../../components/test-notification-button';

describe('TestNotificationButton', () => {
  const mockProps = {
    userId: 1,
    userName: 'Test User'
  };

  it('renders with correct user information', () => {
    const { getByText } = render(<TestNotificationButton {...mockProps} />);
    expect(getByText(/Test User/)).toBeInTheDocument();
  });
});