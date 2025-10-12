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
        SUM(CASE WHEN current_status = 'borrowed_out' THEN 1 ELSE 0 END) as borrowed_out,
        SUM(CASE WHEN current_status = 'liquidation' THEN 1 ELSE 0 END) as liquidation,
        SUM(CASE WHEN current_status = 'disabled' THEN 1 ELSE 0 END) as disabled,
        SUM(CASE WHEN current_status = 'borrowed' THEN 1 ELSE 0 END) as borrowed,
        SUM(CASE WHEN current_status = 'rented' THEN 1 ELSE 0 END) as rented
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
    const searchParams = [searchPattern, searchPattern, searchPattern];

    // 1. Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tb_machine m
      WHERE (m.name_machine LIKE ? OR m.code_machine LIKE ? OR m.serial_machine LIKE ?)
      AND m.current_status = 'available'
    `;

    const [countResult] = await tpmConnection.query(countQuery, searchParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // 2. Get paginated data
    const dataQuery = `
      SELECT 
        m.uuid_machine,
        m.code_machine,
        m.name_machine,
        m.serial_machine,
        m.current_status,
        c.name_category,
        tl.uuid_location,
        tl.name_location
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      WHERE (m.name_machine LIKE ? OR m.code_machine LIKE ? OR m.serial_machine LIKE ?)
      AND m.current_status = 'available'
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
        c.uuid_category
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
        m.name_machine,
        m.serial_machine,
        m.current_status,
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
        RFID_machine || null,
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

// MARK: LOCATIONS

// GET /api/locations - Get all locations for dropdowns
app.get("/api/locations", authenticateToken, async (req, res) => {
  try {
    const [locations] = await tpmConnection.query(
      `
      SELECT 
        uuid_location, 
        name_location 
      FROM tb_location 
      ORDER BY id_location, name_location ASC
      `
    );

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
      machines, // Array of machine objects: [{ uuid_machine, note }]
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
        (to_location_id, import_type, import_date, status, note, created_by, updated_by)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
      `,
      [
        to_location_id,
        import_type,
        formattedDate,
        note || null,
        userMANV,
        userMANV,
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
        m.name_machine,
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
        m.name_machine,
        m.serial_machine,
        m.current_status,
        c.uuid_category,
        c.name_category
      FROM tb_machine_import_detail d
      LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
      LEFT JOIN tb_category c ON c.id_category = m.id_category
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

    const [existing] = await connection.query(
      "SELECT id_machine_import FROM tb_machine_import WHERE uuid_machine_import = ?",
      [uuid]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Import not found",
      });
    }

    const userMANV = req.user.ma_nv;

    await connection.query(
      `
      UPDATE tb_machine_import 
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine_import = ?
      `,
      [status, userMANV, uuid]
    );

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
      machines, // Array of machine objects: [{ uuid_machine, note }]
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
        (to_location_id, export_type, export_date, status, note, created_by, updated_by)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
      `,
      [
        to_location_id,
        export_type,
        formattedDate,
        note || null,
        userMANV,
        userMANV,
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
        m.name_machine,
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
        m.name_machine,
        m.serial_machine,
        m.current_status,
        c.uuid_category,
        c.name_category
      FROM tb_machine_export_detail d
      LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
      LEFT JOIN tb_category c ON c.id_category = m.id_category
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

    const [existing] = await connection.query(
      "SELECT id_machine_export FROM tb_machine_export WHERE uuid_machine_export = ?",
      [uuid]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Export not found",
      });
    }

    const userMANV = req.user.ma_nv;

    await connection.query(
      `
      UPDATE tb_machine_export 
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine_export = ?
      `,
      [status, userMANV, uuid]
    );

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
