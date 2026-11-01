/**
 * EcoRevive V2-M4 — Monitoring Completeness & Freshness Service
 *
 * Implements pure deterministic monitoring freshness calculation based on
 * the elapsed hours/milliseconds since the latest usable health observation.
 *
 * Threshold definitions:
 * - 1 day = 24 elapsed hours (86,400,000 ms)
 * - 30 days = 720 elapsed hours (2,592,000,000 ms)
 * - UTC timestamps and elapsed milliseconds for comparison
 * - Exactly at configured threshold: up_to_date
 * - Threshold + 1 ms: overdue
 * - Missing usable history: no_record (never Dead)
 */

const DEFAULT_INTERVAL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Normalizes and validates the monitoring interval in days.
 * Falls back safely to DEFAULT_INTERVAL_DAYS (30) if invalid.
 *
 * @param {number|string} intervalDays
 * @returns {number}
 */
function resolveIntervalDays(intervalDays) {
  const parsed = parseInt(intervalDays, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_INTERVAL_DAYS;
}

/**
 * Calculates monitoring freshness for a tree based on its latest observation.
 *
 * @param {string|Date|null} latestObservationAt - Timestamp of the most recent usable observation
 * @param {object} [options]
 * @param {Date|number|string} [options.now=new Date()] - Injectable clock reference
 * @param {number|string} [options.intervalDays=30] - Configured monitoring interval in days
 * @returns {{
 *   status: 'up_to_date' | 'overdue' | 'no_record',
 *   intervalDays: number,
 *   daysSinceLastObservation: number | null,
 *   isOverdue: boolean,
 *   explanation: string
 * }}
 */
function calculateMonitoringStatus(latestObservationAt, options = {}) {
  const intervalDays = resolveIntervalDays(options.intervalDays);
  const intervalMs = intervalDays * MS_PER_DAY;

  // Resolve injectable clock safely
  let currentTimeMs;
  if (options.now instanceof Date) {
    currentTimeMs = options.now.getTime();
  } else if (typeof options.now === 'number' || typeof options.now === 'string') {
    currentTimeMs = new Date(options.now).getTime();
  } else {
    currentTimeMs = Date.now();
  }

  if (Number.isNaN(currentTimeMs)) {
    currentTimeMs = Date.now();
  }

  // Handle missing or invalid observation timestamp
  if (!latestObservationAt) {
    return {
      status: 'no_record',
      intervalDays,
      daysSinceLastObservation: null,
      isOverdue: false,
      explanation: 'No health observations have been recorded for this tree.',
    };
  }

  const observationDate = new Date(latestObservationAt);
  const observationTimeMs = observationDate.getTime();

  if (Number.isNaN(observationTimeMs)) {
    return {
      status: 'no_record',
      intervalDays,
      daysSinceLastObservation: null,
      isOverdue: false,
      explanation: 'The recorded health observation timestamp is missing or invalid.',
    };
  }

  // Elapsed milliseconds in UTC. If timestamp is in the future, clamp elapsed to 0.
  const elapsedMs = Math.max(0, currentTimeMs - observationTimeMs);
  const daysSinceLastObservation = Math.floor(elapsedMs / MS_PER_DAY);

  // Exact threshold boundary comparison:
  // <= intervalMs is up_to_date (e.g. exactly 720 hours)
  // > intervalMs is overdue (e.g. 720 hours + 1 ms)
  const isOverdue = elapsedMs > intervalMs;
  const status = isOverdue ? 'overdue' : 'up_to_date';

  let explanation;
  if (isOverdue) {
    const overdueDays = Math.max(1, Math.floor((elapsedMs - intervalMs) / MS_PER_DAY));
    explanation = `The last observation was recorded ${daysSinceLastObservation} days ago, exceeding the ${intervalDays}-day monitoring interval by ${overdueDays} day(s).`;
  } else {
    explanation = `The last observation was recorded ${daysSinceLastObservation} days ago, which is within the ${intervalDays}-day monitoring threshold.`;
  }

  return {
    status,
    intervalDays,
    daysSinceLastObservation,
    isOverdue,
    explanation,
  };
}

module.exports = {
  DEFAULT_INTERVAL_DAYS,
  MS_PER_DAY,
  resolveIntervalDays,
  calculateMonitoringStatus,
};
