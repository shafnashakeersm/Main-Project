// Import necessary modules
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Models
const User = require('./models/User');
const Student = require('./models/Student');
const Visitor = require('./models/Visitor');
const Log = require('./models/Log');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Database connection
mongoose.connect("mongodb+srv://shafnashakeersm:Shafna123@cluster0.2srguee.mongodb.net/fisatgatewaydb?retryWrites=true&w=majority&appName=Cluster0")

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, 'secret', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Middleware to check user role
const authMiddleware = (roles) => {
  return async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ msg: 'No token provided' });

    try {
      const decoded = jwt.verify(token, 'secret');
      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json({ msg: 'Access denied' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      res.status(403).json({ msg: 'Invalid or expired token' });
    }
  };
};

// Student Leave Route
app.post('/student/leave', authMiddleware(['warden']), async (req, res) => {
  const { studentId, leaveDetails } = req.body;
  try {
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    student.leaveDetails = leaveDetails;
    await student.save();
    res.json({ msg: 'Leave details updated and sent to parents' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Visitor Route
app.post('/visitor', authMiddleware(['admin', 'warden']), async (req, res) => {
  const { name, purpose, timeIn, timeOut } = req.body;
  try {
    const visitor = new Visitor({ name, purpose, timeIn, timeOut, date: new Date() });
    await visitor.save();
    res.json({ msg: 'Visitor details saved' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Log Route for Watchman
app.post('/log', authMiddleware(['admin', 'watchman']), async (req, res) => {
  const { studentLeaveRecords, visitorDetails } = req.body;
  try {
    const log = new Log({
      date: new Date(),
      watchman: req.user.username,
      studentLeaveRecords,
      visitorDetails
    });
    await log.save();
    res.json({ msg: 'Log saved for the day' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

