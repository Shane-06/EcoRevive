/**
 * Curated, versioned knowledge corpus for EcoRevive EcoGuide knowledge assistant.
 * Adheres to PRD V2.0 Section 5.3 and Architecture Freeze Record Version 2.2.
 */

const KNOWLEDGE_CORPUS = [
  // =========================================================================
  // Document 1: Core Lifecycle & Platform Architecture
  // =========================================================================
  {
    sourceId: 'ecorevive-core-lifecycle',
    documentTitle: 'EcoRevive 9-Stage Lifecycle & Platform Architecture',
    documentVersion: '2.0',
    sectionHeading: 'The 9-Stage Plantation Lifecycle',
    chunkIndex: 0,
    approvalStatus: 'approved',
    content:
      'EcoRevive governs tree plantation activities through a strict 9-stage operational lifecycle: ' +
      '1. DISCOVER: Contributors identify potential planting locations using geospatial mapping. ' +
      '2. ASSESS: Environmental suitability is assessed via Open-Meteo weather and SoilGrids soil data. ' +
      '3. PLANT: The contributor physically plants the tree in the designated planting location. ' +
      '4. PROVE: The contributor uploads photographic evidence and geospatial GPS coordinates. ' +
      '5. VERIFY: An administrator or coordinator reviews evidence and verifies the plantation. ' +
      '6. IDENTIFY: Upon verification approval, the system assigns a permanent, unique Tree ID (ER-PLT-XXXXX) and QR code. ' +
      '7. MONITOR: Caretakers perform recurring health observations every 30 days. ' +
      '8. REWARD: Platform stewardship points and badges are awarded to contributors for verified trees. ' +
      '9. TRACK: Long-term ecological impact, growth metrics, and survival rates are tracked across time.',
  },
  {
    sourceId: 'ecorevive-core-lifecycle',
    documentTitle: 'EcoRevive 9-Stage Lifecycle & Platform Architecture',
    documentVersion: '2.0',
    sectionHeading: 'Verification Workflow & Tree ID Generation',
    chunkIndex: 1,
    approvalStatus: 'approved',
    content:
      'Tree ID generation is strictly governed by stage 5 (VERIFY) and stage 6 (IDENTIFY) of the EcoRevive lifecycle. ' +
      'When a contributor submits a tree, it initially has a status of Pending or Under Review with no permanent Tree ID. ' +
      'An administrator or coordinator must review the uploaded photographic proof and coordinate validity. ' +
      'Only when the verification is approved does the system atomically assign a permanent Tree ID in the ER-PLT-XXXXX format ' +
      '(5-digit zero-padded sequential number, e.g., ER-PLT-00001). EcoGuide and external AI models can never invent, issue, ' +
      'or modify Tree IDs, nor can they approve verification requests independently.',
  },

  // =========================================================================
  // Document 2: Environmental Suitability & Botanical Care
  // =========================================================================
  {
    sourceId: 'ecorevive-environmental-guidance',
    documentTitle: 'EcoRevive Environmental Suitability & Botanical Guidelines',
    documentVersion: '2.0',
    sectionHeading: 'Soil pH and Texture Evaluation',
    chunkIndex: 0,
    approvalStatus: 'approved',
    content:
      'EcoRevive evaluates soil suitability based on pH level and soil texture derived from ISRIC SoilGrids data. ' +
      'Soil pH is classified into three tiers: ' +
      '- Suitable (Optimal): pH 6.0 to 7.5 provides ideal nutrient availability for most native tree species. ' +
      '- Moderate: pH 5.5 to 5.9 (slightly acidic) and pH 7.6 to 8.5 (moderately alkaline). ' +
      '- Unsuitable: pH below 5.5 (strongly acidic) or pH above 8.5 (strongly alkaline). ' +
      'Soil textures such as Loam, Sandy Loam, and Clay Loam are generally classified as suitable, whereas coarse Sand ' +
      'or heavy Silt may evaluate to moderate or unsuitable depending on species-specific water requirements.',
  },
  {
    sourceId: 'ecorevive-environmental-guidance',
    documentTitle: 'EcoRevive Environmental Suitability & Botanical Guidelines',
    documentVersion: '2.0',
    sectionHeading: 'Weather Parameters & Advisory Data Limitations',
    chunkIndex: 1,
    approvalStatus: 'approved',
    content:
      'Weather conditions are retrieved via Open-Meteo API, analyzing temperature (°C), relative humidity (%), ' +
      'precipitation sum (mm), and wind speed (km/h). ' +
      'Important advisory limitation: Environmental suitability scores and weather forecasts displayed in EcoRevive ' +
      'are regional estimates intended for guidance only. They do not constitute an on-site soil laboratory test ' +
      'or a biological guarantee of seedling survival. Local microclimates, drainage conditions, and direct sunlight ' +
      'must be verified by the contributor before planting.',
  },

  // =========================================================================
  // Document 3: Health Monitoring & Observation Protocols
  // =========================================================================
  {
    sourceId: 'ecorevive-monitoring-protocol',
    documentTitle: 'EcoRevive Tree Health Monitoring Protocols',
    documentVersion: '2.0',
    sectionHeading: 'Authoritative Health Status Vocabulary & Severity Mapping',
    chunkIndex: 0,
    approvalStatus: 'approved',
    content:
      'EcoRevive supports exactly four authoritative health status classifications: ' +
      '1. Healthy (Severity 0): Vigorous foliage, strong shoot growth, no signs of pests or mechanical damage. ' +
      '2. Good (Severity 1): Minor blemishes, mild wilting, or slight leaf discolouration with normal growth vigor. ' +
      '3. Needs Attention (Severity 2): Significant dehydration, branch breakage, pest infestation, or stunted growth. ' +
      '4. Dead (Severity 3): Complete desiccation, rotten root system, or total defoliation with no vital buds. ' +
      'Crucial invariant: A tree is only classified as Dead when explicitly recorded by an authorized caretaker. ' +
      'Missing observations or overdue monitoring schedules never imply or cause a tree to be classified as Dead.',
  },
  {
    sourceId: 'ecorevive-monitoring-protocol',
    documentTitle: 'EcoRevive Tree Health Monitoring Protocols',
    documentVersion: '2.0',
    sectionHeading: '30-Day Monitoring Completeness & Trend Rules',
    chunkIndex: 1,
    approvalStatus: 'approved',
    content:
      'The EcoRevive monitoring interval is formally defined as 30 elapsed 24-hour periods (720 hours = 2,592,000,000 milliseconds) ' +
      'evaluated in UTC. If more than 720 hours have passed since the latest recorded observation, the monitoring status is marked overdue. ' +
      'Health trends evaluate up to three consecutive observations in chronological order: ' +
      '- Worsening: Two consecutive severity transitions increase (e.g., Healthy -> Good -> Needs Attention). ' +
      '- Improving: Two consecutive severity transitions decrease (e.g., Needs Attention -> Good -> Healthy). ' +
      '- Stable: All consecutive observations have identical severity (e.g., Good -> Good -> Good). ' +
      '- Mixed: Severity fluctuates without monotonic progression. ' +
      'Trend analysis is 100% deterministic and calculated locally on the backend without LLM involvement.',
  },

  // =========================================================================
  // Document 4: Roles, Permissions & Privacy Safeguards
  // =========================================================================
  {
    sourceId: 'ecorevive-roles-and-privacy',
    documentTitle: 'EcoRevive Platform Roles & Data Privacy Policy',
    documentVersion: '2.0',
    sectionHeading: 'Role Responsibilities & Access Boundaries',
    chunkIndex: 0,
    approvalStatus: 'approved',
    content:
      'EcoRevive defines three distinct user roles with strict boundary enforcement: ' +
      '- Contributor: Plants trees, submits evidence, views their own plantations and rewards. ' +
      '- Caretaker: Performs routine field inspections, scans QR codes, and records health observations. ' +
      '- Admin: Performs verification approvals, manages species rules, inspects platform analytics, and resolves issues. ' +
      'EcoGuide operates with role-aware guidance but never elevates privileges or allows cross-user record inspection.',
  },
  {
    sourceId: 'ecorevive-roles-and-privacy',
    documentTitle: 'EcoRevive Platform Roles & Data Privacy Policy',
    documentVersion: '2.0',
    sectionHeading: 'Data Minimization & Free-Tier Privacy Protection',
    chunkIndex: 1,
    approvalStatus: 'approved',
    content:
      'Because Google AI Studio Free Tier terms allow prompt logging and model training by Google, EcoRevive enforces ' +
      'a strict data minimization policy: ' +
      '- Prohibited data: User personal names, email addresses, phone numbers, passwords, JWT tokens, internal database UUIDs ' +
      '(contributor_id, submitted_by), and private field notes are permanently excluded from LLM prompts. ' +
      '- Permitted data: Only sanitized public botanical facts, verified Tree IDs (ER-PLT-XXXXX), deterministic health status strings, ' +
      'and approved knowledge passages may be included in prompts. ' +
      '- Grounded assistance: EcoGuide answers strictly from approved documentation. It has zero database write access and ' +
      'cannot execute SQL queries or alter application state.',
  },
];

module.exports = {
  KNOWLEDGE_CORPUS,
};
