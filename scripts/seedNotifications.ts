import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { Notification } from "../models/Notification";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function seedNotifications() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const mockNotifications = [
    {
      title: "New Contract Created",
      message: "Contract CTR-1005 has been successfully generated.",
      read: false,
      type: "contract",
      createdAt: new Date(Date.now() - 1000 * 60 * 5) // 5 mins ago
    },
    {
      title: "Vehicle Overdue",
      message: "Toyota Camry (TX8899) is overdue for return by 2 hours.",
      read: false,
      type: "alert",
      createdAt: new Date(Date.now() - 1000 * 60 * 120) // 2 hours ago
    },
    {
      title: "Maintenance Reminder",
      message: "Chevrolet Malibu is scheduled for maintenance tomorrow.",
      read: true,
      type: "reminder",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
    },
    {
      title: "System Update",
      message: "Wheelzie system will undergo maintenance at 2 AM tonight.",
      read: true,
      type: "general",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48) // 2 days ago
    }
  ];

  await Notification.deleteMany({});
  await Notification.insertMany(mockNotifications);
  console.log("Seeded Notifications successfully");
  process.exit(0);
}

seedNotifications().catch(console.error);
