import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { Log } from "../models/Log";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function seedLogs() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const mockLogs = [
    {
      logId: "LOG-001",
      user: "System Admin",
      role: "Super Admin",
      action: "Login",
      description: "Logged into the system successfully.",
      ip: "192.168.1.15",
      type: "auth",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) // 2 days ago
    },
    {
      logId: "LOG-002",
      user: "Admin Leo",
      role: "Admin",
      action: "Create Contract",
      description: "Created Contract CTR-1005 for customer Bob Smith.",
      ip: "192.168.1.42",
      type: "create",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1) // 1 day ago
    },
    {
      logId: "LOG-003",
      user: "Jane Manager",
      role: "Admin",
      action: "Delete User",
      description: "Deleted user John Doe from the system.",
      ip: "192.168.1.15",
      type: "delete",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5 hours ago
    },
    {
      logId: "LOG-004",
      user: "Emily Driver",
      role: "Driver",
      action: "Upload Document",
      description: "Uploaded Vehicle Photo for Inspection #102.",
      ip: "10.0.0.5",
      type: "create",
      createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    },
    {
      logId: "LOG-005",
      user: "Admin Leo",
      role: "Admin",
      action: "Edit Settings",
      description: "Updated global system tax rate to 15%.",
      ip: "192.168.1.42",
      type: "edit",
      createdAt: new Date() // Just now
    }
  ];

  await Log.deleteMany({});
  await Log.insertMany(mockLogs);
  console.log("Seeded Logs successfully");
  process.exit(0);
}

seedLogs().catch(console.error);
