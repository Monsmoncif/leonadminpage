"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findAll() {
        return this.userModel.find().sort({ createdAt: -1 }).select('-password').exec();
    }
    async findById(id) {
        const user = await this.userModel.findById(id).select('-password').exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async create(createDto) {
        const existing = await this.userModel.findOne({ email: createDto.email });
        if (existing) {
            throw new common_1.BadRequestException('Email already in use');
        }
        if (createDto.password) {
            createDto.password = await bcrypt.hash(createDto.password, 10);
        }
        const newUser = await this.userModel.create(createDto);
        const userObj = newUser.toObject();
        delete userObj.password;
        return userObj;
    }
    async update(id, updateDto) {
        if (updateDto.email) {
            const existing = await this.userModel.findOne({
                email: updateDto.email,
                _id: { $ne: id },
            });
            if (existing) {
                throw new common_1.BadRequestException('Email already in use by another user');
            }
        }
        const isPasswordChanged = !!updateDto.password;
        if (isPasswordChanged) {
            updateDto.password = await bcrypt.hash(updateDto.password, 10);
        }
        const updatedUser = await this.userModel.findByIdAndUpdate(id, updateDto, {
            new: true,
            runValidators: true,
        }).select('-password').exec();
        if (!updatedUser) {
            throw new common_1.NotFoundException('User not found');
        }
        if (isPasswordChanged && process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });
                await transporter.sendMail({
                    from: `"Wheelzie Admin" <${process.env.SMTP_USER}>`,
                    to: updatedUser.email,
                    subject: 'Security Alert: Your Password Was Changed',
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: #1e293b; margin-bottom: 20px;">Security Alert: Password Changed</h2>
              <p style="color: #334155; font-size: 16px;">Hello <strong>${updatedUser.name}</strong>,</p>
              <p style="color: #334155; font-size: 16px;">This is a confirmation that the password for your Wheelzie account (<strong>${updatedUser.email}</strong>) was just changed.</p>
              <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Best regards,<br/>The Wheelzie Team</p>
            </div>
          `,
                });
            }
            catch (err) {
                console.error('Password change email failed:', err);
            }
        }
        return updatedUser;
    }
    async remove(id) {
        const deleted = await this.userModel.findByIdAndDelete(id).exec();
        if (!deleted) {
            throw new common_1.NotFoundException('User not found');
        }
        return { message: 'User deleted successfully' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map