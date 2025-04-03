const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  date: String,
  students: [{ name: String, studentID: String, class: String, batch: String, timeOut: String }],
  visitors: [{ name: String, vehicleNumber: String, purpose: String, entryTime: String, exitTime: String }]
});

const ReportModel = mongoose.model("DailyReport", reportSchema);
module.exports = ReportModel;
