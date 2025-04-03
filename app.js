const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sgMail = require("@sendgrid/mail");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

//models
const User = require("./models/login");
const AddStudent= require("./models/addstudent");
const LeaveRequest = require("./models/LeaveRequest");
const FetchStudent = require("./models/fetchstudent"); 
const visitor = require("./models/visitor");
const ReportModel = require("./models/dailyReport"); 
// const ReportModel = require("./models/ReportModel");
const StudentModel = require("./models/studentmodel");
const VisitorModel = require("./models/visitormodel");
const AddStudentModel = require("./models/addstudent");






sgMail.setApiKey(process.env.SENDGRID_API_KEY); 

const SECRET_KEY = "your_secret_key"; 

//connection with mongodb
mongoose.connect("mongodb+srv://shafnashakeersm:Shafna123@cluster0.2srguee.mongodb.net/fisatgatewaydb?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => {
    console.log(" Connected to MongoDB");
    insertHardcodedUsers(); // Ensure users are inserted
  })
  .catch((err) => console.log(" Error connecting to MongoDB: ", err));




  
// Middleware for Authentication
const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // ✅ Use correct secret key
      req.user = decoded;

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Access forbidden: Insufficient role permissions" });
      }

      next();
    } catch (error) {
      console.error("JWT Verification Error:", error);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
};


// Insert Hardcoded Users (Ensure Lowercase Usernames)
async function insertHardcodedUsers() {
  const hardcodedUsers = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "warden", password: "warden123", role: "warden" },
    { username: "watchman", password: "watchman789", role: "watchman" }
  ];

  try {
    for (const user of hardcodedUsers) {
      const existingUser = await User.findOne({ username: user.username.toLowerCase() });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const newUser = new User({
          username: user.username.toLowerCase(),
          password: hashedPassword,
          role: user.role
        });
        await newUser.save();
        console.log(` User ${user.username} added to the database.`);
      } else {
        console.log(` User ${user.username} already exists.`);
      }
    }
  } catch (error) {
    console.error(" Error inserting hardcoded users:", error);
  }
}


//**********************************************************************************************************************/
// Login Route 
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid username" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect password" });

    // Generate JWT Token
    const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: "1d" });

    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});


//******************************************************************************************************************/
// Add Student
app.post("/addstudent", async (req, res) => {
  try {
    console.log("Received request at /addstudent:", req.body); 

    const { name, studentID, batch, studentClass, parentPhone, parentEmail, hostel } = req.body; 

    if (!name || !studentID || !studentClass || !batch || !parentPhone || !parentEmail || !hostel) {
      return res.status(400).json({ error: "All fields are required" }); 
    }

    const newStudent = new AddStudentModel({
      name,
      studentID: studentID, 
      class: studentClass, 
      batch,
      parentPhone,
      parentEmail,
      hostel,
    });

    await newStudent.save();
    console.log("Student added successfully:", newStudent); // ✅ Debugging log

    res.json({ message: "Student added successfully" });
  } catch (error) {
    console.error("Error adding student:", error);
    res.status(500).json({ error: "Failed to add student" });
  }
});


//********************************************************************************************************/
//new dashboard (men and women)
app.get("/dashboard-overview", authMiddleware, async (req, res) => {
  try {
    const totalMenStudents = await Student.countDocuments({ hostel: { $regex: /men's hostel/i } });
    const totalWomenStudents = await Student.countDocuments({ hostel: { $regex: /women's hostel/i } });

    const menLeaveRequests = await LeaveRequest.countDocuments({ hostel: { $regex: /men's hostel/i } });
    const womenLeaveRequests = await LeaveRequest.countDocuments({ hostel: { $regex: /women's hostel/i } });

    console.log("Men Students:", totalMenStudents);
    console.log("Women Students:", totalWomenStudents);
    console.log("Men Leave Requests:", menLeaveRequests);
    console.log("Women Leave Requests:", womenLeaveRequests);

    res.json({
      totalMenStudents,
      totalWomenStudents,
      menLeaveRequests,
      womenLeaveRequests,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});



//********************************************************************************************************/
//  Fetch Students Based on Hostel Type
app.get("/getstudents", async (req, res) => {
  try {
    const mensHostelStudents = await AddStudentModel.find({ hostel: "Men's Hostel" });
    const womensHostelStudents = await AddStudentModel.find({ hostel: "Women's Hostel" });

    res.json({
      mensHostel: mensHostelStudents,
      womensHostel: womensHostelStudents,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});


//********************************************************************************************************/
//Edit Student
app.put("/student/:studentID", async (req, res) => {
  try {
    const updatedStudent = await AddStudentModel.findOneAndUpdate(
      { studentID: req.params.studentID },
      req.body,
      { new: true }
    );
    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: "Failed to update student" });
  }
});


//********************************************************************************************************/
//Delete Student
app.delete("/student/:studentID", async (req, res) => {
  try {
    const deletedStudent = await AddStudentModel.findOneAndDelete({ studentID: req.params.studentID });

    if (!deletedStudent) return res.status(404).json({ error: "Student not found" });

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
});


// uploading
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// Allow access to uploaded files via URL
app.use("/uploads", express.static("uploads"));


// Storage settings for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save files in "uploads" folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});


const upload = multer({ storage: storage });


//********************************************************************************************************/
// Send Notification to Parents for Leave Request
app.post("/send-notification", upload.single("trainTicket"), async (req, res) => {
  try {
      const { studentID, leaveDate, timeIn, timeOut } = req.body;
      const student = await AddStudent.findOne({ studentID });

      if (!student) {
          return res.status(404).json({ error: "Student not found" });
      }

      // const trainTicketPath = req.file ? req.file.path : null;

      // Check if a leave request already exists for the student
      const existingRequest = await LeaveRequest.findOne({ studentID });

      const newLeaveRequest = new LeaveRequest({
          studentID,
          name: student.name,
          class: student.class,
          batch: student.batch,
          hostel: student.hostel,
          parentEmail: student.parentEmail,
          leaveDate,
          timeIn,
          timeOut,
          // trainTicket: trainTicketPath,
          parentReply: "Pending" 
      });

      await newLeaveRequest.save();

      //  Send Email to Parent Using SendGrid
      const msg = {
          to: student.parentEmail, // Parent email from DB
          from: "w58805158@gmail.com",
          subject: `Leave Request for ${student.name}`,
          text: `Your child, ${student.name}, has requested leave on ${leaveDate}.
          \nStudentId:${studentID}
          \nClass: ${student.class} 
          \nBatch: ${student.batch} 
          \nTime Out: ${timeOut}  
          \nPlease reply with "Approved" or "Rejected" by clicking the link: 
          http://localhost:3000/parent-reply`,
      };

      await sgMail.send(msg);

      res.json({ message: "Leave request submitted and email sent to parents." });
  } catch (error) {
      console.error("Error submitting leave request:", error);
      res.status(500).json({ error: "Failed to submit leave request." });
  }
});


//********************************************************************************************************/
//Fetch Leave Requests & Parent Replies
app.get("/view-replies", async (req, res) => {
  try {
    // Fetch all leave requests where the parent has responded
    const replies = await LeaveRequest.find({ parentReply: { $ne: "Pending" } });

    console.log("Fetched replies from MongoDB:", replies); 

    // Ensure hostel data is always trimmed and lowercase
    const mensHostel = replies.filter((r) => 
      r.hostel && r.hostel.trim().toLowerCase() === "men's hostel"
    );

    const womensHostel = replies.filter((r) => 
      r.hostel && r.hostel.trim().toLowerCase() === "women's hostel"
    );

    console.log("Men's Hostel Data:", mensHostel);
    console.log("Women's Hostel Data:", womensHostel);

    res.json({ mensHostel, womensHostel });
  } catch (error) {
    console.error("Error fetching parent replies:", error);
    res.status(500).json({ error: "Failed to fetch parent replies" });
  }
});



//********************************************************************************************************/
//  Update Parent Reply
app.post("/parent-reply", async (req, res) => {
  const { studentID, reply } = req.body;

  console.log(`Incoming Parent Reply:`, req.body); 

  if (!["Approved", "Rejected", "Pending"].includes(reply)) {
    return res.status(400).json({ error: "Invalid reply status" });
  }

  try {
    const existingRequest = await LeaveRequest.findOne({ studentID });

    if (!existingRequest) {
      console.log(`Leave request not found for StudentID: ${studentID}`);
      return res.status(404).json({ error: "Leave request not found" });
    }

    console.log("Before Update:", existingRequest);

    const leaveRequest = await LeaveRequest.findOneAndUpdate(
      { studentID },
      { $set: { parentReply: reply } },
      { new: true, runValidators: true, strict: false }
    );

    console.log("After Update:", leaveRequest); // ✅ See if it actually updates

    res.status(200).json({ success: true, message: "Parent reply updated successfully.", leaveRequest });

  } catch (error) {
    console.error("Error updating parent reply:", error);
   
    res.status(500).json({ error: "Server error" });
  }
});


//********************************************************************************************************/
//Fetch student details by Student ID
app.get("/get-student/:studentID", async (req, res) => {
  try {
    const student = await AddStudent.findOne({ studentID: req.params.studentID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    console.error("Error fetching student details:", error);
    res.status(500).json({ error: "Failed to fetch student details" });
  }
});


//**********************************************************************************************/
app.put("/send-to-watchman/:id", async (req, res) => {
  try {
    const leaveRequestId = req.params.id;

   
    await LeaveRequest.findByIdAndUpdate(leaveRequestId, { sentToWatchman: true });

    res.json({ success: true, message: "Approval sent to Watchman!" });
  } catch (error) {
    console.error("Error updating leave request:", error);
    res.status(500).json({ error: "Failed to update leave request" });
  }
});

//**********************************************************************************************/
// Fetch List of Students Approved by Warden
app.get("/approved-students", async (req, res) => {
  try {
    const approvedStudents = await LeaveRequest.find({ sentToWatchman: true });
    res.json(approvedStudents);
  } catch (error) {
    console.error("Error fetching approved students:", error);
    res.status(500).json({ error: "Failed to fetch approved students" });
  }
});

//**********************************************************************************************/
//  Add Visitor Details
app.post("/add-visitor", async (req, res) => {
  try {
    const { name,mobileNumber,vehicleNumber, purpose, entryTime, exitTime, date } = req.body;
    const newVisitor = new visitor({ name,mobileNumber, purpose,vehicleNumber, entryTime, exitTime, date });
    await newVisitor.save();
    res.json({ success: true, message: "Visitor added successfully!" });
  } catch (error) {
    console.error("Error adding visitor:", error);
    res.status(500).json({ error: "Failed to add visitor" });
  }
});


//**********************************************************************************************/
// Fetch List of Visitors (Sorted by Date)
app.get("/visitors", async (req, res) => {
  try {
    const visitors = await visitor.find().sort({ date: -1 }); // Sort by latest date
    res.json(visitors);
  } catch (error) {
    console.error("Error fetching visitors:", error);
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
});


//**********************************************************************************************************************/
//  Watchman sends today's report to Admin
app.post("/send-report", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { students, visitors } = req.body;

    let report = await ReportModel.findOne({ date: today });

    if (!report) {
      report = new ReportModel({ date: today, students, visitors });
    } else {
      report.students = students;
      report.visitors = visitors;
    }

    await report.save();
    res.json({ success: true, message: "Report sent successfully!" });
  } catch (error) {
    console.error("❌ Error sending report:", error);
    res.status(500).json({ success: false, message: "Failed to send report." });
  }
});


//**********************************************************************************************************************/
//  Fetch today's approved students
app.get("/approved-students", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const students = await StudentModel.find({ leaveDate: today });
    res.json(students);
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//**********************************************************************************************************************/
//  Fetch today's visitors
app.get("/visitors", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const visitors = await VisitorModel.find({ date: today });
    res.json(visitors);
  } catch (error) {
    console.error("❌ Error fetching visitors:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

 




const PORT = 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));













//***************************************************************************************************/
// Dashboard Overview  for men
// app.get("/dashboard-overview", async (req, res) => {
//   try {
//     const { wardenGender } = req.query;

//     if (!wardenGender || !["male", "female"].includes(wardenGender.toLowerCase())) {
//       return res.status(400).json({ error: "Invalid or missing warden gender" });
//     }

//     // Convert gender to hostel name
//     const hostelName = wardenGender.toLowerCase() === "male" ? "Men's Hostel" : "Women's Hostel";

//     // Query using `hostel` instead of `gender`
//     const totalStudents = await AddStudent.countDocuments({ hostel: hostelName });
//     const totalLeaveRequests = await LeaveRequest.countDocuments({ hostel: hostelName });

//     const approvedLeaves = await LeaveRequest.countDocuments({ hostel: hostelName, parentReply: { $regex: /^approved$/i } });
//     const rejectedLeaves = await LeaveRequest.countDocuments({ hostel: hostelName, parentReply: { $regex: /^rejected$/i } });
//     const pendingLeaves = await LeaveRequest.countDocuments({ hostel: hostelName, parentReply: { $regex: /^pending$/i } });

//     //  Debugging to verify data
//     console.log({
//       wardenGender,
//       hostelName,
//       totalStudents,
//       totalLeaveRequests,
//       approvedLeaves,
//       pendingLeaves,
//       rejectedLeaves,
//     });

//     res.json({
//       wardenGender,
//       hostelName,
//       totalStudents,
//       totalLeaveRequests,
//       approvedLeaves,
//       pendingLeaves,
//       rejectedLeaves,
//     });
//   } catch (error) {
//     console.error("Error fetching dashboard overview:", error);
//     res.status(500).json({ error: "Failed to fetch dashboard overview" });
//   }
// });





// //******************************************************************************************************************/
// // Dashboard Overview for Women Warden
// app.get("/dashboard-overview-women", async (req, res) => {
//   try {
//     const { wardenGender } = req.query;

//     if (!wardenGender || !["male", "female"].includes(wardenGender.toLowerCase())) {
//       return res.status(400).json({ error: "Invalid or missing warden gender" });
//     }

//     // Convert gender to hostel name
//     const hostelName = wardenGender.toLowerCase() === "female" ?  "Women's Hostel":"Men's Hostel";

//     //  Query using `hostel` instead of `gender`
//     const totalStudents = await AddStudent.countDocuments({ hostel: hostelName });
//     const totalLeaveRequests = await LeaveRequest.countDocuments({ hostel: hostelName });

//     const approvedLeaves = await LeaveRequest.countDocuments({ hostel: hostelName, parentReply: { $regex: /^approved$/i } });
//     const rejectedLeaves = await LeaveRequest.countDocuments({ hostel: hostelName, parentReply: { $regex: /^rejected$/i } });
//     const pendingLeaves = await LeaveRequest.countDocuments({ hostel: hostelName, parentReply: { $regex: /^pending$/i } });

//     //  Debugging to verify data
//     console.log({
//       wardenGender,
//       hostelName,
//       totalStudents,
//       totalLeaveRequests,
//       approvedLeaves,
//       pendingLeaves,
//       rejectedLeaves,
//     });

//     res.json({
//       wardenGender,
//       hostelName,
//       totalStudents,
//       totalLeaveRequests,
//       approvedLeaves,
//       pendingLeaves,
//       rejectedLeaves,
//     });
//   } catch (error) {
//     console.error("Error fetching dashboard overview:", error);
//     res.status(500).json({ error: "Failed to fetch dashboard overview" });
//   }
// });

// // 🚀 **Fetch Leave Reports**
// app.post("/leave-report", authMiddleware, async (req, res) => {
//   try {
//     console.log("Incoming Request Body:", req.body); // ✅ Log request data

//     const { hostel, date } = req.body;

//     console.log("Fetching leave reports for:", hostel, date); // ✅ Log parameters

//     const leaveReports = await LeaveRequest.find({
//       hostel,
//       leaveDate: date, // ✅ Match exact date
//     });

//     console.log("Leave Reports Found:", leaveReports); // ✅ Log DB results

//     res.json(leaveReports);
//   } catch (error) {
//     console.error("Error fetching leave reports:", error);
//     res.status(500).json({ error: "Failed to fetch leave reports" });
//   }
// });

// //********************************************************************************************************/
// // //fetch student by id
// app.get("/fetchstudent/:studentID", async (req, res) => {
//   try {
//     const student = await AddStudent.findOne(
//       { studentID: req.params.studentID },
//       "name class batch" // Return only these fields
//     );

//     if (!student) {
//       return res.status(404).json({ error: "Student not found" });
//     }

//     res.json(student);
//   } catch (error) {
//     console.error("Error fetching student details:", error);
//     res.status(500).json({ error: "Error fetching student details" });
//   }
// });


// //***************************************************************************************************************/
// // Update (Edit) a Student by Student ID
// app.put("/fetchstudent/:studentID", async (req, res) => {
//   try {
//     const { studentID } = req.params;

//     // Ensure all required fields are present
//     const { name, class: studentClass, batch, hostel, parentPhone,parentEmail } = req.body;

//     if (!name || !studentClass || !batch || !hostel || !parentPhone || !parentEmail) {
//       return res.status(400).json({ error: "All fields are required" });
//     }

//     const updatedStudent = await AddStudent.findOneAndUpdate(
//       { studentID }, // Find student by studentID
//       req.body,      // Update with new data
//       { new: true, runValidators: true }
//     );

//     if (!updatedStudent) {
//       return res.status(404).json({ error: "Student not found" });
//     }

//     res.status(200).json(updatedStudent);
//   } catch (error) {
//     console.error("Error updating student:", error);
//     res.status(500).json({ error: "Failed to update student." });
//   }
// });


// //***********************************************************************************************************/
// // Delete a Student by Student ID
// app.delete("/fetchstudent/:studentID", async (req, res) => {
//   try {
//     const { studentID } = req.params;

//     const deletedStudent = await AddStudent.findOneAndDelete({ studentID });

//     if (!deletedStudent) {
//       return res.status(404).json({ error: "Student not found" });
//     }

//     res.status(200).json({ message: "Student deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting student:", error);
//     res.status(500).json({ error: "Failed to delete student" });
//   }
// });


// //*****************************************************************************************************/
// //Submit a Leave Request (By Warden)
// app.post("/submit-leave-request", upload.single("trainTicket"), async (req, res) => {
//   try {
//     const { studentID, leaveDate, timeIn, timeOut } = req.body;
//     const student = await AddStudent.findOne({ studentID });

//     if (!student) {
//       return res.status(404).json({ error: "Student not found" });
//     }

//     // Get uploaded file path (if uploaded)
//     const trainTicketPath = req.file ? `/uploads/${req.file.filename}` : null;

//     const newLeaveRequest = new LeaveRequest({
//       studentID,
//       name: student.name,
//       class: student.class,
//       batch: student.batch,
//       hostel: student.hostel,
//       parentEmail: student.parentEmail,
//       leaveDate,
//       timeIn,
//       timeOut,
//       trainTicket: trainTicketPath,
//       parentReply:"pending"
//     });

//     await newLeaveRequest.save();

//     //  Send Email to Parent Using SendGrid
//     const msg = {
//       to: student.parentEmail, // Parent email from DB
//       from: "w58805158@gmail.com",
//       subject: `Leave Request for ${student.name}`,
//       text: `Your child, ${student.name}, has requested leave on ${leaveDate}.
//       \nStudentId:${studentID}
//       \nClass: ${student.class} 
//         \nBatch: ${student.batch} 
//       \nTime Out: ${timeOut}  
//       \nTime In: ${timeIn}  
//       \nPlease reply with "Approved" or "Rejected" by clicking the link: 
//       http://localhost:3000/parent-reply`,
//     };

//     await sgMail.send(msg);

//     res.json({ message: "Leave request submitted and email sent to parents." });
//   } catch (error) {
//     console.error("Error submitting leave request:", error);
//     res.status(500).json({ error: "Failed to submit leave request." });
//   }
// });



// //****************************************************************************************************/
// //Parent Reply API (Parents will send "Approved" or "Rejected")
// app.post("/parent-reply", async (req, res) => {
//   try {
//     const { studentID, reply } = req.body;
//     console.log("📩 Received Parent Reply:", { studentID, reply });

//     if (!studentID || !reply) {
//       return res.status(400).json({ message: "Student ID and reply are required" });
//     }

//     // Find and update the leave request by student ID
//     const updatedRequest = await LeaveRequest.findOneAndUpdate(
//       { studentID: String(studentID) }, 
//       { $set: { parentReply: reply } },
//       { new: true } // Returns the updated document
//     );

//     console.log("🔍 Updated Request:", updatedRequest);

//     if (!updatedRequest) {
//       return res.status(404).json({ message: "Leave request not found" });
//     }

//     res.status(200).json({ message: "Parent reply updated", data: updatedRequest });
//   } catch (error) {
//     console.error("Error updating parent reply:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });


// //***************************************************************************************************/
// // Fetch Parent Replies - Filter by Hostel
// app.get("/view-parent-replies", authMiddleware(["warden_men", "warden_women"]), async (req, res) => {
//   try {
//     let leaveRequests;

//     if (req.user.role === "warden_women") {
//       leaveRequests = await LeaveRequest.find(
//         { hostel: "Women's Hostel" }, 
//         "studentID name class batch leaveDate timeOut parentReply"
//       );
//     } else if (req.user.role === "warden_men") {
//       leaveRequests = await LeaveRequest.find(
//         { hostel: "Men's Hostel" }, 
//         "studentID name class batch leaveDate timeOut parentReply"
//       );
//     } else {
//       leaveRequests = await LeaveRequest.find(
//         {}, 
//         "studentID name class batch leaveDate timeOut parentReply"
//       );
//     }

//     res.json(leaveRequests);
//   } catch (error) {
//     console.error("Error fetching parent replies:", error);
//     res.status(500).json({ error: "Failed to fetch parent replies." });
//   }
// });




// //*****************************************************************************************************/
//Leave Reports - Filter Based on Warden Role
// Leave Reports - Filter Based on Selected Hostel
// app.get("/leave-reports", authMiddleware(["warden_men", "warden_women"]), async (req, res) => {
//   try {
//     const { fromDate, toDate, hostel } = req.query;

//     if (!fromDate || !toDate || !hostel) {
//       return res.status(400).json({ error: "fromDate, toDate, and hostel are required." });
//     }

//     // ✅ Fetch leave reports based on hostel & date range
//     const reports = await LeaveRequest.find(
//       { 
//         hostel: hostel, // ✅ Match the selected hostel
//         leaveDate: { $gte: fromDate, $lte: toDate } 
//       },
//       "studentID name class batch leaveDate timeOut parentReply hostel"
//     );

//     res.json(reports);
//   } catch (error) {
//     console.error("Error fetching leave reports:", error);
//     res.status(500).json({ error: "Failed to fetch leave reports." });
//   }
// });

//*********************************************************************************************************/
// fetch all students
// app.get("/fetchstudent", authMiddleware(["warden_men", "warden_women"]), async (req, res) => {
//   try {
//     console.log("Fetching students for:", req.user.role);
    
//     const filter = req.user.role === "warden_women" ? { hostel: "Women's Hostel" } : { hostel: "Men's Hostel" };
//     const students = await AddStudent.find(filter);
    
//     res.json(students);
//   } catch (error) {
//     console.error("Error fetching students:", error);
//     res.status(500).json({ message: "Failed to fetch students." });
//   }
// });