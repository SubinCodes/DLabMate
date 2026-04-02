const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Clinic = require('../models/Clinic'); 
const Case = require('../models/Case');

// --- ADMIN LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    const { email, passcode } = req.body;
    try {
        if (email === "admin@dlabmate.com" && passcode === "admin123") {
            const token = jwt.sign(
                { role: 'admin' }, 
                process.env.JWT_SECRET || 'your_secret_key', 
                { expiresIn: '1d' }
            );
            return res.json({ success: true, token: token, message: "Login successful" });
        } else {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- ADMIN STATS ROUTE (THE FIX) ---
router.get('/stats', async (req, res) => {
    try {
        // Robust aggregation to join Clinics with Case counts
        const clinicsWithCounts = await Clinic.aggregate([
            { $match: { status: { $ne: 'Removed' } } },
            {
                $lookup: {
                    from: 'cases', // Matches your lowercase collection name
                    let: { clinic_name: "$clinicName" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [
                                        { $trim: { input: { $toLower: "$clinicName" } } },
                                        { $trim: { input: { $toLower: "$$clinic_name" } } }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'caseData'
                }
            },
            {
                $addFields: {
                    totalCases: { $size: '$caseData' } // Creates the count field
                }
            },
            { $project: { caseData: 0 } }, 
            { $sort: { createdAt: -1 } }
        ]);
        
        const active = await Clinic.countDocuments({ status: 'Active' });
        const inactive = await Clinic.countDocuments({ status: 'Inactive' });
        const total = active + inactive;

        // Recently added (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = await Clinic.countDocuments({ 
            createdAt: { $gte: sevenDaysAgo },
            status: { $ne: 'Removed' }
        });

        res.json({
            success: true,
            stats: { total, active, inactive, recent, removed: 0 },
            clinics: clinicsWithCounts 
        });
    } catch (err) {
        console.error("Admin Stats Error:", err);
        res.status(500).json({ success: false, message: "Error fetching data" });
    }
});

module.exports = router;