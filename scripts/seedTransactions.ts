import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { Transaction } from "../models/Transaction";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function seedTransactions() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const transactions = [
    // Income / Invoices
    {
      transactionId: "#INV-001",
      type: "income",
      title: "Toyota Camry Rental",
      category: "Rental Income",
      amount: 450.00,
      status: "completed",
      date: new Date("2026-07-01"),
      clientName: "John Doe",
      carModel: "Toyota Camry 2024",
      rentalPeriod: "3 Days"
    },
    {
      transactionId: "#INV-002",
      type: "income",
      title: "Chevrolet Malibu Rental",
      category: "Rental Income",
      amount: 600.00,
      status: "pending",
      date: new Date("2026-07-04"),
      clientName: "Sarah Jenkins",
      carModel: "Chevrolet Malibu",
      rentalPeriod: "4 Days"
    },
    {
      transactionId: "#INV-003",
      type: "income",
      title: "Damage Fee",
      category: "Damage Fee",
      amount: 150.00,
      status: "overdue",
      date: new Date("2026-06-25"),
      clientName: "Michael Brown",
      carModel: "Honda Civic",
    },
    // Expenses
    {
      transactionId: "#EXP-001",
      type: "expense",
      title: "Oil Change - Honda Civic",
      category: "Maintenance",
      amount: 120.00,
      status: "completed",
      date: new Date("2026-07-02"),
      quantity: 1
    },
    {
      transactionId: "#EXP-002",
      type: "expense",
      title: "Salik Tolls - June",
      category: "Salik",
      amount: 80.00,
      status: "completed",
      date: new Date("2026-07-01"),
      quantity: 1
    },
    {
      transactionId: "#EXP-003",
      type: "expense",
      title: "Office Stationery",
      category: "Office",
      amount: 45.50,
      status: "pending",
      date: new Date("2026-07-03"),
      quantity: 1
    }
  ];

  await Transaction.deleteMany({});
  console.log("Cleared all transactions successfully");
  process.exit(0);
}

seedTransactions().catch(console.error);
