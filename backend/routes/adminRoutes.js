const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
    const { email, passcode } = req.body;

    try {
        // Simple logic: Replace this with a database check if you have an Admins table
        if (email === "admin@dlabmate.com" && passcode === "admin123") {
            
            // Generate a token valid for 24h
            const token = jwt.sign(
                { role: 'admin' }, 
                process.env.JWT_SECRET || 'your_secret_key', 
                { expiresIn: '1d' }
            );

            return res.json({ 
                success: true, 
                token: token,
                message: "Login successful" 
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid admin email or passcode" 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;