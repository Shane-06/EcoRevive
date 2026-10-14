const { query } = require('../config/db');

/**
 * Repository for knowledge chunk storage and PostgreSQL full-text search (tsvector).
 * Enforces approved-only retrieval and parameterized queries.
 */
class KnowledgeRepository {
  /**
   * Searches for approved knowledge chunks relevant to the user query using PostgreSQL full-text search.
   *
   * @param {string} userQuery - Raw user query string
   * @param {number} [limit=4] - Maximum number of chunks to return (strictly bounded)
   * @returns {Promise<Array<object>>} Ranked list of matching approved chunks
   */
  async searchApprovedChunks(userQuery, limit = 4) {
    if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
      return [];
    }

    const cleanQuery = userQuery.trim();
    const boundedLimit = Math.min(Math.max(1, limit), 4);

    const sql = `
      SELECT
        id,
        source_id,
        document_title,
        document_version,
        section_heading,
        chunk_index,
        content,
        approval_status,
        ts_rank_cd(tsv_content, plainto_tsquery('english', $1)) AS rank
      FROM knowledge_chunks
      WHERE approval_status = 'approved'
        AND tsv_content @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, id ASC
      LIMIT $2;
    `;

    try {
      // 1. Try plainto_tsquery on the query as-is
      let res = await query(sql, [cleanQuery, boundedLimit]);
      if (res.rows.length > 0) {
        return res.rows;
      }

      // 2. If no match, remove conversational lead-in phrases (e.g. "explain how", "tell me about", "what is")
      const conversationalLeadIns = /^(can you\s+)?(please\s+)?(explain(\s+how|\s+what|\s+why)?|tell me about|what (is|are|does)|how (does|do|can|is)|give me information on|i want to know about)\s+/i;
      const strippedLeadIn = cleanQuery.replace(conversationalLeadIns, '').trim();

      if (strippedLeadIn && strippedLeadIn !== cleanQuery) {
        res = await query(sql, [strippedLeadIn, boundedLimit]);
        if (res.rows.length > 0) {
          return res.rows;
        }
      }

      // 3. If still no match, strip trailing conversational phrases like "work", "work in ecorevive"
      const cleaned = cleanQuery
        .replace(/^(can you\s+)?(please\s+)?(explain|tell me about|what is|how does|how do)\s+/i, '')
        .replace(/\s+(work|works|work in EcoRevive|work in ecorevive)\.?$/i, '')
        .trim();

      if (cleaned && cleaned !== cleanQuery && cleaned !== strippedLeadIn) {
        res = await query(sql, [cleaned, boundedLimit]);
        if (res.rows.length > 0) {
          return res.rows;
        }
      }

      return [];
    } catch (err) {
      console.error('[KnowledgeRepository Error] Full-text search failed:', err.message || err);
      // Fail safely by returning empty array rather than corrupting request pipeline
      return [];
    }
  }

  /**
   * Upserts a single knowledge chunk.
   *
   * @param {object} chunk
   * @param {string} chunk.sourceId
   * @param {string} chunk.documentTitle
   * @param {string} chunk.documentVersion
   * @param {string} chunk.sectionHeading
   * @param {number} [chunk.chunkIndex=0]
   * @param {string} chunk.content
   * @param {string} [chunk.approvalStatus='approved']
   * @returns {Promise<object>} Upserted row
   */
  async upsertChunk({
    sourceId,
    documentTitle,
    documentVersion,
    sectionHeading,
    chunkIndex = 0,
    content,
    approvalStatus = 'approved',
  }) {
    const sql = `
      INSERT INTO knowledge_chunks (
        source_id,
        document_title,
        document_version,
        section_heading,
        chunk_index,
        content,
        approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (source_id, document_version, chunk_index)
      DO UPDATE SET
        document_title = EXCLUDED.document_title,
        section_heading = EXCLUDED.section_heading,
        content = EXCLUDED.content,
        approval_status = EXCLUDED.approval_status,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const res = await query(sql, [
      sourceId,
      documentTitle,
      documentVersion,
      sectionHeading,
      chunkIndex,
      content,
      approvalStatus,
    ]);

    return res.rows[0];
  }

  /**
   * Retrieves all chunks for a specific source and version.
   * @param {string} sourceId
   * @param {string} [documentVersion]
   * @returns {Promise<Array<object>>}
   */
  async findBySource(sourceId, documentVersion) {
    let sql = 'SELECT * FROM knowledge_chunks WHERE source_id = $1';
    const params = [sourceId];

    if (documentVersion) {
      sql += ' AND document_version = $2';
      params.push(documentVersion);
    }

    sql += ' ORDER BY chunk_index ASC;';
    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Deletes chunks by source ID and version (useful for test teardown).
   * @param {string} sourceId
   * @param {string} [documentVersion]
   * @returns {Promise<number>} Number of deleted rows
   */
  async deleteBySource(sourceId, documentVersion) {
    let sql = 'DELETE FROM knowledge_chunks WHERE source_id = $1';
    const params = [sourceId];

    if (documentVersion) {
      sql += ' AND document_version = $2';
      params.push(documentVersion);
    }

    const res = await query(sql, params);
    return res.rowCount;
  }
}

module.exports = new KnowledgeRepository();
