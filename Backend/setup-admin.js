// setup-admin.js - Run this file once to create admin account
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

async function setupAdmin() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/fundsystem");
        
        const adminPhone = "01700000000"; // Change this to your admin phone
        const adminPassword = "Admin@123"; // Change this to strong password
        
        const existingAdmin = await User.findOne({ phone: adminPhone });
        
        if (existingAdmin) {
            console.log("Admin account already exists!");
            process.exit();
        }
        
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const admin = new User({
            phone: adminPhone,
            password: hashedPassword,
            role: "admin"
        });
        
        await admin.save();
        
        console.log("✅ Admin account created successfully!");
        console.log(`📱 Phone: ${adminPhone}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log("⚠️  Please change these credentials after first login!");
        
        process.exit();
        
    } catch (error) {
        console.error("Error creating admin:", error);
        process.exit(1);
    }
}

setupAdmin();