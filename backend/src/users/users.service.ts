import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll() {
    return this.userModel.find().sort({ createdAt: -1 }).select('-password').exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(createDto: any) {
    const existing = await this.userModel.findOne({ email: createDto.email });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    if (createDto.password) {
      createDto.password = await bcrypt.hash(createDto.password, 10);
    }

    const newUser = await this.userModel.create(createDto);
    const userObj = newUser.toObject();
    delete userObj.password;
    return userObj;
  }

  async update(id: string, updateDto: any) {
    if (updateDto.email) {
      const existing = await this.userModel.findOne({
        email: updateDto.email,
        _id: { $ne: id },
      });
      if (existing) {
        throw new BadRequestException('Email already in use by another user');
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
      throw new NotFoundException('User not found');
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
      } catch (err) {
        console.error('Password change email failed:', err);
      }
    }

    return updatedUser;
  }

  async remove(id: string) {
    const deleted = await this.userModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }
}
