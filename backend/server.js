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

    let virtualUser = null;
    const testPassword = "123456"; // Mật khẩu chung cho tất cả tài khoản test

    // 1. Check for 'admin' test account
    if (ma_nv === "admin" && password === testPassword) {
      virtualUser = {
        id: 99999, // ID này PHẢI KHỚP với tb_user_permission
        ma_nv: "99999",
        ten_nv: "Quản Trị Viên (Test)",
        cong_viec_phu_trach: "Quản trị hệ thống",
        id_bo_phan: 93,
        ten_bo_phan: "Phòng IT (Test)",
        id_phong_ban: 15,
        ten_phong_ban: "Phòng IT (Test)",
        id_company: 1,
        ten_cong_ty: "Việt Long Hưng (Test)",
        id_department: "1-15",
      };
    }
    // 2. Check for 'edit' test account
    else if (ma_nv === "codien0" && password === testPassword) {
      virtualUser = {
        id: 99990, // ID này PHẢI KHỚP với tb_user_permission
        ma_nv: "99990",
        ten_nv: "Phòng Cơ Điện (Test)",
        cong_viec_phu_trach: "Chỉnh sửa dữ liệu",
        id_bo_phan: 117,
        ten_bo_phan: "Bộ phận Cơ Điện (Test)",
        id_phong_ban: 14,
        ten_phong_ban: "Bộ phận Cơ Điện (Test)",
        id_company: 1,
        ten_cong_ty: "Việt Long Hưng (Test)",
        id_department: "1-14",
      };
    } else if (ma_nv === "codien1" && password === testPassword) {
      virtualUser = {
        id: 99991, // ID này PHẢI KHỚP với tb_user_permission
        ma_nv: "99991",
        ten_nv: "Cơ Điện Xưởng 1 (Test)",
        cong_viec_phu_trach: "Chỉnh sửa dữ liệu",
        id_bo_phan: 50,
        ten_bo_phan: "Cơ Điện Xưởng 1 (Test)",
        id_phong_ban: 10,
        ten_phong_ban: "Xưởng 1 (Test)",
        id_company: 1,
        ten_cong_ty: "Việt Long Hưng (Test)",
        id_department: "1-10",
      };
    } else if (ma_nv === "codien2" && password === testPassword) {
      virtualUser = {
        id: 99992, // ID này PHẢI KHỚP với tb_user_permission
        ma_nv: "99992",
        ten_nv: "Cơ Điện Xưởng 2 (Test)",
        cong_viec_phu_trach: "Chỉnh sửa dữ liệu",
        id_bo_phan: 41,
        ten_bo_phan: "Cơ Điện Xưởng 2 (Test)",
        id_phong_ban: 30,
        ten_phong_ban: "Xưởng 2 (Test)",
        id_company: 1,
        ten_cong_ty: "Việt Long Hưng (Test)",
        id_department: "1-30",
      };
    } else if (ma_nv === "codien3" && password === testPassword) {
      virtualUser = {
        id: 99993, // ID này PHẢI KHỚP với tb_user_permission
        ma_nv: "99993",
        ten_nv: "Cơ Điện Xưởng 3 (Test)",
        cong_viec_phu_trach: "Chỉnh sửa dữ liệu",
        id_bo_phan: 22,
        ten_bo_phan: "Cơ Điện Xưởng 3 (Test)",
        id_phong_ban: 24,
        ten_phong_ban: "Xưởng 3 (Test)",
        id_company: 1,
        ten_cong_ty: "Việt Long Hưng (Test)",
        id_department: "1-24",
      };
    } else if (ma_nv === "codien4" && password === testPassword) {
      virtualUser = {
        id: 99994, // ID này PHẢI KHỚP với tb_user_permission
        ma_nv: "99994",
        ten_nv: "Cơ Điện Xưởng 4 (Test)",
        cong_viec_phu_trach: "Chỉnh sửa dữ liệu",
        id_bo_phan: 30,
        ten_bo_phan: "Cơ Điện Xưởng 4 (Test)",
        id_phong_ban: 31,
        ten_phong_ban: "Xưởng 4 (Test)",
        id_company: 1,
        ten_cong_ty: "Việt Long Hưng (Test)",
        id_department: "1-31",
      };
    }
    // 3. Check for 'view' test account
    else if (ma_nv === "view" && password === testPassword) {
      virtualUser = {
        id: 99995, // ID này PHẢI KHỚP với tb_user_permission
        ma_nv: "99995",
        ten_nv: "Viewer (Test)",
        cong_viec_phu_trach: "Xem dữ liệu",
        id_bo_phan: 117,
        ten_bo_phan: "Bộ phận Cơ Điện (Test)",
        id_phong_ban: 14,
        ten_phong_ban: "Bộ phận Cơ Điện (Test)",
        id_company: 1,
        ten_cong_ty: "Việt Long Hưng (Test)",
        id_department: "1-14",
      };
    }

    // If a virtual user was found, generate token and return
    if (virtualUser) {
      // Generate JWT token
      const token = jwt.sign(
        {
          id: virtualUser.id, // ID ảo
          ma_nv: virtualUser.ma_nv,
          phongban_id: virtualUser.id_phong_ban,
        },
        process.env.JWT_SECRET || "your-default-secret-key"
        // { expiresIn: "8h" }
      );

      // Trả về cấu trúc y hệt như đăng nhập thật
      return res.json({
        success: true,
        message: "Login successful (virtual user)",
        data: {
          token,
          user: {
            id: virtualUser.id,
            ma_nv: virtualUser.ma_nv,
            name: virtualUser.ten_nv,
            job: virtualUser.cong_viec_phu_trach,
            bophan_id: virtualUser.id_bo_phan,
            bophan_name: virtualUser.ten_bo_phan,
            phongban_id: virtualUser.id_phong_ban,
            phongban_name: virtualUser.ten_phong_ban,
            company_id: virtualUser.id_company,
            company_name: virtualUser.ten_cong_ty,
            id_department: virtualUser.id_department,
          },
        },
      });
    }

    // 1. Query user from dataHiTimesheetConnection
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
        message: "Sai Mã số thẻ hoặc Mật khẩu", // Thông báo chung
      });
    }

    const user = users[0];

    // 2. Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.mat_khau);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Sai Mã số thẻ hoặc Mật khẩu", // Thông báo chung
      });
    }

    // 3. Check if user has permissions in tb_user_permission (TPM database)
    try {
      const [permissionCheck] = await tpmConnection.query(
        `
    SELECT COUNT(*) as count 
    FROM tb_user_permission 
    WHERE id_nhan_vien = ?
    `,
        [user.id] // user.id lấy từ dataHiTimesheetConnection
      );

      // Nếu không tìm thấy quyền (count = 0), user không được phép vào
      if (permissionCheck[0].count === 0) {
        return res.status(403).json({
          // 403 Forbidden
          success: false,
          message: "Tài khoản này không có quyền truy cập hệ thống TPM.",
        });
      }
    } catch (permError) {
      console.error("Error checking user permissions:", permError);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi kiểm tra quyền truy cập",
        error: permError.message,
      });
    }

    // 4. Generate JWT token (User is valid AND has permissions)
    const token = jwt.sign(
      {
        id: user.id,
        ma_nv: user.ma_nv,
        phongban_id: user.id_phong_ban,
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

    const {
      type_machines,
      model_machines,
      manufacturers,
      name_locations,
      current_status,
      is_borrowed_or_rented_or_borrowed_out,
    } = req.query;

    // Build search condition and params
    let whereConditions = []; // <<< CHANGED from string to array
    let countParams = [];
    let dataParams = [];

    // 1. Search filter
    if (search) {
      const searchPattern = `%${search}%`;
      whereConditions.push(`
        (m.type_machine LIKE ?
        OR m.model_machine LIKE ?
        OR m.code_machine LIKE ? 
        OR m.serial_machine LIKE ? 
        OR m.manufacturer LIKE ?
        OR tl.name_location LIKE ?)
      `);
      countParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
      dataParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    // 2. Type filter (Lưu ý: req.query sẽ tự động parse mảng nếu param được lặp lại)
    if (type_machines && type_machines.length > 0) {
      whereConditions.push(`m.type_machine IN (?)`);
      // Đảm bảo nó luôn là mảng khi push vào params
      const typeValues = Array.isArray(type_machines)
        ? type_machines
        : [type_machines];
      countParams.push(typeValues);
      dataParams.push(typeValues);
    }

    // 3. Model filter
    if (model_machines && model_machines.length > 0) {
      whereConditions.push(`m.model_machine IN (?)`);
      const modelValues = Array.isArray(model_machines)
        ? model_machines
        : [model_machines];
      countParams.push(modelValues);
      dataParams.push(modelValues);
    }

    // 4. Manufacturer filter
    if (manufacturers && manufacturers.length > 0) {
      whereConditions.push(`m.manufacturer IN (?)`);
      const manuValues = Array.isArray(manufacturers)
        ? manufacturers
        : [manufacturers];
      countParams.push(manuValues);
      dataParams.push(manuValues);
    }

    // 5. Location filter
    if (name_locations && name_locations.length > 0) {
      whereConditions.push(`tl.name_location IN (?)`);
      const locValues = Array.isArray(name_locations)
        ? name_locations
        : [name_locations];
      countParams.push(locValues);
      dataParams.push(locValues);
    }

    // 6. Current Status filter (Trạng thái chính)
    if (current_status && current_status.length > 0) {
      whereConditions.push(`m.current_status IN (?)`);
      const statusValues = Array.isArray(current_status)
        ? current_status
        : [current_status];
      countParams.push(statusValues);
      dataParams.push(statusValues);
    }

    // 7. Borrow Status filter (Trạng thái mượn/thuê)
    // (req.query param "is_borrowed_or_rented_or_borrowed_out" sẽ được map tới cột "is_borrowed_...")
    if (
      is_borrowed_or_rented_or_borrowed_out &&
      is_borrowed_or_rented_or_borrowed_out.length > 0
    ) {
      whereConditions.push(`m.is_borrowed_or_rented_or_borrowed_out IN (?)`);
      const borrowValues = Array.isArray(is_borrowed_or_rented_or_borrowed_out)
        ? is_borrowed_or_rented_or_borrowed_out
        : [is_borrowed_or_rented_or_borrowed_out];
      countParams.push(borrowValues);
      dataParams.push(borrowValues);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

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
      LIMIT ? OFFSET ?
    `;

    dataParams.push(limit, offset);

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

app.get(
  "/api/machines/distinct-values",
  authenticateToken,
  async (req, res) => {
    try {
      const { field, department_uuid, location_uuid } = req.query; // <<< THÊM MỚI
      const allowedFields = [
        "type_machine",
        "model_machine",
        "manufacturer",
        "name_location",
      ];

      if (!field || !allowedFields.includes(field)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid field" });
      }

      let query;
      let params = [];
      let joins = [];
      let whereConditions = [];

      if (field === "name_location") {
        // Lọc Vị trí (chỉ dùng khi xem theo Đơn vị)
        query = `SELECT DISTINCT tl.name_location as value 
                 FROM tb_location tl 
                 LEFT JOIN tb_department td ON td.id_department = tl.id_department`;
        whereConditions.push(
          `tl.name_location IS NOT NULL AND tl.name_location != ''`
        );

        if (department_uuid) {
          whereConditions.push(`td.uuid_department = ?`);
          params.push(department_uuid);
        }
      } else {
        // Lọc Loại máy, Model, Hãng SX
        query = `SELECT DISTINCT m.${field} as value 
                 FROM tb_machine m`;
        joins.push(
          `LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine`
        );
        joins.push(
          `LEFT JOIN tb_location tl ON tl.id_location = ml.id_location`
        );
        whereConditions.push(`m.${field} IS NOT NULL AND m.${field} != ''`);

        if (location_uuid) {
          // Ưu tiên lọc theo Vị trí
          whereConditions.push(`tl.uuid_location = ?`);
          params.push(location_uuid);
        } else if (department_uuid) {
          // Nếu không, lọc theo Đơn vị
          joins.push(
            `LEFT JOIN tb_department td ON td.id_department = tl.id_department`
          );
          whereConditions.push(`td.uuid_department = ?`);
          params.push(department_uuid);
        } else {
          // Nếu không chọn gì (trường hợp này không nên xảy ra ở LocationTrackPage)
          // Nó sẽ trả về tất cả
        }
      }

      query += " \n " + joins.join(" \n ");
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(" AND ")}`;
      }
      if (field !== "name_location") {
        query += ` ORDER BY value ASC`;
      }

      const [values] = await tpmConnection.query(query, params);
      res.json({ success: true, data: values.map((v) => v.value) });
    } catch (error) {
      console.error("Error fetching distinct values:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

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
        SUM(CASE WHEN current_status = 'broken' THEN 1 ELSE 0 END) as broken,
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

// GET /api/machines/stats-by-type - Get machine counts by type
app.get("/api/machines/stats-by-type", authenticateToken, async (req, res) => {
  try {
    // Lấy 8 loại máy móc phổ biến nhất
    const [stats] = await tpmConnection.execute(
      `
      SELECT 
        type_machine,
        COUNT(*) as count
      FROM tb_machine
      WHERE type_machine IS NOT NULL AND type_machine != ''
      GROUP BY type_machine
      `
    );

    res.json({
      success: true,
      message: "Statistics by type retrieved successfully",
      data: stats, // Sẽ trả về mảng: [{ type_machine: 'Máy A', count: 10 }, { type_machine: 'Máy B', count: 5 }]
    });
  } catch (error) {
    console.error("Error fetching statistics by type:", error);
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
    const { ticket_type, filter_by_phongban_id } = req.query;

    if (!search || search.length < 2) {
      return res.json({
        success: true,
        message: "Cần tối thiểu 2 ký tự để tìm kiếm.",
        data: [],
        pagination: { page: 1, limit: limit, total: 0, totalPages: 1 },
      });
    }

    const searchPattern = `%${search}%`;
    let searchParams = [
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    ];

    let whereConditions = [
      `(m.type_machine LIKE ? OR m.model_machine LIKE ? OR m.code_machine LIKE ? OR m.serial_machine LIKE ? OR m.RFID_machine LIKE ?)`,
    ];

    // <<< BẮT ĐẦU THAY THẾ LOGIC LỌC
    // Áp dụng bộ lọc trạng thái máy dựa trên loại phiếu
    if (ticket_type) {
      const conditions = getMachineFilterConditions(ticket_type);
      if (conditions.where) {
        whereConditions.push(conditions.where);
      }
    }

    let joins = [
      `LEFT JOIN tb_category c ON c.id_category = m.id_category`,
      `LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine`,
      `LEFT JOIN tb_location tl ON tl.id_location = ml.id_location`,
    ];

    if (filter_by_phongban_id) {
      joins.push(
        `LEFT JOIN tb_department td ON td.id_department = tl.id_department`
      );
      whereConditions.push(`td.id_phong_ban = ?`);
      searchParams.push(filter_by_phongban_id);
    }

    const joinClause = joins.join(" \n ");
    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // 1. Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tb_machine m
      ${joinClause}
      ${whereClause} 
    `;

    const [countResult] = await tpmConnection.query(countQuery, searchParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // 2. Get paginated data
    const dataQuery = `
      SELECT 
        m.uuid_machine,
        m.code_machine,
        m.type_machine,
        m.model_machine,
        m.serial_machine,
        m.RFID_machine,
        m.current_status,
        m.is_borrowed_or_rented_or_borrowed_out,
        c.name_category,
        tl.uuid_location,
        tl.name_location
      FROM tb_machine m
      ${joinClause}
      ${whereClause}
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
        tl.uuid_location,

        -- Thêm thông tin người tạo (creator)
        CASE
          WHEN m.created_by = 99999 THEN '99999'
          WHEN m.created_by = 99990 THEN '99990'
          WHEN m.created_by = 99900 THEN '99900'
          WHEN m.created_by = 99991 THEN '99991'
          WHEN m.created_by = 99992 THEN '99992'
          WHEN m.created_by = 99993 THEN '99993'
          WHEN m.created_by = 99994 THEN '99994'
          WHEN m.created_by = 99995 THEN '99995'
          ELSE creator.ma_nv
        END AS creator_ma_nv,
        CASE
          WHEN m.created_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN m.created_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.created_by = 99900 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.created_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN m.created_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN m.created_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN m.created_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN m.created_by = 99995 THEN 'Viewer (Test)'
          ELSE creator.ten_nv
        END AS creator_ten_nv,

        -- Thêm thông tin người cập nhật (updater)
        CASE
          WHEN m.updated_by = 99999 THEN '99999'
          WHEN m.updated_by = 99990 THEN '99990'
          WHEN m.updated_by = 99900 THEN '99900'
          WHEN m.updated_by = 99991 THEN '99991'
          WHEN m.updated_by = 99992 THEN '99992'
          WHEN m.updated_by = 99993 THEN '99993'
          WHEN m.updated_by = 99994 THEN '99994'
          WHEN m.updated_by = 99995 THEN '99995'
          ELSE updater.ma_nv
        END AS updater_ma_nv,
        CASE
          WHEN m.updated_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN m.updated_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.updated_by = 99900 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.updated_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN m.updated_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN m.updated_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN m.updated_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN m.updated_by = 99995 THEN 'Viewer (Test)'
          ELSE updater.ten_nv
        END AS updater_ten_nv

      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      
      -- JOIN sang CSDL HiTimesheet 2 LẦN (cho người tạo và người cập nhật)
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien creator ON creator.id = m.created_by
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien updater ON updater.id = m.updated_by
      
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
      const { ticket_type, filter_by_phongban_id } = req.query;

      if (!serial) {
        return res.status(400).json({
          success: false,
          message: "Serial number is required",
        });
      }

      let whereConditions = [`m.serial_machine = ?`];
      let queryParams = [serial];
      let notFoundMessage;

      const filterConditions = getMachineFilterConditions(ticket_type);

      if (ticket_type) {
        if (filterConditions.where) {
          whereConditions.push(filterConditions.where);
        }
      } else if (!ticket_type) {
        // Nếu không có ticket_type (mặc định), áp dụng quy tắc 'purchased'
        const defaultConditions = getMachineFilterConditions("purchased");
        whereConditions.push(defaultConditions.where);
      }

      let joins = [
        `LEFT JOIN tb_category c ON c.id_category = m.id_category`,
        `LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine`,
        `LEFT JOIN tb_location tl ON tl.id_location = ml.id_location`,
      ];

      if (filter_by_phongban_id) {
        joins.push(
          `LEFT JOIN tb_department td ON td.id_department = tl.id_department`
        );
        whereConditions.push(`td.id_phong_ban = ?`);
        queryParams.push(filter_by_phongban_id);
        // Cập nhật thông báo lỗi
        notFoundMessage =
          "Không tìm thấy máy trong phòng ban của bạn, hoặc máy không hợp lệ cho phiếu này.";
      }

      if (!notFoundMessage) {
        notFoundMessage = filterConditions.message;
      }

      const joinClause = joins.join(" \n ");
      const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

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
      ${joinClause}
      ${whereClause}
      LIMIT 1
    `;

      const [machines] = await tpmConnection.query(dataQuery, queryParams);

      if (machines.length === 0) {
        return res.status(404).json({
          success: false,
          message: notFoundMessage,
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

const getMachineFilterConditions = (ticket_type) => {
  let where = "";
  let message = "Không tìm thấy máy phù hợp với loại phiếu này.";

  // Bảng chú thích các Case:
  // Case 1: (status = 'available' AND is_... IS NULL)
  // Case 2: (status = 'in_use' AND is_... IS NULL)
  // Case 3: (status = 'maintenance' AND is_... IS NULL)
  // Case 5: (status = 'broken' AND is_... IS NULL)
  // Case 6: (status = 'disabled' AND is_... = 'borrowed_out')
  // Case 7,8,9: (status IN ('available', 'in_use', 'broken') AND is_... = 'borrowed')
  // Case 10,11,12: (status IN ('available', 'in_use', 'broken') AND is_... = 'rented')
  // Case 13: (status = 'disabled' AND is_... = 'borrowed_return')
  // Case 14: (status = 'disabled' AND is_... = 'rented_return')

  switch (ticket_type) {
    // a. nhập mua mới (chỉ hiện trường hợp 1)
    case "purchased":
      where = `(m.current_status = 'available' AND m.is_borrowed_or_rented_or_borrowed_out IS NULL)`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng' (không mượn/thuê/cho mượn).";
      break;

    // b. nhập sau bảo trì (chỉ hiện trường hợp 3)
    case "maintenance_return":
      where = `(m.current_status = 'maintenance' AND m.is_borrowed_or_rented_or_borrowed_out IS NULL)`;
      message = "Chỉ nhận những máy có trạng thái 'Bảo trì'.";
      break;

    // c. nhập thuê (chỉ hiện trường hợp 1,13,14)
    case "rented":
      where = `( 
        (m.current_status = 'available' AND m.is_borrowed_or_rented_or_borrowed_out IS NULL) OR 
        (m.current_status = 'disabled' AND m.is_borrowed_or_rented_or_borrowed_out = 'borrowed_return') OR
        (m.current_status = 'disabled' AND m.is_borrowed_or_rented_or_borrowed_out = 'rented_return')
      )`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng' hoặc máy 'Đã trả' (mượn/thuê).";
      break;

    // d. nhập mượn (chỉ hiện trường hợp 1,13,14)
    case "borrowed":
      where = `( 
        (m.current_status = 'available' AND m.is_borrowed_or_rented_or_borrowed_out IS NULL) OR 
        (m.current_status = 'disabled' AND m.is_borrowed_or_rented_or_borrowed_out = 'borrowed_return') OR
        (m.current_status = 'disabled' AND m.is_borrowed_or_rented_or_borrowed_out = 'rented_return')
      )`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng' hoặc máy 'Đã trả' (mượn/thuê).";
      break;

    // e. nhập trả (máy cho mượn) (chỉ hiện trường hợp 6)
    case "borrowed_out_return":
      where = `(m.current_status = 'disabled' AND m.is_borrowed_or_rented_or_borrowed_out = 'borrowed_out')`;
      message = "Chỉ nhận những máy có trạng thái 'Cho mượn'.";
      break;

    // f. xuất thanh lý (chỉ hiện trường hợp 1,2,5)
    case "liquidation":
      where = `(m.current_status IN ('available', 'in_use', 'broken') AND m.is_borrowed_or_rented_or_borrowed_out IS NULL)`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng', 'Đang sử dụng', 'Máy hư' (không mượn/thuê).";
      break;

    // g. xuất bảo trì (chỉ hiện trường hợp 1,2,5)
    case "maintenance":
      where = `(m.current_status IN ('available', 'in_use', 'broken') AND m.is_borrowed_or_rented_or_borrowed_out IS NULL)`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng', 'Đang sử dụng', 'Máy hư' (không mượn/thuê).";
      break;

    // h. xuất cho mượn (chỉ hiện trường hợp 1,2)
    case "borrowed_out":
      where = `(m.current_status IN ('available', 'in_use') AND m.is_borrowed_or_rented_or_borrowed_out IS NULL)`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng', 'Đang sử dụng' (không mượn/thuê).";
      break;

    // i. xuất trả (máy thuê) (chỉ hiện trường hợp 10,11,12)
    case "rented_return":
      where = `(m.current_status IN ('available', 'in_use', 'broken') AND m.is_borrowed_or_rented_or_borrowed_out = 'rented')`;
      message =
        "Chỉ nhận những máy có trạng thái 'Đang thuê' (Sẵn sàng/Sử dụng/Hư).";
      break;

    // j. xuất trả (máy mượn) (chỉ hiện trường hợp 7,8,9)
    case "borrowed_return":
      where = `(m.current_status IN ('available', 'in_use', 'broken') AND m.is_borrowed_or_rented_or_borrowed_out = 'borrowed')`;
      message =
        "Chỉ nhận những máy có trạng thái 'Đang mượn' (Sẵn sàng/Sử dụng/Hư).";
      break;

    // k. điều chuyển nội bộ (chỉ hiện trường hợp 1,2,5,7,8,9,10,11,12)
    case "internal":
      where = `(
        m.current_status IN ('available', 'in_use', 'broken') AND 
        (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out IN ('borrowed', 'rented'))
      )`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng', 'Đang sử dụng', 'Máy hư' (bao gồm cả máy đang mượn/thuê).";
      break;

    // Mặc định (nếu ticket_type không xác định, ví dụ: scanner mở trước khi chọn loại phiếu)
    default:
      where = `(m.current_status = 'available' AND m.is_borrowed_or_rented_or_borrowed_out IS NULL)`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng' (không mượn/thuê/cho mượn).";
      break;
  }

  return { where, message };
};

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
    const userId = req.user.id;

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
        userId, // created_by
        userId, // updated_by
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
        m.type_machine,
        m.model_machine,
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
        c.id_category,

        -- Thêm thông tin người tạo (creator)
        CASE
          WHEN m.created_by = 99999 THEN '99999'
          WHEN m.created_by = 99990 THEN '99990'
          WHEN m.created_by = 99900 THEN '99900'
          WHEN m.created_by = 99991 THEN '99991'
          WHEN m.created_by = 99992 THEN '99992'
          WHEN m.created_by = 99993 THEN '99993'
          WHEN m.created_by = 99994 THEN '99994'
          WHEN m.created_by = 99995 THEN '99995'
          ELSE creator.ma_nv
        END AS creator_ma_nv,
        CASE
          WHEN m.created_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN m.created_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.created_by = 99900 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.created_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN m.created_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN m.created_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN m.created_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN m.created_by = 99995 THEN 'Viewer (Test)'
          ELSE creator.ten_nv
        END AS creator_ten_nv,

        -- Thêm thông tin người cập nhật (updater)
        CASE
          WHEN m.updated_by = 99999 THEN '99999'
          WHEN m.updated_by = 99990 THEN '99990'
          WHEN m.updated_by = 99900 THEN '99900'
          WHEN m.updated_by = 99991 THEN '99991'
          WHEN m.updated_by = 99992 THEN '99992'
          WHEN m.updated_by = 99993 THEN '99993'
          WHEN m.updated_by = 99994 THEN '99994'
          WHEN m.updated_by = 99995 THEN '99995'
          ELSE updater.ma_nv
        END AS updater_ma_nv,
        CASE
          WHEN m.updated_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN m.updated_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.updated_by = 99900 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.updated_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN m.updated_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN m.updated_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN m.updated_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN m.updated_by = 99995 THEN 'Viewer (Test)'
          ELSE updater.ten_nv
        END AS updater_ten_nv

      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien creator ON creator.id = m.created_by
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien updater ON updater.id = m.updated_by
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
    const userId = req.user.id;

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
        userId, // updated_by
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
        m.type_machine,
        m.model_machine,
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

        -- Thêm thông tin người tạo (creator)
        CASE
          WHEN m.created_by = 99999 THEN '99999'
          WHEN m.created_by = 99990 THEN '99990'
          WHEN m.created_by = 99900 THEN '99900'
          WHEN m.created_by = 99991 THEN '99991'
          WHEN m.created_by = 99992 THEN '99992'
          WHEN m.created_by = 99993 THEN '99993'
          WHEN m.created_by = 99994 THEN '99994'
          WHEN m.created_by = 99995 THEN '99995'
          ELSE creator.ma_nv
        END AS creator_ma_nv,
        CASE
          WHEN m.created_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN m.created_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.created_by = 99900 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.created_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN m.created_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN m.created_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN m.created_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN m.created_by = 99995 THEN 'Viewer (Test)'
          ELSE creator.ten_nv
        END AS creator_ten_nv,

        -- Thêm thông tin người cập nhật (updater)
        CASE
          WHEN m.updated_by = 99999 THEN '99999'
          WHEN m.updated_by = 99990 THEN '99990'
          WHEN m.updated_by = 99900 THEN '99900'
          WHEN m.updated_by = 99991 THEN '99991'
          WHEN m.updated_by = 99992 THEN '99992'
          WHEN m.updated_by = 99993 THEN '99993'
          WHEN m.updated_by = 99994 THEN '99994'
          WHEN m.updated_by = 99995 THEN '99995'
          ELSE updater.ma_nv
        END AS updater_ma_nv,
        CASE
          WHEN m.updated_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN m.updated_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.updated_by = 99900 THEN 'Phòng Cơ Điện (Test)'
          WHEN m.updated_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN m.updated_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN m.updated_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN m.updated_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN m.updated_by = 99995 THEN 'Viewer (Test)'
          ELSE updater.ten_nv
        END AS updater_ten_nv

      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien creator ON creator.id = m.created_by
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien updater ON updater.id = m.updated_by
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
    const userId = req.user.id;

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
            userId, // created_by
            userId, // updated_by
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
        name_department,
        COUNT(ml.id_machine) AS machine_count
      FROM tb_department td
      LEFT JOIN tb_location tl ON tl.id_department = td.id_department
      LEFT JOIN tb_machine_location ml ON ml.id_location = tl.id_location
      GROUP BY td.id_department, td.name_department
      ORDER BY td.id_department ASC
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
    const { filter_type, department_uuid } = req.query;

    let query = `
      SELECT 
        tl.uuid_location, 
        tl.name_location,
        td.name_department,
        td.id_phong_ban,
        COUNT(ml.id_machine) AS machine_count
      FROM tb_location tl
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      LEFT JOIN tb_machine_location ml ON ml.id_location = tl.id_location
    `;
    let params = [];
    let whereConditions = [];

    if (department_uuid) {
      whereConditions.push(`td.uuid_department = ?`);
      params.push(department_uuid);
    }

    if (filter_type === "internal") {
      whereConditions.push(
        `(td.name_department NOT LIKE '%Đơn vị bên ngoài%' OR td.name_department IS NULL)`
      );
    } else if (filter_type === "warehouse_only") {
      whereConditions.push(`tl.name_location LIKE '%Kho%'`);
    } else if (filter_type === "external_only") {
      whereConditions.push(`td.name_department LIKE '%Đơn vị bên ngoài%'`);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    query += ` GROUP BY tl.id_location, tl.name_location, td.name_department, td.id_phong_ban`;

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

    const userId = req.user.id;

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
        userId,
        userId,
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
          "SELECT id_machine, current_status, is_borrowed_or_rented_or_borrowed_out FROM tb_machine WHERE uuid_machine = ?",
          [machine.uuid_machine]
        );

        if (machineResult.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `Máy có UUID ${machine.uuid_machine} không tồn tại.`,
          });
        }

        const {
          id_machine,
          current_status,
          is_borrowed_or_rented_or_borrowed_out,
        } = machineResult[0];

        // 2. Kiểm tra trạng thái máy (chỉ cho phép nhập máy không phải 'liquidation' hoặc 'disabled')
        let isValid = false;
        let errorMessage = `Máy ${machine.uuid_machine} (Trạng thái: ${
          current_status || "NULL"
        }, Mượn/Thuê: ${
          is_borrowed_or_rented_or_borrowed_out || "NULL"
        }) không hợp lệ cho loại phiếu '${import_type}'.`;

        switch (import_type) {
          // a. nhập mua mới (case 1)
          case "purchased":
            if (
              current_status === "available" &&
              is_borrowed_or_rented_or_borrowed_out === null
            ) {
              isValid = true;
            }
            break;

          // b. nhập sau bảo trì (case 3)
          case "maintenance_return":
            if (
              current_status === "maintenance" &&
              is_borrowed_or_rented_or_borrowed_out === null
            ) {
              isValid = true;
            }
            break;

          // c. nhập thuê (case 1, 13, 14)
          case "rented":
          // d. nhập mượn (case 1, 13, 14)
          case "borrowed":
            if (
              (current_status === "available" &&
                is_borrowed_or_rented_or_borrowed_out === null) ||
              (current_status === "disabled" &&
                is_borrowed_or_rented_or_borrowed_out === "borrowed_return") ||
              (current_status === "disabled" &&
                is_borrowed_or_rented_or_borrowed_out === "rented_return")
            ) {
              isValid = true;
            }
            break;

          // e. nhập trả (máy cho mượn) (case 6)
          case "borrowed_out_return":
            if (
              current_status === "disabled" &&
              is_borrowed_or_rented_or_borrowed_out === "borrowed_out"
            ) {
              isValid = true;
            }
            break;

          default:
            isValid = false;
            errorMessage = `Loại phiếu nhập '${import_type}' không có quy tắc kiểm tra hợp lệ.`;
        }

        if (!isValid) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: errorMessage,
          });
        }

        // 3. Chèn chi tiết phiếu nhập (sử dụng idMachine đã tra cứu)
        await connection.query(
          `
          INSERT INTO tb_machine_import_detail 
            (id_machine_import, id_machine, note, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?)
          `,
          [importId, id_machine, machine.note || null, userId, userId]
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
        i.created_by,
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
        i.created_by,
        i.is_borrowed_or_rented_or_borrowed_out_name,
        i.is_borrowed_or_rented_or_borrowed_out_date,
        i.is_borrowed_or_rented_or_borrowed_out_return_date,
        tl.uuid_location as to_location_uuid,
        tl.name_location as to_location_name,
        td.uuid_department as to_department_uuid,
        td.name_department as to_department_name,
        
        -- Dùng CASE để điền thông tin user ảo (test users)
        CASE
          WHEN i.created_by = 99999 THEN '99999'
          WHEN i.created_by = 99990 THEN '99990'
          WHEN i.created_by = 99900 THEN '99900'
          WHEN i.created_by = 99991 THEN '99991'
          WHEN i.created_by = 99992 THEN '99992'
          WHEN i.created_by = 99993 THEN '99993'
          WHEN i.created_by = 99994 THEN '99994'
          WHEN i.created_by = 99995 THEN '99995'
          ELSE nv.ma_nv
        END AS creator_ma_nv, -- Đặt tên mới

        CASE
          WHEN i.created_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN i.created_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN i.created_by = 99900 THEN 'Phòng Cơ Điện (Test)'
          WHEN i.created_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN i.created_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN i.created_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN i.created_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN i.created_by = 99995 THEN 'Viewer (Test)'
          ELSE nv.ten_nv
        END AS creator_ten_nv -- Đặt tên mới

      FROM tb_machine_import i
      LEFT JOIN tb_location tl ON tl.id_location = i.to_location_id
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      
      -- JOIN sang CSDL thứ 2 (dataHiTimesheet_database)
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien nv ON nv.id = i.created_by
      
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
        m.is_borrowed_or_rented_or_borrowed_out,
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

    const userId = req.user.id;

    // MODIFIED: Fetch more data from ticket
    const [existing] = await connection.query(
      `
      SELECT 
        i.id_machine_import, 
        i.to_location_id, 
        i.import_type,
        i.created_by,
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
      created_by,
      name_location, // NEW
      is_borrowed_or_rented_or_borrowed_out_name, // NEW
      is_borrowed_or_rented_or_borrowed_out_date, // NEW
      is_borrowed_or_rented_or_borrowed_out_return_date, // NEW
    } = existing[0];

    if (status === "cancelled") {
      // Kiểm tra quyền (Admin hoặc Người tạo)
      const [perms] = await connection.query(
        "SELECT p.name_permission FROM tb_user_permission up JOIN tb_permission p ON up.id_permission = p.id_permission WHERE up.id_nhan_vien = ?",
        [userId]
      );
      const isAdmin = perms.map((p) => p.name_permission).includes("admin");

      if (!isAdmin && created_by !== userId) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền hủy phiếu này",
        });
      }
    } else if (status === "completed") {
      // Chỉ Admin mới được DUYỆT
      const [perms] = await connection.query(
        "SELECT p.name_permission FROM tb_user_permission up JOIN tb_permission p ON up.id_permission = p.id_permission WHERE up.id_nhan_vien = ?",
        [userId]
      );
      const isAdmin = perms.map((p) => p.name_permission).includes("admin");

      if (!isAdmin) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền duyệt phiếu này",
        });
      }
    }

    // 1. Update ticket status
    await connection.query(
      `
      UPDATE tb_machine_import 
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine_import = ?
      `,
      [status, userId, uuid]
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
        userId
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

    const userId = req.user.id;

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
        userId,
        userId,
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
          "SELECT id_machine, current_status, is_borrowed_or_rented_or_borrowed_out FROM tb_machine WHERE uuid_machine = ?",
          [machine.uuid_machine]
        );

        if (machineResult.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `Máy có UUID ${machine.uuid_machine} không tồn tại.`,
          });
        }

        const {
          id_machine,
          current_status,
          is_borrowed_or_rented_or_borrowed_out,
        } = machineResult[0];

        // 2. Kiểm tra trạng thái máy: chỉ cho phép xuất máy đang 'available' hoặc 'maintenance' (nếu xuất bảo trì)
        let isValid = false;
        let errorMessage = `Máy ${machine.uuid_machine} (Trạng thái: ${
          current_status || "NULL"
        }, Mượn/Thuê: ${
          is_borrowed_or_rented_or_borrowed_out || "NULL"
        }) không hợp lệ cho loại phiếu '${export_type}'.`;

        switch (export_type) {
          // f. xuất thanh lý (case 1, 2, 5)
          case "liquidation":
            if (
              ["available", "in_use", "broken"].includes(current_status) &&
              is_borrowed_or_rented_or_borrowed_out === null
            ) {
              isValid = true;
            }
            break;

          // g. xuất bảo trì (case 1, 2, 5)
          case "maintenance":
            if (
              ["available", "in_use", "broken"].includes(current_status) &&
              is_borrowed_or_rented_or_borrowed_out === null
            ) {
              isValid = true;
            }
            break;

          // h. xuất cho mượn (case 1, 2)
          case "borrowed_out":
            if (
              ["available", "in_use"].includes(current_status) &&
              is_borrowed_or_rented_or_borrowed_out === null
            ) {
              isValid = true;
            }
            break;

          // i. xuất trả (máy thuê) (case 10, 11, 12)
          case "rented_return":
            if (
              ["available", "in_use", "broken"].includes(current_status) &&
              is_borrowed_or_rented_or_borrowed_out === "rented"
            ) {
              isValid = true;
            }
            break;

          // j. xuất trả (máy mượn) (case 7, 8, 9)
          case "borrowed_return":
            if (
              ["available", "in_use", "broken"].includes(current_status) &&
              is_borrowed_or_rented_or_borrowed_out === "borrowed"
            ) {
              isValid = true;
            }
            break;

          default:
            isValid = false;
            errorMessage = `Loại phiếu xuất '${export_type}' không có quy tắc kiểm tra hợp lệ.`;
        }

        if (!isValid) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: errorMessage,
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
            id_machine, // SỬ DỤNG ID NỘI BỘ ĐÃ TRA CỨU
            machine.note || null,
            userId,
            userId,
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
        e.created_by,
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
        e.created_by,
        e.is_borrowed_or_rented_or_borrowed_out_name,
        e.is_borrowed_or_rented_or_borrowed_out_date,
        e.is_borrowed_or_rented_or_borrowed_out_return_date,
        tl.uuid_location as to_location_uuid,
        tl.name_location as to_location_name,
        td.uuid_department as to_department_uuid,
        td.name_department as to_department_name,
        
        -- Dùng CASE để điền thông tin user ảo (test users)
        CASE
          WHEN e.created_by = 99999 THEN '99999'
          WHEN e.created_by = 99990 THEN '99990'
          WHEN e.created_by = 99900 THEN '99900'
          WHEN e.created_by = 99991 THEN '99991'
          WHEN e.created_by = 99992 THEN '99992'
          WHEN e.created_by = 99993 THEN '99993'
          WHEN e.created_by = 99994 THEN '99994'
          WHEN e.created_by = 99995 THEN '99995'
          ELSE nv.ma_nv
        END AS creator_ma_nv, -- Đặt tên mới

        CASE
          WHEN e.created_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN e.created_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN e.created_by = 99900 THEN 'Phòng Cơ Điện (Test)'
          WHEN e.created_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN e.created_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN e.created_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN e.created_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN e.created_by = 99995 THEN 'Viewer (Test)'
          ELSE nv.ten_nv
        END AS creator_ten_nv -- Đặt tên mới

      FROM tb_machine_export e
      LEFT JOIN tb_location tl ON tl.id_location = e.to_location_id
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      
      -- JOIN sang CSDL thứ 2 (dataHiTimesheet_database)
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien nv ON nv.id = e.created_by
      
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
        m.is_borrowed_or_rented_or_borrowed_out,
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

    const userId = req.user.id;

    // MODIFIED: Fetch more data from ticket
    const [existing] = await connection.query(
      `
      SELECT 
        e.id_machine_export, 
        e.to_location_id, 
        e.export_type,
        e.created_by,
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
      created_by,
      name_location, // NEW
      is_borrowed_or_rented_or_borrowed_out_name, // NEW
      is_borrowed_or_rented_or_borrowed_out_date, // NEW
      is_borrowed_or_rented_or_borrowed_out_return_date, // NEW
    } = existing[0];

    if (status === "cancelled") {
      // Kiểm tra quyền (Admin hoặc Người tạo)
      const [perms] = await connection.query(
        "SELECT p.name_permission FROM tb_user_permission up JOIN tb_permission p ON up.id_permission = p.id_permission WHERE up.id_nhan_vien = ?",
        [userId]
      );
      const isAdmin = perms.map((p) => p.name_permission).includes("admin");

      if (!isAdmin && created_by !== userId) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền hủy phiếu này",
        });
      }
    } else if (status === "completed") {
      // Chỉ Admin mới được DUYỆT
      const [perms] = await connection.query(
        "SELECT p.name_permission FROM tb_user_permission up JOIN tb_permission p ON up.id_permission = p.id_permission WHERE up.id_nhan_vien = ?",
        [userId]
      );
      const isAdmin = perms.map((p) => p.name_permission).includes("admin");

      if (!isAdmin) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền duyệt phiếu này",
        });
      }
    }

    // 1. Update ticket status
    await connection.query(
      `
      UPDATE tb_machine_export 
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine_export = ?
      `,
      [status, userId, uuid]
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
        userId
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
  userId
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
        [idMachine, idFromLocation, toLocationId, userId, userId]
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
        [idMachine, toLocationId, userId, userId]
      );
    } else if (idFromLocation !== toLocationId) {
      // Update
      await connection.query(
        `
        UPDATE tb_machine_location
        SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [toLocationId, userId, idMachine]
      );
    } else {
      // No change, just touch updated_at
      await connection.query(
        `
        UPDATE tb_machine_location
        SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [userId, idMachine]
      );
    }

    // d. Update tb_machine status
    let updateQuery = `
      UPDATE tb_machine
      SET current_status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP`;
    let updateParams = [newMachineStatus, userId];

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
          t.created_by,
          loc_to.name_location as to_location_name,
          td.id_phong_ban AS to_location_phongban_id,
          COUNT(d.id_machine) as machine_count
        FROM tb_machine_internal_transfer t
        LEFT JOIN tb_location loc_to ON loc_to.id_location = t.to_location_id
        LEFT JOIN tb_department td ON td.id_department = loc_to.id_department
        LEFT JOIN tb_machine_internal_transfer_detail d ON d.id_machine_internal_transfer = t.id_machine_internal_transfer
        ${whereClause}
        GROUP BY t.id_machine_internal_transfer, td.id_phong_ban
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
          t.created_by,
          t.confirmed_by,
          t.confirmed_at,
          loc_to.uuid_location as to_location_uuid,
          loc_to.name_location as to_location_name,
          td.id_phong_ban AS to_location_phongban_id,
          
          -- Dùng CASE để điền thông tin user ảo (test users)
          CASE
            WHEN t.created_by = 99999 THEN '99999'
            WHEN t.created_by = 99990 THEN '99990'
            WHEN t.created_by = 99900 THEN '99900'
            WHEN t.created_by = 99991 THEN '99991'
            WHEN t.created_by = 99992 THEN '99992'
            WHEN t.created_by = 99993 THEN '99993'
            WHEN t.created_by = 99994 THEN '99994'
            WHEN t.created_by = 99995 THEN '99995'
            ELSE nv.ma_nv
          END AS creator_ma_nv, -- Đặt tên mới

          CASE
            WHEN t.created_by = 99999 THEN 'Quản Trị Viên (Test)'
            WHEN t.created_by = 99990 THEN 'Phòng Cơ Điện (Test)'
            WHEN t.created_by = 99900 THEN 'Phòng Cơ Điện (Test)'
            WHEN t.created_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
            WHEN t.created_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
            WHEN t.created_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
            WHEN t.created_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
            WHEN t.created_by = 99995 THEN 'Viewer (Test)'
            ELSE nv.ten_nv
          END AS creator_ten_nv -- Đặt tên mới
          
        FROM tb_machine_internal_transfer t
        LEFT JOIN tb_location loc_to ON loc_to.id_location = t.to_location_id
        LEFT JOIN tb_department td ON td.id_department = loc_to.id_department
        
        -- JOIN sang CSDL thứ 2 (dataHiTimesheet_database)
        LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien nv ON nv.id = t.created_by
        
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
          m.is_borrowed_or_rented_or_borrowed_out,
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
    const userPhongBanId = req.user.phongban_id; // Lấy phòng ban của User 1
    const userId = req.user.id;

    if (!to_location_uuid || !transfer_date) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vị trí đến và ngày là bắt buộc",
      });
    }

    // Lấy ID nội bộ VÀ id_phong_ban của vị trí đến
    const [toLoc] = await connection.query(
      `
      SELECT 
        tl.id_location,
        td.id_phong_ban
      FROM tb_location tl
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      WHERE tl.uuid_location = ?
      `,
      [to_location_uuid]
    );

    if (toLoc.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy vị trí đến." });
    }
    const to_location_id = toLoc[0].id_location;
    const to_location_phongban_id = toLoc[0].id_phong_ban;

    // <<< START: LOGIC YÊU CẦU 2 (Luồng duyệt động) >>>
    let initialStatus;
    if (userPhongBanId === to_location_phongban_id) {
      // Kịch bản A: Cập nhật vị trí (Cùng phòng ban)
      // User 1 -> Admin
      initialStatus = "pending_approval";
    } else {
      // Kịch bản B: Điều chuyển nội bộ (Khác phòng ban)
      // User 1 -> User 2 (Confirm) -> Admin (Approve)
      initialStatus = "pending_confirmation";
    }
    // <<< END: LOGIC YÊU CẦU 2 >>>

    const dateObj = new Date(transfer_date);
    const formattedDate = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    // 1. Insert phiếu với trạng thái (status) đã được quyết định
    const [transferResult] = await connection.query(
      `
        INSERT INTO tb_machine_internal_transfer
          (to_location_id, transfer_date, status, note, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
      [
        to_location_id,
        formattedDate,
        initialStatus,
        note || null,
        userId,
        userId,
      ]
    );
    const transferId = transferResult.insertId;

    // 2. Insert chi tiết máy (Giữ nguyên logic này)
    if (machines && Array.isArray(machines) && machines.length > 0) {
      for (const machine of machines) {
        const [machineResult] = await connection.query(
          "SELECT id_machine, current_status, is_borrowed_or_rented_or_borrowed_out FROM tb_machine WHERE uuid_machine = ?",
          [machine.uuid_machine]
        );
        if (machineResult.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `Máy có UUID ${machine.uuid_machine} không tồn tại.`,
          });
        }

        const {
          id_machine,
          current_status,
          is_borrowed_or_rented_or_borrowed_out,
        } = machineResult[0];

        const isStatusValid = ["available", "in_use", "broken"].includes(
          current_status
        );
        const isBorrowValid =
          is_borrowed_or_rented_or_borrowed_out === null ||
          ["borrowed", "rented"].includes(
            is_borrowed_or_rented_or_borrowed_out
          );

        if (!(isStatusValid && isBorrowValid)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Máy ${machine.uuid_machine} (Trạng thái: ${
              current_status || "NULL"
            }, Mượn/Thuê: ${
              is_borrowed_or_rented_or_borrowed_out || "NULL"
            }) không hợp lệ để điều chuyển nội bộ.`,
          });
        }

        await connection.query(
          `
          INSERT INTO tb_machine_internal_transfer_detail 
            (id_machine_internal_transfer, id_machine, note, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?)
          `,
          [transferId, id_machine, machine.note || null, userId, userId]
        );
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

// PUT /api/internal-transfers/:uuid/confirm - (USER 2) Confirm ticket
app.put(
  "/api/internal-transfers/:uuid/confirm",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();
      const { uuid } = req.params;
      const userId = req.user.id; // ID của User 2 (người đang nhấn xác nhận)
      const userPhongBanId = req.user.phongban_id; // <<< LẤY TỪ TOKEN

      // 1. Lấy thông tin phiếu
      const [existing] = await connection.query(
        `
        SELECT 
          t.id_machine_internal_transfer, 
          t.status,
          t.created_by,
          td.id_phong_ban AS to_location_phongban_id
        FROM tb_machine_internal_transfer t
        LEFT JOIN tb_location l_to ON l_to.id_location = t.to_location_id
        LEFT JOIN tb_department td ON td.id_department = l_to.id_department
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

      const ticket = existing[0];

      // 2. Kiểm tra logic
      if (ticket.status !== "pending_confirmation") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Phiếu không ở trạng thái 'Chờ xác nhận'",
        });
      }

      if (ticket.created_by === userId) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Bạn không thể tự xác nhận phiếu mình tạo",
        });
      }

      // 3. Kiểm tra phòng ban của User 2 (lấy từ token)
      if (!userPhongBanId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy phòng ban của người dùng trong token",
        });
      }

      // 4. So sánh phòng ban
      if (userPhongBanId !== ticket.to_location_phongban_id) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message:
            "Bạn không thuộc phòng ban của vị trí đến để xác nhận phiếu này",
        });
      }

      // 5. Cập nhật phiếu
      await connection.query(
        `
        UPDATE tb_machine_internal_transfer 
        SET 
          status = 'pending_approval', 
          confirmed_by = ?,
          confirmed_at = CURRENT_TIMESTAMP,
          updated_by = ?, 
          updated_at = CURRENT_TIMESTAMP
        WHERE id_machine_internal_transfer = ?
        `,
        [userId, userId, ticket.id_machine_internal_transfer]
      );

      await connection.commit();
      res.json({ success: true, message: "Xác nhận phiếu thành công" });
    } catch (error) {
      await connection.rollback();
      console.error("Error confirming transfer:", error);
      res
        .status(500)
        .json({ success: false, message: "Lỗi máy chủ", error: error.message });
    } finally {
      connection.release();
    }
  }
);

// PUT /api/internal-transfers/:uuid/approve - (ADMIN) Approve ticket
app.put(
  "/api/internal-transfers/:uuid/approve",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();
      const { uuid } = req.params;
      const userId = req.user.id; // ID của Admin

      // 1. Kiểm tra quyền Admin
      const [perms] = await connection.query(
        "SELECT p.name_permission FROM tb_user_permission up JOIN tb_permission p ON up.id_permission = p.id_permission WHERE up.id_nhan_vien = ?",
        [userId]
      );
      const isAdmin = perms.map((p) => p.name_permission).includes("admin");

      if (!isAdmin) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền Admin để duyệt phiếu",
        });
      }

      // 2. Lấy thông tin phiếu
      const [existing] = await connection.query(
        `
        SELECT 
          t.id_machine_internal_transfer, 
          t.status,
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

      const ticket = existing[0];

      // 3. Kiểm tra logic
      if (ticket.status !== "pending_approval") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Phiếu không ở trạng thái 'Chờ duyệt'",
        });
      }

      // 4. Cập nhật trạng thái phiếu
      await connection.query(
        `
        UPDATE tb_machine_internal_transfer 
        SET 
          status = 'completed', 
          updated_by = ?, 
          updated_at = CURRENT_TIMESTAMP
        WHERE id_machine_internal_transfer = ?
        `,
        [userId, ticket.id_machine_internal_transfer]
      );

      // 5. Kích hoạt logic duyệt phiếu (cập nhật vị trí máy)
      await handleInternalTransferApproval(
        connection,
        ticket.id_machine_internal_transfer,
        ticket.to_location_id,
        ticket.to_location_name,
        userId
      );

      await connection.commit();
      res.json({ success: true, message: "Duyệt phiếu thành công" });
    } catch (error) {
      await connection.rollback();
      console.error("Error approving transfer:", error);
      res
        .status(500)
        .json({ success: false, message: "Lỗi máy chủ", error: error.message });
    } finally {
      connection.release();
    }
  }
);

// PUT /api/internal-transfers/:uuid/cancel - (CANCEL)
app.put(
  "/api/internal-transfers/:uuid/cancel",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();

      const { uuid } = req.params;
      const userId = req.user.id;

      // 1. Kiểm tra quyền (Admin hoặc Người tạo)
      const [perms] = await connection.query(
        "SELECT p.name_permission FROM tb_user_permission up JOIN tb_permission p ON up.id_permission = p.id_permission WHERE up.id_nhan_vien = ?",
        [userId]
      );
      const isAdmin = perms.map((p) => p.name_permission).includes("admin");

      const [existing] = await connection.query(
        "SELECT id_machine_internal_transfer, created_by, status FROM tb_machine_internal_transfer WHERE uuid_machine_internal_transfer = ?",
        [uuid]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Transfer not found" });
      }

      const ticket = existing[0];

      if (!isAdmin && ticket.created_by !== userId) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền hủy phiếu này",
        });
      }

      if (ticket.status === "completed" || ticket.status === "cancelled") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Không thể hủy phiếu đã hoàn thành hoặc đã hủy",
        });
      }

      // 2. Cập nhật trạng thái phiếu
      await connection.query(
        `
        UPDATE tb_machine_internal_transfer 
        SET status = 'cancelled', updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine_internal_transfer = ?
        `,
        [userId, ticket.id_machine_internal_transfer]
      );

      // KHÔNG chạy logic handleInternalTransferApproval vì là Hủy

      await connection.commit();
      res.json({
        success: true,
        message: "Đã hủy phiếu thành công",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error cancelling transfer:", error);
      res
        .status(500)
        .json({ success: false, message: "Lỗi máy chủ", error: error.message });
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
  userId
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
        [idMachine, idFromLocation, idToLocation, userId, userId]
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
        [idMachine, idToLocation, userId, userId]
      );
    } else if (idFromLocation !== idToLocation) {
      // UPDATE nếu vị trí thay đổi
      await connection.query(
        `
        UPDATE tb_machine_location
        SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [idToLocation, userId, idMachine]
      );
    } else {
      // Vị trí không thay đổi, chỉ cập nhật (touch)
      await connection.query(
        `
        UPDATE tb_machine_location
        SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [userId, idMachine]
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
      [newMachineStatus, userId, idMachine]
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

      const {
        type_machines,
        model_machines,
        manufacturers,
        current_status,
        is_borrowed_or_rented_or_borrowed_out,
      } = req.query;

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

      // 2. LẤY THỐNG KÊ (CHO CÁC THẺ) - LUÔN KHÔNG CÓ BỘ LỌC
      const statsQuery = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN m.current_status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN m.current_status = 'in_use' THEN 1 ELSE 0 END) as in_use,
          SUM(CASE WHEN m.current_status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN m.current_status = 'liquidation' THEN 1 ELSE 0 END) as liquidation,
          SUM(CASE WHEN m.current_status = 'disabled' THEN 1 ELSE 0 END) as disabled,
          SUM(CASE WHEN m.current_status = 'broken' THEN 1 ELSE 0 END) as broken,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'borrowed' THEN 1 ELSE 0 END) as borrowed,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'rented' THEN 1 ELSE 0 END) as rented,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'borrowed_out' THEN 1 ELSE 0 END) as borrowed_out,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'borrowed_return' THEN 1 ELSE 0 END) as borrowed_return,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'rented_return' THEN 1 ELSE 0 END) as rented_return
        FROM tb_machine_location ml
        JOIN tb_machine m ON m.id_machine = ml.id_machine
        WHERE ml.id_location = ?
        -- Chú ý: Không có filterClause ở đây
      `;
      const [statsResult] = await tpmConnection.query(statsQuery, [idLocation]);
      const stats = statsResult[0];

      // 3. XÂY DỰNG BỘ LỌC (CHO BẢNG VÀ PHÂN TRANG)
      let whereConditions = [];
      let filterParams = []; // Params chỉ cho filter (dùng cho count)
      let dataParams = [idLocation]; // Params cho data (dùng cho data query)

      // 1. Type filter
      if (type_machines && type_machines.length > 0) {
        whereConditions.push(`m.type_machine IN (?)`);
        const typeValues = Array.isArray(type_machines)
          ? type_machines
          : [type_machines];
        filterParams.push(typeValues);
        dataParams.push(typeValues);
      }
      // 2. Model filter
      if (model_machines && model_machines.length > 0) {
        whereConditions.push(`m.model_machine IN (?)`);
        const modelValues = Array.isArray(model_machines)
          ? model_machines
          : [model_machines];
        filterParams.push(modelValues);
        dataParams.push(modelValues);
      }
      // 3. Manufacturer filter
      if (manufacturers && manufacturers.length > 0) {
        whereConditions.push(`m.manufacturer IN (?)`);
        const manuValues = Array.isArray(manufacturers)
          ? manufacturers
          : [manufacturers];
        filterParams.push(manuValues);
        dataParams.push(manuValues);
      }
      // 4. Current Status filter
      if (current_status && current_status.length > 0) {
        whereConditions.push(`m.current_status IN (?)`);
        const statusValues = Array.isArray(current_status)
          ? current_status
          : [current_status];
        filterParams.push(statusValues);
        dataParams.push(statusValues);
      }
      // 5. Borrow Status filter
      if (
        is_borrowed_or_rented_or_borrowed_out &&
        is_borrowed_or_rented_or_borrowed_out.length > 0
      ) {
        whereConditions.push(`m.is_borrowed_or_rented_or_borrowed_out IN (?)`);
        const borrowValues = Array.isArray(
          is_borrowed_or_rented_or_borrowed_out
        )
          ? is_borrowed_or_rented_or_borrowed_out
          : [is_borrowed_or_rented_or_borrowed_out];
        filterParams.push(borrowValues);
        dataParams.push(borrowValues);
      }

      const filterClause =
        whereConditions.length > 0
          ? `AND ${whereConditions.join(" AND ")}`
          : "";

      // 4. LẤY TỔNG SỐ (CHO PHÂN TRANG) - CÓ BỘ LỌC
      const countQuery = `
        SELECT COUNT(*) as total
        FROM tb_machine_location ml
        JOIN tb_machine m ON m.id_machine = ml.id_machine
        WHERE ml.id_location = ?
        ${filterClause}
      `;
      const [countResult] = await tpmConnection.query(countQuery, [
        idLocation,
        ...filterParams,
      ]);
      const total = countResult[0].total; // This is the filtered total
      const totalPages = Math.ceil(total / limit);

      // 5. LẤY DỮ LIỆU BẢNG (CHO BẢNG) - CÓ BỘ LỌC
      const dataQuery = `
        SELECT 
          m.uuid_machine,
          m.code_machine,
          m.type_machine,
          m.model_machine,
          m.serial_machine,
          m.current_status,
          m.is_borrowed_or_rented_or_borrowed_out,
          c.name_category,
          m.manufacturer
        FROM tb_machine_location ml
        JOIN tb_machine m ON m.id_machine = ml.id_machine
        LEFT JOIN tb_category c ON c.id_category = m.id_category
        WHERE ml.id_location = ?
        ${filterClause}
        ORDER BY m.code_machine ASC
        LIMIT ? OFFSET ?
      `;
      dataParams.push(limit, offset);
      const [machines] = await tpmConnection.query(dataQuery, dataParams);

      res.json({
        success: true,
        message: "Machines at location retrieved successfully",
        data: machines,
        stats: stats,
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
      "SELECT id_machine, code_machine, type_machine, model_machine FROM tb_machine WHERE uuid_machine = ?",
      [uuid]
    );

    if (machineResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }
    const idMachine = machineResult[0].id_machine;

    // 2. Get history (MODIFIED QUERY)
    const [history] = await tpmConnection.query(
      `
      SELECT 
        h.move_date,
        l_from.name_location as from_location_name,
        l_to.name_location as to_location_name,
        h.created_at,
        h.created_by,
        
        -- Lấy thông tin user thật từ DB HiTimesheet
        nv.ma_nv AS real_ma_nv,
        nv.ten_nv AS real_ten_nv,

        -- Dùng CASE để điền thông tin user ảo (test users)
        CASE
          WHEN h.created_by = 99999 THEN '99999'
          WHEN h.created_by = 99990 THEN '99990'
          WHEN h.created_by = 99991 THEN '99991'
          WHEN h.created_by = 99992 THEN '99992'
          WHEN h.created_by = 99993 THEN '99993'
          WHEN h.created_by = 99994 THEN '99994'
          WHEN h.created_by = 99995 THEN '99995'
          ELSE nv.ma_nv
        END AS ma_nv,

        CASE
          WHEN h.created_by = 99999 THEN 'Quản Trị Viên (Test)'
          WHEN h.created_by = 99990 THEN 'Phòng Cơ Điện (Test)'
          WHEN h.created_by = 99991 THEN 'Cơ Điện Xưởng 1 (Test)'
          WHEN h.created_by = 99992 THEN 'Cơ Điện Xưởng 2 (Test)'
          WHEN h.created_by = 99993 THEN 'Cơ Điện Xưởng 3 (Test)'
          WHEN h.created_by = 99994 THEN 'Cơ Điện Xưởng 4 (Test)'
          WHEN h.created_by = 99995 THEN 'Viewer (Test)'
          ELSE nv.ten_nv
        END AS ten_nv

      FROM tb_machine_location_history h
      LEFT JOIN tb_location l_from ON l_from.id_location = h.id_from_location
      LEFT JOIN tb_location l_to ON l_to.id_location = h.id_to_location
      
      -- JOIN sang CSDL thứ 2 (dataHiTimesheet_database)
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien nv ON nv.id = h.created_by
      
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
          type_machine: machineResult[0].type_machine,
          model_machine: machineResult[0].model_machine,
        },
        history: history, // history giờ đã chứa ma_nv và ten_nv
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

// GET /api/locations/:uuid/stats-by-type - Get machine counts by type FOR A SPECIFIC LOCATION
app.get(
  "/api/locations/:uuid/stats-by-type",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;

      // 1. Lấy ID nội bộ của vị trí
      const [locResult] = await tpmConnection.query(
        "SELECT id_location FROM tb_location WHERE uuid_location = ?",
        [uuid]
      );

      if (locResult.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Location not found" });
      }
      const idLocation = locResult[0].id_location;

      // 2. Lấy thống kê theo loại máy cho vị trí đó
      const [stats] = await tpmConnection.query(
        `
        SELECT 
          m.type_machine,
          COUNT(*) as count
        FROM tb_machine m
        JOIN tb_machine_location ml ON m.id_machine = ml.id_machine
        WHERE ml.id_location = ? 
          AND m.type_machine IS NOT NULL 
          AND m.type_machine != ''
        GROUP BY m.type_machine
        ORDER BY count DESC
        LIMIT 8
        `,
        [idLocation]
      );

      res.json({
        success: true,
        message: "Stats by type for location retrieved successfully",
        data: stats, // Trả về mảng: [{ type_machine: 'Bàn hút', count: 51 }, ...]
      });
    } catch (error) {
      console.error("Error fetching stats by type for location:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// GET /api/departments/:uuid/machines - Get all machines & stats FOR A SPECIFIC DEPARTMENT
app.get(
  "/api/departments/:uuid/machines",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const {
        type_machines,
        model_machines,
        manufacturers,
        name_locations,
        current_status,
        is_borrowed_or_rented_or_borrowed_out,
      } = req.query;

      // 1. Get internal department ID
      const [deptResult] = await tpmConnection.query(
        "SELECT id_department FROM tb_department WHERE uuid_department = ?",
        [uuid]
      );

      if (deptResult.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Department not found" });
      }
      const idDepartment = deptResult[0].id_department;

      // 2. LẤY THỐNG KÊ (CHO CÁC THẺ) - LUÔN KHÔNG CÓ BỘ LỌC
      const statsQuery = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN m.current_status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN m.current_status = 'in_use' THEN 1 ELSE 0 END) as in_use,
          SUM(CASE WHEN m.current_status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN m.current_status = 'liquidation' THEN 1 ELSE 0 END) as liquidation,
          SUM(CASE WHEN m.current_status = 'disabled' THEN 1 ELSE 0 END) as disabled,
          SUM(CASE WHEN m.current_status = 'broken' THEN 1 ELSE 0 END) as broken,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'borrowed' THEN 1 ELSE 0 END) as borrowed,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'rented' THEN 1 ELSE 0 END) as rented,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'borrowed_out' THEN 1 ELSE 0 END) as borrowed_out,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'borrowed_return' THEN 1 ELSE 0 END) as borrowed_return,
          SUM(CASE WHEN m.is_borrowed_or_rented_or_borrowed_out = 'rented_return' THEN 1 ELSE 0 END) as rented_return
        FROM tb_machine m
        JOIN tb_machine_location ml ON m.id_machine = ml.id_machine
        JOIN tb_location tl ON ml.id_location = tl.id_location
        WHERE tl.id_department = ?
        -- Chú ý: Không có filterClause ở đây
      `;
      const [statsResult] = await tpmConnection.query(statsQuery, [
        idDepartment,
      ]);
      const stats = statsResult[0];

      // 3. XÂY DỰNG BỘ LỌC (CHO BẢNG VÀ PHÂN TRANG)
      let whereConditions = [];
      let filterParams = []; // Params chỉ cho filter (dùng cho count)
      let dataParams = [idDepartment]; // Params cho data (dùng cho data query)

      // 1. Type filter
      if (type_machines && type_machines.length > 0) {
        whereConditions.push(`m.type_machine IN (?)`);
        const typeValues = Array.isArray(type_machines)
          ? type_machines
          : [type_machines];
        filterParams.push(typeValues);
        dataParams.push(typeValues);
      }
      // 2. Model filter
      if (model_machines && model_machines.length > 0) {
        whereConditions.push(`m.model_machine IN (?)`);
        const modelValues = Array.isArray(model_machines)
          ? model_machines
          : [model_machines];
        filterParams.push(modelValues);
        dataParams.push(modelValues);
      }
      // 3. Manufacturer filter
      if (manufacturers && manufacturers.length > 0) {
        whereConditions.push(`m.manufacturer IN (?)`);
        const manuValues = Array.isArray(manufacturers)
          ? manufacturers
          : [manufacturers];
        filterParams.push(manuValues);
        dataParams.push(manuValues);
      }
      // 4. Location filter (specific to department view)
      if (name_locations && name_locations.length > 0) {
        whereConditions.push(`tl.name_location IN (?)`);
        const locValues = Array.isArray(name_locations)
          ? name_locations
          : [name_locations];
        filterParams.push(locValues);
        dataParams.push(locValues);
      }
      // 5. Current Status filter
      if (current_status && current_status.length > 0) {
        whereConditions.push(`m.current_status IN (?)`);
        const statusValues = Array.isArray(current_status)
          ? current_status
          : [current_status];
        filterParams.push(statusValues);
        dataParams.push(statusValues);
      }
      // 6. Borrow Status filter
      if (
        is_borrowed_or_rented_or_borrowed_out &&
        is_borrowed_or_rented_or_borrowed_out.length > 0
      ) {
        whereConditions.push(`m.is_borrowed_or_rented_or_borrowed_out IN (?)`);
        const borrowValues = Array.isArray(
          is_borrowed_or_rented_or_borrowed_out
        )
          ? is_borrowed_or_rented_or_borrowed_out
          : [is_borrowed_or_rented_or_borrowed_out];
        filterParams.push(borrowValues);
        dataParams.push(borrowValues);
      }

      const filterClause =
        whereConditions.length > 0
          ? `AND ${whereConditions.join(" AND ")}`
          : "";

      // 4. LẤY TỔNG SỐ (CHO PHÂN TRANG) - CÓ BỘ LỌC
      const countQuery = `
        SELECT COUNT(*) as total
        FROM tb_machine m
        JOIN tb_machine_location ml ON m.id_machine = ml.id_machine
        JOIN tb_location tl ON ml.id_location = tl.id_location
        WHERE tl.id_department = ?
        ${filterClause}
      `;
      const [countResult] = await tpmConnection.query(countQuery, [
        idDepartment,
        ...filterParams,
      ]);
      const total = countResult[0].total; // This is the filtered total
      const totalPages = Math.ceil(total / limit);

      // 5. LẤY DỮ LIỆU BẢNG (CHO BẢNG) - CÓ BỘ LỌC
      const dataQuery = `
        SELECT 
          m.uuid_machine,
          m.code_machine,
          m.type_machine,
          m.model_machine,
          m.serial_machine,
          m.current_status,
          m.is_borrowed_or_rented_or_borrowed_out,
          c.name_category,
          m.manufacturer,
          tl.name_location -- Thêm tên vị trí của máy
        FROM tb_machine m
        JOIN tb_machine_location ml ON m.id_machine = ml.id_machine
        JOIN tb_location tl ON ml.id_location = tl.id_location
        LEFT JOIN tb_category c ON c.id_category = m.id_category
        WHERE tl.id_department = ?
        ${filterClause}
        ORDER BY tl.name_location ASC, m.code_machine ASC
        LIMIT ? OFFSET ?
      `;
      dataParams.push(limit, offset);
      const [machines] = await tpmConnection.query(dataQuery, dataParams);

      res.json({
        success: true,
        message: "Machines at department retrieved successfully",
        data: machines,
        stats: stats,
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
      console.error("Error fetching machines by department:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// GET /api/departments/:uuid/stats-by-type - Get machine counts by type FOR A SPECIFIC DEPARTMENT
app.get(
  "/api/departments/:uuid/stats-by-type",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;

      // 1. Lấy ID nội bộ của đơn vị
      const [deptResult] = await tpmConnection.query(
        "SELECT id_department FROM tb_department WHERE uuid_department = ?",
        [uuid]
      );

      if (deptResult.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Department not found" });
      }
      const idDepartment = deptResult[0].id_department;

      // 2. Lấy thống kê theo loại máy
      const [stats] = await tpmConnection.query(
        `
        SELECT 
          m.type_machine,
          COUNT(*) as count
        FROM tb_machine m
        JOIN tb_machine_location ml ON m.id_machine = ml.id_machine
        JOIN tb_location tl ON ml.id_location = tl.id_location
        WHERE tl.id_department = ?
          AND m.type_machine IS NOT NULL 
          AND m.type_machine != ''
        GROUP BY m.type_machine
        ORDER BY count DESC
        LIMIT 8
        `,
        [idDepartment]
      );

      res.json({
        success: true,
        message: "Stats by type for department retrieved successfully",
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching stats by type for department:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// POST /api/locations/update-machines - Update locations for multiple machines directly
app.post(
  "/api/locations/update-machines",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();

      const { to_location_uuid, machines } = req.body; // machines: [{ uuid_machine }]
      const userId = req.user.id;

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
            [idMachine, idFromLocation, toLocationId, userId, userId]
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
              [idMachine, toLocationId, userId, userId]
            );
          } else {
            // UPDATE
            await connection.query(
              `
              UPDATE tb_machine_location
              SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id_machine = ?
              `,
              [toLocationId, userId, idMachine]
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
            [newMachineStatus, userId, idMachine]
          );
        } else {
          // Nếu vị trí không đổi, chỉ cập nhật updated_at và updated_by
          await connection.query(
            `
             UPDATE tb_machine_location
             SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id_machine = ?
             `,
            [userId, idMachine]
          );
          // Cũng cập nhật updated_at trên tb_machine
          await connection.query(
            `
              UPDATE tb_machine
              SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id_machine = ?
              `,
            [userId, idMachine]
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
