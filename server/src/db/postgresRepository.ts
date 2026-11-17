import { AsyncLocalStorage } from "node:async_hooks";
import type { Pool, PoolClient } from "pg";
import { InMemoryRepository, type IRepository, type State } from "./repository";
import type { InternalClinicalProfile } from "../types";

// Keep the clinical engine unchanged. Each operation uses a fresh transaction-local
// repository; a database lock protects atomic versions/receipts across server processes.
export function createPostgresRepository(pool: Pool, seeds: InternalClinicalProfile[]): IRepository {
  const context = new AsyncLocalStorage<InMemoryRepository>();
  async function transaction<T>(action: (repo: InMemoryRepository) => Promise<T>): Promise<T> {
    const current = context.getStore();
    if (current) return action(current);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(718304921)");
      const repo = new InMemoryRepository(seeds);
      const state = repo.snapshot();
      const catalog = await client.query("SELECT data FROM psysim_catalog WHERE id=1");
      if (catalog.rows[0]) Object.assign(state, catalog.rows[0].data);
      const sessions = await client.query("SELECT * FROM psysim_sessions");
      for (const row of sessions.rows) {
        state.sessions[row.id] = row.session;
        state.owners[row.id] = row.owner_id;
        state.profiles[row.id] = row.clinical_profile;
        if (row.evaluation) state.evaluations[row.id] = row.evaluation;
      }
      const receipts = await client.query("SELECT key, data FROM psysim_receipts");
      for (const row of receipts.rows) state.receipts[row.key] = row.data;
      repo.restore(state);
      const result = await context.run(repo, () => action(repo));
      await save(client, state, repo.snapshot());
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  return new Proxy({} as IRepository, {
    get(_target, method: keyof IRepository) {
      if (method === "exclusive") return (_key: string, action: () => Promise<unknown>) => transaction(() => action());
      return (...args: unknown[]) => transaction(async repo => {
        const fn = repo[method] as (...args: unknown[]) => unknown;
        return fn.apply(repo, args);
      });
    },
  });
}
async function save(client: PoolClient, before: State, state: State) {
  for (const [id, session] of Object.entries(state.sessions)) {
    if (JSON.stringify(session) === JSON.stringify(before.sessions[id]) && JSON.stringify(state.evaluations[id]) === JSON.stringify(before.evaluations[id])) continue;
    await client.query(`INSERT INTO psysim_sessions (id,owner_id,session,clinical_profile,evaluation) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (id) DO UPDATE SET session=EXCLUDED.session, evaluation=EXCLUDED.evaluation, updated_at=now()`,
      [id, state.owners[id], session, state.profiles[id], state.evaluations[id] || null]);
  }
  const catalog = { scenarios: state.scenarios, drafts: state.drafts, reviews: state.reviews };
  if (JSON.stringify(catalog) !== JSON.stringify({ scenarios: before.scenarios, drafts: before.drafts, reviews: before.reviews })) {
    await client.query("INSERT INTO psysim_catalog(id,data) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data", [catalog]);
  }
  for (const [key, receipt] of Object.entries(state.receipts)) {
    if (before.receipts[key]) continue;
    await client.query("INSERT INTO psysim_receipts(key,session_id,data) VALUES($1,$2,$3)", [key, receipt.session.id, receipt]);
  }
}
