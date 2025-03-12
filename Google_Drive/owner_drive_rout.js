const express = require('express');
const mysql = require('mysql2'); 
require('dotenv').config();

const router = express.Router();


const {server_request_mode,write_log_file,error_message,info_message,success_message,normal_message} = require('./../modules/_all_help');
const { generate_otp, get_otp, clear_otp } = require('./../modules/OTP_generate');
const JWT_SECRET_KEY = 'Jwt_key_for_photography_website';
const {uploadFileToFolder,get_files_from_folder} = require('./../Google_Drive/data');
const path = require('path');
const fs = require('fs');

  

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    authPlugins: {},
  });
  
  

  router.post('/upload-file', async (req, res) => {
    console.log(req.body);
    const { user_email, file_name, file_type, file_content } = req.body;

    if (!user_email || !file_name || !file_type || !file_content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Fetch folder ID for the user
        db.execute(
            'SELECT portfolio_folder_id FROM owner_folders WHERE user_email = ?',
            [user_email],
            async (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to fetch folder data' });
                }

                if (result.length === 0) {
                    return res.status(404).json({ error: 'Folder not found for user' });
                }

                const folderId = result[0].portfolio_folder_id;

                // Save the file temporarily to disk
                const tempFilePath = path.join(__dirname, 'temp', file_name);
                if (!fs.existsSync(path.dirname(tempFilePath))) {
                    fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
                }
                fs.writeFileSync(tempFilePath, Buffer.from(file_content, 'base64'));

                try {
                    // Upload the file to Google Drive
                    const uploadResult = await uploadFileToFolder(folderId, tempFilePath, file_name, file_type);

                    // Clean up temporary file
                    fs.unlinkSync(tempFilePath);

                    // Respond with success
                    res.json({
                        success: true,
                        message: 'File uploaded successfully',
                        file: uploadResult,
                    });
                } catch (uploadError) {
                    console.error('Upload error:', uploadError);
                    res.status(500).json({ error: 'Failed to upload file to Google Drive' });
                }
            }
        );
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
});


router.get('/get-files/:user_email', async (req, res) => {
    const { user_email } = req.params;
    db.execute(
        'SELECT portfolio_folder_id FROM owner_folders WHERE user_email = ?',
        [user_email],
        async (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to fetch folder data' });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: 'Folder not found for user' });
            }

            const folderId = result[0].portfolio_folder_id;
            const files = await get_files_from_folder(folderId);
            res.json(files);
        }
    );
});

router.post('/add_portfolio', async (req, res) => {
    const { user_email, file_name, file_type, file_content } = req.body;

    if (!user_email || !file_name || !file_type || !file_content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Fetch portfolio folder ID for the user
        db.execute(
            'SELECT portfolio_folder_id FROM owner_folders WHERE user_email = ?',
            [user_email],
            async (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                if (result.length === 0) {
                    return res.status(404).json({ error: 'No portfolio folder found for user' });
                }

                const portfolioFolderId = result[0].portfolio_folder_id;

                // Create a temporary file path to save the file content
                const tempFilePath = path.join(__dirname, 'temp', file_name);

                if (!fs.existsSync(path.dirname(tempFilePath))) {
                    fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
                }

                fs.writeFileSync(tempFilePath, Buffer.from(file_content, 'base64'));

                try {
                    // Upload the file to Google Drive
                    const uploadResult = await uploadFileToFolder(portfolioFolderId, tempFilePath, file_name, file_type);

                    // Clean up the temporary file
                    fs.unlinkSync(tempFilePath);

                    res.json(uploadResult);
                } catch (uploadError) {
                    console.error('Upload error:', uploadError);
                    res.status(500).json({ error: 'Failed to upload file to Google Drive' });
                }
            }
        );
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
});

router.get('/get_portfolio/:user_email',async(req,res)=>{
    const {user_email} = req.params;
    db.execute(
        'SELECT portfolio_folder_id FROM owner_folders WHERE user_email = ?',
        [user_email],
        async (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to fetch folder data' });
            }
            if (result.length === 0) {
                return res.status(404).json({ error: 'No portfolio folder found for user' });
            }
            const portfolioFolderId = result[0].portfolio_folder_id;
            const files = await get_files_from_folder(portfolioFolderId);
           res.json({
            success:true,
            files:files
           })
        }
    );
})

router.get('/get_sub_portfolio/:user_email',async(req,res)=>{
    const {user_email} = req.params;
    const files = await get_files_from_folder(portfolioFolderId);
    res.json({
        success:true,
        files:files
    })
})

module.exports = router;

