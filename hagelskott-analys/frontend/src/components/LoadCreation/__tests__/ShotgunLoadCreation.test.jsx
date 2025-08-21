import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShotgunLoadCreation from '../ShotgunLoadCreation';
import { useLoadCreationStore } from '@/store/loadCreationStore';
import { getComponents } from '@/services/componentsService';
import { saveShotshellLoad } from '@/services/loadsService';
import { vi } from 'vitest';

// Mock the zustand store
vi.mock('@/store/loadCreationStore');

// Mock the services
vi.mock('@/services/componentsService');
vi.mock('@/services/loadsService');

// A reusable mock state for the store
const mockState = {
  caliber: "12",
  shellLength: "70",
  allComponents: [
      { _id: 'hull1', name: 'Test Hull A', type: 'hull', properties: { gauge: '12', length_mm: 70 } },
      { _id: 'primer1', name: 'Test Primer A', type: 'primer' },
  ],
  openSections: { hull: true, primer: true, powder: true, wad: true, shot: true, naming: true },
  tags: [],
  loadName: "",
  selectedHull: null,
  // Mock all other state properties and actions
  setField: vi.fn(),
  toggleSection: vi.fn(),
  setAllComponents: vi.fn(),
  selectHull: vi.fn(),
  selectPrimer: vi.fn(),
  selectPowder: vi.fn(),
  selectWad: vi.fn(),
  selectShot: vi.fn(),
  resetForm: vi.fn(),
  handleShotTypeChange: vi.fn(),
  addTag: vi.fn(),
  toggleTag: vi.fn(),
};

describe('ShotgunLoadCreation', () => {
  beforeEach(() => {
    // Reset mocks and provide the default mock state before each test
    vi.clearAllMocks();
    useLoadCreationStore.mockReturnValue(mockState);
    getComponents.mockResolvedValue(mockState.allComponents);
    saveShotshellLoad.mockResolvedValue({});
  });

  it('renders the main title', () => {
    render(<ShotgunLoadCreation />);
    expect(screen.getByText('Skapa Hagelladdning')).toBeInTheDocument();
  });

  it('allows user to type a name for the load', async () => {
    const setFieldMock = vi.fn();
    useLoadCreationStore.mockReturnValue({
      ...mockState,
      setField: setFieldMock,
    });

    render(<ShotgunLoadCreation />);

    const nameInput = screen.getByDisplayValue(''); // Find the input by its initial empty value
    await userEvent.type(nameInput, 'My Awesome Load');

    // The input value is controlled by the store, so we check if the action was called
    expect(setFieldMock).toHaveBeenCalledWith('loadName', 'My Awesome Load');
  });

  it('allows user to select a hull component', async () => {
    const selectHullMock = vi.fn();
    useLoadCreationStore.mockReturnValue({
      ...mockState,
      selectHull: selectHullMock,
    });

    render(<ShotgunLoadCreation />);

    // Find a component card by its name and click it
    const hullCard = await screen.findByText('Test Hull A');
    await userEvent.click(hullCard);

    expect(selectHullMock).toHaveBeenCalledWith(mockState.allComponents[0]);
  });

  it('calls saveShotshellLoad on form submission', async () => {
    // For this test, let's assume a hull has been selected to make the form valid
    useLoadCreationStore.mockReturnValue({
      ...mockState,
      loadName: 'My Final Load',
      selectedHull: mockState.allComponents[0],
    });

    render(<ShotgunLoadCreation />);

    const saveButton = screen.getByRole('button', { name: /Spara laddning/i });
    await userEvent.click(saveButton);

    // Check if the save service function was called
    // The exact payload depends on the logic inside handleSaveLoad,
    // so this is a basic check that the service was invoked.
    expect(saveShotshellLoad).toHaveBeenCalled();
  });

});
