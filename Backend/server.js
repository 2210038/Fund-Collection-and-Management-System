const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Donation = require("./models/Donation");
const User = require("./models/User");

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// MONGODB CONNECTION
// ===============================
mongoose.connect("mongodb://127.0.0.1:27017/fundsystem")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB connection error:", err));


// ===============================
// REGISTER
// ===============================
app.post("/api/register", async (req, res) => {

    const { phone, password } = req.body;

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
        return res.json({
            success: false,
            message: "Account already exists. Please login."
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
        phone,
        password: hashedPassword
    });

    res.json({
        success: true,
        message: "Account created successfully"
    });

});


// ===============================
// LOGIN
// ===============================
app.post("/api/login", async (req, res) => {

    const { phone, password } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
        return res.json({
            success: false,
            message: "User not found"
        });
    }

    const match = await bcrypt.compare(
        password,
        user.password
    );

    if (!match) {
        return res.json({
            success: false,
            message: "Wrong password"
        });
    }

    const token = jwt.sign(
        { id: user._id },
        "secretkey"
    );

    res.json({
        success: true,
        token
    });

});


// ===============================
// DONATE
// ===============================
app.post("/api/donate", async (req, res) => {

    try {

        const {
            donorName,
            phone,
            campaign,
            amount,
            bkashNumber,
            transactionId
        } = req.body;

        if (!donorName || !phone || !campaign || !amount) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const donation = new Donation({
            donorName,
            phone,
            campaign,
            amount,
            bkashNumber,
            transactionId
        });

        await donation.save();

        res.json({
            success: true,
            message: "Donation saved successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error while saving donation"
        });

    }

});


// ===============================
// CAMPAIGN SUMMARY
// ===============================
app.get("/api/campaign-summary", async (req, res) => {

    try {

        const donations = await Donation.find();

        const summary = {
            gaza: { total: 0, donors: 0 },
            flood: { total: 0, donors: 0 },
            education: { total: 0, donors: 0 },
            medical: { total: 0, donors: 0 }
        };

        donations.forEach(donation => {

            const campaign = donation.campaign;

            if (summary[campaign]) {
                summary[campaign].total += Number(donation.amount);
                summary[campaign].donors += 1;
            }

        });

        res.json({
            success: true,
            summary
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});

// ===============================
// ADMIN MIDDLEWARE
// ===============================
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Access denied" 
            });
        }
        
        const decoded = jwt.verify(token, "secretkey");
        const user = await User.findById(decoded.id);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Admin access required" 
            });
        }
        
        req.admin = user;
        next();
        
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: "Invalid token" 
        });
    }
};

// ===============================
// ADMIN DASHBOARD STATS
// ===============================
app.get("/api/admin/stats", verifyAdmin, async (req, res) => {
    try {
        const totalDonations = await Donation.countDocuments();
        const totalAmount = await Donation.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        
        const totalUsers = await User.countDocuments({ role: 'user' });
        
        const campaignStats = await Donation.aggregate([
            {
                $group: {
                    _id: "$campaign",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const recentDonations = await Donation.find()
            .sort({ date: -1 })
            .limit(10);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayDonations = await Donation.countDocuments({
            date: { $gte: today }
        });
        
        const todayAmount = await Donation.aggregate([
            { $match: { date: { $gte: today } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalDonations,
                totalAmount: totalAmount[0]?.total || 0,
                totalUsers,
                todayDonations,
                todayAmount: todayAmount[0]?.total || 0,
                campaignStats,
                recentDonations
            }
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ===============================
// GET ALL DONATIONS (with filters)
// ===============================
app.get("/api/admin/donations", verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, campaign, status, search } = req.query;
        
        let query = {};
        
        if (campaign && campaign !== 'all') {
            query.campaign = campaign;
        }
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (search) {
            query.$or = [
                { donorName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { transactionId: { $regex: search, $options: 'i' } }
            ];
        }
        
        const donations = await Donation.find(query)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Donation.countDocuments(query);
        
        res.json({
            success: true,
            donations,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ===============================
// UPDATE DONATION STATUS
// ===============================
app.put("/api/admin/donation/:id/status", verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        
        if (!['pending', 'verified', 'cancelled'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid status" 
            });
        }
        
        const donation = await Donation.findByIdAndUpdate(
            id,
            { 
                status,
                verifiedAt: status === 'verified' ? new Date() : null,
                verifiedBy: status === 'verified' ? req.admin._id : null
            },
            { new: true }
        );
        
        if (!donation) {
            return res.status(404).json({ 
                success: false, 
                message: "Donation not found" 
            });
        }
        
        res.json({
            success: true,
            message: `Donation ${status} successfully`,
            donation
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ===============================
// GET ALL USERS
// ===============================
app.get("/api/admin/users", verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' })
            .select('-password')
            .sort({ createdAt: -1 });
        
        // Get donation stats for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const donations = await Donation.find({ phone: user.phone });
            const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
            
            return {
                ...user.toObject(),
                totalDonated,
                donationCount: donations.length,
                lastDonation: donations[0]?.date || null
            };
        }));
        
        res.json({
            success: true,
            users: usersWithStats
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ===============================
// DELETE DONATION
// ===============================
app.delete("/api/admin/donation/:id", verifyAdmin, async (req, res) => {
    try {
        const donation = await Donation.findByIdAndDelete(req.params.id);
        
        if (!donation) {
            return res.status(404).json({ 
                success: false, 
                message: "Donation not found" 
            });
        }
        
        res.json({
            success: true,
            message: "Donation deleted successfully"
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ===============================
// EXPORT DONATIONS TO CSV
// ===============================
app.get("/api/admin/export-donations", verifyAdmin, async (req, res) => {
    try {
        const { campaign, startDate, endDate } = req.query;
        
        let query = {};
        
        if (campaign && campaign !== 'all') {
            query.campaign = campaign;
        }
        
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }
        
        const donations = await Donation.find(query).sort({ date: -1 });
        
        const csvData = donations.map(d => ({
            'Date': d.date.toISOString().split('T')[0],
            'Donor Name': d.donorName,
            'Phone': d.phone,
            'Campaign': d.campaign,
            'Amount (BDT)': d.amount,
            'Transaction ID': d.transactionId || 'N/A',
            'Status': d.status || 'pending'
        }));
        
        res.json({
            success: true,
            data: csvData,
            count: csvData.length
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ===============================
// GET ANALYTICS DATA
// ===============================
app.get("/api/admin/analytics", verifyAdmin, async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        
        let dateFilter = {};
        const now = new Date();
        
        if (period === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            dateFilter = { $gte: weekAgo };
        } else if (period === 'month') {
            const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
            dateFilter = { $gte: monthAgo };
        } else if (period === 'year') {
            const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
            dateFilter = { $gte: yearAgo };
        }
        
        const dailyStats = await Donation.aggregate([
            { $match: dateFilter._id ? { date: dateFilter } : {} },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        const topDonors = await Donation.aggregate([
            {
                $group: {
                    _id: "$phone",
                    name: { $first: "$donorName" },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);
        
        res.json({
            success: true,
            dailyStats,
            topDonors
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ===============================
// SERVER
// ===============================
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
