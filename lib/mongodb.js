import { MongoClient } from 'mongodb';

const options = {};
const clients = new Map();

export async function getMongoClient(customUri) {
  if (!customUri) {
    throw new Error('MongoDB connection URI is required. Please configure it in Settings.');
  }
  
  if (!clients.has(customUri)) {
    const client = new MongoClient(customUri, options);
    clients.set(customUri, client.connect());
  }
  
  return clients.get(customUri);
}

export default getMongoClient;
