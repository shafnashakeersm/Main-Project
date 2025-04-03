const mongoose = require("mongoose");
const studentSchema = new mongoose.Schema({
    name: String,
    studentID: String,
    class: String,
    batch: String,
    leaveDate: { type: String, default: () => new Date().toISOString().split("T")[0] },
    timeOut: String
  });

  module.exports = mongoose.model("studentmodel", studentSchema);