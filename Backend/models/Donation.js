const mongoose = require("mongoose");

const DonationSchema = new mongoose.Schema({
    donorName: { type: String, required: true },
    phone: { type: String, required: true },
    campaign: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: "bKash" },
    bkashNumber: String,
    transactionId: { type: String, unique: true, sparse: true },
    status: {
        type: String,
        enum: ['pending', 'verified', 'cancelled'],
        default: 'pending'
    },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Donation", DonationSchema);