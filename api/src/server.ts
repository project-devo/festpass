import { buildApp } from "./app";
import { boss, startQueue } from "./queue";

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