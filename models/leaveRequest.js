const mongoose = require("mongoose");

const LeaveRequestSchema = new mongoose.Schema({
  studentID: { type: String, required: true },
  name: { type: String, required: true },
  class: { type: String, required: true }, 
  batch: { type: String, required: true },
  hostel: { type: String, required: true },
  parentEmail: { type: String, required: true },
  leaveDate: { type: String, required: true },
  timeIn: { type: String, required: true },
  timeOut: { type: String, required: true },
  // trainTicket: { type: String, required: false }, 
  // status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }, // Approval status
  parentReply: { type: String, enum: ["Approved", "Rejected", "Pending"], default: "Pending" },  // Parent response
  sentToWatchman: { type: Boolean, default: false } ,
  
});

module.exports = mongoose.model("LeaveRequest", LeaveRequestSchema);
