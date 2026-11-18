const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const { calculateTenantBalance } = require('../utils/rentCalculator');
const { protect } = require('../middleware/authMiddleware');

// All dashboard routes are protected
router.use(protect);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard metrics, charts, and recent records
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    // 1. Room stats
    const totalRooms = await Room.countDocuments();
    const occupiedRooms = await Room.countDocuments({ status: 'Occupied' });
    const vacantRooms = await Room.countDocuments({ status: 'Vacant' });

    // 2. Tenant stats (active tenants)
    const totalTenants = await Tenant.countDocuments({ active: true });
    const allTenantsList = await Tenant.find().populate('roomId');

    // 3. Payments and financial calculations
    const allPayments = await Payment.find();
    const totalRentCollected = allPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    // Group payments by tenant for outstanding balance calculations
    const paymentsByTenant = {};
    allPayments.forEach((p) => {
      const tId = p.tenantId.toString();
      if (!paymentsByTenant[tId]) {
        paymentsByTenant[tId] = [];
      }
      paymentsByTenant[tId].push(p);
    });

    // Calculate total outstanding balance across active tenants
    let totalOutstandingRent = 0;
    allTenantsList.forEach((t) => {
      if (t.active && t.roomId) {
        const tPayments = paymentsByTenant[t._id.toString()] || [];
        const fin = calculateTenantBalance(t, tPayments);
        if (fin.outstandingAmount > 0) {
          totalOutstandingRent += fin.outstandingAmount;
        }
      }
    });

    // 4. Recent rent payments (latest 5)
    const recentPayments = await Payment.find()
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(5)
      .populate('tenantId', 'fullName phone')
      .populate('roomId', 'roomNumber');

    // 5. Recently registered tenants (latest 5)
    const recentTenants = await Tenant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('roomId', 'roomNumber monthlyRent');

    // 6. Monthly rent collection chart data for the past 6 months
    const monthlyData = [];
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      // Sum payments in this month
      const monthSum = allPayments
        .filter((p) => {
          const pDate = new Date(p.paymentDate);
          return pDate >= startOfMonth && pDate <= endOfMonth;
        })
        .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

      monthlyData.push({
        label,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        total: Math.round(monthSum * 100) / 100
      });
    }

    res.json({
      success: true,
      stats: {
        totalRooms,
        occupiedRooms,
        vacantRooms,
        totalTenants,
        totalRentCollected: Math.round(totalRentCollected * 100) / 100,
        totalOutstandingRent: Math.round(totalOutstandingRent * 100) / 100,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
      },
      recentPayments,
      recentTenants,
      monthlyCollectionChart: monthlyData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load dashboard statistics.'
    });
  }
});

module.exports = router;
