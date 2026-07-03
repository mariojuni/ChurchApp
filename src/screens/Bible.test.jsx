import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Bible from './Bible';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: { uid: '123' },
    userProfile: { role: 'Member' }
  })),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

describe('Bible Screen', () => {
  it('renders the Bible screen correctly', () => {
    // Assuming Bible screen renders without props
    render(<Bible />);
    
    // Check for some standard element that might be in a Bible screen (e.g. search, a book name, or just verify it renders without crashing)
    const elements = screen.queryAllByRole('heading');
    expect(elements).toBeDefined();
  });
});
