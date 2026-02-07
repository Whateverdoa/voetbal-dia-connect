import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveConnectionIndicator } from './LiveConnectionIndicator';

describe('LiveConnectionIndicator', () => {
  describe('Connected State', () => {
    it('renders "Live verbinding actief" when connected', () => {
      render(<LiveConnectionIndicator isConnected={true} />);
      expect(screen.getByText('Live verbinding actief')).toBeInTheDocument();
    });

    it('applies green background when connected', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={true} />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('shows green pulsing dot when connected', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={true} />);
      const dot = container.querySelector('.bg-green-500');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass('animate-pulse');
    });

    it('shows Wifi icon when connected', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={true} />);
      // Lucide icons render as SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Disconnected State', () => {
    it('renders "Verbinding verbroken" when disconnected', () => {
      render(<LiveConnectionIndicator isConnected={false} />);
      expect(screen.getByText('Verbinding verbroken')).toBeInTheDocument();
    });

    it('applies red background when disconnected', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={false} />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('shows red dot without pulse when disconnected', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={false} />);
      const dot = container.querySelector('.bg-red-500');
      expect(dot).toBeInTheDocument();
      expect(dot).not.toHaveClass('animate-pulse');
    });

    it('shows WifiOff icon when disconnected', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={false} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has rounded-full class for pill shape', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={true} />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('rounded-full');
    });

    it('has proper spacing classes', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={true} />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('px-3', 'py-1.5', 'gap-2');
    });

    it('merges custom className', () => {
      const { container } = render(
        <LiveConnectionIndicator isConnected={true} className="my-custom-class" />
      );
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('my-custom-class');
      expect(indicator).toHaveClass('bg-green-100'); // Still has default
    });
  });

  describe('Dot Indicator', () => {
    it('dot has correct size', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={true} />);
      const dot = container.querySelector('.w-2.h-2');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass('rounded-full');
    });
  });

  describe('Accessibility', () => {
    it('renders as a div element', () => {
      const { container } = render(<LiveConnectionIndicator isConnected={true} />);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('contains readable text for screen readers', () => {
      render(<LiveConnectionIndicator isConnected={true} />);
      // Text should be visible and readable
      expect(screen.getByText('Live verbinding actief')).toBeVisible();
    });
  });
});
