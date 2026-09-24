import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { Transaction } from "../models/Transaction";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");
  
  const tx = await Transaction.find({});
  console.log("Transactions count:", tx.length);
  console.log("First tx:", tx[0]);
  process.exit(0);
}
check();
