import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import AppRoutes from '../routes/AppRoutes';
import EcoGuidePage from '../pages/EcoGuidePage';
import ScrollToTop from '../components/common/ScrollToTop';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, ROLES } from '../utils/constants';
import aiService from '../services/ai.service';
import dashboardService from '../services/dashboard.service';
import healthService from '../services/health.service';

vi.mock('../services/ai.service');
vi.mock('../services/dashboard.service');
vi.mock('../services/health.service');

describe('UI Bug Fix: EcoGuide Scroll Position & Auto-Scroll Scoping', () => {
  let scrollToSpy;

  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();

    scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;

    dashboardService.getMyDashboard.mockResolvedValue({
      plantations: { total: 0, verified: 0, pending: 0, underReview: 0, rejected: 0 },
      health: { monitoredTrees: 0 },
      rewards: { totalPoints: 0, recentActivities: [] },
    });

    dashboardService.getAdminDashboard.mockResolvedValue({
      plantations: { total: 0, verified: 0, pending: 0, underReview: 0, rejected: 0 },
      health: { treesWithHealthLogs: 0 },
      rewards: { totalPointsIssued: 0 },
    });

    healthService.getHealthHistory.mockResolvedValue({ healthLogs: [] });

    aiService.sendMessage.mockResolvedValue({
      answer: 'The 9-stage plantation lifecycle encompasses Discover, Assess, Plant, Prove, Verify, Identify, Monitor, Reward, and Track.',
      sources: [
        {
          type: 'knowledge',
          title: 'EcoRevive 9-Stage Lifecycle',
          section: 'The 9-Stage Plantation Lifecycle',
          version: '2.0',
        },
      ],
      status: 'success',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Centralized Route Scroll Restoration (ScrollToTop)
  // =========================================================================
  describe('1. Centralized Route Scroll Restoration', () => {
    it('resets window scroll position to top (0, 0) on route change', () => {
      render(
        <MemoryRouter initialEntries={['/home', '/ecoguide']}>
          <ScrollToTop />
        </MemoryRouter>
      );

      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('triggers scroll reset when navigating from Home to EcoGuide', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <ScrollToTop />
          <Link to="/ecoguide">Go to EcoGuide</Link>
        </MemoryRouter>
      );

      scrollToSpy.mockClear();
      fireEvent.click(screen.getByText('Go to EcoGuide'));
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('triggers scroll reset when navigating from Monitor to EcoGuide', () => {
      render(
        <MemoryRouter initialEntries={['/monitor']}>
          <ScrollToTop />
          <Link to="/ecoguide">Go to EcoGuide</Link>
        </MemoryRouter>
      );

      scrollToSpy.mockClear();
      fireEvent.click(screen.getByText('Go to EcoGuide'));
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('triggers scroll reset when navigating from Admin Dashboard to EcoGuide', () => {
      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <ScrollToTop />
          <Link to="/ecoguide">Go to EcoGuide</Link>
        </MemoryRouter>
      );

      scrollToSpy.mockClear();
      fireEvent.click(screen.getByText('Go to EcoGuide'));
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  // =========================================================================
  // 2. EcoGuide Page Mounting & Heading Visibility
  // =========================================================================
  describe('2. EcoGuide Page Initial Mount & Top-Aligned Layout', () => {
    it('mounts EcoGuide at top with all header elements fully visible and window at (0, 0)', () => {
      render(
        <MemoryRouter>
          <EcoGuidePage />
        </MemoryRouter>
      );

      // Window must be reset to top on mount
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);

      // Complete heading & badges must be present
      expect(screen.getByRole('heading', { level: 1, name: /EcoGuide Assistant/i })).toBeInTheDocument();
      expect(screen.getByText(/Grounded Knowledge Assistant/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero-Billing \(\$0\.00\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Answers grounded strictly in approved platform documentation and environmental guidelines/i)
      ).toBeInTheDocument();

      // Initial welcome message and suggestion chips are present
      expect(screen.getByText(/Hello! I am EcoGuide, your knowledge assistant for EcoRevive/i)).toBeInTheDocument();
      expect(screen.getByText(/How does the 9-stage plantation lifecycle work\?/i)).toBeInTheDocument();
    });

    it('does NOT call scrollIntoView on mount, preventing window jump', () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      render(
        <MemoryRouter>
          <EcoGuidePage />
        </MemoryRouter>
      );

      // scrollIntoView must NOT be invoked on initial page mount
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Chat Messages Auto-Scroll Scoped Internally to Message Feed
  // =========================================================================
  describe('3. Scoped Internal Feed Auto-Scrolling', () => {
    it('scrolls only the internal messages feed container when sending messages, never window', async () => {
      render(
        <MemoryRouter>
          <EcoGuidePage />
        </MemoryRouter>
      );

      const feed = screen.getByTestId('ecoguide-messages-feed');
      const feedScrollToSpy = vi.fn();
      feed.scrollTo = feedScrollToSpy;

      // Clear window.scrollTo calls from mount
      scrollToSpy.mockClear();

      const input = screen.getByTestId('ecoguide-input');
      const sendBtn = screen.getByTestId('ecoguide-send');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Explain 9 stages' } });
        fireEvent.click(sendBtn);
      });

      // Internal container scrollTo should be called to reveal new message
      expect(feedScrollToSpy).toHaveBeenCalled();

      // Window scrollTo should NOT be called for chat message arrival (no document jump)
      expect(scrollToSpy).not.toHaveBeenCalled();

      // Assistant response is displayed with source citation badge
      expect(await screen.findByText(/The 9-stage plantation lifecycle encompasses/i)).toBeInTheDocument();
      expect(screen.getByText(/Approved Sources & Verified Evidence/i)).toBeInTheDocument();
    });

    it('resets internal container scroll to top (0) when Clear Chat is clicked', async () => {
      render(
        <MemoryRouter>
          <EcoGuidePage />
        </MemoryRouter>
      );

      const feed = screen.getByTestId('ecoguide-messages-feed');
      feed.scrollTop = 450;

      const clearBtn = screen.getByRole('button', { name: /Clear Chat/i });
      fireEvent.click(clearBtn);

      expect(feed.scrollTop).toBe(0);
      expect(screen.getByText(/Conversation reset/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Role Navigation Scenarios & AppRoutes Integration
  // =========================================================================
  describe('4. Cross-Role Navigation Integration', () => {
    it('Contributor navigates from /dashboard to /ecoguide cleanly at top', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'jwt-contributor');
      storage.setItem(STORAGE_KEYS.USER, { id: 'c1', name: 'Carol Contributor', role: ROLES.CONTRIBUTOR });

      render(
        <MemoryRouter initialEntries={['/dashboard', '/ecoguide']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { level: 1, name: /EcoGuide Assistant/i })).toBeInTheDocument();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('Caretaker navigates from /monitor to /ecoguide cleanly at top', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'jwt-caretaker');
      storage.setItem(STORAGE_KEYS.USER, { id: 'ct1', name: 'Chris Caretaker', role: ROLES.CARETAKER });

      render(
        <MemoryRouter initialEntries={['/monitor', '/ecoguide']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { level: 1, name: /EcoGuide Assistant/i })).toBeInTheDocument();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('Admin navigates from /admin/dashboard to /ecoguide cleanly at top', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'jwt-admin');
      storage.setItem(STORAGE_KEYS.USER, { id: 'a1', name: 'Alice Admin', role: ROLES.ADMIN });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard', '/ecoguide']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { level: 1, name: /EcoGuide Assistant/i })).toBeInTheDocument();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('Navigating away to another page and returning to EcoGuide starts at top position', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'jwt-contributor');
      storage.setItem(STORAGE_KEYS.USER, { id: 'c1', name: 'Carol Contributor', role: ROLES.CONTRIBUTOR });

      render(
        <MemoryRouter initialEntries={['/ecoguide']}>
          <AuthProvider>
            <Routes>
              <Route path="/ecoguide" element={<EcoGuidePage />} />
              <Route path="/rewards" element={<div>Rewards Ledger Page</div>} />
            </Routes>
            <Link to="/rewards">Go to Rewards</Link>
            <Link to="/ecoguide">Return to EcoGuide</Link>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: /EcoGuide Assistant/i })).toBeInTheDocument();

      // Navigate to Rewards
      fireEvent.click(screen.getByText('Go to Rewards'));
      expect(await screen.findByText('Rewards Ledger Page')).toBeInTheDocument();

      // Return to EcoGuide
      scrollToSpy.mockClear();
      fireEvent.click(screen.getByText('Return to EcoGuide'));
      expect(await screen.findByRole('heading', { level: 1, name: /EcoGuide Assistant/i })).toBeInTheDocument();
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  });
});

