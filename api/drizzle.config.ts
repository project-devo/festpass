/// <reference types="node" />

import { defineConfig } from 'drizzle-kit';

process.loadEnvFile(".env");

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





