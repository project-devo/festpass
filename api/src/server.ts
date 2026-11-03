import dns from "node:dns";
import net from "node:net";
import { buildApp } from "./app";
import { boss, startQueue } from "./queue";

// Neon's hostname has IPv6 and IPv4 addresses. Render has no IPv6, and Node's default
// "try each address for 250 ms" timed out on IPv4 while the CPU was busy (ETIMEDOUT
// under load). Use IPv4 first and the normal connect timeout instead.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const app = buildApp();
const port = Number(process.env.PORT ?? 4000);

async function main() {
  await startQueue();
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// Render sends SIGTERM on redeploy: finish the current job, then exit
process.on("SIGTERM", async () => {
  await app.close();
  await boss.stop({ graceful: true });
  process.exit(0);
});