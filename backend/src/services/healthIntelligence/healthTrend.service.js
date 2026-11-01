/**
 * EcoRevive V2-M4 — Deterministic Health Trend Service
 *
 * Implements pure deterministic calculation of tree health trends based on
 * up to 3 chronologically ordered verified health observations.
 *
 * Severity mapping:
 * - Healthy: 0
 * - Good: 1
 * - Needs Attention: 2
 * - Dead: 3
 */

const { ValidationError } = require('../../utils/errors');

const SEVERITY_MAP = Object.freeze({
  'Healthy': 0,
  'Good': 1,
  'Needs Attention': 2,
  'Dead': 3,
});

const VALID_HEALTH_STATUSES = Object.freeze(Object.keys(SEVERITY_MAP));

/**
 * Validates a health status string and returns its deterministic severity.
 * Throws a ValidationError if the status is unknown or invalid.
 *
 * @param {string} status
 * @returns {number} 0 | 1 | 2 | 3
 */
function getSeverity(status) {
  if (typeof status !== 'string') {
    throw new ValidationError(`Invalid health status type. Expected string, received ${typeof status}.`);
  }
  const trimmed = status.trim();
  if (!Object.prototype.hasOwnProperty.call(SEVERITY_MAP, trimmed)) {
    throw new ValidationError(
      `Unmapped or invalid health status: "${trimmed}". Allowed values: [${VALID_HEALTH_STATUSES.join(', ')}]`
    );
  }
  return SEVERITY_MAP[trimmed];
}

/**
 * Sorts observation records deterministically:
 * Primary: recorded_at DESC
 * Secondary tie-breaker: created_at DESC (if present)
 * Tertiary tie-breaker: id DESC
 *
 * @param {Array<object>} records
 * @returns {Array<object>}
 */
function sortObservationsNewestFirst(records) {
  return [...records].sort((a, b) => {
    const timeA = new Date(a.recorded_at || a.recordedAt || 0).getTime();
    const timeB = new Date(b.recorded_at || b.recordedAt || 0).getTime();
    if (timeA !== timeB) {
      return timeB - timeA;
    }

    const createdA = new Date(a.created_at || a.createdAt || 0).getTime();
    const createdB = new Date(b.created_at || b.createdAt || 0).getTime();
    if (createdA !== createdB) {
      return createdB - createdA;
    }

    const idA = String(a.id || '');
    const idB = String(b.id || '');
    return idB.localeCompare(idA);
  });
}

/**
 * Pure deterministic function to calculate tree health trend from health observations.
 *
 * @param {Array<object>} rawObservations - Array of observation objects ({ id, health_status|healthStatus, recorded_at|recordedAt })
 * @returns {{
 *   trend: 'no_record' | 'insufficient_history' | 'worsening' | 'improving' | 'stable' | 'mixed',
 *   explanation: string,
 *   evidenceCount: number,
 *   evidence: Array<{ id: string, status: string, observedAt: string }>
 * }}
 */
function calculateHealthTrend(rawObservations) {
  if (!Array.isArray(rawObservations) || rawObservations.length === 0) {
    return {
      trend: 'no_record',
      explanation: 'No usable health observations exist for this tree.',
      evidenceCount: 0,
      evidence: [],
    };
  }

  // Filter out any entries that completely lack status or recorded timestamp
  const usable = rawObservations.filter((obs) => {
    if (!obs || typeof obs !== 'object') return false;
    const status = obs.health_status || obs.healthStatus;
    const time = obs.recorded_at || obs.recordedAt;
    if (!status || !time) return false;
    const dateVal = new Date(time);
    return !Number.isNaN(dateVal.getTime());
  });

  if (usable.length === 0) {
    return {
      trend: 'no_record',
      explanation: 'No usable health observations exist for this tree.',
      evidenceCount: 0,
      evidence: [],
    };
  }

  // Deterministically sort newest first and take up to 3
  const sortedNewestFirst = sortObservationsNewestFirst(usable);
  const selectedNewestFirst = sortedNewestFirst.slice(0, 3);

  // Reverse to chronological order (oldest to newest) for transition analysis: O_1, O_2, O_3
  const chronological = [...selectedNewestFirst].reverse();

  // Validate severities and build minimal sanitized evidence
  const evidence = chronological.map((obs) => {
    const status = (obs.health_status || obs.healthStatus).trim();
    // Validates status through getSeverity (throws ValidationError on invalid values)
    getSeverity(status);
    const timeStr = new Date(obs.recorded_at || obs.recordedAt).toISOString();
    return {
      id: String(obs.id || ''),
      status,
      observedAt: timeStr,
    };
  });

  const N = evidence.length;

  if (N === 1) {
    return {
      trend: 'insufficient_history',
      explanation: `Only one health observation (${evidence[0].status}) is recorded; at least two observations are required to determine a health trend.`,
      evidenceCount: 1,
      evidence,
    };
  }

  if (N === 2) {
    const s1 = getSeverity(evidence[0].status);
    const s2 = getSeverity(evidence[1].status);

    if (s2 > s1) {
      return {
        trend: 'worsening',
        explanation: `The health status transitioned from ${evidence[0].status} to ${evidence[1].status}, indicating a worsening trend.`,
        evidenceCount: 2,
        evidence,
      };
    }
    if (s2 < s1) {
      return {
        trend: 'improving',
        explanation: `The health status transitioned from ${evidence[0].status} to ${evidence[1].status}, indicating an improving trend.`,
        evidenceCount: 2,
        evidence,
      };
    }
    return {
      trend: 'stable',
      explanation: `Both consecutive observations were recorded as ${evidence[0].status}, indicating a stable condition.`,
      evidenceCount: 2,
      evidence,
    };
  }

  // N === 3
  const s1 = getSeverity(evidence[0].status);
  const s2 = getSeverity(evidence[1].status);
  const s3 = getSeverity(evidence[2].status);

  const delta1 = s2 - s1;
  const delta2 = s3 - s2;

  if (delta1 > 0 && delta2 > 0) {
    return {
      trend: 'worsening',
      explanation: `The latest three observations were ${evidence[0].status}, ${evidence[1].status}, and ${evidence[2].status}. Both consecutive transitions increased in severity, so the trend is classified as worsening.`,
      evidenceCount: 3,
      evidence,
    };
  }

  if (delta1 < 0 && delta2 < 0) {
    return {
      trend: 'improving',
      explanation: `The latest three observations were ${evidence[0].status}, ${evidence[1].status}, and ${evidence[2].status}. Both consecutive transitions decreased in severity, so the trend is classified as improving.`,
      evidenceCount: 3,
      evidence,
    };
  }

  if (s1 === s2 && s2 === s3) {
    return {
      trend: 'stable',
      explanation: `All three consecutive observations were recorded as ${evidence[0].status}, indicating a stable condition.`,
      evidenceCount: 3,
      evidence,
    };
  }

  return {
    trend: 'mixed',
    explanation: `The sequence of observations (${evidence[0].status} -> ${evidence[1].status} -> ${evidence[2].status}) displays fluctuating severity without a uniform progression.`,
    evidenceCount: 3,
    evidence,
  };
}

module.exports = {
  SEVERITY_MAP,
  VALID_HEALTH_STATUSES,
  getSeverity,
  sortObservationsNewestFirst,
  calculateHealthTrend,
};
