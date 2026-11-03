/// <reference types="node" />
// Goal 12: creates 500 load-test students in Neon, logs each one in through the API,
// and saves their JWTs to loadtest/tokens.json for k6.
import { writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { db, pool } from "../src/db/client";
import { users } from "../src/db/schema";

const API = process.env.API_URL ?? "http://localhost:4000";
const COUNT = Number(process.env.LOADTEST_USERS ?? 500); // CI smoke test uses 50
const PASSWORD = "loadtest123";
const emailFor = (i: number) => `student${i}@loadtest.festpass.test`;

// Logs in and returns just the JWT from the "token" cookie. Retries twice on a failed response.
async function login(email: string): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (res.ok) {
      const cookie = res.headers.getSetCookie().find((c) => c.startsWith("token="));
      if (!cookie) throw new Error(`No token cookie for ${email}`);
      return cookie.split(";")[0].slice("token=".length);
    }
    const text = (await res.text()).slice(0, 200);
    console.log(`\n${email}: attempt ${attempt} got ${res.status} ${text}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Login failed 3 times for ${email}`);
}
async function main() {
  console.log(`API: ${API}`);

  // One hash for everyone: same password, and 500 bcrypt hashes would take a while
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const rows = Array.from({ length: COUNT }, (_, i) => ({
    name: `Load Student ${i + 1}`,
    email: emailFor(i + 1),
    passwordHash,
    role: "student" as const,
  }));

  // Safe to run again: emails that already exist are skipped
  const inserted = await db
    .insert(users)
    .values(rows)
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  console.log(`Inserted ${inserted.length} new students (${COUNT - inserted.length} already existed)`);

  // Log in 10 at a time so the free Render instance isn't flooded with bcrypt work
  const tokens: string[] = [];
  for (let start = 1; start <= COUNT; start += 10) {
    const size = Math.min(10, COUNT - start + 1);
    const batch = Array.from({ length: size }, (_, k) => login(emailFor(start + k)));
    tokens.push(...(await Promise.all(batch)));
    process.stdout.write(`\rLogged in ${tokens.length}/${COUNT}`);
  }

  writeFileSync("loadtest/tokens.json", JSON.stringify(tokens));
  console.log(`\nSaved ${tokens.length} tokens to loadtest/tokens.json`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());