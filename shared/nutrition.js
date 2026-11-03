export const nutrients = ['calories', 'protein', 'carbohydrates', 'fat', 'fibre'];
export function positive(value, label = 'Weight') {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`);
  return value;
}
export function scale(per100g, grams) {
  positive(grams);
  return Object.fromEntries(nutrients.map(key => {
    const value = per100g[key];
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${key}.`);
    return [key, value * grams / 100];
  }));
}
export function sum(items) {
  return Object.fromEntries(nutrients.map(key => [key, items.reduce((total, item) => total + item[key], 0)]));
}
// Weights must match the food's documented raw/cooked state. Yield is edible cooked weight.
// Assumes nutrient retention; does not model drained fat, discarded liquid or cooking losses.
export function recipeNutrition(ingredients, cookedYield, servingWeight) {
  positive(cookedYield, 'Edible cooked yield'); positive(servingWeight, 'Serving weight');
  if (!ingredients.length) throw new Error('Add at least one ingredient.');
  const total = sum(ingredients.map(({ food, grams }) => scale(food.per100g, grams)));
  return { total, per100g: Object.fromEntries(nutrients.map(k => [k, total[k] * 100 / cookedYield])), serving: Object.fromEntries(nutrients.map(k => [k, total[k] * servingWeight / cookedYield])) };
}
