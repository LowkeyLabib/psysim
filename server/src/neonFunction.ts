import { type Server } from "node:http";
import { app, initializeStorage } from "./server";
import { config } from "./config";

let listener: Promise<{ origin: string; server: Server }> | undefined;

// Neon supplies Fetch requests on long-lived Node 24 compute. Keep the existing
// Express middleware and streaming/body limits intact behind a private loopback port.
function start() {
  listener ??= new Promise((resolve, reject) => {
    if (config.nodeEnv !== "production" || process.env.PSYSIM_FUNCTION !== "true") {
      reject(new Error("The Neon entry point requires production function configuration."));
      return;
    }
    initializeStorage();
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("API startup failed."));
      server.unref();
      resolve({ origin: `http://127.0.0.1:${address.port}`, server });
    });
    server.once("error", reject);
  });
  return listener;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { origin } = await start();
    const url = new URL(request.url);
    // The destination is fixed; never forward to a URL supplied by the caller.
    const headers = new Headers(request.headers);
    for (const name of ["host", "connection", "transfer-encoding", "content-length"])
      headers.delete(name);
    return fetch(`${origin}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: request.body,
      duplex: "half",
      signal: request.signal,
      redirect: "manual",
    } as RequestInit & { duplex: "half" });
  },
};
