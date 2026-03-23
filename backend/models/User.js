const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        // Added 'labuser' to the allowed values to prevent ValidationErrors
        enum: ['admin', 'staff', 'labuser'], 
        default: 'staff' 
    },
    
    // --- ADDED FOR PASSWORD RESET ---
    resetPasswordToken: { 
        type: String 
    },
    resetPasswordExpires: { 
        type: Date 
    }
});

module.exports = mongoose.model('User', UserSchema);