const mongoose = require("mongoose");
const visitorSchema = new mongoose.Schema({
    name: String,
    vehicleNumber: String,
    purpose: String,
    date: { type: String, default: () => new Date().toISOString().split("T")[0] }, 
    entryTime: String,
    exitTime: String
  });

  module.exports = mongoose.model("Visitormodel", visitorSchema);