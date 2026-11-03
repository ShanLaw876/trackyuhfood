import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scale, recipeNutrition } from '../shared/nutrition.js';
const food = { per100g: {calories:200,protein:10,carbohydrates:20,fat:8,fibre:2} };
test('scales all five nutrients by edible weight', () => assert.deepEqual(scale(food.per100g, 50), {calories:100,protein:5,carbohydrates:10,fat:4,fibre:1}));
test('cooked yield determines density, not ingredient weight', () => {
 const r = recipeNutrition([{food,grams:300},{food,grams:100}], 800, 200);
 assert.equal(r.total.calories,800); assert.equal(r.per100g.calories,100); assert.equal(r.serving.calories,200); assert.equal(r.serving.fibre,2);
});
test('rejects invalid weights and nutrition', () => {
 for(const weight of [0,-1,NaN,Infinity]) assert.throws(()=>scale(food.per100g,weight));
 assert.throws(()=>recipeNutrition([],100,100));
 assert.throws(()=>recipeNutrition([{food,grams:100}],0,100));
 assert.throws(()=>scale({...food.per100g,protein:-1},100));
});
