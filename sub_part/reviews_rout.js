const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
require('dotenv').config();



const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    authPlugins: {},
  });

router.post('/get_reviews', (req, res) => {

    const { user_email } = req.body;
    const query = `
        SELECT * FROM owner_reviews WHERE user_email = ?
    `;
    db.query(query, [user_email], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results);
    });
});


module.exports = router;
