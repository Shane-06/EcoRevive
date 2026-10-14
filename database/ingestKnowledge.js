const { getClient, closePool } = require('../backend/src/config/db');
const { KNOWLEDGE_CORPUS } = require('./knowledge/corpus');

/**
 * Ingests knowledge chunks into the knowledge_chunks PostgreSQL table.
 *
 * Guarantees repeatability without creating duplicate chunks via ON CONFLICT.
 * Supports approved, draft, and deprecated approval_status values.
 *
 * @param {Array<object>} [chunks=KNOWLEDGE_CORPUS] - Array of chunk definitions to ingest
 * @returns {Promise<{ ingested: number, total: number }>}
 */
const ingestKnowledge = async (chunks = KNOWLEDGE_CORPUS) => {
  let client;
  try {
    client = await getClient();
    console.log(`[Knowledge Ingestion] Connected to database. Ingesting ${chunks.length} chunk(s)...`);

    await client.query('BEGIN');

    const upsertSql = `
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
      RETURNING id, source_id, document_version, chunk_index, approval_status;
    `;

    let ingestedCount = 0;
    for (const chunk of chunks) {
      await client.query(upsertSql, [
        chunk.sourceId,
        chunk.documentTitle,
        chunk.documentVersion,
        chunk.sectionHeading,
        chunk.chunkIndex !== undefined ? chunk.chunkIndex : 0,
        chunk.content,
        chunk.approvalStatus || 'approved',
      ]);
      ingestedCount++;
    }

    await client.query('COMMIT');
    console.log(`[Knowledge Ingestion] Successfully ingested ${ingestedCount} chunk(s).`);
    return { ingested: ingestedCount, total: chunks.length };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('[Knowledge Ingestion Error] Failed to ingest knowledge chunks:', error.message || error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

if (require.main === module) {
  ingestKnowledge()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async () => {
      await closePool();
      process.exit(1);
    });
}

module.exports = {
  ingestKnowledge,
};
