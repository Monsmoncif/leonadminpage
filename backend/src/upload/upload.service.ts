import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(image: string, folder = 'wheelzie_fleet') {
    if (!image) {
      throw new BadRequestException('No image provided');
    }

    try {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder,
        resource_type: 'auto',
        timeout: 120000,
      });
      return { url: uploadResponse.secure_url };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to upload image to Cloudinary');
    }
  }
}
