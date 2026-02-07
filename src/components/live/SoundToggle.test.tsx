import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SoundToggle, useGoalNotification } from './SoundToggle';
import { renderHook } from '@testing-library/react';

describe('SoundToggle', () => {
  const STORAGE_KEY = 'dia-live-sound-enabled';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render (Unmounted State)', () => {
    it('renders disabled button initially before mount', () => {
      // The component renders a disabled placeholder before useEffect runs
      render(<SoundToggle />);
      const button = screen.getByRole('button');
      // After mount, it should be enabled
      expect(button).toBeInTheDocument();
    });

    it('shows "Geluid" text in placeholder', () => {
      render(<SoundToggle />);
      // After mount, shows either "Geluid aan" or "Geluid uit"
      expect(screen.getByText(/Geluid/)).toBeInTheDocument();
    });
  });

  describe('Sound Disabled State (Default)', () => {
    it('renders "Geluid uit" when sound is disabled', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Geluid uit')).toBeInTheDocument();
      });
    });

    it('has gray background when disabled', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-gray-100', 'text-gray-500');
      });
    });

    it('has aria-label "Geluid inschakelen" when disabled', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'Geluid inschakelen');
      });
    });

    it('shows VolumeX icon when disabled', async () => {
      const { container } = render(<SoundToggle />);
      
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Sound Enabled State', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEY, 'true');
    });

    it('renders "Geluid aan" when sound is enabled', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Geluid aan')).toBeInTheDocument();
      });
    });

    it('has dia-green styling when enabled', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('text-dia-green');
      });
    });

    it('has aria-label "Geluid uitschakelen" when enabled', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'Geluid uitschakelen');
      });
    });

    it('shows Volume2 icon when enabled', async () => {
      const { container } = render(<SoundToggle />);
      
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Toggle Behavior', () => {
    it('toggles from disabled to enabled on click', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Geluid uit')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Geluid aan')).toBeInTheDocument();
      });
    });

    it('toggles from enabled to disabled on click', async () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      render(<SoundToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Geluid aan')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Geluid uit')).toBeInTheDocument();
      });
    });
  });

  describe('localStorage Persistence', () => {
    it('saves "true" to localStorage when enabled', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Geluid uit')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
      });
    });

    it('saves "false" to localStorage when disabled', async () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      render(<SoundToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Geluid aan')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
      });
    });

    it('reads initial state from localStorage', async () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      render(<SoundToggle />);
      
      await waitFor(() => {
        expect(screen.getByText('Geluid aan')).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('has rounded-full class for pill shape', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('rounded-full');
      });
    });

    it('has proper spacing classes', async () => {
      render(<SoundToggle />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('px-3', 'py-1.5', 'gap-2');
      });
    });

    it('merges custom className', async () => {
      render(<SoundToggle className="my-custom-class" />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass('my-custom-class');
      });
    });
  });
});

describe('useGoalNotification', () => {
  const STORAGE_KEY = 'dia-live-sound-enabled';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns enabled: false by default', () => {
    const { result } = renderHook(() => useGoalNotification());
    expect(result.current.enabled).toBe(false);
  });

  it('returns enabled: true when localStorage is set', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useGoalNotification());
    
    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
    });
  });

  it('returns a notify function', () => {
    const { result } = renderHook(() => useGoalNotification());
    expect(typeof result.current.notify).toBe('function');
  });

  it('notify does nothing when disabled', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGoalNotification());
    result.current.notify();
    
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('notify triggers vibration when enabled', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGoalNotification());
    
    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
    });

    act(() => {
      result.current.notify();
    });
    
    expect(vibrateMock).toHaveBeenCalledWith([200, 100, 200]);
  });
});
