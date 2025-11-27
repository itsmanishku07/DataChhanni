import { NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';

export async function GET(request) {
  try {
    const customUri = request.headers.get('X-MongoDB-URI');
    const customDb = request.headers.get('X-MongoDB-DB');
    
    if (!customUri || !customDb) {
      return NextResponse.json({ 
        error: 'MongoDB connection not configured. Please set up your connection in Settings (⚙️).' 
      }, { status: 400 });
    }
    
    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collections = await db.listCollections().toArray();
    
    return NextResponse.json({ 
      collections: collections.map(c => c.name) 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
