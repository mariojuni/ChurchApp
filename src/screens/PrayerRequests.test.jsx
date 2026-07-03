import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PrayerRequests from './PrayerRequests';
import { useAuth } from '../context/AuthContext';
import { usePrayers } from '../hooks/usePrayers';

// Mock the hooks
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/usePrayers', () => ({
  usePrayers: vi.fn(),
}));

// Mock Firebase imports used in the component (for handlePray/handleToggleAnswered)
vi.mock('../firebase', () => ({
  db: {},
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  runTransaction: vi.fn(),
  updateDoc: vi.fn(),
}));

describe('PrayerRequests Screen', () => {
  it('renders loading state or empty state when no prayers exist', () => {
    useAuth.mockReturnValue({
      currentUser: { uid: '123', displayName: 'Test User' },
      userProfile: { name: 'Test User' },
    });
    
    usePrayers.mockReturnValue({
      prayers: [],
      loading: false,
    });

    render(<PrayerRequests />);
    expect(screen.getByText('No prayer requests found.')).toBeInTheDocument();
  });

  it('renders a list of prayers and allows filtering', () => {
    useAuth.mockReturnValue({
      currentUser: { uid: '123' },
      userProfile: { name: 'Test User' },
    });

    const mockPrayers = [
      { id: '1', request: 'Pray for my family', name: 'John Doe', userId: '456', answered: false, likes: 2 },
      { id: '2', request: 'Pray for my job', name: 'Test User', userId: '123', answered: true, likes: 0 },
    ];

    usePrayers.mockReturnValue({
      prayers: mockPrayers,
      loading: false,
    });

    render(<PrayerRequests />);
    
    // Check if prayers are rendered
    expect(screen.getByText('Pray for my family')).toBeInTheDocument();
    expect(screen.getByText('Pray for my job')).toBeInTheDocument();

    // Check filtering
    const myRequestsBtn = screen.getByText('My Requests');
    fireEvent.click(myRequestsBtn);
    
    // John's request should not be visible anymore since it's not the current user's
    expect(screen.queryByText('Pray for my family')).not.toBeInTheDocument();
    expect(screen.getByText('Pray for my job')).toBeInTheDocument();
  });
});
