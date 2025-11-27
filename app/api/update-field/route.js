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
    
    const { collectionName, filter, updates } = await request.json();
    
    if (!collectionName || !updates) {
      return NextResponse.json({ error: 'Collection name and updates required' }, { status: 400 });
    }

    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collection = db.collection(collectionName);
    
    // Parse filter if provided, otherwise update all documents
    const filterQuery = filter ? JSON.parse(filter) : {};
    
    // Update documents matching the filter
    const result = await collection.updateMany(
      filterQuery,
      { $set: updates }
    );
    
    return NextResponse.json({ 
      success: true, 
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
