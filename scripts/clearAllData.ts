import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function clearAllData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    const collections = await mongoose.connection.db!.collections();
    const excludeCollections = ['users', 'accounts', 'sessions', 'verification_tokens']; // Keep next-auth tables

    for (let collection of collections) {
      if (!excludeCollections.includes(collection.collectionName)) {
        await collection.deleteMany({});
        console.log(`Cleared collection: ${collection.collectionName}`);
      } else {
        console.log(`Skipped collection: ${collection.collectionName}`);
      }
    }

    console.log("All application data cleared successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing data:", error);
    process.exit(1);
  }
}

clearAllData();
