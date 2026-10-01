"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const MIME_MAP = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
};
let UploadService = class UploadService {
    async uploadImage(image, folder = 'wheelzie_fleet') {
        if (!image) {
            throw new common_1.BadRequestException('No image provided');
        }
        if (image.startsWith('http://') ||
            image.startsWith('https://') ||
            image.startsWith('/uploads/')) {
            return { url: image, secure_url: image };
        }
        try {
            let buffer;
            let ext = 'jpg';
            const dataUriMatch = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
            if (dataUriMatch) {
                const mime = dataUriMatch[1].toLowerCase();
                ext = MIME_MAP[mime] || 'jpg';
                buffer = Buffer.from(dataUriMatch[2], 'base64');
            }
            else {
                buffer = Buffer.from(image, 'base64');
            }
            const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
            const randomId = crypto.randomBytes(6).toString('hex');
            const filename = `${Date.now()}-${randomId}.${ext}`;
            const uploadDir = path.resolve(process.cwd(), '..', 'public', 'uploads', safeFolder);
            await fs.mkdir(uploadDir, { recursive: true });
            const targetPath = path.join(uploadDir, filename);
            await fs.writeFile(targetPath, buffer);
            const fileUrl = `/uploads/${safeFolder}/${filename}`;
            return { url: fileUrl, secure_url: fileUrl, filename };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to save file on server');
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)()
], UploadService);
//# sourceMappingURL=upload.service.js.map