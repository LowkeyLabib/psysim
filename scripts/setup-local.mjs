import { readFile, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
for (const [example, destination] of [
  [".env.example", ".env.local"],
  ["server/.env.example", "server/.env"],
]) {
  const target = new URL(destination, root);
  try {
    await access(target);
    continue;
  } catch {
    /* Create only missing files. */
  }
  let content = await readFile(new URL(example, root), "utf8");
  content = content.replace(
    /^DEV_AUTH_SECRET=$/m,
    `DEV_AUTH_SECRET=${randomBytes(32).toString("hex")}`,
  );
  await writeFile(target, content, { flag: "wx", mode: 0o600 });
  console.log(`Created ${fileURLToPath(target)} (values hidden).`);
}
console.log(
  "Local configuration preserved. Set GEMINI_API_KEY privately in server/.env, then start both services.",
);
