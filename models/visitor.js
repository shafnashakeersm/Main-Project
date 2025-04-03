const mongoose = require("mongoose");

const VisitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobileNumber: { 
    type: String, 
    required: true, 
    match: [/^\d{10}$/, "Invalid mobile number! Must be 10 digits."] //  Only allows exactly 10 digits
  },
  vehicleNumber: { type: String, required: false },
  purpose: { type: String, required: true },
  entryTime: { type: String, required: true },
  exitTime: { type: String },
  date: { type: String, required: true } // Format: YYYY-MM-DD
});

module.exports = mongoose.model("Visitor", VisitorSchema);
