const path = require('path');
const fs = require('fs');
const {google} = require('googleapis');

const mysql = require('mysql2');
require('dotenv').config();

const Client_id ='1003015936704-sfpga73cctpmlb4o2u636f63p2pbhil5.apps.googleusercontent.com'
const Client_secret ='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'
const redirect_uris = 'https://developers.google.com/oauthplayground'


// const refresh_token ='1//04d9fd5LKART2CgYIARAAGAQSNwF-L9IrVUtYktt9-ARof400JKKxXyi4go-xKSN0k_kh_NoZePEDlRYRt-0vuA40InwCBcdN_WA'
const refresh_token ='1//04VDneOkEAywZCgYIARAAGAQSNwF-L9IrbYfurQ2fXulpizSdgIp5zXiM_pfKc3QX6wAhQ__Wth3_ufH9wYIo0RxiY8CLPtDDeQo'



const oauth2Client = new google.auth.OAuth2(Client_id, Client_secret, redirect_uris);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

oauth2Client.setCredentials({refresh_token:refresh_token});

const drive = google.drive({version: 'v3', auth: oauth2Client});

const filePath = path.join(__dirname, 'test_file.png');


const folderName = 'Main Project Folder';
const main_folder_id = '1-57j0wnCUqytJFiuN9nFGbC0FSxX9NcQ';



const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    authPlugins: {},
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  

async function createRootFolderIfNotExist() {
    try {
        const response = await drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)'
        });

        if (response.data.files.length > 0) {
            console.log('Root folder already exists:', response.data.files[0]);
            return response.data.files[0].id;
        } else {
            const folderResponse = await drive.files.create({
                requestBody: {
                    name: folderName, 
                    mimeType: 'application/vnd.google-apps.folder' 
                }
            });

            console.log(`${folderName} created Now:`, folderResponse.data);
            return folderResponse.data.id;
        }
    } catch (error) {
        console.error('Error checking or creating the folder:', error);
    }
}



async function uploadFileToFolder(folderId, file_path, file_name, file_type) {
    try {
        const uploadResponse = await drive.files.create({
            requestBody: {
                name: file_name, // File name in Google Drive
                mimeType: file_type, // File MIME type
                parents: [folderId], // Target folder ID in Google Drive
            },
            media: {
                mimeType: file_type,
                body: fs.createReadStream(file_path), // Stream the file for upload
            },
        });

        console.log('File uploaded:', uploadResponse.data);
        return {
            success: true,
            file_id: uploadResponse.data.id,
            file_name: uploadResponse.data.name,
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw new Error('Failed to upload file to Google Drive');
    }
}


async function get_files_from_folder(folderId) {
    if (folderId === undefined) {
        console.log("folderId is undefined");
        return [];
    }
    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, createdTime, webViewLink, webContentLink)'
        });

        const files = response.data.files;

        if (files.length > 0) {
            console.log(`Files in folder (ID: ${folderId}):`);
            files.forEach(file => {
                const webLink = `https://drive.google.com/file/d/${file.id}/view`;
                const publicLink = file.webContentLink || 'Not shared publicly';
                console.log(`ID: ${file.id}, Name: ${file.name}, Type: ${file.mimeType}, Upload Date: ${file.createdTime}, \nWeb Link: ${file.webViewLink}, \nPublic Link: ${publicLink}\n\n\n`);
            });

            // Return the files with additional web link information
            return files.map(file => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                createdTime: file.createdTime,
                webLink: `https://drive.google.com/file/d/${file.id}/view`,
                publicLink: file.webContentLink || 'Not shared publicly'
            }));
        } else {
            console.log('No files found in the folder.');
            return [];
        }
    } catch (error) {
        console.error('Error retrieving files from folder:', error);
        throw error;
    }
}


async function create_users_folders(user_email) {

    try {
        // Step 1: Check if a folder with the same name already exists in the main folder
        const folderSearchResponse = await drive.files.list({
            q: `'${main_folder_id}' in parents and name = '${user_email}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)'
        });

        if (folderSearchResponse.data.files.length > 0) {
            console.log(`Folder with name ${user_email} already exists in the main folder.`);
            return {
                message: `Folder with name ${user_email} already exists.`,
                existingFolderId: folderSearchResponse.data.files[0].id
            };
        }

        // Step 2: Create the main user folder
        const userFolderResponse = await drive.files.create({
            requestBody: {
                name: user_email,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [main_folder_id]
            }
        });

        const user_folder_id = userFolderResponse.data.id;

        // Step 3: Create subfolders inside the user folder
        const subFolders = ['profile_pics', 'portfolio', 'equipments'];
        const subFolderPromises = subFolders.map(folderName =>
            drive.files.create({
                requestBody: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [user_folder_id]
                }
            })
        );

        const subFolderResponses = await Promise.all(subFolderPromises);

        const subFolderIds = subFolderResponses.map(response => response.data.id);

        // Step 4: Insert data into the database
        const query = `
            INSERT INTO ${process.env.DB_NAME}.owner_folders (
                user_email,
                user_folder_id,
                profile_pics_folder_id,
                portfolio_folder_id,
                equipments_folder_id
            ) VALUES (?, ?, ?, ?, ?)
        `;

        db.query(query, [
            user_email,
            user_folder_id,
            subFolderIds[0], // profile_pics_folder_id
            subFolderIds[1], // portfolio_folder_id
            subFolderIds[2]  // equipments_folder_id
        ], (err, result) => {
            if (err) {
                console.error('Error inserting data into database:', err);
                throw err;
            }
        });

        return {
            userFolderId: user_folder_id,
            subFolderIds: subFolderIds
        };
    } catch (error) {
        console.error('Error creating user and subfolders:', error);
        throw error;
    }
}


module.exports = {createRootFolderIfNotExist,uploadFileToFolder,get_files_from_folder,create_users_folders};


