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
    
    const { collectionName, format, filter } = await request.json();
    
    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collection = db.collection(collectionName);
    
    const data = await collection.find(filter || {}).toArray();
    
    if (format === 'json') {
      return NextResponse.json(data);
    }
    
    if (format === 'csv') {
      if (data.length === 0) {
        return new NextResponse('No data to export', { status: 400 });
      }
      
      const fields = Object.keys(data[0]).filter(k => k !== '_id');
      const csv = [
        fields.join(','),
        ...data.map(row => 
          fields.map(field => {
            const value = row[field];
            if (value == null) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
            return value;
          }).join(',')
        )
      ].join('\n');
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${collectionName}.csv"`
        }
      });
    }
    
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
