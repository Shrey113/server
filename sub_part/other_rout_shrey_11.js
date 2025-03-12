const express = require('express');
const mysql = require('mysql2'); 
require('dotenv').config();
const router = express.Router();

const {server_request_mode,write_log_file,error_message,info_message,success_message,normal_message,create_jwt_token,check_jwt_token} = require('./../modules/_all_help');
const { generate_otp, get_otp, clear_otp } = require('./../modules/OTP_generate');
const { send_welcome_page, send_otp_page } = require('./../modules/send_server_email');


const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  authPlugins: {},
});


  

router.post("/send_otp_email", async (req, res) => {
  const { email,type } = req.body;
  if (!email || !type) {
    error_message("send_otp_email say : Email and type is required")
    return res.status(400).json({ error: "Email and type is required" });
  }
  try {
    let otp;
    if(type == "owner"){
      otp = generate_otp(email,"owner")
    }else{
      otp = generate_otp(email,"client")
    }
    info_message(`An email has been sent to ${email}.OTP is ${otp}.`);

    await send_otp_page(email, otp);
    res.status(200).json({ message: `OTP email sent to ${email}` ,status:"success"});
  } catch (error) {
    console.error("Error sending OTP email:", error);
    res.status(500).json({ error: "Failed to send OTP email" });
  }
});

router.post('/get_admin_data', (req, res) => {
  const { email } = req.body; // Extract email from request body

  if (!email) {
    return res.status(400).send({ error: 'Email is required' });
  }

  const query = 'SELECT access_type FROM admins WHERE admin_email = ?';

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error fetching admin data:', err);
      return res.status(500).send({ error: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(404).send({ error: 'Admin not found' });
    }

    const accessType = results[0].access_type;
    res.status(200).send({ email, access_type: accessType });
  });
});

router.post("/get_user_data_from_jwt", async (req, res) => {
  const jwt_token = req.body.jwt_token;

  if (!jwt_token) {
    console.error("get_user_data_from_jwt says: JWT token is required");
    return res.status(400).send("JWT token is required");
  }

  try {
    const userData = check_jwt_token(jwt_token);
    if (!userData || !userData.user_name || !userData.user_email) {
      return res.status(200).json({ error: "Invalid or incomplete JWT token" });
    }
    const find_user = 'SELECT * FROM owner WHERE user_name = ? AND user_email = ?';

    db.query(
      find_user,
      [userData.user_name, userData.user_email],
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (result.length === 0) {
          return res.status(200).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User found", user: result[0] });
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function getNotifications(notification_type, notification_message, notification_title, callback) {
  const query = `
      SELECT *, created_at 
      FROM notification
      WHERE notification_type = ? 
      AND notification_message = ? 
      AND notification_title = ? 
      AND DATE(created_at) = CURDATE()`;

  // Execute the query with placeholders for security
  db.query(query, [notification_type, notification_message, notification_title], (err, results) => {
      if (err) {
          console.error('Error executing query:', err);
          return callback(err, null);
      }
      callback(null, results);
  });
}

router.post('/notifications_admin', (req, res) => {
  const { notification_type, notification_message, notification_title } = req.body;

  if (!notification_type || !notification_message || !notification_title) {
      return res.status(400).json({ error: 'Missing required fields' });
  }

  // Call the getNotifications function
  getNotifications(notification_type, notification_message, notification_title, (err, results) => {
      if (err) {
          return res.status(500).json({ error: 'Failed to fetch notifications' });
      }
      
      console.log("sednotification received notification");
      
      io.emit('new_notification',"all ok");

      res.json({message:"all ok", notifications: results });
  });
});

router.get('/notifications_for_test', (req, res) => {
  db.query('SELECT * FROM notification', (err, results) => {
    if (err) {
      console.error('Error fetching data: ', err);
      res.status(500).send('Error fetching data');
      return;
    }
    res.json(results);  // Send the data as JSON
  });
});



  
module.exports = router;