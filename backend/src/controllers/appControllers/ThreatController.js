const Threat = require('../../models/appModels/Threat');

// CREATE Threat
const createThreat = async (req, res) => {
  try {
    const threat = new Threat(req.body);
    const saved = await threat.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all Threats
const getThreats = async (req, res) => {
  try {
    const threats = await Threat.find().sort({ createdAt: -1 });
    res.status(200).json(threats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createThreat,
  getThreats,
};