const mongoose = require('mongoose');

const ClinicSchema = new mongoose.Schema({
    // --- ADDED CLINIC ID AS A UNIQUE KEY ---
    clinicId: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    clinicEmail: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true 
    },
    passcode: { type: String, required: true }, 
    clinicName: { type: String, required: true },
    location: { type: String, required: true },
    contactNumber: { type: String, required: true },
    totalCases: { type: Number, default: 0 },
    status: { type: String, default: 'Active' }, 
    createdAt: { type: Date, default: Date.now },
    
    // --- ADDED FOR PASSWORD RESET ---
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
});

module.exports = mongoose.model('Clinic', ClinicSchema);