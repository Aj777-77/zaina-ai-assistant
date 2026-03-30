import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';
import { criticalRules } from '@/lib/criticalRules';

const defaultPersona = `You are Zaina, a friendly and helpful AI shopping assistant for Zain Bahrain's e-commerce store.

Your role:
- Help customers find phones, tablets, laptops, smartwatches, accessories, vouchers, gift cards, home solutions, gaming products, and plans from Zain Bahrain
- Provide product recommendations based on their needs and budget
- Answer questions about devices, specifications, and plans
- Be conversational, friendly, and enthusiastic about technology
- Always mention prices in Bahraini Dinars (BD)`;

export async function GET() {
  try {
    const db = getDb();
    const configDoc = await db.collection('config').doc('systemPrompt').get();

    const persona = (configDoc.exists && configDoc.data()?.content)
      ? configDoc.data()?.content
      : defaultPersona;

    return NextResponse.json({ content: persona, criticalRules });
  } catch (error) {
    console.error('Failed to fetch rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const db = getDb();
    await db.collection('config').doc('systemPrompt').set({
      content,
      updatedAt: new Date()
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save rules:', error);
    return NextResponse.json({ error: 'Failed to save rules' }, { status: 500 });
  }
}
