import { MongoClient } from 'mongodb';
import readline from 'readline';

const uri = "mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("test");
    
    const collections = await db.listCollections().toArray();
    console.log("Collections found:", collections.map(c => c.name));

    for (let collection of collections) {
      if (collection.name === 'users') {
        console.log(`Skipping collection: ${collection.name}`);
        continue;
      }
      
      console.log(`Dropping collection: ${collection.name}...`);
      await db.collection(collection.name).drop();
      console.log(`Successfully dropped ${collection.name}`);
    }
    
    console.log("Done clearing data (kept 'users' collection).");
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
