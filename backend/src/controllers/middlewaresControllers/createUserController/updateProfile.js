const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const updateProfile = async (userModel, req, res) => {
  const User = mongoose.model(userModel);

  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 🚫 Prevent demo modification
  if (userProfile.email === 'admin@demo.com') {
    return res.status(403).json({
      success: false,
      result: null,
      message: "You cannot update demo account",
    });
  }

  try {
    // 🔥 Basic updates
    let updates = {
      email: req.body.email,
      name: req.body.name,
      surname: req.body.surname,
    };

    // Optional photo
    if (req.body.photo) {
      updates.photo = req.body.photo;
    }

    // 🔐 Password update logic
    if (req.body.oldPassword && req.body.newPassword) {
      const user = await User.findById(userProfile._id);

      const isMatch = await bcrypt.compare(
        req.body.oldPassword,
        user.password
      );

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Old password is incorrect',
        });
      }

      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      updates.password = hashedPassword;
    }

    // 🔥 Update user
    const result = await User.findOneAndUpdate(
      { _id: userProfile._id, removed: false },
      { $set: updates },
      { new: true }
    ).exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No profile found by this id: ' + userProfile._id,
      });
    }

    return res.status(200).json({
      success: true,
      result: {
        _id: result._id,
        enabled: result.enabled,
        email: result.email,
        name: result.name,
        surname: result.surname,
        photo: result.photo,
        role: result.role,
        token,
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = updateProfile;