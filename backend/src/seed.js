import { pool } from './db.js';
// Synthetic demonstration fixtures, NOT measured or validated dietary data.
const dishes = ['Rice and peas','Stew peas','Curry chicken','Brown stew chicken','Ackee and saltfish','Boiled dumplings','White rice','Red kidney beans','Chicken breast','Onion'];
try {
 for (const [i,name] of dishes.entries()) {
 const per100g = {calories:150+i*10,protein:5+i,carbohydrates:20,fat:5,fibre:2};
 await pool.query('INSERT INTO foods(name,state,per100g,source,demo) VALUES($1,$2,$3,$4,true) ON CONFLICT(name) DO NOTHING',[name,i>7?'raw':'cooked',per100g,'Synthetic demo fixture. Not validated; not suitable for dietary decisions.']);
 }
 console.log('Demo foods added. All values are synthetic and labelled.');
} finally {await pool.end();}
