// ==================== DASHBOARD DATA ====================
export const dashboardStats = {
  totalRentals: "1,240",
  activeRentals: "45",
  completedRentals: "1,150",
  overdueRentals: "12",
  totalVehicles: "85",
  availableVehicles: "35",
  rentedVehicles: "42",
  vehiclesInMaintenance: "8",
  totalCustomers: "890",
  totalDrivers: "45",
  totalRevenue: "$154,200",
  damagesReported: "15",
  depositsPending: "$4,500",
};

export const rentalsPerMonthData = [
  { month: "Jan", rentals: 120 },
  { month: "Feb", rentals: 150 },
  { month: "Mar", rentals: 180 },
  { month: "Apr", rentals: 250 },
  { month: "May", rentals: 220 },
  { month: "Jun", rentals: 210 },
  { month: "Jul", rentals: 280 },
  { month: "Aug", rentals: 310 },
];

export const revenueData = [
  { month: "Jan", revenue: 10500 },
  { month: "Feb", revenue: 11200 },
  { month: "Mar", revenue: 15300 },
  { month: "Apr", revenue: 18450 },
  { month: "May", revenue: 16200 },
  { month: "Jun", revenue: 14800 },
  { month: "Jul", revenue: 15500 },
  { month: "Aug", revenue: 16800 },
];

export const vehicleAvailabilityData = [
  { name: "Available", value: 35, color: "#22C55E" },
  { name: "Rented", value: 42, color: "#3B82F6" },
  { name: "Reserved", value: 0, color: "#F59E0B" },
  { name: "Maintenance", value: 8, color: "#E53935" },
];

export const mostRentedCarsData = [
  { name: "Toyota Corolla", value: 145 },
  { name: "Honda Civic", value: 120 },
  { name: "Ford Focus", value: 95 },
  { name: "Nissan Altima", value: 80 },
];

export const earningsData = [
  { month: "Jan", income: 10500, expense: 8200 },
  { month: "Feb", income: 11200, expense: 9100 },
  { month: "Mar", income: 15300, expense: 10800 },
  { month: "Apr", income: 18450, expense: 11500 },
  { month: "May", income: 16200, expense: 12800 },
  { month: "Jun", income: 14800, expense: 11200 },
  { month: "Jul", income: 15500, expense: 10500 },
  { month: "Aug", income: 16800, expense: 11800 },
];

export const bookingsOverviewData = [
  { month: "Jan", done: 280, cancelled: 120 },
  { month: "Feb", done: 350, cancelled: 100 },
  { month: "Mar", done: 420, cancelled: 80 },
  { month: "Apr", done: 985, cancelled: 140 },
  { month: "May", done: 520, cancelled: 90 },
  { month: "Jun", done: 480, cancelled: 110 },
  { month: "Jul", done: 550, cancelled: 95 },
  { month: "Aug", done: 620, cancelled: 105 },
  { month: "Sep", done: 580, cancelled: 120 },
  { month: "Oct", done: 510, cancelled: 88 },
  { month: "Nov", done: 470, cancelled: 92 },
  { month: "Dec", done: 540, cancelled: 98 },
];

export const rentStatusData = [
  { name: "Hired", value: 58, color: "#1E293B" },
  { name: "Pending", value: 24, color: "#E53935" },
  { name: "Cancelled", value: 18, color: "#E5E7EB" },
];

export const carTypes = [
  { name: "Sedan", percentage: 30, color: "#1E293B", image: "🚗" },
  { name: "SUV", percentage: 25, color: "#E53935", image: "🚙" },
  { name: "Hatchback", percentage: 20, color: "#1E293B", image: "🚘" },
  { name: "Convertible", percentage: 10, color: "#1E293B", image: "🏎️" },
  { name: "Truck", percentage: 10, color: "#1E293B", image: "🛻" },
  { name: "Minivan", percentage: 5, color: "#1E293B", image: "🚐" },
];

export const reminders = [
  { id: 1, text: "Inspect and service the fleet vehicles.", date: "2028-08-10" },
  { id: 2, text: "Update the car rental pricing plans for the upcoming season.", date: "2028-08-12" },
  { id: 3, text: "Review customer feedback and implement improvements.", date: "2028-08-15" },
];

export const recentActivity = [
  { id: 1, text: "New contract created for Alice Johnson (CTR-1001)", time: "10:15 AM", type: "booking" as const },
  { id: 2, text: "Contract signed by Bob Smith (CTR-1002)", time: "09:45 AM", type: "client" as const },
  { id: 3, text: "Vehicle returned: Honda Civic (HX5678)", time: "09:30 AM", type: "maintenance" as const },
  { id: 4, text: "Damage reported on Toyota Corolla (TX1234)", time: "08:55 AM", type: "payment" as const },
];

export const upcomingReturns = [
  { id: 1, customer: "Bob Smith", vehicle: "Honda Civic (HX5678)", dueDate: "Today", dueTime: "5:00 PM", status: "due-today" as const },
  { id: 2, customer: "Charlie Davis", vehicle: "Ford Focus (FX9012)", dueDate: "Tomorrow", dueTime: "10:00 AM", status: "upcoming" as const },
  { id: 3, customer: "Diana White", vehicle: "Chevrolet Malibu (CX3456)", dueDate: "Aug 12", dueTime: "2:00 PM", status: "upcoming" as const },
];

export const sparklineData = {
  rentals: [85, 95, 110, 105, 120, 130, 125, 140],
  revenue: [10, 11, 15, 18, 16, 14, 15, 17],
  vehicles: [80, 82, 83, 84, 85, 85, 85, 85],
  customers: [750, 780, 810, 830, 850, 860, 875, 890],
  active: [10, 15, 12, 18, 20, 22, 21, 24],
  total: [100, 105, 115, 120, 125, 130, 135, 145],
  performance: [80, 85, 82, 88, 90, 89, 92, 95],
};

export const bookingStats = {
  activeContracts: "124",
  pendingSignatures: "18",
  completedThisMonth: "342",
  cancelled: "7",
};

// ==================== RENTAL CONTRACTS DATA ====================
export const bookingsData = [
  {
    id: "CTR-1001",
    customer: "Alice Johnson",
    driver: "John Adams",
    vehicle: "Toyota Corolla (TX1234)",
    startDate: "2028-08-01",
    endDate: "2028-08-05",
    deposit: "$200",
    status: "Completed" as const,
  },
  {
    id: "CTR-1002",
    customer: "Bob Smith",
    driver: "None",
    vehicle: "Honda Civic (HX5678)",
    startDate: "2028-08-03",
    endDate: "2028-08-10",
    deposit: "$150",
    status: "Active" as const,
  },
  {
    id: "CTR-1003",
    customer: "Charlie Davis",
    driver: "Emily Brown",
    vehicle: "Ford Focus (FX9012)",
    startDate: "2028-08-05",
    endDate: "2028-08-15",
    deposit: "$300",
    status: "Waiting Signature" as const,
  },
  {
    id: "CTR-1004",
    customer: "Diana White",
    driver: "None",
    vehicle: "Chevrolet Malibu (CX3456)",
    startDate: "2028-08-10",
    endDate: "2028-08-12",
    deposit: "$100",
    status: "Draft" as const,
  },
  {
    id: "CTR-1005",
    customer: "Edward Green",
    driver: "Daniel Jackson",
    vehicle: "Nissan Altima (NX7890)",
    startDate: "2028-08-02",
    endDate: "2028-08-04",
    deposit: "$250",
    status: "Cancelled" as const,
  },
];

// ==================== UNITS (VEHICLES) DATA ====================
export const unitsData = [
  {
    id: "1",
    image: "🚗",
    plateNumber: "TX1234",
    brand: "Aston",
    model: "Martin",
    year: "2023",
    color: "Silver",
    mileage: "12,500 km",
    fuelType: "Petrol",
    status: "Available" as const,
    vin: "1HGCM82633A004123",
    insurance: "Allianz Comprehensive (Exp: 2029-01-15)",
    registrationExpiry: "2029-05-20",
    currentMileage: 12500,
    fuelLevel: "80%",
    photos: 4,
    notes: "Minor scratch on front left bumper.",
    price: 130,
    type: "Convertible",
    units: 1,
    transmission: "Automatic",
    seats: 2,
    description: "A luxurious and sophisticated car, ideal for both daily commutes and extended journeys.",
    features: ["Air Conditioning", "Bluetooth Connectivity", "Backup Camera", "Cruise Control"],
  },
  {
    id: "2",
    image: "🚘",
    plateNumber: "HX5678",
    brand: "Hyundai",
    model: "Sonata",
    year: "2022",
    color: "Blue",
    mileage: "24,000 km",
    fuelType: "Petrol",
    status: "Rented" as const,
    vin: "KMHEF4512CU098765",
    insurance: "AXA Third Party (Exp: 2028-11-10)",
    registrationExpiry: "2028-12-01",
    currentMileage: 24000,
    fuelLevel: "50%",
    photos: 3,
    notes: "Recently serviced, brakes replaced.",
    price: 45,
    type: "Sedan",
    units: 1,
    transmission: "Manual",
    seats: 5,
    description: "A reliable and comfortable sedan perfect for everyday driving.",
    features: ["Air Conditioning", "Bluetooth Connectivity", "Backup Camera"],
  },
  {
    id: "3",
    image: "🚙",
    plateNumber: "NX7890",
    brand: "Nissan",
    model: "Ariya",
    year: "2024",
    color: "White",
    mileage: "5,000 km",
    fuelType: "Electric",
    status: "Reserved" as const,
    vin: "JN1AZ0246BW012345",
    insurance: "Geico Comprehensive (Exp: 2029-06-30)",
    registrationExpiry: "2029-07-15",
    currentMileage: 5000,
    fuelLevel: "100%",
    photos: 5,
    notes: "Brand new, perfect condition.",
    price: 55,
    type: "SUV",
    units: 1,
    transmission: "Automatic",
    seats: 5,
    description: "A modern electric SUV with cutting-edge technology.",
    features: ["Air Conditioning", "Bluetooth Connectivity", "Backup Camera", "Cruise Control"],
  },
  {
    id: "4",
    image: "🛻",
    plateNumber: "RV9012",
    brand: "Range Rover",
    model: "Velar",
    year: "2021",
    color: "Black",
    mileage: "45,000 km",
    fuelType: "Diesel",
    status: "Maintenance" as const,
    vin: "SALYS23456H098765",
    insurance: "Liberty Mutual (Exp: 2028-10-05)",
    registrationExpiry: "2028-11-20",
    currentMileage: 45000,
    fuelLevel: "20%",
    photos: 2,
    notes: "Engine light on, sent for diagnostics.",
    price: 60,
    type: "SUV",
    units: 1,
    transmission: "Automatic",
    seats: 5,
    description: "A premium luxury SUV with outstanding performance.",
    features: ["Air Conditioning", "Bluetooth Connectivity", "Backup Camera"],
  },
];

export const clientStats = {
  totalCustomers: "890",
  newThisMonth: "124",
  activeRentals: "42",
  blacklisted: "3",
};

// ==================== CLIENTS DATA ====================
export const clientsData = [
  {
    id: 1,
    name: "Alice Johnson",
    passportId: "P123456789",
    driverLicense: "DL987654321",
    nationality: "American",
    phone: "123-456-7890",
    email: "alice.johnson@example.com",
    address: "123 Maple Street",
    licenseExpiry: "2030-05-15",
    history: {
      previousRentals: 3,
      currentRental: "None",
      damages: 0,
      signedContracts: 3,
    }
  },
  {
    id: 2,
    name: "Bob Smith",
    passportId: "P987654321",
    driverLicense: "DL123456789",
    nationality: "British",
    phone: "234-567-8901",
    email: "bob.smith@example.com",
    address: "456 Oak Avenue",
    licenseExpiry: "2029-08-20",
    history: {
      previousRentals: 1,
      currentRental: "Honda Civic (HX5678)",
      damages: 1,
      signedContracts: 2,
    }
  },
  {
    id: 3,
    name: "Charlie Davis",
    passportId: "P567890123",
    driverLicense: "DL321654987",
    nationality: "Canadian",
    phone: "345-678-9012",
    email: "charlie.davis@example.com",
    address: "789 Pine Road",
    licenseExpiry: "2028-11-10",
    history: {
      previousRentals: 5,
      currentRental: "None",
      damages: 0,
      signedContracts: 5,
    }
  },
  {
    id: 4,
    name: "Diana White",
    passportId: "P112233445",
    driverLicense: "DL998877665",
    nationality: "Australian",
    phone: "456-789-0123",
    email: "diana.white@example.com",
    address: "321 Cedar Blvd",
    licenseExpiry: "2032-02-28",
    history: {
      previousRentals: 0,
      currentRental: "Chevrolet Malibu (CX3456)",
      damages: 0,
      signedContracts: 1,
    }
  },
  {
    id: 5,
    name: "Edward Green",
    passportId: "P556677889",
    driverLicense: "DL112233445",
    nationality: "Irish",
    phone: "567-890-1234",
    email: "edward.green@example.com",
    address: "654 Elm Court",
    licenseExpiry: "2031-07-05",
    history: {
      previousRentals: 2,
      currentRental: "None",
      damages: 0,
      signedContracts: 2,
    }
  }
];

export const driverStats = {
  totalDrivers: "45",
  activeNow: "24",
  contractsCreated: "342",
  avgPerformance: "4.8",
};

// ==================== DRIVERS DATA ====================
export const driversData = [
  { 
    id: 1, 
    name: "John Adams", 
    email: "john.adams@example.com", 
    phone: "111-222-3333", 
    driverId: "DRV-001",
    license: "L123456",
    licenseExpiry: "2030-05-15",
    status: "Active" as const 
  },
  { 
    id: 2, 
    name: "Emily Brown", 
    email: "emily.brown@example.com", 
    phone: "222-333-4444", 
    driverId: "DRV-002",
    license: "L654321",
    licenseExpiry: "2029-11-20",
    status: "Deactivated" as const 
  },
  { 
    id: 3, 
    name: "Michael Clark", 
    email: "michael.clark@example.com", 
    phone: "333-444-5555", 
    driverId: "DRV-003",
    license: "L987654",
    licenseExpiry: "2031-01-10",
    status: "Active" as const 
  },
  { 
    id: 4, 
    name: "Sarah Parker", 
    email: "sarah.parker@example.com", 
    phone: "444-555-6666", 
    driverId: "DRV-004",
    license: "L112233",
    licenseExpiry: "2028-12-05",
    status: "Active" as const 
  },
  { 
    id: 5, 
    name: "David Lee", 
    email: "david.lee@example.com", 
    phone: "555-666-7777", 
    driverId: "DRV-005",
    license: "L445566",
    licenseExpiry: "2032-08-22",
    status: "Active" as const 
  }
];

export const selectedDriver = {
  name: "John Adams",
  status: "Active" as const,
  email: "john.adams@example.com",
  phone: "111-222-3333",
  driverId: "DRV-001",
  license: "L123456",
  licenseExpiry: "2030-05-15",
  contractsCreated: 15,
  performance: 4.8,
  rentalsHandled: 42,
  schedule: [
    { date: "Tue, 1 Aug", time: "10:00 AM", car: "Toyota Corolla", client: "Alice Johnson" },
  ],
};

// ==================== PAYMENTS DATA (Keep for backwards compatibility if needed) ====================
export const paymentsData = [
  {
    id: "INV-WZ001",
    client: "Alice Johnson",
    car: "Toyota Corolla",
    ratePerDay: "$50",
    rentalPeriod: "3 Days",
    amount: "$150",
    dueDate: "2024-08-05",
    status: "completed" as const,
  }
];

export const cashflowData = [
  { month: "Jan", income: 15000, expense: 9500 },
];

export const expenseBreakdown = [
  { name: "Vehicle Maintenance", value: 30, color: "#E53935", amount: "$3,000" },
];

export const transactionsData = [
  { id: 1, name: "Oil Change", category: "Vehicle Maintenance", categoryColor: "#1E293B", quantity: 1, amount: "$100", date: "2024-08-01", status: "completed" as const },
];

export const trackingDrivers = [
  { id: 1, name: "Helen Martinez", car: "Aston Martin", status: "on-trip" as const },
];

export const trackingRentInfo = {
  driver: "Diana White",
  car: "Chevrolet Bolt",
  carType: "SUV",
  carNumber: "CX345",
  startDate: "Wed, 7 Aug 2028",
  endDate: "Thu, 3 Aug 2028",
  tripTime: "0 hours 28 minutes",
  totalDistance: "180 miles",
};

export const messageContacts = [
  { id: 1, name: "Helen Martinez", lastMessage: "Just confirming my booking for the Mazda 3...", time: "04:00 PM", unread: 1 },
];

export const chatMessages: { id: number; sender: string; text: string; time: string; isMe: boolean; hasImage?: boolean }[] = [
  { id: 1, sender: "George Clark", text: "Hi, I noticed a small scratch on the Audi Q7. Can you note it down?", time: "09:20 AM", isMe: false },
];

export const calendarBookings = [
  { id: 1, time: "8:00 AM", day: 0, car: "Ford Focus", client: "Michael Brown", type: "pickup" as const, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: 2, time: "10:00 AM", day: 0, car: "Toyota Corolla", client: "Alice Johnson", type: "return" as const, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id: 3, time: "1:00 PM", day: 1, car: "Honda Civic", client: "Bob Smith", type: "pickup" as const, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: 4, time: "9:00 AM", day: 2, car: "Nissan Altima", client: "Edward Green", type: "return" as const, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id: 5, time: "3:00 PM", day: 3, car: "Chevrolet Malibu", client: "Diana White", type: "pickup" as const, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: 6, time: "11:00 AM", day: 4, car: "Range Rover Velar", client: "Charlie Davis", type: "pickup" as const, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: 7, time: "4:00 PM", day: 4, car: "Ford Focus", client: "Michael Brown", type: "return" as const, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id: 8, time: "10:00 AM", day: 5, car: "Aston Martin", client: "Helen Martinez", type: "pickup" as const, color: "bg-blue-50 border-blue-200 text-blue-700" },
];
// ==================== PHASE 2 MOCK DATA ====================

// 6. Vehicle Inspection
export const inspectionsData = [
  {
    id: "INSP-001",
    type: "Before Rental" as const,
    vehicle: "Toyota Corolla (TX1234)",
    date: "2028-08-01",
    time: "09:00 AM",
    driver: "John Adams",
    mileage: 12500,
    fuelLevel: "80%",
    damages: "Minor scratch on front left bumper",
    status: "Completed" as const,
  },
  {
    id: "INSP-002",
    type: "After Rental" as const,
    vehicle: "Honda Civic (HX5678)",
    date: "2028-08-10",
    time: "02:30 PM",
    driver: "Emily Brown",
    mileage: 24500,
    fuelLevel: "40%",
    damages: "None",
    status: "Pending" as const,
  }
];

// 7. Damage Management
export const damagesData = [
  {
    id: "DMG-001",
    vehicle: "Range Rover Velar (RV9012)",
    customer: "Bob Smith",
    contract: "CTR-1002",
    description: "Broken taillight from reversing into a pole.",
    date: "2028-08-05",
    cost: "$450",
    status: "Pending" as const,
  },
  {
    id: "DMG-002",
    vehicle: "Toyota Corolla (TX1234)",
    customer: "Alice Johnson",
    contract: "CTR-1001",
    description: "Scratch on front bumper.",
    date: "2028-07-20",
    cost: "$120",
    status: "Repaired" as const,
  }
];

// 8. Reports
export const reportsList = [
  { id: 1, name: "Monthly Rental Report", type: "Rental", date: "2028-08-01", status: "Generated" },
  { id: 2, name: "Vehicle Utilization Q2", type: "Vehicle", date: "2028-07-01", status: "Generated" },
  { id: 3, name: "Top Customers 2028", type: "Customer", date: "2028-06-15", status: "Generated" },
  { id: 4, name: "Driver Performance Report", type: "Driver", date: "2028-08-05", status: "Pending" },
  { id: 5, name: "August Damage Overview", type: "Damage", date: "2028-08-20", status: "Pending" },
];

// 9. Notifications
export const notificationsData = [
  { id: 1, title: "Contract Signed", message: "Bob Smith has signed CTR-1002.", time: "10 mins ago", read: false },
  { id: 2, title: "Rental Due Tomorrow", message: "Honda Civic (HX5678) is due for return tomorrow.", time: "1 hour ago", read: false },
  { id: 3, title: "Overdue Rental", message: "Toyota Corolla (TX1234) is overdue by 2 hours.", time: "3 hours ago", read: true },
  { id: 4, title: "Deposit Reminder", message: "Deposit for CTR-1003 is pending.", time: "1 day ago", read: true },
];

// 10. Documents
export const documentsData = [
  { id: "DOC-1001", name: "Rental_Contract_CTR1001.pdf", type: "Contract", customer: "Alice Johnson", date: "2028-08-01", size: "1.2 MB" },
  { id: "DOC-1002", name: "Inspection_Before_TX1234.pdf", type: "Inspection Report", customer: "Alice Johnson", date: "2028-08-01", size: "3.5 MB" },
  { id: "DOC-1003", name: "Return_Report_TX1234.pdf", type: "Return Report", customer: "Alice Johnson", date: "2028-08-05", size: "2.1 MB" },
];

// 11. Users
export const usersData = [
  { id: 1, name: "Admin Leo", email: "admin@wheelzie.com", role: "Super Admin", status: "Active" },
  { id: 2, name: "Manager Jane", email: "jane@wheelzie.com", role: "Admin", status: "Active" },
  { id: 3, name: "John Adams", email: "john.a@wheelzie.com", role: "Driver", status: "Active" },
  { id: 4, name: "Emily Brown", email: "emily.b@wheelzie.com", role: "Driver", status: "Inactive" },
];
