import { NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';

export async function POST(request) {
  try {
    const customUri = request.headers.get('X-MongoDB-URI');
    const customDb = request.headers.get('X-MongoDB-DB');
    
    if (!customUri || !customDb) {
      return NextResponse.json({ 
        error: 'MongoDB connection not configured. Please set up your connection in Settings (⚙️).' 
      }, { status: 400 });
    }
    
    const { collectionName, data } = await request.json();
    
    if (!collectionName || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collection = db.collection(collectionName);
    
    const result = await collection.insertMany(data);
    
    return NextResponse.json({ 
      success: true, 
      insertedCount: result.insertedCount 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
