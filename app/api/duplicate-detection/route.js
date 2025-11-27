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
    
    const { collectionName, fields } = await request.json();
    
    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collection = db.collection(collectionName);
    
    // Build aggregation pipeline to find duplicates
    const groupFields = {};
    fields.forEach(field => {
      groupFields[field] = `$${field}`;
    });
    
    const pipeline = [
      {
        $group: {
          _id: groupFields,
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 100
      }
    ];
    
    const duplicates = await collection.aggregate(pipeline).toArray();
    
    const duplicateGroups = duplicates.map(d => ({
      value: d._id,
      count: d.count,
      ids: d.ids
    }));
    
    const totalDuplicates = duplicates.reduce((sum, d) => sum + d.count, 0);
    
    return NextResponse.json({ 
      duplicateGroups,
      totalDuplicates,
      message: duplicateGroups.length > 0 
        ? `Found ${totalDuplicates} duplicate records in ${duplicateGroups.length} groups`
        : 'No duplicates found'
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
