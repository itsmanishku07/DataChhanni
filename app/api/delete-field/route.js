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
    
    const { collectionName, fieldName } = await request.json();
    
    if (!collectionName || !fieldName) {
      return NextResponse.json({ error: 'Collection name and field name required' }, { status: 400 });
    }

    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collection = db.collection(collectionName);
    
    // Remove the field from all documents
    const result = await collection.updateMany(
      {},
      { $unset: { [fieldName]: "" } }
    );
    
    return NextResponse.json({ 
      success: true, 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
