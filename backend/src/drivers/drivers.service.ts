import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Driver, DriverDocument } from './schemas/driver.schema';
import { Contract, ContractDocument } from '../contracts/schemas/contract.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll() {
    const drivers = await this.driverModel.find({}).sort({ createdAt: -1 }).lean();
    const allContracts = await this.contractModel.find({}).select('driverId deliveryDriverId returnDriverId status').lean();
    const allUsers = await this.userModel.find({ role: 'driver' }).select('_id name email phone status createdAt').lean();

    const emailToUserId = allUsers.reduce((acc: any, user: any) => {
      if (user.email) acc[user.email.toLowerCase()] = String(user._id);
      return acc;
    }, {});

    const processedEmails = new Set();

    const driversWithStats = drivers.map((driver: any) => {
      const emailLower = driver.email?.toLowerCase();
      const userId = emailToUserId[emailLower];
      if (emailLower) processedEmails.add(emailLower);

      const driverIdStr = userId || String(driver._id);
      const driverContracts = allContracts.filter(
        (c: any) =>
          String(c.driverId) === driverIdStr ||
          String(c.deliveryDriverId) === driverIdStr ||
          String(c.returnDriverId) === driverIdStr ||
          String(c.driverId) === String(driver._id),
      );

      return {
        ...driver,
        _id: userId || String(driver._id),
        driverModelId: String(driver._id),
        userId: userId || String(driver._id),
        completedContracts: driverContracts.filter((c: any) => c.status === 'Completed').length,
        activeRentals: driverContracts.filter((c: any) => c.status === 'Active').length,
      };
    });

    for (const u of allUsers) {
      const emailLower = u.email?.toLowerCase();
      if (emailLower && !processedEmails.has(emailLower)) {
        processedEmails.add(emailLower);
        const userIdStr = String(u._id);
        const driverContracts = allContracts.filter(
          (c: any) =>
            String(c.driverId) === userIdStr ||
            String(c.deliveryDriverId) === userIdStr ||
            String(c.returnDriverId) === userIdStr,
        );

        driversWithStats.push({
          _id: userIdStr,
          userId: userIdStr,
          name: u.name || 'Driver',
          email: u.email,
          phone: u.phone || '+213657878987',
          driverId: `DRV-${userIdStr.substring(18, 24).toUpperCase()}`,
          license: 'Standard',
          licenseExpiry: '2028-12-31',
          status: u.status === 'inactive' ? 'Deactivated' : 'Active',
          completedContracts: driverContracts.filter((c: any) => c.status === 'Completed').length,
          activeRentals: driverContracts.filter((c: any) => c.status === 'Active').length,
          createdAt: (u as any).createdAt,
        } as any);
      }
    }

    const stats = {
      totalDrivers: driversWithStats.length,
      activeNow: driversWithStats.filter((d: any) => d.status === 'Active').length,
      contractsCreated: allContracts.length,
      avgPerformance: 0,
    };

    return { drivers: driversWithStats, stats };
  }

  async findById(id: string): Promise<any> {
    let driver: any = null;
    let user: any = null;

    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      driver = await this.driverModel.findById(id).lean();
      if (!driver) {
        user = await this.userModel.findById(id).lean();
        if (user) {
          driver = await this.driverModel.findOne({ email: user.email }).lean();
        }
      }
    } else {
      driver = await this.driverModel.findOne({ $or: [{ driverId: id }, { email: id }] }).lean();
      if (!driver) {
        user = await this.userModel.findOne({ $or: [{ email: id }, { phone: id }] }).lean();
        if (user) {
          driver = await this.driverModel.findOne({ email: user.email }).lean();
        }
      }
    }

    if (!driver && !user) {
      throw new NotFoundException('Driver not found');
    }

    const email = driver?.email || user?.email;
    if (!user && email) {
      user = await this.userModel.findOne({ email }).lean();
    }

    let completedContracts = 0;
    const driverIdStr = user?._id || driver?._id;
    if (driverIdStr) {
      completedContracts = await this.contractModel.countDocuments({
        $or: [
          { driverId: driverIdStr },
          { deliveryDriverId: driverIdStr },
          { returnDriverId: driverIdStr },
        ],
        status: 'Completed',
      });
    }

    const finalDriver = driver || {
      _id: user._id,
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      status: user.status === 'inactive' ? 'Deactivated' : 'Active',
      driverId: `DRV-${String(user._id).substring(18, 24).toUpperCase()}`,
      license: 'Standard',
      licenseExpiry: '2028-12-31',
      createdAt: user.createdAt,
    };

    return { ...finalDriver, completedContracts };
  }

  async create(body: any) {
    const existingDriver = await this.driverModel.findOne({ driverId: body.driverId });
    if (existingDriver) {
      throw new BadRequestException('A driver with this ID already exists');
    }

    if (body.password) {
      const existingUser = await this.userModel.findOne({ email: body.email });
      if (existingUser) {
        throw new BadRequestException('A user with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(body.password, 10);
      await this.userModel.create({
        name: body.name,
        email: body.email,
        phone: body.phone,
        password: hashedPassword,
        role: 'driver',
        status: body.status === 'Deactivated' ? 'inactive' : 'active',
      });
    }

    const { password, ...driverData } = body;
    const newDriver = await this.driverModel.create(driverData);
    return newDriver;
  }

  async update(id: string, body: any) {
    const { password, ...driverData } = body;

    let driverDoc: any = null;
    let userDoc: any = null;

    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      driverDoc = await this.driverModel.findById(id);
      if (!driverDoc) {
        userDoc = await this.userModel.findById(id);
        if (userDoc?.email) {
          driverDoc = await this.driverModel.findOne({ email: userDoc.email });
        }
      }
    } else {
      driverDoc = await this.driverModel.findOne({ $or: [{ driverId: id }, { email: id }] });
      if (!driverDoc) {
        userDoc = await this.userModel.findOne({ $or: [{ email: id }, { phone: id }] });
      }
    }

    if (!userDoc && driverDoc?.email) {
      userDoc = await this.userModel.findOne({ email: driverDoc.email });
    }

    if (!driverDoc && !userDoc) {
      throw new NotFoundException('Driver not found');
    }

    if (driverData.driverId && driverDoc) {
      const existingDriver = await this.driverModel.findOne({ driverId: driverData.driverId });
      if (existingDriver && existingDriver._id.toString() !== driverDoc._id.toString()) {
        throw new BadRequestException('Driver with this ID already exists');
      }
    }

    let updatedDriver = null;
    if (driverDoc) {
      updatedDriver = await this.driverModel.findByIdAndUpdate(driverDoc._id, driverData, {
        new: true,
        runValidators: true,
      });
    }

    if (userDoc) {
      const userUpdates: any = {};
      if (driverData.name) userUpdates.name = driverData.name;
      if (driverData.email) userUpdates.email = driverData.email;
      if (driverData.phone) userUpdates.phone = driverData.phone;
      if (driverData.status) {
        userUpdates.status = driverData.status === 'Deactivated' ? 'inactive' : 'active';
      }
      if (password) {
        userUpdates.password = await bcrypt.hash(password, 10);
      }
      if (Object.keys(userUpdates).length > 0) {
        await this.userModel.findByIdAndUpdate(userDoc._id, userUpdates);
      }
    }

    return updatedDriver || userDoc;
  }

  async remove(id: string) {
    if (id === 'all') {
      return this.removeAll();
    }

    let driverDoc: any = null;
    let userDoc: any = null;

    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      driverDoc = await this.driverModel.findById(id);
      if (!driverDoc) {
        userDoc = await this.userModel.findById(id);
        if (userDoc?.email) {
          driverDoc = await this.driverModel.findOne({ email: userDoc.email });
        }
      }
    } else {
      driverDoc = await this.driverModel.findOne({ $or: [{ driverId: id }, { email: id }] });
      if (!driverDoc) {
        userDoc = await this.userModel.findOne({ $or: [{ email: id }, { phone: id }] });
      }
    }

    if (!userDoc && driverDoc?.email) {
      userDoc = await this.userModel.findOne({ email: driverDoc.email });
    }
    if (!driverDoc && userDoc?.email) {
      driverDoc = await this.driverModel.findOne({ email: userDoc.email });
    }

    if (!driverDoc && !userDoc) {
      throw new NotFoundException('Driver not found');
    }

    if (driverDoc) {
      await this.driverModel.findByIdAndDelete(driverDoc._id);
    }
    if (userDoc) {
      await this.userModel.findByIdAndDelete(userDoc._id);
    }

    const driverIdsToUnassign = [
      driverDoc?._id,
      userDoc?._id,
    ].filter(Boolean);

    if (driverIdsToUnassign.length > 0) {
      await this.contractModel.updateMany(
        {
          $or: [
            { driverId: { $in: driverIdsToUnassign } },
            { deliveryDriverId: { $in: driverIdsToUnassign } },
            { returnDriverId: { $in: driverIdsToUnassign } },
          ],
          status: { $in: ['Draft'] },
        },
        {
          $unset: { driverId: 1, deliveryDriverId: 1, returnDriverId: 1 },
        },
      );
    }

    return { message: 'Driver deleted successfully' };
  }

  async removeAll() {
    const drivers = await this.driverModel.find({}).lean();
    const emails = drivers.map((d: any) => d.email).filter(Boolean);

    await this.driverModel.deleteMany({});
    await this.userModel.deleteMany({
      $or: [
        { role: 'driver' },
        { email: { $in: emails } },
      ],
    });

    await this.contractModel.updateMany(
      { status: 'Draft' },
      { $unset: { driverId: 1, deliveryDriverId: 1, returnDriverId: 1 } },
    );

    return { message: 'All drivers deleted successfully' };
  }
}
