import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClient extends Document {
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: Date | string;

  phone?: string;
  email: string;
  nationality: string;
  idNumber: string; // Passport or National ID

  // Tourist Passport Details
  passportNumber?: string;
  passportIssuedBy?: string;
  passportIssuedDate?: Date | string;
  passportExpiry?: Date | string;

  // Driving License Details
  licenseNumber: string;
  licenseIssuedBy?: string;
  licenseIssuedDate?: Date | string;
  licenseExpiry: Date | string;

  // International Driving License Details
  internationalLicenseNumber?: string;
  internationalLicenseIssuedBy?: string;
  internationalLicenseIssuedDate?: Date | string;
  internationalLicenseExpiry?: Date | string;

  // Visa Details
  visaNumber?: string;
  visaExpiry?: Date | string;

  address: string;
  clientType?: "Resident" | "Tourist";
  status: "Active" | "Blacklisted";
  documents: string[]; // Cloudinary URLs for uploaded docs
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true },
    firstName: { type: String, required: false },
    middleName: { type: String, required: false },
    lastName: { type: String, required: false },
    gender: { type: String, required: false },
    dateOfBirth: { type: Date, required: false },

    phone: { type: String, required: false, default: "N/A" },
    email: { type: String, required: false, default: "" },
    nationality: { type: String, required: true },
    idNumber: { type: String, required: true },

    // Tourist Passport Details
    passportNumber: { type: String, required: false },
    passportIssuedBy: { type: String, required: false },
    passportIssuedDate: { type: Date, required: false },
    passportExpiry: { type: Date, required: false },

    // Driving License Details
    licenseNumber: { type: String, required: true },
    licenseIssuedBy: { type: String, required: false },
    licenseIssuedDate: { type: Date, required: false },
    licenseExpiry: { type: Date, required: false },

    // International Driving License Details
    internationalLicenseNumber: { type: String, required: false },
    internationalLicenseIssuedBy: { type: String, required: false },
    internationalLicenseIssuedDate: { type: Date, required: false },
    internationalLicenseExpiry: { type: Date, required: false },

    // Visa Details
    visaNumber: { type: String, required: false },
    visaExpiry: { type: Date, required: false },

    address: { type: String, required: true },
    clientType: { type: String, enum: ["Resident", "Tourist"], default: "Resident" },
    status: { type: String, enum: ["Active", "Blacklisted"], default: "Active" },
    documents: [{ type: String }],
  },
  { timestamps: true }
);

export const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>("Client", clientSchema);
