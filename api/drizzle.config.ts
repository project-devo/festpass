/// <reference types="node" />

import { existsSync } from 'node:fs';

import { defineConfig } from 'drizzle-kit';

// Locally the URL comes from api/.env. In CI there is no file; the workflow sets DATABASE_URL.
if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.DATABASE_URL;
if(!url) throw new Error("DATABASE_URL is missing in .env");

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: './drizzle',
    dbCredentials: { url },
    strict: true,
    verbose: true,
});





