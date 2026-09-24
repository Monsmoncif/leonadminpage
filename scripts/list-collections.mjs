import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("test");
    
    const collections = await db.listCollections().toArray();
    console.log("Collections in 'test' db:", collections.map(c => c.name));

  } finally {
    await client.close();
  }
}
run().catch(console.dir);
