// backend/server.js

const express = require("express");
// const router = express.Router();
// const sql = require("mssql");
const mysql = require("mysql2/promise");
const cors = require("cors");
const multer = require("multer");
const { google } = require("googleapis");
const { Readable } = require("stream");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
// const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
    files: 10, // Tối đa 10 file
  },
  fileFilter: (req, file, cb) => {
    // Ép multer đọc tên file (originalname) bằng 'utf8' thay vì 'latin1'
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    cb(null, true);
  },
});

// 1. Khởi tạo OAuth2 client từ các biến .env
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 2. Set Refresh Token (Lấy từ file .env)
// Đây là bước quan trọng nhất. Server sẽ dùng token này để tự động lấy access token mới.
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// 3. Lấy ID thư mục từ .env
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// 4. Hàm upload file (sử dụng oauth2Client)
const uploadFileToDrive = async (fileObject) => {
  if (!fileObject) {
    console.warn("uploadFileToDrive: fileObject is null");
    return null;
  }
  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const { buffer, originalname, mimetype } = fileObject;

    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);

    const fileMetadata = {
      name: originalname,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      mimeType: mimetype,
    };

    const media = {
      mimeType: mimetype,
      body: bufferStream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    // Cấp quyền xem cho mọi người (publicly viewable)
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Tạo link 'preview' (nhúng) thay vì 'view' (mở tab)
    const fileId = response.data.id;
    const embedLink = `https://drive.google.com/file/d/${fileId}/preview`;

    // Trả về object {name, link}
    return {
      name: originalname,
      id: fileId,
      link: embedLink,
    };
  } catch (err) {
    console.error("Error uploading file to Google Drive:", err.message);
    if (err.message.includes("invalid_grant")) {
      console.error(
        "LỖI NGHIÊM TRỌNG: GOOGLE_REFRESH_TOKEN có thể đã hết hạn hoặc bị thu hồi. Hãy chạy lại file token.js để lấy token mới."
      );
    }
    return null;
  }
};

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

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your-default-secret-key",
    (err, decoded) => {
      if (err) {
        return res
          .status(403)
          .json({ success: false, message: "Invalid token" });
      }
      req.user = decoded;
      next();
    }
  );
};

// MARK: SERVER START

app.listen(process.env.PORT || 8081, () => {
  console.log(`Server is running on port ${process.env.PORT || 8081}`);
});

// MARK: LOGIN

// POST /api/auth/login - Login with employee ID and password
app.post("/api/auth/login", async (req, res) => {
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
      attribute_machines,
      manufacturers,
      suppliers,
      name_locations,
      current_status,
      is_borrowed_or_rented_or_borrowed_out,
      sortBy,
      sortOrder,
    } = req.query;

    // Build search condition and params
    let whereConditions = []; // <<< CHANGED from string to array
    let countParams = [];
    let dataParams = [];

    // 0. Loại bỏ máy có current_status = 'temporary' (tạm thời)
    whereConditions.push(`m.current_status != 'temporary'`);

    // 1. Search filter
    if (search) {
      const searchLower = search.toLowerCase().trim();
      let isSpecificSearch = false;
      let searchColumn = "";
      let searchTermRaw = "";

      // --- A. KIỂM TRA CÁC TAG (PREFIX) ---
      // Nếu khớp tag nào thì lấy cột tương ứng và cắt bỏ tag đi
      if (searchLower.startsWith("type:") || searchLower.startsWith("loai:")) {
        searchColumn = "m.type_machine";
        searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
        isSpecificSearch = true;
      } else if (
        searchLower.startsWith("model:") ||
        searchLower.startsWith("mo:")
      ) {
        //
        searchColumn = "m.model_machine";
        searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
        isSpecificSearch = true;
      } else if (
        searchLower.startsWith("rfid:") ||
        searchLower.startsWith("id:")
      ) {
        searchColumn = "m.RFID_machine";
        searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
        isSpecificSearch = true;
      } else if (searchLower.startsWith("nfc:")) {
        searchColumn = "m.NFC_machine";
        searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
        isSpecificSearch = true;
      } else if (
        searchLower.startsWith("seri:") ||
        searchLower.startsWith("serial:")
      ) {
        searchColumn = "m.serial_machine";
        searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
        isSpecificSearch = true;
      } else if (
        searchLower.startsWith("hsx:") ||
        searchLower.startsWith("hang:")
      ) {
        searchColumn = "m.manufacturer";
        searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
        isSpecificSearch = true;
      } else if (searchLower.startsWith("ncc:")) {
        searchColumn = "m.supplier";
        searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
        isSpecificSearch = true;
      } else if (
        searchLower.startsWith("ma:") ||
        searchLower.startsWith("code:")
      ) {
        searchColumn = "m.code_machine";
        searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
        isSpecificSearch = true;
      }

      // --- B. ÁP DỤNG ĐIỀU KIỆN ---

      if (isSpecificSearch && searchTermRaw.length > 0) {
        // TRƯỜNG HỢP 1: TÌM KIẾM CỤ THỂ (NẾU CÓ TAG)
        // Chỉ tìm đúng cột đã định nghĩa
        const searchPattern = `%${searchTermRaw}%`;
        whereConditions.push(`${searchColumn} LIKE ?`);
        countParams.push(searchPattern);
        dataParams.push(searchPattern);
      } else {
        // TRƯỜNG HỢP 2: TÌM KIẾM CŨ (MẶC ĐỊNH)
        // Giữ nguyên logic cũ của bạn: Tìm OR trên tất cả các trường
        const searchPattern = `%${search}%`;
        whereConditions.push(`
          (m.type_machine LIKE ?
          OR m.attribute_machine LIKE ?
          OR m.model_machine LIKE ?
          OR m.code_machine LIKE ? 
          OR m.serial_machine LIKE ? 
          OR m.manufacturer LIKE ?
          OR m.supplier LIKE ?
          OR tl.name_location LIKE ?
          OR m.RFID_machine LIKE ?
          OR m.NFC_machine LIKE ?)
        `);
        // Push params 10 lần cho 10 dấu ?
        for (let i = 0; i < 10; i++) {
          countParams.push(searchPattern);
          dataParams.push(searchPattern);
        }
      }
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

    // 3. Attribute filter
    if (attribute_machines && attribute_machines.length > 0) {
      whereConditions.push(`m.attribute_machine IN (?)`);
      const attrValues = Array.isArray(attribute_machines)
        ? attribute_machines
        : [attribute_machines];
      countParams.push(attrValues);
      dataParams.push(attrValues);
    }

    // 4. Model filter
    if (model_machines && model_machines.length > 0) {
      whereConditions.push(`m.model_machine IN (?)`);
      const modelValues = Array.isArray(model_machines)
        ? model_machines
        : [model_machines];
      countParams.push(modelValues);
      dataParams.push(modelValues);
    }

    // 5. Manufacturer filter
    if (manufacturers && manufacturers.length > 0) {
      whereConditions.push(`m.manufacturer IN (?)`);
      const manuValues = Array.isArray(manufacturers)
        ? manufacturers
        : [manufacturers];
      countParams.push(manuValues);
      dataParams.push(manuValues);
    }

    // 6. Supplier filter
    if (suppliers && suppliers.length > 0) {
      whereConditions.push(`m.supplier IN (?)`);
      const supplierValues = Array.isArray(suppliers) ? suppliers : [suppliers];
      countParams.push(supplierValues);
      dataParams.push(supplierValues);
    }

    // 7. Location filter
    if (name_locations && name_locations.length > 0) {
      whereConditions.push(`tl.name_location IN (?)`);
      const locValues = Array.isArray(name_locations)
        ? name_locations
        : [name_locations];
      countParams.push(locValues);
      dataParams.push(locValues);
    }

    // 8. Current Status filter (Trạng thái chính)
    if (current_status && current_status.length > 0) {
      whereConditions.push(`m.current_status IN (?)`);
      const statusValues = Array.isArray(current_status)
        ? current_status
        : [current_status];
      countParams.push(statusValues);
      dataParams.push(statusValues);
    }

    // 9. Borrow Status filter (Trạng thái mượn/thuê)
    // (req.query param "is_borrowed_or_rented_or_borrowed_out" sẽ được map tới cột "is_borrowed_...")
    if (
      is_borrowed_or_rented_or_borrowed_out &&
      is_borrowed_or_rented_or_borrowed_out.length > 0
    ) {
      const borrowValues = Array.isArray(is_borrowed_or_rented_or_borrowed_out)
        ? is_borrowed_or_rented_or_borrowed_out
        : [is_borrowed_or_rented_or_borrowed_out];

      const hasInternal = borrowValues.includes("internal");
      const otherValues = borrowValues.filter((v) => v !== "internal");

      let conditionParts = [];

      // Xử lý các giá trị khác (rented, borrowed, ...)
      if (otherValues.length > 0) {
        // Tạo dấu hỏi động: ?,?,? tương ứng số lượng phần tử
        const placeholders = otherValues.map(() => "?").join(",");
        conditionParts.push(
          `m.is_borrowed_or_rented_or_borrowed_out IN (${placeholders})`
        );

        // Push từng giá trị vào params (spread operator) thay vì push cả mảng
        dataParams.push(...otherValues);
        countParams.push(...otherValues);
      }

      // Xử lý internal (NULL hoặc rỗng)
      if (hasInternal) {
        conditionParts.push(
          `(m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out = '')`
        );
      }

      if (conditionParts.length > 0) {
        whereConditions.push(`(${conditionParts.join(" OR ")})`);
      }
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Build ORDER BY clause
    let orderByClause = "";
    if (sortBy) {
      // Map frontend field names to database column names
      const columnMap = {
        code_machine: "m.code_machine",
        type_machine: "m.type_machine",
        attribute_machine: "m.attribute_machine",
        model_machine: "m.model_machine",
        manufacturer: "m.manufacturer",
        supplier: "m.supplier",
        serial_machine: "m.serial_machine",
        RFID_machine: "m.RFID_machine",
        NFC_machine: "m.NFC_machine",
        name_category: "c.name_category",
        name_location: "tl.name_location",
        current_status: "m.current_status",
        is_borrowed_or_rented_or_borrowed_out:
          "m.is_borrowed_or_rented_or_borrowed_out",
        is_borrowed_or_rented_or_borrowed_out_name:
          "m.is_borrowed_or_rented_or_borrowed_out_name",
        is_borrowed_or_rented_or_borrowed_out_date:
          "m.is_borrowed_or_rented_or_borrowed_out_date",
        is_borrowed_or_rented_or_borrowed_out_return_date:
          "m.is_borrowed_or_rented_or_borrowed_out_return_date",
        power: "m.power",
        pressure: "m.pressure",
        voltage: "m.voltage",
        price: "m.price",
        lifespan: "m.lifespan",
        repair_cost: "m.repair_cost",
        date_of_use: "m.date_of_use",
        created_at: "m.created_at",
        updated_at: "m.updated_at",
      };

      const dbColumn = columnMap[sortBy];
      if (dbColumn) {
        const order = sortOrder === "desc" ? "DESC" : "ASC";
        orderByClause = `ORDER BY ${dbColumn} ${order}`;
      }
    }

    // Get total count
    const countQuery = `
      SELECT 
        COUNT(*) as real_total,
        COUNT(*) - SUM(CASE WHEN is_borrowed_or_rented_or_borrowed_out = 'borrowed_return' THEN 1 ELSE 0 END) - SUM(CASE WHEN is_borrowed_or_rented_or_borrowed_out = 'rented_return' THEN 1 ELSE 0 END) - SUM(CASE WHEN current_status = 'liquidation' THEN 1 ELSE 0 END) as display_total
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      ${whereClause}
    `;

    const [countResult] = await tpmConnection.query(countQuery, countParams);

    const realTotal = countResult[0].real_total;
    const displayTotal = countResult[0].display_total;
    const totalPages = Math.ceil(realTotal / limit);

    // Get paginated data
    const dataQuery = `
      SELECT 
        m.uuid_machine,
        m.serial_machine,
        m.RFID_machine,
        m.NFC_machine,
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
        m.attribute_machine,
        m.supplier,
        m.power,
        m.pressure,
        m.voltage,
        m.created_at,
        m.updated_at,
        c.name_category,
        tl.name_location
      FROM tb_machine m
      LEFT JOIN tb_category c ON c.id_category = m.id_category
      LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
      LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
      ${whereClause}
      ${orderByClause}
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
        total: realTotal,
        displayTotal: displayTotal,
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

// GET /api/machines/distinct-values
app.get(
  "/api/machines/distinct-values",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        field,
        department_uuid, // Context: Đơn vị đang chọn
        location_uuid, // Context: Vị trí đang chọn
        // Filters từ dropdown
        type_machines,
        attribute_machines,
        model_machines,
        manufacturers,
        suppliers,
        name_locations,
      } = req.query;

      const toArray = (val) => (Array.isArray(val) ? val : [val]);
      const hasValue = (val) => val && val.length > 0;

      let query = "";
      let params = [];
      let whereConditions = [];
      let joins = [];

      // 1. Base Query
      if (field === "name_location") {
        query = `SELECT DISTINCT tl.name_location as value 
                 FROM tb_location tl 
                 LEFT JOIN tb_department td ON td.id_department = tl.id_department
                 LEFT JOIN tb_machine_location ml ON ml.id_location = tl.id_location
                 LEFT JOIN tb_machine m ON m.id_machine = ml.id_machine`;

        whereConditions.push(
          "tl.name_location IS NOT NULL AND tl.name_location != ''"
        );
      } else {
        query = `SELECT DISTINCT m.${field} as value FROM tb_machine m`;
        joins.push(
          "LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine"
        );
        joins.push(
          "LEFT JOIN tb_location tl ON tl.id_location = ml.id_location"
        );
        joins.push(
          "LEFT JOIN tb_department td ON td.id_department = tl.id_department"
        );

        whereConditions.push(`m.${field} IS NOT NULL AND m.${field} != ''`);
        whereConditions.push("m.current_status != 'temporary'");
      }

      // 2. CONTEXT FILTERS (Luôn áp dụng nếu có - Đây là sự khác biệt chính)
      // Nếu đang ở trang Theo dõi vị trí, ta phải luôn giới hạn trong Vị trí/Đơn vị đó
      if (location_uuid) {
        whereConditions.push(`tl.uuid_location = ?`);
        params.push(location_uuid);
      } else if (department_uuid) {
        whereConditions.push(`td.uuid_department = ?`);
        params.push(department_uuid);
      }

      // 3. CASCADING FILTERS (Áp dụng nếu không phải là field đang query)

      // -> Loại máy
      if (field !== "type_machine" && hasValue(type_machines)) {
        whereConditions.push(`m.type_machine IN (?)`);
        params.push(toArray(type_machines));
      }

      // -> Đặc tính
      if (field !== "attribute_machine" && hasValue(attribute_machines)) {
        whereConditions.push(`m.attribute_machine IN (?)`);
        params.push(toArray(attribute_machines));
      }

      // -> Model
      if (field !== "model_machine" && hasValue(model_machines)) {
        whereConditions.push(`m.model_machine IN (?)`);
        params.push(toArray(model_machines));
      }

      // -> Hãng SX
      if (field !== "manufacturer" && hasValue(manufacturers)) {
        whereConditions.push(`m.manufacturer IN (?)`);
        params.push(toArray(manufacturers));
      }

      // -> Nhà cung cấp
      if (field !== "supplier" && hasValue(suppliers)) {
        whereConditions.push(`m.supplier IN (?)`);
        params.push(toArray(suppliers));
      }

      // -> Vị trí (Tên) - Chỉ dùng khi xem theo Đơn vị (để lọc các vị trí con)
      // Lưu ý: Nếu đã có location_uuid (context) thì cái này thường thừa, nhưng giữ logic chung
      if (field !== "name_location" && hasValue(name_locations)) {
        whereConditions.push(`tl.name_location IN (?)`);
        params.push(toArray(name_locations));
      }

      // 4. Execute
      if (joins.length > 0) query += " " + joins.join(" ");
      if (whereConditions.length > 0)
        query += " WHERE " + whereConditions.join(" AND ");

      if (field !== "name_location") {
        query += ` ORDER BY value ASC`;
      }

      const [rows] = await tpmConnection.query(query, params);
      res.json({ success: true, data: rows.map((r) => r.value) });
    } catch (error) {
      console.error("Error distinct values:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/machine-types - Get all machine types
app.get("/api/machine-types", authenticateToken, async (req, res) => {
  try {
    const [types] = await tpmConnection.query(
      `SELECT 
        uuid_machine_type as uuid,
        name_machine_type as name
      FROM tb_machine_type
      ORDER BY name_machine_type ASC`
    );
    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error("Error fetching machine types:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/machine-types/:uuid/attributes - Get attributes for a specific machine type
app.get(
  "/api/machine-types/:uuid/attributes",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const [attributes] = await tpmConnection.query(
        `SELECT 
          ma.uuid_machine_attribute as uuid,
          ma.name_machine_attribute as name
        FROM tb_machine_attribute ma
        INNER JOIN tb_machine_type_attribute mta ON mta.id_machine_attribute = ma.id_machine_attribute
        INNER JOIN tb_machine_type mt ON mt.id_machine_type = mta.id_machine_type
        WHERE mt.uuid_machine_type = ?
        ORDER BY ma.name_machine_attribute ASC`,
        [uuid]
      );
      res.json({
        success: true,
        data: attributes,
      });
    } catch (error) {
      console.error("Error fetching machine type attributes:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// GET /api/machine-manufacturers - Get all machine manufacturers
app.get("/api/machine-manufacturers", authenticateToken, async (req, res) => {
  try {
    const [manufacturers] = await tpmConnection.query(
      `SELECT 
          uuid_machine_manufacturer as uuid,
          name_machine_manufacturer as name
        FROM tb_machine_manufacturer
        ORDER BY name_machine_manufacturer ASC`
    );
    res.json({
      success: true,
      data: manufacturers,
    });
  } catch (error) {
    console.error("Error fetching machine manufacturers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/machine-suppliers - Get all machine suppliers
app.get("/api/machine-suppliers", authenticateToken, async (req, res) => {
  try {
    const [suppliers] = await tpmConnection.query(
      `SELECT 
        uuid_machine_supplier as uuid,
        name_machine_supplier as name
      FROM tb_machine_supplier
      ORDER BY name_machine_supplier ASC`
    );
    res.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("Error fetching machine suppliers:", error);
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
        COUNT(*) - SUM(CASE WHEN current_status = 'temporary' THEN 1 ELSE 0 END) as total,
        SUM(CASE WHEN current_status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN current_status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN current_status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN current_status = 'liquidation' THEN 1 ELSE 0 END) as liquidation,
        SUM(CASE WHEN current_status = 'disabled' THEN 1 ELSE 0 END) as disabled,
        SUM(CASE WHEN current_status = 'broken' THEN 1 ELSE 0 END) as broken,
        SUM(CASE WHEN current_status = 'pending_liquidation' THEN 1 ELSE 0 END) as pending_liquidation,
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

// GET /api/machines/matrix-stats - Get detailed matrix statistics
app.get("/api/machines/matrix-stats", authenticateToken, async (req, res) => {
  try {
    // Query nhóm theo cả 2 trạng thái
    const query = `
      SELECT 
        current_status,
        COALESCE(is_borrowed_or_rented_or_borrowed_out, 'internal') as source_type,
        COUNT(*) as count
      FROM tb_machine
      GROUP BY current_status, is_borrowed_or_rented_or_borrowed_out
    `;

    const [rows] = await tpmConnection.query(query);

    // Khởi tạo cấu trúc dữ liệu trả về
    // Các dòng (Rows)
    const statuses = [
      "available",
      "in_use",
      "maintenance",
      "liquidation",
      "broken",
      "disabled",
      "pending_liquidation",
    ];
    // Các cột (Cols)
    const sources = [
      "internal",
      "borrowed",
      "rented",
      "borrowed_out",
      "borrowed_return",
      "rented_return",
    ];

    // Tạo object chứa dữ liệu mặc định là 0
    let matrix = {};
    statuses.forEach((status) => {
      matrix[status] = {};
      sources.forEach((source) => {
        matrix[status][source] = 0;
      });
    });

    // Điền dữ liệu từ DB vào matrix
    rows.forEach((row) => {
      const status = row.current_status;
      const source = row.source_type;

      if (matrix[status] && matrix[status][source] !== undefined) {
        matrix[status][source] = row.count;
      }
    });

    res.json({
      success: true,
      message: "Matrix statistics retrieved successfully",
      data: matrix,
    });
  } catch (error) {
    console.error("Error fetching matrix stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/locations/:uuid/matrix-stats - Get matrix stats for a specific location
app.get(
  "/api/locations/:uuid/matrix-stats",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;

      // 1. Lấy ID nội bộ
      const [locResult] = await tpmConnection.query(
        "SELECT id_location FROM tb_location WHERE uuid_location = ?",
        [uuid]
      );
      if (locResult.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Location not found" });
      const idLocation = locResult[0].id_location;

      // 2. Query Group By
      const query = `
      SELECT 
        m.current_status,
        COALESCE(m.is_borrowed_or_rented_or_borrowed_out, 'internal') as source_type,
        COUNT(*) as count
      FROM tb_machine m
      JOIN tb_machine_location ml ON m.id_machine = ml.id_machine
      WHERE ml.id_location = ?
      GROUP BY m.current_status, m.is_borrowed_or_rented_or_borrowed_out
    `;
      const [rows] = await tpmConnection.query(query, [idLocation]);

      // 3. Format Matrix Data (Giống API matrix-stats chung)
      const statuses = [
        "available",
        "in_use",
        "maintenance",
        "liquidation",
        "broken",
        "disabled",
        "pending_liquidation",
      ];
      const sources = [
        "internal",
        "borrowed",
        "rented",
        "borrowed_out",
        "borrowed_return",
        "rented_return",
      ];
      let matrix = {};
      statuses.forEach((status) => {
        matrix[status] = {};
        sources.forEach((source) => {
          matrix[status][source] = 0;
        });
      });

      rows.forEach((row) => {
        const status = row.current_status;
        const source = row.source_type;
        if (matrix[status] && matrix[status][source] !== undefined) {
          matrix[status][source] = row.count;
        }
      });

      res.json({ success: true, data: matrix });
    } catch (error) {
      console.error("Error fetching location matrix stats:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/departments/:uuid/matrix-stats - Get matrix stats for a specific department
app.get(
  "/api/departments/:uuid/matrix-stats",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;

      // 1. Lấy ID nội bộ
      const [deptResult] = await tpmConnection.query(
        "SELECT id_department FROM tb_department WHERE uuid_department = ?",
        [uuid]
      );
      if (deptResult.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Department not found" });
      const idDepartment = deptResult[0].id_department;

      // 2. Query Group By (Join qua tb_location)
      const query = `
      SELECT 
        m.current_status,
        COALESCE(m.is_borrowed_or_rented_or_borrowed_out, 'internal') as source_type,
        COUNT(*) as count
      FROM tb_machine m
      JOIN tb_machine_location ml ON m.id_machine = ml.id_machine
      JOIN tb_location tl ON ml.id_location = tl.id_location
      WHERE tl.id_department = ?
      GROUP BY m.current_status, m.is_borrowed_or_rented_or_borrowed_out
    `;
      const [rows] = await tpmConnection.query(query, [idDepartment]);

      // 3. Format Matrix Data
      const statuses = [
        "available",
        "in_use",
        "maintenance",
        "liquidation",
        "broken",
        "disabled",
        "pending_liquidation",
      ];
      const sources = [
        "internal",
        "borrowed",
        "rented",
        "borrowed_out",
        "borrowed_return",
        "rented_return",
      ];
      let matrix = {};
      statuses.forEach((status) => {
        matrix[status] = {};
        sources.forEach((source) => {
          matrix[status][source] = 0;
        });
      });

      rows.forEach((row) => {
        const status = row.current_status;
        const source = row.source_type;
        if (matrix[status] && matrix[status][source] !== undefined) {
          matrix[status][source] = row.count;
        }
      });

      res.json({ success: true, data: matrix });
    } catch (error) {
      console.error("Error fetching department matrix stats:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

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
      WHERE type_machine IS NOT NULL AND type_machine != '' AND current_status != 'temporary'
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
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { ticket_type, filter_by_phongban_id } = req.query;

    if (!search || search.trim().length === 0) {
      return res.json({
        success: true,
        message: "Vui lòng nhập từ khóa tìm kiếm.",
        data: [],
        pagination: { page: 1, limit: limit, total: 0, totalPages: 1 },
      });
    }

    let whereConditions = [];
    let searchParams = [];

    // --- 1. XỬ LÝ LOGIC TÌM KIẾM (TAGS) ---
    const searchLower = search.toLowerCase().trim();
    let isSpecificSearch = false;
    let searchColumn = "";
    let searchTermRaw = "";

    // Kiểm tra các tiền tố (prefix)
    if (searchLower.startsWith("type:") || searchLower.startsWith("loai:")) {
      searchColumn = "m.type_machine";
      searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
      isSpecificSearch = true;
    } else if (
      searchLower.startsWith("model:") ||
      searchLower.startsWith("mo:")
    ) {
      searchColumn = "m.model_machine";
      searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
      isSpecificSearch = true;
    } else if (
      searchLower.startsWith("rfid:") ||
      searchLower.startsWith("id:")
    ) {
      searchColumn = "m.RFID_machine";
      searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
      isSpecificSearch = true;
    } else if (searchLower.startsWith("nfc:")) {
      searchColumn = "m.NFC_machine";
      searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
      isSpecificSearch = true;
    } else if (
      searchLower.startsWith("seri:") ||
      searchLower.startsWith("serial:")
    ) {
      searchColumn = "m.serial_machine";
      searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
      isSpecificSearch = true;
    } else if (
      searchLower.startsWith("hsx:") ||
      searchLower.startsWith("hang:")
    ) {
      searchColumn = "m.manufacturer";
      searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
      isSpecificSearch = true;
    } else if (searchLower.startsWith("ncc:")) {
      searchColumn = "m.supplier";
      searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
      isSpecificSearch = true;
    } else if (
      searchLower.startsWith("ma:") ||
      searchLower.startsWith("code:")
    ) {
      searchColumn = "m.code_machine";
      searchTermRaw = search.substring(search.indexOf(":") + 1).trim();
      isSpecificSearch = true;
    }

    if (isSpecificSearch && searchTermRaw.length > 0) {
      // TRƯỜNG HỢP A: TÌM CỤ THỂ THEO CỘT
      whereConditions.push(`${searchColumn} LIKE ?`);
      searchParams.push(`%${searchTermRaw}%`);
    } else {
      // TRƯỜNG HỢP B: TÌM KIẾM CHUNG (Mặc định)
      // Nếu tìm chung thì yêu cầu tối thiểu 2 ký tự để tránh lag DB
      if (search.length < 2) {
        return res.json({
          success: true,
          message: "Cần tối thiểu 2 ký tự để tìm kiếm chung.",
          data: [],
          pagination: { page: 1, limit: limit, total: 0, totalPages: 1 },
        });
      }

      whereConditions.push(`
        (m.type_machine LIKE ? 
        OR m.attribute_machine LIKE ?
        OR m.model_machine LIKE ? 
        OR m.code_machine LIKE ? 
        OR m.serial_machine LIKE ? 
        OR m.RFID_machine LIKE ?
        OR m.NFC_machine LIKE ?)
      `);
      const pattern = `%${search}%`;
      // Push 7 lần cho 7 dấu ?
      searchParams.push(
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern
      );
    }

    // --- 2. XỬ LÝ LOGIC LỌC THEO LOẠI PHIẾU (Ticket Type) ---
    if (ticket_type) {
      const conditions = getMachineFilterConditions(ticket_type);
      if (conditions.where) {
        whereConditions.push(conditions.where);
      }
    }

    // --- 3. XÂY DỰNG CÂU TRUY VẤN ---
    let joins = [
      `LEFT JOIN tb_category c ON c.id_category = m.id_category`,
      `LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine`,
      `LEFT JOIN tb_location tl ON tl.id_location = ml.id_location`,
    ];

    // Lọc theo phòng ban (nếu có - cho điều chuyển nội bộ)
    if (filter_by_phongban_id) {
      joins.push(
        `LEFT JOIN tb_department td ON td.id_department = tl.id_department`
      );
      whereConditions.push(`td.id_phong_ban = ?`);
      searchParams.push(filter_by_phongban_id);
    }

    const joinClause = joins.join(" \n ");
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // --- 4. THỰC THI TRUY VẤN ---

    // A. Đếm tổng số kết quả
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tb_machine m
      ${joinClause}
      ${whereClause} 
    `;
    const [countResult] = await tpmConnection.query(countQuery, searchParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // B. Lấy dữ liệu phân trang
    const dataQuery = `
      SELECT 
        m.uuid_machine,
        m.code_machine,
        m.type_machine,
        m.attribute_machine,
        m.model_machine,
        m.serial_machine,
        m.RFID_machine,
        m.NFC_machine,
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

    // Thêm params cho LIMIT và OFFSET
    const dataParams = [...searchParams, limit, offset];

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
    console.error("Error fetching machines for search:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /api/machines/next-code - Lấy mã máy tiếp theo dựa trên prefix (Hãng SX)
app.get("/api/machines/next-code", authenticateToken, async (req, res) => {
  try {
    const { prefix } = req.query;
    if (!prefix) return res.json({ success: true, nextCode: "" });

    const cleanPrefix = prefix
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    // Lấy tất cả mã để tìm số lớn nhất
    const [rows] = await tpmConnection.query(
      `SELECT code_machine FROM tb_machine WHERE code_machine LIKE CONCAT(?, '%')`,
      [cleanPrefix]
    );

    let maxSeq = 0;

    rows.forEach((row) => {
      const code = row.code_machine;
      if (code.startsWith(cleanPrefix)) {
        const numberPart = code.slice(cleanPrefix.length);
        // Chỉ lấy phần số để so sánh toán học
        if (/^\d+$/.test(numberPart)) {
          const num = parseInt(numberPart, 10);
          if (num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    const nextSeq = maxSeq + 1;

    // --- SỬA TẠI ĐÂY: CỐ ĐỊNH 5 SỐ ---
    // Luôn luôn padStart(5, "0") bất kể DB đang lưu 3 số hay 4 số
    const seqString = String(nextSeq).padStart(5, "0");
    const nextCode = `${cleanPrefix}${seqString}`;

    res.json({ success: true, message: "OK", data: { nextCode } });
  } catch (error) {
    console.error("Error generating next code:", error);
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
        m.NFC_machine,
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
        m.attribute_machine,
        m.supplier,
        m.power,
        m.pressure,
        m.voltage,
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

      if (filterConditions.where) {
        whereConditions.push(filterConditions.where);
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
        m.type_machine,
        m.attribute_machine,
        m.model_machine,
        m.serial_machine,
        m.RFID_machine,
        m.NFC_machine,
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

// POST /api/machines/batch-check-serials - Batch check serials
app.post(
  "/api/machines/batch-check-serials",
  authenticateToken,
  async (req, res) => {
    try {
      const { serials } = req.body; // ["serial1", "serial2", ...]

      if (!serials || !Array.isArray(serials) || serials.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No serials provided" });
      }

      // Lọc ra các serial duy nhất
      const uniqueSerials = [...new Set(serials)];

      const [machines] = await tpmConnection.query(
        `
        SELECT 
          m.serial_machine,
          m.NFC_machine,
          m.type_machine,
          m.attribute_machine,
          m.model_machine,
          m.RFID_machine
        FROM tb_machine m
        WHERE m.serial_machine IN (?) OR m.NFC_machine IN (?)
        `,
        [uniqueSerials, uniqueSerials]
      );

      res.json({ success: true, data: machines });
    } catch (error) {
      console.error("Error batch checking serials:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// POST /api/machines/batch-update-rfid - Batch update RFID
app.post(
  "/api/machines/batch-update-rfid",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      const { updates } = req.body; // [{ serial: "s1", rfid: "r1" }, { serial: "s2", rfid: "r2" }]
      const userId = req.user.id;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No updates provided" });
      }

      await connection.beginTransaction();

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Dùng Promise.all để chạy các lệnh update song song
      const updatePromises = updates.map(async (update, index) => {
        if (!update.serial || !update.rfid) {
          errorCount++;
          errors.push(`Dòng ${index + 1}: Thiếu Serial hoặc RFID.`);
          return;
        }

        try {
          const serialTrimmed = String(update.serial).trim();
          const rfidTrimmed = String(update.rfid).trim();

          // Lấy id_machine & RFID hiện tại
          const [machineRows] = await connection.query(
            "SELECT id_machine, RFID_machine FROM tb_machine WHERE serial_machine = ? LIMIT 1",
            [serialTrimmed]
          );

          if (machineRows.length === 0) {
            errorCount++;
            errors.push(
              `Dòng ${
                index + 1
              }: Không tìm thấy Serial "${serialTrimmed}" để cập nhật.`
            );
            return;
          }

          const machineId = machineRows[0].id_machine;
          const currentRfid = machineRows[0].RFID_machine
            ? String(machineRows[0].RFID_machine).trim()
            : null;

          // Nếu RFID mới giống RFID hiện tại -> coi như thành công, không ghi lịch sử
          if (currentRfid && currentRfid === rfidTrimmed) {
            successCount++;
            return;
          }

          // Kiểm tra xem RFID mới có bị trùng không (trên máy khác)
          const [existingRfid] = await connection.query(
            "SELECT serial_machine FROM tb_machine WHERE RFID_machine = ? AND serial_machine != ?",
            [rfidTrimmed, serialTrimmed]
          );

          if (existingRfid.length > 0) {
            errorCount++;
            errors.push(
              `Dòng ${index + 1} (${
                update.serial
              }): RFID "${rfidTrimmed}" đã tồn tại trên máy "${
                existingRfid[0].serial_machine
              }".`
            );
            return;
          }

          // Thực hiện cập nhật
          const [result] = await connection.query(
            `
            UPDATE tb_machine 
            SET 
              RFID_machine = ?,
              updated_by = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE serial_machine = ?
            `,
            [rfidTrimmed, userId, serialTrimmed]
          );

          if (result.affectedRows > 0) {
            // Lưu lịch sử RFID sau khi update thành công
            if (rfidTrimmed) {
              await connection.query(
                `
                INSERT INTO tb_machine_rfid_history
                  (id_machine, RFID_machine, created_by, updated_by)
                VALUES (?, ?, ?, ?)
                `,
                [machineId, rfidTrimmed, userId, userId]
              );
            }
            successCount++;
          } else {
            errorCount++;
            errors.push(
              `Dòng ${index + 1}: Không tìm thấy Serial "${
                update.serial
              }" để cập nhật.`
            );
          }
        } catch (err) {
          errorCount++;
          errors.push(
            `Dòng ${index + 1} (${update.serial}): Lỗi DB - ${err.message}`
          );
        }
      });

      // Chờ tất cả các promise hoàn thành
      await Promise.all(updatePromises);

      // Nếu có bất kỳ lỗi nào, rollback
      if (errorCount > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Đã xảy ra lỗi, không có máy nào được cập nhật.",
          data: { successCount, errorCount, errors },
        });
      }

      // Nếu không có lỗi, commit transaction
      await connection.commit();
      res.json({
        success: true,
        message: `Đã cập nhật thành công ${successCount} máy.`,
        data: { successCount, errorCount, errors },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error batch updating RFID:", error);
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

// POST /api/machines/by-rfid-list - Get multiple machines by a list of RFIDs
app.post("/api/machines/by-rfid-list", authenticateToken, async (req, res) => {
  try {
    const { rfid_list, ticket_type, filter_by_phongban_id } = req.body;

    if (!rfid_list || !Array.isArray(rfid_list) || rfid_list.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách mã là bắt buộc.",
      });
    }

    // 1. Lọc ra các mã duy nhất và hợp lệ (Input Codes)
    const uniqueCodes = [
      ...new Set(rfid_list.filter((code) => code && code.trim() !== "")),
    ];

    if (uniqueCodes.length === 0) {
      return res.json({
        success: true,
        data: {
          foundMachines: [],
          notFoundRfids: [],
        },
      });
    }

    // 2. Xây dựng điều kiện truy vấn: Tìm trong cả RFID HOẶC NFC
    // Lưu ý: Chúng ta truyền uniqueCodes vào 2 lần cho 2 dấu ?
    let whereConditions = [`(m.RFID_machine IN (?) OR m.NFC_machine IN (?))`];
    let queryParams = [uniqueCodes, uniqueCodes];

    let joins = [
      `LEFT JOIN tb_category c ON c.id_category = m.id_category`,
      `LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine`,
      `LEFT JOIN tb_location tl ON tl.id_location = ml.id_location`,
    ];

    // 3. Áp dụng bộ lọc trạng thái máy dựa trên loại phiếu
    const filterConditions = getMachineFilterConditions(ticket_type);
    if (filterConditions.where) {
      whereConditions.push(filterConditions.where);
    }

    // 4. Áp dụng bộ lọc theo phòng ban (nếu có)
    if (filter_by_phongban_id) {
      joins.push(
        `LEFT JOIN tb_department td ON td.id_department = tl.id_department`
      );
      whereConditions.push(`td.id_phong_ban = ?`);
      queryParams.push(filter_by_phongban_id);
    }

    const joinClause = joins.join(" \n ");
    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // 5. Truy vấn máy móc
    const dataQuery = `
      SELECT 
        m.uuid_machine,
        m.code_machine,
        m.type_machine,
        m.attribute_machine,
        m.model_machine,
        m.serial_machine,
        m.RFID_machine,
        m.NFC_machine,
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
    `;

    const [machines] = await tpmConnection.query(dataQuery, queryParams);

    // 6. Xác định các Mã không tìm thấy
    // Logic: Duyệt qua các máy tìm thấy, xem mã nào trong danh sách Input khớp với RFID hoặc NFC của máy đó
    const inputSet = new Set(uniqueCodes);
    const foundCodes = new Set();

    machines.forEach((m) => {
      // Nếu RFID của máy nằm trong danh sách input -> Đánh dấu đã tìm thấy
      if (m.RFID_machine && inputSet.has(m.RFID_machine)) {
        foundCodes.add(m.RFID_machine);
      }
      // Nếu NFC của máy nằm trong danh sách input -> Đánh dấu đã tìm thấy
      if (m.NFC_machine && inputSet.has(m.NFC_machine)) {
        foundCodes.add(m.NFC_machine);
      }
    });

    const notFoundCodes = uniqueCodes.filter((code) => !foundCodes.has(code));

    res.json({
      success: true,
      message: "Machine details retrieved successfully",
      data: {
        foundMachines: machines,
        notFoundRfids: notFoundCodes,
        filterMessage: filterConditions.message,
      },
    });
  } catch (error) {
    console.error("Error fetching machines by Code list:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

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
      where = `(m.current_status IN ('available', 'in_use', 'broken', 'pending_liquidation') AND m.is_borrowed_or_rented_or_borrowed_out IS NULL)`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng', 'Đang sử dụng', 'Máy hư', 'Chờ thanh lý' (không mượn/thuê).";
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
        m.current_status IN ('available', 'in_use', 'broken', 'pending_liquidation') AND 
        (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out IN ('borrowed', 'rented'))
      )`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng', 'Đang sử dụng', 'Máy hư', 'Chờ thanh lý' (bao gồm cả máy đang mượn/thuê).";
      break;

    // l. kiểm kê (chỉ hiện trường hợp 1,2,5)
    case "inventory":
      where = `m.current_status IN ('available', 'in_use', 'broken', 'pending_liquidation')`;
      message =
        "Chỉ nhận những máy có trạng thái 'Sẵn sàng', 'Đang sử dụng', 'Máy hư', 'Chờ thanh lý'.";
      break;

    // Mặc định (nếu ticket_type không xác định, ví dụ: scanner mở trước khi chọn loại phiếu)
    default:
      where = "";
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
      NFC_machine,
      type_machine,
      model_machine,
      manufacturer,
      price,
      date_of_use,
      lifespan,
      repair_cost,
      note,
      current_status,
      name_category,
      attribute_machine,
      supplier,
      power,
      pressure,
      voltage,
    } = req.body;

    // Validate required fields
    if (!code_machine || !type_machine || !serial_machine || !name_category) {
      return res.status(400).json({
        success: false,
        message: "Mã máy, Loại máy, Serial máy và Phân loại là bắt buộc",
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

    let id_category = null;
    if (name_category) {
      const [cat] = await tpmConnection.query(
        "SELECT id_category FROM tb_category WHERE name_category = ? LIMIT 1",
        [name_category]
      );
      if (cat.length > 0) {
        id_category = cat[0].id_category;
      } else {
        // Nếu vì lý do nào đó không tìm thấy, trả lỗi
        return res.status(404).json({
          success: false,
          message: `Phân loại '${name_category}' không tồn tại.`,
        });
      }
    }

    // Get user ID from token
    const userId = req.user.id;

    // Insert new machine
    const [result] = await tpmConnection.query(
      `
      INSERT INTO tb_machine 
        (code_machine, serial_machine, RFID_machine, NFC_machine, type_machine, model_machine, manufacturer, 
         price, date_of_use, lifespan, repair_cost, note, current_status, id_category,
         attribute_machine, supplier, power, pressure, voltage,
         created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        code_machine,
        serial_machine,
        RFID_machine || null,
        NFC_machine || null,
        type_machine || null,
        model_machine || null,
        manufacturer || null,
        price || null,
        formattedDate || null,
        lifespan || null,
        repair_cost || null,
        note || null,
        current_status || "available",
        id_category,
        attribute_machine || null,
        supplier || null,
        power || null,
        pressure || null,
        voltage || null,
        userId, // created_by
        userId, // updated_by
      ]
    );

    // Lưu lịch sử RFID nếu có gán RFID lúc tạo
    const rfidToSave =
      RFID_machine && String(RFID_machine).trim() !== ""
        ? String(RFID_machine).trim()
        : null;
    if (rfidToSave) {
      await tpmConnection.query(
        `
        INSERT INTO tb_machine_rfid_history
          (id_machine, RFID_machine, created_by, updated_by)
        VALUES (?, ?, ?, ?)
        `,
        [result.insertId, rfidToSave, userId, userId]
      );
    }

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
        m.attribute_machine,
        m.supplier,
        m.power,
        m.pressure,
        m.voltage,
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
      NFC_machine,
      type_machine,
      model_machine,
      manufacturer,
      price,
      date_of_use,
      lifespan,
      repair_cost,
      note,
      current_status,
      is_borrowed_or_rented_or_borrowed_out_return_date,
      attribute_machine,
      supplier,
      power,
      pressure,
      voltage,
    } = req.body;

    // Check if machine exists + lấy id_machine & RFID hiện tại để ghi lịch sử khi đổi RFID
    const [existing] = await tpmConnection.query(
      "SELECT id_machine, uuid_machine, RFID_machine FROM tb_machine WHERE uuid_machine = ? LIMIT 1",
      [uuid]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    const machineId = existing[0].id_machine;
    const currentRfid = existing[0].RFID_machine
      ? String(existing[0].RFID_machine).trim()
      : null;

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
        NFC_machine = ?,
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
        attribute_machine = ?,
        supplier = ?,
        power = ?,
        pressure = ?,
        voltage = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE uuid_machine = ?
      `,
      [
        code_machine,
        serial_machine,
        RFID_machine,
        NFC_machine,
        type_machine,
        model_machine,
        manufacturer,
        price,
        formattedDate,
        lifespan,
        repair_cost,
        note,
        current_status,
        is_borrowed_or_rented_or_borrowed_out_return_date,
        attribute_machine,
        supplier,
        power,
        pressure,
        voltage,
        userId, // updated_by
        uuid,
      ]
    );

    // Lưu lịch sử RFID nếu có đổi RFID
    const newRfid =
      RFID_machine && String(RFID_machine).trim() !== ""
        ? String(RFID_machine).trim()
        : null;
    if (newRfid && newRfid !== currentRfid) {
      await tpmConnection.query(
        `
        INSERT INTO tb_machine_rfid_history
          (id_machine, RFID_machine, created_by, updated_by)
        VALUES (?, ?, ?, ?)
        `,
        [machineId, newRfid, userId, userId]
      );
    }

    // Get updated machine
    const [updated] = await tpmConnection.query(
      `
      SELECT 
        m.uuid_machine,
        m.serial_machine,
        m.RFID_machine,
        m.NFC_machine,
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
        m.attribute_machine,
        m.supplier,
        m.power,
        m.pressure,
        m.voltage,
        m.created_at,
        m.updated_at,
        c.name_category,
        tl.name_location,

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
    const { machines } = req.body;
    const userId = req.user.id;

    if (!machines || !Array.isArray(machines) || machines.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No machine data provided" });
    }

    await connection.beginTransaction();

    const errors = [];
    const successes = [];
    const machinesToInsert = [];

    // --- BƯỚC 0: TIỀN XỬ LÝ DỮ LIỆU (GÁN DEFAULT CATEGORY) ---
    // Duyệt qua tất cả các máy, nếu thiếu phân loại thì gán mặc định
    machines.forEach((m) => {
      if (!m.name_category || m.name_category.toString().trim() === "") {
        m.name_category = "Máy móc thiết bị";
      }
    });

    // --- BƯỚC 1: KIỂM TRA TRÙNG LẶP SERIAL TRONG NỘI BỘ FILE EXCEL ---
    const serialSeenMap = new Map();
    const duplicateIndices = new Set();

    for (let i = 0; i < machines.length; i++) {
      const line = i + 2;
      const serial = machines[i].serial_machine
        ? String(machines[i].serial_machine).trim()
        : null;

      if (serial) {
        if (serialSeenMap.has(serial)) {
          duplicateIndices.add(i);
          errors.push({
            line,
            serial: serial,
            message: `Serial trùng lặp với dòng ${serialSeenMap.get(
              serial
            )} trong cùng file Excel`,
          });
        } else {
          serialSeenMap.set(serial, line);
        }
      }
    }

    // --- BƯỚC 2: KIỂM TRA TRÙNG LẶP SERIAL VỚI DATABASE ---
    const allUniqueSerials = Array.from(serialSeenMap.keys());
    const existingSerialsSet = new Set();
    if (allUniqueSerials.length > 0) {
      const [rows] = await connection.query(
        "SELECT serial_machine FROM tb_machine WHERE serial_machine IN (?)",
        [allUniqueSerials]
      );
      rows.forEach((r) => existingSerialsSet.add(r.serial_machine));
    }

    // --- BƯỚC 3: CHUẨN BỊ DỮ LIỆU (LOOKUP CATEGORY & SEQUENCE) ---

    // 3.1 Lookup Category (Lúc này tất cả máy đều đã có name_category rồi)
    const categoryNamesInFile = [
      ...new Set(machines.map((m) => m.name_category).filter(Boolean)),
    ];

    let categoryMap = new Map();
    if (categoryNamesInFile.length > 0) {
      const [categories] = await connection.query(
        "SELECT id_category, name_category FROM tb_category WHERE name_category IN (?)",
        [categoryNamesInFile]
      );
      categoryMap = new Map(
        categories.map((c) => [c.name_category, c.id_category])
      );
    }

    const sequenceCache = new Map();

    // --- BƯỚC 4: XỬ LÝ TỪNG DÒNG ---
    for (let i = 0; i < machines.length; i++) {
      if (duplicateIndices.has(i)) continue;

      const machine = machines[i];
      const line = i + 2;
      const serial = machine.serial_machine
        ? String(machine.serial_machine).trim()
        : "";

      // A. Validate dữ liệu cơ bản (Đã bỏ check name_category vì đã gán default)
      if (!serial || !machine.type_machine) {
        errors.push({
          line,
          code: machine.code_machine,
          serial: serial,
          message: "Thiếu thông tin bắt buộc (Serial, Loại máy)",
        });
        continue;
      }

      // B. Check trùng DB
      if (existingSerialsSet.has(serial)) {
        errors.push({
          line,
          code: machine.code_machine,
          serial: serial,
          message: `Serial "${serial}" đã tồn tại trên hệ thống`,
        });
        continue;
      }

      // C. Check Category (Tìm ID từ Tên)
      const id_category = categoryMap.get(machine.name_category);
      if (!id_category) {
        // Trường hợp hãn hữu: DB chưa có loại "Máy móc thiết bị"
        errors.push({
          line,
          code: machine.code_machine,
          serial: serial,
          message: `Phân loại "${machine.name_category}" không tồn tại trong hệ thống. Vui lòng tạo trước.`,
        });
        continue;
      }
      machine.id_category_looked_up = id_category;

      // D. XỬ LÝ SINH MÃ MÁY TỰ ĐỘNG
      if (
        !machine.code_machine ||
        machine.code_machine.toString().trim() === ""
      ) {
        if (!machine.manufacturer) {
          errors.push({
            line,
            serial: serial,
            message:
              "Không có Mã máy và cũng không có Hãng SX để tạo mã tự động",
          });
          continue;
        }

        const prefix = machine.manufacturer
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");

        let nextSeq = 1;
        // 1. Lấy số thứ tự tiếp theo
        if (sequenceCache.has(prefix)) {
          nextSeq = sequenceCache.get(prefix); // Lấy trực tiếp số tiếp theo từ cache
        } else {
          // Query DB tìm max
          const [rows] = await connection.query(
            `SELECT code_machine FROM tb_machine WHERE code_machine LIKE CONCAT(?, '%')`,
            [prefix]
          );

          let maxSeqInDb = 0;
          rows.forEach((row) => {
            const code = row.code_machine;
            if (code.startsWith(prefix)) {
              const numberPart = code.slice(prefix.length);
              if (/^\d+$/.test(numberPart)) {
                const num = parseInt(numberPart, 10);
                if (num > maxSeqInDb) {
                  maxSeqInDb = num;
                }
              }
            }
          });
          nextSeq = maxSeqInDb + 1;
        }

        // 2. Format mã: CỐ ĐỊNH 5 SỐ
        const seqString = String(nextSeq).padStart(5, "0");
        machine.code_machine = `${prefix}${seqString}`;

        // 3. Cập nhật cache: Chỉ cần lưu số tiếp theo (đã +1) cho vòng lặp sau
        sequenceCache.set(prefix, nextSeq + 1);
      } else {
        const providedCode = machine.code_machine.toString().trim();
        machine.code_machine = providedCode;

        if (machine.manufacturer) {
          const prefix = machine.manufacturer
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
          if (providedCode.startsWith(prefix)) {
            const numberPart = providedCode.replace(prefix, "");
            if (/^\d+$/.test(numberPart)) {
              const manualSeq = parseInt(numberPart, 10);

              // Lấy giá trị cache hiện tại (nếu có)
              let currentNextSeq = 1;
              if (sequenceCache.has(prefix)) {
                currentNextSeq = sequenceCache.get(prefix);
              }

              // Nếu mã tay nhập (manualSeq) >= số dự kiến tiếp theo
              // Thì cập nhật số tiếp theo phải là manualSeq + 1
              if (manualSeq >= currentNextSeq) {
                sequenceCache.set(prefix, manualSeq + 1);
              }
            }
          }
        }

        const [codeExist] = await connection.query(
          "SELECT id_machine FROM tb_machine WHERE code_machine = ?",
          [providedCode]
        );
        if (codeExist.length > 0) {
          errors.push({
            line,
            serial: serial,
            code: providedCode,
            message: `Mã máy "${providedCode}" đã tồn tại trên hệ thống`,
          });
          continue;
        }
      }

      // E. Xử lý Date
      let formattedDate = null;
      if (machine.date_of_use) {
        if (typeof machine.date_of_use === "number") {
          const jsDate = new Date(
            Math.round((machine.date_of_use - 25569) * 86400 * 1000)
          );
          formattedDate = jsDate.toISOString().split("T")[0];
        } else {
          const dateObj = new Date(machine.date_of_use);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const day = String(dateObj.getDate()).padStart(2, "0");
            formattedDate = `${year}-${month}-${day}`;
          }
        }
      }
      machine.formattedDate = formattedDate;

      machinesToInsert.push(machine);
    }

    // --- BƯỚC 5: INSERT VÀO DATABASE ---
    for (const m of machinesToInsert) {
      const [insertResult] = await connection.query(
        `INSERT INTO tb_machine 
          (code_machine, serial_machine, RFID_machine, NFC_machine, type_machine, model_machine, manufacturer, 
           price, date_of_use, lifespan, repair_cost, note, current_status, id_category,
           attribute_machine, supplier, power, pressure, voltage,
           created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.code_machine,
          m.serial_machine,
          m.RFID_machine || null,
          m.NFC_machine || null,
          m.type_machine || null,
          m.model_machine || null,
          m.manufacturer || null,
          m.price || null,
          m.formattedDate || null,
          m.lifespan || null,
          m.repair_cost || null,
          m.note || null,
          "available",
          m.id_category_looked_up,
          m.attribute_machine || null,
          m.supplier || null,
          m.power || null,
          m.pressure || null,
          m.voltage || null,
          userId,
          userId,
        ]
      );

      // Lưu lịch sử RFID nếu file excel có RFID_machine
      const rfidToSave =
        m.RFID_machine && String(m.RFID_machine).trim() !== ""
          ? String(m.RFID_machine).trim()
          : null;
      if (rfidToSave) {
        await connection.query(
          `
          INSERT INTO tb_machine_rfid_history
            (id_machine, RFID_machine, created_by, updated_by)
          VALUES (?, ?, ?, ?)
          `,
          [insertResult.insertId, rfidToSave, userId, userId]
        );
      }

      successes.push({
        code: m.code_machine,
        serial: m.serial_machine,
        type: m.type_machine,
        attribute: m.attribute_machine,
        model: m.model_machine,
      });
    }

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

// POST /api/machines/resolve-target - Xác định mục tiêu cần tìm
app.post(
  "/api/machines/resolve-target",
  authenticateToken,
  async (req, res) => {
    try {
      const { keyword, keywords } = req.body; // Hỗ trợ cả keyword đơn và keywords mảng

      // Xử lý cả hai trường hợp: keyword đơn hoặc keywords mảng
      let keywordList = [];
      if (keywords && Array.isArray(keywords)) {
        keywordList = keywords;
      } else if (keyword) {
        keywordList = [keyword];
      } else {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập thông tin tìm kiếm.",
        });
      }

      // Làm sạch và loại bỏ trùng lặp
      const cleanKeywords = [
        ...new Set(keywordList.map((k) => k.trim()).filter((k) => k)),
      ];

      if (cleanKeywords.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập ít nhất một thông tin tìm kiếm hợp lệ.",
        });
      }

      // Tìm tất cả máy khớp với danh sách keywords
      const targets = [];
      const errors = [];

      for (const cleanKey of cleanKeywords) {
        try {
          const [machines] = await tpmConnection.query(
            `SELECT * FROM tb_machine 
           WHERE serial_machine = ? 
           OR code_machine = ? 
           OR NFC_machine = ? 
           OR RFID_machine = ? 
           LIMIT 1`,
            [cleanKey, cleanKey, cleanKey, cleanKey]
          );

          if (machines.length === 0) {
            errors.push({
              keyword: cleanKey,
              message: `Không tìm thấy máy nào khớp với "${cleanKey}".`,
            });
            continue;
          }

          const machine = machines[0];

          // Kiểm tra xem máy có RFID để dò không
          if (!machine.RFID_machine || machine.RFID_machine.trim() === "") {
            errors.push({
              keyword: cleanKey,
              message: `Máy "${machine.type_machine} ${machine.attribute_machine} - ${machine.model_machine}" (Serial: ${machine.serial_machine}) chưa được gán thẻ RFID.`,
            });
            continue;
          }

          targets.push({
            targetRfid: machine.RFID_machine,
            info: {
              name: `${machine.type_machine} ${machine.attribute_machine} - ${machine.model_machine}`,
              serial: machine.serial_machine,
              code: machine.code_machine,
              status: machine.current_status,
            },
          });
        } catch (err) {
          errors.push({
            keyword: cleanKey,
            message: `Lỗi khi xử lý "${cleanKey}": ${err.message}`,
          });
        }
      }

      // Nếu không có target nào hợp lệ
      if (targets.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Không có máy nào hợp lệ để dò tìm.",
          errors: errors,
        });
      }

      // Trả về kết quả (có thể có một số lỗi nhưng vẫn có targets hợp lệ)
      res.json({
        success: true,
        data: targets.length === 1 ? targets[0] : targets, // Giữ backward compatibility
        targets: targets, // Luôn trả về mảng
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Error resolving target:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// MARK: DEPARTMENTS

// GET /api/departments - Get all departments
app.get("/api/departments", authenticateToken, async (req, res) => {
  try {
    const [departments] = await tpmConnection.query(
      `
      SELECT 
        td.uuid_department, 
        td.name_department,
        COUNT(CASE 
          WHEN m.id_machine IS NOT NULL 
               AND m.current_status != 'liquidation'
               AND (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out NOT IN ('borrowed_return', 'rented_return'))
          THEN 1 
          ELSE NULL 
        END) AS machine_count
      FROM tb_department td
      LEFT JOIN tb_location tl ON tl.id_department = td.id_department
      LEFT JOIN tb_machine_location ml ON ml.id_location = tl.id_location
      LEFT JOIN tb_machine m ON m.id_machine = ml.id_machine
      GROUP BY td.id_department, td.name_department, td.uuid_department
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
        td.uuid_department,
        COUNT(CASE 
          WHEN m.id_machine IS NOT NULL 
               AND m.current_status != 'liquidation'
               AND (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out NOT IN ('borrowed_return', 'rented_return'))
          THEN 1 
          ELSE NULL 
        END) AS machine_count
      FROM tb_location tl
      LEFT JOIN tb_department td ON td.id_department = tl.id_department
      LEFT JOIN tb_machine_location ml ON ml.id_location = tl.id_location
      LEFT JOIN tb_machine m ON m.id_machine = ml.id_machine
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

    query += ` GROUP BY tl.id_location, tl.name_location, td.name_department, td.uuid_department`;

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
app.post(
  "/api/imports",
  authenticateToken,
  upload.array("attachments"),
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();

      const {
        to_location_uuid,
        import_type,
        import_date,
        note,
        is_borrowed_or_rented_or_borrowed_out_name,
        is_borrowed_or_rented_or_borrowed_out_date,
        is_borrowed_or_rented_or_borrowed_out_return_date,
      } = req.body;
      const machines = JSON.parse(req.body.machines || "[]");

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

      let attachedFileString = null;
      if (req.files && req.files.length > 0) {
        // 1. Tạo một mảng các "promise" upload
        const uploadPromises = req.files.map((file) => uploadFileToDrive(file));

        // 2. Chờ tất cả upload hoàn thành song song
        const fileInfos = await Promise.all(uploadPromises);

        // 3. Lọc kết quả và tạo chuỗi
        const attachedFilePairs = fileInfos
          .filter((fileInfo) => fileInfo && fileInfo.link) // Lọc ra các file upload lỗi (null)
          .map((fileInfo) => `${fileInfo.name}|${fileInfo.link}`); // Định dạng: TenFile.pdf|LinkCuaFile

        attachedFileString = attachedFilePairs.join("; ");
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
         is_borrowed_or_rented_or_borrowed_out_return_date,
         attached_file) 
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
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
          attachedFileString || null,
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
                  is_borrowed_or_rented_or_borrowed_out ===
                    "borrowed_return") ||
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
        m.type_machine,
        m.model_machine,
        m.serial_machine
      FROM tb_machine_import_detail d
      LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
      WHERE d.id_machine_import = ?
      `,
        [importId]
      );

      res
        .status(201)
        .json({ success: true, message: "Tạo phiếu nhập thành công" });
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
  }
);

// GET /api/imports - Get all import slips with pagination
app.get("/api/imports", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const import_type = req.query.import_type || "";
    const date_from = req.query.date_from || "";
    const date_to = req.query.date_to || "";
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

    if (date_from) {
      whereConditions.push(`DATE(i.import_date) >= ?`);
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push(`DATE(i.import_date) <= ?`);
      params.push(date_to);
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
        i.approval_flow,
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

    const enrichedImports = await Promise.all(
      imports.map(async (item) => {
        if (item.approval_flow) {
          item.approval_flow = await enrichApprovalFlowWithNames(
            item.approval_flow
          );
        }
        return item;
      })
    );

    res.json({
      success: true,
      message: "Imports retrieved successfully",
      data: enrichedImports,
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

// GET /api/imports/stats - Get import ticket statistics
app.get("/api/imports/stats", authenticateToken, async (req, res) => {
  try {
    // Get counts by status
    const [statusStats] = await tpmConnection.query(
      `
      SELECT 
        status,
        COUNT(*) as count
      FROM tb_machine_import
      GROUP BY status
      `
    );

    // Get counts by import_type
    const [typeStats] = await tpmConnection.query(
      `
      SELECT 
        import_type,
        COUNT(*) as count
      FROM tb_machine_import
      GROUP BY import_type
      `
    );

    // Transform to object format
    const stats = {
      byStatus: {
        pending: 0,
        completed: 0,
        cancelled: 0,
      },
      byType: {
        purchased: 0,
        maintenance_return: 0,
        rented: 0,
        borrowed: 0,
        borrowed_out_return: 0,
      },
    };

    statusStats.forEach((row) => {
      if (row.status === "pending" || row.status === "pending_approval") {
        stats.byStatus.pending += row.count;
      } else if (row.status === "completed") {
        stats.byStatus.completed += row.count;
      } else if (row.status === "cancelled") {
        stats.byStatus.cancelled += row.count;
      }
    });

    typeStats.forEach((row) => {
      if (row.import_type === "purchased") {
        stats.byType.purchased = row.count;
      } else if (row.import_type === "maintenance_return") {
        stats.byType.maintenance_return = row.count;
      } else if (row.import_type === "rented") {
        stats.byType.rented = row.count;
      } else if (row.import_type === "borrowed") {
        stats.byType.borrowed = row.count;
      } else if (row.import_type === "borrowed_out_return") {
        stats.byType.borrowed_out_return = row.count;
      }
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching import stats:", error);
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
    const currentUserId = req.user.id;

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
        i.attached_file,
        i.approval_flow,
        i.expansion_field,
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
        m.attribute_machine,
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

    const ticketData = imports[0];

    if (ticketData.approval_flow) {
      ticketData.approval_flow = await enrichApprovalFlowWithNames(
        ticketData.approval_flow
      );
    }

    // Tính toán cờ is_creator
    const isCreator = ticketData.created_by === currentUserId;
    delete ticketData.created_by;

    res.json({
      success: true,
      message: "Import details retrieved successfully",
      data: {
        import: {
          ...ticketData,
          is_creator: isCreator,
        },
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
        name_location,
        status,
        import_type,
        ticketBorrowInfo,
        created_by
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
app.post(
  "/api/exports",
  authenticateToken,
  upload.array("attachments"),
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();

      const {
        to_location_uuid,
        export_type,
        export_date,
        note,
        is_borrowed_or_rented_or_borrowed_out_name,
        is_borrowed_or_rented_or_borrowed_out_date,
        is_borrowed_or_rented_or_borrowed_out_return_date,
      } = req.body;
      const machines = JSON.parse(req.body.machines || "[]");

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

      let attachedFileString = null;
      if (req.files && req.files.length > 0) {
        // 1. Tạo một mảng các "promise" upload
        const uploadPromises = req.files.map((file) => uploadFileToDrive(file));

        // 2. Chờ tất cả upload hoàn thành song song
        const fileInfos = await Promise.all(uploadPromises);

        // 3. Lọc kết quả và tạo chuỗi
        const attachedFilePairs = fileInfos
          .filter((fileInfo) => fileInfo && fileInfo.link) // Lọc ra các file upload lỗi (null)
          .map((fileInfo) => `${fileInfo.name}|${fileInfo.link}`); // Định dạng: TenFile.pdf|LinkCuaFile

        attachedFileString = attachedFilePairs.join("; ");
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
           is_borrowed_or_rented_or_borrowed_out_return_date,
           attached_file)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
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
          attachedFileString || null,
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
        m.type_machine,
        m.model_machine,
        m.serial_machine
      FROM tb_machine_export_detail d
      LEFT JOIN tb_machine m ON m.id_machine = d.id_machine
      WHERE d.id_machine_export = ?
      `,
        [exportId]
      );

      res
        .status(201)
        .json({ success: true, message: "Tạo phiếu xuất thành công" });
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
  }
);

// GET /api/exports - Get all export slips with pagination
app.get("/api/exports", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const export_type = req.query.export_type || "";
    const date_from = req.query.date_from || "";
    const date_to = req.query.date_to || "";
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

    if (date_from) {
      whereConditions.push(`DATE(e.export_date) >= ?`);
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push(`DATE(e.export_date) <= ?`);
      params.push(date_to);
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
        e.approval_flow,
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

    const enrichedExports = await Promise.all(
      exports.map(async (item) => {
        if (item.approval_flow) {
          item.approval_flow = await enrichApprovalFlowWithNames(
            item.approval_flow
          );
        }
        return item;
      })
    );

    res.json({
      success: true,
      message: "Exports retrieved successfully",
      data: enrichedExports,
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

// GET /api/exports/stats - Get export ticket statistics
app.get("/api/exports/stats", authenticateToken, async (req, res) => {
  try {
    // Get counts by status
    const [statusStats] = await tpmConnection.query(
      `
      SELECT 
        status,
        COUNT(*) as count
      FROM tb_machine_export
      GROUP BY status
      `
    );

    // Get counts by export_type
    const [typeStats] = await tpmConnection.query(
      `
      SELECT 
        export_type,
        COUNT(*) as count
      FROM tb_machine_export
      GROUP BY export_type
      `
    );

    // Transform to object format
    const stats = {
      byStatus: {
        pending: 0,
        completed: 0,
        cancelled: 0,
      },
      byType: {
        liquidation: 0,
        maintenance: 0,
        borrowed_out: 0,
        rented_return: 0,
        borrowed_return: 0,
      },
    };

    statusStats.forEach((row) => {
      if (row.status === "pending" || row.status === "pending_approval") {
        stats.byStatus.pending += row.count;
      } else if (row.status === "completed") {
        stats.byStatus.completed += row.count;
      } else if (row.status === "cancelled") {
        stats.byStatus.cancelled += row.count;
      }
    });

    typeStats.forEach((row) => {
      if (row.export_type === "liquidation") {
        stats.byType.liquidation = row.count;
      } else if (row.export_type === "maintenance") {
        stats.byType.maintenance = row.count;
      } else if (row.export_type === "borrowed_out") {
        stats.byType.borrowed_out = row.count;
      } else if (row.export_type === "rented_return") {
        stats.byType.rented_return = row.count;
      } else if (row.export_type === "borrowed_return") {
        stats.byType.borrowed_return = row.count;
      }
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching export stats:", error);
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
    const currentUserId = req.user.id;

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
        e.attached_file,
        e.approval_flow,
        e.expansion_field,
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
        m.attribute_machine,
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

    const ticketData = exports[0];

    if (ticketData.approval_flow) {
      ticketData.approval_flow = await enrichApprovalFlowWithNames(
        ticketData.approval_flow
      );
    }

    // Tính toán cờ is_creator
    const isCreator = ticketData.created_by === currentUserId;
    delete ticketData.created_by;

    res.json({
      success: true,
      message: "Export details retrieved successfully",
      data: {
        export: {
          ...ticketData,
          is_creator: isCreator,
        },
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
        name_location,
        status,
        export_type,
        ticketBorrowInfo,
        created_by
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
  creatorId // id người tạo phiếu -> tb_machine_location, tb_machine_location_history, tb_machine.updated_by
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

    // b. Insert into tb_machine_location_history (created_by, updated_by = người tạo phiếu)
    if (idFromLocation !== toLocationId) {
      // Only insert if location changes
      await connection.query(
        `
        INSERT INTO tb_machine_location_history
          (id_machine, id_from_location, id_to_location, move_date, created_by, updated_by)
        VALUES (?, ?, ?, CURDATE(), ?, ?)
        `,
        [idMachine, idFromLocation, toLocationId, creatorId, creatorId]
      );
    }

    // c. Update/Insert into tb_machine_location (created_by, updated_by = người tạo phiếu)
    if (currentLocResult.length === 0) {
      // Insert
      await connection.query(
        `
        INSERT INTO tb_machine_location
          (id_machine, id_location, created_by, updated_by)
        VALUES (?, ?, ?, ?)
        `,
        [idMachine, toLocationId, creatorId, creatorId]
      );
    } else if (idFromLocation !== toLocationId) {
      // Update
      await connection.query(
        `
        UPDATE tb_machine_location
        SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [toLocationId, creatorId, idMachine]
      );
    } else {
      // No change, just touch updated_at
      await connection.query(
        `
        UPDATE tb_machine_location
        SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [creatorId, idMachine]
      );
    }

    // d. Update tb_machine status (updated_by = người tạo phiếu)
    let updateQuery = `
      UPDATE tb_machine
      SET current_status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP`;
    let updateParams = [newMachineStatus, creatorId];

    if (
      ticketTypeDetail === "borrowed_return" ||
      ticketTypeDetail === "rented_return"
    ) {
      updateQuery += `, is_borrowed_or_rented_or_borrowed_out = ?, RFID_machine = NULL`;
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
    const to_location_uuid = req.query.to_location_uuid || "";
    const date_from = req.query.date_from || "";
    const date_to = req.query.date_to || "";
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push(`t.status = ?`);
      params.push(status);
    }

    if (to_location_uuid) {
      whereConditions.push(`loc_to.uuid_location = ?`);
      params.push(to_location_uuid);
    }

    if (date_from) {
      whereConditions.push(`DATE(t.transfer_date) >= ?`);
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push(`DATE(t.transfer_date) <= ?`);
      params.push(date_to);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const [countResult] = await tpmConnection.query(
      `SELECT COUNT(DISTINCT t.id_machine_internal_transfer) as total 
       FROM tb_machine_internal_transfer t
       LEFT JOIN tb_location loc_to ON loc_to.id_location = t.to_location_id
       ${whereClause}`,
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
          t.approval_flow,
          loc_to.name_location as to_location_name,
          td.uuid_department AS to_location_department_uuid,
          COUNT(d.id_machine) as machine_count
        FROM tb_machine_internal_transfer t
        LEFT JOIN tb_location loc_to ON loc_to.id_location = t.to_location_id
        LEFT JOIN tb_department td ON td.id_department = loc_to.id_department
        LEFT JOIN tb_machine_internal_transfer_detail d ON d.id_machine_internal_transfer = t.id_machine_internal_transfer
        ${whereClause}
        GROUP BY t.id_machine_internal_transfer, td.uuid_department
        ORDER BY t.transfer_date DESC, t.created_at DESC
        LIMIT ? OFFSET ?
        `,
      [...params, limit, offset]
    );

    const userPhongBanId = req.user.phongban_id;
    const userId = req.user.id;

    // 1. Lấy danh sách UUID phòng ban đích
    const deptUuids = [
      ...new Set(
        transfers.map((t) => t.to_location_department_uuid).filter(Boolean)
      ),
    ];

    // 2. Tra cứu ID phòng ban từ UUID
    let deptMap = new Map();
    if (deptUuids.length > 0) {
      const [deptInfo] = await tpmConnection.query(
        "SELECT uuid_department, id_phong_ban FROM tb_department WHERE uuid_department IN (?)",
        [deptUuids]
      );
      deptMap = new Map(
        deptInfo.map((d) => [d.uuid_department, d.id_phong_ban])
      );
    }

    const finalData = await Promise.all(
      transfers.map(async (t) => {
        const toLocationPhongBanId = deptMap.get(t.to_location_department_uuid);

        // Logic xác định quyền confirm:
        // 1. Phiếu phải ở trạng thái 'pending_confirmation'
        // 2. User phải thuộc phòng ban đích (toLocationPhongBanId)
        // 3. User KHÔNG phải là người tạo phiếu (tùy chọn, nhưng thường là vậy để đảm bảo quy trình 2 người)
        let canConfirm = false;
        if (
          t.status === "pending_confirmation" &&
          userPhongBanId === toLocationPhongBanId &&
          userId !== t.created_by
        ) {
          canConfirm = true;
        }

        let enrichedFlow = t.approval_flow;
        if (enrichedFlow) {
          enrichedFlow = await enrichApprovalFlowWithNames(enrichedFlow);
        }

        return {
          uuid_machine_internal_transfer: t.uuid_machine_internal_transfer,
          transfer_date: t.transfer_date,
          status: t.status,
          note: t.note,
          created_at: t.created_at,
          updated_at: t.updated_at,
          to_location_name: t.to_location_name,
          machine_count: t.machine_count,
          can_confirm: canConfirm,
          approval_flow: enrichedFlow,
        };
      })
    );

    res.json({
      success: true,
      message: "Transfers retrieved successfully",
      data: finalData,
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

// GET /api/internal-transfers/stats - Get transfer ticket statistics
app.get(
  "/api/internal-transfers/stats",
  authenticateToken,
  async (req, res) => {
    try {
      // Get counts by status
      const [statusStats] = await tpmConnection.query(
        `
      SELECT 
        status,
        COUNT(*) as count
      FROM tb_machine_internal_transfer
      GROUP BY status
      `
      );

      // Transform to object format
      const stats = {
        pending_confirmation: 0,
        pending_approval: 0,
        completed: 0,
        cancelled: 0,
      };

      statusStats.forEach((row) => {
        if (row.status === "pending_confirmation") {
          stats.pending_confirmation = row.count;
        } else if (row.status === "pending_approval") {
          stats.pending_approval = row.count;
        } else if (row.status === "completed") {
          stats.completed = row.count;
        } else if (row.status === "cancelled") {
          stats.cancelled = row.count;
        }
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching transfer stats:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// GET /api/internal-transfers/:uuid - Get single internal transfer details
app.get(
  "/api/internal-transfers/:uuid",
  authenticateToken,
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const userId = req.user.id;

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
          t.attached_file,
          t.approval_flow,
          t.expansion_field,
          t.created_at,
          t.updated_at,
          t.created_by,
          t.confirmed_at,
          t.target_status,
          loc_to.uuid_location as to_location_uuid,
          loc_to.name_location as to_location_name,
          td.uuid_department AS to_location_department_uuid,
          
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
          END AS creator_ma_nv,

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
          END AS creator_ten_nv
          
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
          m.attribute_machine,
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

      let transferInfo = transferData[0];

      if (transferInfo.approval_flow) {
        transferInfo.approval_flow = await enrichApprovalFlowWithNames(
          transferInfo.approval_flow
        );
      }

      let canConfirm = false;
      const isCreator = transferInfo.created_by === userId;

      if (transferInfo.to_location_department_uuid) {
        const [dept] = await tpmConnection.query(
          "SELECT id_phong_ban FROM tb_department WHERE uuid_department = ?",
          [transferInfo.to_location_department_uuid]
        );

        if (dept.length > 0) {
          const toLocationPhongBanId = dept[0].id_phong_ban;
          const userPhongBanId = req.user.phongban_id;

          if (
            transferInfo.status === "pending_confirmation" &&
            userPhongBanId === toLocationPhongBanId &&
            userId !== transferInfo.created_by
          ) {
            canConfirm = true;
          }
        }
      }
      delete transferInfo.created_by;

      res.json({
        success: true,
        message: "Transfer details retrieved successfully",
        data: {
          transfer: {
            ...transferInfo,
            can_confirm: canConfirm,
            is_creator: isCreator,
          },
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
app.post(
  "/api/internal-transfers",
  authenticateToken,
  upload.array("attachments"),
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();

      const { to_location_uuid, transfer_date, note, target_status } = req.body;
      const machines = JSON.parse(req.body.machines || "[]");
      const userPhongBanId = req.user.phongban_id; // Lấy phòng ban của User 1
      const userId = req.user.id;

      if (!to_location_uuid || !transfer_date) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Vị trí đến và ngày là bắt buộc",
        });
      }

      // SỬA: Chỉ lấy id_location và id_department (để liên kết)
      // Không Join để lấy id_phong_ban ở đây
      const [toLoc] = await connection.query(
        `SELECT id_location, id_department FROM tb_location WHERE uuid_location = ?`,
        [to_location_uuid]
      );

      if (toLoc.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy vị trí đến." });
      }
      const to_location_id = toLoc[0].id_location;
      const id_department = toLoc[0].id_department;

      // Query riêng để lấy id_phong_ban từ id_department
      let to_location_phongban_id = null;
      if (id_department) {
        const [dept] = await connection.query(
          "SELECT id_phong_ban FROM tb_department WHERE id_department = ?",
          [id_department]
        );
        if (dept.length > 0) {
          to_location_phongban_id = dept[0].id_phong_ban;
        }
      }

      let attachedFileString = null;
      if (req.files && req.files.length > 0) {
        // 1. Tạo một mảng các "promise" upload
        const uploadPromises = req.files.map((file) => uploadFileToDrive(file));

        // 2. Chờ tất cả upload hoàn thành song song
        const fileInfos = await Promise.all(uploadPromises);

        // 3. Lọc kết quả và tạo chuỗi
        const attachedFilePairs = fileInfos
          .filter((fileInfo) => fileInfo && fileInfo.link) // Lọc ra các file upload lỗi (null)
          .map((fileInfo) => `${fileInfo.name}|${fileInfo.link}`); // Định dạng: TenFile.pdf|LinkCuaFile

        attachedFileString = attachedFilePairs.join("; ");
      }

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

      const dateObj = new Date(transfer_date);
      const formattedDate = `${dateObj.getFullYear()}-${String(
        dateObj.getMonth() + 1
      ).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

      // 1. Insert phiếu với trạng thái (status) đã được quyết định
      const [transferResult] = await connection.query(
        `
        INSERT INTO tb_machine_internal_transfer
          (to_location_id, transfer_date, status, note, created_by, updated_by, attached_file, target_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          to_location_id,
          formattedDate,
          initialStatus,
          note || null,
          userId,
          userId,
          attachedFileString || null,
          target_status || null,
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
  }
);

// PUT /api/internal-transfers/:uuid/confirm - (USER 2) Confirm ticket
app.put(
  "/api/internal-transfers/:uuid/confirm",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();
      const { uuid } = req.params;
      const userId = req.user.id;
      const userPhongBanId = req.user.phongban_id;

      // 1. Lấy thông tin phiếu
      const [existing] = await connection.query(
        `
        SELECT 
          t.id_machine_internal_transfer, 
          t.status,
          t.created_by,
          l_to.id_department -- Lấy id_department thay vì id_phong_ban
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

      // Tra cứu id_phong_ban từ id_department
      let to_location_phongban_id = null;
      if (ticket.id_department) {
        const [dept] = await connection.query(
          "SELECT id_phong_ban FROM tb_department WHERE id_department = ?",
          [ticket.id_department]
        );
        if (dept.length > 0) {
          to_location_phongban_id = dept[0].id_phong_ban;
        }
      }

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

      // 3. Kiểm tra phòng ban của User 2
      if (!userPhongBanId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy phòng ban của người dùng trong token",
        });
      }

      // 4. So sánh phòng ban (Dùng biến đã tra cứu)
      if (userPhongBanId !== to_location_phongban_id) {
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
          t.created_by,
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

      // 5. Kích hoạt logic duyệt phiếu (cập nhật vị trí máy; created_by/updated_by = người tạo phiếu)
      await handleInternalTransferApproval(
        connection,
        ticket.id_machine_internal_transfer,
        ticket.to_location_id,
        ticket.to_location_name,
        ticket.created_by
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
  creatorId, // id người tạo phiếu -> tb_machine_location, tb_machine_location_history, tb_machine.updated_by
  forcedTargetStatus = null
) => {
  let targetStatus = forcedTargetStatus;

  if (!targetStatus) {
    // 1. Lấy thông tin target_status từ phiếu
    const [ticketInfo] = await connection.query(
      `SELECT target_status FROM tb_machine_internal_transfer WHERE id_machine_internal_transfer = ?`,
      [ticketId]
    );
    targetStatus = ticketInfo[0]?.target_status;
  }

  // 2. Lấy tất cả máy móc trong phiếu
  const [details] = await connection.query(
    `SELECT id_machine FROM tb_machine_internal_transfer_detail WHERE id_machine_internal_transfer = ?`,
    [ticketId]
  );

  if (details.length === 0) {
    console.warn(`No machines found for internal transfer ID: ${ticketId}`);
    return;
  }

  // 3. Xác định trạng thái mới
  let newMachineStatus = "in_use"; // Mặc định nếu ra xưởng

  if (toLocationName && toLocationName.toLowerCase().includes("kho")) {
    // Nếu vào KHO:
    if (targetStatus && targetStatus.trim() !== "") {
      // Nếu có targetStatus (vd: pending_liquidation), DÙNG NGAY
      newMachineStatus = targetStatus;
    } else {
      // Nếu không có, mới fallback về available
      newMachineStatus = "available";
    }
  } else {
    // Nếu ra XƯỞNG
    newMachineStatus = "in_use";
  }

  // 4. Lặp qua từng máy để cập nhật
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

    // b. Ghi lịch sử (created_by, updated_by = người tạo phiếu)
    if (idFromLocation !== idToLocation) {
      await connection.query(
        `
        INSERT INTO tb_machine_location_history
          (id_machine, id_from_location, id_to_location, move_date, created_by, updated_by)
        VALUES (?, ?, ?, CURDATE(), ?, ?)
        `,
        [idMachine, idFromLocation, idToLocation, creatorId, creatorId]
      );
    }

    // c. Cập nhật/Thêm vào tb_machine_location (created_by, updated_by = người tạo phiếu)
    if (currentLocResult.length === 0) {
      // INSERT nếu máy chưa có vị trí
      await connection.query(
        `
        INSERT INTO tb_machine_location
          (id_machine, id_location, created_by, updated_by)
        VALUES (?, ?, ?, ?)
        `,
        [idMachine, idToLocation, creatorId, creatorId]
      );
    } else if (idFromLocation !== idToLocation) {
      // UPDATE nếu vị trí thay đổi
      await connection.query(
        `
        UPDATE tb_machine_location
        SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [idToLocation, creatorId, idMachine]
      );
    } else {
      // Vị trí không thay đổi, chỉ cập nhật (touch)
      await connection.query(
        `
        UPDATE tb_machine_location
        SET updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_machine = ?
        `,
        [creatorId, idMachine]
      );
    }

    // d. Cập nhật trạng thái máy (tb_machine) – updated_by = người tạo phiếu
    await connection.query(
      `
      UPDATE tb_machine
      SET 
        current_status = ?,
        updated_by = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id_machine = ?
      `,
      [newMachineStatus, creatorId, idMachine]
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
        attribute_machines,
        manufacturers,
        suppliers,
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
      // 3. Attribute filter
      if (attribute_machines && attribute_machines.length > 0) {
        whereConditions.push(`m.attribute_machine IN (?)`);
        const attrValues = Array.isArray(attribute_machines)
          ? attribute_machines
          : [attribute_machines];
        filterParams.push(attrValues);
        dataParams.push(attrValues);
      }
      // 4. Manufacturer filter
      if (manufacturers && manufacturers.length > 0) {
        whereConditions.push(`m.manufacturer IN (?)`);
        const manuValues = Array.isArray(manufacturers)
          ? manufacturers
          : [manufacturers];
        filterParams.push(manuValues);
        dataParams.push(manuValues);
      }
      // 5. Supplier filter
      if (suppliers && suppliers.length > 0) {
        whereConditions.push(`m.supplier IN (?)`);
        const supplierValues = Array.isArray(suppliers)
          ? suppliers
          : [suppliers];
        filterParams.push(supplierValues);
        dataParams.push(supplierValues);
      }
      // 6. Current Status filter
      if (current_status && current_status.length > 0) {
        whereConditions.push(`m.current_status IN (?)`);
        const statusValues = Array.isArray(current_status)
          ? current_status
          : [current_status];
        filterParams.push(statusValues);
        dataParams.push(statusValues);
      }
      // 7. Borrow Status filter
      if (
        is_borrowed_or_rented_or_borrowed_out &&
        is_borrowed_or_rented_or_borrowed_out.length > 0
      ) {
        const borrowValues = Array.isArray(
          is_borrowed_or_rented_or_borrowed_out
        )
          ? is_borrowed_or_rented_or_borrowed_out
          : [is_borrowed_or_rented_or_borrowed_out];

        const hasInternal = borrowValues.includes("internal");
        const otherValues = borrowValues.filter((v) => v !== "internal");

        let conditionParts = [];

        // Xử lý các giá trị có text (borrowed, rented, borrowed_out...)
        if (otherValues.length > 0) {
          // Tạo dấu hỏi động: ?,?,?
          const placeholders = otherValues.map(() => "?").join(",");
          conditionParts.push(
            `m.is_borrowed_or_rented_or_borrowed_out IN (${placeholders})`
          );
          // Push từng giá trị vào params
          filterParams.push(...otherValues);
          dataParams.push(...otherValues);
        }

        // Xử lý internal (là NULL hoặc rỗng)
        if (hasInternal) {
          conditionParts.push(
            `(m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out = '')`
          );
        }

        if (conditionParts.length > 0) {
          whereConditions.push(`(${conditionParts.join(" OR ")})`);
        }
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
          m.attribute_machine,
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
      "SELECT id_machine, code_machine, type_machine, attribute_machine, model_machine FROM tb_machine WHERE uuid_machine = ?",
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
          attribute_machine: machineResult[0].attribute_machine,
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
        attribute_machines,
        manufacturers,
        suppliers,
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
      // 3. Attribute filter
      if (attribute_machines && attribute_machines.length > 0) {
        whereConditions.push(`m.attribute_machine IN (?)`);
        const attrValues = Array.isArray(attribute_machines)
          ? attribute_machines
          : [attribute_machines];
        filterParams.push(attrValues);
        dataParams.push(attrValues);
      }
      // 4. Manufacturer filter
      if (manufacturers && manufacturers.length > 0) {
        whereConditions.push(`m.manufacturer IN (?)`);
        const manuValues = Array.isArray(manufacturers)
          ? manufacturers
          : [manufacturers];
        filterParams.push(manuValues);
        dataParams.push(manuValues);
      }
      // 5. Supplier filter
      if (suppliers && suppliers.length > 0) {
        whereConditions.push(`m.supplier IN (?)`);
        const supplierValues = Array.isArray(suppliers)
          ? suppliers
          : [suppliers];
        filterParams.push(supplierValues);
        dataParams.push(supplierValues);
      }
      // 6. Location filter (specific to department view)
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
        const borrowValues = Array.isArray(
          is_borrowed_or_rented_or_borrowed_out
        )
          ? is_borrowed_or_rented_or_borrowed_out
          : [is_borrowed_or_rented_or_borrowed_out];

        const hasInternal = borrowValues.includes("internal");
        const otherValues = borrowValues.filter((v) => v !== "internal");

        let conditionParts = [];

        if (otherValues.length > 0) {
          const placeholders = otherValues.map(() => "?").join(",");
          conditionParts.push(
            `m.is_borrowed_or_rented_or_borrowed_out IN (${placeholders})`
          );
          filterParams.push(...otherValues);
          dataParams.push(...otherValues);
        }

        if (hasInternal) {
          conditionParts.push(
            `(m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out = '')`
          );
        }

        if (conditionParts.length > 0) {
          whereConditions.push(`(${conditionParts.join(" OR ")})`);
        }
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
          m.attribute_machine,
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
        ORDER BY tl.name_location ASC
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

// MARK: ADMIN

const authenticateAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id; // Lấy từ 'authenticateToken'

    // Kiểm tra quyền 'admin' trong tb_user_permission
    const [perms] = await tpmConnection.query(
      `
      SELECT p.name_permission 
      FROM tb_user_permission up
      JOIN tb_permission p ON up.id_permission = p.id_permission
      WHERE up.id_nhan_vien = ? AND p.name_permission = 'admin'
      `,
      [userId]
    );

    if (perms.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền Admin để thực hiện hành động này.",
      });
    }

    // Nếu là Admin, cho phép tiếp tục
    next();
  } catch (error) {
    console.error("Error in admin authentication middleware:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xác thực quyền Admin",
      error: error.message,
    });
  }
};

// Middleware: Tất cả các route /api/admin/* đều phải qua 2 lớp xác thực
// 1. Phải đăng nhập (authenticateToken)
// 2. Phải là Admin (authenticateAdmin)
app.use("/api/admin", authenticateToken, authenticateAdmin);

// GET /api/admin/categories - Get all categories
app.get("/api/admin/categories", async (req, res) => {
  try {
    const [categories] = await tpmConnection.query(
      "SELECT uuid_category, name_category FROM tb_category"
    );
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/categories - Create category
app.post("/api/admin/categories", async (req, res) => {
  try {
    const { name_category } = req.body;
    const userId = req.user.id;
    if (!name_category) {
      return res
        .status(400)
        .json({ success: false, message: "Tên loại là bắt buộc" });
    }
    const [result] = await tpmConnection.query(
      "INSERT INTO tb_category (name_category, created_by, updated_by) VALUES (?, ?, ?)",
      [name_category, userId, userId]
    );
    // Lấy lại dữ liệu vừa tạo (bao gồm UUID)
    const [newData] = await tpmConnection.query(
      "SELECT uuid_category, name_category FROM tb_category WHERE id_category = ?",
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: "Tạo loại thành công",
      data: newData[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/categories/:uuid - Update category by UUID
app.put("/api/admin/categories/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { name_category } = req.body;
    const userId = req.user.id;
    if (!name_category) {
      return res
        .status(400)
        .json({ success: false, message: "Tên loại là bắt buộc" });
    }
    await tpmConnection.query(
      "UPDATE tb_category SET name_category = ?, updated_by = ? WHERE uuid_category = ?",
      [name_category, userId, uuid]
    );
    res.json({ success: true, message: "Cập nhật loại thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/hitimesheet-departments - Get all departments from HiTimeSheet
app.get("/api/admin/hitimesheet-departments", async (req, res) => {
  try {
    const [departments] = await dataHiTimesheetConnection.query(
      `
      SELECT DISTINCT ten_phong_ban 
      FROM sync_phong_ban
      WHERE ten_phong_ban IS NOT NULL AND ten_phong_ban != ''
      ORDER BY ten_phong_ban ASC
      `
    );
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/departments-with-locations - Get departments with locations
app.get("/api/admin/departments-with-locations", async (req, res) => {
  try {
    // 1. Lấy tất cả Đơn vị (vẫn lấy id_phong_ban để tra cứu)
    const [departments] = await tpmConnection.query(
      "SELECT uuid_department, name_department, id_phong_ban FROM tb_department"
    );

    // 2. Lấy tất cả Vị trí (Không thay đổi)
    const [locations] = await tpmConnection.query(
      `
      SELECT 
        tl.uuid_location, 
        tl.name_location, 
        td.uuid_department 
      FROM tb_location tl
      JOIN tb_department td ON tl.id_department = td.id_department
      `
    );

    // 3. Logic tra cứu (Map) là BẮT BUỘC để lấy TÊN
    const phongBanIds = [
      ...new Set(departments.map((dept) => dept.id_phong_ban).filter(Boolean)),
    ];
    let phongBanMap = new Map();
    if (phongBanIds.length > 0) {
      // Dùng ID để tra cứu TÊN
      const [phongBanNames] = await dataHiTimesheetConnection.query(
        `SELECT id, ten_phong_ban FROM sync_phong_ban WHERE id IN (?)`,
        [phongBanIds]
      );
      phongBanMap = new Map(
        phongBanNames.map((pb) => [pb.id, pb.ten_phong_ban])
      );
    }

    // 4. Gộp Vị trí vào Đơn vị
    const data = departments.map((dept) => {
      const deptLocations = locations
        .filter((loc) => loc.uuid_department === dept.uuid_department)
        .map((loc) => ({
          uuid_location: loc.uuid_location,
          name_location: loc.name_location,
        }));

      const ten_phong_ban =
        phongBanMap.get(dept.id_phong_ban) || // Lấy tên (ví dụ: "Bộ phận Cơ Điện")
        "N/A"; // Nếu không có ID hoặc không tìm thấy, trả N/A

      return {
        uuid_department: dept.uuid_department,
        name_department: dept.name_department,
        ten_phong_ban: ten_phong_ban,
        locations: deptLocations,
      };
    });

    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/departments - Create department
app.post("/api/admin/departments", async (req, res) => {
  try {
    // SỬA: Lấy ten_phong_ban (string)
    const { name_department, ten_phong_ban } = req.body;
    const userId = req.user.id;
    if (!name_department) {
      return res
        .status(400)
        .json({ success: false, message: "Tên đơn vị là bắt buộc" });
    }

    let id_phong_ban = null;
    if (ten_phong_ban) {
      const [phongban] = await dataHiTimesheetConnection.query(
        "SELECT id FROM sync_phong_ban WHERE ten_phong_ban = ? LIMIT 1",
        [ten_phong_ban]
      );
      if (phongban.length > 0) {
        id_phong_ban = phongban[0].id;
      } else {
        console.warn(
          `(POST) Không tìm thấy ID cho ten_phong_ban: ${ten_phong_ban}`
        );
        // (Tùy chọn: Bạn có thể trả lỗi ở đây nếu muốn)
        // return res.status(404).json({ success: false, message: `Tên phòng ban '${ten_phong_ban}' không tồn tại trong HiTimeSheet.` });
      }
    }

    const [result] = await tpmConnection.query(
      "INSERT INTO tb_department (name_department, id_phong_ban, created_by, updated_by) VALUES (?, ?, ?, ?)",
      [name_department, id_phong_ban, userId, userId]
    );

    // Lấy lại dữ liệu vừa tạo
    const [newData] = await tpmConnection.query(
      "SELECT uuid_department, name_department FROM tb_department WHERE id_department = ?",
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: "Tạo đơn vị thành công",
      data: {
        ...newData[0],
        ten_phong_ban: ten_phong_ban || "N/A", // Trả TÊN về cho frontend
        locations: [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/departments/:uuid - Update department by UUID
app.put("/api/admin/departments/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    // SỬA: Lấy ten_phong_ban (string)
    const { name_department, ten_phong_ban } = req.body;
    const userId = req.user.id;
    if (!name_department) {
      return res
        .status(400)
        .json({ success: false, message: "Tên đơn vị là bắt buộc" });
    }

    // SỬA: Logic tra cứu ID từ TÊN
    let id_phong_ban = null;
    if (ten_phong_ban) {
      const [phongban] = await dataHiTimesheetConnection.query(
        "SELECT id FROM sync_phong_ban WHERE ten_phong_ban = ? LIMIT 1",
        [ten_phong_ban]
      );
      if (phongban.length > 0) {
        id_phong_ban = phongban[0].id;
      } else {
        console.warn(
          `(PUT) Không tìm thấy ID cho ten_phong_ban: ${ten_phong_ban}`
        );
        // (Tùy chọn: trả lỗi)
        // return res.status(404).json({ success: false, message: `Tên phòng ban '${ten_phong_ban}' không tồn tại trong HiTimeSheet.` });
      }
    } // Nếu ten_phong_ban là rỗng/null (Không chọn), id_phong_ban sẽ là null

    await tpmConnection.query(
      "UPDATE tb_department SET name_department = ?, id_phong_ban = ?, updated_by = ? WHERE uuid_department = ?",
      [name_department, id_phong_ban, userId, uuid]
    );
    res.json({ success: true, message: "Cập nhật đơn vị thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/locations - Create location
app.post("/api/admin/locations", async (req, res) => {
  try {
    const { name_location, uuid_department } = req.body;
    const userId = req.user.id;
    if (!name_location || !uuid_department) {
      return res.status(400).json({
        success: false,
        message: "Tên vị trí và Đơn vị là bắt buộc",
      });
    }

    // Tìm id_department từ uuid_department
    const [dept] = await tpmConnection.query(
      "SELECT id_department FROM tb_department WHERE uuid_department = ?",
      [uuid_department]
    );
    if (dept.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn vị (department).",
      });
    }
    const id_department = dept[0].id_department;

    const [result] = await tpmConnection.query(
      "INSERT INTO tb_location (name_location, id_department, created_by, updated_by) VALUES (?, ?, ?, ?)",
      [name_location, id_department, userId, userId]
    );
    // Lấy lại dữ liệu vừa tạo
    const [newData] = await tpmConnection.query(
      "SELECT * FROM tb_location WHERE id_location = ?",
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: "Tạo vị trí thành công",
      data: newData[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/locations/:uuid - Update location by UUID
app.put("/api/admin/locations/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { name_location } = req.body;
    const userId = req.user.id;

    if (!name_location) {
      return res.status(400).json({
        success: false,
        message: "Tên vị trí là bắt buộc",
      });
    }

    await tpmConnection.query(
      "UPDATE tb_location SET name_location = ?, updated_by = ? WHERE uuid_location = ?",
      [name_location, userId, uuid]
    );
    res.json({ success: true, message: "Cập nhật vị trí thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/permissions - Lấy tất cả quyền đang có
app.get("/api/admin/permissions", async (req, res) => {
  try {
    // Lấy tên quyền
    const [permissions] = await tpmConnection.query(
      "SELECT name_permission FROM tb_permission"
    );
    res.json({
      success: true,
      data: permissions.map((p) => p.name_permission), // Trả về mảng TÊN: ['admin', 'edit', 'view']
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/users/search - Tìm user (không trả ID)
app.get("/api/admin/users/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const searchPattern = `%${query}%`;
    // Tìm trong CSDL HiTimeSheet
    const [users] = await dataHiTimesheetConnection.query(
      `
      SELECT ma_nv, ten_nv 
      FROM sync_nhan_vien 
      WHERE ma_nv LIKE ? OR ten_nv LIKE ?
      ORDER BY ma_nv ASC
      `,
      [searchPattern, searchPattern]
    );
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/users/permissions - Lấy quyền của 1 user theo ma_nv
app.get("/api/admin/users/permissions", async (req, res) => {
  try {
    const { ma_nv } = req.query;
    if (!ma_nv) {
      return res
        .status(400)
        .json({ success: false, message: "ma_nv là bắt buộc" });
    }

    // 1. Tra cứu ID từ ma_nv (trong code)
    const [user] = await dataHiTimesheetConnection.query(
      "SELECT id FROM sync_nhan_vien WHERE ma_nv = ?",
      [ma_nv]
    );
    if (user.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy User" });
    }
    const id_nhan_vien = user[0].id;

    // 2. Lấy TÊN quyền từ ID
    const [permissions] = await tpmConnection.query(
      `
      SELECT p.name_permission
      FROM tb_user_permission up
      JOIN tb_permission p ON up.id_permission = p.id_permission
      WHERE up.id_nhan_vien = ?
      `,
      [id_nhan_vien]
    );

    res.json({
      success: true,
      data: permissions.map((p) => p.name_permission), // Trả về mảng TÊN: ['admin', 'edit']
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/users/permissions - Cập nhật quyền cho 1 user (bằng ma_nv và TÊN quyền)
app.put("/api/admin/users/permissions", async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    const { ma_nv, permissions } = req.body; // permissions là mảng TÊN: ['admin', 'edit']
    const userId = req.user.id; // ID của Admin đang thao tác

    if (!ma_nv) {
      return res
        .status(400)
        .json({ success: false, message: "ma_nv là bắt buộc" });
    }

    // 1. Tra cứu ID User từ ma_nv (trong code)
    const [user] = await dataHiTimesheetConnection.query(
      "SELECT id FROM sync_nhan_vien WHERE ma_nv = ?",
      [ma_nv]
    );
    if (user.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy User" });
    }
    const id_nhan_vien = user[0].id;

    // 2. Tra cứu ID Quyền từ TÊN quyền (trong code)
    let permissionIds = [];
    if (permissions && permissions.length > 0) {
      const [perms] = await connection.query(
        "SELECT id_permission FROM tb_permission WHERE name_permission IN (?)",
        [permissions]
      );
      permissionIds = perms.map((p) => p.id_permission);
    }

    // 3. Thực hiện Transaction: Xóa cũ, Thêm mới
    await connection.beginTransaction();

    // Xóa tất cả quyền cũ của user này
    await connection.query(
      "DELETE FROM tb_user_permission WHERE id_nhan_vien = ?",
      [id_nhan_vien]
    );

    // Thêm quyền mới (nếu có)
    if (permissionIds.length > 0) {
      const values = permissionIds.map((id_permission) => [
        id_permission,
        id_nhan_vien,
        userId, // created_by
        userId, // updated_by
      ]);
      await connection.query(
        "INSERT INTO tb_user_permission (id_permission, id_nhan_vien, created_by, updated_by) VALUES ?",
        [values]
      );
    }

    await connection.commit();
    res.json({ success: true, message: "Cập nhật quyền thành công" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// --- MACHINE TYPES ---
// POST /api/admin/machine-types - Create machine type
app.post("/api/admin/machine-types", async (req, res) => {
  try {
    const { name_machine_type } = req.body;
    const userId = req.user.id;
    if (!name_machine_type) {
      return res
        .status(400)
        .json({ success: false, message: "Tên loại máy là bắt buộc" });
    }
    const [result] = await tpmConnection.query(
      "INSERT INTO tb_machine_type (name_machine_type, created_by, updated_by) VALUES (?, ?, ?)",
      [name_machine_type, userId, userId]
    );
    const [newData] = await tpmConnection.query(
      "SELECT uuid_machine_type as uuid, name_machine_type as name FROM tb_machine_type WHERE id_machine_type = ?",
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: "Tạo loại máy thành công",
      data: newData[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/machine-types/:uuid - Update machine type
app.put("/api/admin/machine-types/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { name_machine_type } = req.body;
    const userId = req.user.id;
    if (!name_machine_type) {
      return res
        .status(400)
        .json({ success: false, message: "Tên loại máy là bắt buộc" });
    }

    // Lấy tên loại máy cũ để cập nhật lại trong tb_machine
    const [oldTypeRows] = await tpmConnection.query(
      "SELECT name_machine_type FROM tb_machine_type WHERE uuid_machine_type = ?",
      [uuid]
    );
    const oldTypeName =
      oldTypeRows && oldTypeRows.length > 0
        ? oldTypeRows[0].name_machine_type
        : null;

    // Cập nhật tên loại máy trong bảng danh mục
    await tpmConnection.query(
      "UPDATE tb_machine_type SET name_machine_type = ?, updated_by = ? WHERE uuid_machine_type = ?",
      [name_machine_type, userId, uuid]
    );

    // Đồng bộ tên loại máy trong tb_machine (nếu tìm được tên cũ)
    if (oldTypeName) {
      await tpmConnection.query(
        "UPDATE tb_machine SET type_machine = ? WHERE type_machine = ?",
        [name_machine_type, oldTypeName]
      );
    }

    res.json({ success: true, message: "Cập nhật loại máy thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/machine-types/:uuid - Delete machine type
app.delete("/api/admin/machine-types/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    // Delete type-attribute relationships first
    await tpmConnection.query(
      "DELETE FROM tb_machine_type_attribute WHERE id_machine_type = (SELECT id_machine_type FROM tb_machine_type WHERE uuid_machine_type = ?)",
      [uuid]
    );
    await tpmConnection.query(
      "DELETE FROM tb_machine_type WHERE uuid_machine_type = ?",
      [uuid]
    );
    res.json({ success: true, message: "Xóa loại máy thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- MACHINE ATTRIBUTES ---
// GET /api/admin/machine-attributes - Get all machine attributes
app.get("/api/machine-attributes", async (req, res) => {
  try {
    const [attributes] = await tpmConnection.query(
      `SELECT 
        uuid_machine_attribute as uuid,
        name_machine_attribute as name
      FROM tb_machine_attribute
      ORDER BY name_machine_attribute ASC`
    );
    res.json({ success: true, data: attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/machine-attributes - Create machine attribute
app.post("/api/admin/machine-attributes", async (req, res) => {
  try {
    const { name_machine_attribute } = req.body;
    const userId = req.user.id;
    if (!name_machine_attribute) {
      return res
        .status(400)
        .json({ success: false, message: "Tên đặc tính là bắt buộc" });
    }
    const [result] = await tpmConnection.query(
      "INSERT INTO tb_machine_attribute (name_machine_attribute, created_by, updated_by) VALUES (?, ?, ?)",
      [name_machine_attribute, userId, userId]
    );
    const [newData] = await tpmConnection.query(
      "SELECT uuid_machine_attribute as uuid, name_machine_attribute as name FROM tb_machine_attribute WHERE id_machine_attribute = ?",
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: "Tạo đặc tính thành công",
      data: newData[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/machine-attributes/:uuid - Update machine attribute
app.put("/api/admin/machine-attributes/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { name_machine_attribute } = req.body;
    const userId = req.user.id;
    if (!name_machine_attribute) {
      return res
        .status(400)
        .json({ success: false, message: "Tên đặc tính là bắt buộc" });
    }
    // Lấy tên đặc tính cũ để cập nhật lại trong tb_machine
    const [oldAttrRows] = await tpmConnection.query(
      "SELECT name_machine_attribute FROM tb_machine_attribute WHERE uuid_machine_attribute = ?",
      [uuid]
    );
    const oldAttrName =
      oldAttrRows && oldAttrRows.length > 0
        ? oldAttrRows[0].name_machine_attribute
        : null;

    // Cập nhật tên đặc tính trong bảng danh mục
    await tpmConnection.query(
      "UPDATE tb_machine_attribute SET name_machine_attribute = ?, updated_by = ? WHERE uuid_machine_attribute = ?",
      [name_machine_attribute, userId, uuid]
    );

    // Đồng bộ tên đặc tính trong tb_machine (nếu tìm được tên cũ)
    if (oldAttrName) {
      await tpmConnection.query(
        "UPDATE tb_machine SET attribute_machine = ? WHERE attribute_machine = ?",
        [name_machine_attribute, oldAttrName]
      );
    }

    res.json({ success: true, message: "Cập nhật đặc tính thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/machine-attributes/:uuid - Delete machine attribute
app.delete("/api/admin/machine-attributes/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    // Delete type-attribute relationships
    await tpmConnection.query(
      "DELETE FROM tb_machine_type_attribute WHERE id_machine_attribute = (SELECT id_machine_attribute FROM tb_machine_attribute WHERE uuid_machine_attribute = ?)",
      [uuid]
    );
    await tpmConnection.query(
      "DELETE FROM tb_machine_attribute WHERE uuid_machine_attribute = ?",
      [uuid]
    );
    res.json({ success: true, message: "Xóa đặc tính thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/machine-types/:uuid/attributes - Link attribute to type
app.post("/api/admin/machine-types/:uuid/attributes", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { attribute_uuid } = req.body;
    if (!attribute_uuid) {
      return res
        .status(400)
        .json({ success: false, message: "UUID đặc tính là bắt buộc" });
    }
    // Get IDs
    const [type] = await tpmConnection.query(
      "SELECT id_machine_type FROM tb_machine_type WHERE uuid_machine_type = ?",
      [uuid]
    );
    const [attr] = await tpmConnection.query(
      "SELECT id_machine_attribute FROM tb_machine_attribute WHERE uuid_machine_attribute = ?",
      [attribute_uuid]
    );
    if (type.length === 0 || attr.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Loại máy hoặc đặc tính không tồn tại",
      });
    }
    // Check if already linked
    const [existing] = await tpmConnection.query(
      "SELECT * FROM tb_machine_type_attribute WHERE id_machine_type = ? AND id_machine_attribute = ?",
      [type[0].id_machine_type, attr[0].id_machine_attribute]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Đặc tính đã được liên kết với loại máy này",
      });
    }
    await tpmConnection.query(
      "INSERT INTO tb_machine_type_attribute (id_machine_type, id_machine_attribute) VALUES (?, ?)",
      [type[0].id_machine_type, attr[0].id_machine_attribute]
    );
    res.status(201).json({
      success: true,
      message: "Liên kết đặc tính với loại máy thành công",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/machine-types/:uuid/attributes/:attrUuid - Unlink attribute from type
app.delete(
  "/api/admin/machine-types/:uuid/attributes/:attrUuid",
  async (req, res) => {
    try {
      const { uuid, attrUuid } = req.params;
      const [type] = await tpmConnection.query(
        "SELECT id_machine_type FROM tb_machine_type WHERE uuid_machine_type = ?",
        [uuid]
      );
      const [attr] = await tpmConnection.query(
        "SELECT id_machine_attribute FROM tb_machine_attribute WHERE uuid_machine_attribute = ?",
        [attrUuid]
      );
      if (type.length === 0 || attr.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Loại máy hoặc đặc tính không tồn tại",
        });
      }
      await tpmConnection.query(
        "DELETE FROM tb_machine_type_attribute WHERE id_machine_type = ? AND id_machine_attribute = ?",
        [type[0].id_machine_type, attr[0].id_machine_attribute]
      );
      res.json({ success: true, message: "Hủy liên kết đặc tính thành công" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// --- MACHINE MANUFACTURERS ---
// POST /api/admin/machine-manufacturers - Create manufacturer
app.post("/api/admin/machine-manufacturers", async (req, res) => {
  try {
    const { name_machine_manufacturer } = req.body;
    const userId = req.user.id;
    if (!name_machine_manufacturer) {
      return res
        .status(400)
        .json({ success: false, message: "Tên hãng sản xuất là bắt buộc" });
    }
    const [result] = await tpmConnection.query(
      "INSERT INTO tb_machine_manufacturer (name_machine_manufacturer, created_by, updated_by) VALUES (?, ?, ?)",
      [name_machine_manufacturer, userId, userId]
    );
    const [newData] = await tpmConnection.query(
      "SELECT uuid_machine_manufacturer as uuid, name_machine_manufacturer as name FROM tb_machine_manufacturer WHERE id_machine_manufacturer = ?",
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: "Tạo hãng sản xuất thành công",
      data: newData[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/machine-manufacturers/:uuid - Update manufacturer
app.put("/api/admin/machine-manufacturers/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { name_machine_manufacturer } = req.body;
    const userId = req.user.id;
    if (!name_machine_manufacturer) {
      return res
        .status(400)
        .json({ success: false, message: "Tên hãng sản xuất là bắt buộc" });
    }
    // Lấy tên hãng sản xuất cũ để cập nhật lại trong tb_machine
    const [oldManuRows] = await tpmConnection.query(
      "SELECT name_machine_manufacturer FROM tb_machine_manufacturer WHERE uuid_machine_manufacturer = ?",
      [uuid]
    );
    const oldManuName =
      oldManuRows && oldManuRows.length > 0
        ? oldManuRows[0].name_machine_manufacturer
        : null;

    // Cập nhật tên hãng sản xuất trong bảng danh mục
    await tpmConnection.query(
      "UPDATE tb_machine_manufacturer SET name_machine_manufacturer = ?, updated_by = ? WHERE uuid_machine_manufacturer = ?",
      [name_machine_manufacturer, userId, uuid]
    );

    // Đồng bộ tên hãng sản xuất trong tb_machine (nếu tìm được tên cũ)
    if (oldManuName) {
      await tpmConnection.query(
        "UPDATE tb_machine SET manufacturer = ? WHERE manufacturer = ?",
        [name_machine_manufacturer, oldManuName]
      );
    }

    res.json({ success: true, message: "Cập nhật hãng sản xuất thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/machine-manufacturers/:uuid - Delete manufacturer
app.delete("/api/admin/machine-manufacturers/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    await tpmConnection.query(
      "DELETE FROM tb_machine_manufacturer WHERE uuid_machine_manufacturer = ?",
      [uuid]
    );
    res.json({ success: true, message: "Xóa hãng sản xuất thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- MACHINE SUPPLIERS ---
// POST /api/admin/machine-suppliers - Create supplier
app.post("/api/admin/machine-suppliers", async (req, res) => {
  try {
    const { name_machine_supplier } = req.body;
    const userId = req.user.id;
    if (!name_machine_supplier) {
      return res
        .status(400)
        .json({ success: false, message: "Tên nhà cung cấp là bắt buộc" });
    }
    const [result] = await tpmConnection.query(
      "INSERT INTO tb_machine_supplier (name_machine_supplier, created_by, updated_by) VALUES (?, ?, ?)",
      [name_machine_supplier, userId, userId]
    );
    const [newData] = await tpmConnection.query(
      "SELECT uuid_machine_supplier as uuid, name_machine_supplier as name FROM tb_machine_supplier WHERE id_machine_supplier = ?",
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: "Tạo nhà cung cấp thành công",
      data: newData[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/machine-suppliers/:uuid - Update supplier
app.put("/api/admin/machine-suppliers/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { name_machine_supplier } = req.body;
    const userId = req.user.id;
    if (!name_machine_supplier) {
      return res
        .status(400)
        .json({ success: false, message: "Tên nhà cung cấp là bắt buộc" });
    }
    // Lấy tên nhà cung cấp cũ để cập nhật lại trong tb_machine
    const [oldSuppRows] = await tpmConnection.query(
      "SELECT name_machine_supplier FROM tb_machine_supplier WHERE uuid_machine_supplier = ?",
      [uuid]
    );
    const oldSuppName =
      oldSuppRows && oldSuppRows.length > 0
        ? oldSuppRows[0].name_machine_supplier
        : null;

    // Cập nhật tên nhà cung cấp trong bảng danh mục
    await tpmConnection.query(
      "UPDATE tb_machine_supplier SET name_machine_supplier = ?, updated_by = ? WHERE uuid_machine_supplier = ?",
      [name_machine_supplier, userId, uuid]
    );

    // Đồng bộ tên nhà cung cấp trong tb_machine (nếu tìm được tên cũ)
    if (oldSuppName) {
      await tpmConnection.query(
        "UPDATE tb_machine SET supplier = ? WHERE supplier = ?",
        [name_machine_supplier, oldSuppName]
      );
    }

    res.json({ success: true, message: "Cập nhật nhà cung cấp thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/machine-suppliers/:uuid - Delete supplier
app.delete("/api/admin/machine-suppliers/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    await tpmConnection.query(
      "DELETE FROM tb_machine_supplier WHERE uuid_machine_supplier = ?",
      [uuid]
    );
    res.json({ success: true, message: "Xóa nhà cung cấp thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// MARK: FASTWORK

// Helper: Map loại phiếu sang tên proposal
const getProposalName = (type, specificType, date) => {
  const mapping = {
    purchased: "Phiếu nhập máy móc thiết bị móc mới",
    maintenance_return: "Phiếu nhập máy móc thiết bị sau bảo trì",
    rented: "Phiếu nhập thuê máy móc thiết bị",
    borrowed: "Phiếu nhập mượn máy móc thiết bị",
    borrowed_out_return: "Phiếu nhập trả máy móc thiết bị (máy cho mượn)",
    liquidation: "Phiếu xuất thanh lý máy móc thiết bị",
    maintenance: "Phiếu xuất bảo trì máy móc thiết bị",
    borrowed_out: "Phiếu xuất cho mượn máy móc thiết bị",
    rented_return: "Phiếu xuất trả máy móc thiết bị (máy thuê)",
    borrowed_return: "Phiếu xuất trả máy móc thiết bị (máy mượn)",
    internal: "Phiếu điều chuyển máy móc thiết bị",
  };

  // Tạo chuỗi ngày định dạng Việt Nam
  const dateStr = date
    ? ` ngày ${new Date(date).toLocaleDateString("vi-VN")}`
    : "";

  // Với phiếu internal: type = "internal", specificType thường là null
  // Với phiếu import/export: type = "import"/"export", specificType = "purchased"/"maintenance"...
  const key = type === "internal" ? "internal" : specificType;
  const baseName = mapping[key] || "Phiếu khác";

  return `${baseName}${dateStr}`;
};

async function enrichApprovalFlowWithNames(flowJson) {
  if (!flowJson) return [];

  let flow = [];
  try {
    // Nếu là string JSON thì parse, nếu là object rồi thì dùng luôn
    flow = typeof flowJson === "string" ? JSON.parse(flowJson) : flowJson;
  } catch (e) {
    console.error("Error parsing approval flow JSON", e);
    return [];
  }

  if (!Array.isArray(flow) || flow.length === 0) return [];

  // Lấy danh sách ma_nv
  const maNvs = flow.map((step) => step.ma_nv).filter(Boolean);
  if (maNvs.length === 0) return flow;

  try {
    // Query bảng sync_nhan_vien để lấy tên
    const [users] = await dataHiTimesheetConnection.query(
      `SELECT ma_nv, ten_nv FROM sync_nhan_vien WHERE ma_nv IN (?)`,
      [maNvs]
    );

    // Tạo map để tra cứu nhanh: '10107' => 'Nguyễn Văn A'
    const userMap = {};
    users.forEach((u) => {
      userMap[u.ma_nv] = u.ten_nv;
    });

    // Gán tên vào flow
    const enrichedFlow = flow.map((step) => ({
      ...step,
      ten_nv: userMap[step.ma_nv] || "(Chưa cập nhật tên)",
    }));

    return enrichedFlow;
  } catch (err) {
    console.error("Error fetching employee names for flow:", err);
    // Nếu lỗi query tên, trả về flow gốc (chỉ có mã)
    return flow;
  }
}

// POST /api/test-proposals/create - Create ticket AND send to External API
app.post(
  "/api/test-proposals/create",
  authenticateToken,
  upload.array("attachments"),
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();

      const {
        category, // 'import', 'export', 'internal'
        type, // Loại chi tiết (purchased, borrowed, etc.)
        date,
        note,
        to_location_uuid,
        machines: machinesJson,
        // Các trường cũ
        is_borrowed_or_rented_or_borrowed_out_name,
        is_borrowed_or_rented_or_borrowed_out_date,
        is_borrowed_or_rented_or_borrowed_out_return_date,
        // Các trường MỚI từ Frontend (cho phiếu Xuất)
        receiver_name, // Họ tên người nhận
        vehicle_number, // Số xe
        department_address, // Địa chỉ (bộ phận)
        target_status,
      } = req.body;

      const machines = JSON.parse(machinesJson || "[]");
      const userId = req.user.id;
      const ma_nv_login = req.user.ma_nv;

      // --- 1. LẤY THÔNG TIN CẦN THIẾT ---
      let user_phongban_id = null;
      let id_department_str = "1-14";

      // Lấy thông tin user (giữ nguyên logic cũ)
      if (userId >= 90000) {
        user_phongban_id = req.user.phongban_id;
        id_department_str = `1-${user_phongban_id}`;
      } else {
        const [userInfo] = await dataHiTimesheetConnection.query(
          `SELECT CONCAT(com.id_company, '-', pb.id) AS id_department_str, pb.id AS id_phong_ban 
           FROM sync_nhan_vien nv 
           LEFT JOIN sync_bo_phan bp ON bp.id = nv.id_bo_phan 
           LEFT JOIN sync_phong_ban pb ON pb.id = bp.id_phong_ban 
           LEFT JOIN sync_company com ON com.id_company = pb.id_company 
           WHERE nv.id = ?`,
          [userId]
        );
        user_phongban_id = userInfo[0]?.id_phong_ban;
        id_department_str = userInfo[0]?.id_department_str || "1-14";
      }

      let dest_phongban_id = null;
      let to_location_id = null;
      let to_location_name = ""; // Khai báo biến để lưu tên vị trí
      let to_department_name = "";

      if (to_location_uuid) {
        // CẬP NHẬT QUERY ĐỂ LẤY name_location
        const [locRes] = await connection.query(
          `SELECT tl.id_location, tl.name_location, td.id_phong_ban, td.name_department
           FROM tb_location tl 
           LEFT JOIN tb_department td ON tl.id_department = td.id_department 
           WHERE tl.uuid_location = ?`,
          [to_location_uuid]
        );
        if (locRes.length > 0) {
          to_location_id = locRes[0].id_location;
          to_location_name = locRes[0].name_location; // Lấy tên vị trí
          dest_phongban_id = locRes[0].id_phong_ban;
          to_department_name = locRes[0].name_department;
        } else {
          throw new Error("Vị trí không tồn tại");
        }
      }

      // --- 2. CẤU HÌNH LUỒNG DUYỆT ĐỘNG ---
      let approvalFlowForDB = [];
      if (category === "import") {
        approvalFlowForDB = [
          {
            // ma_nv: "06264",
            ma_nv: "09802",
            step_flow: 0,
            isFinalFlow: 1,
            status_text: "Đang chờ duyệt",
            is_forward: 0,
            display_name: "Trưởng phòng Cơ điện",
            is_flow: 1,
            indexOf: 1,
          },
        ];
      } else if (category === "export") {
        approvalFlowForDB = [
          {
            ma_nv: "AĂÂEÊ",
            // ma_nv: "10107",
            step_flow: 0,
            isFinalFlow: 0,
            status_text: "Đang chờ duyệt",
            is_forward: 0,
            display_name: "Bên nhận",
            is_flow: 0,
            indexOf: 1,
          },
          {
            // ma_nv: "06264",
            ma_nv: "10107",
            step_flow: 0,
            isFinalFlow: 0,
            status_text: "Đang chờ duyệt",
            is_forward: 0,
            display_name: "Bên giao",
            is_flow: 1,
            indexOf: 2,
          },
          {
            // ma_nv: "00057",
            ma_nv: "09802",
            step_flow: 1,
            isFinalFlow: 1,
            status_text: "Đang chờ duyệt",
            is_forward: 0,
            display_name: "Kế toán trưởng",
            is_flow: 1,
            indexOf: 3,
          },
          // {
          //   ma_nv: "00007",
          //   step_flow: 2,
          //   isFinalFlow: 1,
          //   status_text: "Đang chờ duyệt",
          //   is_forward: 0,
          //   display_name: "Giám đốc",
          //   is_flow: 1,
          //   indexOf: 4,
          // },
        ];
      } else if (category === "internal") {
        if (user_phongban_id === dest_phongban_id) {
          // Mặc định là Trưởng phòng Cơ điện
          // let approverMaNv = "06264";
          let approverMaNv = "09802";
          let approverName = "Trưởng phòng Cơ điện";

          // Chuyển về số để so sánh cho chính xác
          const pId = Number(user_phongban_id);
          // Mảng các người duyệt: [{ ma_nv, display_name }, ...]
          let approvers = [];

          if (pId === 10) {
            approvers = [{ ma_nv: "00184", display_name: "Quản đốc Xưởng 1" }];
          } else if (pId === 30) {
            approvers = [{ ma_nv: "01613", display_name: "Quản đốc Xưởng 2" }];
          } else if (pId === 24) {
            approvers = [{ ma_nv: "00023", display_name: "Quản đốc Xưởng 3" }];
          } else if (pId === 31) {
            approvers = [{ ma_nv: "01589", display_name: "Quản đốc Xưởng 4" }];
          } else {
            // Mặc định
            approvers = [{ ma_nv: approverMaNv, display_name: approverName }];
          }

          // Tạo luồng duyệt từ mảng approvers
          approvalFlowForDB = approvers.map((approver) => ({
            ma_nv: approver.ma_nv,
            step_flow: 0,
            isFinalFlow: 1,
            status_text: "Đang chờ duyệt",
            is_forward: 0,
            display_name: approver.display_name,
            is_flow: 1,
            indexOf: 1,
          }));
        } else {
          const [destUsers] = await dataHiTimesheetConnection.query(
            `SELECT nv.id, nv.ma_nv FROM sync_nhan_vien nv JOIN sync_bo_phan bp ON nv.id_bo_phan = bp.id WHERE bp.id_phong_ban = ?`,
            [dest_phongban_id]
          );
          let validApprovers = [];
          const destUserIds = destUsers.map((u) => u.id);
          if (destUserIds.length > 0) {
            const [perms] = await connection.query(
              `SELECT DISTINCT id_nhan_vien FROM tb_user_permission WHERE id_nhan_vien IN (?) AND id_permission = 2`,
              [destUserIds]
            );
            const permittedSet = new Set(perms.map((p) => p.id_nhan_vien));
            validApprovers = destUsers
              .filter((u) => permittedSet.has(u.id))
              .map((u) => ({
                ma_nv: u.ma_nv,
                step_flow: 0,
                isFinalFlow: 0,
                status_text: "Đang chờ duyệt",
                is_forward: 0,
                display_name: "Cơ điện Xưởng",
                is_flow: 1,
                indexOf: 1,
              }));
          }
          if (validApprovers.length > 0) {
            approvalFlowForDB = [
              ...validApprovers,
              {
                // ma_nv: "06264",
                ma_nv: "09802",
                step_flow: 1,
                isFinalFlow: 1,
                status_text: "Đang chờ duyệt",
                is_forward: 0,
                display_name: "Trưởng phòng Cơ điện",
                is_flow: 1,
                indexOf: 2,
              },
            ];
          } else {
            approvalFlowForDB = [
              {
                // ma_nv: "06264",
                ma_nv: "09802",
                step_flow: 0,
                isFinalFlow: 1,
                status_text: "Đang chờ duyệt",
                is_forward: 0,
                display_name: "Trưởng phòng Cơ điện",
                is_flow: 1,
                indexOf: 1,
              },
            ];
          }
        }
      } else {
        approvalFlowForDB = [
          {
            // ma_nv: "06264",
            ma_nv: "09802",
            step_flow: 0,
            isFinalFlow: 1,
            status_text: "Đang chờ duyệt",
            is_forward: 0,
            display_name: "Trưởng phòng Cơ điện",
            is_flow: 1,
            indexOf: 1,
          },
        ];
      }

      const approvalFlowForExternal = approvalFlowForDB.map(
        ({ status_text, is_forward, ...rest }) => rest
      );
      const approvalFlowForLocalDB = approvalFlowForDB.filter(
        (step) => step.is_flow === 1
      );
      const approvalFlowJson = JSON.stringify(approvalFlowForLocalDB);

      // --- 3. XỬ LÝ FILE ---
      let attachedFileString = null;
      let attachedLinksForExternal = [];
      if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map((file) => uploadFileToDrive(file));
        const fileInfos = await Promise.all(uploadPromises);
        const validFiles = fileInfos.filter((f) => f && f.link);
        attachedFileString = validFiles
          .map((f) => `${f.name}|${f.link}`)
          .join("; ");
        attachedLinksForExternal = validFiles.map((f) => ({
          url: f.link,
          id: f.id,
          filename: f.name,
        }));
      }

      // --- 4. CẤU HÌNH PAYLOAD EXTERNAL & EXPANSION FIELD ---
      let targetUidProposalType = "8622ae80-4345-4efd-9a8a-62a1308d5a3f";
      let expansionField = [];
      const proposalName = getProposalName(category, type, date);
      const reasonName = (getProposalName(category, type, null) || "")
        .replace(/^Phiếu\s*/i, "")
        .trim();

      // A. Phiếu Nhập
      if (category === "import") {
        targetUidProposalType = "188b0afe-fc1d-4b19-b030-e437a846aec6";
        let fromUnit = "";
        let toUnit = "Việt Long Hưng";
        let duration = "";
        if (type === "borrowed" || type === "rented") {
          fromUnit = is_borrowed_or_rented_or_borrowed_out_name || "";
          duration = is_borrowed_or_rented_or_borrowed_out_return_date || "";
        }
        expansionField = [
          { "Từ đơn vị:": fromUnit },
          { "Đến đơn vị:": toUnit },
          { "Thời hạn:": duration },
        ];
      }
      // B. Phiếu Xuất (SỬA ĐỔI CHÍNH Ở ĐÂY)
      else if (category === "export") {
        targetUidProposalType = "03bb46e0-c614-4746-bf94-f532ca065911";

        let reason = reasonName;
        let duration = "";
        let fromUnit = "Việt Long Hưng";
        let toUnit = "";

        // Logic xác định "Đến đơn vị"
        if (type === "borrowed_out") {
          toUnit = is_borrowed_or_rented_or_borrowed_out_name || ""; // Nếu mượn -> Tên người mượn
          duration = is_borrowed_or_rented_or_borrowed_out_return_date || "";
        } else {
          // Nếu KHÔNG phải mượn (VD: Thanh lý, Bảo trì, Trả thuê...) -> Lấy tên vị trí xuất đến
          toUnit = to_location_name || ""; // <--- SỬ DỤNG BIẾN to_location_name ĐÃ QUERY Ở PHẦN 1
        }

        expansionField = [
          { "Lý do điều động:": reason },
          { "Thời hạn:": duration },
          { "Từ đơn vị:": fromUnit },
          { "Đến đơn vị:": toUnit },
          { "Họ tên người nhận hàng:": receiver_name || "" },
          { "Số xe:": vehicle_number || "" },
          { "Địa chỉ (bộ phận):": department_address || "" },
          { "Xuất tại kho:": "Kho cơ điện" },
        ];
      }
      // C. Phiếu Điều Chuyển
      else if (category === "internal") {
        targetUidProposalType = "8622ae80-4345-4efd-9a8a-62a1308d5a3f";
        expansionField = [];
      }

      // --- 5. LƯU VÀO DB ---
      let newTicketUuid = "";
      let ticketId = null;
      let dateFormatted = new Date(date).toISOString().split("T")[0];
      const expansionFieldJson = JSON.stringify(expansionField);

      // ... (Giữ nguyên phần INSERT vào DB cho import, export, internal) ...
      // Chú ý: Ở phần insert export, nhớ insert cột expansion_field như code trước đã làm
      if (category === "import") {
        const [resImport] = await connection.query(
          `INSERT INTO tb_machine_import (to_location_id, import_type, import_date, status, note, created_by, updated_by, attached_file, approval_flow, is_borrowed_or_rented_or_borrowed_out_name, is_borrowed_or_rented_or_borrowed_out_date, is_borrowed_or_rented_or_borrowed_out_return_date) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            to_location_id,
            type,
            dateFormatted,
            note,
            userId,
            userId,
            attachedFileString,
            approvalFlowJson,
            is_borrowed_or_rented_or_borrowed_out_name,
            is_borrowed_or_rented_or_borrowed_out_date,
            is_borrowed_or_rented_or_borrowed_out_return_date,
          ]
        );
        ticketId = resImport.insertId;
        const [uuidRes] = await connection.query(
          "SELECT uuid_machine_import FROM tb_machine_import WHERE id_machine_import = ?",
          [ticketId]
        );
        newTicketUuid = uuidRes[0].uuid_machine_import;
        for (const m of machines) {
          const [mId] = await connection.query(
            "SELECT id_machine FROM tb_machine WHERE uuid_machine = ?",
            [m.uuid_machine]
          );
          if (mId.length > 0)
            await connection.query(
              `INSERT INTO tb_machine_import_detail (id_machine_import, id_machine, note, created_by, updated_by) VALUES (?, ?, ?, ?, ?)`,
              [ticketId, mId[0].id_machine, m.note, userId, userId]
            );
        }
      } else if (category === "export") {
        const [resExport] = await connection.query(
          `INSERT INTO tb_machine_export (to_location_id, export_type, export_date, status, note, created_by, updated_by, attached_file, approval_flow, is_borrowed_or_rented_or_borrowed_out_name, is_borrowed_or_rented_or_borrowed_out_date, is_borrowed_or_rented_or_borrowed_out_return_date, expansion_field) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            to_location_id,
            type,
            dateFormatted,
            note,
            userId,
            userId,
            attachedFileString,
            approvalFlowJson,
            is_borrowed_or_rented_or_borrowed_out_name,
            is_borrowed_or_rented_or_borrowed_out_date,
            is_borrowed_or_rented_or_borrowed_out_return_date,
            expansionFieldJson,
          ]
        );
        ticketId = resExport.insertId;
        const [uuidRes] = await connection.query(
          "SELECT uuid_machine_export FROM tb_machine_export WHERE id_machine_export = ?",
          [ticketId]
        );
        newTicketUuid = uuidRes[0].uuid_machine_export;
        for (const m of machines) {
          const [mId] = await connection.query(
            "SELECT id_machine FROM tb_machine WHERE uuid_machine = ?",
            [m.uuid_machine]
          );
          if (mId.length > 0)
            await connection.query(
              `INSERT INTO tb_machine_export_detail (id_machine_export, id_machine, note, created_by, updated_by) VALUES (?, ?, ?, ?, ?)`,
              [ticketId, mId[0].id_machine, m.note, userId, userId]
            );
        }
      } else if (category === "internal") {
        // Xác định status dựa trên luồng duyệt
        // Nếu cùng phòng ban (chỉ có 1 người duyệt) -> 'pending_approval' (Chờ duyệt)
        // Nếu khác phòng ban (có nhiều người duyệt) -> 'pending_confirmation' (Chờ xác nhận)
        const transferStatus =
          user_phongban_id === dest_phongban_id
            ? "pending_approval"
            : "pending_confirmation";

        const [resTransfer] = await connection.query(
          `INSERT INTO tb_machine_internal_transfer (
             to_location_id, transfer_date, status, note, created_by, updated_by, attached_file, approval_flow, target_status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            to_location_id,
            dateFormatted,
            transferStatus,
            note,
            userId,
            userId,
            attachedFileString,
            approvalFlowJson,
            target_status || null,
          ]
        );
        ticketId = resTransfer.insertId;
        const [uuidRes] = await connection.query(
          "SELECT uuid_machine_internal_transfer FROM tb_machine_internal_transfer WHERE id_machine_internal_transfer = ?",
          [ticketId]
        );
        newTicketUuid = uuidRes[0].uuid_machine_internal_transfer;
        for (const m of machines) {
          const [mId] = await connection.query(
            "SELECT id_machine FROM tb_machine WHERE uuid_machine = ?",
            [m.uuid_machine]
          );
          if (mId.length > 0)
            await connection.query(
              `INSERT INTO tb_machine_internal_transfer_detail (id_machine_internal_transfer, id_machine, note, created_by, updated_by) VALUES (?, ?, ?, ?, ?)`,
              [ticketId, mId[0].id_machine, m.note, userId, userId]
            );
        }
      }

      // --- 6. GỬI SANG EXTERNAL API ---
      // A. Query lại đầy đủ thông tin máy từ database
      const machineUuids = machines.map((m) => m.uuid_machine);
      const [machineDetails] = await connection.query(
        `SELECT 
          uuid_machine,
          type_machine,
          attribute_machine,
          model_machine,
          serial_machine
        FROM tb_machine 
        WHERE uuid_machine IN (?)`,
        [machineUuids]
      );

      // Tạo map để tra cứu nhanh
      const machineMap = {};
      machineDetails.forEach((m) => {
        machineMap[m.uuid_machine] = m;
      });

      // B. Nhóm các máy theo Type + Attribute + Model
      const groupedMachines = {};

      machines.forEach((m) => {
        // Lấy thông tin đầy đủ từ database
        const machineInfo = machineMap[m.uuid_machine];
        if (!machineInfo) return; // Bỏ qua nếu không tìm thấy

        const typeMachine = machineInfo.type_machine || "";
        const attributeMachine = machineInfo.attribute_machine || "";
        const modelMachine = machineInfo.model_machine || "";
        const serialMachine = machineInfo.serial_machine || "";

        const key = `${typeMachine}|${attributeMachine}|${modelMachine}`;

        if (!groupedMachines[key]) {
          // Tạo tên thiết bị kèm attribute nếu có
          let deviceName = typeMachine;
          if (attributeMachine) {
            deviceName = `${deviceName} ${attributeMachine}`;
          }

          groupedMachines[key] = {
            name: deviceName.trim() || "",
            model: modelMachine,
            unit: "Máy",
            count: 0,
            serials: [],
            notes: [],
          };
        }

        groupedMachines[key].count += 1;
        if (serialMachine) {
          groupedMachines[key].serials.push(serialMachine);
        }
        if (m.note) {
          groupedMachines[key].notes.push(m.note);
        }
      });

      // B. Tạo rows từ dữ liệu đã nhóm
      const tableRows = Object.values(groupedMachines).map((group, index) => {
        const serialsString = group.serials.join(", ");
        const notesString = [...new Set(group.notes)].join("; "); // Gộp note và bỏ trùng lặp

        return [
          index + 1, // STT
          group.name, // Tên thiết bị
          group.model, // Model
          serialsString, // Serial
          group.unit, // ĐVT
          group.count, // Số lượng yêu cầu
          group.count, // Số lượng thực xuất
          notesString, // Ghi chú
        ];
      });

      // C. Thêm dòng Tổng
      const totalMachines = machines.length;
      tableRows.push([
        "",
        "Tổng",
        "",
        "",
        "Máy",
        totalMachines,
        totalMachines,
        "",
      ]);

      let idGroupNotification = null;
      if (category === "internal" && to_department_name) {
        const deptNameLower = to_department_name.toLowerCase();

        // Nhóm Xưởng 1, 2, 3 -> Gửi cho 00024 (Theo yêu cầu của bạn)
        if (
          deptNameLower.includes("xưởng 1") ||
          deptNameLower.includes("xưởng 2") ||
          deptNameLower.includes("xưởng 3")
        ) {
          // idGroupNotification = ["00024"];
          idGroupNotification = ["10107"];
        }
        // Nhóm Xưởng 4 -> Gửi cho 09802
        else if (deptNameLower.includes("xưởng 4")) {
          // idGroupNotification = ["02722"];
          idGroupNotification = ["09802"];
        } else if (deptNameLower.includes("kho thành phẩm")) {
          // idGroupNotification = ["00253"];
          idGroupNotification = ["09802"];
        } else if (
          deptNameLower.includes("kho nguyên phụ liệu") ||
          deptNameLower.includes("xưởng cắt")
        ) {
          // idGroupNotification = ["90200"];
          idGroupNotification = ["09802"];
        }
      }

      const externalPayload = {
        uid_proposal_type: targetUidProposalType,
        ma_nv: ma_nv_login,
        name_proposal_reality: proposalName,
        id_department: id_department_str,
        uid_reference_success:
          // "https://sveffmachine.vietlonghung.com.vn/api/tpm/api/test-proposals/callback",
          "http://192.168.1.61:8081/api/test-proposals/callback",
        id_reference_outside: newTicketUuid,
        group_people_flow: approvalFlowForExternal,
        attacted_file:
          attachedLinksForExternal.length > 0 ? attachedLinksForExternal : null,
        table: {
          columns: [
            "STT",
            "Tên thiết bị",
            "Số hiệu/Model",
            "Số máy/Serial",
            "ĐVT",
            "SL Yêu cầu",
            "SL Thực xuất",
            "Ghi chú",
          ],
          columnWidths: [2.0, 3.0, 4.0, 4.0, 2.0, 2.0, 2.0, 5.0],
          rows: tableRows,
        },
        ...(expansionField.length > 0 && { expansion_field: expansionField }),
        ...(idGroupNotification && {
          id_group_people_notification_outside: idGroupNotification,
        }),
      };

      try {
        console.log(
          "Sending to External API:",
          JSON.stringify(externalPayload, null, 2)
        );
        const externalResponse = await axios.post(
          // "https://servertienich.vietlonghung.com.vn/api/fw/create-proposal-reality-outdoor",
          "http://192.168.0.94:16002/api/fw/create-proposal-reality-outdoor",
          externalPayload
        );
        console.log("External API Response:", externalResponse.data);
      } catch (extError) {
        console.error("Error calling External API:", extError.message);
        if (extError.response?.data?.message) {
          console.error(
            "Error calling External API detail:",
            extError.response.data.message
          );
        }

        // Nếu gọi Fastwork lỗi thì rollback, KHÔNG tạo phiếu trong hệ thống TPM
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message:
            "Lỗi khi gửi phiếu sang hệ thống Fastwork, phiếu chưa được tạo, vui lòng tạo lại.",
          error: extError.message,
        });
      }

      await connection.commit();
      return res.json({
        success: true,
        message: "Tạo phiếu thử nghiệm và gửi duyệt thành công",
        data: { local_uuid: newTicketUuid },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error creating test proposal:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi tạo phiếu",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  }
);

// POST /api/test-proposals/callback - Callback từ hệ thống duyệt
app.post("/api/test-proposals/callback", async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    console.log("\n>>> NHAN DU LIEU CUA CHI HAI <<<");
    console.log("Body Data:", JSON.stringify(req.body, null, 2));
    const { id_refer, status: externalStatus, arrayApprovalFlow } = req.body;

    if (!id_refer) {
      return res
        .status(400)
        .json({ success: false, message: "Missing id_refer" });
    }

    await connection.beginTransaction();

    // 1. Xác định phiếu và LẤY LUỒNG DUYỆT CŨ
    let table = "";
    let idCol = "";
    let ticketId = null;
    let ticketType = "";
    let ticketInfo = null;
    let currentFlowJson = null;

    // Kiểm tra Import
    const [importCheck] = await connection.query(
      "SELECT id_machine_import, approval_flow, created_by, import_type, to_location_id, is_borrowed_or_rented_or_borrowed_out_name, is_borrowed_or_rented_or_borrowed_out_date, is_borrowed_or_rented_or_borrowed_out_return_date FROM tb_machine_import WHERE uuid_machine_import = ?",
      [id_refer]
    );
    if (importCheck.length > 0) {
      table = "tb_machine_import";
      idCol = "id_machine_import";
      ticketId = importCheck[0].id_machine_import;
      ticketType = "import";
      ticketInfo = importCheck[0];
      currentFlowJson = importCheck[0].approval_flow;
    } else {
      // Kiểm tra Export
      const [exportCheck] = await connection.query(
        "SELECT id_machine_export, approval_flow, created_by, export_type, to_location_id, is_borrowed_or_rented_or_borrowed_out_name, is_borrowed_or_rented_or_borrowed_out_date, is_borrowed_or_rented_or_borrowed_out_return_date FROM tb_machine_export WHERE uuid_machine_export = ?",
        [id_refer]
      );
      if (exportCheck.length > 0) {
        table = "tb_machine_export";
        idCol = "id_machine_export";
        ticketId = exportCheck[0].id_machine_export;
        ticketType = "export";
        ticketInfo = exportCheck[0];
        currentFlowJson = exportCheck[0].approval_flow;
      } else {
        // Kiểm tra Internal
        const [internalCheck] = await connection.query(
          "SELECT id_machine_internal_transfer, approval_flow, created_by, to_location_id, target_status FROM tb_machine_internal_transfer WHERE uuid_machine_internal_transfer = ?",
          [id_refer]
        );
        if (internalCheck.length > 0) {
          table = "tb_machine_internal_transfer";
          idCol = "id_machine_internal_transfer";
          ticketId = internalCheck[0].id_machine_internal_transfer;
          ticketType = "internal";
          ticketInfo = internalCheck[0];
          currentFlowJson = internalCheck[0].approval_flow;
        }
      }
    }

    // Kiểm tra Inventory Check
    if (!table) {
      const [invCheck] = await connection.query(
        "SELECT id_inventory_check, approval_flow, created_by, status FROM tb_inventory_check WHERE uuid_inventory_check = ?",
        [id_refer]
      );
      if (invCheck.length > 0) {
        table = "tb_inventory_check";
        idCol = "id_inventory_check";
        ticketId = invCheck[0].id_inventory_check;
        ticketType = "inventory";
        ticketInfo = invCheck[0];
        currentFlowJson = invCheck[0].approval_flow;
      }
    }

    if (!table) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    // 2. Xử lý Luồng Duyệt Mới
    let newFlowToSave = [];

    if (arrayApprovalFlow && Array.isArray(arrayApprovalFlow)) {
      // a. Lấy Map luồng cũ để KẾ THỪA thuộc tính is_forward [THAY ĐỔI QUAN TRỌNG]
      let oldFlowMap = new Map(); // Map<ma_nv, stepObject>
      try {
        const oldFlow =
          typeof currentFlowJson === "string"
            ? JSON.parse(currentFlowJson)
            : currentFlowJson;
        if (Array.isArray(oldFlow)) {
          oldFlow.forEach((step) => {
            // Lưu lại thông tin step cũ vào Map với key là ma_nv
            oldFlowMap.set(step.ma_nv, step);
          });
        }
      } catch (e) {
        console.error("Error parsing old flow:", e);
      }

      // b. Tìm các bước đã hoàn tất
      const stepsApproved = new Set();
      arrayApprovalFlow.forEach((item) => {
        if (item.is_approval_flow === 1) {
          stepsApproved.add(item.step_flow);
        }
      });

      // c. Map dữ liệu mới
      newFlowToSave = arrayApprovalFlow.map((item) => {
        let statusText = item.status_text || "Đang chờ duyệt";
        let isForward = 0;

        // LOGIC 1: Xác định is_forward (KẾ THỪA hoặc TẠO MỚI) [THAY ĐỔI QUAN TRỌNG]
        if (oldFlowMap.has(item.ma_nv)) {
          // Nếu người này ĐÃ CÓ trong DB, giữ nguyên giá trị is_forward cũ của họ
          // (Để tránh việc họ duyệt xong bị mất chip Chuyển tiếp)
          const oldStep = oldFlowMap.get(item.ma_nv);
          isForward = oldStep.is_forward || 0;
        } else {
          // Nếu người này CHƯA CÓ trong DB => Là người mới được thêm vào => is_forward = 1
          isForward = 1;
        }

        // LOGIC 2: Đánh dấu Đồng cấp đã duyệt
        if (stepsApproved.has(item.step_flow) && item.is_approval_flow !== 1) {
          statusText = "Đồng cấp đã duyệt";
        }

        return {
          ma_nv: item.ma_nv,
          ten_nv: item.ten_nv,
          step_flow: item.step_flow,
          isFinalFlow: item.isFinalFlow,
          status_text: statusText,
          is_forward: isForward,
        };
      });
    }

    // 3. Map trạng thái chung
    let internalStatus = "pending";
    const statusLower = externalStatus ? externalStatus.toLowerCase() : "";

    if (
      statusLower.includes("đã duyệt") ||
      statusLower.includes("hoàn thành") ||
      statusLower.includes("completed")
    ) {
      internalStatus = "completed";
    } else if (
      statusLower.includes("hủy") ||
      statusLower.includes("từ chối") ||
      statusLower.includes("cancelled")
    ) {
      internalStatus = "cancelled";
    } else {
      internalStatus =
        table === "tb_machine_internal_transfer"
          ? "pending_approval"
          : "pending";
    }

    // 4. Cập nhật Database
    await connection.query(
      `UPDATE ${table} SET approval_flow = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE ${idCol} = ?`,
      [JSON.stringify(newFlowToSave), internalStatus, ticketId]
    );

    // 5. Logic hoàn thành phiếu
    if (internalStatus === "completed") {
      if (ticketType === "inventory") {
        // Xử lý cập nhật vị trí cho các máy bị lệch trong phiếu kiểm kê
        const [details] = await connection.query(
          "SELECT scanned_result FROM tb_inventory_check_detail WHERE id_inventory_check = ?",
          [ticketId]
        );

        const updaterId = ticketInfo.created_by || 99999;

        for (const det of details) {
          if (!det.scanned_result) continue;

          let locationsArr = [];
          try {
            const parsed =
              typeof det.scanned_result === "string"
                ? JSON.parse(det.scanned_result)
                : det.scanned_result;

            if (Array.isArray(parsed)) {
              locationsArr = parsed;
            } else if (
              parsed &&
              parsed.locations &&
              Array.isArray(parsed.locations)
            ) {
              locationsArr = parsed.locations;
            } else {
              locationsArr = [];
            }
          } catch (e) {
            locationsArr = [];
          }

          if (Array.isArray(locationsArr)) {
            for (const loc of locationsArr) {
              // Get correct location ID from location_uuid
              const [correctLocationIdResult] = await connection.query(
                "SELECT id_location FROM tb_location WHERE uuid_location = ?",
                [loc.location_uuid]
              );

              if (correctLocationIdResult.length === 0) continue;
              const correctLocationId = correctLocationIdResult[0].id_location;

              if (loc.scanned_machine && Array.isArray(loc.scanned_machine)) {
                for (const m of loc.scanned_machine) {
                  // Chỉ cập nhật nếu máy bị SAI VỊ TRÍ (mislocation = "1")
                  if (m.mislocation === "1") {
                    const [mIdRes] = await connection.query(
                      "SELECT id_machine FROM tb_machine WHERE uuid_machine = ?",
                      [m.uuid]
                    );
                    if (mIdRes.length > 0) {
                      const idMachine = mIdRes[0].id_machine;

                      // 1. Lấy vị trí cũ để ghi log
                      const [oldLoc] = await connection.query(
                        "SELECT id_location FROM tb_machine_location WHERE id_machine = ?",
                        [idMachine]
                      );
                      const idFrom =
                        oldLoc.length > 0 ? oldLoc[0].id_location : null;

                      // 2. Insert History
                      await connection.query(
                        `INSERT INTO tb_machine_location_history (id_machine, id_from_location, id_to_location, move_date, created_by, updated_by) VALUES (?, ?, ?, CURDATE(), ?, ?)`,
                        [
                          idMachine,
                          idFrom,
                          correctLocationId,
                          updaterId,
                          updaterId,
                        ]
                      );

                      // 3. Update Location
                      if (idFrom === null) {
                        await connection.query(
                          `INSERT INTO tb_machine_location (id_machine, id_location, created_by, updated_by) VALUES (?, ?, ?, ?)`,
                          [idMachine, correctLocationId, updaterId, updaterId]
                        );
                      } else {
                        await connection.query(
                          `UPDATE tb_machine_location SET id_location = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id_machine = ?`,
                          [correctLocationId, updaterId, idMachine]
                        );
                      }

                      // 4. Xác định trạng thái mới dựa trên vị trí
                      const [newLocationInfo] = await connection.query(
                        "SELECT name_location FROM tb_location WHERE id_location = ?",
                        [correctLocationId]
                      );
                      const newLocationName =
                        newLocationInfo[0]?.name_location?.toLowerCase() || "";

                      let newStatus = null;
                      // Nếu chuyển vào KHO → trạng thái "available"
                      if (newLocationName.includes("kho")) {
                        newStatus = "available";
                      }
                      // Nếu chuyển vào CHUYỀN/XƯỞng → trạng thái "in_use"
                      else if (
                        newLocationName.includes("chuyền") ||
                        newLocationName.includes("xưởng")
                      ) {
                        newStatus = "in_use";
                      }

                      // 5. Update machine status và timestamp
                      if (newStatus) {
                        await connection.query(
                          `UPDATE tb_machine SET current_status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id_machine = ?`,
                          [newStatus, updaterId, idMachine]
                        );
                      } else {
                        await connection.query(
                          `UPDATE tb_machine SET updated_at = CURRENT_TIMESTAMP WHERE id_machine = ?`,
                          [idMachine]
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else if (ticketType === "internal") {
        const [locRes] = await connection.query(
          "SELECT name_location FROM tb_location WHERE id_location = ?",
          [ticketInfo.to_location_id]
        );
        const locationName = locRes[0]?.name_location || "";
        const updaterId = ticketInfo.created_by || 99999;

        await handleInternalTransferApproval(
          connection,
          ticketId,
          ticketInfo.to_location_id,
          locationName,
          updaterId,
          ticketInfo.target_status
        );
      } else {
        const [locRes] = await connection.query(
          "SELECT name_location FROM tb_location WHERE id_location = ?",
          [ticketInfo.to_location_id]
        );
        const locationName = locRes[0]?.name_location || "";

        const ticketBorrowInfo = {
          name: ticketInfo.is_borrowed_or_rented_or_borrowed_out_name,
          date: ticketInfo.is_borrowed_or_rented_or_borrowed_out_date,
          return_date:
            ticketInfo.is_borrowed_or_rented_or_borrowed_out_return_date,
        };

        const updaterId = ticketInfo.created_by || 99999;

        await updateMachineLocationAndStatus(
          connection,
          ticketType,
          ticketId,
          ticketInfo.to_location_id,
          locationName,
          internalStatus,
          ticketInfo.import_type || ticketInfo.export_type,
          ticketBorrowInfo,
          updaterId
        );
      }
    }

    await connection.commit();
    res
      .status(200)
      .json({ success: true, message: "Callback processed successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error processing callback:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  } finally {
    connection.release();
  }
});

// MARK: INVENTORY CHECKS

// GET /api/inventory-checks - Lấy danh sách phiếu kiểm kê
app.get("/api/inventory-checks", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || "";
    const date_from = req.query.date_from || "";
    const date_to = req.query.date_to || "";
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push(`i.status = ?`);
      params.push(status);
    }

    if (date_from) {
      whereConditions.push(`DATE(i.check_date) >= ?`);
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push(`DATE(i.check_date) <= ?`);
      params.push(date_to);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Count total
    const [countResult] = await tpmConnection.query(
      `SELECT COUNT(*) as total FROM tb_inventory_check i ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get data
    const [inventories] = await tpmConnection.query(
      `
      SELECT 
        i.uuid_inventory_check,
        i.check_date,
        i.status,
        i.note,
        i.created_at,
        i.updated_at,
        i.approval_flow,
        (SELECT COUNT(*) FROM tb_inventory_check_detail d WHERE d.id_inventory_check = i.id_inventory_check) as department_count,
        (SELECT COUNT(*) FROM tb_inventory_check_detail d WHERE d.id_inventory_check = i.id_inventory_check AND d.is_completed = 1) as completed_department_count,
        (
            SELECT GROUP_CONCAT(DISTINCT dep.name_department SEPARATOR ', ')
            FROM tb_inventory_check_detail d
            JOIN tb_department dep ON d.id_department = dep.id_department
            WHERE d.id_inventory_check = i.id_inventory_check
        ) as department_names
      FROM tb_inventory_check i
      ${whereClause}
      ORDER BY i.check_date DESC, i.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    // Enrich approval flow names and fetch details for each inventory
    const enrichedInventories = await Promise.all(
      inventories.map(async (item) => {
        if (item.approval_flow) {
          item.approval_flow = await enrichApprovalFlowWithNames(
            item.approval_flow
          );
        }

        // Fetch details (departments) for this inventory
        const [details] = await tpmConnection.query(
          `
          SELECT 
            d.id_department,
            d.is_completed,
            d.scanned_result,
            dep.name_department,
            dep.uuid_department,
            dep.id_phong_ban
          FROM tb_inventory_check_detail d
          JOIN tb_department dep ON dep.id_department = d.id_department
          WHERE d.id_inventory_check = (
            SELECT id_inventory_check FROM tb_inventory_check WHERE uuid_inventory_check = ?
          )
          `,
          [item.uuid_inventory_check]
        );

        item.inventoryDetails = details;

        return item;
      })
    );

    res.json({
      success: true,
      message: "Inventory checks retrieved successfully",
      data: enrichedInventories,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("Error fetching inventory checks:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory-checks/stats - Get inventory ticket statistics
app.get("/api/inventory-checks/stats", authenticateToken, async (req, res) => {
  try {
    // Get counts by status
    const [statusStats] = await tpmConnection.query(
      `
      SELECT 
        status,
        COUNT(*) as count
      FROM tb_inventory_check
      GROUP BY status
      `
    );

    // Transform to object format
    const stats = {
      draft: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    statusStats.forEach((row) => {
      if (row.status === "draft") {
        stats.draft = row.count;
      } else if (
        row.status === "pending" ||
        row.status === "pending_approval"
      ) {
        stats.pending += row.count;
      } else if (row.status === "completed") {
        stats.completed = row.count;
      } else if (row.status === "cancelled") {
        stats.cancelled = row.count;
      }
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Helper: Loại máy có uuid/uuid_machine bắt đầu "NOT_FOUND" khỏi scanned_result (không đếm trong thống kê)
function filterScannedResultExcludeNotFound(scannedResult) {
  if (scannedResult == null) return scannedResult;
  try {
    let parsed =
      typeof scannedResult === "string"
        ? JSON.parse(scannedResult)
        : scannedResult;
    const excludeNotFound = (m) => {
      const u = m?.uuid ?? m?.uuid_machine;
      return !u || !String(u).startsWith("NOT_FOUND");
    };
    let locations = Array.isArray(parsed) ? parsed : parsed?.locations || [];
    locations = locations.map((loc) => ({
      ...loc,
      scanned_machine: (loc.scanned_machine || []).filter(excludeNotFound),
    }));
    if (Array.isArray(parsed)) return locations;
    return { ...parsed, locations };
  } catch (e) {
    return scannedResult;
  }
}

// GET /api/inventory-checks/:uuid - Lấy chi tiết phiếu kiểm kê
app.get("/api/inventory-checks/:uuid", authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;

    // 1. Get Inventory Info
    const [inventory] = await tpmConnection.query(
      `
      SELECT 
        i.*,
        nv.ma_nv AS creator_ma_nv,
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
        END AS creator_ma_nv,
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
        END AS creator_ten_nv
      FROM tb_inventory_check i
      LEFT JOIN ${process.env.DATA_HITIMESHEET_DATABASE}.sync_nhan_vien nv ON nv.id = i.created_by
      WHERE i.uuid_inventory_check = ?
      `,
      [uuid]
    );

    if (inventory.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory check not found" });
    }

    const ticket = inventory[0];
    if (ticket.approval_flow) {
      ticket.approval_flow = await enrichApprovalFlowWithNames(
        ticket.approval_flow
      );
    }
    const idInventory = ticket.id_inventory_check;

    // 2. Get Details (Departments) with total locations count
    const [details] = await tpmConnection.query(
      `
      SELECT 
        d.id_department,
        d.is_completed,
        d.scanned_result,
        dep.name_department,
        dep.uuid_department,
        dep.id_phong_ban,
        (SELECT COUNT(*) FROM tb_location WHERE id_department = d.id_department) as total_locations,
        (
            SELECT COUNT(m.id_machine) 
            FROM tb_machine_location ml
            JOIN tb_location tl ON ml.id_location = tl.id_location
            JOIN tb_machine m ON ml.id_machine = m.id_machine
            WHERE tl.id_department = d.id_department
              AND m.current_status != 'liquidation'
              AND (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out NOT IN ('borrowed_return', 'rented_return'))
        ) as total_machines_system
      FROM tb_inventory_check_detail d
      JOIN tb_department dep ON dep.id_department = d.id_department
      WHERE d.id_inventory_check = ?
      `,
      [idInventory]
    );

    // Loại máy uuid bắt đầu NOT_FOUND khỏi scanned_result để không đếm trong thống kê
    const detailsForResponse = details.map((d) => {
      const filtered =
        d.scanned_result != null
          ? filterScannedResultExcludeNotFound(d.scanned_result)
          : d.scanned_result;
      return { ...d, scanned_result: filtered };
    });

    res.json({
      success: true,
      data: {
        inventory: ticket,
        details: detailsForResponse,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory detail:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/inventory-checks - Tạo phiếu kiểm kê
app.post("/api/inventory-checks", authenticateToken, async (req, res) => {
  const connection = await tpmConnection.getConnection();
  try {
    await connection.beginTransaction();

    const { check_date, note, department_uuids } = req.body;
    const userId = req.user.id;

    if (!check_date || !department_uuids || department_uuids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Ngày kiểm và danh sách đơn vị là bắt buộc",
      });
    }

    // 1. Insert Master Ticket
    const [result] = await connection.query(
      `INSERT INTO tb_inventory_check (check_date, status, note, created_by, updated_by) VALUES (?, 'draft', ?, ?, ?)`,
      [check_date, note || null, userId, userId]
    );
    const inventoryId = result.insertId;

    // 2. Insert Details (Departments)
    const [departments] = await connection.query(
      `SELECT id_department FROM tb_department WHERE uuid_department IN (?)`,
      [department_uuids]
    );

    if (departments.length === 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Đơn vị không hợp lệ" });
    }

    for (const dep of departments) {
      // Lấy tổng toàn đơn vị
      const [countRes] = await connection.query(
        `SELECT COUNT(m.id_machine) as total 
         FROM tb_machine_location ml 
         JOIN tb_location tl ON ml.id_location = tl.id_location 
         JOIN tb_machine m ON ml.id_machine = m.id_machine
         WHERE tl.id_department = ?
           AND m.current_status != 'liquidation'
           AND (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out NOT IN ('borrowed_return', 'rented_return'))`,
        [dep.id_department]
      );
      const snapshotCount = countRes[0]?.total || 0;

      // Lấy chi tiết từng vị trí (uuid_location -> count)
      const [locSnapshots] = await connection.query(
        `SELECT tl.uuid_location, COUNT(m.id_machine) as count
         FROM tb_location tl
         LEFT JOIN tb_machine_location ml ON tl.id_location = ml.id_location
         LEFT JOIN tb_machine m ON ml.id_machine = m.id_machine 
              AND m.current_status != 'liquidation'
              AND (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out NOT IN ('borrowed_return', 'rented_return'))
         WHERE tl.id_department = ?
         GROUP BY tl.id_location`,
        [dep.id_department]
      );
      const locationSnapshotsMap = {};
      locSnapshots.forEach((l) => {
        locationSnapshotsMap[l.uuid_location] = l.count;
      });

      const initialData = {
        snapshot_count: snapshotCount,
        location_snapshots: locationSnapshotsMap,
        locations: [],
      };

      await connection.query(
        `INSERT INTO tb_inventory_check_detail (id_inventory_check, id_department, created_by, updated_by, scanned_result) VALUES (?, ?, ?, ?, ?)`,
        [
          inventoryId,
          dep.id_department,
          userId,
          userId,
          JSON.stringify(initialData),
        ]
      );
    }

    await connection.commit();
    res
      .status(201)
      .json({ success: true, message: "Tạo phiếu kiểm kê thành công" });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating inventory:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/inventory-checks/:uuid/scan - Lưu kết quả kiểm kê cho 1 vị trí trong 1 đơn vị
app.post(
  "/api/inventory-checks/:uuid/scan",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      const { uuid } = req.params;
      const { department_uuid, location_uuid, scanned_machines } = req.body;
      const userId = req.user.id;

      // 1. Get IDs
      const [invRes] = await connection.query(
        "SELECT id_inventory_check, status FROM tb_inventory_check WHERE uuid_inventory_check = ?",
        [uuid]
      );
      if (invRes.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Phiếu không tồn tại" });
      if (invRes[0].status !== "draft")
        return res.status(400).json({
          success: false,
          message: "Phiếu không ở trạng thái nháp, không thể cập nhật",
        });

      const idInventory = invRes[0].id_inventory_check;

      // 2. Resolve Department
      const [depRes] = await connection.query(
        "SELECT id_department FROM tb_department WHERE uuid_department = ?",
        [department_uuid]
      );
      if (depRes.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Đơn vị không tồn tại" });
      const idDepartment = depRes[0].id_department;

      // 3. Resolve Location
      const [locRes] = await connection.query(
        "SELECT id_location, name_location FROM tb_location WHERE uuid_location = ?",
        [location_uuid]
      );
      if (locRes.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Vị trí không tồn tại" });
      const idLocation = locRes[0].id_location;
      const locationName = locRes[0].name_location;

      // 4. Process Scanning Logic (So sánh vị trí)
      const scannedUuids = scanned_machines
        .map((m) => m.uuid_machine)
        .filter(Boolean);

      let dbMachines = [];
      if (scannedUuids.length > 0) {
        [dbMachines] = await connection.query(
          `
            SELECT 
                m.uuid_machine, 
                ml.id_location as current_location_id, 
                tl.name_location as current_location_name,
                tl.id_department as current_department_id
            FROM tb_machine m
            LEFT JOIN tb_machine_location ml ON ml.id_machine = m.id_machine
            LEFT JOIN tb_location tl ON tl.id_location = ml.id_location
            WHERE m.uuid_machine IN (?)
            `,
          [scannedUuids]
        );
      }

      const dbMachineMap = new Map(
        dbMachines.map((m) => [
          m.uuid_machine,
          {
            id: m.current_location_id,
            name: m.current_location_name,
            depId: m.current_department_id,
          },
        ])
      );

      // 5. Build Object cho Vị trí này
      const newLocationResult = {
        location_name: locationName,
        location_uuid: location_uuid,
        scanned_machine: scanned_machines.map((m) => {
          const currentData = dbMachineMap.get(m.uuid_machine);
          const currentLocationId = currentData?.id;
          const currentLocationName = currentData?.name || "-";
          const currentDepartmentId = currentData?.depId;
          // Chỉ khi vị trí hiện tại BẰNG CHÍNH XÁC với vị trí đang kiểm kê thì mới là "Đúng vị trí"
          // Nếu không có vị trí hoặc khác vị trí → Sai vị trí
          const isMislocation = currentLocationId === idLocation ? "0" : "1";
          let isMisdepartment = "0";
          if (currentDepartmentId != idDepartment) {
            isMisdepartment = "1";
          }

          return {
            uuid: m.uuid_machine,
            name: `${m.type_machine || ""} ${m.attribute_machine || ""} - ${
              m.model_machine || ""
            }`,
            serial: m.serial_machine,
            code: m.code_machine,
            RFID: m.RFID_machine,
            NFC: m.NFC_machine,
            current_location: currentLocationName,
            mislocation: isMislocation,
            misdepartment: isMisdepartment,
          };
        }),
      };

      // 6. Update JSON Array trong DB
      // Lấy scanned_result cũ
      const [currentDetail] = await connection.query(
        "SELECT scanned_result FROM tb_inventory_check_detail WHERE id_inventory_check = ? AND id_department = ?",
        [idInventory, idDepartment]
      );

      let resultArray = [];
      let currentData = {};

      try {
        if (currentDetail.length > 0 && currentDetail[0].scanned_result) {
          const parsed =
            typeof currentDetail[0].scanned_result === "string"
              ? JSON.parse(currentDetail[0].scanned_result)
              : currentDetail[0].scanned_result;

          if (Array.isArray(parsed)) {
            resultArray = parsed;
            currentData = { locations: parsed }; // Fallback cho data cũ
          } else if (parsed && typeof parsed === "object") {
            resultArray = parsed.locations || [];
            currentData = parsed; // Giữ lại toàn bộ data cũ (snapshot_count, location_snapshots)
          }
        }
      } catch (e) {
        resultArray = [];
        currentData = {};
      }

      // Tìm xem location này đã có trong mảng chưa
      const existingIndex = resultArray.findIndex(
        (item) => item.location_uuid === location_uuid
      );
      if (existingIndex >= 0) {
        // *** MERGE: Thêm máy mới vào danh sách cũ (không ghi đè) ***
        const existingMachines =
          resultArray[existingIndex].scanned_machine || [];
        const existingUuids = new Set(existingMachines.map((m) => m.uuid));

        // Chỉ thêm những máy chưa có trong danh sách
        const newMachines = newLocationResult.scanned_machine.filter(
          (m) => !existingUuids.has(m.uuid)
        );

        resultArray[existingIndex].scanned_machine = [
          ...existingMachines,
          ...newMachines,
        ];
      } else {
        // Thêm mới
        resultArray.push(newLocationResult);
      }

      const finalData = {
        ...currentData,
        locations: resultArray,
      };

      await connection.query(
        `UPDATE tb_inventory_check_detail 
         SET scanned_result = ?, 
             is_completed = 1,
             updated_by = ?, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id_inventory_check = ? AND id_department = ?`,
        [JSON.stringify(finalData), userId, idInventory, idDepartment]
      );

      res.json({ success: true, message: "Lưu kết quả kiểm kê thành công" });
    } catch (error) {
      console.error("Error saving scan result:", error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  }
);

// PUT /api/inventory-checks/:uuid/update-scanned - Cập nhật scanned_result (dùng khi xóa máy)
app.put(
  "/api/inventory-checks/:uuid/update-scanned",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      const { uuid } = req.params;
      const { department_uuid, scanned_result } = req.body;
      const userId = req.user.id;

      // 1. Get IDs
      const [invRes] = await connection.query(
        "SELECT id_inventory_check, status FROM tb_inventory_check WHERE uuid_inventory_check = ?",
        [uuid]
      );
      if (invRes.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Phiếu không tồn tại" });
      if (invRes[0].status !== "draft")
        return res.status(400).json({
          success: false,
          message: "Phiếu không ở trạng thái nháp, không thể cập nhật",
        });

      const idInventory = invRes[0].id_inventory_check;

      // 2. Resolve Department
      const [depRes] = await connection.query(
        "SELECT id_department FROM tb_department WHERE uuid_department = ?",
        [department_uuid]
      );
      if (depRes.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Đơn vị không tồn tại" });
      const idDepartment = depRes[0].id_department;

      // 3. Update scanned_result
      const [oldDataRes] = await connection.query(
        "SELECT scanned_result FROM tb_inventory_check_detail WHERE id_inventory_check = ? AND id_department = ?",
        [idInventory, idDepartment]
      );

      let currentData = {};
      try {
        if (oldDataRes.length > 0 && oldDataRes[0].scanned_result) {
          const parsed =
            typeof oldDataRes[0].scanned_result === "string"
              ? JSON.parse(oldDataRes[0].scanned_result)
              : oldDataRes[0].scanned_result;

          if (!Array.isArray(parsed)) {
            currentData = parsed;
          }
        }
      } catch (e) {}

      // scanned_result gửi lên từ frontend bây giờ chỉ là mảng locations (do frontend xử lý)
      // Ta đóng gói lại
      const finalData = {
        ...currentData,
        locations: scanned_result, // Body gửi lên là mảng locations sau khi xóa
      };

      await connection.query(
        `UPDATE tb_inventory_check_detail SET scanned_result = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id_inventory_check = ? AND id_department = ?`,
        [JSON.stringify(finalData), userId, idInventory, idDepartment]
      );

      res.json({
        success: true,
        message: "Cập nhật kết quả kiểm kê thành công",
      });
    } catch (error) {
      console.error("Error updating scan result:", error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  }
);

// POST /api/inventory-checks/:uuid/add-departments - Thêm đơn vị vào phiếu kiểm kê
app.post(
  "/api/inventory-checks/:uuid/add-departments",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();
      const { uuid } = req.params;
      const { department_uuids } = req.body;
      const userId = req.user.id;

      // 1. Validate input
      if (!Array.isArray(department_uuids) || department_uuids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn ít nhất một đơn vị",
        });
      }

      // 2. Get Inventory
      const [invRes] = await connection.query(
        "SELECT id_inventory_check, status FROM tb_inventory_check WHERE uuid_inventory_check = ?",
        [uuid]
      );
      if (invRes.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Phiếu không tồn tại" });
      }
      if (invRes[0].status !== "draft") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Chỉ có thể thêm đơn vị vào phiếu ở trạng thái nháp",
        });
      }

      const idInventory = invRes[0].id_inventory_check;

      // 3. Resolve Department IDs
      const [depRes] = await connection.query(
        "SELECT id_department, uuid_department FROM tb_department WHERE uuid_department IN (?)",
        [department_uuids]
      );

      if (depRes.length !== department_uuids.length) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Một số đơn vị không tồn tại",
        });
      }

      // 4. Check if departments already exist in this inventory
      const [existingDeps] = await connection.query(
        "SELECT id_department FROM tb_inventory_check_detail WHERE id_inventory_check = ? AND id_department IN (?)",
        [idInventory, depRes.map((d) => d.id_department)]
      );

      if (existingDeps.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Một số đơn vị đã có trong phiếu kiểm kê này",
        });
      }

      // 5. Insert new departments
      for (const dep of depRes) {
        const [countRes] = await connection.query(
          `SELECT COUNT(m.id_machine) as total 
           FROM tb_machine_location ml 
           JOIN tb_location tl ON ml.id_location = tl.id_location 
           JOIN tb_machine m ON ml.id_machine = m.id_machine
           WHERE tl.id_department = ?
             AND m.current_status != 'liquidation'
             AND (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out NOT IN ('borrowed_return', 'rented_return'))`,
          [dep.id_department]
        );
        const snapshotCount = countRes[0]?.total || 0;

        const [locSnapshots] = await connection.query(
          `SELECT tl.uuid_location, COUNT(m.id_machine) as count
           FROM tb_location tl
           LEFT JOIN tb_machine_location ml ON tl.id_location = ml.id_location
           LEFT JOIN tb_machine m ON ml.id_machine = m.id_machine 
                AND m.current_status != 'liquidation'
                AND (m.is_borrowed_or_rented_or_borrowed_out IS NULL OR m.is_borrowed_or_rented_or_borrowed_out NOT IN ('borrowed_return', 'rented_return'))
           WHERE tl.id_department = ?
           GROUP BY tl.id_location`,
          [dep.id_department]
        );
        const locationSnapshotsMap = {};
        locSnapshots.forEach((l) => {
          locationSnapshotsMap[l.uuid_location] = l.count;
        });

        const initialData = {
          snapshot_count: snapshotCount,
          location_snapshots: locationSnapshotsMap,
          locations: [],
        };

        await connection.query(
          `INSERT INTO tb_inventory_check_detail 
          (id_inventory_check, id_department, scanned_result, is_completed, created_by, updated_by) 
          VALUES (?, ?, ?, 0, ?, ?)`,
          [
            idInventory,
            dep.id_department,
            JSON.stringify(initialData),
            userId,
            userId,
          ]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Đã thêm ${depRes.length} đơn vị vào phiếu kiểm kê`,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error adding departments to inventory:", error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  }
);

// PUT /api/inventory-checks/:uuid/submit - Gửi duyệt
app.put(
  "/api/inventory-checks/:uuid/submit",
  authenticateToken,
  async (req, res) => {
    const connection = await tpmConnection.getConnection();
    try {
      await connection.beginTransaction();
      const { uuid } = req.params;
      const userId = req.user.id;
      const ma_nv_login = req.user.ma_nv;

      // 1. Get Inventory
      const [invRes] = await connection.query(
        "SELECT id_inventory_check, check_date, status, created_by FROM tb_inventory_check WHERE uuid_inventory_check = ?",
        [uuid]
      );
      if (invRes.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Phiếu không tồn tại" });
      const ticket = invRes[0];

      // 2. Validate: All departments must have at least one location scanned
      const [details] = await connection.query(
        "SELECT scanned_result FROM tb_inventory_check_detail WHERE id_inventory_check = ?",
        [ticket.id_inventory_check]
      );

      let hasEmptyDepartment = false;
      for (const det of details) {
        let scannedArr = [];
        try {
          const parsed =
            typeof det.scanned_result === "string"
              ? JSON.parse(det.scanned_result)
              : det.scanned_result;

          if (Array.isArray(parsed)) {
            scannedArr = parsed;
          } else if (
            parsed &&
            parsed.locations &&
            Array.isArray(parsed.locations)
          ) {
            scannedArr = parsed.locations;
          } else {
            scannedArr = [];
          }
        } catch (e) {
          scannedArr = [];
        }

        if (scannedArr.length === 0) {
          hasEmptyDepartment = true;
          break;
        }
      }

      if (hasEmptyDepartment) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Vui lòng kiểm kê ít nhất một vị trí cho mỗi đơn vị trước khi gửi duyệt.",
        });
      }

      // 3. Update Status -> pending
      const approvalFlowForDB = [
        {
          // ma_nv: "06264",
          ma_nv: "09802",
          step_flow: 0,
          isFinalFlow: 1,
          status_text: "Đang chờ duyệt",
          is_forward: 0,
          display_name: "Trưởng phòng Cơ điện",
          is_flow: 1,
          indexOf: 1,
        },
      ];

      await connection.query(
        `UPDATE tb_inventory_check SET status = 'pending', approval_flow = ?, updated_by = ? WHERE id_inventory_check = ?`,
        [JSON.stringify(approvalFlowForDB), userId, ticket.id_inventory_check]
      );

      // 4. Send to FastWork
      // Lấy thông tin đơn vị từ DB
      const [departmentDetails] = await connection.query(
        `
        SELECT 
          d.id_department,
          d.scanned_result,
          dep.name_department,
          dep.uuid_department
        FROM tb_inventory_check_detail d
        JOIN tb_department dep ON dep.id_department = d.id_department
        WHERE d.id_inventory_check = ?
        `,
        [ticket.id_inventory_check]
      );

      let tableRows = [];
      let stt = 1;

      departmentDetails.forEach((dept) => {
        let locationsArr = [];
        try {
          const parsed =
            typeof dept.scanned_result === "string"
              ? JSON.parse(dept.scanned_result)
              : dept.scanned_result;

          locationsArr = Array.isArray(parsed)
            ? parsed
            : parsed?.locations || [];
        } catch (e) {
          locationsArr = [];
        }

        // Phân loại máy theo cùng đơn vị hoặc khác đơn vị
        const sameDeptMislocations = {};
        const diffDeptMislocations = {};

        locationsArr.forEach((loc) => {
          const locationScannedName = loc.location_name;
          if (loc.scanned_machine && Array.isArray(loc.scanned_machine)) {
            loc.scanned_machine.forEach((m) => {
              const u = m.uuid || m.uuid_machine;
              // Bỏ qua máy không tồn tại hoặc máy đúng vị trí
              if (
                (u && String(u).startsWith("NOT_FOUND")) ||
                m.mislocation !== "1"
              ) {
                return;
              }

              const currentLoc = m.current_location || "Không xác định";
              const groupKey = `${m.name}|${currentLoc}|${locationScannedName}`;
              const isSameDept = m.misdepartment === "0";

              const targetGroup = isSameDept
                ? sameDeptMislocations
                : diffDeptMislocations;

              if (!targetGroup[groupKey]) {
                targetGroup[groupKey] = {
                  name: m.name,
                  current_location: currentLoc,
                  scanned_location: locationScannedName,
                  serials: [],
                  count: 0,
                };
              }

              targetGroup[groupKey].count += 1;
              if (m.serial) {
                targetGroup[groupKey].serials.push(m.serial);
              }
            });
          }
        });

        // Chỉ thêm đơn vị nếu có máy sai vị trí
        const hasMislocations =
          Object.keys(sameDeptMislocations).length > 0 ||
          Object.keys(diffDeptMislocations).length > 0;

        if (hasMislocations) {
          // Tính tổng số lượng máy từng loại
          const sameDeptTotal = Object.values(sameDeptMislocations).reduce(
            (sum, group) => sum + group.count,
            0
          );
          const diffDeptTotal = Object.values(diffDeptMislocations).reduce(
            (sum, group) => sum + group.count,
            0
          );

          // 1. Thêm hàng tiêu đề đơn vị
          tableRows.push([
            dept.name_department,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ]);

          // 2. Thêm các máy sai vị trí CÙNG đơn vị
          if (Object.keys(sameDeptMislocations).length > 0) {
            tableRows.push([
              "Các máy sai vị trí cùng đơn vị",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ]);

            Object.values(sameDeptMislocations).forEach((group) => {
              tableRows.push([
                stt++,
                group.name,
                group.serials.join(", "),
                "Máy",
                group.count,
                group.current_location,
                group.scanned_location,
                "Sai vị trí",
                "",
              ]);
            });
          }

          // 3. Thêm các máy sai vị trí KHÁC đơn vị
          if (Object.keys(diffDeptMislocations).length > 0) {
            tableRows.push([
              "Các máy sai vị trí khác đơn vị",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ]);

            Object.values(diffDeptMislocations).forEach((group) => {
              tableRows.push([
                stt++,
                group.name,
                group.serials.join(", "),
                "Máy",
                group.count,
                group.current_location,
                group.scanned_location,
                "Sai vị trí",
                "",
              ]);
            });
          }

          // 4. Thêm hàng thống kê SL máy sai vị trí cùng đơn vị
          if (Object.keys(sameDeptMislocations).length > 0) {
            tableRows.push([
              `Tổng SL máy sai vị trí cùng đơn vị ${dept.name_department}`,
              "",
              "",
              "",
              sameDeptTotal,
              "",
              "",
              "",
              "",
            ]);
          }

          // 5. Thêm hàng thống kê SL máy sai vị trí khác đơn vị
          if (Object.keys(diffDeptMislocations).length > 0) {
            tableRows.push([
              `Tổng SL máy sai vị trí khác đơn vị ${dept.name_department}`,
              "",
              "",
              "",
              diffDeptTotal,
              "",
              "",
              "",
              "",
            ]);
          }
        }
      });

      if (tableRows.length === 0) {
        tableRows.push([
          "",
          "Không có máy sai vị trí",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      }

      const externalPayload = {
        uid_proposal_type: "ead745eb-8499-46de-9740-ce14974f333b",
        ma_nv: ma_nv_login,
        name_proposal_reality: `Phiếu kiểm kê ngày ${new Date(
          ticket.check_date
        ).toLocaleDateString("vi-VN")}`,
        id_department: "1-14",
        uid_reference_success:
          // "https://sveffmachine.vietlonghung.com.vn/api/tpm/api/test-proposals/callback",
          "http://192.168.1.61:8081/api/test-proposals/callback",
        id_reference_outside: uuid,
        group_people_flow: approvalFlowForDB.map(
          ({ status_text, ...rest }) => rest
        ),
        table: {
          columns: [
            "STT",
            "Tên thiết bị",
            "Số máy/Serial",
            "ĐVT",
            "SL",
            "Vị trí hiện tại",
            "Vị trí quét được",
            "Trạng thái",
            "Ghi chú",
          ],
          columnWidths: [2, 4, 3, 2, 2, 3, 3, 3, 4],
          rows: tableRows,
        },
      };

      try {
        console.log(
          "Sending to External API:",
          JSON.stringify(externalPayload, null, 2)
        );
        const externalResponse = await axios.post(
          // "https://servertienich.vietlonghung.com.vn/api/fw/create-proposal-reality-outdoor",
          "http://192.168.0.94:16002/api/fw/create-proposal-reality-outdoor",
          externalPayload
        );
        console.log("External API Response:", externalResponse.data);
      } catch (extError) {
        console.error("Error calling External API:", extError.message);
        if (extError.response?.data?.message) {
          console.error(
            "Error calling External API detail:",
            extError.response.data.message
          );
        }
        // Nếu gọi Fastwork lỗi thì rollback, KHÔNG gửi và không đổi trạng thái phiếu kiểm kê
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message:
            "Lỗi khi gửi phiếu kiểm kê sang hệ thống Fastwork, phiếu chưa được gửi, vui lòng gửi lại.",
          error: extError.message,
        });
      }

      await connection.commit();
      return res.json({
        success: true,
        message: "Đã gửi phiếu kiểm kê đi duyệt",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error submitting inventory:", error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  }
);
