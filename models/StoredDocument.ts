import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStoredDocument extends Document {
  documentId: string;
  name: string;
  type: string;
  relatedTo: string;
  url: string;
  size: string;
  uploadDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const storedDocumentSchema = new Schema<IStoredDocument>(
  {
    documentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    relatedTo: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times during Next.js hot reload
export const StoredDocument: Model<IStoredDocument> =
  mongoose.models.StoredDocument || mongoose.model<IStoredDocument>("StoredDocument", storedDocumentSchema);
