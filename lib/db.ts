import mongoose from "mongoose";

// Pre-register all models to prevent MissingSchemaError in Serverless cold starts
import "@/models/Client";
import "@/models/Contract";
import "@/models/Driver";
import "@/models/Log";
import "@/models/Notification";
import "@/models/Unit";
import "@/models/User";
import "@/models/Damage";
import "@/models/Inspection";
import "@/models/Report";
import "@/models/StoredDocument";
import "@/models/Transaction";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

/**
 * Global cache for the MongoDB connection.
 * In development, Next.js clears the Node.js module cache on every request,
 * so we use `globalThis` to persist the connection across hot reloads.
 */
let cached = (globalThis as any).__mongoose_cache;

if (!cached) {
  cached = (globalThis as any).__mongoose_cache = { conn: null, promise: null };
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection attempt is already in progress, wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI!, opts)
      .then(async (mongooseInstance) => {
        console.log("✅ MongoDB connected successfully");
        try {
          const clientsCol = mongooseInstance.connection.db?.collection("clients");
          if (clientsCol) {
            const indexes = await clientsCol.indexes();
            if (indexes.some((idx) => idx.name === "email_1")) {
              await clientsCol.dropIndex("email_1");
              console.log("✅ Dropped legacy email_1 unique index on clients collection");
            }
          }
        } catch {
          // Ignore if index does not exist
        }
        return mongooseInstance;
      })
      .catch((error) => {
        // Reset promise so next call will try again
        cached.promise = null;
        console.error("❌ MongoDB connection failed:", error.message);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Ensure promise is cleared if awaiting a previously-failed promise
    cached.promise = null;
    cached.conn = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
