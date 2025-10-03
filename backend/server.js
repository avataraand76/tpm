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
const tpmConnection = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.TPM_DATABASE,
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
    const tpmTest = await tpmConnection.getConnection();
    console.log("Successfully connected to TPM MySQL database");
    tpmTest.release();
  } catch (err) {
    console.error("Error connecting to TPM MySQL database:", err);
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

// MARK: MIDDLEWARE - JWT Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token is required",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-default-secret-key"
    );
    req.user = decoded; // { id: user.id, ma_nv: user.ma_nv }
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

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

// MARK: MACHINE LIST

// GET /api/machines - Get all machines with pagination
app.get("/api/machines", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    // Build search condition and params
    let whereClause = "";
    let countParams = [];
    let dataParams = [];

    if (search) {
      const searchPattern = `%${search}%`;
      whereClause = `
        WHERE (m.name_machine LIKE ? 
        OR m.code_machine LIKE ? 
        OR m.serial_machine LIKE ? 
        OR m.manufacturer LIKE ?
        OR c.name_category LIKE ?)
      `;
      countParams = [
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
      ];
      dataParams = [
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        limit,
        offset,
      ];
    } else {
      dataParams = [limit, offset];
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      ${whereClause}
    `;

    const [countResult] = await tpmConnection.query(countQuery, countParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    const dataQuery = `
      SELECT 
        m.uuid_machine,
        m.serial_machine,
        m.RFID_machine,
        m.code_machine,
        m.name_machine,
        m.manufacturer,
        m.price,
        m.date_of_use,
        m.lifespan,
        m.repair_cost,
        m.note,
        m.current_status,
        m.created_at,
        m.updated_at,
        c.name_category
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      ${whereClause}
      ORDER BY m.date_of_use DESC
      LIMIT ? OFFSET ?
    `;

    const [machines] = await tpmConnection.query(dataQuery, dataParams);

    res.json({
      success: true,
      message: "Machines retrieved successfully",
      data: machines,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching machines:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/machines/stats - Get machine statistics
app.get("/api/machines/stats", authenticateToken, async (req, res) => {
  try {
    const [stats] = await tpmConnection.execute(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN current_status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN current_status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN current_status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN current_status = 'rented_out' THEN 1 ELSE 0 END) as rented_out,
        SUM(CASE WHEN current_status = 'borrowed_out' THEN 1 ELSE 0 END) as borrowed_out,
        SUM(CASE WHEN current_status = 'scrapped' THEN 1 ELSE 0 END) as scrapped
      FROM tb_machine
      `
    );

    res.json({
      success: true,
      message: "Statistics retrieved successfully",
      data: stats[0],
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/machines/:uuid - Get single machine details by UUID
app.get("/api/machines/:uuid", authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;

    const [machines] = await tpmConnection.query(
      `
      SELECT 
        m.uuid_machine,
        m.serial_machine,
        m.RFID_machine,
        m.code_machine,
        m.name_machine,
        m.manufacturer,
        m.price,
        m.date_of_use,
        m.lifespan,
        m.repair_cost,
        m.note,
        m.current_status,
        m.created_at,
        m.updated_at,
        c.name_category,
        c.id_category
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      WHERE m.uuid_machine = ?
      `,
      [uuid]
    );

    if (machines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    res.json({
      success: true,
      message: "Machine details retrieved successfully",
      data: machines[0],
    });
  } catch (error) {
    console.error("Error fetching machine details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// POST /api/machines - Create new machine
app.post("/api/machines", authenticateToken, async (req, res) => {
  try {
    const {
      code_machine,
      serial_machine,
      RFID_machine,
      name_machine,
      manufacturer,
      price,
      date_of_use,
      lifespan,
      repair_cost,
      note,
      current_status,
      id_category,
    } = req.body;

    // Validate required fields
    if (!code_machine || !name_machine || !date_of_use) {
      return res.status(400).json({
        success: false,
        message: "Mã máy, Tên máy và Ngày sử dụng là bắt buộc",
      });
    }

    // Check if code_machine already exists
    const [existingCode] = await tpmConnection.query(
      "SELECT code_machine FROM tb_machine WHERE code_machine = ?",
      [code_machine]
    );

    if (existingCode.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Mã máy đã tồn tại",
      });
    }

    // Check if serial_machine already exists (if provided)
    if (serial_machine) {
      const [existingSerial] = await tpmConnection.query(
        "SELECT serial_machine FROM tb_machine WHERE serial_machine = ?",
        [serial_machine]
      );

      if (existingSerial.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Serial đã tồn tại",
        });
      }
    }

    // Format date to YYYY-MM-DD with timezone handling
    let formattedDate = date_of_use;
    if (date_of_use) {
      const dateObj = new Date(date_of_use);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      formattedDate = `${year}-${month}-${day}`;
    }

    // Get user ID from token
    const userMANV = req.user.ma_nv;

    // Insert new machine
    const [result] = await tpmConnection.query(
      `
      INSERT INTO tb_machine 
        (code_machine, serial_machine, RFID_machine, name_machine, manufacturer, 
         price, date_of_use, lifespan, repair_cost, note, current_status, id_category,
         created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        code_machine,
        serial_machine,
        RFID_machine,
        name_machine || null,
        manufacturer || null,
        price || null,
        formattedDate || null,
        lifespan || null,
        repair_cost || null,
        note || null,
        current_status || "available",
        id_category || 1, // Default to category 1 if not provided
        userMANV, // created_by
        userMANV, // updated_by
      ]
    );

    // Get the newly created machine
    const [newMachine] = await tpmConnection.query(
      `
      SELECT 
        m.uuid_machine,
        m.serial_machine,
        m.RFID_machine,
        m.code_machine,
        m.name_machine,
        m.manufacturer,
        m.price,
        m.date_of_use,
        m.lifespan,
        m.repair_cost,
        m.note,
        m.current_status,
        m.created_at,
        m.updated_at,
        m.created_by,
        m.updated_by,
        c.name_category,
        c.id_category
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      WHERE m.id_machine = ?
      `,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Tạo máy móc thành công",
      data: newMachine[0],
    });
  } catch (error) {
    console.error("Error creating machine:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// PUT /api/machines/:uuid - Update machine by UUID
app.put("/api/machines/:uuid", authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      code_machine,
      serial_machine,
      RFID_machine,
      name_machine,
      manufacturer,
      price,
      date_of_use,
      lifespan,
      repair_cost,
      note,
      current_status,
    } = req.body;

    // Check if machine exists
    const [existing] = await tpmConnection.query(
      "SELECT uuid_machine FROM tb_machine WHERE uuid_machine = ?",
      [uuid]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Check if serial_machine and code_machine already exists for another machine (if provided)
    if (serial_machine) {
      const [existingSerial] = await tpmConnection.query(
        "SELECT code_machine, serial_machine, uuid_machine FROM tb_machine WHERE code_machine = ? AND serial_machine = ? AND uuid_machine != ?",
        [code_machine, serial_machine, uuid]
      );

      if (existingSerial.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Serial đã tồn tại",
        });
      }
    }

    // Format date to YYYY-MM-DD with timezone handling
    let formattedDate = date_of_use;
    if (date_of_use) {
      const dateObj = new Date(date_of_use);
      // Get local date components to avoid timezone issues
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      formattedDate = `${year}-${month}-${day}`;
    }

    // Get user ID from token
    const userMANV = req.user.ma_nv;

    // Update machine
    await tpmConnection.query(
      `
      UPDATE tb_machine 
      SET 
        code_machine = ?,
        serial_machine = ?,
        RFID_machine = ?,
        name_machine = ?,
        manufacturer = ?,
        price = ?,
        date_of_use = ?,
        lifespan = ?,
        repair_cost = ?,
        note = ?,
        current_status = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine = ?
      `,
      [
        code_machine,
        serial_machine,
        RFID_machine,
        name_machine,
        manufacturer,
        price,
        formattedDate,
        lifespan,
        repair_cost,
        note,
        current_status,
        userMANV, // updated_by
        uuid,
      ]
    );

    // Get updated machine
    const [updated] = await tpmConnection.query(
      `
      SELECT 
        m.uuid_machine,
        m.serial_machine,
        m.RFID_machine,
        m.code_machine,
        m.name_machine,
        m.manufacturer,
        m.price,
        m.date_of_use,
        m.lifespan,
        m.repair_cost,
        m.note,
        m.current_status,
        m.created_at,
        m.updated_at,
        m.created_by,
        m.updated_by,
        c.name_category
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      WHERE m.uuid_machine = ?
      `,
      [uuid]
    );

    res.json({
      success: true,
      message: "Machine updated successfully",
      data: updated[0],
    });
  } catch (error) {
    console.error("Error updating machine:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
