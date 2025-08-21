import React from 'react';
import { render, screen } from '@testing-library/react';
import ShotgunLoadCreation from '../ShotgunLoadCreation';
import { useLoadCreationStore } from '@/store/loadCreationStore';
import { vi } from 'vitest';

// Mock the zustand store
vi.mock('@/store/loadCreationStore');

// Mock the services
vi.mock('@/services/componentsService', () => ({
  getComponents: vi.fn(() => Promise.resolve([])),
}));
vi.mock('@/services/loadsService', () => ({
  saveShotshellLoad: vi.fn(() => Promise.resolve({})),
}));

describe('ShotgunLoadCreation', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Provide a default state for the store
    useLoadCreationStore.mockReturnValue({
      caliber: "12",
      shellLength: "70",
      allComponents: [],
      openSections: { hull: true },
      tags: [],
      // Add other state properties with default values as needed
      setField: vi.fn(),
      toggleSection: vi.fn(),
      setAllComponents: vi.fn(),
      selectHull: vi.fn(),
      resetForm: vi.fn(),
    });
  });

  it('renders the main title', () => {
    render(<ShotgunLoadCreation />);
    expect(screen.getByText('Skapa Hagelladdning')).toBeInTheDocument();
  });

  it('renders the first collapsible section for caliber and shell length', () => {
    render(<ShotgunLoadCreation />);
    expect(screen.getByText('(1) Kaliber & Hylslängd')).toBeInTheDocument();
  });

});
