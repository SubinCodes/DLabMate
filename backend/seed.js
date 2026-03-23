// backend/seed.js
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = "mongodb+srv://subinpradhan2015:w07HNhPug4lQX4At@dlabmate.mdvg0cf.mongodb.net/dlabmate?retryWrites=true&w=majority";

const seedDB = async () => {
    try {
        console.log("Connecting to Atlas...");
        await mongoose.connect(MONGO_URI);
        
        console.log("Cleaning old users...");
        await User.deleteMany({}); 

        // Define the users to be created
        const users = [
            {
                email: "admin@dlabmate.com",
                password: "adminPassword123",
                role: "admin"
            },
            {
                email: "dlabmate.np@gmail.com",
                password: "testpassword",
                role: "labuser"
            }
        ];

        await User.insertMany(users);
        
        console.log("-----------------------------------------");
        console.log("SUCCESS! Accounts added to Atlas:");
        users.forEach(u => {
            console.log(`Role: ${u.role} | Email: ${u.email} | Password: ${u.password}`);
        });
        console.log("-----------------------------------------");

        process.exit();
    } catch (err) {
        console.error("SEED ERROR:", err);
        process.exit(1);
    }
};

seedDB();