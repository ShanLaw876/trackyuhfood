import { getMigrations } from 'better-auth/db/migration';
import { auth } from './auth.js';
import { pool } from './db.js';
import { readFile } from 'node:fs/promises';
try {
 const migration = await getMigrations(auth.options); await migration.runMigrations();
 const client = await pool.connect();
 try {
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(784321)');
 await client.query('CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY)');
 if (!(await client.query("SELECT 1 FROM app_migrations WHERE name='001_app'")).rowCount) {
 await client.query(await readFile(new URL('../migrations/001_app.sql',import.meta.url),'utf8'));
 await client.query("INSERT INTO app_migrations VALUES ('001_app')");
 }
 await client.query('COMMIT');
 } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
 console.log('Database ready.');
} finally {await pool.end();}
