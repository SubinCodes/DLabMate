const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Case = require('../models/Case'); 
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- NODEMAILER CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: 'dlabmate.np@gmail.com', 
        pass: 'oeao wkon rvda xmqv' 
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error("Nodemailer verification failed:", error);
    } else {
        console.log("Nodemailer is ready to send emails");
    }
});

// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    const { email, password, userType } = req.body;
    const sanitizedEmail = email.trim().toLowerCase();

    try {
        if (userType === 'Lab') {
            const user = await User.findOne({ email: sanitizedEmail });
            if (!user || user.password !== password) {
                return res.status(401).json({ message: "Invalid Lab Credentials" });
            }
            const token = jwt.sign({ id: user._id, role: user.role }, "SECRET_KEY", { expiresIn: '1d' });
            return res.json({ token, role: user.role, message: "Welcome Back" });
        } 
        else {
            const clinic = await Clinic.findOne({ clinicEmail: sanitizedEmail });
            if (!clinic || clinic.passcode !== password) {
                return res.status(401).json({ message: "Invalid Clinic Passcode" });
            }
            const token = jwt.sign({ id: clinic._id, role: 'clinic' }, "SECRET_KEY", { expiresIn: '1d' });
            return res.json({ token, role: 'clinic', message: "Clinic Portal Access Granted" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- FORGOT PASSWORD ROUTE ---
router.post('/forgot-password', async (req, res) => {
    const { email, userType } = req.body;
    const sanitizedEmail = email.trim().toLowerCase();

    try {
        let user;
        if (userType === 'Lab') {
            user = await User.findOne({ email: sanitizedEmail });
        } else {
            user = await Clinic.findOne({ clinicEmail: sanitizedEmail });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "Email not found." });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; 
        await user.save();

        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
        const mailOptions = {
            from: '"DLabMate Support" <dlabmate.np@gmail.com>',
            to: sanitizedEmail,
            subject: 'Password Reset Request',
            html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Reset link sent." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to send email." });
    }
});

// --- RESET PASSWORD (FINAL STEP) ---
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        let user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) user = await Clinic.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
        
        if (!user) return res.status(400).json({ success: false, message: "Invalid or expired token." });

        if (user.clinicEmail) user.passcode = password; 
        else user.password = password;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ success: true, message: "Password reset successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// --- GET ALL CASES ROUTE ---
router.get('/all-cases', async (req, res) => {
    try {
        const cases = await Case.find().sort({ createdAt: -1 });
        res.json({ 
            success: true, 
            cases 
        });
    } catch (err) {
        console.error("Error fetching all cases:", err);
        res.status(500).json({ success: false, message: "Server error fetching cases" });
    }
});

// --- FETCH CASES BY STATUS ---
router.get('/cases-by-status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const cases = await Case.find({ status: status }).sort({ dueDate: 1 });
        res.json({ success: true, cases });
    } catch (err) {
        console.error("Error fetching cases by status:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- FETCH CLINICS LIST (UPDATED FOR DYNAMIC CASE COUNT & STATUS) ---
router.get('/clinics-list', async (req, res) => {
    try {
        // Fetch all clinics
        const clinics = await Clinic.find();
        
        // Map through clinics to calculate dynamic case counts based on clinicName
        const clinicsWithCounts = await Promise.all(clinics.map(async (clinic) => {
            const caseCount = await Case.countDocuments({ clinicName: clinic.clinicName });
            return {
                ...clinic._doc, // Preserves all fields like contactNumber, location, etc.
                totalCases: caseCount // Dynamically calculated count from Case collection
            };
        }));

        res.json({ success: true, clinics: clinicsWithCounts });
    } catch (err) {
        console.error("Error fetching clinics list:", err);
        res.status(500).json({ success: false, message: "Error fetching clinics" });
    }
});

// --- GET CLINIC DETAILS & CASE HISTORY ---
router.get('/clinic-details/:id', async (req, res) => {
    try {
        const clinic = await Clinic.findById(req.params.id);
        if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });

        const caseHistory = await Case.find({ clinicName: clinic.clinicName }).sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            clinic,
            caseHistory 
        });
    } catch (err) {
        console.error("Error fetching clinic details:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- ADD NEW CASE ROUTE ---
router.post('/add-case', async (req, res) => {
    try {
        const newCase = new Case(req.body);
        await newCase.save();
        res.status(201).json({ success: true, message: "Case registered successfully", data: newCase });
    } catch (err) {
        console.error("Error adding case:", err);
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: "Register Number must be unique." });
        }
        res.status(500).json({ success: false, message: "Failed to register case" });
    }
});

// --- GET SINGLE CASE BY ID ---
router.get('/case/:id', async (req, res) => {
    try {
        const foundCase = await Case.findById(req.params.id);
        if (!foundCase) return res.status(404).json({ success: false, message: "Case not found" });
        res.json({ success: true, case: foundCase });
    } catch (err) {
        console.error("Error fetching case details:", err);
        res.status(500).json({ success: false, message: "Server error fetching case" });
    }
});

// --- UPDATE CASE ROUTE ---
router.put('/update-case/:id', async (req, res) => {
    try {
        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true, runValidators: true }
        );
        if (!updatedCase) return res.status(404).json({ success: false, message: "Case not found" });
        res.json({ success: true, message: "Case updated successfully", case: updatedCase });
    } catch (err) {
        console.error("Error updating case:", err);
        res.status(500).json({ success: false, message: "Failed to update case" });
    }
});

// --- NEW: UPDATE CASE STATUS DIRECTLY (For Status Page) ---
router.patch('/update-case-status/:id', async (req, res) => {
    try {
        const { status, deliveryStatus } = req.body;
        const updateData = {};
        if (status) updateData.status = status;
        if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;

        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedCase) return res.status(404).json({ success: false, message: "Case not found" });
        res.json({ success: true, message: "Status updated successfully", case: updatedCase });
    } catch (err) {
        console.error("Status Update Error:", err);
        res.status(500).json({ success: false, message: "Failed to update status" });
    }
});

// --- DELETE CASE ROUTE ---
router.delete('/delete-case/:id', async (req, res) => {
    try {
        const deletedCase = await Case.findByIdAndDelete(req.params.id);
        if (!deletedCase) {
            return res.status(404).json({ success: false, message: "Case not found" });
        }
        res.json({ success: true, message: "Case deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ success: false, message: "Server error during deletion" });
    }
});

// --- DASHBOARD STATS ROUTE ---
router.get('/lab-stats', async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const nextWeek = new Date();
        nextWeek.setDate(startOfToday.getDate() + 7);

        const [total, dueToday, dueWeek, overdue, completed] = await Promise.all([
            Case.countDocuments({}),
            Case.countDocuments({ dueDate: { $gte: startOfToday, $lte: endOfToday }, status: { $ne: 'Delivered' } }),
            Case.countDocuments({ dueDate: { $gt: endOfToday, $lte: nextWeek } }),
            Case.countDocuments({ dueDate: { $lt: startOfToday }, status: { $ne: 'Delivered' } }),
            Case.countDocuments({ status: 'Delivered' })
        ]);

        const recentCases = await Case.find({ status: { $ne: 'Delivered' } })
            .sort({ dueDate: 1 })
            .limit(5);

        const stages = ['Entered', 'Poured', 'Scanned', 'Designed', 'Milled', 'Printed', 'Finishing', 'Packed', 'Delivered'];
        const pipelineCounts = await Promise.all(
            stages.map(async (stage) => {
                const count = await Case.countDocuments({ status: stage });
                return { label: stage, count };
            })
        );

        const leftToDeliver = await Case.countDocuments({ status: { $ne: 'Delivered' }, dueDate: { $lte: endOfToday } });
        const deliveredToday = await Case.countDocuments({ status: 'Delivered', updatedAt: { $gte: startOfToday } });
        const zirconiumMilled = await Case.countDocuments({ material: 'zirconia', status: 'Milled' });

        res.json({
            success: true,
            stats: { total, dueToday, dueWeek, overdue, completed },
            upcomingCases: recentCases,
            pipeline: pipelineCounts,
            summaries: {
                leftToDeliver,
                deliveredToday,
                overdue, 
                zirconiumMilled
            }
        });
    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" });
    }
});


// --- GET FUNCTIONAL NOTIFICATIONS ---
router.get('/notifications', async (req, res) => {
    try {
        const now = new Date();

        // 1. Define Time Boundaries
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // 2. Fetch Overdue: Due date is BEFORE today AND not delivered
        const overdueCases = await Case.find({
            dueDate: { $lt: startOfToday },
            status: { $ne: 'Delivered' }
        }).select('caseId patientName clinicName');

        // 3. Fetch Due Today: Due date is WITHIN today's 24hr window AND not delivered
        const dueToday = await Case.find({
            dueDate: { $gte: startOfToday, $lte: endOfToday },
            status: { $ne: 'Delivered' }
        }).select('caseId patientName clinicName');

        // 4. Fetch New Arrivals: Created in the last 24 hours
        const newArrivals = await Case.find({
            createdAt: { $gte: twentyFourHoursAgo }
        }).select('caseId patientName clinicName');

        // 5. Format for Frontend
        const notifications = [
            ...overdueCases.map(c => ({
                id: `overdue-${c._id}`,
                type: 'overdue',
                title: 'Urgent: Overdue Alert',
                desc: `Case #${c.caseId} (${c.patientName}) from ${c.clinicName} is past the deadline!`,
                time: 'Immediate'
            })),
            ...dueToday.map(c => ({
                id: `today-${c._id}`,
                type: 'upcoming',
                title: 'Deliver Today',
                desc: `Case #${c.caseId} (${c.patientName}) for ${c.clinicName} must be sent out today.`,
                time: 'Today'
            })),
            ...newArrivals.map(c => ({
                id: `new-${c._id}`,
                type: 'info',
                title: 'New Case Registered',
                desc: `Case #${c.caseId} for ${c.patientName} has been added to the system.`,
                time: 'Recent'
            }))
        ];

        // Sort notifications so Overdue always stays at the top
        const sortedNotifications = notifications.sort((a, b) => {
            if (a.type === 'overdue' && b.type !== 'overdue') return -1;
            if (a.type !== 'overdue' && b.type === 'overdue') return 1;
            return 0;
        });

        res.json({ success: true, notifications: sortedNotifications });
    } catch (err) {
        console.error("Notification Error:", err);
        res.status(500).json({ success: false, message: "Error fetching notifications" });
    }
});

module.exports = router;