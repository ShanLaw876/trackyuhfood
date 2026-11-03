import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../backend/src/app.js';
test('rejects unauthenticated calls and untrusted origins',async()=>{
 const app=createApp({pool:{query:async()=>({rows:[]})},auth:{api:{getSession:async()=>null},handler:async()=>new Response('{}')}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{
 const url=`http://127.0.0.1:${server.address().port}/api/recipes`;
 assert.equal((await fetch(url)).status,401);
 assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://untrusted.example'}})).status,403);
 }finally{await new Promise(r=>server.close(r));}
});
