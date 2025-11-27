import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request) {
  try {
    const { collection1, collection2, field1, field2, joinType } = await request.json();
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    
    let results = [];

    if (joinType === 'left') {
      // Left Join - All records from collection1 with matching records from collection2
      const pipeline = [
        {
          $lookup: {
            from: collection2,
            localField: field1,
            foreignField: field2,
            as: 'joined_data'
          }
        }
      ];
      results = await db.collection(collection1).aggregate(pipeline).toArray();
      
    } else if (joinType === 'right') {
      // Right Join - All records from collection2 with matching records from collection1
      const pipeline = [
        {
          $lookup: {
            from: collection1,
            localField: field2,
            foreignField: field1,
            as: 'joined_data'
          }
        }
      ];
      results = await db.collection(collection2).aggregate(pipeline).toArray();
      
    } else if (joinType === 'inner') {
      // Inner Join - Only matching records from both collections
      const pipeline = [
        {
          $lookup: {
            from: collection2,
            localField: field1,
            foreignField: field2,
            as: 'joined_data'
          }
        },
        {
          $match: {
            'joined_data.0': { $exists: true }
          }
        }
      ];
      results = await db.collection(collection1).aggregate(pipeline).toArray();
      
    } else if (joinType === 'full') {
      // Full Outer Join - All records from both collections
      // Left join
      const leftPipeline = [
        {
          $lookup: {
            from: collection2,
            localField: field1,
            foreignField: field2,
            as: 'joined_data'
          }
        },
        {
          $addFields: {
            source: 'left'
          }
        }
      ];
      const leftResults = await db.collection(collection1).aggregate(leftPipeline).toArray();
      
      // Right join (records from collection2 not in collection1)
      const rightPipeline = [
        {
          $lookup: {
            from: collection1,
            localField: field2,
            foreignField: field1,
            as: 'matched'
          }
        },
        {
          $match: {
            'matched.0': { $exists: false }
          }
        },
        {
          $addFields: {
            joined_data: [],
            source: 'right'
          }
        },
        {
          $project: {
            matched: 0
          }
        }
      ];
      const rightResults = await db.collection(collection2).aggregate(rightPipeline).toArray();
      
      results = [...leftResults, ...rightResults];
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
