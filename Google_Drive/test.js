const express = require('express');
const path = require('path');
const fs = require('fs');


const {google} = require('googleapis');

const Client_id ='1003015936704-sfpga73cctpmlb4o2u636f63p2pbhil5.apps.googleusercontent.com'
const Client_secret ='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'
const redirect_uris = 'https://developers.google.com/oauthplayground'


const refresh_token ='1//04d9fd5LKART2CgYIARAAGAQSNwF-L9IrVUtYktt9-ARof400JKKxXyi4go-xKSN0k_kh_NoZePEDlRYRt-0vuA40InwCBcdN_WA'



const oauth2Client = new google.auth.OAuth2(Client_id, Client_secret, redirect_uris);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

oauth2Client.setCredentials({refresh_token:refresh_token});

const drive = google.drive({version: 'v3', auth: oauth2Client});

const filePath = path.join(__dirname, 'test_file.png');


const folderName = 'Main Project Folder';
const main_folder_id = '1_6pjUXAfO0p7Vem2DG-eYsmdV7FKmTfv';

async function getFilesFromFolder(folderId) {
    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, webViewLink, webContentLink, mimeType)'
        });

        const files = response.data.files;

        if (files.length > 0) {
            console.log(`Files in folder (ID: ${folderId}):`);
            files.forEach(file => {
                console.log(`ID: ${file.id}, Name: ${file.name}, Web View Link: ${file.webViewLink || 'N/A'}, Web Content Link: ${file.webContentLink || 'N/A'}, Type: ${file.mimeType}`);
                console.log("\n\n");
                
            });
        } else {
            console.log('No files found in the folder.');
        }

        return files;
    } catch (error) {
        console.error('Error retrieving files from folder:', error);
    }
}



getFilesFromFolder('1U5-04CM4lsVTY0G_sIbGetFJ1dqjEkq1');