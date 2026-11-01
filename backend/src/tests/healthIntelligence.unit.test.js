/**
 * EcoRevive V2-M4 — Unit Test Suite: Tree Health Intelligence
 *
 * Tests:
 * 1. Health Trend Algorithm (14 scenarios)
 * 2. Monitoring Completeness & Freshness (9 scenarios)
 * 3. Follow-Up Suggestions Rules Engine
 */

const {
  calculateHealthTrend,
  getSeverity,
  sortObservationsNewestFirst,
} = require('../services/healthIntelligence/healthTrend.service');
const {
  calculateMonitoringStatus,
  resolveIntervalDays,
  MS_PER_DAY,
} = require('../services/healthIntelligence/monitoringStatus.service');
const {
  generateFollowUpSuggestions,
} = require('../services/healthIntelligence/followUp.service');
const { ValidationError } = require('../utils/errors');

describe('V2-M4: Tree Health Intelligence — Unit Tests', () => {
  describe('1. Health Trend Algorithm', () => {
    // 1. Empty observation history
    test('1. Empty observation history returns "no_record"', () => {
      const result = calculateHealthTrend([]);
      expect(result.trend).toBe('no_record');
      expect(result.evidenceCount).toBe(0);
      expect(result.evidence).toEqual([]);
      expect(result.explanation).toContain('No usable health observations exist');
    });

    test('1b. Null or non-array history returns "no_record"', () => {
      expect(calculateHealthTrend(null).trend).toBe('no_record');
      expect(calculateHealthTrend(undefined).trend).toBe('no_record');
    });

    // 2. One observation
    test('2. Single observation returns "insufficient_history"', () => {
      const observations = [
        { id: 'obs-1', health_status: 'Healthy', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('insufficient_history');
      expect(result.evidenceCount).toBe(1);
      expect(result.evidence[0]).toMatchObject({
        id: 'obs-1',
        status: 'Healthy',
      });
      expect(result.explanation).toContain('at least two observations are required');
    });

    // 3. Two observations with increasing severity (worsening)
    test('3. Two observations with increasing severity return "worsening"', () => {
      const observations = [
        { id: 'obs-2', health_status: 'Good', recorded_at: '2026-09-15T10:00:00Z' },
        { id: 'obs-1', health_status: 'Healthy', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('worsening');
      expect(result.evidenceCount).toBe(2);
      expect(result.explanation).toContain('worsening');
    });

    // 4. Two observations with decreasing severity (improving)
    test('4. Two observations with decreasing severity return "improving"', () => {
      const observations = [
        { id: 'obs-2', health_status: 'Healthy', recorded_at: '2026-09-15T10:00:00Z' },
        { id: 'obs-1', health_status: 'Needs Attention', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('improving');
      expect(result.evidenceCount).toBe(2);
      expect(result.explanation).toContain('improving');
    });

    // 5. Two observations with equal severity (stable)
    test('5. Two observations with equal severity return "stable"', () => {
      const observations = [
        { id: 'obs-2', health_status: 'Good', recorded_at: '2026-09-15T10:00:00Z' },
        { id: 'obs-1', health_status: 'Good', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('stable');
      expect(result.evidenceCount).toBe(2);
      expect(result.explanation).toContain('stable');
    });

    // 6. Three observations with two consecutive increases (worsening)
    test('6. Three observations with two consecutive increases return "worsening"', () => {
      const observations = [
        { id: 'obs-3', health_status: 'Needs Attention', recorded_at: '2026-10-01T10:00:00Z' },
        { id: 'obs-2', health_status: 'Good', recorded_at: '2026-09-15T10:00:00Z' },
        { id: 'obs-1', health_status: 'Healthy', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('worsening');
      expect(result.evidenceCount).toBe(3);
      expect(result.evidence.map(e => e.status)).toEqual(['Healthy', 'Good', 'Needs Attention']);
    });

    // 7. Three observations with two consecutive decreases (improving)
    test('7. Three observations with two consecutive decreases return "improving"', () => {
      const observations = [
        { id: 'obs-3', health_status: 'Healthy', recorded_at: '2026-10-01T10:00:00Z' },
        { id: 'obs-2', health_status: 'Good', recorded_at: '2026-09-15T10:00:00Z' },
        { id: 'obs-1', health_status: 'Needs Attention', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('improving');
      expect(result.evidenceCount).toBe(3);
      expect(result.evidence.map(e => e.status)).toEqual(['Needs Attention', 'Good', 'Healthy']);
    });

    // 8. Three observations with identical severity (stable)
    test('8. Three observations with identical severity return "stable"', () => {
      const observations = [
        { id: 'obs-3', health_status: 'Healthy', recorded_at: '2026-10-01T10:00:00Z' },
        { id: 'obs-2', health_status: 'Healthy', recorded_at: '2026-09-15T10:00:00Z' },
        { id: 'obs-1', health_status: 'Healthy', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('stable');
      expect(result.evidenceCount).toBe(3);
    });

    // 9. Three observations with mixed movement (mixed)
    test('9. Three observations with mixed movement return "mixed"', () => {
      const observations = [
        { id: 'obs-3', health_status: 'Healthy', recorded_at: '2026-10-01T10:00:00Z' },
        { id: 'obs-2', health_status: 'Needs Attention', recorded_at: '2026-09-15T10:00:00Z' },
        { id: 'obs-1', health_status: 'Healthy', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('mixed');
      expect(result.evidenceCount).toBe(3);
    });

    // 10. Out-of-order input
    test('10. Out-of-order input is sorted chronologically before analysis', () => {
      const observations = [
        { id: 'obs-1', health_status: 'Healthy', recorded_at: '2026-08-01T10:00:00Z' },
        { id: 'obs-3', health_status: 'Dead', recorded_at: '2026-10-01T10:00:00Z' },
        { id: 'obs-2', health_status: 'Needs Attention', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('worsening');
      expect(result.evidence.map(e => e.status)).toEqual(['Healthy', 'Needs Attention', 'Dead']);
    });

    // 11. Equal timestamps and deterministic tie-breaking
    test('11. Equal timestamps tie-break deterministically on created_at and id', () => {
      const observations = [
        { id: 'obs-a', health_status: 'Healthy', recorded_at: '2026-09-01T10:00:00Z', created_at: '2026-09-01T10:00:00Z' },
        { id: 'obs-b', health_status: 'Good', recorded_at: '2026-09-01T10:00:00Z', created_at: '2026-09-01T10:05:00Z' },
      ];
      // obs-b has newer created_at, so newest first is [obs-b, obs-a].
      // Chronological order: [obs-a, obs-b] -> Healthy (0) -> Good (1) -> worsening.
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('worsening');
      expect(result.evidence[0].id).toBe('obs-a');
      expect(result.evidence[1].id).toBe('obs-b');
    });

    test('11b. Same recorded_at and created_at tie-break on id string', () => {
      const observations = [
        { id: '00000000-0000-0000-0000-000000000001', health_status: 'Healthy', recorded_at: '2026-09-01T10:00:00Z', created_at: '2026-09-01T10:00:00Z' },
        { id: '00000000-0000-0000-0000-000000000002', health_status: 'Dead', recorded_at: '2026-09-01T10:00:00Z', created_at: '2026-09-01T10:00:00Z' },
      ];
      const sorted = sortObservationsNewestFirst(observations);
      expect(sorted[0].id).toBe('00000000-0000-0000-0000-000000000002');
    });

    // 12. Invalid or unmapped statuses
    test('12. Invalid or unmapped statuses throw ValidationError', () => {
      const observations = [
        { id: 'obs-1', health_status: 'UnknownStatus', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      expect(() => calculateHealthTrend(observations)).toThrow(ValidationError);
      expect(() => getSeverity('Rotting')).toThrow(ValidationError);
    });

    // 13. Missing timestamps or unusable observations
    test('13. Observations missing timestamp or status are safely filtered', () => {
      const observations = [
        { id: 'obs-invalid-1', health_status: null, recorded_at: '2026-09-01T10:00:00Z' },
        { id: 'obs-invalid-2', health_status: 'Good', recorded_at: 'not-a-date' },
        { id: 'obs-valid', health_status: 'Healthy', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const result = calculateHealthTrend(observations);
      expect(result.trend).toBe('insufficient_history');
      expect(result.evidenceCount).toBe(1);
      expect(result.evidence[0].id).toBe('obs-valid');
    });

    // 14. Repeated executions producing identical output
    test('14. Repeated executions produce 100% identical outputs', () => {
      const observations = [
        { id: 'obs-1', health_status: 'Healthy', recorded_at: '2026-08-01T10:00:00Z' },
        { id: 'obs-2', health_status: 'Good', recorded_at: '2026-08-15T10:00:00Z' },
        { id: 'obs-3', health_status: 'Needs Attention', recorded_at: '2026-09-01T10:00:00Z' },
      ];
      const res1 = calculateHealthTrend(observations);
      const res2 = calculateHealthTrend(observations);
      expect(res1).toEqual(res2);
    });
  });

  describe('2. Monitoring Completeness & Freshness', () => {
    const fixedNow = new Date('2026-10-15T12:00:00.000Z');

    // 1. Missing history
    test('1. Missing history returns "no_record" and isOverdue: false', () => {
      const result = calculateMonitoringStatus(null, { now: fixedNow });
      expect(result.status).toBe('no_record');
      expect(result.isOverdue).toBe(false);
      expect(result.daysSinceLastObservation).toBeNull();
      expect(result.intervalDays).toBe(30);
    });

    // 2. Recent observation
    test('2. Recent observation (5 days ago) returns "up_to_date" and isOverdue: false', () => {
      const obsTime = new Date(fixedNow.getTime() - 5 * MS_PER_DAY).toISOString();
      const result = calculateMonitoringStatus(obsTime, { now: fixedNow });
      expect(result.status).toBe('up_to_date');
      expect(result.isOverdue).toBe(false);
      expect(result.daysSinceLastObservation).toBe(5);
    });

    // 3. Exactly 30 elapsed days (720.0 hours)
    test('3. Exactly 30 elapsed days (720 hours = 2,592,000,000 ms) is "up_to_date"', () => {
      const intervalMs = 30 * MS_PER_DAY;
      const obsTime = new Date(fixedNow.getTime() - intervalMs).toISOString();
      const result = calculateMonitoringStatus(obsTime, { now: fixedNow, intervalDays: 30 });
      expect(result.status).toBe('up_to_date');
      expect(result.isOverdue).toBe(false);
      expect(result.daysSinceLastObservation).toBe(30);
    });

    // 4. Thirty days plus one millisecond (720 hours + 1 ms)
    test('4. Exactly 30 days plus 1 millisecond is "overdue"', () => {
      const intervalMs = 30 * MS_PER_DAY + 1;
      const obsTime = new Date(fixedNow.getTime() - intervalMs).toISOString();
      const result = calculateMonitoringStatus(obsTime, { now: fixedNow, intervalDays: 30 });
      expect(result.status).toBe('overdue');
      expect(result.isOverdue).toBe(true);
      expect(result.daysSinceLastObservation).toBe(30);
    });

    // 5. Future timestamp handled safely
    test('5. Future observation timestamp clamped to 0 elapsed and "up_to_date"', () => {
      const futureTime = new Date(fixedNow.getTime() + 10 * MS_PER_DAY).toISOString();
      const result = calculateMonitoringStatus(futureTime, { now: fixedNow });
      expect(result.status).toBe('up_to_date');
      expect(result.isOverdue).toBe(false);
      expect(result.daysSinceLastObservation).toBe(0);
    });

    // 6. UTC handling independent of local timezone
    test('6. UTC elapsed time comparison is timezone independent', () => {
      const obsTimeUTC = '2026-09-15T12:00:00.000Z';
      const nowUTC = new Date('2026-10-15T12:00:00.000Z'); // exactly 30 days
      const result = calculateMonitoringStatus(obsTimeUTC, { now: nowUTC });
      expect(result.status).toBe('up_to_date');
      expect(result.isOverdue).toBe(false);
      expect(result.daysSinceLastObservation).toBe(30);
    });

    // 7. Custom valid monitoring intervals
    test('7. Custom monitoring interval (14 days) is evaluated accurately', () => {
      const obsTime = new Date(fixedNow.getTime() - 15 * MS_PER_DAY).toISOString();
      const result = calculateMonitoringStatus(obsTime, { now: fixedNow, intervalDays: 14 });
      expect(result.intervalDays).toBe(14);
      expect(result.status).toBe('overdue');
      expect(result.isOverdue).toBe(true);
    });

    // 8. Invalid configuration values
    test('8. Invalid interval configuration safely defaults to 30 days', () => {
      expect(resolveIntervalDays(null)).toBe(30);
      expect(resolveIntervalDays(-5)).toBe(30);
      expect(resolveIntervalDays('invalid')).toBe(30);
      expect(resolveIntervalDays(0)).toBe(30);
    });

    // 9. Injectable clock test
    test('9. Injectable clock parameter governs time evaluation cleanly', () => {
      const customClock = new Date('2025-01-01T00:00:00Z');
      const obs = new Date('2024-12-31T00:00:00Z').toISOString(); // 1 day ago
      const result = calculateMonitoringStatus(obs, { now: customClock });
      expect(result.daysSinceLastObservation).toBe(1);
      expect(result.status).toBe('up_to_date');
    });
  });

  describe('3. Explainable Follow-Up Suggestions', () => {
    test('Dead status returns administrative recommendation', () => {
      const result = generateFollowUpSuggestions({
        latestStatus: 'Dead',
        trend: 'worsening',
        monitoring: { status: 'overdue', isOverdue: true },
      });
      expect(result.recommendation).toBe(
        'Follow existing administrative and monitoring procedures for a recorded dead tree.'
      );
      expect(result.suggestions[0].priority).toBe('high');
      expect(result.suggestions[0].reason).toContain('Dead');
    });

    test('Overdue monitoring (not Dead) returns updated observation reminder', () => {
      const result = generateFollowUpSuggestions({
        latestStatus: 'Healthy',
        trend: 'stable',
        monitoring: { status: 'overdue', isOverdue: true, daysSinceLastObservation: 45, intervalDays: 30 },
      });
      expect(result.recommendation).toBe(
        'Record an updated observation through the existing monitoring workflow.'
      );
      expect(result.suggestions.some(s => s.action.includes('Record an updated observation'))).toBe(true);
    });

    test('Worsening trend returns inspection review recommendation', () => {
      const result = generateFollowUpSuggestions({
        latestStatus: 'Needs Attention',
        trend: 'worsening',
        monitoring: { status: 'up_to_date', isOverdue: false, daysSinceLastObservation: 5 },
      });
      expect(result.recommendation).toBe(
        'Review the latest observations and arrange an appropriate follow-up inspection.'
      );
      expect(result.suggestions[0].reason).toContain('consecutive increases in severity');
    });

    test('Improving or Stable healthy condition returns continued monitoring schedule', () => {
      const result = generateFollowUpSuggestions({
        latestStatus: 'Healthy',
        trend: 'stable',
        monitoring: { status: 'up_to_date', isOverdue: false, daysSinceLastObservation: 2 },
      });
      expect(result.recommendation).toBe(
        'Continue monitoring according to the applicable operational schedule.'
      );
    });

    test('Mixed trend returns observation sequence review recommendation', () => {
      const result = generateFollowUpSuggestions({
        latestStatus: 'Good',
        trend: 'mixed',
        monitoring: { status: 'up_to_date', isOverdue: false, daysSinceLastObservation: 10 },
      });
      expect(result.recommendation).toBe(
        'Review the observation sequence and collect further evidence if necessary.'
      );
    });

    test('No record returns initial health observation prompt', () => {
      const result = generateFollowUpSuggestions({
        latestStatus: null,
        trend: 'no_record',
        monitoring: { status: 'no_record', isOverdue: false },
      });
      expect(result.recommendation).toBe(
        'Record an initial health observation through the existing monitoring workflow.'
      );
    });

    test('Critical invariant: Missing records or overdue monitoring NEVER implies Dead', () => {
      const result = generateFollowUpSuggestions({
        latestStatus: null,
        trend: 'no_record',
        monitoring: { status: 'no_record', isOverdue: false },
      });
      expect(result.recommendation).not.toContain('dead');
      expect(result.suggestions.some(s => s.reason.toLowerCase().includes('dead'))).toBe(false);
    });
  });
});
