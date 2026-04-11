import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccountStr = readFileSync('./zaina-ai-658b4-firebase-adminsdk-v805d-fc6778f71c.json', 'utf8').trim();
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(serviceAccountStr)) });
}
const db = getFirestore();
const snaps = await db.collection('products').get();
const laptops = snaps.docs.map(d=>d.data()).filter(p => p.category === 'ipad-tablets-laptops' || /laptop|macbook/i.test(p.name));
console.log('Found', laptops.length, 'laptops/tablets');
laptops.forEach(p => {
  console.log(p.brand, p.name, '| price:', p.price, '| monthly:', p.monthlyPrice);
});
