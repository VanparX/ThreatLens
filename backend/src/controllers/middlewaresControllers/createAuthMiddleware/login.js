const Joi = require('joi');
const mongoose = require('mongoose');

const authUser = require('./authUser');

const login = async (req, res, { userModel }) => {
  try {
    const { email, password } = req.body;

    // 🔥 DEMO LOGIN OVERRIDE (TOP PRIORITY)
    if (
      email === 'Pardhu@threatlens' &&
      password === 'threatlens123'
    ) {
      return res.status(200).json({
        success: true,
        result: {
          _id: 'demo123',
          name: 'Pardhu',
          surname: 'Admin',
          email: 'Pardhu@threatlens',
          role: 'owner',
          photo: '',
          token: 'demo-token',
        },
      });
    }

    const UserPasswordModel = mongoose.model(userModel + 'Password');
    const UserModel = mongoose.model(userModel);

    // 🔍 VALIDATION
    const objectSchema = Joi.object({
      email: Joi.string()
        .email({ tlds: { allow: true } })
        .required(),
      password: Joi.string().required(),
    });

    const { error } = objectSchema.validate({ email, password });

    if (error) {
      return res.status(409).json({
        success: false,
        result: null,
        message: 'Invalid/Missing credentials.',
        errorMessage: error.message,
      });
    }

    const user = await UserModel.findOne({
      email: email,
      removed: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No account with this email has been registered.',
      });
    }

    const databasePassword = await UserPasswordModel.findOne({
      user: user._id,
      removed: false,
    });

    if (!user.enabled) {
      return res.status(409).json({
        success: false,
        result: null,
        message: 'Your account is disabled, contact admin',
      });
    }

    // 🔐 ORIGINAL AUTH FLOW
    authUser(req, res, {
      user,
      databasePassword,
      password,
      UserPasswordModel,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = login;