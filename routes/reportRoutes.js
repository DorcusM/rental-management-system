const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const { calculateTenantBalance } = require('../utils/rentCalculator');
const { protect } = require('../middleware/authMiddleware');

// All report routes are protected
router.use(protect);

// @route   GET /api/reports/summary
// @desc    Get aggregate report summary and room occupancy metrics
// @access  Private
router.get('/summary', async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments();
    const occupiedRooms = await Room.countDocuments({ status: 'Occupied' });
    const vacantRooms = await Room.countDocuments({ status: 'Vacant' });
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const allPayments = await Payment.find();
    const totalRentCollected = allPayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);

    const activeTenants = await Tenant.find({ active: true }).populate('roomId');
    const paymentsByTenant = {};
    allPayments.forEach((p) => {
      const tId = p.tenantId.toString();
      if (!paymentsByTenant[tId]) paymentsByTenant[tId] = [];
      paymentsByTenant[tId].push(p);
    });

    let totalDue = 0;
    let totalOutstanding = 0;
    let fullyPaidCount = 0;
    let owingCount = 0;

    activeTenants.forEach((t) => {
      const fin = calculateTenantBalance(t, paymentsByTenant[t._id.toString()] || []);
      totalDue += fin.totalDue;
      if (fin.outstandingAmount > 0) {
        totalOutstanding += fin.outstandingAmount;
        owingCount++;
      } else {
        fullyPaidCount++;
      }
    });

    const collectionRate = totalDue > 0 ? Math.min(100, Math.round((totalRentCollected / totalDue) * 100)) : 100;

    res.json({
      success: true,
      summary: {
        totalRooms,
        occupiedRooms,
        vacantRooms,
        occupancyRate,
        totalRentCollected: Math.round(totalRentCollected * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        collectionRate,
        activeTenantsCount: activeTenants.length,
        fullyPaidCount,
        owingCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate report summary.'
    });
  }
});

// @route   GET /api/reports/payments
// @desc    Get filtered payments report by month and year
// @access  Private
router.get('/payments', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = {};

    if (year) {
      const y = parseInt(year, 10);
      let startDate, endDate;

      if (month && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
        const m = parseInt(month, 10) - 1; // 0-based
        startDate = new Date(y, m, 1);
        endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
      } else {
        startDate = new Date(y, 0, 1);
        endDate = new Date(y, 11, 31, 23, 59, 59, 999);
      }

      query.paymentDate = { $gte: startDate, $lte: endDate };
    }

    const payments = await Payment.find(query)
      .populate('tenantId', 'fullName phone email')
      .populate('roomId', 'roomNumber monthlyRent')
      .sort({ paymentDate: -1 });

    const totalCollected = payments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);

    res.json({
      success: true,
      count: payments.length,
      totalCollected: Math.round(totalCollected * 100) / 100,
      payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to filter payment reports.'
    });
  }
});

// @route   GET /api/reports/export-csv
// @desc    Export payments report as a CSV file download
// @access  Private
router.get('/export-csv', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = {};

    if (year) {
      const y = parseInt(year, 10);
      let startDate, endDate;

      if (month && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
        const m = parseInt(month, 10) - 1;
        startDate = new Date(y, m, 1);
        endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
      } else {
        startDate = new Date(y, 0, 1);
        endDate = new Date(y, 11, 31, 23, 59, 59, 999);
      }
      query.paymentDate = { $gte: startDate, $lte: endDate };
    }

    const payments = await Payment.find(query)
      .populate('tenantId', 'fullName phone')
      .populate('roomId', 'roomNumber')
      .sort({ paymentDate: -1 });

    // Build CSV content
    const csvHeader = [
      'Transaction ID',
      'Date',
      'Tenant Name',
      'Tenant Phone',
      'Room Number',
      'Amount Paid ($)',
      'Payment Method',
      'Reference',
      'Notes'
    ].join(',');

    const csvRows = payments.map((p) => {
      const id = `"${p._id}"`;
      const date = `"${new Date(p.paymentDate).toISOString().split('T')[0]}"`;
      const tenantName = `"${(p.tenantId?.fullName || 'N/A').replace(/"/g, '""')}"`;
      const phone = `"${(p.tenantId?.phone || 'N/A').replace(/"/g, '""')}"`;
      const roomNumber = `"${p.roomId?.roomNumber || 'N/A'}"`;
      const amount = p.amountPaid.toFixed(2);
      const method = `"${p.paymentMethod}"`;
      const reference = `"${(p.transactionReference || 'N/A').replace(/"/g, '""')}"`;
      const notes = `"${(p.description || '').replace(/"/g, '""')}"`;

      return [id, date, tenantName, phone, roomNumber, amount, method, reference, notes].join(',');
    });

    const csvContent = [csvHeader, ...csvRows].join('\r\n');

    const fileName = year
      ? `payments_report_${year}${month ? `_${month}` : ''}.csv`
      : `all_payments_report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export CSV report.'
    });
  }
});

module.exports = router;
