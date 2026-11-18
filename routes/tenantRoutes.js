const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const { calculateTenantBalance } = require('../utils/rentCalculator');
const { protect } = require('../middleware/authMiddleware');

// All tenant routes are protected
router.use(protect);

// @route   GET /api/tenants
// @desc    Get all tenants with search, status filter, and calculated rent balance
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (status === 'active') {
      query.active = true;
    } else if (status === 'inactive') {
      query.active = false;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { identificationNumber: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const tenants = await Tenant.find(query)
      .populate('roomId', 'roomNumber monthlyRent description status')
      .sort({ active: -1, createdAt: -1 });

    // Fetch payments grouped by tenant to calculate balances
    const payments = await Payment.find();
    const paymentsByTenant = {};
    payments.forEach((p) => {
      const tId = p.tenantId.toString();
      if (!paymentsByTenant[tId]) {
        paymentsByTenant[tId] = [];
      }
      paymentsByTenant[tId].push(p);
    });

    // Attach balance calculation to each tenant
    const enrichedTenants = tenants.map((t) => {
      const tenantPayments = paymentsByTenant[t._id.toString()] || [];
      const balanceInfo = calculateTenantBalance(t, tenantPayments);
      const tObj = t.toObject();
      tObj.financials = balanceInfo;
      return tObj;
    });

    res.json({
      success: true,
      count: enrichedTenants.length,
      tenants: enrichedTenants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch tenants.'
    });
  }
});

// @route   GET /api/tenants/:id
// @desc    Get single tenant by ID with payment history and detailed balance
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('roomId');
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.'
      });
    }

    const payments = await Payment.find({ tenantId: tenant._id }).sort({ paymentDate: -1 });
    const financials = calculateTenantBalance(tenant, payments);

    const tenantObj = tenant.toObject();
    tenantObj.financials = financials;
    tenantObj.payments = payments;

    res.json({
      success: true,
      tenant: tenantObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch tenant.'
    });
  }
});

// @route   POST /api/tenants
// @desc    Register a new tenant & assign to room
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { fullName, phone, email, identificationNumber, roomId, moveInDate } = req.body;

    if (!fullName || !phone || !roomId) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone number, and allocated room are required.'
      });
    }

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Selected room not found.'
      });
    }

    // Check if another active tenant already occupies this room
    const existingActiveTenant = await Tenant.findOne({ roomId, active: true });
    if (existingActiveTenant) {
      return res.status(400).json({
        success: false,
        message: `Room "${room.roomNumber}" is currently occupied by active tenant "${existingActiveTenant.fullName}".`
      });
    }

    const tenant = await Tenant.create({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: (email || '').trim().toLowerCase(),
      identificationNumber: (identificationNumber || '').trim(),
      roomId,
      moveInDate: moveInDate ? new Date(moveInDate) : new Date(),
      active: true
    });

    // Automatically set room status to Occupied
    room.status = 'Occupied';
    await room.save();

    const populatedTenant = await Tenant.findById(tenant._id).populate('roomId');

    res.status(201).json({
      success: true,
      message: `Tenant "${tenant.fullName}" registered successfully and assigned to Room ${room.roomNumber}.`,
      tenant: populatedTenant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to register tenant.'
    });
  }
});

// @route   PUT /api/tenants/:id
// @desc    Update tenant details and handle room transfers safely
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.'
      });
    }

    const { fullName, phone, email, identificationNumber, roomId, moveInDate, active } = req.body;

    if (fullName) tenant.fullName = fullName.trim();
    if (phone) tenant.phone = phone.trim();
    if (email !== undefined) tenant.email = email.trim().toLowerCase();
    if (identificationNumber !== undefined) tenant.identificationNumber = identificationNumber.trim();
    if (moveInDate) tenant.moveInDate = new Date(moveInDate);

    // Handle room transfer if roomId changed
    if (roomId && roomId.toString() !== tenant.roomId.toString()) {
      const newRoom = await Room.findById(roomId);
      if (!newRoom) {
        return res.status(404).json({
          success: false,
          message: 'Selected new room not found.'
        });
      }

      // Check if another active tenant is in the new room
      const occupyingTenant = await Tenant.findOne({
        roomId: newRoom._id,
        active: true,
        _id: { $ne: tenant._id }
      });

      if (occupyingTenant) {
        return res.status(400).json({
          success: false,
          message: `Room "${newRoom.roomNumber}" is already occupied by "${occupyingTenant.fullName}".`
        });
      }

      const oldRoomId = tenant.roomId;

      // Transfer tenant
      tenant.roomId = newRoom._id;
      newRoom.status = 'Occupied';
      await newRoom.save();

      // Free old room if no other active tenant exists
      if (oldRoomId) {
        const remainingTenantsInOld = await Tenant.findOne({
          roomId: oldRoomId,
          active: true,
          _id: { $ne: tenant._id }
        });
        if (!remainingTenantsInOld) {
          await Room.findByIdAndUpdate(oldRoomId, { status: 'Vacant' });
        }
      }
    }

    // Handle active state toggle if explicitly provided
    if (active !== undefined && typeof active === 'boolean') {
      const oldActive = tenant.active;
      tenant.active = active;
      if (!active && oldActive) {
        tenant.vacatedDate = new Date();
        // Free room
        await Room.findByIdAndUpdate(tenant.roomId, { status: 'Vacant' });
      } else if (active && !oldActive) {
        tenant.vacatedDate = null;
        // Occupy room if available
        const room = await Room.findById(tenant.roomId);
        if (room) {
          room.status = 'Occupied';
          await room.save();
        }
      }
    }

    await tenant.save();

    const updatedTenant = await Tenant.findById(tenant._id).populate('roomId');

    res.json({
      success: true,
      message: 'Tenant updated successfully.',
      tenant: updatedTenant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update tenant.'
    });
  }
});

// @route   PATCH /api/tenants/:id/vacate
// @desc    Vacate tenant and mark allocated room as Vacant
// @access  Private
router.patch('/:id/vacate', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.'
      });
    }

    if (!tenant.active) {
      return res.status(400).json({
        success: false,
        message: 'Tenant is already marked as inactive/vacated.'
      });
    }

    tenant.active = false;
    tenant.vacatedDate = new Date();
    await tenant.save();

    // Mark room as Vacant if no other active tenant is linked
    if (tenant.roomId) {
      const otherActive = await Tenant.findOne({
        roomId: tenant.roomId,
        active: true,
        _id: { $ne: tenant._id }
      });
      if (!otherActive) {
        await Room.findByIdAndUpdate(tenant.roomId, { status: 'Vacant' });
      }
    }

    res.json({
      success: true,
      message: `Tenant "${tenant.fullName}" has been vacated. The room is now available.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to vacate tenant.'
    });
  }
});

// @route   DELETE /api/tenants/:id
// @desc    Delete tenant record safely and free allocated room
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.'
      });
    }

    const roomId = tenant.roomId;

    // Delete associated payments
    await Payment.deleteMany({ tenantId: tenant._id });

    // Delete tenant
    await Tenant.findByIdAndDelete(req.params.id);

    // If room is now free, set to Vacant
    if (roomId) {
      const remainingActive = await Tenant.findOne({ roomId, active: true });
      if (!remainingActive) {
        await Room.findByIdAndUpdate(roomId, { status: 'Vacant' });
      }
    }

    res.json({
      success: true,
      message: `Tenant "${tenant.fullName}" and related payments deleted successfully.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete tenant.'
    });
  }
});

module.exports = router;
