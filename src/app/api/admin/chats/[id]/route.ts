import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';

// PATCH /api/admin/chats/[id]
// body: { action: 'teach', question: string, answer: string } | { action: 'resolve' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'teach') {
      const { question, answer } = body;
      if (!answer?.trim()) {
        return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
      }

      // Save to knowledge collection
      await db.collection('knowledge').add({
        title: `Q: ${(question || '').slice(0, 80)}`,
        content: `Question: ${question}\n\nAnswer: ${answer}`,
        source: 'admin_teaching',
        createdAt: new Date(),
      });

      // Mark chat as resolved
      await db.collection('chats').doc(id).update({
        needsLearning: false,
        resolvedAt: new Date(),
        teachingAnswer: answer,
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'resolve') {
      await db.collection('chats').doc(id).update({
        needsLearning: false,
        resolvedAt: new Date(),
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update chat:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}
