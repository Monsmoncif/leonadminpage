const mongoose = require("mongoose");

const MONGODB_URI = "mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/test";

const unitSchema = new mongoose.Schema(
  {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    plate: { type: String, required: true, unique: true },
    vin: { type: String, required: true, unique: true },
    color: { type: String, required: true },
    mileage: { type: Number, required: true, default: 0 },
    status: { 
      type: String, 
      enum: ["Available", "Rented", "Maintenance", "Out of Service"],
      default: "Available"
    },
    images: [{ type: String }],
    documents: [{ type: String }],
    dailyRate: { type: Number, default: 0 },
    dailyKmLimit: { type: Number, default: 0 }, // 0 means unlimited
    pricePerExtraKm: { type: Number, default: 0 },
    transmission: { type: String, enum: ["Automatic", "Manual"], default: "Automatic" },
    capacity: { type: Number, default: 5 },
    fuelType: { type: String, enum: ["Petrol", "Diesel", "Electric", "Hybrid"], default: "Petrol" },
    features: [{ type: String }],
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

const Unit = mongoose.models.Unit || mongoose.model("Unit", unitSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Delete test unit if exists
  await Unit.deleteOne({ plate: "TEST-123" });

  const unit = await Unit.create({
    make: "Test",
    model: "Test",
    year: 2024,
    plate: "TEST-123",
    vin: "TESTVIN1234567890",
    color: "Blue",
    mileage: 100,
    status: "Available",
    dailyRate: 150,
    dailyKmLimit: 200,
    pricePerExtraKm: 0.75,
  });

  console.log("Created Unit:", unit);

  const found = await Unit.findOne({ plate: "TEST-123" });
  console.log("Found Unit in DB:", found);

  await Unit.deleteOne({ plate: "TEST-123" });
  await mongoose.disconnect();
}

run().catch(console.error);
