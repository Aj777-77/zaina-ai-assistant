import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const chatsSnapshot = await db.collection('chats')
      .orderBy('updatedAt', 'desc')
      .get();
      
    const chats = chatsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userData: data.userData,
        messages: data.messages || [],
        updatedAt: data.updatedAt?.toDate() || new Date(),
        needsLearning: data.needsLearning || false,
        needsLearningMsg: data.needsLearningMsg || null,
        resolvedAt: data.resolvedAt?.toDate?.() || data.resolvedAt || null,
      };
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}
