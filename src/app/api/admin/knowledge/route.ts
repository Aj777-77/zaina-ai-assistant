import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const knowledgeSnapshot = await db.collection('knowledge').orderBy('createdAt', 'desc').get();
    
    const documents = knowledgeSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Failed to fetch knowledge docs:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge docs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();
    
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const db = getDb();
    const docRef = await db.collection('knowledge').add({
      title,
      content,
      createdAt: new Date()
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Failed to save knowledge doc:', error);
    return NextResponse.json({ error: 'Failed to save knowledge document' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const db = getDb();
    await db.collection('knowledge').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete knowledge doc:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
