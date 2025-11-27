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
    
    const { collectionName } = await request.json();
    
    const client = await getMongoClient(customUri);
    const db = client.db(customDb);
    const collection = db.collection(collectionName);
    
    // Get sample data
    const sampleData = await collection.find({}).limit(100).toArray();
    
    if (sampleData.length === 0) {
      return NextResponse.json({ 
        totalRecords: 0,
        totalFields: 0,
        numericFields: 0,
        textFields: 0,
        fieldStats: {},
        recommendations: []
      });
    }
    
    // Analyze data structure
    const fields = Object.keys(sampleData[0]).filter(k => k !== '_id');
    const fieldStats = {};
    const recommendations = [];
    let numericFields = 0;
    let textFields = 0;
    
    // Analyze each field
    for (const field of fields) {
      const values = sampleData.map(doc => doc[field]).filter(v => v != null);
      
      if (values.length === 0) continue;
      
      const fieldType = typeof values[0];
      const uniqueValues = new Set(values);
      
      // Numeric analysis
      if (fieldType === 'number') {
        numericFields++;
        const numbers = values.filter(v => typeof v === 'number');
        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / numbers.length;
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        
        fieldStats[field] = {
          type: 'numeric',
          unique: uniqueValues.size,
          min,
          max,
          avg
        };
        
        if (avg > 1000) {
          recommendations.push(`Field "${field}" has large values - consider using currency or number formatting`);
        }
      }
      
      // String analysis
      if (fieldType === 'string') {
        textFields++;
        fieldStats[field] = {
          type: 'text',
          unique: uniqueValues.size
        };
        
        if (uniqueValues.size < 10) {
          recommendations.push(`Field "${field}" has only ${uniqueValues.size} unique values - could be used as a category filter`);
        }
      }
      
      // Check for potential issues
      const nullCount = sampleData.filter(doc => doc[field] == null).length;
      if (nullCount > sampleData.length * 0.3) {
        recommendations.push(`Field "${field}" has ${((nullCount / sampleData.length) * 100).toFixed(0)}% missing values - consider adding defaults`);
      }
    }
    
    return NextResponse.json({ 
      totalRecords: sampleData.length,
      totalFields: fields.length,
      numericFields,
      textFields,
      fieldStats,
      recommendations
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
