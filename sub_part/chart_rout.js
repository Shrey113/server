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
  


router.get('/status-count', (req, res) => {
    const query = `
        SELECT 
            user_Status, 
            COUNT(*) AS count 
        FROM owner 
        GROUP BY user_Status;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        // Transform the results into a key-value JSON object
        const statusCounts = results.reduce((acc, row) => {
            acc[row.user_Status] = row.count;
            return acc;
        }, {});

        res.json(statusCounts);
    });
});



module.exports = router;
