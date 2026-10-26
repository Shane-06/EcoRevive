import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import AppRoutes from '../routes/AppRoutes';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import aiService from '../services/ai.service';

function renderWithRouter(initialRoute = '/ecoguide') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Frontend V2-M2 — EcoGuide Knowledge Assistant', () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  it('should redirect unauthenticated users from /ecoguide to /login', () => {
    renderWithRouter('/ecoguide');
    expect(screen.getByText(/Sign In to EcoRevive/i)).toBeInTheDocument();
  });

  it('should allow authenticated users to view EcoGuide with welcome message and suggestions', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    renderWithRouter('/ecoguide');

    expect(await screen.findByText(/EcoGuide Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Grounded Knowledge Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero-Billing \(\$0\.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/I am EcoGuide, your knowledge assistant/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask about lifecycle, verification, soil, or tree health/i)).toBeInTheDocument();
  });

  it('should send user message, display loading state, and render response with sources', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    const mockResponse = {
      answer: 'The 9 stages are Discover, Assess, Plant, Prove, Verify, Identify, Monitor, Reward, and Track.',
      sources: [
        {
          source_id: 'DOC-CORE-001',
          title: 'EcoRevive 9-Stage Plantation Lifecycle Standard',
          section: 'Section 1: 9-Stage Lifecycle Flow',
          version: '1.0.0',
        },
      ],
      status: 'success',
    };

    vi.spyOn(aiService, 'sendMessage').mockResolvedValue(mockResponse);

    renderWithRouter('/ecoguide');

    const input = await screen.findByTestId('ecoguide-input');
    const sendButton = screen.getByTestId('ecoguide-send');

    fireEvent.change(input, { target: { value: 'Explain the 9 stages' } });
    expect(screen.getByText('20/1000')).toBeInTheDocument();

    fireEvent.click(sendButton);

    // Verify optimistic user message
    expect(screen.getByText('Explain the 9 stages')).toBeInTheDocument();

    // Wait for response and sources
    await waitFor(() => {
      expect(screen.getByText(/The 9 stages are Discover, Assess, Plant/i)).toBeInTheDocument();
      expect(screen.getByText(/Section 1: 9-Stage Lifecycle Flow/i)).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    expect(aiService.sendMessage).toHaveBeenCalledWith({
      message: 'Explain the 9 stages',
      history: expect.any(Array),
    });
  });

  it('should support clicking suggestion chips to trigger queries', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    const mockResponse = {
      answer: 'Optimal soil pH ranges from 6.0 to 7.5.',
      sources: [
        {
          source_id: 'DOC-ENV-001',
          title: 'Environmental Suitability Guidelines',
          section: 'Section 3: Soil Quality Criteria',
          version: '1.0.0',
        },
      ],
      status: 'success',
    };

    vi.spyOn(aiService, 'sendMessage').mockResolvedValue(mockResponse);

    renderWithRouter('/ecoguide');

    const suggestion = await screen.findByText('What soil pH and texture are optimal for planting?');
    fireEvent.click(suggestion);

    await waitFor(() => {
      expect(screen.getByText(/Optimal soil pH ranges from 6\.0 to 7\.5\./i)).toBeInTheDocument();
    });
  });

  it('should display error alert with retry button when AI service fails', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    const error = new Error('AI provider service temporarily unavailable (503).');
    vi.spyOn(aiService, 'sendMessage').mockRejectedValue(error);

    renderWithRouter('/ecoguide');

    const input = await screen.findByTestId('ecoguide-input');
    const sendButton = screen.getByTestId('ecoguide-send');

    fireEvent.change(input, { target: { value: 'Test error handling' } });
    fireEvent.click(sendButton);

    expect(await screen.findByText(/AI provider service temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();

    // Now mock success for retry
    aiService.sendMessage.mockResolvedValueOnce({
      answer: 'Recovered after retry.',
      sources: [],
      status: 'success',
    });

    const retryButton = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Recovered after retry.')).toBeInTheDocument();
    });
  });

  it('should reset conversation when Clear Chat button is clicked', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    renderWithRouter('/ecoguide');

    const clearButton = await screen.findByRole('button', { name: /Clear Chat/i });
    fireEvent.click(clearButton);

    expect(screen.getByText(/Conversation reset/i)).toBeInTheDocument();
  });

  it('should render both approved knowledge sources and live-data evidence citations', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    const mockResponse = {
      answer: 'According to your verified records, you have registered 2 plantations.',
      sources: [
        {
          type: 'live_data',
          sourceId: 'TOOL-USER-PLANTATIONS',
          title: 'Contributor Registered Plantations',
          tool: 'getUserPlantationsSummary',
          entityId: null,
        },
        {
          type: 'live_data',
          sourceId: 'TOOL-VERIFIED-TREE',
          title: 'Verified Tree Status Record',
          tool: 'getVerifiedTreeStatus',
          entityId: 'ER-PLT-00042',
        },
        {
          type: 'knowledge',
          sourceId: 'DOC-CORE-001',
          title: 'EcoRevive Lifecycle Standard',
          section: 'Section 1: 9-Stage Lifecycle Flow',
          version: '1.0.0',
        },
      ],
      status: 'success',
    };

    vi.spyOn(aiService, 'sendMessage').mockResolvedValue(mockResponse);

    renderWithRouter('/ecoguide');

    const input = await screen.findByTestId('ecoguide-input');
    const sendButton = screen.getByTestId('ecoguide-send');

    fireEvent.change(input, { target: { value: 'Status of my plantations' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/According to your verified records/i)).toBeInTheDocument();
      expect(screen.getByText('Contributor Registered Plantations')).toBeInTheDocument();
      expect(screen.getByText('Verified Tree Status Record')).toBeInTheDocument();
      expect(screen.getByText('ER-PLT-00042')).toBeInTheDocument();
      expect(screen.getByText('Section 1: 9-Stage Lifecycle Flow')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });
  });

  it('should render plantation count live data response without displaying Limited Knowledge Match', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    const mockResponse = {
      answer: 'According to your verified plantation records, you have registered 2 tree plantation(s) in EcoRevive (1 verified, 1 pending).',
      sources: [
        {
          type: 'live_data',
          sourceId: 'TOOL-USER-PLANTATIONS',
          title: 'Contributor Registered Plantations',
          tool: 'getUserPlantationsSummary',
          entityId: null,
        },
      ],
      status: 'success',
    };

    vi.spyOn(aiService, 'sendMessage').mockResolvedValue(mockResponse);

    renderWithRouter('/ecoguide');

    const input = await screen.findByTestId('ecoguide-input');
    const sendButton = screen.getByTestId('ecoguide-send');

    fireEvent.change(input, { target: { value: 'tell me how many plantation i have done till now' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/you have registered 2 tree plantation\(s\)/i)).toBeInTheDocument();
      expect(screen.getByText('Contributor Registered Plantations')).toBeInTheDocument();
    });

    // Crucial invariant: Live-data success must NOT display "Limited Knowledge Match"
    expect(screen.queryByText(/Limited Knowledge Match/i)).not.toBeInTheDocument();
  });

  it('should render capability guidance when user asks "what question can i ask?" without displaying Limited Knowledge Match', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    const mockResponse = {
      answer: 'I am EcoGuide, your contextual knowledge and platform assistant for EcoRevive. Here is what you can ask me: Your Plantation Records, Verified Tree Status, and Tree Health Observations.',
      sources: [],
      status: 'success',
    };

    vi.spyOn(aiService, 'sendMessage').mockResolvedValue(mockResponse);

    renderWithRouter('/ecoguide');

    const input = await screen.findByTestId('ecoguide-input');
    const sendButton = screen.getByTestId('ecoguide-send');

    fireEvent.change(input, { target: { value: 'what question can i ask?' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Here is what you can ask me/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Limited Knowledge Match/i)).not.toBeInTheDocument();
  });

  it('should display Limited Knowledge Match warning for legitimate insufficient_information questions', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'u1',
      name: 'Eco Contributor',
      email: 'contributor@example.com',
      role: 'contributor',
    });

    const mockResponse = {
      answer: 'I do not have enough verified information in the EcoRevive knowledge base to answer that question.',
      sources: [],
      status: 'insufficient_information',
    };

    vi.spyOn(aiService, 'sendMessage').mockResolvedValue(mockResponse);

    renderWithRouter('/ecoguide');

    const input = await screen.findByTestId('ecoguide-input');
    const sendButton = screen.getByTestId('ecoguide-send');

    fireEvent.change(input, { target: { value: 'What is the stock market closing price of Microsoft today?' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Limited Knowledge Match: Question is outside approved EcoRevive documentation/i)).toBeInTheDocument();
    });
  });
});

