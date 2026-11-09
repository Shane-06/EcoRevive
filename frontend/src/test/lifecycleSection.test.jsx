import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import HomePage from '../pages/HomePage';
import LifecycleCard from '../components/home/lifecycle/LifecycleCard';
import { Compass, Leaf, Trees, Camera, FileCheck2, QrCode, Activity, Award, LineChart } from 'lucide-react';

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <HomePage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Interactive 9-Stage Plantation Lifecycle Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Section Structure & Verbatim Content Preservation', () => {
    it('renders the complete 9-stage section header and audit trail badge', () => {
      renderHomePage();

      expect(screen.getByText(/Complete Audit Trail/i)).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: /The 9-Stage Plantation Lifecycle/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /From initial site discovery to permanent QR issuance, continuous health monitoring, and long-term impact tracking/i
        )
      ).toBeInTheDocument();
    });

    it('renders all 9 lifecycle stage cards with verbatim numbers, titles, and tags', () => {
      renderHomePage();

      const expectedStages = [
        { num: '01', title: 'Discover', tag: 'Site Selection', phase: 'Phase 1: Planning' },
        { num: '02', title: 'Assess', tag: 'Suitability Engine', phase: 'Phase 1: Planning' },
        { num: '03', title: 'Plant', tag: 'Field Planting', phase: 'Phase 2: Execution' },
        { num: '04', title: 'Prove', tag: 'Evidence Submission', phase: 'Phase 2: Execution' },
        { num: '05', title: 'Verify', tag: 'Coordinator Audit', phase: 'Phase 3: Audit & Identity' },
        { num: '06', title: 'Identify', tag: 'Permanent Identity', phase: 'Phase 3: Audit & Identity' },
        { num: '07', title: 'Monitor', tag: 'Caretaker Logs', phase: 'Phase 4: Stewardship' },
        { num: '08', title: 'Reward', tag: 'Impact Ledger', phase: 'Phase 4: Stewardship' },
        { num: '09', title: 'Track', tag: 'Long-Term Impact', phase: 'Phase 5: Longitudinal Impact' },
      ];

      expectedStages.forEach((stage) => {
        expect(screen.getByTestId(`lifecycle-card-${stage.num}`)).toBeInTheDocument();
        expect(screen.getByText(stage.title)).toBeInTheDocument();
        expect(screen.getByText(stage.tag)).toBeInTheDocument();
      });

      // Verify phase occurrences
      expect(screen.getAllByText('Phase 1: Planning')).toHaveLength(2);
      expect(screen.getAllByText('Phase 2: Execution')).toHaveLength(2);
      expect(screen.getAllByText('Phase 3: Audit & Identity')).toHaveLength(2);
      expect(screen.getAllByText('Phase 4: Stewardship')).toHaveLength(2);
      expect(screen.getAllByText('Phase 5: Longitudinal Impact')).toHaveLength(1);
    });

    it('preserves exact descriptions across all 9 stages', () => {
      renderHomePage();

      expect(
        screen.getByText(/Select geographic coordinates on the interactive Leaflet map to inspect atmospheric and soil properties\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Evaluate location compatibility deterministically using real-time Open-Meteo weather and ISRIC SoilGrids data/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Plant the native sapling adhering to biological spacing, soil depth, and sunlight requirements\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Submit plantation date, precise GPS coordinates, and photographic field evidence for audit\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Authorized coordinators review the submission queue, inspect evidence, and atomically approve or reject/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Backend generates an immutable, authoritative Tree ID \(e\.g\. ER-PLT-00042\) and public QR identity card\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Caretakers inspect verified trees on-site, recording health logs restricted to 4 frozen clinical statuses/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Contributors earn 50 authoritative reward points for each verified tree, tracked on an immutable transaction ledger\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Follow longitudinal tree survival, historical observation timelines, and aggregated ecological impact/i)
      ).toBeInTheDocument();
    });
  });

  describe('2. Accessibility & Keyboard Navigation', () => {
    const sampleStage = {
      num: '01',
      title: 'Discover',
      tag: 'Site Selection',
      desc: 'Select geographic coordinates on the interactive Leaflet map to inspect atmospheric and soil properties.',
      icon: Compass,
      stageGroup: 'Phase 1: Planning',
    };

    it('sets proper tabIndex, role, and accessible aria-label on cards', () => {
      render(<LifecycleCard stage={sampleStage} />);
      const card = screen.getByRole('article', { name: /Stage 01: Discover — Site Selection/i });

      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('activates on focus and deactivates on blur', () => {
      render(<LifecycleCard stage={sampleStage} />);
      const card = screen.getByTestId('lifecycle-card-01');

      expect(screen.getByText(/Explore/i)).toBeInTheDocument();

      fireEvent.focus(card);
      expect(screen.getByText(/Inspecting/i)).toBeInTheDocument();
      expect(card.querySelector('.stage-active')).toBeInTheDocument();

      fireEvent.blur(card);
      expect(screen.getByText(/Explore/i)).toBeInTheDocument();
      expect(card.querySelector('.stage-active')).not.toBeInTheDocument();
    });

    it('toggles active inspection state via Enter and Space keys', () => {
      render(<LifecycleCard stage={sampleStage} />);
      const card = screen.getByTestId('lifecycle-card-01');

      // Press Enter to activate
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
      expect(screen.getByText(/Inspecting/i)).toBeInTheDocument();

      // Press Space to deactivate
      fireEvent.keyDown(card, { key: ' ', code: 'Space' });
      expect(screen.getByText(/Explore/i)).toBeInTheDocument();
    });
  });

  describe('3. Pointer Interactions (Hover & Click/Tap)', () => {
    const sampleStage = {
      num: '03',
      title: 'Plant',
      tag: 'Field Planting',
      desc: 'Plant the native sapling adhering to biological spacing, soil depth, and sunlight requirements.',
      icon: Trees,
      stageGroup: 'Phase 2: Execution',
    };

    it('activates micro-animation on mouseEnter and reverts on mouseLeave', () => {
      render(<LifecycleCard stage={sampleStage} />);
      const card = screen.getByTestId('lifecycle-card-03');

      expect(card.querySelector('.stage-active')).not.toBeInTheDocument();

      fireEvent.mouseEnter(card);
      expect(card.querySelector('.stage-active')).toBeInTheDocument();
      expect(screen.getByText(/Inspecting/i)).toBeInTheDocument();

      fireEvent.mouseLeave(card);
      expect(card.querySelector('.stage-active')).not.toBeInTheDocument();
      expect(screen.getByText(/Explore/i)).toBeInTheDocument();
    });

    it('toggles active state on click/tap for touch device compatibility', () => {
      render(<LifecycleCard stage={sampleStage} />);
      const card = screen.getByTestId('lifecycle-card-03');

      fireEvent.click(card);
      expect(card.querySelector('.stage-active')).toBeInTheDocument();

      fireEvent.click(card);
      expect(card.querySelector('.stage-active')).not.toBeInTheDocument();
    });
  });

  describe('4. Stage-Specific Botanical SVG Micro-Illustrations', () => {
    const allStages = [
      {
        num: '01',
        title: 'Discover',
        tag: 'Site Selection',
        desc: 'Coordinates inspection',
        icon: Compass,
        stageGroup: 'Phase 1: Planning',
        keyText: '12.9716° N, 77.5946° E',
      },
      {
        num: '02',
        title: 'Assess',
        tag: 'Suitability Engine',
        desc: 'Soil and weather evaluation',
        icon: Leaf,
        stageGroup: 'Phase 1: Planning',
        keyText: '94% MATCH',
      },
      {
        num: '03',
        title: 'Plant',
        tag: 'Field Planting',
        desc: 'Field sapling planting',
        icon: Trees,
        stageGroup: 'Phase 2: Execution',
        keyText: 'DEPTH: 30 CM',
      },
      {
        num: '04',
        title: 'Prove',
        tag: 'Evidence Submission',
        desc: 'Photo evidence capture',
        icon: Camera,
        stageGroup: 'Phase 2: Execution',
        keyText: 'GPS: GEO-TAGGED • 100% EVIDENCE',
      },
      {
        num: '05',
        title: 'Verify',
        tag: 'Coordinator Audit',
        desc: 'Coordinator verification',
        icon: FileCheck2,
        stageGroup: 'Phase 3: Audit & Identity',
        keyText: 'COORDINATOR AUDIT CHECKLIST',
      },
      {
        num: '06',
        title: 'Identify',
        tag: 'Permanent Identity',
        desc: 'Authoritative Tree ID',
        icon: QrCode,
        stageGroup: 'Phase 3: Audit & Identity',
        keyText: 'ER-PLT-00042',
      },
      {
        num: '07',
        title: 'Monitor',
        tag: 'Caretaker Logs',
        desc: 'Clinical health status',
        icon: Activity,
        stageGroup: 'Phase 4: Stewardship',
        keyText: 'HEALTH: GOOD',
      },
      {
        num: '08',
        title: 'Reward',
        tag: 'Impact Ledger',
        desc: '50 points ledger reward',
        icon: Award,
        stageGroup: 'Phase 4: Stewardship',
        keyText: '+50 PTS',
      },
      {
        num: '09',
        title: 'Track',
        tag: 'Long-Term Impact',
        desc: 'Longitudinal growth trajectory',
        icon: LineChart,
        stageGroup: 'Phase 5: Longitudinal Impact',
        keyText: 'Y10 (Canopy)',
      },
    ];

    it.each(allStages)('renders dedicated micro-illustration artwork for stage $num ($title)', (stage) => {
      render(<LifecycleCard stage={stage} />);

      const card = screen.getByTestId(`lifecycle-card-${stage.num}`);
      const svg = card.querySelector('svg.stage-illustration-svg');
      expect(svg).toBeInTheDocument();
      expect(screen.getByText(stage.keyText)).toBeInTheDocument();
    });
  });
});
