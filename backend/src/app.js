import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { scale, sum, recipeNutrition } from '../../shared/nutrition.js';
const weight = z.number().positive().max(100000);
const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,'Invalid date');
export function createApp({pool,auth,staticPath}) {
 const app = express();
 app.set('trust proxy',1); app.use(helmet());
 const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
 app.use(cors({origin,credentials:true}));
 app.use((req,res,next)=>{
 if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin !== origin) return res.status(403).json({error:'Request origin is not allowed.'});
 next();
 });
 // Overwrite any client-supplied value with Express's proxy-aware address.
 app.use((req,res,next)=>{req.headers['x-trackyuhfood-client-ip']=req.ip;next();});
 app.all('/api/auth/*splat',toNodeHandler(auth));
 app.use(express.json({limit:'100kb'}));
 app.get('/api/health',async(req,res)=>{await pool.query('SELECT 1');res.json({ok:true});});
 app.use('/api',async(req,res,next)=>{
 const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
 if(!session) return res.status(401).json({error:'Please sign in to continue.'});
 req.userId=session.user.id;next();
 });
 app.get('/api/foods',async(req,res)=>{
 const q=z.string().max(100).parse(req.query.q || '');
 res.json((await pool.query('SELECT * FROM foods WHERE name ILIKE $1 ORDER BY name LIMIT 50',[`%${q}%`])).rows);
 });
 app.get('/api/recipes',async(req,res)=>res.json((await pool.query('SELECT * FROM recipes WHERE user_id=$1 ORDER BY created_at DESC',[req.userId])).rows));
 app.post('/api/recipes',async(req,res)=>{
 const input=z.object({name:z.string().trim().min(1).max(120),cookedYield:weight,ingredients:z.array(z.object({foodId:z.number().int().positive(),grams:weight})).min(1).max(100)}).parse(req.body);
 const foods=(await pool.query('SELECT * FROM foods WHERE id=ANY($1::int[])',[input.ingredients.map(i=>i.foodId)])).rows;
 const ingredients=input.ingredients.map(i=>{const food=foods.find(f=>f.id===i.foodId);if(!food) throw Object.assign(new Error('Ingredient not found.'),{status:400});return {...i,food};});
 const result=recipeNutrition(ingredients,input.cookedYield,100);
 const row=(await pool.query('INSERT INTO recipes(id,user_id,name,cooked_yield,ingredients,per100g,demo) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[randomUUID(),req.userId,input.name,input.cookedYield,JSON.stringify(ingredients),result.per100g,foods.some(f=>f.demo)])).rows[0];
 res.status(201).json(row);
 });
 app.delete('/api/recipes/:id',async(req,res)=>{
 const result=await pool.query('DELETE FROM recipes WHERE id=$1 AND user_id=$2',[uuid.parse(req.params.id),req.userId]);
 res.status(result.rowCount?204:404).send();
 });
 app.get('/api/diary',async(req,res)=>{
 const entries=(await pool.query('SELECT * FROM diary WHERE user_id=$1 AND day=$2 ORDER BY created_at',[req.userId,day.parse(req.query.day)])).rows;
 res.json({entries,totals:sum(entries.map(e=>e.nutrition))});
 });
 app.post('/api/diary',async(req,res)=>{
 const input=z.object({day,meal:z.enum(['Breakfast','Lunch','Dinner','Snack']),grams:weight,kind:z.enum(['food','recipe']),id:z.union([z.number().int().positive(),uuid])}).parse(req.body);
 const result=input.kind==='food'?await pool.query('SELECT * FROM foods WHERE id=$1',[z.number().int().positive().parse(input.id)]):await pool.query('SELECT * FROM recipes WHERE id=$1 AND user_id=$2',[uuid.parse(input.id),req.userId]);
 const item=result.rows[0];if(!item)return res.status(404).json({error:'Food or recipe not found.'});
 const source=item.source || 'Custom recipe; ingredient sources and states retained in saved recipe. Assumes nutrient retention.';
 const entry=(await pool.query('INSERT INTO diary(id,user_id,day,meal,name,grams,nutrition,demo,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[randomUUID(),req.userId,input.day,input.meal,item.name,input.grams,scale(item.per100g,input.grams),item.demo,source])).rows[0];
 res.status(201).json(entry);
 });
 app.delete('/api/diary/:id',async(req,res)=>{
 const result=await pool.query('DELETE FROM diary WHERE id=$1 AND user_id=$2',[uuid.parse(req.params.id),req.userId]);
 res.status(result.rowCount?204:404).send();
 });
 app.get('/api/preferences',async(req,res)=>res.json((await pool.query('SELECT calorie_goal FROM preferences WHERE user_id=$1',[req.userId])).rows[0] || {calorie_goal:2000}));
 app.put('/api/preferences',async(req,res)=>{
 const {calorie_goal}=z.object({calorie_goal:z.number().int().min(500).max(10000)}).parse(req.body);
 await pool.query('INSERT INTO preferences(user_id,calorie_goal) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET calorie_goal=$2',[req.userId,calorie_goal]);res.json({calorie_goal});
 });
 app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}));
 if(staticPath){app.use(express.static(staticPath));app.get('/{*splat}',(req,res)=>res.sendFile(`${staticPath}/index.html`));}
 app.use((err,req,res,next)=>{
 if(err instanceof z.ZodError)return res.status(400).json({error:err.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(' ')});
 if(err.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON.'});
 console.error(err.message);res.status(err.status || 500).json({error:err.status?err.message:'Something went wrong. Please try again.'});
 });
 return app;
}
