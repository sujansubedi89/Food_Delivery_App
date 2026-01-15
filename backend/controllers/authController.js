const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken, generateRandomToken, generateOTP } = require('../utils/tokenUtils');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendPasswordResetConfirmation, sendEmailOTP } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
exports.signup = async (req, res) => {
    try {
        const { name, email, password, phoneNumber, role, restaurantDetails } = req.body;
        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            if (!user.emailVerified && !user.phoneVerified) {
                return res.status(409).json({
                    message: 'User already exists but is not verified.',
                    unverified: true,
                    user: { name: user.name, email: user.email, phoneNumber: user.phoneNumber }
                });
            }
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = generateRandomToken();

        // Create user
        user = new User({
            name,
            email,
            passwordHash,
            phoneNumber,
            role: role || 'customer',
            restaurantDetails: role === 'restaurant' ? restaurantDetails : undefined,
            emailVerified: false,
            phoneVerified: false,
            verificationToken
        });

        await user.save();

        res.status(201).json({
            message: 'Registration successful! Please verify your account using OTP.',
            emailSent: false
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check verification
        if (!user.emailVerified && !user.phoneVerified) {
            return res.status(403).json({
                message: 'Please verify your account to continue.',
                needsVerification: true,
                email: user.email,
                phoneNumber: user.phoneNumber
            });
        }

        const token = generateToken(user);
        const isApproved = user.role === 'restaurant' ? (user.restaurantDetails?.isApproved || false) : true;

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAdmin: user.isAdmin,
                profileImage: user.profileImage,
                isApproved
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

/**
 * @desc    Send Phone OTP
 * @route   POST /api/auth/send-phone-otp
 * @access  Public
 */
exports.sendPhoneOTP = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        let user = await User.findOne({ phoneNumber });
        if (!user) {
            const altPhone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : `+${phoneNumber}`;
            user = await User.findOne({ phoneNumber: altPhone });
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        const twilioPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
        const otp = generateOTP(6);

        user.phoneOTP = otp;
        user.phoneOTPExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        sendSMS(twilioPhone, `Your FoodMandu AI verification code is: ${otp}`)
            .then(result => { if (result.mock) console.log('[MOCK SMS LOGGED IN BACKGROUND]'); })
            .catch(err => console.error('Background SMS Error:', err));

        res.json({ message: 'OTP sent successfully', mock: false });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ message: err.message || 'Failed to send OTP' });
    }
};

/**
 * @desc    Verify Phone OTP
 * @route   POST /api/auth/verify-phone-otp
 * @access  Public
 */
exports.verifyPhoneOTP = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        let user = await User.findOne({ phoneNumber });
        if (!user) {
            const altPhone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : `+${phoneNumber}`;
            user = await User.findOne({ phoneNumber: altPhone });
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.phoneVerified) return res.json({ message: 'Phone already verified', verified: true });
        if (!user.phoneOTP || user.phoneOTP !== otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (user.phoneOTPExpires < Date.now()) return res.status(400).json({ message: 'OTP expired' });

        user.phoneVerified = true;
        user.phoneOTP = undefined;
        user.phoneOTPExpires = undefined;
        await user.save();

        const token = generateToken(user);
        res.json({
            message: 'Phone verified successfully',
            verified: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin }
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Send Email OTP
 * @route   POST /api/auth/send-email-otp
 * @access  Public
 */
exports.sendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

        const otp = generateOTP(6);
        user.emailOTP = otp;
        user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        sendEmailOTP(email, user.name, otp).catch(err => console.error('Background Email OTP Error:', err));
        res.json({ message: 'OTP sent to email', mock: false });
    } catch (err) {
        console.error('Send email OTP error:', err);
        res.status(500).json({ message: err.message || 'Failed to send email OTP' });
    }
};

/**
 * @desc    Verify Email OTP
 * @route   POST /api/auth/verify-email-otp
 * @access  Public
 */
exports.verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.emailVerified) return res.json({ message: 'Email already verified', verified: true });
        if (!user.emailOTP || user.emailOTP !== otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (user.emailOTPExpires < Date.now()) return res.status(400).json({ message: 'OTP expired' });

        user.emailVerified = true;
        user.emailOTP = undefined;
        user.emailOTPExpires = undefined;
        await user.save();

        const token = generateToken(user);
        res.json({
            message: 'Email verified successfully',
            verified: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin }
        });
    } catch (err) {
        console.error('Verify email OTP error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Request Password Reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const resetToken = generateRandomToken();
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        await sendPasswordResetEmail(user.email, user.name, resetToken);
        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Reset Password with Token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        await sendPasswordResetConfirmation(user.email, user.name);
        res.json({ message: 'Password reset successful! You can now log in with your new password.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Resend Verification Email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

        const verificationToken = generateRandomToken();
        user.verificationToken = verificationToken;
        await user.save();

        sendVerificationEmail(user.email, user.name, verificationToken).catch(err => console.error('Background Email Error:', err));
        res.json({ message: 'Verification email sent! Please check your inbox.' });
    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
