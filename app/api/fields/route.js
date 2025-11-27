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
    const collection = db.collection(collectionName);
    
    // Get a sample document to extract field names
    const sampleDoc = await collection.findOne({});
    
    if (!sampleDoc) {
      return NextResponse.json({ fields: [] });
    }

    // Extract all field names from the document
    const fields = Object.keys(sampleDoc).filter(key => key !== '_id');
    
    return NextResponse.json({ fields });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
