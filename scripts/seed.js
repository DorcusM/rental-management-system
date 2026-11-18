const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rental_management_db';
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    // Clear existing collections
    console.log('Clearing old collections...');
    await User.deleteMany({});
    await Room.deleteMany({});
    await Tenant.deleteMany({});
    await Payment.deleteMany({});

    // 1. Seed Administrator
    console.log('Seeding Administrator...');
    const admin = await User.create({
      name: 'Property Administrator',
      email: 'admin@rental.com',
      password: 'admin123' // Will be hashed by pre-save hook
    });
    console.log(`Admin created: ${admin.email} (Password: admin123)`);

    // 2. Seed Rooms
    console.log('Seeding Rooms...');
    const roomsData = [
      {
        roomNumber: '101',
        monthlyRent: 350,
        description: 'Ground Floor, Deluxe Single with private bath and garden view',
        status: 'Occupied'
      },
      {
        roomNumber: '102',
        monthlyRent: 400,
        description: 'Ground Floor, One-Bedroom Studio with kitchenette and AC',
        status: 'Occupied'
      },
      {
        roomNumber: '103',
        monthlyRent: 300,
        description: 'Ground Floor, Standard Single Room with shared bathroom',
        status: 'Vacant'
      },
      {
        roomNumber: '201',
        monthlyRent: 550,
        description: 'First Floor, Two-Bedroom Executive Suite with private balcony',
        status: 'Occupied'
      },
      {
        roomNumber: '202',
        monthlyRent: 420,
        description: 'First Floor, Spacious One-Bedroom with living area and wardrobe',
        status: 'Occupied'
      },
      {
        roomNumber: '203',
        monthlyRent: 380,
        description: 'First Floor, Compact Studio Apartment with high ceiling',
        status: 'Vacant'
      }
    ];

    const createdRooms = await Room.insertMany(roomsData);
    console.log(`Created ${createdRooms.length} rooms.`);

    const roomMap = {};
    createdRooms.forEach((r) => {
      roomMap[r.roomNumber] = r._id;
    });

    // Dates calculation relative to current date for realistic demonstration
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthFirst = new Date(now.getFullYear(), now.getMonth(), 2);

    // 3. Seed Tenants
    console.log('Seeding Tenants...');
    const tenantsData = [
      {
        fullName: 'John Doe',
        phone: '+1 555-0192',
        email: 'john.doe@example.com',
        identificationNumber: 'NAT-984210',
        roomId: roomMap['101'],
        moveInDate: twoMonthsAgo,
        active: true
      },
      {
        fullName: 'Sarah Smith',
        phone: '+1 555-0248',
        email: 'sarah.smith@example.com',
        identificationNumber: 'NAT-441098',
        roomId: roomMap['201'],
        moveInDate: threeMonthsAgo,
        active: true
      },
      {
        fullName: 'Michael Brown',
        phone: '+1 555-0377',
        email: 'michael.brown@example.com',
        identificationNumber: 'NAT-623914',
        roomId: roomMap['102'],
        moveInDate: twoMonthsAgo,
        active: true
      },
      {
        fullName: 'Emily Davis',
        phone: '+1 555-0482',
        email: 'emily.davis@example.com',
        identificationNumber: 'NAT-710842',
        roomId: roomMap['202'],
        moveInDate: oneMonthAgo,
        active: true
      }
    ];

    const createdTenants = await Tenant.insertMany(tenantsData);
    console.log(`Created ${createdTenants.length} tenants.`);

    const tenantMap = {};
    createdTenants.forEach((t) => {
      tenantMap[t.fullName] = t._id;
    });

    // 4. Seed Payments
    console.log('Seeding Payments...');
    const paymentsData = [
      // John Doe (Room 101, $350/mo) - paid 2 months ago and 1 month ago; owes current month ($350)
      {
        tenantId: tenantMap['John Doe'],
        roomId: roomMap['101'],
        amountPaid: 350,
        paymentDate: twoMonthsAgo,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'BNK-8812901',
        description: 'Rent payment for first month'
      },
      {
        tenantId: tenantMap['John Doe'],
        roomId: roomMap['101'],
        amountPaid: 350,
        paymentDate: oneMonthAgo,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'BNK-8941022',
        description: 'Rent payment for second month'
      },

      // Sarah Smith (Room 201, $550/mo) - fully up-to-date (paid 4 payments: 3 mo, 2 mo, 1 mo, and current)
      {
        tenantId: tenantMap['Sarah Smith'],
        roomId: roomMap['201'],
        amountPaid: 550,
        paymentDate: threeMonthsAgo,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'BNK-7731200',
        description: 'Rent payment - Month 1'
      },
      {
        tenantId: tenantMap['Sarah Smith'],
        roomId: roomMap['201'],
        amountPaid: 550,
        paymentDate: twoMonthsAgo,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'BNK-7940215',
        description: 'Rent payment - Month 2'
      },
      {
        tenantId: tenantMap['Sarah Smith'],
        roomId: roomMap['201'],
        amountPaid: 550,
        paymentDate: oneMonthAgo,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'BNK-8120093',
        description: 'Rent payment - Month 3'
      },
      {
        tenantId: tenantMap['Sarah Smith'],
        roomId: roomMap['201'],
        amountPaid: 550,
        paymentDate: currentMonthFirst,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'BNK-8541249',
        description: 'Rent payment - Current month'
      },

      // Michael Brown (Room 102, $400/mo) - paid month 1, then partial $200 for month 2 -> owes $600
      {
        tenantId: tenantMap['Michael Brown'],
        roomId: roomMap['102'],
        amountPaid: 400,
        paymentDate: twoMonthsAgo,
        paymentMethod: 'Mobile Money',
        transactionReference: 'MM-4912048',
        description: 'Initial deposit & first month rent'
      },
      {
        tenantId: tenantMap['Michael Brown'],
        roomId: roomMap['102'],
        amountPaid: 200,
        paymentDate: oneMonthAgo,
        paymentMethod: 'Cash',
        transactionReference: 'CSH-REC-0021',
        description: 'Partial payment towards rent'
      },

      // Emily Davis (Room 202, $420/mo) - paid month 1 and current month -> fully paid!
      {
        tenantId: tenantMap['Emily Davis'],
        roomId: roomMap['202'],
        amountPaid: 420,
        paymentDate: oneMonthAgo,
        paymentMethod: 'Mobile Money',
        transactionReference: 'MM-5519201',
        description: 'Move-in rent payment'
      },
      {
        tenantId: tenantMap['Emily Davis'],
        roomId: roomMap['202'],
        amountPaid: 420,
        paymentDate: currentMonthFirst,
        paymentMethod: 'Mobile Money',
        transactionReference: 'MM-6021488',
        description: 'Current month rent payment'
      }
    ];

    const createdPayments = await Payment.insertMany(paymentsData);
    console.log(`Created ${createdPayments.length} payment records.`);

    console.log('\n======================================================');
    console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Administrator Login Credentials:');
    console.log('   Email:    admin@rental.com');
    console.log('   Password: admin123');
    console.log('------------------------------------------------------');
    console.log(`Rooms created:    ${createdRooms.length} (4 Occupied, 2 Vacant)`);
    console.log(`Tenants created:  ${createdTenants.length}`);
    console.log(`Payments created: ${createdPayments.length}`);
    console.log('======================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  }
};

seedData();
