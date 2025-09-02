const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const generateUserId = () => {
    return uuidv4();
};

const generateToken = (payload, secret = process.env.JWT_SECRET, expiresIn = '1h') => {
    return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token, secret = process.env.JWT_SECRET) => {
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

const extractToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); 
};

module.exports = {
    generateUserId,
    generateToken,
    verifyToken,
    hashPassword,
    comparePassword,
    extractToken
};