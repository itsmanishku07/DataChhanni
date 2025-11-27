import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function POST(request) {
  let client;
  try {
    const { mongoUri, mongoDb } = await request.json();
    
    if (!mongoUri || !mongoDb) {
      return NextResponse.json({ 
        success: false,
        error: 'MongoDB URI and database name are required' 
      }, { status: 400 });
    }

    // Attempt to connect with a timeout
    client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });

    await client.connect();
    
    // Try to access the database
    const db = client.db(mongoDb);
    await db.command({ ping: 1 });
    
    // Get list of collections to verify access
    const collections = await db.listCollections().toArray();
    
    return NextResponse.json({ 
      success: true,
      message: 'Connection successful!',
      collectionsCount: collections.length
    });
  } catch (error) {
    let errorMessage = error.message;
    
    // Provide more helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused. Make sure MongoDB is running and accessible.';
    } else if (error.message.includes('Authentication failed')) {
      errorMessage = 'Authentication failed. Check your username and password.';
    } else if (error.message.includes('Invalid connection string')) {
      errorMessage = 'Invalid connection string format.';
    } else if (error.message.includes('Server selection timed out')) {
      errorMessage = 'Connection timeout. Check your MongoDB URI and network connection.';
    }
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage
    }, { status: 400 });
  } finally {
    // Always close the test connection
    if (client) {
      try {
        await client.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
}
