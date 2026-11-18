const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const { protect } = require('../middleware/authMiddleware');

// All room routes are protected
router.use(protect);

// @route   GET /api/rooms
// @desc    Get all rooms with optional filtering and tenant attachment
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && ['Vacant', 'Occupied'].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { roomNumber: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const rooms = await Room.find(query).sort({ roomNumber: 1 });

    // Fetch active tenants mapped by roomId to attach to room data
    const activeTenants = await Tenant.find({ active: true });
    const tenantMap = {};
    activeTenants.forEach((t) => {
      tenantMap[t.roomId.toString()] = {
        id: t._id,
        fullName: t.fullName,
        phone: t.phone,
        moveInDate: t.moveInDate
      };
    });

    const roomsWithTenants = rooms.map((room) => {
      const roomObj = room.toObject();
      roomObj.currentTenant = tenantMap[room._id.toString()] || null;
      return roomObj;
    });

    res.json({
      success: true,
      count: roomsWithTenants.length,
      rooms: roomsWithTenants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch rooms.'
    });
  }
});

// @route   GET /api/rooms/available
// @desc    Get vacant rooms available for new tenant allocation
// @access  Private
router.get('/available', async (req, res) => {
  try {
    const vacantRooms = await Room.find({ status: 'Vacant' }).sort({ roomNumber: 1 });
    res.json({
      success: true,
      count: vacantRooms.length,
      rooms: vacantRooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch available rooms.'
    });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get single room by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    const currentTenant = await Tenant.findOne({ roomId: room._id, active: true });
    const roomObj = room.toObject();
    roomObj.currentTenant = currentTenant || null;

    res.json({
      success: true,
      room: roomObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch room.'
    });
  }
});

// @route   POST /api/rooms
// @desc    Create a new rental room
// @access  Private
router.post('/', async (req, res) => {
  try {
    let { roomNumber, monthlyRent, description, status } = req.body;

    if (!roomNumber || monthlyRent === undefined || monthlyRent === null) {
      return res.status(400).json({
        success: false,
        message: 'Room number and monthly rent are required.'
      });
    }

    roomNumber = roomNumber.trim().toUpperCase();
    const rent = Number(monthlyRent);

    if (isNaN(rent) || rent < 0) {
      return res.status(400).json({
        success: false,
        message: 'Monthly rent must be a valid positive number.'
      });
    }

    // Check unique room number
    const existing = await Room.findOne({ roomNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Room number "${roomNumber}" already exists.`
      });
    }

    const room = await Room.create({
      roomNumber,
      monthlyRent: rent,
      description: (description || '').trim(),
      status: status === 'Occupied' ? 'Occupied' : 'Vacant'
    });

    res.status(201).json({
      success: true,
      message: 'Room added successfully.',
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create room.'
    });
  }
});

// @route   PUT /api/rooms/:id
// @desc    Update room details
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    let { roomNumber, monthlyRent, description, status } = req.body;

    if (roomNumber) {
      roomNumber = roomNumber.trim().toUpperCase();
      if (roomNumber !== room.roomNumber) {
        const existing = await Room.findOne({ roomNumber });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Room number "${roomNumber}" is already in use.`
          });
        }
        room.roomNumber = roomNumber;
      }
    }

    if (monthlyRent !== undefined && monthlyRent !== null) {
      const rent = Number(monthlyRent);
      if (isNaN(rent) || rent < 0) {
        return res.status(400).json({
          success: false,
          message: 'Monthly rent must be a valid positive number.'
        });
      }
      room.monthlyRent = rent;
    }

    if (description !== undefined) {
      room.description = description.trim();
    }

    // If attempting to manually set status to Vacant, check if active tenant exists
    if (status && ['Vacant', 'Occupied'].includes(status)) {
      if (status === 'Vacant') {
        const hasActiveTenant = await Tenant.findOne({ roomId: room._id, active: true });
        if (hasActiveTenant) {
          return res.status(400).json({
            success: false,
            message: `Cannot set room status to Vacant while tenant "${hasActiveTenant.fullName}" is actively occupying it. Please vacate the tenant first.`
          });
        }
      }
      room.status = status;
    }

    await room.save();

    res.json({
      success: true,
      message: 'Room updated successfully.',
      room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update room.'
    });
  }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete room (only if no active tenant is occupying it)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Check if room has active tenant
    const activeTenant = await Tenant.findOne({ roomId: room._id, active: true });
    if (activeTenant) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete room "${room.roomNumber}". It is currently occupied by active tenant "${activeTenant.fullName}".`
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Room "${room.roomNumber}" deleted successfully.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete room.'
    });
  }
});

module.exports = router;
