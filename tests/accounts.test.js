import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
test('real sessions, server calculations, ownership and logout', {skip:process.env.RUN_DB_TESTS!=='1'}, async()=>{
 process.env.BETTER_AUTH_SECRET ||= 'temporary-test-secret-for-trackyuhfood-only';
 process.env.APP_ORIGIN='http://localhost:5173';
 const {pool}=await import('../backend/src/db.js');
 const {auth}=await import('../backend/src/auth.js');
 const {createApp}=await import('../backend/src/app.js');
 const server=createApp({pool,auth}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}/api/`;
 const users=[];
 async function request(path,{cookie,body,method}={}){
  return fetch(base+path,{method:method || (body?'POST':'GET'),headers:{Origin:process.env.APP_ORIGIN,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 }
 try{
 assert.equal((await request('foods')).status,401);
 const cookies=[];const emails=[];
 for(const name of ['First','Second']){
 const email=`${randomUUID()}@example.com`;emails.push(email);
 const response=await request('auth/sign-up/email',{body:{name,email,password:'long-test-password-123'}});
 assert.equal(response.status,200,await response.clone().text());
 const data=await response.json();users.push(data.user.id);
 const setCookies=response.headers.getSetCookie();
 assert.ok(setCookies.some(c=>/httponly/i.test(c)));assert.ok(setCookies.some(c=>/samesite=lax/i.test(c)));
 cookies.push(setCookies.map(c=>c.split(';')[0]).join('; '));
 }
 let [a,b]=cookies;
 const login=await request('auth/sign-in/email',{body:{email:emails[0],password:'long-test-password-123'}});
 assert.equal(login.status,200);
 a=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const wrong=await request('auth/sign-in/email',{body:{email:emails[0],password:'wrong-password-123'}});assert.equal(wrong.status,401);

 assert.equal((await request('auth/get-session',{cookie:a})).status,200);
 const foods=await (await request('foods',{cookie:a})).json();assert.ok(foods.length);
 const food=foods[0];
 const recipeResponse=await request('recipes',{cookie:a,body:{name:'Isolation test',cookedYield:400,ingredients:[{foodId:food.id,grams:200}]}});
 assert.equal(recipeResponse.status,201,await recipeResponse.clone().text());
 const recipe=await recipeResponse.json();assert.equal(recipe.per100g.calories,food.per100g.calories/2);
 assert.equal((await (await request('recipes',{cookie:b})).json()).length,0);
 assert.equal((await request('recipes/'+recipe.id,{cookie:b,method:'DELETE'})).status,404);
 assert.equal((await request('diary',{cookie:b,body:{day:'2026-11-02',meal:'Lunch',grams:100,kind:'recipe',id:recipe.id}})).status,404);
 const logged=await request('diary',{cookie:a,body:{day:'2026-11-02',meal:'Lunch',grams:150,kind:'recipe',id:recipe.id}});
 assert.equal(logged.status,201);const entry=await logged.json();assert.equal(entry.nutrition.calories,recipe.per100g.calories*1.5);assert.equal(entry.demo,true);
 assert.equal((await request('diary/'+entry.id,{cookie:b,method:'DELETE'})).status,404);
 const other=await (await request('diary?day=2026-11-02',{cookie:b})).json();assert.equal(other.entries.length,0);
 assert.equal((await request('diary',{cookie:a,body:{day:'2026-02-30',meal:'Lunch',grams:-5,kind:'food',id:food.id}})).status,400);
 assert.equal((await request('preferences',{cookie:a,body:{calorie_goal:2300},method:'PUT'})).status,200);
 assert.equal((await (await request('preferences',{cookie:b})).json()).calorie_goal,2000);
 assert.equal((await request('auth/sign-out',{cookie:a,body:{}})).status,200);
 assert.equal((await request('foods',{cookie:a})).status,401);
 }finally{
 for(const id of users)await pool.query('DELETE FROM "user" WHERE id=$1',[id]);
 await new Promise(r=>server.close(r));await pool.end();
 }
});
