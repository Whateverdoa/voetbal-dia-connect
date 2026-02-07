import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useQuery } from 'convex/react';
import CoachLoginPage from './page';

// Type the mock
const mockUseQuery = vi.mocked(useQuery);

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

describe('CoachLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('Login Form with Keypad', () => {
    it('renders login page with Dutch text', () => {
      render(<CoachLoginPage />);

      expect(screen.getByText('DIA Live')).toBeInTheDocument();
      expect(screen.getByText('Coach inloggen')).toBeInTheDocument();
      expect(screen.getByText('Voer je PIN in')).toBeInTheDocument();
      expect(screen.getByText('4-6 cijfers')).toBeInTheDocument();
    });

    it('renders numeric keypad with digits 0-9', () => {
      render(<CoachLoginPage />);

      // Check all digits are present
      for (let i = 0; i <= 9; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
      }
    });

    it('renders Inloggen submit button', () => {
      render(<CoachLoginPage />);
      expect(screen.getByRole('button', { name: 'Inloggen' })).toBeInTheDocument();
    });

    it('renders Wis (clear) button', () => {
      render(<CoachLoginPage />);
      expect(screen.getByLabelText('Wissen')).toBeInTheDocument();
    });

    it('renders backspace button', () => {
      render(<CoachLoginPage />);
      expect(screen.getByLabelText('Backspace')).toBeInTheDocument();
    });

    it('disables submit button when PIN is too short', () => {
      render(<CoachLoginPage />);

      const submitButton = screen.getByRole('button', { name: 'Inloggen' });
      expect(submitButton).toBeDisabled();

      // Enter 1 digit
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      expect(submitButton).toBeDisabled();

      // Enter 2 digits
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      expect(submitButton).toBeDisabled();

      // Enter 3 digits
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when PIN has 4+ digits', () => {
      render(<CoachLoginPage />);

      const submitButton = screen.getByRole('button', { name: 'Inloggen' });

      // Enter 4 digits
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));

      expect(submitButton).toBeEnabled();
    });

    it('shows PIN dots as entered', () => {
      const { container } = render(<CoachLoginPage />);

      // Initially all dots should be gray (unfilled)
      const dots = container.querySelectorAll('.rounded-full');
      expect(dots.length).toBe(6); // 6 PIN positions

      // Enter a digit
      fireEvent.click(screen.getByRole('button', { name: '1' }));

      // First dot should now be green (filled) with scale-110
      const filledDots = container.querySelectorAll('.bg-dia-green.scale-110');
      expect(filledDots.length).toBe(1);
    });

    it('backspace removes last digit', () => {
      const { container } = render(<CoachLoginPage />);

      // Enter 2 digits
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));

      let filledDots = container.querySelectorAll('.bg-dia-green.scale-110');
      expect(filledDots.length).toBe(2);

      // Press backspace
      fireEvent.click(screen.getByLabelText('Backspace'));

      filledDots = container.querySelectorAll('.bg-dia-green.scale-110');
      expect(filledDots.length).toBe(1);
    });

    it('clear button removes all digits', () => {
      const { container } = render(<CoachLoginPage />);

      // Enter 3 digits
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));

      let filledDots = container.querySelectorAll('.bg-dia-green.scale-110');
      expect(filledDots.length).toBe(3);

      // Press clear
      fireEvent.click(screen.getByLabelText('Wissen'));

      filledDots = container.querySelectorAll('.bg-dia-green.scale-110');
      expect(filledDots.length).toBe(0);
    });
  });

  describe('Invalid PIN', () => {
    it('shows Dutch error message for invalid PIN', async () => {
      // Mock: query returns null (invalid PIN)
      mockUseQuery.mockReturnValue(null);

      render(<CoachLoginPage />);

      // Enter 4-digit PIN
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      // Should show Dutch error message
      await waitFor(() => {
        expect(screen.getByText('Ongeldige PIN')).toBeInTheDocument();
      });
    });

    it('stays on login page after invalid PIN', async () => {
      mockUseQuery.mockReturnValue(null);

      render(<CoachLoginPage />);

      // Enter and submit invalid PIN
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        // Should still see keypad elements
        expect(screen.getByText('Voer je PIN in')).toBeInTheDocument();
      });
    });
  });

  describe('Valid PIN - Coach Dashboard', () => {
    const mockCoachMikeData = {
      coach: { id: 'coach123', name: 'Coach Mike' },
      teams: [{ id: 'team456', name: 'JO12-1' }],
      matches: [
        {
          _id: 'match789',
          teamId: 'team456',
          opponent: 'VV Oranje',
          isHome: true,
          status: 'scheduled',
          publicCode: 'ABC123',
          homeScore: 0,
          awayScore: 0,
          scheduledAt: Date.now() + 86400000,
          currentQuarter: 1,
        },
      ],
    };

    it('shows dashboard with Dutch greeting for valid PIN', async () => {
      mockUseQuery.mockReturnValue(mockCoachMikeData);

      render(<CoachLoginPage />);

      // Enter valid PIN
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('Welkom, Coach Mike!')).toBeInTheDocument();
      });
    });

    it('shows team name in dashboard', async () => {
      mockUseQuery.mockReturnValue(mockCoachMikeData);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        // Team name appears multiple times (header and section)
        const teamNames = screen.getAllByText('JO12-1');
        expect(teamNames.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows scheduled matches section with Dutch header', async () => {
      mockUseQuery.mockReturnValue(mockCoachMikeData);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Gepland' })).toBeInTheDocument();
        expect(screen.getByText(/VV Oranje/)).toBeInTheDocument();
      });
    });

    it('shows logout button with Dutch text', async () => {
      mockUseQuery.mockReturnValue(mockCoachMikeData);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('Uitloggen')).toBeInTheDocument();
      });
    });

    it('shows match public code', async () => {
      mockUseQuery.mockReturnValue(mockCoachMikeData);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });
    });

    it('shows empty state when no matches', async () => {
      const dataNoMatches = {
        ...mockCoachMikeData,
        matches: [],
      };
      mockUseQuery.mockReturnValue(dataNoMatches);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('Nog geen wedstrijden voor dit team')).toBeInTheDocument();
      });
    });

    it('shows new match button with Dutch text', async () => {
      mockUseQuery.mockReturnValue(mockCoachMikeData);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('Nieuwe wedstrijd')).toBeInTheDocument();
      });
    });
  });

  describe('Coach Lisa - Multiple Teams', () => {
    const mockCoachLisaData = {
      coach: { id: 'coach456', name: 'Coach Lisa' },
      teams: [
        { id: 'team111', name: 'JO11-1' },
        { id: 'team222', name: 'JO13-2' },
      ],
      matches: [],
    };

    it('shows multiple team names', async () => {
      mockUseQuery.mockReturnValue(mockCoachLisaData);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '5' }));
      fireEvent.click(screen.getByRole('button', { name: '6' }));
      fireEvent.click(screen.getByRole('button', { name: '7' }));
      fireEvent.click(screen.getByRole('button', { name: '8' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('Welkom, Coach Lisa!')).toBeInTheDocument();
        expect(screen.getByText('JO11-1 • JO13-2')).toBeInTheDocument();
      });
    });
  });

  describe('Live Match Display', () => {
    const mockDataWithLiveMatch = {
      coach: { id: 'coach123', name: 'Coach Mike' },
      teams: [{ id: 'team456', name: 'JO12-1' }],
      matches: [
        {
          _id: 'match789',
          teamId: 'team456',
          opponent: 'VV Oranje',
          isHome: true,
          status: 'live',
          publicCode: 'ABC123',
          homeScore: 2,
          awayScore: 1,
          scheduledAt: Date.now(),
          currentQuarter: 2,
        },
      ],
    };

    it('shows active matches section with Dutch header', async () => {
      mockUseQuery.mockReturnValue(mockDataWithLiveMatch);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('Actieve wedstrijden')).toBeInTheDocument();
      });
    });

    it('shows current score for live match', async () => {
      mockUseQuery.mockReturnValue(mockDataWithLiveMatch);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('2 - 1')).toBeInTheDocument();
      });
    });

    it('shows current quarter for live match', async () => {
      mockUseQuery.mockReturnValue(mockDataWithLiveMatch);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('K2')).toBeInTheDocument();
      });
    });
  });

  describe('Halftime Display', () => {
    const mockDataWithHalftime = {
      coach: { id: 'coach123', name: 'Coach Mike' },
      teams: [{ id: 'team456', name: 'JO12-1' }],
      matches: [
        {
          _id: 'match789',
          teamId: 'team456',
          opponent: 'VV Oranje',
          isHome: true,
          status: 'halftime',
          publicCode: 'ABC123',
          homeScore: 1,
          awayScore: 1,
          scheduledAt: Date.now(),
          currentQuarter: 2,
        },
      ],
    };

    it('shows "Rust" for halftime status', async () => {
      mockUseQuery.mockReturnValue(mockDataWithHalftime);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByText('Rust')).toBeInTheDocument();
      });
    });
  });

  describe('Finished Matches', () => {
    const mockDataWithFinished = {
      coach: { id: 'coach123', name: 'Coach Mike' },
      teams: [{ id: 'team456', name: 'JO12-1' }],
      matches: [
        {
          _id: 'match789',
          teamId: 'team456',
          opponent: 'VV Oranje',
          isHome: true,
          status: 'finished',
          publicCode: 'ABC123',
          homeScore: 3,
          awayScore: 2,
          scheduledAt: Date.now() - 86400000,
          currentQuarter: 4,
        },
      ],
    };

    it('shows finished section with Dutch header', async () => {
      mockUseQuery.mockReturnValue(mockDataWithFinished);

      render(<CoachLoginPage />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Afgelopen' })).toBeInTheDocument();
      });
    });
  });

  describe('Auto-submit on 6 digits', () => {
    it('auto-submits when 6 digits are entered', async () => {
      const mockCoachData = {
        coach: { id: 'coach123', name: 'Coach Mike' },
        teams: [{ id: 'team456', name: 'JO12-1' }],
        matches: [],
      };
      mockUseQuery.mockReturnValue(mockCoachData);

      render(<CoachLoginPage />);

      // Enter 6 digits - should auto-submit
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: '5' }));
      fireEvent.click(screen.getByRole('button', { name: '6' }));

      // Should show dashboard without clicking Inloggen
      await waitFor(() => {
        expect(screen.getByText('Welkom, Coach Mike!')).toBeInTheDocument();
      });
    });
  });
});
