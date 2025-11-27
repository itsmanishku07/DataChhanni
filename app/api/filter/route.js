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
    
    const { collectionName, filter } = await request.json();
    
    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collection = db.collection(collectionName);
    
    const results = await collection.find(filter || {}).toArray();
    
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
