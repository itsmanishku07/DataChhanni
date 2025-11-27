import { NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';

export async function POST(request) {
  try {
    const customUri = request.headers.get('X-MongoDB-URI');
    const customDb = request.headers.get('X-MongoDB-DB');
    
    if (!customUri || !customDb) {
      return NextResponse.json({ 
        error: 'MongoDB connection not configured.' 
      }, { status: 400 });
    }
    
    const { collectionName, transformations } = await request.json();
    
    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collection = db.collection(collectionName);
    
    const data = await collection.find({}).toArray();
    
    // Apply transformations
    const transformed = data.map(doc => {
      const newDoc = { ...doc };
      
      transformations.forEach(transform => {
        const { field, operation, params } = transform;
        
        if (!newDoc[field]) return;
        
        switch (operation) {
          case 'uppercase':
            newDoc[field] = String(newDoc[field]).toUpperCase();
            break;
          case 'lowercase':
            newDoc[field] = String(newDoc[field]).toLowerCase();
            break;
          case 'trim':
            newDoc[field] = String(newDoc[field]).trim();
            break;
          case 'multiply':
            if (typeof newDoc[field] === 'number') {
              newDoc[field] = newDoc[field] * (params?.factor || 1);
            }
            break;
          case 'round':
            if (typeof newDoc[field] === 'number') {
              newDoc[field] = Math.round(newDoc[field] * 100) / 100;
            }
            break;
          case 'replace':
            newDoc[field] = String(newDoc[field]).replace(
              new RegExp(params?.find || '', 'g'),
              params?.replace || ''
            );
            break;
          case 'prefix':
            newDoc[field] = (params?.prefix || '') + String(newDoc[field]);
            break;
          case 'suffix':
            newDoc[field] = String(newDoc[field]) + (params?.suffix || '');
            break;
        }
      });
      
      return newDoc;
    });
    
    return NextResponse.json({ 
      preview: transformed.slice(0, 10),
      totalRecords: transformed.length
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
