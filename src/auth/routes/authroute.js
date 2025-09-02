const express = require('express');
const authService = require('../services/authservice');
const { authenticateToken } = require('../../../middlewares/authMiddleware');

const router = express.Router();



router.post('/register', async (req, res, next) => {
    try {
        const { full_name, contact_number, email, password, role } = req.body;

        if (!full_name || !contact_number || !email || !password) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'All fields are required: full_name, contact_number, email, password'
            });
        }

        const result = await authService.register({ full_name, contact_number, email, password, role });

        res.status(201).json({
            message: 'User registered successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Email and password are required'
            });
        }

        const result = await authService.login({ email, password });

        res.json({
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const user = await authService.getProfile(req.user.id);
        res.json({
            message: 'Profile retrieved successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

router.post('/logout', authenticateToken, async (req, res, next) => {
    try {
        console.log('req.user.id', req.user.id)
        await authService.logout(req.user.id);

        res.json({
            message: 'Logout successful',
            data: { logoutTime: new Date().toISOString() }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/deactivate', authenticateToken, async (req, res, next) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Password is required to deactivate account'
            });
        }

        const result = await authService.deactivateAccount(req.user.id, password);

        res.json({
            message: 'Account deactivated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/delete', authenticateToken, async (req, res, next) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Password is required to delete account'
            });
        }

        const result = await authService.deleteAccount(req.user.id, password);

        res.json({
            message: 'Account deleted successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});



router.get('/sessions', authenticateToken, async (req, res, next) => {
    try {
        res.json({
            message: 'Session endpoint - implement session tracking as needed'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;