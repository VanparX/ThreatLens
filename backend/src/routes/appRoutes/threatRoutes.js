const express = require('express');
const router = express.Router();

// ✅ Use relative path (NO @ alias)
const {
  createThreat,
  getThreats,
} = require('../../controllers/appControllers/ThreatController');

// Routes
router.post('/threat', createThreat);
router.get('/threat', getThreats);

module.exports = router;