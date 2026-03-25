import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brand = searchParams.get('brand');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    const db = getDb();
    let query = db.collection('products');

    // Apply filters
    if (brand) {
      query = query.where('brand', '==', brand) as any;
    }
    if (category) {
      query = query.where('category', '==', category) as any;
    }

    // Get products
    const snapshot = await query.limit(limit).get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      products,
      count: products.length
    });

  } catch (error: any) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const productsRef = db.collection('products');

    // Add products to Firestore
    const results = await Promise.all(
      products.map(async (product) => {
        const docRef = await productsRef.add({
          ...product,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return { id: docRef.id, ...product };
      })
    );

    return NextResponse.json({
      message: 'Products added successfully',
      count: results.length,
      products: results
    });

  } catch (error: any) {
    console.error('Products POST API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add products' },
      { status: 500 }
    );
  }
}
