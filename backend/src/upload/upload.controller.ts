import { Controller, Post, Body } from '@nestjs/common';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  async upload(@Body('image') image: string, @Body('folder') folder?: string) {
    return this.uploadService.uploadImage(image, folder);
  }
}
