import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { auth } from './auth.js';
import { createApp } from './app.js';
const app=createApp({pool,auth,staticPath:process.env.NODE_ENV==='production'?fileURLToPath(new URL('../../frontend/dist',import.meta.url)):undefined});
const server=app.listen(process.env.PORT || 3001,()=>console.log('TrackYuhFood server ready.'));
process.on('SIGTERM',()=>server.close(async()=>{await pool.end();process.exit(0);}));
