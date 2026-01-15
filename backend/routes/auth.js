const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', authController.signup);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/send-phone-otp
router.post('/send-phone-otp', authController.sendPhoneOTP);

// POST /api/auth/verify-phone-otp
router.post('/verify-phone-otp', authController.verifyPhoneOTP);

// POST /api/auth/send-email-otp
router.post('/send-email-otp', authController.sendEmailOTP);

// POST /api/auth/verify-email-otp
router.post('/verify-email-otp', authController.verifyEmailOTP);

// GET /api/auth/verify-email/:token - Verify email with token (keep this if still used, though OTP is preferred)
// Note: Logic for this specific route was inline in original file but not in new controller.
// I'll migrate it to controller or keep inline if it's deprecated. 
// Given the user wants "Change Huge", I should probably add it to controller if I missed it? 
// Actually, looking at controller, I missed `verifyEmailWithToken` (the GET one).
// I will add it to the controller in a fix step or just inline it here if it's minor?
// No, improved module structure means NO inline logic. I will add it to controller now.
// Wait, I can't edit the controller file I just made in the same turn easily without re-writing it.
// I will rewrite this file to have the routes, and I will add the missing controller method in a subsequent step if needed.
// However, the original file had `router.get('/verify-email/:token', ...)`
// I will implement it in the controller `verifyEmailWithToken`.

// POST /api/auth/resend-verification
router.post('/resend-verification', authController.resendVerification);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', authController.resetPassword);

// Missing method from controller: verifyEmailWithToken
// I'll assume I will add it to controller.
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');

router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    await sendWelcomeEmail(user.email, user.name);

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;