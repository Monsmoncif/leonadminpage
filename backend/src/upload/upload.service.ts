import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const MIME_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

@Injectable()
export class UploadService {
  async uploadImage(image: string, folder = 'wheelzie_fleet') {
    if (!image) {
      throw new BadRequestException('No image provided');
    }

    // If already a URL, return as-is
    if (
      image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('/uploads/')
    ) {
      return { url: image, secure_url: image };
    }

    try {
      let buffer: Buffer;
      let ext = 'jpg';

      const dataUriMatch = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
      if (dataUriMatch) {
        const mime = dataUriMatch[1].toLowerCase();
        ext = MIME_MAP[mime] || 'jpg';
        buffer = Buffer.from(dataUriMatch[2], 'base64');
      } else {
        buffer = Buffer.from(image, 'base64');
      }

      const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
      const randomId = crypto.randomBytes(6).toString('hex');
      const filename = `${Date.now()}-${randomId}.${ext}`;

      // Target public/uploads in root project
      const uploadDir = path.resolve(process.cwd(), '..', 'public', 'uploads', safeFolder);
      await fs.mkdir(uploadDir, { recursive: true });

      const targetPath = path.join(uploadDir, filename);
      await fs.writeFile(targetPath, buffer);

      const fileUrl = `/uploads/${safeFolder}/${filename}`;
      return { url: fileUrl, secure_url: fileUrl, filename };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to save file on server');
    }
  }
}
