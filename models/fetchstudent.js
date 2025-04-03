const mongoose = require("mongoose");

const FetchStudentSchema = new mongoose.Schema({
    name: String,
    studentId: String,
    class: String,
    batch: String,
    parentPhone: String,
    parentEmail:String,
    timeIn: Date,
    timeOut: Date
});

module.exports = mongoose.model("fetchstudent", FetchStudentSchema);
