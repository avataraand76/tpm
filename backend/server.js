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
  // Danh sách các endpoint không cần xác thực
  const publicEndpoints = [
    // Thêm các endpoint khác nếu cần
  ];

  // Kiểm tra nếu endpoint hiện tại nằm trong danh sách public
  if (publicEndpoints.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return (
      res
        .status(401)
        // .json({ success: false, message: "No token provided" });
        .json({ success: false, message: "Access token is required" })
    );
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
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
          bophan_id: user.id_bo_phan,
          bophan_name: user.ten_bo_phan,
          phongban_id: user.id_phong_ban,
          phongban_name: user.ten_phong_ban,
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

// GET /api/auth/permissions - Get current user permissions
app.get("/api/auth/permissions", authenticateToken, async (req, res) => {
  try {
    // req.user.id chính là id_nhan_vien (nv.id) đã được gán vào token khi login
    const id_nhan_vien = req.user.id;

    if (!id_nhan_vien) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Truy vấn để lấy tên các quyền từ tb_permission
    const [permissions] = await tpmConnection.query(
      `
      SELECT 
        p.name_permission
      FROM tb_user_permission up
      JOIN tb_permission p ON up.id_permission = p.id_permission
      WHERE up.id_nhan_vien = ?
      `,
      [id_nhan_vien]
    );

    // Trả về một mảng các tên quyền, ví dụ: ['admin', 'edit']
    const permissionNames = permissions.map((p) => p.name_permission);

    res.json({
      success: true,
      message: "Permissions retrieved successfully",
      data: permissionNames,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
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
        WHERE (m.type_machine LIKE ?
        OR m.model_machine LIKE ?
        OR m.code_machine LIKE ? 
        OR m.serial_machine LIKE ? 
        OR m.manufacturer LIKE ?
        OR tl.name_location LIKE ?)
      `;
      countParams = [
        searchPattern,
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
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
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
        m.type_machine,
        m.model_machine,
        m.manufacturer,
        m.price,
        m.date_of_use,
        m.lifespan,
        m.repair_cost,
        m.note,
        m.current_status,
        m.is_borrowed_or_rented_or_borrowed_out,
        m.is_borrowed_or_rented_or_borrowed_out_name,
        m.is_borrowed_or_rented_or_borrowed_out_date,
        m.is_borrowed_or_rented_or_borrowed_out_return_date,
        m.created_at,
        m.updated_at,
        c.name_category,
        tl.name_location
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      ${whereClause}
      ORDER BY m.code_machine ASC
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
        SUM(CASE WHEN current_status = 'liquidation' THEN 1 ELSE 0 END) as liquidation,
        SUM(CASE WHEN current_status = 'disabled' THEN 1 ELSE 0 END) as disabled,
        SUM(CASE WHEN is_borrowed_or_rented_or_borrowed_out = 'borrowed' THEN 1 ELSE 0 END) as borrowed,
        SUM(CASE WHEN is_borrowed_or_rented_or_borrowed_out = 'rented' THEN 1 ELSE 0 END) as rented,
        SUM(CASE WHEN is_borrowed_or_rented_or_borrowed_out = 'borrowed_out' THEN 1 ELSE 0 END) as borrowed_out,
        SUM(CASE WHEN is_borrowed_or_rented_or_borrowed_out = 'borrowed_return' THEN 1 ELSE 0 END) as borrowed_return,
        SUM(CASE WHEN is_borrowed_or_rented_or_borrowed_out = 'rented_return' THEN 1 ELSE 0 END) as rented_return
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

app.get("/api/machines/search", authenticateToken, async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Giới hạn số lượng kết quả trả về
    const offset = (page - 1) * limit;

    if (!search || search.length < 2) {
      return res.json({
        success: true,
        message: "Cần tối thiểu 2 ký tự để tìm kiếm.",
        data: [],
        pagination: { page: 1, limit: limit, total: 0, totalPages: 1 },
      });
    }

    const searchPattern = `%${search}%`;
    const searchParams = [
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    ]; // <<< CHANGED (4 params)

    // 1. Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tb_machine m
      WHERE (m.type_machine LIKE ? OR m.model_machine LIKE ? OR m.code_machine LIKE ? OR m.serial_machine LIKE ?) -- <<< CHANGED
      -- AND m.current_status = 'available'
    `;

    const [countResult] = await tpmConnection.query(countQuery, searchParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // 2. Get paginated data
    const dataQuery = `
      SELECT 
        m.uuid_machine,
        m.code_machine,
        m.type_machine,  -- <<< CHANGED
        m.model_machine, -- <<< CHANGED
        m.serial_machine,
        m.current_status,
        m.is_borrowed_or_rented_or_borrowed_out,
        c.name_category,
        tl.uuid_location,
        tl.name_location
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      WHERE (m.type_machine LIKE ? OR m.model_machine LIKE ? OR m.code_machine LIKE ? OR m.serial_machine LIKE ?) -- <<< CHANGED
      -- AND m.current_status = 'available'
      ORDER BY m.code_machine ASC
      LIMIT ? OFFSET ?
    `;

    const [machines] = await tpmConnection.query(dataQuery, [
      ...searchParams,
      limit,
      offset,
    ]);

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
    console.error("Error fetching machines for search:", error);
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
        m.type_machine,
        m.model_machine,
        m.manufacturer,
        m.price,
        m.date_of_use,
        m.lifespan,
        m.repair_cost,
        m.note,
        m.current_status,
        m.is_borrowed_or_rented_or_borrowed_out,
        m.is_borrowed_or_rented_or_borrowed_out_name,
        m.is_borrowed_or_rented_or_borrowed_out_date,
        m.is_borrowed_or_rented_or_borrowed_out_return_date,
        m.created_at,
        m.updated_at,
        c.name_category,
        c.uuid_category,
        tl.name_location,
        tl.uuid_location
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
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

// GET /api/machines/by-serial/:serial - Get machine details by Serial Number
app.get(
  "/api/machines/by-serial/:serial",
  authenticateToken,
  async (req, res) => {
    try {
      const { serial } = req.params;

      if (!serial) {
        return res.status(400).json({
          success: false,
          message: "Serial number is required",
        });
      }

      // Truy vấn máy móc, loại máy, và vị trí hiện tại của nó
      const dataQuery = `
      SELECT 
        m.uuid_machine,
        m.code_machine,
        m.type_machine,  -- <<< CHANGED
        m.model_machine, -- <<< CHANGED
        m.serial_machine,
        m.current_status,
        m.is_borrowed_or_rented_or_borrowed_out,
        m.is_borrowed_or_rented_or_borrowed_out_name,
        m.is_borrowed_or_rented_or_borrowed_out_date,
        m.is_borrowed_or_rented_or_borrowed_out_return_date,
        c.name_category,
        tl.uuid_location,
        tl.name_location
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      WHERE m.serial_machine = ?
      AND m.current_status = 'available'
      LIMIT 1
    `;

      const [machines] = await tpmConnection.query(dataQuery, [serial]);

      if (machines.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy máy móc có sẵn với Serial này",
        });
      }

      res.json({
        success: true,
        message: "Machine details retrieved successfully",
        data: machines[0],
      });
    } catch (error) {
      console.error("Error fetching machine by serial:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// POST /api/machines - Create new machine
app.post("/api/machines", authenticateToken, async (req, res) => {
  try {
    const {
      code_machine,
      serial_machine,
      RFID_machine,
      type_machine, // <<< CHANGED
      model_machine, // <<< CHANGED
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
    if (!code_machine || !type_machine || !serial_machine) {
      return res.status(400).json({
        success: false,
        message: "Mã máy, Loại máy, Serial máy là bắt buộc",
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
        (code_machine, serial_machine, RFID_machine, type_machine, model_machine, manufacturer, 
         price, date_of_use, lifespan, repair_cost, note, current_status, id_category,
         created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, // <<< CHANGED (15 placeholders)
      [
        code_machine,
        serial_machine,
        RFID_machine || null,
        type_machine || null, // <<< CHANGED
        model_machine || null, // <<< CHANGED
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
        m.type_machine,  -- <<< CHANGED
        m.model_machine, -- <<< CHANGED
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
      type_machine, // <<< CHANGED
      model_machine, // <<< CHANGED
      manufacturer,
      price,
      date_of_use,
      lifespan,
      repair_cost,
      note,
      current_status,
      is_borrowed_or_rented_or_borrowed_out_return_date,
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
        type_machine = ?,
        model_machine = ?,
        manufacturer = ?,
        price = ?,
        date_of_use = ?,
        lifespan = ?,
        repair_cost = ?,
        note = ?,
        current_status = ?,
        is_borrowed_or_rented_or_borrowed_out_return_date = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine = ?
      `,
      [
        code_machine,
        serial_machine,
        RFID_machine,
        type_machine, // <<< CHANGED
        model_machine, // <<< CHANGED
        manufacturer,
        price,
        formattedDate,
        lifespan,
        repair_cost,
        note,
        current_status,
        is_borrowed_or_rented_or_borrowed_out_return_date,
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
        m.type_machine,  -- <<< CHANGED
        m.model_machine, -- <<< CHANGED
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

// POST /api/machines/batch-import - Import multiple machines from Excel
app.post("/api/machines/batch-import", authenticateToken, async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    const { machines } = req.body; // Expect an array of machine objects
    const userMANV = req.user.ma_nv;

    if (!machines || !Array.isArray(machines) || machines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No machine data provided",
      });
    }

    await connection.beginTransaction();

    const errors = [];
    const successes = [];
    const machinesToInsert = [];

    // --- 1. Lấy tất cả code và serial từ file ---
    const codesInFile = machines.map((m) => m.code_machine).filter(Boolean);
    const serialsInFile = machines.map((m) => m.serial_machine).filter(Boolean);

    // --- 2. Kiểm tra trùng lặp trong DB ---
    let existingCodes = new Set();
    let existingSerials = new Set();

    if (codesInFile.length > 0) {
      const [codeRows] = await connection.query(
        "SELECT code_machine FROM tb_machine WHERE code_machine IN (?)",
        [codesInFile]
      );
      existingCodes = new Set(codeRows.map((r) => r.code_machine));
    }

    if (serialsInFile.length > 0) {
      const [serialRows] = await connection.query(
        "SELECT serial_machine FROM tb_machine WHERE serial_machine IN (?)",
        [serialsInFile]
      );
      existingSerials = new Set(serialRows.map((r) => r.serial_machine));
    }

    // --- 3. Kiểm tra trùng lặp trong file (nội bộ) ---
    const codesInThisBatch = new Set();
    const serialsInThisBatch = new Set();

    // --- 4. Lặp qua để xác thực ---
    for (let i = 0; i < machines.length; i++) {
      const machine = machines[i];
      const line = i + 2; // Giả sử dòng 1 là header

      // Bắt buộc
      if (
        !machine.code_machine ||
        !machine.serial_machine ||
        !machine.type_machine
      ) {
        errors.push({
          line,
          code: machine.code_machine || "N/A",
          serial: machine.serial_machine || "N/A",
          message: "Thiếu thông tin bắt buộc (Mã máy, Serial, Loại máy)",
        });
        continue;
      }

      // Check DB duplicates
      if (existingCodes.has(machine.code_machine)) {
        errors.push({
          line,
          code: machine.code_machine,
          serial: machine.serial_machine,
          message: `Mã máy "${machine.code_machine}" đã tồn tại trong Cơ sở dữ liệu`,
        });
        continue;
      }
      if (existingSerials.has(machine.serial_machine)) {
        errors.push({
          line,
          code: machine.code_machine,
          serial: machine.serial_machine,
          message: `Serial "${machine.serial_machine}" đã tồn tại trong Cơ sở dữ liệu`,
        });
        continue;
      }

      // Check in-file duplicates
      if (codesInThisBatch.has(machine.code_machine)) {
        errors.push({
          line,
          code: machine.code_machine,
          serial: machine.serial_machine,
          message: `Mã máy "${machine.code_machine}" bị trùng lặp trong file`,
        });
        continue;
      }
      if (serialsInThisBatch.has(machine.serial_machine)) {
        errors.push({
          line,
          code: machine.code_machine,
          serial: machine.serial_machine,
          message: `Serial "${machine.serial_machine}" bị trùng lặp trong file`,
        });
        continue;
      }

      codesInThisBatch.add(machine.code_machine);
      serialsInThisBatch.add(machine.serial_machine);
      machinesToInsert.push(machine);
    }

    // --- 5. Chèn những máy hợp lệ ---
    if (machinesToInsert.length > 0) {
      for (const machine of machinesToInsert) {
        let formattedDate = machine.date_of_use;
        if (machine.date_of_use) {
          // Logic định dạng ngày từ Excel (Excel có thể trả về số)
          if (typeof machine.date_of_use === "number") {
            // Excel date serial number to JS Date
            const jsDate = new Date(
              Math.round((machine.date_of_use - 25569) * 86400 * 1000)
            );
            formattedDate = jsDate.toISOString().split("T")[0];
          } else {
            // Thử parse string
            const dateObj = new Date(machine.date_of_use);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, "0");
              const day = String(dateObj.getDate()).padStart(2, "0");
              formattedDate = `${year}-${month}-${day}`;
            } else {
              formattedDate = null; // Hoặc giữ nguyên giá trị nếu không parse được
            }
          }
        }

        await connection.query(
          `
          INSERT INTO tb_machine 
            (code_machine, serial_machine, RFID_machine, type_machine, model_machine, manufacturer, 
             price, date_of_use, lifespan, repair_cost, note, current_status, id_category,
             created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            machine.code_machine,
            machine.serial_machine,
            machine.RFID_machine || null,
            machine.type_machine || null,
            machine.model_machine || null,
            machine.manufacturer || null,
            machine.price || null,
            formattedDate || null,
            machine.lifespan || null,
            machine.repair_cost || null,
            machine.note || null,
            machine.current_status || "available",
            machine.id_category || 1,
            userMANV, // created_by
            userMANV, // updated_by
          ]
        );
        successes.push({
          code: machine.code_machine,
          serial: machine.serial_machine,
          type: machine.type_machine,
          model: machine.model_machine,
        });
      }
    }

    // Nếu có lỗi nhưng không có máy nào được chèn, vẫn commit (vì không thay đổi DB)
    // Nếu có máy được chèn, commit
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Import processing complete",
      data: {
        successCount: successes.length,
        errorCount: errors.length,
        successes,
        errors,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error during batch import:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during import",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// MARK: DEPARTMENTS

// GET /api/departments - Get all departments
app.get("/api/departments", authenticateToken, async (req, res) => {
  try {
    const [departments] = await tpmConnection.query(
      `
      SELECT 
        uuid_department, 
        name_department 
      FROM tb_department 
      ORDER BY id_department ASC
      `
    );

    res.json({
      success: true,
      message: "Departments retrieved successfully",
      data: departments,
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// MARK: LOCATIONS

// GET /api/locations - Get all locations for dropdowns
app.get("/api/locations", authenticateToken, async (req, res) => {
  try {
    const { filter_type, department_uuid } = req.query; // <<< CHANGED: Thêm department_uuid

    let query = `
      SELECT 
        tl.uuid_location, 
        tl.name_location,
        td.name_department
      FROM tb_location tl
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
    `;
    let params = [];
    let whereConditions = [];

    if (department_uuid) {
      whereConditions.push(`td.uuid_department = ?`);
      params.push(department_uuid);
    }

    if (filter_type === "internal") {
      // Req 1.2: HIDE external
      whereConditions.push(
        `(td.name_department NOT LIKE '%Đơn vị bên ngoài%' OR td.name_department IS NULL)`
      );
    } else if (filter_type === "warehouse_only") {
      // Req 2.1, 3.1: SHOW ONLY warehouse
      whereConditions.push(`tl.name_location LIKE '%Kho%'`);
    } else if (filter_type === "external_only") {
      // Req 4.1, 5.1, 6.1: SHOW ONLY external
      whereConditions.push(`td.name_department LIKE '%Đơn vị bên ngoài%'`);
    } else if (filter_type === "internal_no_warehouse") {
      // Show internal locations, EXCLUDING warehouses
      whereConditions.push(
        `(td.name_department NOT LIKE '%Đơn vị bên ngoài%' OR td.name_department IS NULL)` // Internal
      );
      whereConditions.push(`tl.name_location NOT LIKE '%Kho%'`); // Exclude warehouse
    }
    // No filter_type: return all

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    // query += ` ORDER BY tl.name_location ASC`; // <<< CHANGED: Bật lại sắp xếp

    const [locations] = await tpmConnection.query(query, params);

    res.json({
      success: true,
      message: "Locations retrieved successfully",
      data: locations,
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// MARK: IMPORT OPERATIONS

// POST /api/imports - Create new import slip
app.post("/api/imports", authenticateToken, async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    await connection.beginTransaction();

    const {
      to_location_uuid,
      import_type,
      import_date,
      note,
      machines,
      is_borrowed_or_rented_or_borrowed_out_name,
      is_borrowed_or_rented_or_borrowed_out_date,
      is_borrowed_or_rented_or_borrowed_out_return_date,
    } = req.body;

    // Validate required fields
    if (!to_location_uuid || !import_type || !import_date) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vị trí nhập, loại nhập và ngày nhập là bắt buộc",
      });
    }

    let to_location_id = null;
    if (to_location_uuid) {
      const [toLoc] = await connection.query(
        "SELECT id_location FROM tb_location WHERE uuid_location = ?",
        [to_location_uuid]
      );
      if (toLoc.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy vị trí nhập." });
      }
      to_location_id = toLoc[0].id_location;
    }

    const isBorrowOrRent = ["borrowed", "rented"].includes(import_type);
    if (
      isBorrowOrRent &&
      (!is_borrowed_or_rented_or_borrowed_out_name ||
        !is_borrowed_or_rented_or_borrowed_out_date)
    ) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tên người/đơn vị và Ngày mượn/thuê là bắt buộc.",
      });
    }

    // Format date
    const dateObj = new Date(import_date);
    const formattedDate = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    const userMANV = req.user.ma_nv;

    // Insert import slip
    const [importResult] = await connection.query(
      `
      INSERT INTO tb_machine_import 
        (to_location_id, import_type, import_date, status, note, created_by, updated_by,
         is_borrowed_or_rented_or_borrowed_out_name,
         is_borrowed_or_rented_or_borrowed_out_date,
         is_borrowed_or_rented_or_borrowed_out_return_date)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      `,
      [
        to_location_id,
        import_type,
        formattedDate,
        note || null,
        userMANV,
        userMANV,
        isBorrowOrRent ? is_borrowed_or_rented_or_borrowed_out_name : null,
        isBorrowOrRent ? is_borrowed_or_rented_or_borrowed_out_date : null,
        isBorrowOrRent
          ? is_borrowed_or_rented_or_borrowed_out_return_date || null
          : null,
      ]
    );

    const importId = importResult.insertId;

    // Insert import details if machines provided
    if (machines && Array.isArray(machines) && machines.length > 0) {
      for (const machine of machines) {
        if (!machine.uuid_machine) continue; // Bỏ qua nếu không có uuid

        // 1. Tra cứu id_machine và kiểm tra trạng thái
        const [machineResult] = await connection.query(
          "SELECT id_machine, current_status FROM tb_machine WHERE uuid_machine = ?",
          [machine.uuid_machine]
        );

        if (machineResult.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `Máy có UUID ${machine.uuid_machine} không tồn tại.`,
          });
        }

        const idMachine = machineResult[0].id_machine;
        const currentStatus = machineResult[0].current_status;

        // 2. Kiểm tra trạng thái máy (chỉ cho phép nhập máy không phải 'liquidation' hoặc 'disabled')
        if (currentStatus === "liquidation" || currentStatus === "disabled") {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Máy ${machine.uuid_machine} đang ở trạng thái ${currentStatus}. Không thể nhập.`,
          });
        }

        // 3. Chèn chi tiết phiếu nhập (sử dụng idMachine đã tra cứu)
        await connection.query(
          `
          INSERT INTO tb_machine_import_detail 
            (id_machine_import, id_machine, note, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            importId,
            idMachine, // SỬ DỤNG ID NỘI BỘ ĐÃ TRA CỨU
            machine.note || null,
            userMANV,
            userMANV,
          ]
        );
      }
    }

    await connection.commit();

    // Get created import with details
    const [importData] = await connection.query(
      `
      SELECT 
        i.uuid_machine_import,
        i.import_type,
        i.import_date,
        i.status,
        i.note,
        i.created_at,
        i.updated_at,
        tl.uuid_location as to_location_uuid,
        tl.name_location as to_location_name,
        td.uuid_department as to_department_uuid,
        td.name_department as to_department_name
      FROM tb_machine_import i
      LEFT JOIN tb_location tl ON tl.id_location = i.to_location_id
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      WHERE i.id_machine_import = ?
      `,
      [importId]
    );

    const [details] = await connection.query(
      `
      SELECT 
        d.note,
        d.created_at,
        d.updated_at,
        m.uuid_machine,
        m.code_machine,
        m.type_machine,  -- <<< CHANGED
        m.model_machine, -- <<< CHANGED
        m.serial_machine
      FROM tb_machine_import_detail d
      LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
      WHERE d.id_machine_import = ?
      `,
      [importId]
    );

    res.status(201).json({
      success: true,
      message: "Tạo phiếu nhập thành công",
      data: {
        import: importData[0],
        details: details,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating import:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// GET /api/imports - Get all import slips with pagination
app.get("/api/imports", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const import_type = req.query.import_type || "";
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(`(i.note LIKE ? OR tl.name_location LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereConditions.push(`i.status = ?`);
      params.push(status);
    }

    if (import_type) {
      whereConditions.push(`i.import_type = ?`);
      params.push(import_type);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const [countResult] = await tpmConnection.query(
      `
      SELECT COUNT(*) as total
      FROM tb_machine_import i
      LEFT JOIN tb_location tl ON tl.id_location = i.to_location_id
      ${whereClause}
      `,
      params
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    const [imports] = await tpmConnection.query(
      `
      SELECT 
        i.uuid_machine_import,
        i.import_type,
        i.import_date,
        i.status,
        i.note,
        i.created_at,
        i.updated_at,
        i.is_borrowed_or_rented_or_borrowed_out_name,
        i.is_borrowed_or_rented_or_borrowed_out_date,
        i.is_borrowed_or_rented_or_borrowed_out_return_date,
        tl.uuid_location as to_location_uuid,
        tl.name_location as to_location_name,
        td.uuid_department as to_department_uuid,
        td.name_department as to_department_name,
        COUNT(d.id_machine) as machine_count
      FROM tb_machine_import i
      LEFT JOIN tb_location tl ON tl.id_location = i.to_location_id
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      LEFT JOIN tb_machine_import_detail d ON d.id_machine_import = i.id_machine_import
      ${whereClause}
      GROUP BY i.id_machine_import
      ORDER BY i.import_date DESC, i.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      message: "Imports retrieved successfully",
      data: imports,
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
    console.error("Error fetching imports:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/imports/:uuid - Get import details by UUID
app.get("/api/imports/:uuid", authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;

    // 1. Truy vấn ID nội bộ và kiểm tra sự tồn tại
    const [idResult] = await tpmConnection.query(
      "SELECT id_machine_import FROM tb_machine_import WHERE uuid_machine_import = ?",
      [uuid]
    );

    if (idResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Import not found",
      });
    }

    const importId = idResult[0].id_machine_import;

    // 2. Truy vấn chi tiết phiếu (không bao gồm ID nội bộ)
    const [imports] = await tpmConnection.query(
      `
      SELECT 
        i.uuid_machine_import,
        i.import_type,
        i.import_date,
        i.status,
        i.note,
        i.created_at,
        i.updated_at,
        i.is_borrowed_or_rented_or_borrowed_out_name,
        i.is_borrowed_or_rented_or_borrowed_out_date,
        i.is_borrowed_or_rented_or_borrowed_out_return_date,
        tl.uuid_location as to_location_uuid,
        tl.name_location as to_location_name,
        td.uuid_department as to_department_uuid,
        td.name_department as to_department_name
      FROM tb_machine_import i
      LEFT JOIN tb_location tl ON tl.id_location = i.to_location_id
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      WHERE i.uuid_machine_import = ?
      `,
      [uuid]
    );

    if (imports.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Import not found",
      });
    }

    // 3. Truy vấn chi tiết máy móc (sử dụng ID nội bộ đã lấy)
    const [details] = await tpmConnection.query(
      `
      SELECT 
        d.note,
        d.created_at,
        d.updated_at,
        m.uuid_machine,
        m.code_machine,
        m.type_machine,
        m.model_machine,
        m.serial_machine,
        m.current_status,
        c.uuid_category,
        c.name_category,
        tl.name_location
      FROM tb_machine_import_detail d
      LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      WHERE d.id_machine_import = ?
      `,
      [importId]
    );

    res.json({
      success: true,
      message: "Import details retrieved successfully",
      data: {
        import: imports[0],
        details: details,
      },
    });
  } catch (error) {
    console.error("Error fetching import details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// PUT /api/imports/:uuid/status - Update import status
app.put("/api/imports/:uuid/status", authenticateToken, async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    await connection.beginTransaction();

    const { uuid } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "completed", "cancelled"].includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // MODIFIED: Fetch more data from ticket
    const [existing] = await connection.query(
      `
      SELECT 
        i.id_machine_import, 
        i.to_location_id, 
        i.import_type,
        i.is_borrowed_or_rented_or_borrowed_out_name,
        i.is_borrowed_or_rented_or_borrowed_out_date,
        i.is_borrowed_or_rented_or_borrowed_out_return_date,
        l.name_location
      FROM tb_machine_import i
      LEFT JOIN tb_location l ON l.id_location = i.to_location_id
      WHERE i.uuid_machine_import = ?
      `,
      [uuid]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Import not found",
      });
    }

    const {
      id_machine_import,
      to_location_id,
      import_type,
      name_location, // NEW
      is_borrowed_or_rented_or_borrowed_out_name, // NEW
      is_borrowed_or_rented_or_borrowed_out_date, // NEW
      is_borrowed_or_rented_or_borrowed_out_return_date, // NEW
    } = existing[0];
    const userMANV = req.user.ma_nv;

    // 1. Update ticket status
    await connection.query(
      `
      UPDATE tb_machine_import 
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine_import = ?
      `,
      [status, userMANV, uuid]
    );

    // 2. UNCOMMENTED AND UPDATED
    if (status === "completed") {
      const ticketBorrowInfo = {
        name: is_borrowed_or_rented_or_borrowed_out_name,
        date: is_borrowed_or_rented_or_borrowed_out_date,
        return_date: is_borrowed_or_rented_or_borrowed_out_return_date,
      };

      await updateMachineLocationAndStatus(
        connection,
        "import",
        id_machine_import,
        to_location_id,
        name_location, // NEW
        status,
        import_type,
        ticketBorrowInfo, // NEW
        userMANV
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Import status updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating import status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// MARK: EXPORT OPERATIONS

// POST /api/exports - Create new export slip
app.post("/api/exports", authenticateToken, async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    await connection.beginTransaction();

    const {
      to_location_uuid,
      export_type,
      export_date,
      note,
      machines,
      is_borrowed_or_rented_or_borrowed_out_name,
      is_borrowed_or_rented_or_borrowed_out_date,
      is_borrowed_or_rented_or_borrowed_out_return_date,
    } = req.body;

    // Validate required fields
    if (!to_location_uuid || !export_type || !export_date) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vị trí xuất, loại xuất và ngày xuất là bắt buộc",
      });
    }

    let to_location_id = null;
    if (to_location_uuid) {
      const [toLoc] = await connection.query(
        "SELECT id_location FROM tb_location WHERE uuid_location = ?",
        [to_location_uuid]
      );
      if (toLoc.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy vị trí xuất." });
      }
      to_location_id = toLoc[0].id_location;
    }

    const isBorrowOut = export_type === "borrowed_out";
    if (
      isBorrowOut &&
      (!is_borrowed_or_rented_or_borrowed_out_name ||
        !is_borrowed_or_rented_or_borrowed_out_date)
    ) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tên người/đơn vị và Ngày cho mượn là bắt buộc.",
      });
    }

    // Format date
    const dateObj = new Date(export_date);
    const formattedDate = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    const userMANV = req.user.ma_nv;

    // Insert export slip
    const [exportResult] = await connection.query(
      `
      INSERT INTO tb_machine_export 
        (to_location_id, export_type, export_date, status, note, created_by, updated_by,
         is_borrowed_or_rented_or_borrowed_out_name,
         is_borrowed_or_rented_or_borrowed_out_date,
         is_borrowed_or_rented_or_borrowed_out_return_date)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      `,
      [
        to_location_id,
        export_type,
        formattedDate,
        note || null,
        userMANV,
        userMANV,
        isBorrowOut ? is_borrowed_or_rented_or_borrowed_out_name : null,
        isBorrowOut ? is_borrowed_or_rented_or_borrowed_out_date : null,
        isBorrowOut
          ? is_borrowed_or_rented_or_borrowed_out_return_date || null
          : null,
      ]
    );

    const exportId = exportResult.insertId;

    // Insert export details if machines provided
    if (machines && Array.isArray(machines) && machines.length > 0) {
      for (const machine of machines) {
        if (!machine.uuid_machine) continue; // Bỏ qua nếu không có uuid

        // 1. Tra cứu id_machine và kiểm tra trạng thái
        const [machineResult] = await connection.query(
          "SELECT id_machine, current_status FROM tb_machine WHERE uuid_machine = ?",
          [machine.uuid_machine]
        );

        if (machineResult.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `Máy có UUID ${machine.uuid_machine} không tồn tại.`,
          });
        }

        const idMachine = machineResult[0].id_machine;
        const currentStatus = machineResult[0].current_status;

        // 2. Kiểm tra trạng thái máy: chỉ cho phép xuất máy đang 'available' hoặc 'maintenance' (nếu xuất bảo trì)
        const isMaintenanceExport = export_type === "maintenance";
        if (
          currentStatus !== "available" &&
          !(isMaintenanceExport && currentStatus === "maintenance")
        ) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Máy ${machine.uuid_machine} không ở trạng thái 'available' hoặc 'maintenance' (nếu là phiếu xuất bảo trì). Trạng thái hiện tại: ${currentStatus}.`,
          });
        }

        // 3. Chèn chi tiết phiếu xuất (sử dụng idMachine đã tra cứu)
        await connection.query(
          `
          INSERT INTO tb_machine_export_detail 
            (id_machine_export, id_machine, note, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            exportId,
            idMachine, // SỬ DỤNG ID NỘI BỘ ĐÃ TRA CỨU
            machine.note || null,
            userMANV,
            userMANV,
          ]
        );
      }
    }

    await connection.commit();

    // Get created export with details
    const [exportData] = await connection.query(
      `
      SELECT 
        e.uuid_machine_export,
        e.export_type,
        e.export_date,
        e.status,
        e.note,
        e.created_at,
        e.updated_at,
        tl.uuid_location as to_location_uuid,
        tl.name_location as to_location_name,
        td.uuid_department as to_department_uuid,
        td.name_department as to_department_name
      FROM tb_machine_export e
      LEFT JOIN tb_location tl ON tl.id_location = e.to_location_id
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      WHERE e.id_machine_export = ?
      `,
      [exportId]
    );

    const [details] = await connection.query(
      `
      SELECT 
        d.note,
        d.created_at,
        d.updated_at,
        m.uuid_machine,
        m.code_machine,
        m.type_machine,  -- <<< CHANGED
        m.model_machine, -- <<< CHANGED
        m.serial_machine
      FROM tb_machine_export_detail d
      LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
      WHERE d.id_machine_export = ?
      `,
      [exportId]
    );

    res.status(201).json({
      success: true,
      message: "Tạo phiếu xuất thành công",
      data: {
        export: exportData[0],
        details: details,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating export:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// GET /api/exports - Get all export slips with pagination
app.get("/api/exports", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const export_type = req.query.export_type || "";
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(`(e.note LIKE ? OR tl.name_location LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereConditions.push(`e.status = ?`);
      params.push(status);
    }

    if (export_type) {
      whereConditions.push(`e.export_type = ?`);
      params.push(export_type);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const [countResult] = await tpmConnection.query(
      `
      SELECT COUNT(*) as total
      FROM tb_machine_export e
      LEFT JOIN tb_location tl ON tl.id_location = e.to_location_id
      ${whereClause}
      `,
      params
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    const [exports] = await tpmConnection.query(
      `
      SELECT 
        e.uuid_machine_export,
        e.export_type,
        e.export_date,
        e.status,
        e.note,
        e.created_at,
        e.updated_at,
        e.is_borrowed_or_rented_or_borrowed_out_name,
        e.is_borrowed_or_rented_or_borrowed_out_date,
        e.is_borrowed_or_rented_or_borrowed_out_return_date,
        tl.uuid_location as to_location_uuid,
        tl.name_location as to_location_name,
        td.uuid_department as to_department_uuid,
        td.name_department as to_department_name,
        COUNT(d.id_machine) as machine_count
      FROM tb_machine_export e
      LEFT JOIN tb_location tl ON tl.id_location = e.to_location_id
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      LEFT JOIN tb_machine_export_detail d ON d.id_machine_export = e.id_machine_export
      ${whereClause}
      GROUP BY e.id_machine_export
      ORDER BY e.export_date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      message: "Exports retrieved successfully",
      data: exports,
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
    console.error("Error fetching exports:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/exports/:uuid - Get export details by UUID
app.get("/api/exports/:uuid", authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;

    // 1. Truy vấn ID nội bộ và kiểm tra sự tồn tại
    const [idResult] = await tpmConnection.query(
      "SELECT id_machine_export FROM tb_machine_export WHERE uuid_machine_export = ?",
      [uuid]
    );

    if (idResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Export not found",
      });
    }

    const exportId = idResult[0].id_machine_export; // Lưu lại ID nội bộ

    // 2. Truy vấn chi tiết phiếu (không bao gồm ID nội bộ)
    const [exports] = await tpmConnection.query(
      `
      SELECT 
        e.uuid_machine_export,
        e.export_type,
        e.export_date,
        e.status,
        e.note,
        e.created_at,
        e.updated_at,
        e.is_borrowed_or_rented_or_borrowed_out_name,
        e.is_borrowed_or_rented_or_borrowed_out_date,
        e.is_borrowed_or_rented_or_borrowed_out_return_date,
        tl.uuid_location as to_location_uuid,
        tl.name_location as to_location_name,
        td.uuid_department as to_department_uuid,
        td.name_department as to_department_name
      FROM tb_machine_export e
      LEFT JOIN tb_location tl ON tl.id_location = e.to_location_id
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      WHERE e.uuid_machine_export = ?
      `,
      [uuid]
    );

    if (exports.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Export not found",
      });
    }

    // 3. Truy vấn chi tiết máy móc (sử dụng ID nội bộ đã lấy)
    const [details] = await tpmConnection.query(
      `
      SELECT 
        d.note,
        d.created_at,
        d.updated_at,
        m.uuid_machine,
        m.code_machine,
        m.type_machine,
        m.model_machine,
        m.serial_machine,
        m.current_status,
        c.uuid_category,
        c.name_category,
        tl.name_location
      FROM tb_machine_export_detail d
      LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      WHERE d.id_machine_export = ?
      `,
      [exportId]
    );

    res.json({
      success: true,
      message: "Export details retrieved successfully",
      data: {
        export: exports[0],
        details: details,
      },
    });
  } catch (error) {
    console.error("Error fetching export details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// PUT /api/exports/:uuid/status - Update export status
app.put("/api/exports/:uuid/status", authenticateToken, async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    await connection.beginTransaction();

    const { uuid } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "completed", "cancelled"].includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // MODIFIED: Fetch more data from ticket
    const [existing] = await connection.query(
      `
      SELECT 
        e.id_machine_export, 
        e.to_location_id, 
        e.export_type,
        e.is_borrowed_or_rented_or_borrowed_out_name,
        e.is_borrowed_or_rented_or_borrowed_out_date,
        e.is_borrowed_or_rented_or_borrowed_out_return_date,
        l.name_location
      FROM tb_machine_export e
      LEFT JOIN tb_location l ON l.id_location = e.to_location_id
      WHERE e.uuid_machine_export = ?
      `,
      [uuid]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Export not found",
      });
    }

    const {
      id_machine_export,
      to_location_id,
      export_type,
      name_location, // NEW
      is_borrowed_or_rented_or_borrowed_out_name, // NEW
      is_borrowed_or_rented_or_borrowed_out_date, // NEW
      is_borrowed_or_rented_or_borrowed_out_return_date, // NEW
    } = existing[0];
    const userMANV = req.user.ma_nv;

    // 1. Update ticket status
    await connection.query(
      `
      UPDATE tb_machine_export 
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine_export = ?
      `,
      [status, userMANV, uuid]
    );

    // 2. UNCOMMENTED AND UPDATED
    if (status === "completed") {
      const ticketBorrowInfo = {
        name: is_borrowed_or_rented_or_borrowed_out_name,
        date: is_borrowed_or_rented_or_borrowed_out_date,
        return_date: is_borrowed_or_rented_or_borrowed_out_return_date,
      };

      await updateMachineLocationAndStatus(
        connection,
        "export",
        id_machine_export,
        to_location_id,
        name_location, // NEW
        status,
        export_type,
        ticketBorrowInfo, // NEW
        userMANV
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Export status updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating export status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// Function to handle location and status updates in a transaction
// Requires an active connection from a pool
const updateMachineLocationAndStatus = async (
  connection,
  ticketType, // "import" or "export"
  ticketId, // id_machine_import or id_machine_export
  toLocationId,
  toLocationName, // NEW: Needed for warehouse check
  ticketStatus,
  ticketTypeDetail, // import_type or export_type
  ticketBorrowInfo, // NEW: Object { name, date, return_date }
  userMANV
) => {
  if (ticketStatus !== "completed") {
    return; // Chỉ xử lý khi phiếu được duyệt
  }

  // 1. Get all machines related to this ticket
  const detailTable =
    ticketType === "import"
      ? "tb_machine_import_detail"
      : "tb_machine_export_detail";
  const ticketIdField =
    ticketType === "import" ? "id_machine_import" : "id_machine_export";

  const [details] = await connection.query(
    `SELECT id_machine FROM ${detailTable} WHERE ${ticketIdField} = ?`,
    [ticketId]
  );
  if (details.length === 0) {
    console.warn(`No machines found for ${ticketType} ID: ${ticketId}`);
    return;
  }

  // Variables to hold NEW status and borrow info
  let newMachineStatus = "available";
  let shouldUpdateBorrowInfo = false; // Flag to control borrow info update
  let newBorrowStatus = null;
  let newBorrowName = null;
  let newBorrowDate = null;
  let newBorrowReturnDate = null;

  if (ticketType === "import") {
    switch (ticketTypeDetail) {
      case "purchased":
        newMachineStatus = "available";
        shouldUpdateBorrowInfo = true;
        newBorrowStatus = null;
        newBorrowName = null;
        newBorrowDate = null;
        newBorrowReturnDate = null;
        break;
      case "maintenance_return":
        newMachineStatus = "available";
        shouldUpdateBorrowInfo = false;
        break;
      case "borrowed_out_return":
        newMachineStatus = "available";
        shouldUpdateBorrowInfo = true;
        newBorrowStatus = null;
        newBorrowName = null;
        newBorrowDate = null;
        newBorrowReturnDate = null;
        break;
      case "borrowed":
        newMachineStatus = "available";
        shouldUpdateBorrowInfo = true;
        newBorrowStatus = "borrowed";
        newBorrowName = ticketBorrowInfo.name;
        newBorrowDate = ticketBorrowInfo.date;
        newBorrowReturnDate = ticketBorrowInfo.return_date;
        break;
      case "rented":
        newMachineStatus = "available";
        shouldUpdateBorrowInfo = true;
        newBorrowStatus = "rented";
        newBorrowName = ticketBorrowInfo.name;
        newBorrowDate = ticketBorrowInfo.date;
        newBorrowReturnDate = ticketBorrowInfo.return_date;
        break;
      default:
        newMachineStatus = "available";
        shouldUpdateBorrowInfo = true;
        newBorrowStatus = null;
    }
  } else {
    // ticketType === 'export'
    switch (ticketTypeDetail) {
      case "maintenance":
        newMachineStatus = "maintenance";
        shouldUpdateBorrowInfo = false;
        break;
      case "liquidation":
        newMachineStatus = "liquidation";
        shouldUpdateBorrowInfo = true;
        newBorrowStatus = null;
        newBorrowName = null;
        newBorrowDate = null;
        newBorrowReturnDate = null;
        break;
      case "borrowed_out":
        newMachineStatus = "disabled";
        shouldUpdateBorrowInfo = true;
        newBorrowStatus = "borrowed_out";
        newBorrowName = ticketBorrowInfo.name;
        newBorrowDate = ticketBorrowInfo.date;
        newBorrowReturnDate = ticketBorrowInfo.return_date;
        break;

      case "borrowed_return":
        newMachineStatus = "disabled";
        shouldUpdateBorrowInfo = false;
        newBorrowStatus = "borrowed_return";
        break;
      case "rented_return":
        newMachineStatus = "disabled";
        shouldUpdateBorrowInfo = false;
        newBorrowStatus = "rented_return";
        break;

      default:
        newMachineStatus = "available";
        shouldUpdateBorrowInfo = true;
        newBorrowStatus = null;
    }
  }

  // 2. Loop through each machine for updates
  for (const detail of details) {
    const idMachine = detail.id_machine;

    // a. Get current location (id_from_location)
    const [currentLocResult] = await connection.query(
      "SELECT id_location FROM tb_machine_location WHERE id_machine = ?",
      [idMachine]
    );
    const idFromLocation =
      currentLocResult.length > 0 ? currentLocResult[0].id_location : null;

    // b. Insert into tb_machine_location_history
    if (idFromLocation !== toLocationId) {
      // Only insert if location changes
      await connection.query(
        `
        INSERT INTO tb_machine_location_history
          (id_machine, id_from_location, id_to_location, move_date, created_by, updated_by)
        VALUES (?, ?, ?, CURDATE(), ?, ?)
        `,
        [idMachine, idFromLocation, toLocationId, userMANV, userMANV]
      );
    }

    // c. Update/Insert into tb_machine_location
    if (currentLocResult.length === 0) {
      // Insert
      await connection.query(
        `
        INSERT INTO tb_machine_location
          (id_machine, id_location, created_by, updated_by)
        VALUES (?, ?, ?, ?)
        `,
        [idMachine, toLocationId, userMANV, userMANV]
      );
    } else if (idFromLocation !== toLocationId) {
      // Update
      await connection.query(
        `
        UPDATE tb_machine_location
        SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [toLocationId, userMANV, idMachine]
      );
    } else {
      // No change, just touch updated_at
      await connection.query(
        `
        UPDATE tb_machine_location
        SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [userMANV, idMachine]
      );
    }

    // d. Update tb_machine status
    let updateQuery = `
      UPDATE tb_machine
      SET current_status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP`;
    let updateParams = [newMachineStatus, userMANV];

    if (
      ticketTypeDetail === "borrowed_return" ||
      ticketTypeDetail === "rented_return"
    ) {
      updateQuery += `, is_borrowed_or_rented_or_borrowed_out = ?`;
      updateParams.push(newBorrowStatus); // newBorrowStatus đã được set trong switch case
    }
    // Xử lý cho các trường hợp XÓA hoặc CẬP NHẬT MỚI toàn bộ
    else if (shouldUpdateBorrowInfo) {
      updateQuery += `, 
        is_borrowed_or_rented_or_borrowed_out = ?,
        is_borrowed_or_rented_or_borrowed_out_name = ?,
        is_borrowed_or_rented_or_borrowed_out_date = ?,
        is_borrowed_or_rented_or_borrowed_out_return_date = ?`;
      updateParams.push(
        newBorrowStatus,
        newBorrowName,
        newBorrowDate,
        newBorrowReturnDate
      );
    }

    updateQuery += ` WHERE id_machine = ?`;
    updateParams.push(idMachine);

    await connection.query(updateQuery, updateParams);
  }
};

// MARK: MACHINE INTERNAL TRANSFER

// GET /api/internal-transfers - Get all internal transfer slips
app.get("/api/internal-transfers", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || "";
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push(`t.status = ?`);
      params.push(status);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const [countResult] = await tpmConnection.query(
      `SELECT COUNT(*) as total FROM tb_machine_internal_transfer t ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    const [transfers] = await tpmConnection.query(
      `
        SELECT 
          t.uuid_machine_internal_transfer,
          t.transfer_date,
          t.status,
          t.note,
          t.created_at,
          t.updated_at,
          loc_to.name_location as to_location_name,
          COUNT(d.id_machine) as machine_count
        FROM tb_machine_internal_transfer t
        LEFT JOIN tb_location loc_to ON loc_to.id_location = t.to_location_id
        LEFT JOIN tb_machine_internal_transfer_detail d ON d.id_machine_internal_transfer = t.id_machine_internal_transfer
        ${whereClause}
        GROUP BY t.id_machine_internal_transfer
        ORDER BY t.transfer_date DESC, t.created_at DESC
        LIMIT ? OFFSET ?
        `,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      message: "Transfers retrieved successfully",
      data: transfers,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("Error fetching internal transfers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/internal-transfers/:uuid - Get single internal transfer details
app.get(
  "/api/internal-transfers/:uuid",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;

      const [idResult] = await tpmConnection.query(
        "SELECT id_machine_internal_transfer FROM tb_machine_internal_transfer WHERE uuid_machine_internal_transfer = ?",
        [uuid]
      );
      if (idResult.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Transfer not found" });
      }
      const transferId = idResult[0].id_machine_internal_transfer;

      // Get ticket details
      const [transferData] = await tpmConnection.query(
        `
        SELECT 
          t.uuid_machine_internal_transfer,
          t.transfer_date,
          t.status,
          t.note,
          t.created_at,
          t.updated_at,
          loc_to.uuid_location as to_location_uuid,
          loc_to.name_location as to_location_name
        FROM tb_machine_internal_transfer t
        LEFT JOIN tb_location loc_to ON loc_to.id_location = t.to_location_id
        WHERE t.id_machine_internal_transfer = ?
        `,
        [transferId]
      );

      // Get machine details
      const [details] = await tpmConnection.query(
        `
        SELECT 
          d.note,
          m.uuid_machine,
          m.code_machine,
          m.type_machine,
          m.model_machine,
          m.serial_machine,
          m.current_status,
          c.name_category,
          tl.name_location
        FROM tb_machine_internal_transfer_detail d
        LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
        LEFT JOIN tb_category c ON c.id_category = m.id_category
        LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
        LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
        WHERE d.id_machine_internal_transfer = ?
        `,
        [transferId]
      );

      res.json({
        success: true,
        message: "Transfer details retrieved successfully",
        data: {
          transfer: transferData[0],
          details: details,
        },
      });
    } catch (error) {
      console.error("Error fetching internal transfer details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// POST /api/internal-transfers - Create new internal transfer slip
app.post("/api/internal-transfers", authenticateToken, async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    await connection.beginTransaction();

    const { to_location_uuid, transfer_date, note, machines } = req.body;

    if (!to_location_uuid || !transfer_date) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vị trí đến và ngày là bắt buộc",
      });
    }

    // Lấy ID nội bộ của vị trí
    const [toLoc] = await connection.query(
      "SELECT id_location FROM tb_location WHERE uuid_location = ?",
      [to_location_uuid]
    );

    if (toLoc.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy vị trí đến." });
    }
    const to_location_id = toLoc[0].id_location;

    const dateObj = new Date(transfer_date);
    const formattedDate = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    const userMANV = req.user.ma_nv;

    // 1. Insert phiếu
    const [transferResult] = await connection.query(
      `
        INSERT INTO tb_machine_internal_transfer
          (to_location_id, transfer_date, status, note, created_by, updated_by)
        VALUES (?, ?, 'pending', ?, ?, ?)
        `,
      [to_location_id, formattedDate, note || null, userMANV, userMANV]
    );
    const transferId = transferResult.insertId;

    // 2. Insert chi tiết máy
    if (machines && Array.isArray(machines) && machines.length > 0) {
      for (const machine of machines) {
        const [machineResult] = await connection.query(
          "SELECT id_machine FROM tb_machine WHERE uuid_machine = ?",
          [machine.uuid_machine]
        );
        if (machineResult.length > 0) {
          const idMachine = machineResult[0].id_machine;
          await connection.query(
            `
              INSERT INTO tb_machine_internal_transfer_detail
                (id_machine_internal_transfer, id_machine, note, created_by, updated_by)
              VALUES (?, ?, ?, ?, ?)
              `,
            [transferId, idMachine, machine.note || null, userMANV, userMANV]
          );
        }
      }
    }

    await connection.commit();
    res
      .status(201)
      .json({ success: true, message: "Tạo phiếu điều chuyển thành công" });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating internal transfer:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// PUT /api/internal-transfers/:uuid/status - Update internal transfer status
app.put(
  "/api/internal-transfers/:uuid/status",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();

      const { uuid } = req.params;
      const { status } = req.body;

      if (!status || !["pending", "completed", "cancelled"].includes(status)) {
        await connection.rollback();
        return res
          .status(400)
          .json({ success: false, message: "Invalid status" });
      }

      // Lấy thông tin phiếu
      const [existing] = await connection.query(
        `
        SELECT 
          t.id_machine_internal_transfer, 
          t.to_location_id,
          l_to.name_location as to_location_name
        FROM tb_machine_internal_transfer t
        LEFT JOIN tb_location l_to ON l_to.id_location = t.to_location_id
        WHERE t.uuid_machine_internal_transfer = ?
        `,
        [uuid]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Transfer not found" });
      }

      const { id_machine_internal_transfer, to_location_id, to_location_name } =
        existing[0];
      const userMANV = req.user.ma_nv;

      // 1. Cập nhật trạng thái phiếu
      await connection.query(
        `
        UPDATE tb_machine_internal_transfer 
        SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine_internal_transfer = ?
        `,
        [status, userMANV, id_machine_internal_transfer]
      );

      // 2. Kích hoạt logic duyệt phiếu
      if (status === "completed") {
        await handleInternalTransferApproval(
          connection,
          id_machine_internal_transfer,
          to_location_id,
          to_location_name,
          userMANV
        );
      }

      await connection.commit();
      res.json({
        success: true,
        message: "Transfer status updated successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error updating transfer status:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  }
);

const handleInternalTransferApproval = async (
  connection,
  ticketId,
  toLocationId,
  toLocationName, // Cần tên vị trí đến
  userMANV
) => {
  // 1. Lấy tất cả máy móc trong phiếu
  const [details] = await connection.query(
    `SELECT id_machine FROM tb_machine_internal_transfer_detail WHERE id_machine_internal_transfer = ?`,
    [ticketId]
  );

  if (details.length === 0) {
    console.warn(`No machines found for internal transfer ID: ${ticketId}`);
    return;
  }

  // 2. Xác định trạng thái mới
  const newMachineStatus =
    toLocationName && toLocationName.toLowerCase().includes("kho")
      ? "available"
      : "in_use";

  // 3. Lặp qua từng máy để cập nhật
  for (const detail of details) {
    const idMachine = detail.id_machine;
    const idToLocation = toLocationId;

    // a. Lấy vị trí hiện tại (id_from_location) của MÁY NÀY
    const [currentLocResult] = await connection.query(
      "SELECT id_location FROM tb_machine_location WHERE id_machine = ?",
      [idMachine]
    );
    const idFromLocation =
      currentLocResult.length > 0 ? currentLocResult[0].id_location : null;

    // b. Ghi lịch sử
    if (idFromLocation !== idToLocation) {
      await connection.query(
        `
        INSERT INTO tb_machine_location_history
          (id_machine, id_from_location, id_to_location, move_date, created_by, updated_by)
        VALUES (?, ?, ?, CURDATE(), ?, ?)
        `,
        [idMachine, idFromLocation, idToLocation, userMANV, userMANV]
      );
    }

    // <<< START: SỬA LỖI LOGIC TẠI ĐÂY >>>
    // c. Cập nhật/Thêm vào tb_machine_location
    if (currentLocResult.length === 0) {
      // INSERT nếu máy chưa có vị trí
      await connection.query(
        `
        INSERT INTO tb_machine_location
          (id_machine, id_location, created_by, updated_by)
        VALUES (?, ?, ?, ?)
        `,
        [idMachine, idToLocation, userMANV, userMANV]
      );
    } else if (idFromLocation !== idToLocation) {
      // UPDATE nếu vị trí thay đổi
      await connection.query(
        `
        UPDATE tb_machine_location
        SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [idToLocation, userMANV, idMachine]
      );
    } else {
      // Vị trí không thay đổi, chỉ cập nhật (touch)
      await connection.query(
        `
        UPDATE tb_machine_location
        SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [userMANV, idMachine]
      );
    }
    // <<< END: SỬA LỖI LOGIC >>>

    // d. Cập nhật trạng thái máy (tb_machine)
    await connection.query(
      `
      UPDATE tb_machine
      SET 
        current_status = ?,
        updated_by = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id_machine = ?
      `,
      [newMachineStatus, userMANV, idMachine]
    );
  }
};

// MARK: LOCATION TRACKING

// GET /api/locations/:uuid/machines - Get all machines currently at a location
app.get(
  "/api/locations/:uuid/machines",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // 1. Get internal location ID
      const [locResult] = await tpmConnection.query(
        "SELECT id_location FROM tb_location WHERE uuid_location = ?",
        [uuid]
      );

      if (locResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
        });
      }
      const idLocation = locResult[0].id_location;

      // 2. Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM tb_machine_location ml
        WHERE ml.id_location = ?
      `;
      const [countResult] = await tpmConnection.query(countQuery, [idLocation]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // 3. Get paginated machines at that location
      const dataQuery = `
        SELECT 
          m.uuid_machine,
          m.code_machine,
          m.type_machine,  -- <<< CHANGED
          m.model_machine, -- <<< CHANGED
          m.serial_machine,
          m.current_status,
          m.is_borrowed_or_rented_or_borrowed_out,
          c.name_category,
          m.manufacturer
        FROM tb_machine_location ml
        JOIN tb_machine m ON m.id_machine = ml.id_machine
        LEFT JOIN tb_category c ON c.id_category = m.id_category
        WHERE ml.id_location = ?
        ORDER BY m.code_machine ASC
        LIMIT ? OFFSET ?
      `;
      const [machines] = await tpmConnection.query(dataQuery, [
        idLocation,
        limit,
        offset,
      ]);

      res.json({
        success: true,
        message: "Machines at location retrieved successfully",
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
      console.error("Error fetching machines by location:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// GET /api/machines/:uuid/history - Get location history for a specific machine
app.get("/api/machines/:uuid/history", authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;

    // 1. Get internal machine ID
    const [machineResult] = await tpmConnection.query(
      "SELECT id_machine, code_machine, type_machine, model_machine FROM tb_machine WHERE uuid_machine = ?", // <<< CHANGED
      [uuid]
    );

    if (machineResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }
    const idMachine = machineResult[0].id_machine;

    // 2. Get history
    const [history] = await tpmConnection.query(
      `
      SELECT 
        h.move_date,
        l_from.name_location as from_location_name,
        l_to.name_location as to_location_name,
        h.created_at,
        h.created_by
      FROM tb_machine_location_history h
      LEFT JOIN tb_location l_from ON l_from.id_location = h.id_from_location
      LEFT JOIN tb_location l_to ON l_to.id_location = h.id_to_location
      WHERE h.id_machine = ?
      ORDER BY h.move_date DESC, h.created_at DESC
      `,
      [idMachine]
    );

    res.json({
      success: true,
      message: "Machine location history retrieved successfully",
      data: {
        machine: {
          uuid_machine: uuid,
          code_machine: machineResult[0].code_machine,
          type_machine: machineResult[0].type_machine, // <<< CHANGED
          model_machine: machineResult[0].model_machine, // <<< CHANGED
        },
        history: history,
      },
    });
  } catch (error) {
    console.error("Error fetching machine location history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// POST /api/locations/update-machines - Update locations for multiple machines directly
app.post(
  "/api/locations/update-machines",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();

      const { to_location_uuid, machines } = req.body; // machines: [{ uuid_machine }]
      const userMANV = req.user.ma_nv;

      if (!to_location_uuid || !machines || machines.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Vị trí đích và danh sách máy là bắt buộc.",
        });
      }

      // 1. Lấy ID và tên vị trí đích
      const [toLocResult] = await connection.query(
        "SELECT id_location, name_location FROM tb_location WHERE uuid_location = ?",
        [to_location_uuid]
      );

      if (toLocResult.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy vị trí đích." });
      }
      const toLocationId = toLocResult[0].id_location;
      const toLocationName = toLocResult[0].name_location;

      // 2. Xác định trạng thái mới dựa trên vị trí đích
      const newMachineStatus =
        toLocationName && toLocationName.toLowerCase().includes("kho")
          ? "available"
          : "in_use";

      // 3. Lặp qua từng máy để cập nhật
      for (const machine of machines) {
        if (!machine.uuid_machine) continue;

        // a. Lấy ID máy
        const [machineResult] = await connection.query(
          "SELECT id_machine FROM tb_machine WHERE uuid_machine = ?",
          [machine.uuid_machine]
        );

        if (machineResult.length === 0) {
          console.warn(
            `Machine with UUID ${machine.uuid_machine} not found during direct update. Skipping.`
          );
          continue; // Bỏ qua nếu không tìm thấy máy
        }
        const idMachine = machineResult[0].id_machine;

        // b. Lấy vị trí hiện tại (from_location_id)
        const [currentLocResult] = await connection.query(
          "SELECT id_location FROM tb_machine_location WHERE id_machine = ?",
          [idMachine]
        );
        const idFromLocation =
          currentLocResult.length > 0 ? currentLocResult[0].id_location : null;

        // Chỉ xử lý nếu vị trí thay đổi hoặc chưa có vị trí
        if (idFromLocation !== toLocationId) {
          // c. Ghi lịch sử
          await connection.query(
            `
            INSERT INTO tb_machine_location_history
              (id_machine, id_from_location, id_to_location, move_date, created_by, updated_by)
            VALUES (?, ?, ?, CURDATE(), ?, ?)
            `,
            [idMachine, idFromLocation, toLocationId, userMANV, userMANV]
          );

          // d. Cập nhật/Thêm vào tb_machine_location
          if (currentLocResult.length === 0) {
            // INSERT
            await connection.query(
              `
              INSERT INTO tb_machine_location
                (id_machine, id_location, created_by, updated_by)
              VALUES (?, ?, ?, ?)
              `,
              [idMachine, toLocationId, userMANV, userMANV]
            );
          } else {
            // UPDATE
            await connection.query(
              `
              UPDATE tb_machine_location
              SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id_machine = ?
              `,
              [toLocationId, userMANV, idMachine]
            );
          }

          // e. Cập nhật trạng thái máy (tb_machine)
          await connection.query(
            `
            UPDATE tb_machine
            SET 
              current_status = ?,
              updated_by = ?, 
              updated_at = CURRENT_TIMESTAMP
            WHERE id_machine = ?
            `,
            [newMachineStatus, userMANV, idMachine]
          );
        } else {
          // Nếu vị trí không đổi, chỉ cập nhật updated_at và updated_by
          await connection.query(
            `
             UPDATE tb_machine_location
             SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id_machine = ?
             `,
            [userMANV, idMachine]
          );
          // Cũng cập nhật updated_at trên tb_machine
          await connection.query(
            `
              UPDATE tb_machine
              SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id_machine = ?
              `,
            [userMANV, idMachine]
          );
        }
      } // End for loop

      await connection.commit();
      res.json({
        success: true,
        message: "Cập nhật vị trí máy móc thành công.",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error updating machine locations directly:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  }
);
