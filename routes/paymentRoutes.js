const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const { calculateTenantBalance } = require('../utils/rentCalculator');
const { protect } = require('../middleware/authMiddleware');

// All payment routes are protected
router.use(protect);

// @route   GET /api/payments
// @desc    Get all payments with search, date filters, and method filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tenantId, paymentMethod, startDate, endDate, search } = req.query;
    let query = {};

    if (tenantId) {
      query.tenantId = tenantId;
    }

    if (paymentMethod && ['Cash', 'Mobile Money', 'Bank Transfer'].includes(paymentMethod)) {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) {
        query.paymentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = end;
      }
    }

    let payments = await Payment.find(query)
      .populate('tenantId', 'fullName phone email active')
      .populate('roomId', 'roomNumber monthlyRent')
      .sort({ paymentDate: -1 });

    // In-memory search filter if search parameter provided
    if (search) {
      const term = search.toLowerCase().trim();
      payments = payments.filter((p) => {
        const tenantName = p.tenantId?.fullName?.toLowerCase() || '';
        const roomNum = p.roomId?.roomNumber?.toLowerCase() || '';
        const ref = p.transactionReference?.toLowerCase() || '';
        const desc = p.description?.toLowerCase() || '';
        const method = p.paymentMethod?.toLowerCase() || '';
        return (
          tenantName.includes(term) ||
          roomNum.includes(term) ||
          ref.includes(term) ||
          desc.includes(term) ||
          method.includes(term)
        );
      });
    }

    // Calculate total sum of filtered payments
    const totalCollected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    res.json({
      success: true,
      count: payments.length,
      totalCollected: Math.round(totalCollected * 100) / 100,
      payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payments.'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Get single payment receipt
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('tenantId', 'fullName phone email identificationNumber moveInDate active')
      .populate('roomId', 'roomNumber monthlyRent description');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found.'
      });
    }

    // Calculate tenant's current balance to display on receipt
    let financials = null;
    if (payment.tenantId) {
      const allPaymentsForTenant = await Payment.find({ tenantId: payment.tenantId._id });
      financials = calculateTenantBalance(payment.tenantId, allPaymentsForTenant);
    }

    res.json({
      success: true,
      payment,
      financials
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment details.'
    });
  }
});

// @route   POST /api/payments
// @desc    Record a rent payment
// @access  Private
router.post('/', async (req, res) => {
  try {
    const {
      tenantId,
      amountPaid,
      paymentDate,
      paymentMethod,
      transactionReference,
      description
    } = req.body;

    if (!tenantId || amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({
        success: false,
        message: 'Tenant and payment amount are required.'
      });
    }

    const amount = Number(amountPaid);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be a positive number greater than 0.'
      });
    }

    // Find tenant and their allocated room
    const tenant = await Tenant.findById(tenantId).populate('roomId');
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Selected tenant does not exist.'
      });
    }

    if (!tenant.roomId) {
      return res.status(400).json({
        success: false,
        message: 'The selected tenant does not have an allocated room.'
      });
    }

    // Create payment record
    const payment = await Payment.create({
      tenantId: tenant._id,
      roomId: tenant.roomId._id,
      amountPaid: Math.round(amount * 100) / 100,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: ['Cash', 'Mobile Money', 'Bank Transfer'].includes(paymentMethod)
        ? paymentMethod
        : 'Cash',
      transactionReference: (transactionReference || '').trim(),
      description: (description || '').trim()
    });

    // Recalculate tenant balance
    const allPayments = await Payment.find({ tenantId: tenant._id });
    const financials = calculateTenantBalance(tenant, allPayments);

    const populatedPayment = await Payment.findById(payment._id)
      .populate('tenantId', 'fullName phone email')
      .populate('roomId', 'roomNumber monthlyRent');

    res.status(201).json({
      success: true,
      message: `Rent payment of $${payment.amountPaid} recorded successfully for ${tenant.fullName}.`,
      payment: populatedPayment,
      tenantFinancials: financials
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record rent payment.'
    });
  }
});

// @route   DELETE /api/payments/:id
// @desc    Delete a payment record
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found.'
      });
    }

    await Payment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Payment record removed successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete payment.'
    });
  }
});

module.exports = router;
