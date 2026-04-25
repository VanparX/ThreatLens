const mongoose = require('mongoose');

const threatSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
    },
    threatType: {
      type: String,
      enum: ['Malware', 'Phishing', 'DDoS', 'Ransomware'],
      required: true,
    },
    riskScore: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Detected', 'Blocked', 'Allowed'],
      default: 'Detected',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ✅ IMPORTANT (CommonJS export)
module.exports = mongoose.model('Threat', threatSchema);