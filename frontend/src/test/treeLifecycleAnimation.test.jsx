import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TreeLifecycleAnimation from '../components/home/TreeLifecycleAnimation';

describe('Tree Lifecycle Animation Component Tests', () => {
  it('should render the tree lifecycle animation container with accessibility attributes', () => {
    render(<TreeLifecycleAnimation />);

    const container = screen.getByTestId('tree-lifecycle-animation');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-label');
    expect(container.getAttribute('aria-label')).toMatch(/natural tree lifecycle/i);
  });

  it('should render all sequential lifecycle phase labels for the animation cycle', () => {
    render(<TreeLifecycleAnimation />);

    expect(screen.getByText('Seed Germination')).toBeInTheDocument();
    expect(screen.getByText('Young Sprout')).toBeInTheDocument();
    expect(screen.getByText('Active Growth')).toBeInTheDocument();
    expect(screen.getByText('Mature Canopy')).toBeInTheDocument();
    expect(screen.getByText('Autumn Shift')).toBeInTheDocument();
    expect(screen.getByText('Winter Dormancy')).toBeInTheDocument();
    expect(screen.getByText('Natural Renewal')).toBeInTheDocument();
  });

  it('should render the prefers-reduced-motion fallback label', () => {
    render(<TreeLifecycleAnimation />);

    expect(screen.getByText('Mature Tree & Renewal')).toBeInTheDocument();
  });

  it('should contain the botanical lifecycle caption and SVG illustration elements', () => {
    render(<TreeLifecycleAnimation />);

    expect(
      screen.getByText(/Botanical Lifecycle • Continuous Renewal Cycle/i)
    ).toBeInTheDocument();

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 400 410');
  });
});
