// frontend/src/pages/MachineListPage.jsx

import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Snackbar,
  AlertTitle,
  TableSortLabel,
  Menu,
  Checkbox,
  ListItemText,
  List,
  ListItem,
  ListItemIcon,
  Link,
} from "@mui/material";
import {
  PrecisionManufacturing,
  Search,
  Refresh,
  CheckCircle,
  Build,
  Cancel,
  Close,
  Save,
  QrCode2,
  Print,
  Download,
  Add,
  ReceiptLong,
  SwapHoriz,
  ViewColumn,
  FileUpload,
  CheckCircleOutline,
  ErrorOutline,
} from "@mui/icons-material";
import * as XLSX from "xlsx-js-style";
import { QRCodeSVG } from "qrcode.react";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api";

// Thêm style cho các trường bị disabled/filled để dễ nhận biết (từ yêu cầu trước)
const DISABLED_VIEW_SX = {
  // Ghi đè cho disabled
  "& .MuiInputBase-root.Mui-disabled": {
    backgroundColor: "#fffbe5 !important", // Nền vàng nhạt
    "& fieldset": {
      borderColor: "#f44336 !important", // Viền đỏ
    },
    "& .MuiInputBase-input": {
      color: "#f44336", // Chữ đỏ
      WebkitTextFillColor: "#f44336 !important", // Ghi đè màu chữ
      fontWeight: 600,
      opacity: 1, // Đảm bảo độ mờ không làm mờ chữ
    },
    "& .MuiFormLabel-root": {
      color: "#f44336 !important", // Nhãn đỏ
    },
  },
  // Ghi đè cho variant="filled" (khi disabled=false)
  "& .MuiFilledInput-root": {
    backgroundColor: "#fffbe5 !important",
    "& input": {
      color: "#f44336",
      fontWeight: 600,
    },
    "& .MuiFormLabel-root": {
      color: "#f44336",
    },
  },
};

// Column configuration for visibility toggle
const columnConfig = {
  code_machine: "Mã máy",
  type_machine: "Loại máy",
  model_machine: "Model",
  manufacturer: "Hãng SX",
  serial_machine: "Serial",
  RFID_machine: "RFID",
  name_category: "Loại",
  name_location: "Vị trí hiện tại",
  current_status: "Trạng thái (chính)",
  is_borrowed_or_rented_or_borrowed_out: "Trạng thái (mượn/thuê)",
  is_borrowed_or_rented_or_borrowed_out_name: "Đơn vị (mượn/thuê)",
  is_borrowed_or_rented_or_borrowed_out_date: "Ngày (mượn/thuê)",
  is_borrowed_or_rented_or_borrowed_out_return_date: "Ngày trả (mượn/thuê)",
  price: "Giá",
  lifespan: "Tuổi thọ (năm)",
  repair_cost: "Chi phí SC",
  date_of_use: "Ngày sử dụng",
};

// Initial visibility state
const initialColumnVisibility = {
  code_machine: true,
  type_machine: true,
  model_machine: true,
  manufacturer: true,
  serial_machine: true,
  RFID_machine: false,
  name_category: false,
  name_location: true,
  current_status: true,
  is_borrowed_or_rented_or_borrowed_out: true,
  is_borrowed_or_rented_or_borrowed_out_name: true,
  is_borrowed_or_rented_or_borrowed_out_date: true,
  is_borrowed_or_rented_or_borrowed_out_return_date: true,
  price: false,
  lifespan: false,
  repair_cost: false,
  date_of_use: true,
};

const MachineListPage = () => {
  const [machines, setMachines] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    in_use: 0,
    maintenance: 0,
    borrowed_out: 0,
    liquidation: 0,
    disabled: 0,
    rented: 0,
    borrowed: 0,
    borrowed_return: 0,
    rented_return: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isCreateMode, setIsCreateMode] = useState(false);

  // QR Code states
  const [showQRCode, setShowQRCode] = useState(false);

  // Notification states
  const [notification, setNotification] = useState({
    open: false,
    severity: "success", // 'success', 'error', 'warning', 'info'
    title: "",
    message: "",
  });

  // State for sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  // State for column visibility
  const [columnVisibility, setColumnVisibility] = useState(
    initialColumnVisibility
  );
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [machineHistory, setMachineHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [fileName, setFileName] = useState("");

  const fetchMachines = async (searchQuery = "") => {
    try {
      setLoading(true);
      setError(null);

      const result = await api.machines.getAll({
        page: page,
        limit: rowsPerPage,
        search: searchQuery,
      });

      if (result.success) {
        setMachines(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.message || "Failed to fetch machines");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error("Error fetching machines:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await api.machines.getStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchMachines(searchTerm);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      setPage(1); // Reset to first page on search
      fetchMachines(searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1); // Reset to first page when changing rows per page
  };

  const handleOpenDialog = async (uuid) => {
    try {
      setMachineHistory([]); // Đặt lại lịch sử
      setHistoryLoading(true);

      const result = await api.machines.getById(uuid);
      if (result.success) {
        setSelectedMachine(result.data);
        setEditedData(result.data);
        setIsCreateMode(false);
        setOpenDialog(true);
        try {
          const historyResult = await api.tracking.getMachineHistory(uuid);
          if (historyResult.success) {
            setMachineHistory(historyResult.data.history);
          } else {
            console.error("Failed to fetch history:", historyResult.message);
            setMachineHistory([]);
          }
        } catch (historyErr) {
          console.error("Error fetching machine history:", historyErr);
          setMachineHistory([]);
        } finally {
          setHistoryLoading(false); // Dừng tải lịch sử
        }
      }
    } catch (err) {
      console.error("Error fetching machine details:", err);
      setHistoryLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setSelectedMachine(null);
    setEditedData({
      code_machine: "",
      serial_machine: "",
      RFID_machine: "",
      type_machine: "",
      model_machine: "",
      manufacturer: "",
      price: "",
      date_of_use: "",
      lifespan: "",
      repair_cost: "",
      note: "",
      current_status: "available",
      id_category: 1, // Default category
      // Các trường is_borrowed... không cần khởi tạo vì form tạo mới không có
    });
    setIsCreateMode(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMachine(null);
    setEditedData({});
    setIsCreateMode(false);
    setShowQRCode(false);
    setMachineHistory([]);
    setHistoryLoading(false);
  };

  const handlePrintQRCode = () => {
    // Tạo nội dung HTML chỉ chứa QR code
    const qrCodeElement = document.getElementById("qr-code-svg");
    if (!qrCodeElement) return;

    const printWindow = window.open("", "_blank");
    const qrCodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>In mã QR - ${editedData.code_machine}</title>
          <style>
            @page {
              size: A6 landscape;
              margin: 8mm;
            }
            body {
              margin: 0;
              padding: 15px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: 15px;
              background: white;
              padding: 15px;
              border: 2px solid #000;
              border-radius: 8px;
              max-width: 100%;
            }
            .qr-code {
              flex-shrink: 0;
            }
            .qr-code svg {
              display: block;
              width: 120px !important;
              height: 120px !important;
            }
            .info {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 8px;
            }
            .code {
              font-size: 22px;
              font-weight: bold;
              color: #000;
              line-height: 1.2;
            }
            .serial {
              font-size: 20px;
              color: #000;
              font-weight: 600;
            }
            .name {
              font-size: 12px;
              color: #000;
              line-height: 1.3;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-container {
                border-color: #000;
                padding: 12px;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">
              ${qrCodeElement.outerHTML}
            </div>
            <div class="info">
              <div class="code">${editedData.code_machine || ""}</div>
              <div class="serial">Serial: ${
                editedData.name_category === "Máy móc thiết bị"
                  ? "MAY"
                  : "PHUKIEN"
              }-${editedData.serial_machine || ""}</div>
              <div class="name">${editedData.type_machine || ""} - ${
      editedData.model_machine || ""
    }</div> 
            </div>
          </div>
          <script>
            // Tự động in khi trang load xong
            window.onload = function() {
              window.print();
              // Đóng cửa sổ sau khi in (hoặc hủy)
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(qrCodeHTML);
    printWindow.document.close();
  };

  const handleDownloadQRCode = () => {
    // Tạo SVG element từ QR code
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    // Chuyển SVG thành canvas để download
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Download canvas as PNG
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${editedData.code_machine || "Machine"}_${
        editedData.serial_machine || "Serial"
      }.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleInputChange = (field, value) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const showNotification = (severity, title, message) => {
    setNotification({
      open: true,
      severity,
      title,
      message,
    });
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const validateMachineData = () => {
    const errors = [];

    if (!editedData.code_machine || editedData.code_machine.trim() === "") {
      errors.push("Mã máy");
    }
    if (!editedData.type_machine || editedData.type_machine.trim() === "") {
      errors.push("Loại máy");
    }
    // if (!editedData.model_machine || editedData.model_machine.trim() === "") {
    //   errors.push("Model máy");
    // }
    if (!editedData.serial_machine || editedData.serial_machine.trim() === "") {
      errors.push("Serial");
    }
    // MARK: E^E^E^E^E^E^E^E
    // if (!editedData.RFID_machine || editedData.RFID_machine.trim() === "") {
    //   errors.push("RFID");
    // }
    // if (!editedData.date_of_use || editedData.date_of_use.trim() === "") {
    //   errors.push("Ngày sử dụng");
    // }

    return errors;
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      const validationErrors = validateMachineData();
      if (validationErrors.length > 0) {
        showNotification(
          "error",
          "Vui lòng điền đầy đủ thông tin",
          `Các trường bắt buộc: ${validationErrors.join(", ")}`
        );
        return;
      }

      if (isCreateMode) {
        // Create new machine
        const result = await api.machines.create(editedData);
        if (result.success) {
          // Refresh the list
          fetchMachines(searchTerm);
          fetchStats();
          showNotification(
            "success",
            "Tạo máy móc thành công!",
            `Máy móc "${editedData.code_machine}" đã được thêm vào hệ thống`
          );
          handleCloseDialog();
        } else {
          showNotification(
            "error",
            "Tạo máy móc thất bại",
            result.message || "Đã xảy ra lỗi khi tạo máy móc"
          );
        }
      } else {
        // Update existing machine
        const result = await api.machines.update(
          selectedMachine.uuid_machine,
          editedData
        );
        if (result.success) {
          // Refresh the list
          fetchMachines(searchTerm);
          fetchStats();
          // Update selected machine with new data
          setSelectedMachine(result.data);
          setEditedData(result.data);
          showNotification(
            "success",
            "Cập nhật thành công!",
            `Thông tin máy móc "${editedData.code_machine}" đã được cập nhật`
          );
          handleCloseDialog();
        } else {
          showNotification(
            "error",
            "Cập nhật thất bại",
            result.message || "Đã xảy ra lỗi khi cập nhật máy móc"
          );
        }
      }
    } catch (err) {
      console.error("Error saving machine:", err);

      // Parse error message for more details
      let errorMessage = "Đã xảy ra lỗi không xác định";

      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.message || err.response.statusText;

        // Check for specific errors
        if (err.response.status === 400) {
          errorMessage = err.response.data?.message || "Dữ liệu không hợp lệ";
        } else if (err.response.status === 401) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại";
        } else if (err.response.status === 403) {
          errorMessage = "Bạn không có quyền thực hiện thao tác này";
        } else if (err.response.status === 404) {
          errorMessage = "Không tìm thấy máy móc";
        } else if (err.response.status >= 500) {
          errorMessage = "Lỗi máy chủ. Vui lòng thử lại sau";
        }
      } else if (err.request) {
        // Request was made but no response
        errorMessage =
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng";
      }

      showNotification(
        "error",
        isCreateMode ? "Lỗi khi tạo máy móc" : "Lỗi khi cập nhật máy móc",
        errorMessage
      );
    }
  };

  const excelHeaderMapping = {
    // Vietnamese Header : English JSON Key
    "Mã máy": "code_machine",
    Serial: "serial_machine",
    "Loại máy": "type_machine",
    "Model máy": "model_machine",
    "Hãng sản xuất": "manufacturer",
    RFID: "RFID_machine",
    "Giá (VNĐ)": "price",
    "Ngày sử dụng (DD/MM/YYYY)": "date_of_use",
    "Tuổi thọ (năm)": "lifespan",
    "Chi phí sửa chữa (VNĐ)": "repair_cost",
    "Ghi chú": "note",
    "Loại (Máy móc thiết bị/Phụ kiện)": "id_category",
  };
  // Lấy danh sách các cột bắt buộc (sẽ dùng để tô màu)
  const requiredHeaders = [
    "Mã máy",
    "Serial",
    "Loại máy",
    "Loại (Máy móc thiết bị/Phụ kiện)",
  ];

  const handleOpenImportDialog = () => {
    setImportFile(null);
    setFileName("");
    setImportResults(null);
    setIsImporting(false);
    setImportDialogOpen(true);
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      setFileName(file.name);
      setImportResults(null); // Reset kết quả khi chọn file mới
    }
    // Reset giá trị của input để có thể chọn lại cùng 1 file
    event.target.value = null;
  };

  const handleImport = async () => {
    if (!importFile) {
      showNotification(
        "error",
        "Chưa chọn file",
        "Vui lòng chọn một file Excel"
      );
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    // Tạo map dịch ngược (English Key -> Vietnamese Header)
    const reverseMapping = {};
    for (const key in excelHeaderMapping) {
      reverseMapping[excelHeaderMapping[key]] = key;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Đọc file, sử dụng `raw: false` để lấy giá trị string đã format (ví dụ: ngày tháng)
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (json.length === 0) {
          showNotification("error", "File rỗng", "File Excel không có dữ liệu");
          setIsImporting(false);
          return;
        }

        // Kiểm tra header (bằng tiếng Việt)
        const headersInFile = Object.keys(json[0]);
        const missingHeaders = requiredHeaders.filter(
          (h) => !headersInFile.includes(h)
        );

        if (missingHeaders.length > 0) {
          showNotification(
            "error",
            "File không hợp lệ",
            `File Excel thiếu các cột bắt buộc: ${missingHeaders.join(", ")}`
          );
          setIsImporting(false);
          return;
        }

        // --- Chuyển đổi dữ liệu sang định dạng backend ---
        const machinesToImport = json.map((row) => {
          const newRow = {};

          // Dịch từ Tiếng Việt -> Tiếng Anh
          for (const vietnameseHeader in excelHeaderMapping) {
            const englishKey = excelHeaderMapping[vietnameseHeader];
            if (row[vietnameseHeader] !== undefined) {
              newRow[englishKey] = row[vietnameseHeader];
            }
          }

          // Xử lý 'id_category'
          const categoryString = (newRow.id_category || "").toLowerCase();
          if (categoryString.includes("máy móc")) {
            newRow.id_category = 1;
          } else if (categoryString.includes("phụ kiện")) {
            newRow.id_category = 2;
          } else {
            // Mặc định là 1 nếu không điền hoặc điền sai
            newRow.id_category = 1;
          }

          // Xử lý 'date_of_use' (DD/MM/YYYY)
          const dateString = newRow.date_of_use; // Đây có thể là string "DD/MM/YYYY"
          if (dateString && typeof dateString === "string") {
            const parts = dateString.split("/");
            if (parts.length === 3) {
              // new Date(YYYY, MM-1, DD)
              const jsDate = new Date(+parts[2], parts[1] - 1, +parts[0]);
              // Gửi đi dưới dạng ISO string hoặc Date object
              // server.js đã có logic xử lý Date object, nên ta gửi Date object
              newRow.date_of_use = jsDate;
            } else {
              newRow.date_of_use = null; // Sai định dạng
            }
          }
          // Nếu `cellDates: true` và `raw: false` trả về Date object, nó sẽ được giữ nguyên và server.js xử lý được

          return newRow;
        });

        // Gửi dữ liệu đã chuyển đổi lên backend
        const result = await api.machines.batchImport({
          machines: machinesToImport,
        });

        if (result.success) {
          setImportResults(result.data);
          // Thông báo thành công sẽ hiển thị số lỗi từ backend
          const errorCount = result.data.errorCount;
          showNotification(
            errorCount > 0 ? "warning" : "success",
            "Hoàn tất import",
            `Thành công: ${result.data.successCount}, Thất bại: ${errorCount}`
          );
          // Tải lại danh sách máy
          fetchMachines(searchTerm);
          fetchStats();
        } else {
          showNotification(
            "error",
            "Lỗi import",
            result.message || "Lỗi không xác định từ server"
          );
        }
      } catch (err) {
        console.error("Error parsing or importing file:", err);
        showNotification(
          "error",
          "Lỗi xử lý file",
          err.response?.data?.message || err.message || "Không thể đọc file"
        );
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(importFile);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      available: { bg: "#2e7d3222", color: "#2e7d32", label: "Sẵn sàng" },
      in_use: { bg: "#667eea22", color: "#667eea", label: "Đang sử dụng" },
      maintenance: { bg: "#ff980022", color: "#ff9800", label: "Bảo trì" },
      rented: { bg: "#673ab722", color: "#673ab7", label: "Thuê" },
      borrowed: { bg: "#03a9f422", color: "#03a9f4", label: "Mượn" },
      borrowed_out: { bg: "#00bcd422", color: "#00bcd4", label: "Cho mượn" },
      liquidation: { bg: "#f4433622", color: "#f44336", label: "Thanh lý" },
      disabled: { bg: "#9e9e9e22", color: "#9e9e9e", label: "Vô hiệu hóa" },
      borrowed_return: {
        bg: "#03a9f422",
        color: "#03a9f4",
        label: "Đã trả (Máy Mượn)",
      },
      rented_return: {
        bg: "#673ab722",
        color: "#673ab7",
        label: "Đã trả (Máy Thuê)",
      },
    };
    return statusColors[status] || { bg: "#f0f0f0", color: "#555", label: "-" };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "available":
        return <CheckCircle />;
      case "in_use":
        return <Build />;
      case "maintenance":
        return <Build />;
      case "rented":
        return <ReceiptLong />;
      case "borrowed":
        return <SwapHoriz />;
      case "borrowed_out":
        return <SwapHoriz />;
      case "liquidation":
        return <Cancel />;
      case "disabled":
        return <Cancel />;
      case "rented_return":
        return <ReceiptLong />;
      case "borrowed_return":
        return <SwapHoriz />;
      default:
        return <CheckCircle />;
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatNumberVN = (value) => {
    if (!value && value !== 0) return "";
    return new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const parseNumberVN = (value) => {
    if (!value) return "";
    // Loại bỏ dấu chấm phân cách hàng nghìn và thay dấu phẩy thành dấu chấm
    const cleanValue = value.replace(/\./g, "").replace(",", ".");
    return cleanValue;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    // Xử lý timezone: lấy chỉ phần date, không convert timezone
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Sorting logic
  const handleSortRequest = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      key = null; // Clear sort
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedMachines = React.useMemo(() => {
    let sortableMachines = [...machines];
    if (sortConfig.key) {
      sortableMachines.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Handle nulls/undefined to sort them at the end
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        let compare = 0;
        // Check for specific data types
        if (["price", "lifespan", "repair_cost"].includes(sortConfig.key)) {
          compare = aVal - bVal;
        } else if (
          [
            "date_of_use",
            "is_borrowed_or_rented_or_borrowed_out_date",
            "is_borrowed_or_rented_or_borrowed_out_return_date",
          ].includes(sortConfig.key)
        ) {
          compare = new Date(aVal) - new Date(bVal);
        } else {
          // Default to string comparison
          compare = aVal.toString().localeCompare(bVal.toString());
        }

        return sortConfig.direction === "asc" ? compare : -compare;
      });
    }
    return sortableMachines;
  }, [machines, sortConfig]);

  // Column visibility logic
  const handleColumnMenuOpen = (event) => {
    setColumnMenuAnchor(event.currentTarget);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
  };

  const handleColumnToggle = (columnKey) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const visibleColumnCount =
    1 + Object.values(columnVisibility).filter((v) => v).length;

  return (
    <>
      <NavigationBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                background: "linear-gradient(45deg, #667eea, #764ba2)",
              }}
            >
              <PrecisionManufacturing sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textTransform: "uppercase",
                }}
              >
                Danh sách Máy móc thiết bị
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Quản lý thông tin máy móc thiết bị
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Cột chính cho thẻ "Hero" */}
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "20px",
                background:
                  "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                height: "100%", // Kéo dài thẻ để cân đối
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <CardContent sx={{ textAlign: "center", p: 4 }}>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 1, textTransform: "uppercase" }}
                >
                  Tổng số máy
                </Typography>
                <Typography variant="h1" fontWeight="bold" color="#667eea">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Cột phụ cho các thẻ còn lại */}
          <Grid size={{ xs: 12, md: 7, lg: 8 }}>
            <Grid container spacing={3}>
              {/* --- HÀNG 1: TRẠNG THÁI CHÍNH (5 THẺ) --- */}
              {/* Sẵn sàng */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#2e7d3211",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#2e7d32">
                      {stats.available || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sẵn sàng
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Đang sử dụng */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#1976d211",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#1976d2">
                      {stats.in_use || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đang sử dụng
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Bảo trì */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#ff980011",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#ff9800">
                      {stats.maintenance || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bảo trì
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Thanh lý */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#f4433611",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#f44336">
                      {stats.liquidation || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Thanh lý
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Vô hiệu hóa (ĐÃ CHUYỂN LÊN) */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#9e9e9e11",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#9e9e9e">
                      {stats.disabled || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vô hiệu hóa
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* --- HÀNG 2: THUÊ, MƯỢN, CHO MƯỢN (5 THẺ) --- */}
              {/* Thuê */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#673ab711",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#673ab7">
                      {stats.rented || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Thuê
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Đã trả (Máy thuê) */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#673ab711", // Màu tím thuê
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#673ab7">
                      {stats.rented_return || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đã trả (Máy thuê)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Mượn */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#03a9f411",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#03a9f4">
                      {stats.borrowed || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mượn
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Đã trả (Máy mượn) */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#03a9f411", // Màu xanh mượn
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#03a9f4">
                      {stats.borrowed_return || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đã trả (Máy mượn)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Cho mượn (ĐÃ CHUYỂN LÊN) */}
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    background: "#00bcd411",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="h4" fontWeight="bold" color="#00bcd4">
                      {stats.borrowed_out || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cho mượn
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Search and Actions */}
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: "20px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={2} sx={{ flexGrow: 1 }}>
                <TextField
                  placeholder="Tìm kiếm máy móc..."
                  variant="outlined"
                  size="medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    flexGrow: 1,
                    maxWidth: { xs: "100%", sm: 400 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Số dòng</InputLabel>
                  <Select
                    value={rowsPerPage}
                    label="Số dòng"
                    onChange={handleRowsPerPageChange}
                    sx={{
                      borderRadius: "12px",
                    }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                    <MenuItem value={200}>200</MenuItem>
                    <MenuItem value={500}>500</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<FileUpload />}
                  onClick={handleOpenImportDialog}
                  sx={{
                    borderRadius: "12px",
                    color: "#2e7d32",
                    borderColor: "#2e7d32",
                    px: 3,
                    py: 1.5,
                  }}
                >
                  Nhập Excel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleOpenCreateDialog}
                  sx={{
                    borderRadius: "12px",
                    background: "linear-gradient(45deg, #2e7d32, #4caf50)",
                    px: 3,
                    py: 1.5,
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(46, 125, 50, 0.3)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Thêm máy
                </Button>

                {/* Column Visibility Button */}
                <Button
                  variant="outlined"
                  startIcon={<ViewColumn />}
                  onClick={handleColumnMenuOpen}
                  sx={{
                    borderRadius: "12px",
                    px: 3,
                    py: 1.5,
                    color: "#667eea",
                    borderColor: "#667eea",
                  }}
                >
                  Cột
                </Button>

                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={() => fetchMachines(searchTerm) && fetchStats()}
                  sx={{
                    borderRadius: "12px",
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    px: 3,
                    py: 1.5,
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Làm mới
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Column Visibility Menu */}
        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={handleColumnMenuClose}
        >
          {Object.entries(columnConfig).map(([key, name]) => (
            <MenuItem key={key} onClick={() => handleColumnToggle(key)}>
              <Checkbox checked={columnVisibility[key]} />
              <ListItemText primary={name} />
            </MenuItem>
          ))}
        </Menu>

        {/* Machine Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: "12px" }}>
            {error}
          </Alert>
        ) : (
          <Card
            elevation={0}
            sx={{
              borderRadius: "20px",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{ backgroundColor: "rgba(102, 126, 234, 0.05)" }}
                  >
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      STT
                    </TableCell>

                    {/* Added sort labels and visibility checks */}
                    {columnVisibility.code_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "code_machine"}
                          direction={
                            sortConfig.key === "code_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("code_machine")}
                        >
                          Mã máy
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.type_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          minWidth: "150px",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "type_machine"}
                          direction={
                            sortConfig.key === "type_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("type_machine")}
                        >
                          Loại máy
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.model_machine && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          minWidth: "200px",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "model_machine"}
                          direction={
                            sortConfig.key === "model_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("model_machine")}
                        >
                          Model
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.manufacturer && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "manufacturer"}
                          direction={
                            sortConfig.key === "manufacturer"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("manufacturer")}
                        >
                          Hãng SX
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.serial_machine && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "serial_machine"}
                          direction={
                            sortConfig.key === "serial_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("serial_machine")}
                        >
                          Serial
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.RFID_machine && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "RFID_machine"}
                          direction={
                            sortConfig.key === "RFID_machine"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("RFID_machine")}
                        >
                          RFID
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.name_category && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "name_category"}
                          direction={
                            sortConfig.key === "name_category"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("name_category")}
                        >
                          Loại
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.name_location && (
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          minWidth: "150px",
                        }}
                      >
                        <TableSortLabel
                          active={sortConfig.key === "name_location"}
                          direction={
                            sortConfig.key === "name_location"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("name_location")}
                        >
                          Vị trí hiện tại
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.current_status && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "current_status"}
                          direction={
                            sortConfig.key === "current_status"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("current_status")}
                        >
                          Trạng thái (chính)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.is_borrowed_or_rented_or_borrowed_out && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out"
                          }
                          direction={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() =>
                            handleSortRequest(
                              "is_borrowed_or_rented_or_borrowed_out"
                            )
                          }
                        >
                          Trạng thái (mượn/thuê)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.is_borrowed_or_rented_or_borrowed_out_name && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_name"
                          }
                          direction={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_name"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() =>
                            handleSortRequest(
                              "is_borrowed_or_rented_or_borrowed_out_name"
                            )
                          }
                        >
                          Đơn vị (mượn/thuê)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.is_borrowed_or_rented_or_borrowed_out_date && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_date"
                          }
                          direction={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_date"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() =>
                            handleSortRequest(
                              "is_borrowed_or_rented_or_borrowed_out_date"
                            )
                          }
                        >
                          Ngày (mượn/thuê)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.is_borrowed_or_rented_or_borrowed_out_return_date && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_return_date"
                          }
                          direction={
                            sortConfig.key ===
                            "is_borrowed_or_rented_or_borrowed_out_return_date"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() =>
                            handleSortRequest(
                              "is_borrowed_or_rented_or_borrowed_out_return_date"
                            )
                          }
                        >
                          Ngày trả (mượn/thuê)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.price && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "price"}
                          direction={
                            sortConfig.key === "price"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("price")}
                        >
                          Giá
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.lifespan && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "lifespan"}
                          direction={
                            sortConfig.key === "lifespan"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("lifespan")}
                        >
                          Tuổi thọ (năm)
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.repair_cost && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "repair_cost"}
                          direction={
                            sortConfig.key === "repair_cost"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("repair_cost")}
                        >
                          Chi phí SC
                        </TableSortLabel>
                      </TableCell>
                    )}
                    {columnVisibility.date_of_use && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        <TableSortLabel
                          active={sortConfig.key === "date_of_use"}
                          direction={
                            sortConfig.key === "date_of_use"
                              ? sortConfig.direction
                              : "asc"
                          }
                          onClick={() => handleSortRequest("date_of_use")}
                        >
                          Ngày sử dụng
                        </TableSortLabel>
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {machines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumnCount}
                        align="center"
                        sx={{ py: 4 }}
                      >
                        <Typography color="text.secondary">
                          Không tìm thấy máy móc nào
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    /* Map over sortedMachines */
                    sortedMachines.map((machine, index) => {
                      const mainStatusInfo = getStatusColor(
                        machine.current_status
                      );
                      return (
                        <TableRow
                          key={machine.uuid_machine}
                          hover
                          // <<< CHANGED: Added onClick and cursor >>>
                          onClick={() => handleOpenDialog(machine.uuid_machine)}
                          sx={{
                            cursor: "pointer", // Make row look clickable
                            "&:hover": {
                              bgcolor: "rgba(102, 126, 234, 0.03)", // Màu hover nhẹ
                            },
                            transition: "all 0.2s ease",
                          }}
                          // <<< END OF CHANGE >>>
                        >
                          <TableCell>
                            {(page - 1) * rowsPerPage + index + 1}
                          </TableCell>

                          {/* Added visibility checks */}
                          {columnVisibility.code_machine && (
                            <TableCell sx={{ fontWeight: 500 }}>
                              {machine.code_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.type_machine && (
                            <TableCell>{machine.type_machine || "-"}</TableCell>
                          )}
                          {columnVisibility.model_machine && (
                            <TableCell sx={{ fontWeight: 500 }}>
                              {machine.model_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.manufacturer && (
                            <TableCell>{machine.manufacturer || "-"}</TableCell>
                          )}
                          {columnVisibility.serial_machine && (
                            <TableCell>
                              {machine.serial_machine || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.RFID_machine && (
                            <TableCell>{machine.RFID_machine || "-"}</TableCell>
                          )}
                          {columnVisibility.name_category && (
                            <TableCell>
                              {machine.name_category ? (
                                <Chip
                                  label={machine.name_category}
                                  size="small"
                                  sx={{
                                    background: "#f0f0f0",
                                    fontWeight: 500,
                                  }}
                                />
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          )}
                          {columnVisibility.name_location && (
                            <TableCell sx={{ fontWeight: 500 }}>
                              {machine.name_location || "-"}
                            </TableCell>
                          )}
                          {columnVisibility.current_status && (
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(machine.current_status)}
                                label={mainStatusInfo.label}
                                size="small"
                                sx={{
                                  background: mainStatusInfo.bg,
                                  color: mainStatusInfo.color,
                                  fontWeight: 600,
                                  borderRadius: "8px",
                                  textTransform: "uppercase",
                                }}
                              />
                            </TableCell>
                          )}
                          {columnVisibility.is_borrowed_or_rented_or_borrowed_out && (
                            <TableCell>
                              {machine.is_borrowed_or_rented_or_borrowed_out
                                ? (() => {
                                    const borrowStatusInfo = getStatusColor(
                                      machine.is_borrowed_or_rented_or_borrowed_out
                                    );
                                    return (
                                      <Chip
                                        icon={getStatusIcon(
                                          machine.is_borrowed_or_rented_or_borrowed_out
                                        )}
                                        label={borrowStatusInfo.label}
                                        size="small"
                                        sx={{
                                          background: borrowStatusInfo.bg,
                                          color: borrowStatusInfo.color,
                                          fontWeight: 600,
                                          borderRadius: "8px",
                                          textTransform: "uppercase",
                                        }}
                                      />
                                    );
                                  })()
                                : "-"}
                            </TableCell>
                          )}
                          {columnVisibility.is_borrowed_or_rented_or_borrowed_out_name && (
                            <TableCell>
                              {machine.is_borrowed_or_rented_or_borrowed_out_name ||
                                "-"}
                            </TableCell>
                          )}
                          {columnVisibility.is_borrowed_or_rented_or_borrowed_out_date && (
                            <TableCell>
                              {formatDate(
                                machine.is_borrowed_or_rented_or_borrowed_out_date
                              )}
                            </TableCell>
                          )}
                          {columnVisibility.is_borrowed_or_rented_or_borrowed_out_return_date && (
                            <TableCell>
                              {formatDate(
                                machine.is_borrowed_or_rented_or_borrowed_out_return_date
                              )}
                            </TableCell>
                          )}
                          {columnVisibility.price && (
                            <TableCell>
                              {formatCurrency(machine.price)}
                            </TableCell>
                          )}
                          {columnVisibility.lifespan && (
                            <TableCell>{machine.lifespan || "-"}</TableCell>
                          )}
                          {columnVisibility.repair_cost && (
                            <TableCell>
                              {formatCurrency(machine.repair_cost)}
                            </TableCell>
                          )}
                          {columnVisibility.date_of_use && (
                            <TableCell>
                              {formatDate(machine.date_of_use)}
                            </TableCell>
                          )}
                          {/* <<< CHANGED: Removed Action cell >>> */}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {!loading && !error && machines.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 3,
                  borderTop: "1px solid rgba(0, 0, 0, 0.05)",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Hiển thị {(page - 1) * rowsPerPage + 1} -{" "}
                  {Math.min(page * rowsPerPage, pagination.total)} trong tổng số{" "}
                  {pagination.total} máy móc
                </Typography>
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    "& .MuiPaginationItem-root": {
                      borderRadius: "8px",
                      fontWeight: 500,
                      "&.Mui-selected": {
                        background: "linear-gradient(45deg, #667eea, #764ba2)",
                        color: "white",
                      },
                    },
                  }}
                />
              </Box>
            )}
          </Card>
        )}

        {/* Detail Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "20px",
            },
          }}
        >
          {/* Cập nhật style DialogTitle để giống TicketManagementPage */}
          <DialogTitle
            sx={{
              pb: 1,
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              color: "white",
              fontWeight: 700,
              borderTopLeftRadius: "20px", // Đảm bảo bo tròn góc
              borderTopRightRadius: "20px", // Đảm bảo bo tròn góc
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="h5" fontWeight="bold">
                {isCreateMode ? "Thêm máy móc mới" : "Chỉnh sửa máy móc"}
              </Typography>
              <IconButton
                onClick={handleCloseDialog}
                size="small"
                sx={{ color: "white" }}
              >
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            {(selectedMachine || isCreateMode) && (
              <Grid container spacing={3}>
                {/* QR Code Section */}
                {showQRCode && editedData.serial_machine && (
                  <Grid size={{ xs: 12 }}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: "16px",
                        border: "2px solid #667eea",
                        background:
                          "linear-gradient(135deg, #667eea11 0%, #764ba211 100%)",
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={3} alignItems="center">
                          {/* QR Code Display */}
                          <Box
                            sx={{
                              p: 3,
                              bgcolor: "white",
                              borderRadius: "12px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <QRCodeSVG
                              id="qr-code-svg"
                              value={`${
                                editedData.name_category === "Máy móc thiết bị"
                                  ? "MAY"
                                  : "PHUKIEN"
                              }-${editedData.serial_machine}`}
                              size={150}
                              level="H"
                              includeMargin={true}
                            />
                          </Box>

                          {/* QR Code Info */}
                          <Box sx={{ flex: 1 }}>
                            {/* <Box sx={{ textAlign: "left", display: "", mb: 2 }}>
                              <Typography variant="h6" fontWeight="bold">
                                {editedData.code_machine}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Serial:{" "}
                                {editedData.id_category === 1
                                  ? "MAY"
                                  : "PHUKIEN"}
                                -{editedData.serial_machine}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {editedData.type_machine} -{" "}
                                {editedData.model_machine}
                              </Typography>
                            </Box> */}
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              gutterBottom
                            >
                              Mã QR đã được tạo
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              paragraph
                            >
                              Mã QR được tạo từ Serial Number của máy móc. Bạn
                              có thể in hoặc tải xuống mã QR này để dán lên máy
                              móc.
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={2}
                              sx={{ mt: 2 }}
                              flexWrap="wrap"
                            >
                              <Button
                                variant="contained"
                                startIcon={<Print />}
                                onClick={handlePrintQRCode}
                                sx={{
                                  borderRadius: "12px",
                                  background:
                                    "linear-gradient(45deg, #667eea, #764ba2)",
                                }}
                              >
                                In mã QR
                              </Button>
                              <Button
                                variant="contained"
                                startIcon={<Download />}
                                onClick={handleDownloadQRCode}
                                sx={{
                                  borderRadius: "12px",
                                  background:
                                    "linear-gradient(45deg, #2e7d32, #4caf50)",
                                }}
                              >
                                Tải xuống
                              </Button>
                              <Button
                                variant="outlined"
                                onClick={() => setShowQRCode(false)}
                                sx={{ borderRadius: "12px" }}
                              >
                                Ẩn mã QR
                              </Button>
                            </Stack>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Show QR Code Button */}
                {!showQRCode && editedData.serial_machine && (
                  <Grid size={{ xs: 12 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<QrCode2 />}
                      onClick={() => setShowQRCode(true)}
                      sx={{
                        borderRadius: "12px",
                        py: 1.5,
                        borderColor: "#667eea",
                        color: "#667eea",
                        "&:hover": {
                          borderColor: "#764ba2",
                          bgcolor: "#667eea11",
                        },
                      }}
                    >
                      Tạo mã QR từ Serial
                    </Button>
                  </Grid>
                )}

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }}>
                    <Chip label="Thông tin chung" />
                  </Divider>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Mã máy"
                    required
                    value={editedData.code_machine || ""}
                    onChange={(e) =>
                      handleInputChange("code_machine", e.target.value)
                    }
                    disabled={!isCreateMode}
                    sx={!isCreateMode ? DISABLED_VIEW_SX : {}} // Áp dụng style bị khóa
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Serial"
                    required
                    value={editedData.serial_machine || ""}
                    onChange={(e) =>
                      handleInputChange("serial_machine", e.target.value)
                    }
                    disabled={!isCreateMode}
                    sx={!isCreateMode ? DISABLED_VIEW_SX : {}} // Áp dụng style bị khóa
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="RFID"
                    value={editedData.RFID_machine || ""}
                    onChange={(e) =>
                      handleInputChange("RFID_machine", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {isCreateMode ? (
                    <FormControl fullWidth>
                      <InputLabel>Loại</InputLabel>
                      <Select
                        value={editedData.id_category || 1}
                        label="Loại"
                        onChange={(e) =>
                          handleInputChange("id_category", e.target.value)
                        }
                      >
                        <MenuItem value={1}>Máy móc thiết bị</MenuItem>
                        <MenuItem value={2}>Phụ kiện</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      label="Loại"
                      value={editedData.name_category || ""}
                      disabled={true}
                      sx={DISABLED_VIEW_SX} // Áp dụng style bị khóa
                    />
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Loại máy"
                    required
                    value={editedData.type_machine || ""}
                    onChange={(e) =>
                      handleInputChange("type_machine", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Model máy"
                    required
                    value={editedData.model_machine || ""}
                    onChange={(e) =>
                      handleInputChange("model_machine", e.target.value)
                    }
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Hãng sản xuất"
                    value={editedData.manufacturer || ""}
                    onChange={(e) =>
                      handleInputChange("manufacturer", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      value={editedData.current_status}
                      label="Trạng thái"
                      onChange={(e) =>
                        handleInputChange("current_status", e.target.value)
                      }
                    >
                      <MenuItem value="available">Sẵn sàng</MenuItem>
                      <MenuItem value="in_use">Đang sử dụng</MenuItem>
                      <MenuItem value="maintenance">Bảo trì</MenuItem>
                      <MenuItem value="liquidation">Thanh lý</MenuItem>
                      <MenuItem value="disabled">Vô hiệu hóa</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {!isCreateMode && (
                  <>
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 2 }}>
                        <Chip label="Lịch sử vị trí" />
                      </Divider>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Vị trí hiện tại"
                        value={editedData.name_location || "Chưa có vị trí"}
                        disabled
                        sx={DISABLED_VIEW_SX}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      {historyLoading ? (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            my: 3,
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      ) : machineHistory.length === 0 ? (
                        <Typography
                          align="center"
                          color="text.secondary"
                          sx={{ my: 2 }}
                        >
                          Không có lịch sử di chuyển.
                        </Typography>
                      ) : (
                        <TableContainer
                          component={Paper}
                          elevation={0}
                          variant="outlined"
                          sx={{ borderRadius: "12px", maxHeight: 300 }}
                        >
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Ngày di chuyển
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Từ vị trí
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Đến vị trí
                                </TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>
                                  Người thực hiện
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {machineHistory.map((entry, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {formatDate(entry.move_date)}
                                  </TableCell>
                                  <TableCell>
                                    {entry.from_location_name || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {entry.to_location_name || "-"}
                                  </TableCell>
                                  <TableCell>{entry.created_by}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Grid>
                  </>
                )}

                {/* Thêm thông tin Mượn/Thuê (chỉ đọc) */}
                {!isCreateMode && (
                  <>
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 2 }}>
                        <Chip label="Thông tin Mượn / Thuê / Cho mượn" />
                      </Divider>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        value={(() => {
                          if (
                            editedData.is_borrowed_or_rented_or_borrowed_out ===
                            "borrowed"
                          )
                            return "Mượn";
                          if (
                            editedData.is_borrowed_or_rented_or_borrowed_out ===
                            "rented"
                          )
                            return "Thuê";
                          if (
                            editedData.is_borrowed_or_rented_or_borrowed_out ===
                            "borrowed_out"
                          )
                            return "Cho mượn";
                          return "NULL";
                        })()}
                        label="Trạng thái Mượn/Thuê"
                        disabled
                        sx={DISABLED_VIEW_SX}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Đơn vị (mượn/thuê)"
                        value={
                          editedData.is_borrowed_or_rented_or_borrowed_out_name ||
                          "NULL"
                        }
                        disabled
                        sx={DISABLED_VIEW_SX}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Ngày (mượn/thuê)"
                        type="date"
                        value={formatDateForInput(
                          editedData.is_borrowed_or_rented_or_borrowed_out_date
                        )}
                        disabled
                        sx={DISABLED_VIEW_SX}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Ngày trả (dự kiến)"
                        type="date"
                        value={formatDateForInput(
                          editedData.is_borrowed_or_rented_or_borrowed_out_return_date
                        )}
                        onChange={(e) =>
                          handleInputChange(
                            "is_borrowed_or_rented_or_borrowed_out_return_date",
                            e.target.value || null // Gửi null nếu ngày bị xóa
                          )
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }}>
                    <Chip label="Thông tin Chi phí & Thời gian" />
                  </Divider>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Giá (VNĐ)"
                    value={formatNumberVN(editedData.price)}
                    onChange={(e) => {
                      const parsedValue = parseNumberVN(e.target.value);
                      handleInputChange(
                        "price",
                        parsedValue ? parseFloat(parsedValue) : ""
                      );
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Tuổi thọ (năm)"
                    value={editedData.lifespan?.toString() || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Chỉ cho phép số
                      if (value === "" || /^\d+$/.test(value)) {
                        handleInputChange(
                          "lifespan",
                          value ? parseInt(value) : ""
                        );
                      }
                    }}
                    onKeyPress={(e) => {
                      // Chặn các ký tự không phải số
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    inputProps={{
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Chi phí sửa chữa (VNĐ)"
                    value={formatNumberVN(editedData.repair_cost) || ""}
                    onChange={(e) => {
                      const parsedValue = parseNumberVN(e.target.value);
                      handleInputChange(
                        "repair_cost",
                        parsedValue ? parseFloat(parsedValue) : ""
                      );
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Ngày sử dụng"
                    type="date"
                    required
                    value={formatDateForInput(editedData.date_of_use)}
                    onChange={(e) =>
                      handleInputChange("date_of_use", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Ghi chú"
                    multiline
                    rows={3}
                    value={editedData.note || ""}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                  />
                </Grid>
                {!isCreateMode && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Ngày tạo"
                        value={formatDate(selectedMachine.created_at)}
                        disabled={true}
                        sx={DISABLED_VIEW_SX} // Áp dụng style bị khóa
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Ngày cập nhật"
                        value={formatDate(selectedMachine.updated_at)}
                        disabled={true}
                        sx={DISABLED_VIEW_SX} // Áp dụng style bị khóa
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            )}
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: "12px" }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              startIcon={<Save />}
              sx={{
                borderRadius: "12px",
                background: "linear-gradient(45deg, #667eea, #764ba2)",
              }}
            >
              {isCreateMode ? "Thêm thiết bị mới" : "Lưu thay đổi"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={importDialogOpen}
          onClose={handleCloseImportDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "20px",
            },
          }}
        >
          <DialogTitle
            sx={{
              pb: 1,
              background: "linear-gradient(45deg, #2e7d32, #4caf50)",
              color: "white",
              fontWeight: 700,
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="h5" fontWeight="bold">
                Nhập máy móc từ file Excel
              </Typography>
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent
            sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 3 }}
          >
            {/* Hướng dẫn */}
            <Alert severity="info" sx={{ borderRadius: "12px" }}>
              <AlertTitle>Hướng dẫn</AlertTitle>
              <Typography variant="body2" gutterBottom>
                1. Chuẩn bị file Excel (.xlsx hoặc .xls) với các cột dữ liệu
                theo đúng tên cột.
              </Typography>
              <Typography variant="body2" gutterBottom>
                2. Các cột <strong>bắt buộc</strong> (được tô vàng trong file
                mẫu): <strong>Mã máy</strong>, <strong>Serial</strong>,{" "}
                <strong>Loại máy</strong>,{" "}
                <strong>Loại (Máy móc thiết bị/Phụ kiện)</strong>.
              </Typography>
              <Typography variant="body2" gutterBottom>
                3. Cột <strong>Loại</strong>: Nhập "
                <strong>Máy móc thiết bị</strong>" hoặc "
                <strong>Phụ kiện</strong>".
              </Typography>
              <Typography variant="body2" gutterBottom>
                4. Cột <strong>Ngày sử dụng</strong>: Nhập định dạng{" "}
                <strong>DD/MM/YYYY</strong> (ví dụ: 31/10/2025).
              </Typography>
              <Typography variant="body2">
                5. Hệ thống sẽ kiểm tra trùng lặp <strong>Mã máy</strong> và{" "}
                <strong>Serial</strong> đã có trong CSDL.
              </Typography>

              <Link
                href="/Mau_Excel_MayMoc.xlsx" // Đường dẫn tới file trong thư mục public
                download="Mau_Excel_MayMoc.xlsx" // Tên file khi tải về
                variant="body2"
                sx={{
                  mt: 1,
                  fontWeight: "bold",
                  cursor: "pointer",
                  textAlign: "left",
                  textDecoration: "underline",
                }}
              >
                Tải xuống file Excel mẫu tại đây
              </Link>
            </Alert>

            {/* Chọn file */}
            <Box>
              <Button
                variant="contained"
                component="label"
                startIcon={<FileUpload />}
                sx={{
                  borderRadius: "12px",
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                }}
              >
                Chọn file Excel
                <input
                  type="file"
                  hidden
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
              </Button>
              {fileName && (
                <Typography variant="body1" sx={{ mt: 2, ml: 1 }}>
                  Đã chọn: <strong>{fileName}</strong>
                </Typography>
              )}
            </Box>

            {/* Kết quả */}
            {importResults && (
              <Box>
                <Divider sx={{ my: 2 }}>
                  <Chip label="Kết quả Nhập Excel" />
                </Divider>
                <Alert
                  severity={
                    importResults.errorCount > 0 ? "warning" : "success"
                  }
                  sx={{ borderRadius: "12px", mb: 2 }}
                >
                  <AlertTitle>Nhập Excel hoàn tất</AlertTitle>
                  Đã thêm thành công:{" "}
                  <strong>{importResults.successCount}</strong> máy.
                  <br />
                  Số dòng bị lỗi: <strong>{importResults.errorCount}</strong>.
                </Alert>

                {importResults.successes.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" color="success.main" gutterBottom>
                      Chi tiết thành công:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        maxHeight: 300,
                        overflow: "auto",
                        borderRadius: "12px",
                      }}
                    >
                      <List dense>
                        {importResults.successes.map((succ, index) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: "30px" }}>
                                <CheckCircleOutline
                                  color="success"
                                  fontSize="small"
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${succ.type} - ${succ.model}`}
                                secondary={`Mã máy: ${succ.code} | Serial: ${succ.serial}`}
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}

                {importResults.errors.length > 0 && (
                  <Box>
                    <Typography variant="h6" color="error" gutterBottom>
                      Chi tiết lỗi:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        maxHeight: 300,
                        overflow: "auto",
                        borderRadius: "12px",
                      }}
                    >
                      <List dense>
                        {importResults.errors.map((err, index) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemIcon sx={{ minWidth: "30px" }}>
                                <ErrorOutline color="error" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={`Dòng ${err.line}: ${err.message}`}
                                secondary={`Mã máy: ${err.code} | Serial: ${err.serial}`}
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}

            {isImporting && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  justifyContent: "center",
                  p: 2,
                }}
              >
                <CircularProgress />
                <Typography>Đang xử lý, vui lòng chờ...</Typography>
              </Box>
            )}
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleCloseImportDialog}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: "12px" }}
              disabled={isImporting}
            >
              Đóng
            </Button>
            <Button
              onClick={handleImport}
              variant="contained"
              startIcon={<Save />}
              sx={{
                borderRadius: "12px",
                background: "linear-gradient(45deg, #2e7d32, #4caf50)",
              }}
              disabled={!importFile || isImporting}
            >
              {isImporting ? "Đang nhập Excel..." : "Bắt đầu Nhập Excel"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={2000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            variant="filled"
            sx={{
              width: "100%",
              minWidth: "350px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              borderRadius: "12px",
            }}
          >
            <AlertTitle sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
              {notification.title}
            </AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default MachineListPage;
