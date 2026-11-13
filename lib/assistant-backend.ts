import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";
import { Driver } from "@/models/Driver";
import { Damage } from "@/models/Damage";
import { Inspection } from "@/models/Inspection";
import { Transaction } from "@/models/Transaction";
import { Notification } from "@/models/Notification";
import { Log } from "@/models/Log";
import { Report } from "@/models/Report";
import { User } from "@/models/User";

export const LEON_BACKEND_KNOWLEDGE = `
LEON RENT A CAR BACKEND & BUSINESS RULES:
- Pages: "/" Dashboard; "/bookings" Contracts; "/bookings/new" Contract Wizard (Types: Shop, Delivery, Personalized); "/bookings/[id]" Details, PDF (/api/contracts/[id]/pdf), Consent PDF, WhatsApp/Email; "/bookings/handover" & "/bookings/return" Checklists & Return Settlement; "/units" & "/units/[id]" Fleet, mileage, vidange/oil, insurance/reg expiry; "/clients" & "/clients/[id]" B2C/B2B, docs, Blacklist; "/drivers" & "/driver/*"; "/calendar"; "/inspections"; "/damages"; "/messages" WhatsApp; "/notifications"; "/reports"; "/logs"; "/tracking"; "/settings".
- Vehicle Status Sync: Auto-"Rented" when contract deliveryStatus="Delivered", status not Completed/Cancelled, startDate <= today end < endDate; "Maintenance"/"Out of Service" protected from override; returns to "Available" on return/completion.
- Net Revenue: sum(max(0, totalAmount - damageCharge)) for non-Personalized Active/Completed contracts. Pending Balance: max(0, totalAmount - advancePayment) when paymentStatus!="Paid".
- Alerts & Return Fees: Oil change due when (mileage - lastOilChangeMileage) >= oilChangeInterval (default 10k, warn >=85%). Overdue = Active & endDate < now. Return fees: extraKmCharge ((drivenKm - totalDays*dailyKmLimit)*pricePerExtraKm), salikFees, parkingFees, finesFees, fuelFees, cleaningFees, damageCharge. OCR: /api/ocr/scan-document & /api/ocr/scan-vehicle-card.
`.trim();

export interface BackendQuerySpec {
  queryType:
    | "client_profile"
    | "vehicle_profile"
    | "contracts_query"
    | "transactions_query"
    | "damages_query"
    | "inspections_query"
    | "logs_query"
    | "drivers_query"
    | "expiries_check"
    | "revenue_summary";
  search?: string | null;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number | null;
}

export interface RichBackendContext {
  timestamp: number;
  allClients: any[];
  allUnits: any[];
  recentContracts: any[];
  totalUnits: number;
  availableUnits: number;
  rentedUnits: number;
  maintenanceUnits: number;
  activeContractsCount: number;
  totalClientsCount: number;
  totalDriversCount: number;
  kpis: {
    totalContracts: number;
    draftContracts: number;
    completedContracts: number;
    cancelledContracts: number;
    overdueContracts: number;
    unpaidContracts: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueAllTime: number;
    pendingBalanceTotal: number;
    pendingDamagesCount: number;
    pendingDamagesCost: number;
    unreadNotificationsCount: number;
    transactionIncome: number;
    transactionExpense: number;
  };
  executivePromptContext: string;
}

const CACHE_TTL_MS = 3_000;
let cachedContext: RichBackendContext | null = null;

export function invalidateBackendContextCache() {
  cachedContext = null;
}

function fmtDate(d: any): string {
  if (!d) return "N/A";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "N/A" : dt.toISOString().split("T")[0];
}

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDateBound(s?: string | null, endOfDay = false): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

async function safeSecondary<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  // Secondary unmocked collections must only run when a real Mongoose connection is open
  if (mongoose.connection.readyState !== 1) return fallback;
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function getRichBackendContext(forceRefresh = false): Promise<RichBackendContext> {
  const nowTs = Date.now();
  if (!forceRefresh && cachedContext && nowTs - cachedContext.timestamp < CACHE_TTL_MS) {
    return cachedContext;
  }

  await connectDB();
  void User;

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);
  const in2Days = new Date(now.getTime() + 2 * 86400000);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const dbReady = mongoose.connection.readyState === 1;

  const netRevenueExpr = {
    $sum: {
      $max: [
        0,
        { $subtract: [{ $ifNull: ["$totalAmount", 0] }, { $ifNull: ["$damageCharge", 0] }] },
      ],
    },
  };

  const [
    allClients,
    allUnits,
    recentContracts,
    totalUnits,
    availableUnits,
    rentedUnits,
    activeContractsCount,
    contractStatsAgg,
    overdueContractsList,
    dueSoonContractsList,
    allDrivers,
    recentDamages,
    recentInspections,
    txAgg,
    recentTransactions,
    unreadNotifs,
    unreadNotifCount,
    recentLogs,
    recentReports,
    totalClientsDbCount,
  ] = await Promise.all([
    Client.find()
      .select(
        "name companyName trn customerType clientType phone email nationality status idExpiry licenseExpiry passportExpiry visaExpiry"
      )
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean(),
    Unit.find()
      .select(
        "make model plate year color status dailyRate dailyKmLimit pricePerExtraKm mileage initialMileage oilChangeInterval lastOilChangeMileage lastOilChangeDate insuranceExpiry registrationExpiry fuelType transmission capacity owner"
      )
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean(),
    Contract.find()
      .select(
        "contractNumber status deliveryStatus contractType rentalType clientId unitId driverId personalizedPersonName startDate endDate totalDays dailyRate totalAmount advancePayment depositAmount paymentStatus paymentMethod pickupLocation dropoffLocation checkoutTime checkinTime damageCharge createdAt"
      )
      .sort({ createdAt: -1 })
      .populate({ path: "clientId", select: "name phone", strictPopulate: false })
      .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
      .populate({ path: "driverId", select: "name", strictPopulate: false })
      .limit(25)
      .lean(),
    Unit.countDocuments(),
    Unit.countDocuments({ status: "Available" }),
    Unit.countDocuments({ status: "Rented" }),
    Contract.countDocuments({ status: "Active" }),
    dbReady && typeof Contract.aggregate === "function"
      ? Contract.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
              overdue: [{ $match: { status: "Active", endDate: { $lt: now } } }, { $count: "count" }],
              unpaid: [
                {
                  $match: {
                    status: { $in: ["Active", "Completed"] },
                    paymentStatus: { $in: ["Pending", "Partial"] },
                  },
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 },
                    balance: {
                      $sum: {
                        $max: [
                          0,
                          { $subtract: [{ $ifNull: ["$totalAmount", 0] }, { $ifNull: ["$advancePayment", 0] }] },
                        ],
                      },
                    },
                  },
                },
              ],
              revenueThisMonth: [
                {
                  $match: {
                    contractType: { $ne: "Personalized" },
                    personalizedPersonName: { $in: [null, ""] },
                    $or: [
                      { status: "Completed", updatedAt: { $gte: startOfThisMonth } },
                      { status: "Active", startDate: { $gte: startOfThisMonth } },
                    ],
                  },
                },
                { $group: { _id: null, total: netRevenueExpr } },
              ],
              revenueLastMonth: [
                {
                  $match: {
                    contractType: { $ne: "Personalized" },
                    personalizedPersonName: { $in: [null, ""] },
                    $or: [
                      { status: "Completed", updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                      { status: "Active", startDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                    ],
                  },
                },
                { $group: { _id: null, total: netRevenueExpr } },
              ],
              revenueAllTime: [
                {
                  $match: {
                    contractType: { $ne: "Personalized" },
                    personalizedPersonName: { $in: [null, ""] },
                    status: { $in: ["Active", "Completed"] },
                  },
                },
                { $group: { _id: null, total: netRevenueExpr } },
              ],
            },
          },
        ]).catch(() => [])
      : Promise.resolve([]),
    safeSecondary(
      () =>
        Contract.find({ status: "Active", endDate: { $lt: now } })
          .select("contractNumber endDate totalAmount advancePayment paymentStatus clientId unitId")
          .populate({ path: "clientId", select: "name phone", strictPopulate: false })
          .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
          .sort({ endDate: 1 })
          .limit(12)
          .lean(),
      []
    ),
    safeSecondary(
      () =>
        Contract.find({ status: "Active", endDate: { $gte: now, $lte: in2Days } })
          .select("contractNumber endDate checkinTime clientId unitId")
          .populate({ path: "clientId", select: "name phone", strictPopulate: false })
          .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
          .sort({ endDate: 1 })
          .limit(10)
          .lean(),
      []
    ),
    safeSecondary(() => Driver.find().select("name phone email driverId license licenseExpiry status").limit(40).lean(), []),
    safeSecondary(
      () =>
        Damage.find()
          .select("damageId unitId contractId description cost status reportedDate reportedByName")
          .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
          .sort({ reportedDate: -1 })
          .limit(15)
          .lean(),
      []
    ),
    safeSecondary(
      () =>
        Inspection.find()
          .select("inspectionId type unitId date mileage fuelLevel damages status")
          .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
          .sort({ date: -1 })
          .limit(8)
          .lean(),
      []
    ),
    safeSecondary(
      () =>
        Transaction.aggregate([
          { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
      []
    ),
    safeSecondary(
      () =>
        Transaction.find()
          .select("transactionId type title category amount status date clientName carModel")
          .sort({ date: -1 })
          .limit(8)
          .lean(),
      []
    ),
    safeSecondary(
      () => Notification.find({ read: false }).select("title message type createdAt").sort({ createdAt: -1 }).limit(8).lean(),
      []
    ),
    safeSecondary(() => Notification.countDocuments({ read: false }), 0),
    safeSecondary(
      () => Log.find().select("user role action description type createdAt").sort({ createdAt: -1 }).limit(10).lean(),
      []
    ),
    safeSecondary(() => Report.find().select("name type dateGenerated status").sort({ dateGenerated: -1 }).limit(5).lean(), []),
    safeSecondary(() => Client.countDocuments(), 0),
  ]);

  const maintenanceUnits = (allUnits as any[]).filter(
    (u) => u.status === "Maintenance" || u.status === "Out of Service"
  ).length;

  const hasFacet = Array.isArray(contractStatsAgg) && contractStatsAgg.length > 0;
  const facet = (contractStatsAgg as any[])?.[0] || {};
  const statusMap = new Map<string, number>((facet.byStatus || []).map((s: any) => [s._id, s.count || 0]));
  const totalClientsCount = totalClientsDbCount || (allClients as any[]).length;

  const fallbackContracts = hasFacet ? [] : (recentContracts as any[]);
  const isNonPersonalized = (c: any) => c.contractType !== "Personalized" && !c.personalizedPersonName;
  const netContractRev = (c: any) => Math.max(0, (Number(c.totalAmount) || 0) - (Number(c.damageCharge) || 0));
  const fallbackOverdueList = fallbackContracts.filter((c) => c.status === "Active" && c.endDate && new Date(c.endDate) < now);
  const fallbackUnpaidList = fallbackContracts.filter(
    (c) => (c.status === "Active" || c.status === "Completed") && (c.paymentStatus === "Pending" || c.paymentStatus === "Partial")
  );
  const fallbackRevThisMonth = fallbackContracts
    .filter(
      (c) =>
        isNonPersonalized(c) &&
        ((c.status === "Completed" && new Date(c.updatedAt || c.endDate || 0) >= startOfThisMonth) ||
          (c.status === "Active" && new Date(c.startDate || 0) >= startOfThisMonth))
    )
    .reduce((acc, c) => acc + netContractRev(c), 0);
  const fallbackRevLastMonth = fallbackContracts
    .filter((c) => {
      if (!isNonPersonalized(c)) return false;
      const compDt = new Date(c.updatedAt || c.endDate || 0);
      const actDt = new Date(c.startDate || 0);
      return (
        (c.status === "Completed" && compDt >= startOfLastMonth && compDt <= endOfLastMonth) ||
        (c.status === "Active" && actDt >= startOfLastMonth && actDt <= endOfLastMonth)
      );
    })
    .reduce((acc, c) => acc + netContractRev(c), 0);
  const fallbackRevAllTime = fallbackContracts
    .filter((c) => isNonPersonalized(c) && (c.status === "Active" || c.status === "Completed"))
    .reduce((acc, c) => acc + netContractRev(c), 0);

  const effectiveOverdueList =
    (overdueContractsList as any[]).length > 0 ? (overdueContractsList as any[]) : fallbackOverdueList;

  const txMap = new Map<string, number>((txAgg as any[]).map((t: any) => [t._id, t.total || 0]));
  const pendingDamages = (recentDamages as any[]).filter((d) => d.status === "Pending");
  const pendingDamagesCost = pendingDamages.reduce((acc, d) => acc + (Number(d.cost) || 0), 0);

  const kpis = {
    totalContracts: hasFacet ? facet.total?.[0]?.count ?? 0 : fallbackContracts.length,
    draftContracts: hasFacet ? statusMap.get("Draft") || 0 : fallbackContracts.filter((c) => c.status === "Draft").length,
    completedContracts: hasFacet
      ? statusMap.get("Completed") || 0
      : fallbackContracts.filter((c) => c.status === "Completed").length,
    cancelledContracts: hasFacet
      ? statusMap.get("Cancelled") || 0
      : fallbackContracts.filter((c) => c.status === "Cancelled").length,
    overdueContracts: hasFacet ? facet.overdue?.[0]?.count ?? 0 : fallbackOverdueList.length,
    unpaidContracts: hasFacet ? facet.unpaid?.[0]?.count || 0 : fallbackUnpaidList.length,
    revenueThisMonth: hasFacet ? facet.revenueThisMonth?.[0]?.total || 0 : fallbackRevThisMonth,
    revenueLastMonth: hasFacet ? facet.revenueLastMonth?.[0]?.total || 0 : fallbackRevLastMonth,
    revenueAllTime: hasFacet ? facet.revenueAllTime?.[0]?.total || 0 : fallbackRevAllTime,
    pendingBalanceTotal: hasFacet
      ? facet.unpaid?.[0]?.balance || 0
      : fallbackUnpaidList.reduce((acc, c) => acc + Math.max(0, (Number(c.totalAmount) || 0) - (Number(c.advancePayment) || 0)), 0),
    pendingDamagesCount: pendingDamages.length,
    pendingDamagesCost,
    unreadNotificationsCount: unreadNotifCount || 0,
    transactionIncome: txMap.get("income") || 0,
    transactionExpense: txMap.get("expense") || 0,
  };

  // Compute live maintenance & document expiry alerts from all units, clients, and drivers
  const computedAlerts: string[] = [];
  for (const u of allUnits as any[]) {
    const interval = Number(u.oilChangeInterval) || 10000;
    const lastOil = Number(u.lastOilChangeMileage) || 0;
    const mileage = Number(u.mileage) || 0;
    const sinceOil = mileage - lastOil;
    if (mileage > 0 && interval > 0 && sinceOil >= interval * 0.85) {
      const remaining = interval - sinceOil;
      computedAlerts.push(
        `Oil Change ${remaining <= 0 ? "OVERDUE" : "Due Soon"}: ${u.make} ${u.model} (${u.plate}) — ${mileage} km (${remaining <= 0 ? `${Math.abs(remaining)} km overdue` : `${remaining} km left`})`
      );
    }
    if (u.insuranceExpiry && new Date(u.insuranceExpiry) <= in30Days) {
      computedAlerts.push(`Insurance expiring/expired: ${u.make} ${u.model} (${u.plate}) on ${fmtDate(u.insuranceExpiry)}`);
    }
    if (u.registrationExpiry && new Date(u.registrationExpiry) <= in30Days) {
      computedAlerts.push(`Registration expiring/expired: ${u.make} ${u.model} (${u.plate}) on ${fmtDate(u.registrationExpiry)}`);
    }
  }
  for (const d of allDrivers as any[]) {
    if (d.licenseExpiry && new Date(d.licenseExpiry) <= in30Days) {
      computedAlerts.push(`Driver license expiring/expired: ${d.name} on ${d.licenseExpiry}`);
    }
  }
  for (const c of (allClients as any[]).slice(0, 120)) {
    const expFields = [
      ["Emirates ID", c.idExpiry],
      ["License", c.licenseExpiry],
      ["Passport", c.passportExpiry],
      ["Visa", c.visaExpiry],
    ];
    for (const [label, dt] of expFields) {
      if (dt && new Date(dt) <= in30Days) {
        computedAlerts.push(`Client ${c.name} ${label} expiring/expired: ${fmtDate(dt)}`);
      }
    }
  }

  // Format vehicles compactly to stay within provider TPM budgets (full details via QUERY_BACKEND)
  const sortedUnits = [...(allUnits as any[])].sort((a, b) => {
    const order: Record<string, number> = { Available: 0, Rented: 1, Maintenance: 2, "Out of Service": 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });
  const unitsSummary = sortedUnits
    .slice(0, 50)
    .map((u) => {
      const kmInfo = u.mileage ? `|KM:${u.mileage}` : "";
      return `- ${u.make} ${u.model}(${u.year || "?"},${u.color || "?"})|${u.plate}|${u.status}|AED ${u.dailyRate || 0}/d${kmInfo}`;
    })
    .join("\n");

  const clientsSummary = (allClients as any[])
    .slice(0, 20)
    .map((c) => `- ${c.name}|${c.phone || "N/A"}|${c.customerType || "B2C"}|${c.status || "Active"}`)
    .join("\n");

  const contractsSummary = (recentContracts as any[])
    .slice(0, 10)
    .map((c) => {
      const clName = (c.clientId as any)?.name || c.personalizedPersonName || "N/A";
      const carLabel = c.unitId ? `${(c.unitId as any).make} ${(c.unitId as any).model}(${(c.unitId as any).plate})` : "N/A";
      return `- #${c.contractNumber || String(c._id).slice(-6)}|${c.status}/${c.deliveryStatus || "Pending"}|${clName}|${carLabel}|${fmtDate(c.startDate)}..${fmtDate(c.endDate)}|AED ${c.totalAmount || 0}(${c.paymentStatus || "Pending"})`;
    })
    .join("\n");

  const overdueSummary = effectiveOverdueList
    .map(
      (c) =>
        `- OVERDUE #${c.contractNumber || String(c._id).slice(-6)}: ${(c.clientId as any)?.name || "Client"} (${(c.clientId as any)?.phone || "N/A"}) | ${(c.unitId as any)?.make || ""} ${(c.unitId as any)?.model || ""} (${(c.unitId as any)?.plate || ""}) | Was due ${fmtDate(c.endDate)} | Total AED ${c.totalAmount || 0}`
    )
    .join("\n");

  const dueSoonSummary = (dueSoonContractsList as any[])
    .map(
      (c) =>
        `- DUE SOON #${c.contractNumber || String(c._id).slice(-6)}: ${(c.clientId as any)?.name || "Client"} | ${(c.unitId as any)?.make || ""} ${(c.unitId as any)?.model || ""} (${(c.unitId as any)?.plate || ""}) | Due ${fmtDate(c.endDate)} ${c.checkinTime || ""}`
    )
    .join("\n");

  const driversSummary = (allDrivers as any[])
    .map((d) => `- ${d.name} (ID: ${d.driverId}) | Phone: ${d.phone} | Status: ${d.status} | LicExp: ${d.licenseExpiry}`)
    .join("\n");

  const damagesSummary = (recentDamages as any[])
    .slice(0, 10)
    .map(
      (d) =>
        `- [${d.status}] ${d.unitId ? `${(d.unitId as any).make} ${(d.unitId as any).model} (${(d.unitId as any).plate})` : "Car"}: ${d.description} | Cost: AED ${d.cost || 0} | ${fmtDate(d.reportedDate)}`
    )
    .join("\n");

  const inspectionsSummary = (recentInspections as any[])
    .slice(0, 6)
    .map(
      (i) =>
        `- [${i.type}] ${i.unitId ? `${(i.unitId as any).make} ${(i.unitId as any).model} (${(i.unitId as any).plate})` : "Car"} | KM: ${i.mileage} | Fuel: ${i.fuelLevel}% | ${fmtDate(i.date)}${i.damages ? ` | Notes: ${i.damages}` : ""}`
    )
    .join("\n");

  const transactionsSummary = (recentTransactions as any[])
    .slice(0, 8)
    .map(
      (t) =>
        `- [${t.type.toUpperCase()} / ${t.status}] ${t.title} (${t.category}) | AED ${t.amount} | ${fmtDate(t.date)}${t.clientName ? ` | ${t.clientName}` : ""}`
    )
    .join("\n");

  const notificationsSummary = (unreadNotifs as any[])
    .slice(0, 6)
    .map((n) => `- [${n.type}] ${n.title}: ${n.message}`)
    .join("\n");

  const logsSummary = (recentLogs as any[])
    .slice(0, 8)
    .map((l) => `- [${fmtDate(l.createdAt)}] ${l.user} (${l.role}): ${l.action} — ${l.description}`)
    .join("\n");

  const reportsSummary = (recentReports as any[])
    .map((r) => `- ${r.name} (${r.type}) [${r.status}] on ${fmtDate(r.dateGenerated)}`)
    .join("\n");

  const optionalSections = [
    overdueSummary && `OVERDUE:\n${overdueSummary}`,
    dueSoonSummary && `DUE SOON:\n${dueSoonSummary}`,
    driversSummary && `DRIVERS:\n${driversSummary.split("\n").slice(0, 8).join("\n")}`,
    damagesSummary && `DAMAGES:\n${damagesSummary.split("\n").slice(0, 5).join("\n")}`,
    inspectionsSummary && `INSPECTIONS:\n${inspectionsSummary.split("\n").slice(0, 4).join("\n")}`,
    transactionsSummary && `TRANSACTIONS:\n${transactionsSummary.split("\n").slice(0, 5).join("\n")}`,
    computedAlerts.length > 0 && `ALERTS (${computedAlerts.length}):\n${computedAlerts.slice(0, 12).join("\n")}`,
    notificationsSummary && `NOTIFICATIONS (${kpis.unreadNotificationsCount}):\n${notificationsSummary.split("\n").slice(0, 4).join("\n")}`,
    logsSummary && `LOGS:\n${logsSummary.split("\n").slice(0, 5).join("\n")}`,
    reportsSummary && `REPORTS:\n${reportsSummary.split("\n").slice(0, 4).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const executivePromptContext = `
LIVE METRICS (${now.toISOString().split("T")[0]}):
- Fleet: ${totalUnits} total (${availableUnits} Avail, ${rentedUnits} Rented, ${maintenanceUnits} Maint) | Clients: ${totalClientsCount} | Drivers: ${(allDrivers as any[]).length}
- Contracts: ${kpis.totalContracts} total (${activeContractsCount} Active, ${kpis.draftContracts} Draft, ${kpis.completedContracts} Done, ${kpis.cancelledContracts} Cancel, ${kpis.overdueContracts} OVERDUE, ${kpis.unpaidContracts} Unpaid AED ${kpis.pendingBalanceTotal.toLocaleString("en-US")})
- Net Revenue: Month AED ${kpis.revenueThisMonth.toLocaleString("en-US")} | LastMo AED ${kpis.revenueLastMonth.toLocaleString("en-US")} | AllTime AED ${kpis.revenueAllTime.toLocaleString("en-US")} | Tx In AED ${kpis.transactionIncome.toLocaleString("en-US")} / Out AED ${kpis.transactionExpense.toLocaleString("en-US")}
- Pending Damages: ${kpis.pendingDamagesCount} (AED ${kpis.pendingDamagesCost.toLocaleString("en-US")}) | Unread Alerts: ${kpis.unreadNotificationsCount}

FLEET (${Math.min(50, sortedUnits.length)}/${totalUnits}):
${unitsSummary || "None"}

RECENT CLIENTS (${Math.min(20, (allClients as any[]).length)}/${totalClientsCount}):
${clientsSummary || "None"}

RECENT CONTRACTS (Latest ${Math.min(10, (recentContracts as any[]).length)}/${kpis.totalContracts}):
${contractsSummary || "None"}
${optionalSections ? "\n" + optionalSections : ""}
`.trim();

  cachedContext = {
    timestamp: nowTs,
    allClients,
    allUnits,
    recentContracts,
    totalUnits,
    availableUnits,
    rentedUnits,
    maintenanceUnits,
    activeContractsCount,
    totalClientsCount,
    totalDriversCount: (allDrivers as any[]).length,
    kpis,
    executivePromptContext,
  };

  return cachedContext;
}

export async function executeBackendQuery(spec: BackendQuerySpec) {
  await connectDB();
  void User;

  const limit = Math.min(Math.max(Number(spec.limit) || 20, 1), 40);
  const search = (spec.search || "").trim();
  const rx = search ? new RegExp(escapeRx(search), "i") : null;
  const fromDate = parseDateBound(spec.dateFrom, false);
  const toDate = parseDateBound(spec.dateTo, true);
  const dbReady = mongoose.connection.readyState === 1;

  switch (spec.queryType) {
    case "client_profile": {
      if (!rx) return { summary: "No client search term provided.", records: [] };
      const clients = await Client.find({
        $or: [
          { name: rx },
          { phone: rx },
          { companyName: rx },
          { email: rx },
          { idNumber: rx },
          { licenseNumber: rx },
        ],
      })
        .select("-documents")
        .limit(5)
        .lean();

      if (clients.length === 0) {
        return { summary: `No client found matching "${search}".`, records: [] };
      }

      const clientIds = clients.map((c: any) => c._id);
      const contracts = await Contract.find({ clientId: { $in: clientIds } })
        .select(
          "contractNumber status deliveryStatus contractType startDate endDate totalDays totalAmount advancePayment depositAmount paymentStatus damageCharge unitId"
        )
        .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
        .sort({ createdAt: -1 })
        .limit(25)
        .lean();

      const totalSpent = contracts
        .filter((c: any) => c.status === "Active" || c.status === "Completed")
        .reduce((acc: number, c: any) => acc + Math.max(0, (c.totalAmount || 0) - (c.damageCharge || 0)), 0);

      return {
        clients: clients.map((c: any) => ({
          id: c._id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          customerType: c.customerType,
          companyName: c.companyName,
          clientType: c.clientType,
          nationality: c.nationality,
          status: c.status,
          idNumber: c.idNumber,
          idExpiry: fmtDate(c.idExpiry),
          licenseNumber: c.licenseNumber,
          licenseExpiry: fmtDate(c.licenseExpiry),
          passportNumber: c.passportNumber,
          passportExpiry: fmtDate(c.passportExpiry),
          visaExpiry: fmtDate(c.visaExpiry),
        })),
        contractsCount: contracts.length,
        totalSpent,
        contracts: contracts.map((c: any) => ({
          id: c._id,
          contractNumber: c.contractNumber,
          status: c.status,
          deliveryStatus: c.deliveryStatus,
          car: c.unitId ? `${(c.unitId as any).make} ${(c.unitId as any).model} (${(c.unitId as any).plate})` : "N/A",
          startDate: fmtDate(c.startDate),
          endDate: fmtDate(c.endDate),
          totalAmount: c.totalAmount,
          advancePayment: c.advancePayment || 0,
          paymentStatus: c.paymentStatus,
        })),
        attachType: "clients" as const,
        attachItems: clients.map((c: any) => ({ id: c._id, name: c.name, phone: c.phone || "N/A" })),
      };
    }

    case "vehicle_profile": {
      if (!rx) return { summary: "No vehicle search term provided.", records: [] };
      const tokens = search.split(/\s+/).filter(Boolean);
      const units = await Unit.find({
        $or: [
          { plate: rx },
          { vin: rx },
          { model: rx },
          { make: rx },
          ...(tokens.length >= 2
            ? [
                {
                  $and: tokens.map((t) => ({
                    $or: [
                      { make: new RegExp(escapeRx(t), "i") },
                      { model: new RegExp(escapeRx(t), "i") },
                      { plate: new RegExp(escapeRx(t), "i") },
                      { color: new RegExp(escapeRx(t), "i") },
                    ],
                  })),
                },
              ]
            : []),
        ],
      })
        .select("-documents -images")
        .limit(5)
        .lean();

      if (units.length === 0) {
        return { summary: `No vehicle found matching "${search}".`, records: [] };
      }

      const unitIds = units.map((u: any) => u._id);
      const [contracts, damages, inspections] = await Promise.all([
        Contract.find({ unitId: { $in: unitIds } })
          .select("contractNumber status deliveryStatus startDate endDate totalDays totalAmount paymentStatus clientId unitId personalizedPersonName")
          .populate({ path: "clientId", select: "name phone", strictPopulate: false })
          .sort({ startDate: -1 })
          .limit(20)
          .lean(),
        safeSecondary(
          () =>
            Damage.find({ unitId: { $in: unitIds } })
              .select("damageId description cost status reportedDate")
              .sort({ reportedDate: -1 })
              .limit(15)
              .lean(),
          []
        ),
        safeSecondary(
          () =>
            Inspection.find({ unitId: { $in: unitIds } })
              .select("inspectionId type date mileage fuelLevel damages status")
              .sort({ date: -1 })
              .limit(10)
              .lean(),
          []
        ),
      ]);

      return {
        vehicles: units.map((u: any) => ({
          id: u._id,
          title: `${u.make} ${u.model}`,
          year: u.year,
          plate: u.plate,
          color: u.color,
          status: u.status,
          dailyRate: u.dailyRate,
          dailyKmLimit: u.dailyKmLimit,
          pricePerExtraKm: u.pricePerExtraKm,
          mileage: u.mileage,
          oilChangeInterval: u.oilChangeInterval,
          lastOilChangeMileage: u.lastOilChangeMileage,
          lastOilChangeDate: fmtDate(u.lastOilChangeDate),
          vidangeHistory: (u.vidangeHistory || []).slice(-5),
          insuranceExpiry: fmtDate(u.insuranceExpiry),
          registrationExpiry: fmtDate(u.registrationExpiry),
          fuelType: u.fuelType,
          transmission: u.transmission,
          capacity: u.capacity,
          owner: u.owner,
        })),
        contracts: contracts.map((c: any) => ({
          id: c._id,
          contractNumber: c.contractNumber,
          status: c.status,
          client: (c.clientId as any)?.name || c.personalizedPersonName || "N/A",
          startDate: fmtDate(c.startDate),
          endDate: fmtDate(c.endDate),
          totalAmount: c.totalAmount,
          paymentStatus: c.paymentStatus,
        })),
        damages,
        inspections,
        attachType: "vehicles" as const,
        attachItems: units.map((u: any) => ({
          id: u._id,
          title: `${u.make} ${u.model}`,
          plate: u.plate,
          status: u.status,
        })),
      };
    }

    case "contracts_query": {
      const filter: any = {};
      if (spec.status) {
        if (/overdue/i.test(spec.status)) {
          filter.status = "Active";
          filter.endDate = { $lt: new Date() };
        } else if (/unpaid|pending payment/i.test(spec.status)) {
          filter.paymentStatus = { $in: ["Pending", "Partial"] };
          filter.status = { $in: ["Active", "Completed"] };
        } else {
          filter.status = new RegExp(`^${escapeRx(spec.status)}$`, "i");
        }
      }
      if (fromDate || toDate) {
        filter.startDate = {};
        if (fromDate) filter.startDate.$gte = fromDate;
        if (toDate) filter.startDate.$lte = toDate;
      }
      if (rx && /^\d+$/.test(search)) {
        filter.contractNumber = Number(search);
      }

      const contracts = await Contract.find(filter)
        .select(
          "contractNumber status deliveryStatus contractType startDate endDate totalDays totalAmount advancePayment depositAmount paymentStatus clientId unitId personalizedPersonName"
        )
        .populate({ path: "clientId", select: "name phone", strictPopulate: false })
        .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const totalVal = contracts.reduce((acc: number, c: any) => acc + (Number(c.totalAmount) || 0), 0);
      return {
        count: contracts.length,
        totalAmountSum: totalVal,
        contracts: contracts.map((c: any) => ({
          id: c._id,
          contractNumber: c.contractNumber,
          status: c.status,
          deliveryStatus: c.deliveryStatus,
          customer: (c.clientId as any)?.name || c.personalizedPersonName || "N/A",
          vehicle: c.unitId ? `${(c.unitId as any).make} ${(c.unitId as any).model} (${(c.unitId as any).plate})` : "N/A",
          startDate: fmtDate(c.startDate),
          endDate: fmtDate(c.endDate),
          totalAmount: c.totalAmount,
          advancePayment: c.advancePayment || 0,
          paymentStatus: c.paymentStatus,
        })),
        attachType: "contracts" as const,
        attachItems: contracts.slice(0, 5).map((c: any) => ({
          id: c._id,
          contractNumber: c.contractNumber || String(c._id).slice(-6),
          customer: (c.clientId as any)?.name || c.personalizedPersonName || "Client",
          vehicle: c.unitId ? `${(c.unitId as any).make} ${(c.unitId as any).model}` : "Vehicle",
        })),
      };
    }

    case "revenue_summary": {
      if (!dbReady) {
        return { message: "Database summary unavailable offline." };
      }
      const match: any = {
        contractType: { $ne: "Personalized" },
        personalizedPersonName: { $in: [null, ""] },
        status: { $in: ["Active", "Completed"] },
      };
      if (fromDate || toDate) {
        match.startDate = {};
        if (fromDate) match.startDate.$gte = fromDate;
        if (toDate) match.startDate.$lte = toDate;
      }

      const [contractRev, txRev] = await Promise.all([
        Contract.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$paymentMethod",
              revenue: {
                $sum: {
                  $max: [0, { $subtract: [{ $ifNull: ["$totalAmount", 0] }, { $ifNull: ["$damageCharge", 0] }] }],
                },
              },
              count: { $sum: 1 },
              collectedAdvance: { $sum: { $ifNull: ["$advancePayment", 0] } },
            },
          },
        ]),
        Transaction.aggregate([
          ...(fromDate || toDate
            ? [{ $match: { date: { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) } } }]
            : []),
          { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
      ]);

      return { contractRevenueByPaymentMethod: contractRev, ledgerTransactions: txRev };
    }

    case "transactions_query": {
      const filter: any = {};
      if (spec.status) filter.status = spec.status.toLowerCase();
      if (rx) filter.$or = [{ title: rx }, { category: rx }, { clientName: rx }, { carModel: rx }];
      if (fromDate || toDate) {
        filter.date = {};
        if (fromDate) filter.date.$gte = fromDate;
        if (toDate) filter.date.$lte = toDate;
      }
      const rows = await safeSecondary(
        () => Transaction.find(filter).sort({ date: -1 }).limit(limit).lean(),
        []
      );
      return { count: rows.length, transactions: rows };
    }

    case "damages_query": {
      const filter: any = {};
      if (spec.status) filter.status = new RegExp(`^${escapeRx(spec.status)}$`, "i");
      if (rx) filter.description = rx;
      const rows = await safeSecondary(
        () =>
          Damage.find(filter)
            .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
            .populate({ path: "contractId", select: "contractNumber", strictPopulate: false })
            .sort({ reportedDate: -1 })
            .limit(limit)
            .lean(),
        []
      );
      return {
        count: rows.length,
        totalCost: rows.reduce((s: number, r: any) => s + (Number(r.cost) || 0), 0),
        damages: rows,
      };
    }

    case "inspections_query": {
      const filter: any = {};
      if (rx) filter.damages = rx;
      const rows = await safeSecondary(
        () =>
          Inspection.find(filter)
            .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
            .populate({ path: "contractId", select: "contractNumber", strictPopulate: false })
            .sort({ date: -1 })
            .limit(limit)
            .lean(),
        []
      );
      return { count: rows.length, inspections: rows };
    }

    case "logs_query": {
      const filter: any = {};
      if (rx) filter.$or = [{ user: rx }, { action: rx }, { description: rx }];
      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = fromDate;
        if (toDate) filter.createdAt.$lte = toDate;
      }
      const rows = await safeSecondary(() => Log.find(filter).sort({ createdAt: -1 }).limit(limit).lean(), []);
      return { count: rows.length, logs: rows };
    }

    case "drivers_query": {
      const drivers = await safeSecondary(() => Driver.find().limit(40).lean(), []);
      const driverStats = await Contract.aggregate([
        { $match: { status: { $in: ["Active", "Completed"] }, driverId: { $ne: null } } },
        { $group: { _id: "$driverId", trips: { $sum: 1 } } },
      ]).catch(() => []);
      return { drivers, driverTripCounts: driverStats };
    }

    case "expiries_check": {
      const threshold = new Date(Date.now() + 45 * 86400000);
      const [units, clients, drivers] = await Promise.all([
        Unit.find()
          .select("make model plate mileage oilChangeInterval lastOilChangeMileage insuranceExpiry registrationExpiry status")
          .lean(),
        Client.find({
          $or: [
            { idExpiry: { $lte: threshold } },
            { licenseExpiry: { $lte: threshold } },
            { passportExpiry: { $lte: threshold } },
            { visaExpiry: { $lte: threshold } },
          ],
        })
          .select("name phone idExpiry licenseExpiry passportExpiry visaExpiry")
          .limit(30)
          .lean(),
        safeSecondary(() => Driver.find().select("name phone licenseExpiry status").lean(), []),
      ]);

      const vehicleAlerts = (units as any[])
        .map((u) => {
          const interval = Number(u.oilChangeInterval) || 10000;
          const sinceOil = (Number(u.mileage) || 0) - (Number(u.lastOilChangeMileage) || 0);
          const oilDueSoon = u.mileage > 0 && sinceOil >= interval * 0.85;
          const insSoon = u.insuranceExpiry && new Date(u.insuranceExpiry) <= threshold;
          const regSoon = u.registrationExpiry && new Date(u.registrationExpiry) <= threshold;
          if (!oilDueSoon && !insSoon && !regSoon) return null;
          return {
            vehicle: `${u.make} ${u.model} (${u.plate})`,
            mileage: u.mileage,
            kmRemainingForOil: oilDueSoon ? interval - sinceOil : null,
            insuranceExpiry: insSoon ? fmtDate(u.insuranceExpiry) : null,
            registrationExpiry: regSoon ? fmtDate(u.registrationExpiry) : null,
          };
        })
        .filter(Boolean);

      return { vehicleAlerts, expiringClients: clients, drivers };
    }

    default:
      return { summary: "Unsupported backend query type." };
  }
}
