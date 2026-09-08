import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('Frontend Foundation — Root App Component Tests', () => {
  it('should render App component with navigation shell', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    const brandingElements = screen.getAllByText('EcoRevive');
    expect(brandingElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Transparent Lifecycle Management for/i)).toBeInTheDocument();
  });
});
