import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from '../LanguageSelector';
import { LanguageProvider } from '@/contexts/LanguageContext';

describe('LanguageSelector', () => {
  it('renders with the current language and toggles on click', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    // Check for English (default)
    expect(screen.getByText('EN')).toBeInTheDocument();

    // Click the button
    const button = screen.getByRole('button', { name: /toggle language/i });
    fireEvent.click(button);

    // Check for Swedish
    expect(screen.getByText('SV')).toBeInTheDocument();

    // Click again to toggle back
    fireEvent.click(button);
    expect(screen.getByText('EN')).toBeInTheDocument();
  });
});
