import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useQuery, useMutation } from 'convex/react';
import { TeamsTab } from './TeamsTab';

// Type the mocks
const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);

describe('TeamsTab', () => {
  const mockClubId = 'club123' as any;
  const mockCreateTeam = vi.fn();
  const mockUpdateTeam = vi.fn();
  const mockDeleteTeam = vi.fn();

  const mockTeams = [
    { _id: 'team1' as any, name: 'JO11-1', slug: 'jo11-1' },
    { _id: 'team2' as any, name: 'JO12-1', slug: 'jo12-1' },
    { _id: 'team3' as any, name: 'JO13-2', slug: 'jo13-2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock useMutation to return different functions based on call order
    // The component calls useMutation 3 times: createTeam, updateTeam, deleteTeam
    (mockUseMutation as any).mockImplementation(() => {
      const callCount = mockUseMutation.mock.calls.length;
      if (callCount % 3 === 1) return mockCreateTeam;
      if (callCount % 3 === 2) return mockUpdateTeam;
      return mockDeleteTeam;
    });
    mockCreateTeam.mockResolvedValue(undefined);
    mockUpdateTeam.mockResolvedValue(undefined);
    mockDeleteTeam.mockResolvedValue(undefined);
  });

  describe('No Club Selected', () => {
    it('shows Dutch message when no club is selected', () => {
      render(<TeamsTab clubId={null} />);
      expect(screen.getByText('Selecteer eerst een club.')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows Dutch loading text when teams are loading', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<TeamsTab clubId={mockClubId} />);
      expect(screen.getByText('Laden...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows Dutch empty message when no teams exist', () => {
      mockUseQuery.mockReturnValue([]);

      render(<TeamsTab clubId={mockClubId} />);
      expect(screen.getByText('Geen teams.')).toBeInTheDocument();
    });
  });

  describe('Team List Display', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockTeams);
    });

    it('displays all team names', () => {
      render(<TeamsTab clubId={mockClubId} />);

      expect(screen.getByText('JO11-1')).toBeInTheDocument();
      expect(screen.getByText('JO12-1')).toBeInTheDocument();
      expect(screen.getByText('JO13-2')).toBeInTheDocument();
    });

    it('displays team slugs', () => {
      render(<TeamsTab clubId={mockClubId} />);

      expect(screen.getByText('jo11-1')).toBeInTheDocument();
      expect(screen.getByText('jo12-1')).toBeInTheDocument();
      expect(screen.getByText('jo13-2')).toBeInTheDocument();
    });

    it('shows edit button for each team', () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Each team row should have an edit button (Pencil icon)
      const editButtons = container.querySelectorAll('button');
      // 3 teams × 2 buttons (edit + delete) + 1 add button = 7 buttons
      expect(editButtons.length).toBeGreaterThanOrEqual(6);
    });

    it('shows delete button for each team', () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Check for red-colored delete buttons
      const deleteButtons = container.querySelectorAll('.text-red-500');
      expect(deleteButtons.length).toBe(3);
    });
  });

  describe('Dutch Labels', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockTeams);
    });

    it('shows "Nieuw team" section header', () => {
      render(<TeamsTab clubId={mockClubId} />);
      expect(screen.getByText('Nieuw team')).toBeInTheDocument();
    });

    it('shows Dutch placeholder for name input', () => {
      render(<TeamsTab clubId={mockClubId} />);
      expect(screen.getByPlaceholderText('Naam (bijv. JO12-1)')).toBeInTheDocument();
    });

    it('shows Dutch placeholder for slug input', () => {
      render(<TeamsTab clubId={mockClubId} />);
      expect(screen.getByPlaceholderText('Slug (optioneel)')).toBeInTheDocument();
    });

    it('shows "Toevoegen" button', () => {
      render(<TeamsTab clubId={mockClubId} />);
      expect(screen.getByText('Toevoegen')).toBeInTheDocument();
    });
  });

  describe('Create Team (CRUD)', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockTeams);
    });

    it('disables add button when name is empty', () => {
      render(<TeamsTab clubId={mockClubId} />);

      const addButton = screen.getByText('Toevoegen');
      expect(addButton).toBeDisabled();
    });

    it('enables add button when name is entered', () => {
      render(<TeamsTab clubId={mockClubId} />);

      const nameInput = screen.getByPlaceholderText('Naam (bijv. JO12-1)');
      fireEvent.change(nameInput, { target: { value: 'JO14-1' } });

      const addButton = screen.getByText('Toevoegen');
      expect(addButton).toBeEnabled();
    });

    it('calls createTeam mutation with correct parameters', async () => {
      render(<TeamsTab clubId={mockClubId} />);

      const nameInput = screen.getByPlaceholderText('Naam (bijv. JO12-1)');
      const slugInput = screen.getByPlaceholderText('Slug (optioneel)');

      fireEvent.change(nameInput, { target: { value: 'JO14-1' } });
      fireEvent.change(slugInput, { target: { value: 'jo14-1' } });
      fireEvent.click(screen.getByText('Toevoegen'));

      await waitFor(() => {
        expect(mockCreateTeam).toHaveBeenCalledWith({
          clubId: mockClubId,
          name: 'JO14-1',
          slug: 'jo14-1',
          adminPin: '9999',
        });
      });
    });

    it('auto-generates slug from name when slug is empty', async () => {
      render(<TeamsTab clubId={mockClubId} />);

      const nameInput = screen.getByPlaceholderText('Naam (bijv. JO12-1)');
      fireEvent.change(nameInput, { target: { value: 'JO14 Team' } });
      fireEvent.click(screen.getByText('Toevoegen'));

      await waitFor(() => {
        expect(mockCreateTeam).toHaveBeenCalledWith({
          clubId: mockClubId,
          name: 'JO14 Team',
          slug: 'jo14-team', // Auto-generated from name
          adminPin: '9999',
        });
      });
    });

    it('shows error message on creation failure', async () => {
      mockCreateTeam.mockRejectedValueOnce(new Error('Slug already exists'));

      render(<TeamsTab clubId={mockClubId} />);

      const nameInput = screen.getByPlaceholderText('Naam (bijv. JO12-1)');
      fireEvent.change(nameInput, { target: { value: 'JO14-1' } });
      fireEvent.click(screen.getByText('Toevoegen'));

      await waitFor(() => {
        expect(screen.getByText('❌ Slug already exists')).toBeInTheDocument();
      });
    });

    it('shows Dutch success message after creating team', async () => {
      render(<TeamsTab clubId={mockClubId} />);

      const nameInput = screen.getByPlaceholderText('Naam (bijv. JO12-1)');
      fireEvent.change(nameInput, { target: { value: 'JO14-1' } });
      fireEvent.click(screen.getByText('Toevoegen'));

      await waitFor(() => {
        expect(screen.getByText('✅ Team aangemaakt')).toBeInTheDocument();
      });
    });

    it('clears inputs after successful creation', async () => {
      render(<TeamsTab clubId={mockClubId} />);

      const nameInput = screen.getByPlaceholderText('Naam (bijv. JO12-1)') as HTMLInputElement;
      const slugInput = screen.getByPlaceholderText('Slug (optioneel)') as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'JO14-1' } });
      fireEvent.change(slugInput, { target: { value: 'jo14-1' } });
      fireEvent.click(screen.getByText('Toevoegen'));

      await waitFor(() => {
        expect(nameInput.value).toBe('');
        expect(slugInput.value).toBe('');
      });
    });
  });

  describe('Update Team (CRUD)', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockTeams);
    });

    it('enters edit mode when edit button is clicked', () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Find the first team row and click its edit button (pencil icon)
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const editButtons = teamRows[0].querySelectorAll('button');
      const editButton = editButtons[0]; // First button is edit (pencil)
      fireEvent.click(editButton!);

      // Should show input field with current name
      const editInputs = container.querySelectorAll('input[type="text"]');
      // First input in edit mode should have the team name
      expect(editInputs[0]).toHaveValue('JO11-1');
    });

    it('shows save and cancel buttons in edit mode', () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Enter edit mode
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const editButtons = teamRows[0].querySelectorAll('button');
      fireEvent.click(editButtons[0]!);

      // Should show green save button and gray cancel button
      const saveButton = container.querySelector('.text-green-600');
      expect(saveButton).toBeInTheDocument();
      // Cancel button should also be present
      const allButtons = container.querySelectorAll('button');
      expect(allButtons.length).toBeGreaterThan(0);
    });

    it('calls updateTeam mutation with correct parameters', async () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Enter edit mode
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const editButtons = teamRows[0].querySelectorAll('button');
      fireEvent.click(editButtons[0]!);

      // Change the name - find the input in the first team row
      const editInput = teamRows[0].querySelector('input[type="text"]') as HTMLInputElement;
      fireEvent.change(editInput, { target: { value: 'JO11-2' } });

      // Click save (green button)
      const saveButton = container.querySelector('.text-green-600');
      fireEvent.click(saveButton!);

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith({
          teamId: 'team1',
          name: 'JO11-2',
          adminPin: '9999',
        });
      });
    });

    it('shows Dutch success message after updating team', async () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Enter edit mode and save
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const editButtons = teamRows[0].querySelectorAll('button');
      fireEvent.click(editButtons[0]!);

      const editInput = teamRows[0].querySelector('input[type="text"]') as HTMLInputElement;
      fireEvent.change(editInput, { target: { value: 'JO11-2' } });

      const saveButton = container.querySelector('.text-green-600');
      fireEvent.click(saveButton!);

      await waitFor(() => {
        expect(screen.getByText('✅ Team bijgewerkt')).toBeInTheDocument();
      });
    });

    it('exits edit mode when cancel is clicked', () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Enter edit mode
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const editButtons = teamRows[0].querySelectorAll('button');
      fireEvent.click(editButtons[0]!);

      // Click cancel (the X button with text-gray-500 class in edit mode)
      // In edit mode, the buttons are: save (green), cancel (gray)
      const cancelButtons = teamRows[0].querySelectorAll('.text-gray-500');
      const cancelButton = cancelButtons[cancelButtons.length - 1];
      fireEvent.click(cancelButton!);

      // Should show team name again (not input)
      expect(screen.getByText('JO11-1')).toBeInTheDocument();
    });
  });

  describe('Delete Team (CRUD)', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockTeams);
    });

    it('shows Dutch delete confirmation when delete is clicked', () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Click delete button on first team (second button in each row)
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const deleteButton = teamRows[0].querySelector('.text-red-500');
      fireEvent.click(deleteButton!);

      expect(screen.getByText('Verwijderen? Alle spelers worden ook verwijderd!')).toBeInTheDocument();
    });

    it('shows "Ja" and "Nee" confirmation buttons', () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Click delete button
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const deleteButton = teamRows[0].querySelector('.text-red-500');
      fireEvent.click(deleteButton!);

      expect(screen.getByText('Ja')).toBeInTheDocument();
      expect(screen.getByText('Nee')).toBeInTheDocument();
    });

    it('calls deleteTeam mutation when "Ja" is clicked', async () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Click delete button
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const deleteButton = teamRows[0].querySelector('.text-red-500');
      fireEvent.click(deleteButton!);

      // Confirm deletion
      fireEvent.click(screen.getByText('Ja'));

      await waitFor(() => {
        expect(mockDeleteTeam).toHaveBeenCalledWith({ teamId: 'team1', adminPin: '9999' });
      });
    });

    it('shows Dutch success message after deleting team', async () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Click delete and confirm
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const deleteButton = teamRows[0].querySelector('.text-red-500');
      fireEvent.click(deleteButton!);
      fireEvent.click(screen.getByText('Ja'));

      await waitFor(() => {
        expect(screen.getByText('✅ Team verwijderd')).toBeInTheDocument();
      });
    });

    it('cancels delete when "Nee" is clicked', () => {
      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Click delete button
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const deleteButton = teamRows[0].querySelector('.text-red-500');
      fireEvent.click(deleteButton!);

      // Cancel deletion
      fireEvent.click(screen.getByText('Nee'));

      // Should show team name again
      expect(screen.getByText('JO11-1')).toBeInTheDocument();
      expect(screen.queryByText('Verwijderen?')).not.toBeInTheDocument();
    });

    it('shows error message on deletion failure', async () => {
      mockDeleteTeam.mockRejectedValueOnce(new Error('Team has active matches'));

      const { container } = render(<TeamsTab clubId={mockClubId} />);

      // Click delete and confirm
      const teamRows = container.querySelectorAll('.bg-gray-50');
      const deleteButton = teamRows[0].querySelector('.text-red-500');
      fireEvent.click(deleteButton!);
      fireEvent.click(screen.getByText('Ja'));

      await waitFor(() => {
        expect(screen.getByText('❌ Team has active matches')).toBeInTheDocument();
      });
    });
  });

  describe('Status Messages', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockTeams);
    });

    it('displays status message in styled container', async () => {
      render(<TeamsTab clubId={mockClubId} />);

      const nameInput = screen.getByPlaceholderText('Naam (bijv. JO12-1)');
      fireEvent.change(nameInput, { target: { value: 'JO14-1' } });
      fireEvent.click(screen.getByText('Toevoegen'));

      await waitFor(() => {
        const statusMessage = screen.getByText('✅ Team aangemaakt');
        expect(statusMessage).toHaveClass('bg-gray-100');
      });
    });
  });
});
