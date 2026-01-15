const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_dev';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '1d';

/**
 * Generate a JSON Web Token for a user
 * @param {Object} user - The user object
 * @returns {String} - The signed JWT
 */
const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, role: user.role, isAdmin: user.isAdmin },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
    );
};

/**
 * Generate a random token (hex string)
 * @param {Number} size - Number of bytes
 * @returns {String} - Hex string
 */
const generateRandomToken = (size = 32) => {
    return crypto.randomBytes(size).toString('hex');
};

/**
 * Generate a numeric OTP
 * @param {Number} length - Length of OTP
 * @returns {String} - OTP string
 */
const generateOTP = (length = 6) => {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min)).toString();
};

module.exports = {
    generateToken,
    generateRandomToken,
    generateOTP
};
