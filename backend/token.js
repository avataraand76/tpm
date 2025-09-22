// backend/token.js

const express = require("express");
const { google } = require("googleapis");
const crypto = require("crypto");
require("dotenv").config();
const app = express();

// Generate JWT secret if needed
const generateSecret = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Use existing secret from env or generate new one
const jwtSecret = generateSecret();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes for Google Drive API
const scopes = [
  "https://www.googleapis.com/auth/drive.file", // To create and manage files
  "https://www.googleapis.com/auth/drive.readonly", // To read files
];

app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    // Thêm prompt: 'consent' để luôn hiển thị màn hình xác nhận
    // Điều này đảm bảo bạn luôn nhận được refresh token
    prompt: "consent",
  });
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  console.log("Authorization code:", code);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Log to console
    console.log("\nJWT Secret:", jwtSecret);
    console.log("\nAccess Token:", tokens.access_token);
    console.log("\nRefresh Token:", tokens.refresh_token);
    console.log(
      "\nExpiry date:",
      new Date(tokens.expiry_date).toLocaleString()
    );

    // Send HTML response with styled token display and copy buttons
    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 20px auto;
              padding: 0 20px;
            }
            h1 {
              color: #2c3e50;
              border-bottom: 2px solid #3498db;
              padding-bottom: 10px;
            }
            h2 {
              color: #3498db;
              margin-top: 30px;
            }
            .token-container {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 10px 0;
              position: relative;
            }
            .token-label {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 5px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .token-value {
              word-break: break-all;
              background-color: #ffffff;
              padding: 10px;
              border: 1px solid #dee2e6;
              border-radius: 4px;
            }
            .important-note {
              color: #e74c3c;
              font-weight: bold;
              margin: 20px 0;
              padding: 10px;
              border-left: 4px solid #e74c3c;
            }
            .copy-btn {
              background-color: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 5px 10px;
              cursor: pointer;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            .copy-btn:hover {
              background-color: #2980b9;
            }
            .copy-success {
              position: absolute;
              top: 15px;
              right: 15px;
              background-color: #2ecc71;
              color: white;
              padding: 5px 10px;
              border-radius: 4px;
              display: none;
            }
            .section {
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px dashed #dee2e6;
            }
            .jwt-section {
              background-color: #f0f7ff;
              padding: 15px;
              border-radius: 5px;
              border-left: 4px solid #3498db;
            }
          </style>
        </head>
        <body>
          <h1>Authentication Successful! 🎉</h1>
          
          <div class="section">
            <h2>Google API Tokens</h2>
            <p>Please check your console for the tokens.</p>
            <p>Important: Copy the refresh token and save it in your .env file as GOOGLE_REFRESH_TOKEN</p>
            
            <div class="token-container">
              <div class="token-label">
                <span>Access Token:</span>
                <button class="copy-btn" onclick="copyToClipboard('access-token')">Copy</button>
              </div>
              <div class="token-value" id="access-token">${
                tokens.access_token
              }</div>
              <div class="copy-success" id="access-token-success">Copied!</div>
            </div>

            <div class="token-container">
              <div class="token-label">
                <span>Refresh Token:</span>
                <button class="copy-btn" onclick="copyToClipboard('refresh-token')">Copy</button>
              </div>
              <div class="token-value" id="refresh-token">${
                tokens.refresh_token
              }</div>
              <div class="copy-success" id="refresh-token-success">Copied!</div>
            </div>

            <div class="token-container">
              <div class="token-label">Expiry Date:</div>
              <div class="token-value">${new Date(
                tokens.expiry_date
              ).toLocaleString()}</div>
            </div>

            <div class="important-note">
              Important: Copy the refresh token above and save it in your .env file as GOOGLE_REFRESH_TOKEN.<br>
              This refresh token is needed for long-term access to Google Drive.
            </div>
          </div>
          
          <div class="section jwt-section">
            <h2>JWT Secret</h2>
            <p>This secret can be used to sign your JWT tokens. Save it in your .env file as JWT_SECRET.</p>
            
            <div class="token-container">
              <div class="token-label">
                <span>JWT Secret Key:</span>
                <button class="copy-btn" onclick="copyToClipboard('jwt-secret')">Copy</button>
              </div>
              <div class="token-value" id="jwt-secret">${jwtSecret}</div>
              <div class="copy-success" id="jwt-secret-success">Copied!</div>
            </div>
            
            <div class="important-note">
              Important: This JWT secret should be kept secure and should not be exposed to clients.<br>
              Copy this secret and save it in your .env file as JWT_SECRET.
            </div>
          </div>

          <p><strong>Note:</strong> All tokens and secrets are also logged to your console for backup.</p>
          
          <script>
            function copyToClipboard(elementId) {
              const element = document.getElementById(elementId);
              const text = element.innerText;
              
              navigator.clipboard.writeText(text).then(() => {
                // Show success message
                const successElement = document.getElementById(elementId + '-success');
                successElement.style.display = 'block';
                
                // Hide after 2 seconds
                setTimeout(() => {
                  successElement.style.display = 'none';
                }, 2000);
              }).catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy to clipboard. Please try manually selecting and copying the text.');
              });
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 20px auto;
              padding: 0 20px;
            }
            h1 {
              color: #e74c3c;
            }
            .error-message {
              background-color: #fdf0f0;
              padding: 15px;
              border-radius: 5px;
              border-left: 4px solid #e74c3c;
            }
          </style>
        </head>
        <body>
          <h1>Authentication Failed ❌</h1>
          <div class="error-message">
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please try again or check your client credentials.</p>
          </div>
        </body>
      </html>
    `);
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`
    Authorization server is running!
    
    1. Visit http://localhost:${PORT}/auth to start the authorization process
    2. After authorization, check the console for tokens
    3. Copy the refresh token to your .env file
    4. You only need to do this once, unless you revoke access
  `);
});
