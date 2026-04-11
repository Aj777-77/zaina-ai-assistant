function parseBD(text) {
  if (!text) return null;
  if (typeof text === 'number') return { amount: text, isMonthly: false };
  const isMonthly = /\/mo/i.test(text);
  const match = String(text).match(/([\d,]+\.?\d*)/);
  if (!match) return null;
  return { amount: parseFloat(match[1].replace(/,/g, '')), isMonthly };
}

function getFullPrice(product) {
  const parsed = parseBD(product.price);
  if (!parsed) return null;
  return parsed.isMonthly ? parsed.amount * 24 : parsed.amount;
}

function getMonthlyPrice(product) {
  const monthly = parseBD(product.monthlyPrice);
  if (monthly) return monthly.amount;
  const price = parseBD(product.price);
  if (price?.isMonthly) return price.amount;
  return null;
}

function isProductInBudget(product, min, max, isMonthly) {
  const price = isMonthly ? getMonthlyPrice(product) : getFullPrice(product);
  console.log('calculated price for', product.name, 'is', price, 'budget is', max);
  if (price === null) return false;
  if (min !== null && price < min) return false;
  if (max !== null && price > max) return false;
  return true;
}

const laptops = [
  { name: 'Macbook Air', price: 'BD 45.000 /mo', monthlyPrice: 'BD 45.000' },
  { name: 'Lenovo IdeaPad', price: 'BD 12.000 /mo', monthlyPrice: 'BD 12.000' }
];

laptops.forEach(p => {
  const inBudget = isProductInBudget(p, null, 600, false);
  console.log(p.name, 'inBudget?', inBudget);
});
