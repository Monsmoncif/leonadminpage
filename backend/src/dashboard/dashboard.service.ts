import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Unit, UnitDocument } from '../units/schemas/unit.schema';
import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { Contract, ContractDocument } from '../contracts/schemas/contract.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { Damage, DamageDocument } from '../damages/schemas/damage.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Unit.name) private unitModel: Model<UnitDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Damage.name) private damageModel: Model<DamageDocument>,
  ) {}

  async getDashboardData(yearParam?: string) {
    const selectedYear = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      totalUnits,
      availableUnits,
      rentedUnits,
      maintenanceUnits,
      totalClients,
      totalDrivers,
      totalContracts,
      activeContracts,
      completedContracts,
      cancelledContracts,
      overdueContracts,
      recentActivity,
      clientsThisMonth,
      clientsLastMonth,
      unitsThisMonth,
      unitsLastMonth,
      contractsThisMonth,
      contractsLastMonth,
      damagesCount,
    ] = await Promise.all([
      this.unitModel.countDocuments(),
      this.unitModel.countDocuments({ status: 'Available' }),
      this.unitModel.countDocuments({ status: 'Rented' }),
      this.unitModel.countDocuments({ status: 'Maintenance' }),
      this.clientModel.countDocuments(),
      this.driverModel.countDocuments(),
      this.contractModel.countDocuments(),
      this.contractModel.countDocuments({ status: 'Active' }),
      this.contractModel.countDocuments({ status: 'Completed' }),
      this.contractModel.countDocuments({ status: 'Cancelled' }),
      this.contractModel.countDocuments({ status: 'Active', endDate: { $lt: new Date() } }),
      this.contractModel
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('clientId', 'name')
        .populate('unitId', 'make model plate')
        .lean(),
      this.clientModel.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      this.clientModel.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      this.unitModel.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      this.unitModel.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      this.contractModel.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      this.contractModel.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      this.damageModel.countDocuments({ status: 'Pending' }),
    ]);

    const revenueThisMonthResult = await this.contractModel.aggregate([
      {
        $match: {
          $or: [
            { status: 'Completed', updatedAt: { $gte: startOfThisMonth } },
            { status: 'Active', startDate: { $gte: startOfThisMonth } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ['$totalAmount', 0] },
                    { $ifNull: ['$damageCharge', 0] },
                  ],
                },
              ],
            },
          },
        },
      },
    ]);
    const revenueThisMonth = revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0;

    const revenueLastMonthResult = await this.contractModel.aggregate([
      {
        $match: {
          $or: [
            { status: 'Completed', updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
            { status: 'Active', startDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ['$totalAmount', 0] },
                    { $ifNull: ['$damageCharge', 0] },
                  ],
                },
              ],
            },
          },
        },
      },
    ]);
    const revenueLastMonth = revenueLastMonthResult.length > 0 ? revenueLastMonthResult[0].total : 0;

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const changes = {
      revenue: calcChange(revenueThisMonth, revenueLastMonth),
      rentals: calcChange(contractsThisMonth, contractsLastMonth),
      customers: calcChange(clientsThisMonth, clientsLastMonth),
      vehicles: calcChange(unitsThisMonth, unitsLastMonth),
    };

    const startOfSelectedYear = new Date(selectedYear, 0, 1);
    const endOfSelectedYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const contractsPerMonth = await this.contractModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfSelectedYear, $lte: endOfSelectedYear },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const rentalsPerMonthData = monthNames.map((month, idx) => {
      const found = contractsPerMonth.find((c: any) => c._id === idx + 1);
      return { month, rentals: found ? found.count : 0 };
    });

    const revenuePerMonth = await this.contractModel.aggregate([
      { $match: { status: { $in: ['Active', 'Completed'] } } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ['$totalAmount', 0] },
                    { $ifNull: ['$damageCharge', 0] },
                  ],
                },
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueData = monthNames.map((month, idx) => {
      const found = revenuePerMonth.find((r: any) => r._id === idx + 1);
      return { month, revenue: found ? found.revenue : 0 };
    });

    const mostRented = await this.contractModel.aggregate([
      {
        $group: {
          _id: '$unitId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 4 },
      {
        $lookup: {
          from: 'units',
          localField: '_id',
          foreignField: '_id',
          as: 'unit',
        },
      },
      { $unwind: { path: '$unit', preserveNullAndEmptyArrays: true } },
    ]);

    const mostRentedCarsData = mostRented.map((item: any) => ({
      name: item.unit ? `${item.unit.make} ${item.unit.model}` : 'Unknown Vehicle',
      value: item.count,
    }));

    const upcomingReturnsRaw = await this.contractModel
      .find({ status: 'Active' })
      .sort({ endDate: 1 })
      .limit(4)
      .populate('clientId', 'name')
      .populate('unitId', 'make model plate')
      .lean();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingReturns = upcomingReturnsRaw.map((contract: any, idx: number) => {
      const endDate = new Date(contract.endDate);
      const isToday = endDate >= today && endDate < tomorrow;
      const isTomorrow = endDate >= tomorrow && endDate < new Date(tomorrow.getTime() + 86400000);

      return {
        id: idx + 1,
        customer: contract.clientId?.name || 'Unknown',
        vehicle: contract.unitId
          ? `${contract.unitId.make} ${contract.unitId.model} (${contract.unitId.plate})`
          : 'Unknown',
        dueDate: isToday
          ? 'Today'
          : isTomorrow
          ? 'Tomorrow'
          : endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dueTime: endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        status: isToday ? 'due-today' : 'upcoming',
      };
    });

    const formattedActivity = recentActivity.map((contract: any, idx: number) => {
      const clientName = contract.clientId?.name || 'Unknown';
      const unitInfo = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : '';

      let text = '';
      let type = 'booking';

      switch (contract.status) {
        case 'Active':
          text = `New contract created for ${clientName}${unitInfo ? ` — ${unitInfo}` : ''}`;
          type = 'booking';
          break;
        case 'Completed':
          text = `Vehicle returned by ${clientName}${unitInfo ? ` — ${unitInfo}` : ''}`;
          type = 'maintenance';
          break;
        case 'Cancelled':
          text = `Contract cancelled for ${clientName}`;
          type = 'payment';
          break;
        default:
          text = `Contract updated for ${clientName}`;
          type = 'client';
      }

      const createdAt = new Date(contract.createdAt);
      const diffMs = Date.now() - createdAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      let time = '';
      if (diffMins < 60) time = `${diffMins}m ago`;
      else if (diffMins < 1440) time = `${Math.floor(diffMins / 60)}h ago`;
      else time = `${Math.floor(diffMins / 1440)}d ago`;

      return { id: idx + 1, text, time, type };
    });

    const vehicleAvailabilityData = [
      { name: 'Available', value: availableUnits, color: '#22C55E' },
      { name: 'Rented', value: rentedUnits, color: '#3B82F6' },
      { name: 'Reserved', value: 0, color: '#F59E0B' },
      { name: 'Maintenance', value: maintenanceUnits, color: '#E53935' },
    ];

    return {
      stats: {
        totalRevenue: `$${revenueThisMonth.toLocaleString()}`,
        activeRentals: String(activeContracts),
        totalCustomers: String(totalClients),
        totalDrivers: String(totalDrivers),
        totalVehicles: String(totalUnits),
        availableVehicles: String(availableUnits),
        rentedVehicles: String(rentedUnits),
        vehiclesInMaintenance: String(maintenanceUnits),
        completedRentals: String(completedContracts),
        overdueRentals: String(overdueContracts),
        totalRentals: String(totalContracts),
        damagesReported: String(damagesCount),
        depositsPending: '$0',
        changes,
      },
      rentalsPerMonthData,
      revenueData,
      vehicleAvailabilityData,
      mostRentedCarsData,
      recentActivity: formattedActivity,
      upcomingReturns,
    };
  }
}
