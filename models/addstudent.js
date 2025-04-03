const mongoose = require("mongoose");

const AddStudentSchema = new mongoose.Schema({
  studentID: { type: String, required: true},
  name: { type: String, required: true },
  class: { type: String, required: true },
  batch: { type: String, required: true },
  hostel: { 
    type: String, 
    enum: ["Men's Hostel", "Women's Hostel"], 
    required: true 
  },
  parentPhone: { type: String, required: true },
  parentEmail: { type: String, required: true } ,
  parentReply: { type: String, default: "Pending" }
});

var addstudentModel= mongoose.model("addstudent", AddStudentSchema);
module.exports =addstudentModel