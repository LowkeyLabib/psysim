import { config } from "../src/config/index.js";
import { getNeonPool } from "../src/db/neonPostgres.js";
import { prepareCatalogDrafts, type CatalogData } from "../src/knowledge/educationalDrafts.js";

async function main() {
  const pool = getNeonPool();
  if (!pool) {
    console.error("DATABASE_URL is not configured. Set DATABASE_URL before running.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(718304921)");
    const res = await client.query<{ data: Partial<CatalogData> }>(
      "SELECT data FROM psysim_catalog WHERE id=1",
    );
    const existing = res.rows[0]?.data || null;
    const result = prepareCatalogDrafts(existing);

    if (result.changed) {
      await client.query(
        "INSERT INTO psysim_catalog(id, data) VALUES(1, $1) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data",
        [result.catalog],
      );
    }
    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          action: result.action,
          approvedCount: result.approvedCount,
          preparedCount: result.preparedCount,
          totalDrafts: result.totalDrafts,
          changed: result.changed,
          allowUnreviewedCases: config.allowUnreviewed,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed to prepare review drafts:", err instanceof Error ? err.message : err);
  process.exit(1);
});
