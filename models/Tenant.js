const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Tenant full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [25, 'Phone number cannot exceed 25 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    identificationNumber: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'ID number cannot exceed 50 characters']
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'An allocated room is required']
    },
    moveInDate: {
      type: Date,
      required: [true, 'Move-in date is required'],
      default: Date.now
    },
    active: {
      type: Boolean,
      default: true
    },
    vacatedDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Tenant', tenantSchema);
