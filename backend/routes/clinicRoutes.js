const express = require('express');
const router = express.Router();
const Clinic = require('../models/Clinic');

// --- DASHBOARD STATS & LIST ---
// @route   GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        // 1. Fetch all clinics that are NOT removed for the main table
        const clinicsForTable = await Clinic.find({ status: { $ne: 'Removed' } }).sort({ createdAt: -1 });
        
        // 2. Calculate Counts for Stats Cards
        // Active and Inactive counts
        const active = await Clinic.countDocuments({ status: 'Active' });
        const inactive = await Clinic.countDocuments({ status: 'Inactive' });
        
        // Count clinics specifically marked as 'Removed'
        const removedCount = await Clinic.countDocuments({ status: 'Removed' });
        
        // Total should usually reflect the current workable clinics (Active + Inactive)
        const total = active + inactive;

        // Recently added (last 7 days) and not removed
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentlyAdded = await Clinic.countDocuments({ 
            createdAt: { $gte: sevenDaysAgo },
            status: { $ne: 'Removed' }
        });

        res.json({
            stats: { 
                total, 
                active, 
                inactive, 
                recent: recentlyAdded, 
                removed: removedCount // Now dynamically updated
            },
            clinics: clinicsForTable // Only sends visible clinics to the UI
        });
    } catch (err) {
        console.error("Error in /stats:", err.message);
        res.status(500).json({ message: "Error fetching dashboard data" });
    }
});

// --- ADD NEW CLINIC ---
// @route   POST /api/admin/add
router.post('/add', async (req, res) => {
    try {
        const { clinicName, clinicEmail, passcode, location, contactNumber } = req.body;

        const existingClinic = await Clinic.findOne({ clinicEmail });
        if (existingClinic) {
            return res.status(400).json({ message: "Clinic with this email already exists" });
        }

        const newClinic = new Clinic({
            clinicName,
            clinicEmail,
            passcode,
            location,
            contactNumber,
            status: 'Active',
            totalCases: 0
        });

        await newClinic.save();
        res.status(201).json({ message: "Clinic added successfully", clinic: newClinic });
    } catch (err) {
        console.error("Error in /add:", err.message);
        res.status(500).json({ message: "Failed to add clinic" });
    }
});

// --- GET SINGLE CLINIC DETAILS ---
// @route   GET /api/admin/clinic/:id
router.get('/clinic/:id', async (req, res) => {
    try {
        const clinic = await Clinic.findById(req.params.id);
        if (!clinic) {
            return res.status(404).json({ message: "Clinic not found" });
        }
        res.json(clinic);
    } catch (err) {
        console.error("Error in GET /clinic/:id:", err.message);
        res.status(500).json({ message: "Server error fetching clinic details" });
    }
});

// --- UPDATE CLINIC ---
// @route   PUT /api/admin/clinic/:id
router.put('/clinic/:id', async (req, res) => {
    try {
        const updatedClinic = await Clinic.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        if (!updatedClinic) {
            return res.status(404).json({ message: "Clinic not found" });
        }
        res.json(updatedClinic);
    } catch (err) {
        console.error("Error in PUT /clinic/:id:", err.message);
        res.status(500).json({ message: "Failed to update clinic" });
    }
});

// --- SOFT DELETE CLINIC (UPDATE STATUS TO REMOVED) ---
// @route   DELETE /api/admin/clinic/:id
router.delete('/clinic/:id', async (req, res) => {
    try {
        // Instead of hard delete, we update the status to 'Removed'
        const removedClinic = await Clinic.findByIdAndUpdate(
            req.params.id, 
            { status: 'Removed' }, 
            { new: true }
        );

        if (!removedClinic) {
            return res.status(404).json({ message: "Clinic not found" });
        }
        
        res.json({ message: "Clinic moved to removed list successfully" });
    } catch (err) {
        console.error("Error in DELETE /clinic/:id:", err.message);
        res.status(500).json({ message: "Failed to remove clinic" });
    }
});

module.exports = router;