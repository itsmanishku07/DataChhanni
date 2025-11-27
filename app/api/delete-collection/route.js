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
    
    const { collectionName } = await request.json();
    
    if (!collectionName) {
      return NextResponse.json({ error: 'Collection name required' }, { status: 400 });
    }

    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    
    // Drop the collection
    await db.collection(collectionName).drop();
    
    return NextResponse.json({ 
      success: true,
      message: `Collection "${collectionName}" deleted successfully`
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
