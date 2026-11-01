/**
 * EcoRevive V2-M4 — Explainable Follow-Up Suggestions Service
 *
 * Implements a pure deterministic rules engine generating actionable,
 * evidence-backed follow-up recommendations without diagnostic claims,
 * automated writes, or contradictory suggestions.
 */

/**
 * Generates deterministic follow-up recommendations and structured suggestions.
 *
 * @param {object} params
 * @param {string|null} params.latestStatus - Latest health status ('Healthy' | 'Good' | 'Needs Attention' | 'Dead' | null)
 * @param {string} params.trend - Computed trend ('no_record' | 'insufficient_history' | 'worsening' | 'improving' | 'stable' | 'mixed')
 * @param {object} params.monitoring - Monitoring status object ({ status, isOverdue, daysSinceLastObservation })
 * @returns {{
 *   recommendation: string,
 *   suggestions: Array<{ action: string, reason: string, priority: 'high' | 'medium' | 'low' }>
 * }}
 */
function generateFollowUpSuggestions({ latestStatus, trend, monitoring = {} }) {
  const suggestions = [];
  let primaryRecommendation = '';

  const isDead = latestStatus === 'Dead';
  const isNeedsAttention = latestStatus === 'Needs Attention';
  const isOverdue = monitoring.status === 'overdue' || monitoring.isOverdue === true;
  const isNoRecord = trend === 'no_record' || !latestStatus;
  const isInsufficientHistory = trend === 'insufficient_history';
  const isWorsening = trend === 'worsening';
  const isImproving = trend === 'improving';
  const isStable = trend === 'stable';
  const isMixed = trend === 'mixed';

  // Rule 1: Tree recorded as Dead
  if (isDead) {
    primaryRecommendation = 'Follow existing administrative and monitoring procedures for a recorded dead tree.';
    suggestions.push({
      action: 'Follow administrative procedures for dead tree verification and lifecycle recording.',
      reason: 'The latest health observation recorded the tree status as Dead.',
      priority: 'high',
    });
    return {
      recommendation: primaryRecommendation,
      suggestions,
    };
  }

  // Rule 2: No records exist
  if (isNoRecord) {
    primaryRecommendation = 'Record an initial health observation through the existing monitoring workflow.';
    suggestions.push({
      action: 'Submit an initial health observation.',
      reason: 'No health observations have been recorded for this verified tree.',
      priority: 'medium',
    });
    return {
      recommendation: primaryRecommendation,
      suggestions,
    };
  }

  // Rule 3: Insufficient history (only 1 observation)
  if (isInsufficientHistory) {
    if (isOverdue) {
      primaryRecommendation = 'Record an updated observation through the existing monitoring workflow.';
      suggestions.push({
        action: 'Record an updated observation.',
        reason: `Monitoring is overdue. The single recorded observation (${latestStatus}) is older than the configured monitoring interval.`,
        priority: 'high',
      });
    } else {
      primaryRecommendation = 'Collect further observations to establish a health trend baseline.';
      suggestions.push({
        action: 'Schedule subsequent health observation according to regular routine.',
        reason: `Only one observation (${latestStatus}) is currently recorded. At least two observations are required to determine a trend.`,
        priority: 'low',
      });
    }

    if (isNeedsAttention) {
      suggestions.push({
        action: 'Conduct a follow-up assessment for Needs Attention condition.',
        reason: 'The recorded health status is Needs Attention.',
        priority: 'high',
      });
    }

    return {
      recommendation: primaryRecommendation,
      suggestions,
    };
  }

  // Rule 4: Overdue monitoring takes precedence for regular action
  if (isOverdue) {
    primaryRecommendation = 'Record an updated observation through the existing monitoring workflow.';
    suggestions.push({
      action: 'Record an updated observation through the caretaker monitoring workflow.',
      reason: `Monitoring is overdue by ${monitoring.daysSinceLastObservation ? monitoring.daysSinceLastObservation - (monitoring.intervalDays || 30) : 0} days beyond the ${monitoring.intervalDays || 30}-day threshold.`,
      priority: 'high',
    });
  }

  // Rule 5: Worsening trend
  if (isWorsening) {
    if (!primaryRecommendation) {
      primaryRecommendation = 'Review the latest observations and arrange an appropriate follow-up inspection.';
    }
    suggestions.push({
      action: 'Review recent health observations and arrange an on-site inspection.',
      reason: 'The health trend shows consecutive increases in severity across recent observations.',
      priority: 'high',
    });
  }

  // Rule 6: Needs Attention condition (if not already covered by worsening)
  if (isNeedsAttention && !isWorsening) {
    if (!primaryRecommendation) {
      primaryRecommendation = 'Review the latest observations and arrange an appropriate follow-up inspection.';
    }
    suggestions.push({
      action: 'Schedule an inspection to evaluate the specific factors requiring attention.',
      reason: 'The latest observation is recorded as Needs Attention.',
      priority: 'medium',
    });
  }

  // Rule 7: Mixed trend
  if (isMixed) {
    if (!primaryRecommendation) {
      primaryRecommendation = 'Review the observation sequence and collect further evidence if necessary.';
    }
    suggestions.push({
      action: 'Review the chronological observation sequence and collect additional observations.',
      reason: 'The recent observations exhibit fluctuating health statuses without a consistent trajectory.',
      priority: 'medium',
    });
  }

  // Rule 8: Improving or Stable condition
  if ((isImproving || isStable) && !isNeedsAttention && !isWorsening) {
    if (!primaryRecommendation) {
      primaryRecommendation = 'Continue monitoring according to the applicable operational schedule.';
    }
    suggestions.push({
      action: 'Maintain standard periodic monitoring.',
      reason: `The tree condition is ${trend} with latest status recorded as ${latestStatus}.`,
      priority: 'low',
    });
  }

  // Default fallback if no rules matched
  if (!primaryRecommendation) {
    primaryRecommendation = 'Continue monitoring according to the applicable operational schedule.';
  }

  return {
    recommendation: primaryRecommendation,
    suggestions,
  };
}

module.exports = {
  generateFollowUpSuggestions,
};
