import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ShareButton } from './ShareButton';

describe('ShareButton', () => {
  const defaultProps = {
    code: 'ABC123',
    teamName: 'JO12-1',
    opponent: 'VV Oranje',
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: 'https://dialive.nl/live/ABC123' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('renders "Deel" button text', () => {
      render(<ShareButton {...defaultProps} />);
      expect(screen.getByText('Deel')).toBeInTheDocument();
    });

    it('renders as a button element', () => {
      render(<ShareButton {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders Share2 icon', () => {
      const { container } = render(<ShareButton {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Clipboard Fallback', () => {
    beforeEach(() => {
      // Mock navigator.share as unavailable
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'canShare', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    it('copies to clipboard when Web Share API is unavailable', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('https://dialive.nl/live/ABC123');
      });
    });

    it('shows "Gekopieerd!" after successful copy', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Gekopieerd!')).toBeInTheDocument();
      });
    });

    it('shows Check icon after successful copy', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const { container } = render(<ShareButton {...defaultProps} />);
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Gekopieerd!')).toBeInTheDocument();
      });
      
      // Check icon should be rendered
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('reverts to "Deel" after 2 seconds', async () => {
      // Use real timers for async operations, but track setTimeout calls
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);
      
      // Click the button
      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      // Wait for the clipboard promise to resolve and state to update
      await waitFor(() => {
        expect(screen.getByText('Gekopieerd!')).toBeInTheDocument();
      });

      // Verify setTimeout was called with 2000ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

      // Wait for the timeout to complete and text to revert
      await waitFor(() => {
        expect(screen.getByText('Deel')).toBeInTheDocument();
      }, { timeout: 3000 });

      setTimeoutSpy.mockRestore();
    });
  });

  describe('Web Share API', () => {
    it('calls navigator.share when available', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);
      
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'canShare', {
        value: canShareMock,
        writable: true,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);
      
      // Click and wait for async share to complete
      fireEvent.click(screen.getByRole('button'));

      // Wait for the share promise to resolve
      await waitFor(() => {
        expect(shareMock).toHaveBeenCalled();
      });

      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'JO12-1 vs VV Oranje - DIA Live',
          text: 'Volg de wedstrijd JO12-1 vs VV Oranje live! Code: ABC123',
        })
      );
    });
  });

  describe('Styling', () => {
    it('has correct base classes', () => {
      render(<ShareButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'rounded-lg');
    });

    it('has white text color', () => {
      render(<ShareButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-white');
    });

    it('has semi-transparent background', () => {
      render(<ShareButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white/20');
    });

    it('merges custom className', () => {
      render(<ShareButton {...defaultProps} className="my-custom-class" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('my-custom-class');
      expect(button).toHaveClass('bg-white/20'); // Still has default
    });
  });

  describe('Icon and Text Layout', () => {
    it('has flex layout with gap', () => {
      render(<ShareButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('flex', 'items-center', 'gap-2');
    });
  });
});
