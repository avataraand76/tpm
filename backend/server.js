// backend/server.js

const express = require("express");
// const router = express.Router();
// const sql = require("mssql");
const mysql = require("mysql2/promise");
const cors = require("cors");
const axios = require("axios");
// const multer = require("multer");
// const { google } = require("googleapis");
// const { Readable } = require("stream");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
// const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const startTime = new Date();
  // console.log(`[${startTime.toISOString()}] ${req.method} ${req.url}`);

  res.on("finish", () => {
    const endTime = new Date();
    const duration = endTime - startTime;
    // console.log(
    //   `[${endTime.toISOString()}] ${req.method} ${req.url} - ${
    //     res.statusCode
    //   } (${duration}ms)`
    // );
  });

  next();
});

// MySQL Configuration for main database
const sigpWarehouseConnection = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.SIGP_WAREHOUSE_DATABASE,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  idleTimeout: 60000,
  multipleStatements: true,
});

// MySQL Configuration for Data Hi Timesheet database
const dataHiTimesheetConnection = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.DATA_HITIMESHEET_DATABASE,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  idleTimeout: 60000,
  multipleStatements: true,
});

// Test database connections
async function testConnections() {
  try {
    const sigpTest = await sigpWarehouseConnection.getConnection();
    console.log("Successfully connected to SIGP Warehouse MySQL database");
    sigpTest.release();
  } catch (err) {
    console.error("Error connecting to SIGP Warehouse MySQL database:", err);
  }

  try {
    const hiTimeSheetTest = await dataHiTimesheetConnection.getConnection();
    console.log("Successfully connected to Data Hi Timesheet MySQL database");
    hiTimeSheetTest.release();
  } catch (err) {
    console.error("Error connecting to Data Hi Timesheet MySQL database:", err);
  }
}

testConnections();

// MARK: SERVER START

app.listen(process.env.PORT || 8081, () => {
  console.log(`Server is running on port ${process.env.PORT || 8081}`);
});

// MARK: LOGIN

// POST /auth/login - Login with employee ID and password
app.post("/auth/login", async (req, res) => {
  try {
    const { ma_nv, password } = req.body;

    if (!ma_nv || !password) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and password are required",
      });
    }

    // Query user from sync_nhan_vien table
    const [users] = await dataHiTimesheetConnection.execute(
      `
      SELECT 
        nv.id, 
        nv.ma_nv, 
        nv.mat_khau, 
        nv.ten_nv, 
        nv.cong_viec_phu_trach, 
        bp.id AS id_bo_phan, 
        bp.ten_bo_phan, 
        pb.id AS id_phong_ban, 
        pb.ten_phong_ban, 
        com.id_company, 
        com.ten_cong_ty, 
        CONCAT(com.id_company, '-', pb.id) AS id_department -- LƯU Ý id sẽ gồm id_company+id_phong_ban
      FROM sync_nhan_vien nv
      LEFT JOIN sync_bo_phan bp ON bp.id = nv.id_bo_phan
      LEFT JOIN sync_phong_ban pb ON pb.id = bp.id_phong_ban
      LEFT JOIN sync_company com ON com.id_company = pb.id_company
      WHERE nv.ma_nv = ?
      `,
      [ma_nv]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = users[0];

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.mat_khau);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Sai mật khẩu",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        ma_nv: user.ma_nv,
      },
      process.env.JWT_SECRET || "your-default-secret-key"
      // { expiresIn: "8h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          ma_nv: user.ma_nv,
          name: user.ten_nv,
          job: user.cong_viec_phu_trach,
          department_id: user.id_bo_phan,
          department_name: user.ten_bo_phan,
          division_id: user.id_phong_ban,
          division_name: user.ten_phong_ban,
          company_id: user.id_company,
          company_name: user.ten_cong_ty,
          id_department: user.id_department, // LƯU Ý id sẽ gồm id_company+id_phong_ban
        },
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
