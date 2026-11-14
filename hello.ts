import { parseEnv } from "@neon/env";
import config from "./neon";

const env = parseEnv(config);

export default {
  async fetch(_request: Request): Promise<Response> {
    return Response.json({
      service: "psysim-neon-function",
      status: "ok",
      configured: {
        postgres: Boolean(env.postgres.databaseUrl),
        auth: Boolean(env.auth.baseUrl),
        aiGateway: Boolean(env.aiGateway.baseUrl && env.aiGateway.token),
      },
    });
  },
};
