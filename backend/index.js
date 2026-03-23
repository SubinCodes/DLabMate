const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/authRoutes");
const clinicRoutes = require('./routes/clinicRoutes'); 

// IMPORT YOUR CLINIC MODEL
const Clinic = require('./models/Clinic'); 

const app = express();

const MONGO_URI = "mongodb+srv://subinpradhan2015:w07HNhPug4lQX4At@dlabmate.mdvg0cf.mongodb.net/dlabmate?retryWrites=true&w=majority";
const PORT = 5000;
const JWT_SECRET = "your_secret_key_here";

app.use(cors()); 
app.use(express.json()); 

// --- ADMIN LOGIN ---
app.post('/api/admin/login', async (req, res) => {
    const { email, passcode } = req.body;
    if (email === "admin@dlabmate.com" && passcode === "adminPassword123") {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
        return res.status(200).json({ success: true, token: token });
    } 
    return res.status(401).json({ success: false, message: "Invalid Credentials" });
});

// --- UPDATED ADMIN STATS (WITH REMOVED LOGIC) ---
app.get('/api/admin/stats', async (req, res) => {
    try {
        // 1. Fetch ALL clinics (including removed ones for counting)
        const allClinics = await Clinic.find({}).sort({ createdAt: -1 });

        // 2. Calculate Stats
        // Total Clinics should generally mean 'Total Active/Inactive' (not including deleted/removed)
        const total = allClinics.filter(c => c.status !== 'Removed').length;
        
        const active = allClinics.filter(c => c.status === 'Active').length;
        const inactive = allClinics.filter(c => c.status === 'Inactive').length;
        
        // Count clinics specifically marked as 'Removed'
        const removed = allClinics.filter(c => c.status === 'Removed').length;
        
        // Recent logic: Added in last 24 hours AND not removed
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = allClinics.filter(c => 
            new Date(c.createdAt) > oneDayAgo && c.status !== 'Removed'
        ).length;

        res.status(200).json({
            success: true,
            stats: { 
                total, 
                recent, 
                active, 
                inactive: inactive || 0, 
                removed: removed || 0 
            },
            // Filter out 'Removed' clinics so they don't show up in your main table list
            clinics: allClinics.filter(c => c.status !== 'Removed') 
        });
    } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        res.status(500).json({ message: "Error fetching data from database" });
    }
});

app.use("/api/auth", authRoutes);
app.use('/api/admin', clinicRoutes); 

mongoose.connect(MONGO_URI)
.then(() => console.log(`✅ DB Connected: ${mongoose.connection.name}`))
.catch((err) => console.log("❌ DB Connection Failed:", err));

app.listen(PORT, () => console.log(`🚀 Backend on port ${PORT}`));