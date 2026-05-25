// frontend/src/pages/AdminPage.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  Tabs,
  Tab,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Grid,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormLabel,
  ListItemButton,
  ListItemAvatar,
  Divider,
  useTheme,
  useMediaQuery,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  AdminPanelSettings,
  Edit,
  Add,
  Business,
  LocationOn,
  ExpandMore,
  People,
  Person,
  Search,
  Save,
  Close,
  Delete,
  Build,
  Settings,
  Factory,
  LocalShipping,
  Link,
  LinkOff,
  Nfc,
  Radar,
  PlaylistAddCheck,
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";
import RfidDialog from "../components/rfidScanner/RfidDialog";
import { api } from "../api/api"; // Import API

// --- STYLES ĐỒNG NHẤT ---
const gradientText = {
  fontWeight: 700,
  background: "linear-gradient(45deg, #667eea, #764ba2)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textTransform: "uppercase",
};

const btnGradientStyle = {
  borderRadius: "12px",
  background: "linear-gradient(45deg, #667eea, #764ba2)",
  transition: "all 0.3s ease",
  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.5)",
  },
};

const btnGreenStyle = {
  ...btnGradientStyle,
  background: "linear-gradient(45deg, #2e7d32, #4caf50)",
  boxShadow: "0 4px 12px rgba(46, 125, 50, 0.3)",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 25px rgba(46, 125, 50, 0.5)",
  },
};

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
  },
};

// --- MATRIX HELPERS (outside component for stable references) ---
function getColKey(col) {
  return `${col.id_machine_type}_${col.id_machine_attribute ?? "null"}`;
}

const CHECKBOX_SX = {
  padding: "2px",
  "&.Mui-checked": { color: "#764ba2" },
};

const STICKY_LABEL_SX_BASE = {
  position: "sticky",
  left: 0,
  zIndex: 1,
  borderRight: "2px solid #d0d4f0",
  fontWeight: 500,
  fontSize: "0.85rem",
  minWidth: 250,
  width: 250,
  maxWidth: 300,
  py: 0.8,
  px: 1.5,
  whiteSpace: "normal",
  lineHeight: 1.4,
  transition: "background-color 0.1s ease",
  "tr:hover &": { backgroundColor: "#fff000 !important" },
};

// Input nội tuyến — state nằm hoàn toàn bên trong, không trigger parent re-render khi gõ
const InlineEditCell = React.memo(function InlineEditCell({
  initialName,
  onSave,
  onCancel,
  isSaving,
}) {
  const [localName, setLocalName] = React.useState(initialName);
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <TextField
        size="small"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(localName);
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
        disabled={isSaving}
        sx={{
          flex: 1,
          "& .MuiInputBase-input": { fontSize: "0.8rem", py: "5px" },
        }}
      />
      <IconButton
        size="small"
        onClick={() => onSave(localName)}
        disabled={isSaving || !localName.trim()}
        sx={{ color: "#667eea", p: "4px" }}
        title="Lưu"
      >
        {isSaving ? <CircularProgress size={14} /> : <Save fontSize="small" />}
      </IconButton>
      <IconButton
        size="small"
        onClick={onCancel}
        disabled={isSaving}
        sx={{ color: "text.secondary", p: "4px" }}
        title="Huỷ"
      >
        <Close fontSize="small" />
      </IconButton>
    </Stack>
  );
});

// Memoized row: chỉ re-render khi đúng row này thay đổi (reference equality)
const MatrixRow = React.memo(
  function MatrixRow({
    content,
    machineTypesForMatrix,
    rowChecked,
    rowBg,
    onCheckboxChange,
    onLabelMouseEnter,
    onCellMouseEnter,
    isEditing,
    onSaveEdit,
    onCancelEdit,
    onEdit,
    onDelete,
    isSaving,
    isDeleting,
  }) {
    return (
      <TableRow>
        <TableCell
          onMouseEnter={onLabelMouseEnter}
          sx={{
            ...STICKY_LABEL_SX_BASE,
            backgroundColor: isEditing ? "#f5f4ff" : rowBg,
            py: isEditing ? 0.5 : 0.8,
          }}
        >
          {isEditing ? (
            <InlineEditCell
              initialName={content.name_maintenance_content}
              onSave={onSaveEdit}
              onCancel={onCancelEdit}
              isSaving={isSaving}
            />
          ) : (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                "& .row-actions": { opacity: 0, transition: "opacity 0.15s" },
                "&:hover .row-actions": { opacity: 1 },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {content.name_maintenance_content}
              </Typography>
              <Stack
                direction="row"
                className="row-actions"
                sx={{ ml: 0.5, flexShrink: 0 }}
              >
                <IconButton
                  size="medium"
                  onClick={() => onEdit(content)}
                  sx={{ color: "#667eea", p: "3px" }}
                  title="Chỉnh sửa"
                >
                  <Edit sx={{ fontSize: "1.5rem" }} />
                </IconButton>
                <IconButton
                  size="medium"
                  onClick={() => onDelete(content)}
                  disabled={isDeleting}
                  sx={{ color: "#e53935", p: "3px" }}
                  title="Xoá"
                >
                  {isDeleting ? (
                    <CircularProgress size={12} />
                  ) : (
                    <Delete sx={{ fontSize: "1.5rem" }} />
                  )}
                </IconButton>
              </Stack>
            </Stack>
          )}
        </TableCell>
        {machineTypesForMatrix.map((col) => {
          const colKey = getColKey(col);
          return (
            <TableCell
              key={colKey}
              align="center"
              padding="checkbox"
              onMouseEnter={() => onCellMouseEnter(colKey)}
              sx={{ backgroundColor: rowBg }}
            >
              <Checkbox
                checked={rowChecked?.[colKey] ?? false}
                inputProps={{
                  "data-col-key": colKey,
                  "data-content-name": content.name_maintenance_content,
                }}
                onChange={onCheckboxChange}
                size="large"
                sx={CHECKBOX_SX}
              />
            </TableCell>
          );
        })}
      </TableRow>
    );
  },
  (prev, next) =>
    prev.rowChecked === next.rowChecked &&
    prev.rowBg === next.rowBg &&
    prev.machineTypesForMatrix === next.machineTypesForMatrix &&
    prev.onCheckboxChange === next.onCheckboxChange &&
    prev.isEditing === next.isEditing &&
    prev.isSaving === next.isSaving &&
    prev.isDeleting === next.isDeleting &&
    prev.content.name_maintenance_content ===
      next.content.name_maintenance_content
);

// --- SCHEDULE HELPERS ---
const MONTHS_CONFIG = [
  { key: "january", label: "T1", fullLabel: "Tháng 1" },
  { key: "february", label: "T2", fullLabel: "Tháng 2" },
  { key: "march", label: "T3", fullLabel: "Tháng 3" },
  { key: "april", label: "T4", fullLabel: "Tháng 4" },
  { key: "may", label: "T5", fullLabel: "Tháng 5" },
  { key: "june", label: "T6", fullLabel: "Tháng 6" },
  { key: "july", label: "T7", fullLabel: "Tháng 7" },
  { key: "august", label: "T8", fullLabel: "Tháng 8" },
  { key: "september", label: "T9", fullLabel: "Tháng 9" },
  { key: "october", label: "T10", fullLabel: "Tháng 10" },
  { key: "november", label: "T11", fullLabel: "Tháng 11" },
  { key: "december", label: "T12", fullLabel: "Tháng 12" },
];

const SCHEDULE_LABEL_SX_BASE = {
  position: "sticky",
  left: 0,
  zIndex: 1,
  borderRight: "2px solid #d0d4f0",
  fontWeight: 500,
  fontSize: "0.85rem",
  minWidth: 220,
  width: 220,
  maxWidth: 280,
  py: 0.8,
  px: 1.5,
  whiteSpace: "normal",
  lineHeight: 1.4,
  "tr:hover &": { backgroundColor: "#fff000 !important" },
};

// Hook debounce để tránh re-render liên tục khi gõ filter
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Memoized: chỉ re-render khi đúng row này thay đổi
const ScheduleRow = React.memo(
  function ScheduleRow({
    col,
    rowKey,
    rowData,
    rowBg,
    isDirty,
    onCheckboxChange,
    visibleMonths,
    contentCount,
  }) {
    const hasContent = contentCount > 0;
    return (
      <TableRow>
        <TableCell sx={{ ...SCHEDULE_LABEL_SX_BASE, backgroundColor: rowBg }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 0.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                minWidth: 0,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: hasContent ? "#22c55e" : "#d1d5db",
                  flexShrink: 0,
                  boxShadow: hasContent
                    ? "0 0 0 2px rgba(34,197,94,0.18)"
                    : "none",
                  mr: "2px",
                }}
              />
              <Box
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: hasContent ? "inherit" : "text.secondary",
                }}
              >
                {col.machine_name}
              </Box>
              {isDirty && (
                <Box
                  component="span"
                  sx={{ color: "#f59e0b", fontSize: "0.7rem", lineHeight: 1 }}
                >
                  ●
                </Box>
              )}
            </Box>
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.1,
                borderRadius: "10px",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "#4f46e5",
                backgroundColor: "#eef0fb",
                lineHeight: 1.4,
                minWidth: 28,
                textAlign: "center",
              }}
            >
              {col.machine_count ?? 0}
            </Box>
          </Box>
        </TableCell>
        {visibleMonths.map(({ key }) => {
          const isCurrentChecked = rowData?.[key] ?? false;
          return (
            <TableCell
              key={key}
              align="center"
              padding="checkbox"
              sx={{ backgroundColor: rowBg, minWidth: 52, width: 52 }}
            >
              <Checkbox
                checked={isCurrentChecked}
                inputProps={{
                  "data-row-key": rowKey,
                  "data-month-key": key,
                }}
                onChange={onCheckboxChange}
                size="large"
                sx={CHECKBOX_SX}
              />
            </TableCell>
          );
        })}
      </TableRow>
    );
  },
  (prev, next) =>
    prev.rowData === next.rowData &&
    prev.isDirty === next.isDirty &&
    prev.rowBg === next.rowBg &&
    prev.visibleMonths === next.visibleMonths &&
    prev.onCheckboxChange === next.onCheckboxChange &&
    prev.contentCount === next.contentCount
);

// Component TabPanel để quản lý nội dung các tab
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Component TabPanel con cho tab "Danh mục máy móc"
function MachineCatalogSubTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`machine-catalog-subtab-${index}`}
      aria-labelledby={`machine-catalog-subtab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// ============================================================================
// RfidTableRow — memoized row component for "Quản lý RFID" table.
// Tách ra ngoài + React.memo để mỗi keystroke ô tìm kiếm không re-render
// lại toàn bộ MUI Chip/Typography/Box của hàng nghìn dòng RFID.
// ============================================================================
const RfidTableRow = React.memo(function RfidTableRow({ row, onClick }) {
  const isActive = row.counts_as_active_usage ?? row.active === 1;
  const handleClick = useCallback(() => onClick(row), [onClick, row]);
  const createdAtText = useMemo(
    () =>
      row.created_at ? new Date(row.created_at).toLocaleString("vi-VN") : "—",
    [row.created_at]
  );

  return (
    <TableRow hover sx={RFID_ROW_SX} onClick={handleClick}>
      <TableCell>
        <Typography fontWeight={600}>{row.RFID_machine || "—"}</Typography>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={isActive ? "Đang sử dụng" : "Không sử dụng"}
          color={isActive ? "success" : "default"}
          variant={isActive ? "filled" : "outlined"}
        />
      </TableCell>
      <TableCell>
        {row.machine ? (
          <Box>
            <Typography variant="body2">
              {row.machine.serial_machine}
            </Typography>
            {row.machine.type_machine ? (
              <Typography variant="caption" color="text.secondary">
                {row.machine.type_machine}
              </Typography>
            ) : null}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {row.location ? (
          <Box>
            <Typography variant="body2">
              {row.location.name_location || "—"}
            </Typography>
            {row.location.name_department ? (
              <Typography variant="caption" color="text.secondary">
                {row.location.name_department}
              </Typography>
            ) : null}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell>{createdAtText}</TableCell>
    </TableRow>
  );
});

const RFID_ROW_SX = {
  cursor: "pointer",
  "&:hover": { bgcolor: "rgba(102, 126, 234, 0.06)" },
};

const AdminPage = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [machineCatalogSubTab, setMachineCatalogSubTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // States for data
  const [departments, setDepartments] = useState([]);
  // const [categories, setCategories] = useState([]);
  const [hiTimeSheetDepartments, setHiTimeSheetDepartments] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUserPermissions, setLoadingUserPermissions] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  // States for machine catalogs
  const [machineTypes, setMachineTypes] = useState([]);
  const [machineAttributes, setMachineAttributes] = useState([]);
  const [machineManufacturers, setMachineManufacturers] = useState([]);
  const [machineSuppliers, setMachineSuppliers] = useState([]);
  const [selectedTypeForAttributes, setSelectedTypeForAttributes] =
    useState(null);
  const [typeAttributes, setTypeAttributes] = useState([]);

  // Quản lý RFID (tab)
  const [rfidPayload, setRfidPayload] = useState(null);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidDetailOpen, setRfidDetailOpen] = useState(false);
  const [rfidDetailLoading, setRfidDetailLoading] = useState(false);
  const [selectedRfidRow, setSelectedRfidRow] = useState(null);
  const [rfidHistory, setRfidHistory] = useState([]);
  /** 'all' | 'active' | 'inactive' — lọc bảng theo paper đã bấm */
  const [rfidStatusFilter, setRfidStatusFilter] = useState("all");
  /** Từ khoá tìm kiếm trong bảng RFID — khớp mã RFID, mã máy, serial, loại máy, vị trí, đơn vị */
  const [rfidSearchInput, setRfidSearchInput] = useState("");
  // Debounced query — chỉ trigger filter sau khi user ngừng gõ 200ms,
  // tránh re-render bảng hàng nghìn dòng trên từng keystroke.
  const [rfidSearchQuery, setRfidSearchQuery] = useState("");
  const [openUnusedRfidSearchDialog, setOpenUnusedRfidSearchDialog] =
    useState(false);

  // States for maintenance matrix
  const [maintenanceContents, setMaintenanceContents] = useState([]);
  const [machineTypesForMatrix, setMachineTypesForMatrix] = useState([]);
  const [matrixChecked, setMatrixChecked] = useState({});
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [dirtyColKeys, setDirtyColKeys] = useState(new Set());
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const [addingContent, setAddingContent] = useState(false);
  const [editingContentId, setEditingContentId] = useState(null);
  const [savingEditContent, setSavingEditContent] = useState(false);
  const [confirmDeleteContent, setConfirmDeleteContent] = useState(null);
  const [deletingContentId, setDeletingContentId] = useState(null);
  const [scheduleData, setScheduleData] = useState({});
  const [dirtyScheduleKeys, setDirtyScheduleKeys] = useState(new Set());
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);
  // Dialog xác nhận chạy thủ công autoCreateMaintenanceScheduleDetail
  const [autoCreateConfirmOpen, setAutoCreateConfirmOpen] = useState(false);
  // Dialog kết quả sau khi chạy
  const [autoCreateResult, setAutoCreateResult] = useState(null);
  // Dùng DOM ref thay vì state để tránh re-render khi hover
  const headerCellRefs = useRef({});
  const prevHoveredColKeyRef = useRef(null);
  // State tìm kiếm cho Matrix (raw input, debounced riêng để tránh lag)
  const [searchContent, setSearchContent] = useState("");
  const [searchMachineType, setSearchMachineType] = useState("");
  const debouncedSearchContent = useDebounce(searchContent, 1000);
  const debouncedSearchMachineType = useDebounce(searchMachineType, 1000);
  // State tìm kiếm cho Lịch bảo dưỡng
  const [searchScheduleMachineType, setSearchScheduleMachineType] =
    useState("");
  const [searchScheduleMonth, setSearchScheduleMonth] = useState([]); // [] = hiện tất cả tháng
  const debouncedSearchScheduleMachineType = useDebounce(
    searchScheduleMachineType,
    1000
  );

  // States for Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [currentItem, setCurrentItem] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  // State for notification
  const [notification, setNotification] = useState({
    open: false,
    severity: "success",
    title: "",
    message: "",
  });

  const showNotification = (severity, title, message) => {
    setNotification({ open: true, severity, title, message });
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        deptLocRes,
        // catRes,
        hiTimeSheetRes,
        allPermsRes,
        typesRes,
        attrsRes,
        mfrsRes,
        suppsRes,
      ] = await Promise.all([
        api.admin.getDepartmentsWithLocations(),
        // api.admin.getCategories(),
        api.admin.getHiTimeSheetDepartments(),
        api.admin.getAllPermissions(),
        api.admin.getMachineTypes(),
        api.admin.getMachineAttributes(),
        api.admin.getMachineManufacturers(),
        api.admin.getMachineSuppliers(),
      ]);

      if (deptLocRes.success) setDepartments(deptLocRes.data);
      // if (catRes.success) setCategories(catRes.data);
      if (hiTimeSheetRes.success)
        setHiTimeSheetDepartments(hiTimeSheetRes.data);
      if (allPermsRes.success) setAllPermissions(allPermsRes.data);
      if (typesRes.success) setMachineTypes(typesRes.data);
      if (attrsRes.success) setMachineAttributes(attrsRes.data);
      if (mfrsRes.success) setMachineManufacturers(mfrsRes.data);
      if (suppsRes.success) setMachineSuppliers(suppsRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      showNotification(
        "error",
        "Lỗi tải dữ liệu",
        error.response?.data?.message || error.message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch attributes for a specific type
  const fetchTypeAttributes = useCallback(async (typeUuid) => {
    if (!typeUuid) {
      setTypeAttributes([]);
      return;
    }
    try {
      const res = await api.machines.getMachineTypeAttributes(typeUuid);
      if (res.success) {
        setTypeAttributes(res.data);
      }
    } catch (error) {
      console.error("Error fetching type attributes:", error);
    }
  }, []);

  const fetchRfidList = useCallback(async () => {
    setRfidLoading(true);
    try {
      const res = await api.admin.getMachineRfids();
      if (res.success) {
        setRfidPayload(res.data);
      }
    } catch (error) {
      console.error("Error fetching RFID list:", error);
      showNotification(
        "error",
        "Lỗi tải RFID",
        error.response?.data?.message || error.message
      );
    } finally {
      setRfidLoading(false);
    }
  }, []);

  const fetchMaintenanceMatrix = useCallback(async () => {
    setLoadingMatrix(true);
    setDirtyColKeys(new Set());
    setDirtyScheduleKeys(new Set());
    try {
      const [contentsRes, typesRes, matrixRes, scheduleRes] = await Promise.all(
        [
          api.admin.getMaintenanceContents(),
          api.admin.getMachineTypesForMatrix(),
          api.admin.getMaintenanceMatrix(),
          api.admin.getMaintenanceSchedule(),
        ]
      );

      if (contentsRes.success) setMaintenanceContents(contentsRes.data);
      if (typesRes.success) setMachineTypesForMatrix(typesRes.data);

      if (matrixRes.success) {
        // Cấu trúc: matrixChecked[contentName][colKey] = boolean
        const initChecked = {};
        matrixRes.data.forEach((row) => {
          const colKey = `${row.id_machine_type}_${row.id_machine_attribute ?? "null"}`;
          const content =
            typeof row.maintenance_content === "string"
              ? JSON.parse(row.maintenance_content)
              : row.maintenance_content || {};
          Object.entries(content).forEach(([contentName, val]) => {
            if (!initChecked[contentName]) initChecked[contentName] = {};
            initChecked[contentName][colKey] = val === 1;
          });
        });
        setMatrixChecked(initChecked);
      }

      if (scheduleRes.success) {
        // Cấu trúc: scheduleData[rowKey][monthKey] = boolean
        const initSchedule = {};
        scheduleRes.data.forEach((row) => {
          const rowKey = `${row.id_machine_type}_${row.id_machine_attribute ?? "null"}`;
          initSchedule[rowKey] = {};
          MONTHS_CONFIG.forEach(({ key }) => {
            initSchedule[rowKey][key] = row[key] === 1;
          });
        });
        setScheduleData(initSchedule);
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi tải dữ liệu",
        error.response?.data?.message || error.message
      );
    } finally {
      setLoadingMatrix(false);
    }
  }, []);

  // Logic lọc nội dung bảo dưỡng (dùng debounced để tránh lag khi gõ)
  const filteredContents = useMemo(() => {
    return maintenanceContents.filter((c) =>
      c.name_maintenance_content
        .toLowerCase()
        .includes(debouncedSearchContent.toLowerCase())
    );
  }, [maintenanceContents, debouncedSearchContent]);

  // Logic lọc loại máy (cột) trong matrix
  const filteredMachineTypes = useMemo(() => {
    return machineTypesForMatrix.filter((m) =>
      m.machine_name
        .toLowerCase()
        .includes(debouncedSearchMachineType.toLowerCase())
    );
  }, [machineTypesForMatrix, debouncedSearchMachineType]);

  // Logic lọc loại máy (hàng) trong Lịch bảo dưỡng
  const filteredScheduleMachineTypes = useMemo(() => {
    return machineTypesForMatrix.filter((m) =>
      m.machine_name
        .toLowerCase()
        .includes(debouncedSearchScheduleMachineType.toLowerCase())
    );
  }, [machineTypesForMatrix, debouncedSearchScheduleMachineType]);

  // Đếm số nội dung bảo dưỡng đã tick cho mỗi colKey (để hiển thị
  // ở bảng Lịch bảo dưỡng — biết loại máy nào đã có cấu hình nội dung)
  const contentCountByColKey = useMemo(() => {
    const counts = {};
    Object.values(matrixChecked).forEach((row) => {
      if (!row) return;
      Object.entries(row).forEach(([colKey, val]) => {
        if (val) counts[colKey] = (counts[colKey] ?? 0) + 1;
      });
    });
    return counts;
  }, [matrixChecked]);

  // Logic lọc tháng (cột) trong Lịch bảo dưỡng; [] = hiện tất cả
  const filteredScheduleMonths = useMemo(() => {
    if (searchScheduleMonth.length === 0) return MONTHS_CONFIG;
    return MONTHS_CONFIG.filter((m) => searchScheduleMonth.includes(m.key));
  }, [searchScheduleMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedTypeForAttributes) {
      fetchTypeAttributes(selectedTypeForAttributes);
    }
  }, [selectedTypeForAttributes, fetchTypeAttributes]);

  useEffect(() => {
    if (currentTab === 2) {
      fetchRfidList();
    }
  }, [currentTab, fetchRfidList]);

  useEffect(() => {
    if (currentTab === 4) {
      fetchMaintenanceMatrix();
    }
  }, [currentTab, fetchMaintenanceMatrix]);

  // --- Handlers ---
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Debounce: rfidSearchInput → rfidSearchQuery (200ms)
  useEffect(() => {
    const t = setTimeout(() => setRfidSearchQuery(rfidSearchInput), 200);
    return () => clearTimeout(t);
  }, [rfidSearchInput]);

  // Dùng ref để giữ logic mới nhất (đọc state/showNotification),
  // còn callback truyền xuống RfidTableRow memoized là STABLE để không
  // phá vỡ React.memo khi parent re-render do gõ ô search hoặc thay state khác.
  const rfidRowClickLogicRef = useRef(null);
  rfidRowClickLogicRef.current = async (row) => {
    setSelectedRfidRow(row);
    setRfidDetailOpen(true);
    setRfidDetailLoading(true);
    setRfidHistory([]);
    try {
      const res = await api.admin.getMachineRfidHistory(row.uuid_machine_rfid);
      if (res.success) {
        setRfidHistory(res.data.history || []);
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi lịch sử RFID",
        error.response?.data?.message || error.message
      );
    } finally {
      setRfidDetailLoading(false);
    }
  };
  const handleRfidRowClick = useCallback((row) => {
    rfidRowClickLogicRef.current?.(row);
  }, []);

  const handleCloseRfidDetail = () => {
    setRfidDetailOpen(false);
    setSelectedRfidRow(null);
    setRfidHistory([]);
  };

  // Pre-compute lowercase search blob 1 lần khi rfidPayload thay đổi,
  // tránh lặp toLowerCase() trên hàng nghìn rows ở mỗi keystroke.
  const rfidIndexedItems = useMemo(() => {
    const items = rfidPayload?.items || [];
    return items.map((r) => ({
      item: r,
      isActive: r.counts_as_active_usage ?? r.active === 1,
      searchBlob: [
        r.RFID_machine,
        r.machine?.serial_machine,
        r.machine?.type_machine,
        r.location?.name_location,
        r.location?.name_department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    }));
  }, [rfidPayload]);

  const rfidFilteredItems = useMemo(() => {
    let result = rfidIndexedItems;
    if (rfidStatusFilter === "active") {
      result = result.filter((r) => r.isActive);
    } else if (rfidStatusFilter === "inactive") {
      result = result.filter((r) => !r.isActive);
    }
    const q = rfidSearchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => r.searchBlob.includes(q));
    }
    return result.map((r) => r.item);
  }, [rfidIndexedItems, rfidStatusFilter, rfidSearchQuery]);

  /** Mục tiêu dò RFID (chế độ chỉ RFID) — các thẻ không sử dụng theo logic counts_as_active_usage */
  const unusedRfidTargetsForSearch = useMemo(() => {
    const items = rfidPayload?.items || [];
    const isUsageActive = (r) => r.counts_as_active_usage ?? r.active === 1;
    return items
      .filter((r) => !isUsageActive(r) && r.RFID_machine)
      .map((r) => ({ RFID_machine: r.RFID_machine }));
  }, [rfidPayload]);

  const handleUserSearchChange = (e) => {
    setUserSearchQuery(e.target.value);
  };

  const handleUserSearchSubmit = async () => {
    if (userSearchQuery.length < 2) {
      setUserSearchResults([]);
      showNotification(
        "info",
        "Thông báo",
        "Cần nhập ít nhất 2 ký tự để tìm kiếm."
      );
      return;
    }
    setLoadingUsers(true);
    setSelectedUser(null);
    setSelectedUserPermissions({});
    try {
      const res = await api.admin.searchUsers(userSearchQuery);
      if (res.success) {
        setUserSearchResults(res.data);
        if (res.data.length === 0) {
          showNotification(
            "info",
            "Không tìm thấy",
            "Không tìm thấy người dùng nào phù hợp."
          );
        }
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi tìm kiếm",
        error.response?.data?.message || error.message
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectUser = async (user) => {
    if (selectedUser && selectedUser.ma_nv === user.ma_nv) {
      return;
    }

    setSelectedUser(user);
    setUserSearchResults([]);
    setLoadingUserPermissions(true);
    try {
      const res = await api.admin.getUserPermissions(user.ma_nv);
      if (res.success) {
        const permsObject = {};
        allPermissions.forEach((permName) => {
          permsObject[permName] = res.data.includes(permName);
        });
        setSelectedUserPermissions(permsObject);
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi lấy quyền",
        error.response?.data?.message || error.message
      );
    } finally {
      setLoadingUserPermissions(false);
    }
  };

  const handlePermissionToggle = (e) => {
    const { name, checked } = e.target;
    setSelectedUserPermissions((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSavingPermissions(true);
    try {
      const permissionNames = Object.keys(selectedUserPermissions).filter(
        (key) => selectedUserPermissions[key] === true
      );

      await api.admin.updateUserPermissions(
        selectedUser.ma_nv,
        permissionNames
      );
      showNotification("success", "Thành công", "Cập nhật quyền thành công");
    } catch (error) {
      showNotification(
        "error",
        "Lỗi lưu quyền",
        error.response?.data?.message || error.message
      );
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleOpenDialog = (mode, type, item = null, parent = null) => {
    setDialogMode(mode);
    let finalItem = { type: type, ...item };

    if (mode === "edit" && type === "location") {
      if (parent) {
        finalItem.uuid_department = parent.uuid_department;
        // Giữ accordion mở khi edit location
        setExpandedAccordions((prev) => ({
          ...prev,
          [parent.uuid_department]: true,
        }));
      }
    } else if (mode === "edit" && type === "department") {
      // Giữ accordion mở khi edit department
      if (item && item.uuid_department) {
        setExpandedAccordions((prev) => ({
          ...prev,
          [item.uuid_department]: true,
        }));
      }
    } else if (mode === "create") {
      if (type === "department") {
        finalItem = { type: "department" };
      } else if (type === "category") {
        finalItem = { type: "category" };
      } else if (type === "machine-type") {
        finalItem = { type: "machine-type" };
      } else if (type === "machine-attribute") {
        finalItem = { type: "machine-attribute" };
      } else if (type === "machine-manufacturer") {
        finalItem = { type: "machine-manufacturer" };
      } else if (type === "machine-supplier") {
        finalItem = { type: "machine-supplier" };
      }
    }

    setCurrentItem(finalItem);
    setDialogOpen(true);
  };

  const handleOpenAddLocation = (department) => {
    setDialogMode("create");
    setCurrentItem({
      type: "location",
      uuid_department: department.uuid_department,
    });
    // Mở accordion của department này
    setExpandedAccordions((prev) => ({
      ...prev,
      [department.uuid_department]: true,
    }));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentItem(null);
  };

  const handleDialogChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setDialogLoading(true);
    try {
      const { type, ...data } = currentItem;
      let apiCall;
      let successMessage = "";
      let keepAccordionOpen = null;

      if (type === "department") {
        if (dialogMode === "create") {
          apiCall = api.admin.createDepartment(data);
          successMessage = "Tạo đơn vị thành công";
        } else {
          apiCall = api.admin.updateDepartment(data.uuid_department, data);
          successMessage = "Cập nhật đơn vị thành công";
          keepAccordionOpen = data.uuid_department;
        }
      } else if (type === "location") {
        if (dialogMode === "create") {
          apiCall = api.admin.createLocation(data);
          successMessage = "Tạo vị trí thành công";
          keepAccordionOpen = data.uuid_department;
        } else {
          const updateData = { name_location: data.name_location };
          apiCall = api.admin.updateLocation(data.uuid_location, updateData);
          successMessage = "Cập nhật vị trí thành công";
          keepAccordionOpen = data.uuid_department;
        }
      } else if (type === "category") {
        if (dialogMode === "create") {
          apiCall = api.admin.createCategory(data);
          successMessage = "Tạo loại thành công";
        } else {
          apiCall = api.admin.updateCategory(data.uuid_category, data);
          successMessage = "Cập nhật loại thành công";
        }
      } else if (type === "machine-type") {
        if (dialogMode === "create") {
          apiCall = api.admin.createMachineType(data);
          successMessage = "Tạo loại máy thành công";
        } else {
          apiCall = api.admin.updateMachineType(data.uuid, data);
          successMessage = "Cập nhật loại máy thành công";
        }
      } else if (type === "machine-attribute") {
        if (dialogMode === "create") {
          apiCall = api.admin.createMachineAttribute(data);
          successMessage = "Tạo đặc tính thành công";
        } else {
          apiCall = api.admin.updateMachineAttribute(data.uuid, data);
          successMessage = "Cập nhật đặc tính thành công";
        }
      } else if (type === "machine-manufacturer") {
        if (dialogMode === "create") {
          apiCall = api.admin.createMachineManufacturer(data);
          successMessage = "Tạo hãng sản xuất thành công";
        } else {
          apiCall = api.admin.updateMachineManufacturer(data.uuid, data);
          successMessage = "Cập nhật hãng sản xuất thành công";
        }
      } else if (type === "machine-supplier") {
        if (dialogMode === "create") {
          apiCall = api.admin.createMachineSupplier(data);
          successMessage = "Tạo nhà cung cấp thành công";
        } else {
          apiCall = api.admin.updateMachineSupplier(data.uuid, data);
          successMessage = "Cập nhật nhà cung cấp thành công";
        }
      }

      await apiCall;
      showNotification("success", "Thành công", successMessage);

      // Giữ accordion mở nếu đang thao tác với location hoặc edit department
      if (keepAccordionOpen) {
        setExpandedAccordions((prev) => ({
          ...prev,
          [keepAccordionOpen]: true,
        }));
      }

      fetchData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving item:", error);

      // Xử lý riêng lỗi trùng (Duplicate entry) cho các danh mục
      const rawMessage = error.response?.data?.message || error.message || "";
      let friendlyMessage = rawMessage;

      if (rawMessage && rawMessage.toString().includes("Duplicate entry")) {
        if (currentItem?.type === "machine-type") {
          friendlyMessage = "Tên loại máy bị trùng.";
        } else if (currentItem?.type === "machine-attribute") {
          friendlyMessage = "Tên đặc tính máy bị trùng.";
        } else if (currentItem?.type === "machine-manufacturer") {
          friendlyMessage = "Tên hãng sản xuất bị trùng.";
        } else if (currentItem?.type === "machine-supplier") {
          friendlyMessage = "Tên nhà cung cấp bị trùng.";
        }
      }

      showNotification("error", "Lỗi", friendlyMessage);
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDelete = async (type, uuid, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) {
      return;
    }
    try {
      let apiCall;
      let successMessage = "";
      if (type === "machine-type") {
        apiCall = api.admin.deleteMachineType(uuid);
        successMessage = "Xóa loại máy thành công";
      } else if (type === "machine-attribute") {
        apiCall = api.admin.deleteMachineAttribute(uuid);
        successMessage = "Xóa đặc tính thành công";
      } else if (type === "machine-manufacturer") {
        apiCall = api.admin.deleteMachineManufacturer(uuid);
        successMessage = "Xóa hãng sản xuất thành công";
      } else if (type === "machine-supplier") {
        apiCall = api.admin.deleteMachineSupplier(uuid);
        successMessage = "Xóa nhà cung cấp thành công";
      }
      await apiCall;
      showNotification("success", "Thành công", successMessage);
      fetchData();
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || error.message
      );
    }
  };

  const handleLinkAttribute = async (typeUuid, attributeUuid) => {
    try {
      await api.admin.linkAttributeToType(typeUuid, attributeUuid);
      showNotification("success", "Thành công", "Liên kết đặc tính thành công");
      if (selectedTypeForAttributes === typeUuid) {
        fetchTypeAttributes(typeUuid);
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || error.message
      );
    }
  };

  const handleUnlinkAttribute = async (typeUuid, attributeUuid) => {
    try {
      await api.admin.unlinkAttributeFromType(typeUuid, attributeUuid);
      showNotification(
        "success",
        "Thành công",
        "Hủy liên kết đặc tính thành công"
      );
      if (selectedTypeForAttributes === typeUuid) {
        fetchTypeAttributes(typeUuid);
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || error.message
      );
    }
  };

  // Stable handler — không tạo hàm mới mỗi render (không có dependency)
  const handleMatrixCheckboxChange = useCallback((e) => {
    const colKey = e.target.dataset.colKey;
    const contentName = e.target.dataset.contentName;
    const checked = e.target.checked;
    // Cấu trúc mới: [contentName][colKey] → chỉ row này thay đổi reference
    setMatrixChecked((prev) => ({
      ...prev,
      [contentName]: {
        ...prev[contentName],
        [colKey]: checked,
      },
    }));
    setDirtyColKeys((prev) => {
      const next = new Set(prev);
      next.add(colKey);
      return next;
    });
  }, []);

  const handleSaveMatrix = async () => {
    if (dirtyColKeys.size === 0) return;
    setSavingMatrix(true);
    const savedCount = dirtyColKeys.size;
    try {
      const savePromises = [];
      dirtyColKeys.forEach((colKey) => {
        const col = machineTypesForMatrix.find((c) => getColKey(c) === colKey);
        if (!col) return;
        const contentJson = {};
        maintenanceContents.forEach((c) => {
          const cName = c.name_maintenance_content;
          contentJson[cName] =
            (matrixChecked[cName]?.[colKey] ?? false) ? 1 : 0;
        });
        savePromises.push(
          api.admin.saveMaintenanceMatrix({
            id_machine_type: col.id_machine_type,
            id_machine_attribute: col.id_machine_attribute,
            maintenance_content: contentJson,
          })
        );
      });
      await Promise.all(savePromises);
      setDirtyColKeys(new Set());
      showNotification(
        "success",
        "Lưu thành công",
        `Đã lưu thay đổi cho ${savedCount} loại máy`
      );
    } catch (error) {
      showNotification(
        "error",
        "Lỗi lưu",
        error.response?.data?.message || error.message
      );
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleAddMaintenanceContent = async () => {
    const name = newContentName.trim();
    if (!name) return;
    setAddingContent(true);
    try {
      const res = await api.admin.addMaintenanceContent(name);
      if (res.success) {
        // Thêm vào danh sách local (không cần reload toàn bộ matrix)
        setMaintenanceContents((prev) => [...prev, res.data]);
        setNewContentName("");
        showNotification("success", "Thêm thành công", `Đã thêm "${name}"`);
      } else {
        showNotification("error", "Lỗi", res.message);
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || error.message
      );
    } finally {
      setAddingContent(false);
    }
  };

  const handleStartEditContent = useCallback((content) => {
    setEditingContentId(content.id_maintenance_content);
  }, []);

  const handleCancelEditContent = useCallback(() => {
    setEditingContentId(null);
  }, []);

  const handleSaveEditContent = useCallback(
    async (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setSavingEditContent(true);
      try {
        const res = await api.admin.updateMaintenanceContent(
          editingContentId,
          trimmed
        );
        if (res.success) {
          setMaintenanceContents((prev) =>
            prev.map((c) =>
              c.id_maintenance_content === editingContentId
                ? { ...c, name_maintenance_content: trimmed }
                : c
            )
          );
          setEditingContentId(null);
          showNotification(
            "success",
            "Cập nhật thành công",
            `Đã đổi tên thành "${trimmed}"`
          );
        } else {
          showNotification("error", "Lỗi", res.message);
        }
      } catch (error) {
        showNotification(
          "error",
          "Lỗi",
          error.response?.data?.message || error.message
        );
      } finally {
        setSavingEditContent(false);
      }
    },
    [editingContentId]
  );

  const handleConfirmDeleteContent = useCallback((content) => {
    setConfirmDeleteContent(content);
  }, []);

  const handleDeleteContent = async () => {
    if (!confirmDeleteContent) return;
    setDeletingContentId(confirmDeleteContent.id_maintenance_content);
    try {
      const res = await api.admin.deleteMaintenanceContent(
        confirmDeleteContent.id_maintenance_content
      );
      if (res.success) {
        setMaintenanceContents((prev) =>
          prev.filter(
            (c) =>
              c.id_maintenance_content !==
              confirmDeleteContent.id_maintenance_content
          )
        );
        showNotification(
          "success",
          "Xoá thành công",
          `Đã xoá "${confirmDeleteContent.name_maintenance_content}"`
        );
      } else {
        showNotification("error", "Lỗi", res.message);
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || error.message
      );
    } finally {
      setDeletingContentId(null);
      setConfirmDeleteContent(null);
    }
  };

  // Stable handler — scheduleData[rowKey][monthKey]
  const handleScheduleChange = useCallback((e) => {
    const rowKey = e.target.dataset.rowKey;
    const monthKey = e.target.dataset.monthKey;
    const checked = e.target.checked;
    setScheduleData((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [monthKey]: checked },
    }));
    setDirtyScheduleKeys((prev) => {
      const next = new Set(prev);
      next.add(rowKey);
      return next;
    });
  }, []);

  const handleSaveSchedule = async () => {
    if (dirtyScheduleKeys.size === 0) return;
    setSavingSchedule(true);
    const savedCount = dirtyScheduleKeys.size;
    try {
      const promises = [];
      dirtyScheduleKeys.forEach((rowKey) => {
        const col = machineTypesForMatrix.find((c) => getColKey(c) === rowKey);
        if (!col) return;
        const months = {};
        MONTHS_CONFIG.forEach(({ key }) => {
          months[key] = scheduleData[rowKey]?.[key] ?? false;
        });
        promises.push(
          api.admin.saveMaintenanceSchedule({
            id_machine_type: col.id_machine_type,
            id_machine_attribute: col.id_machine_attribute,
            months,
          })
        );
      });
      await Promise.all(promises);
      setDirtyScheduleKeys(new Set());
      showNotification(
        "success",
        "Lưu thành công",
        `Đã lưu lịch bảo dưỡng cho ${savedCount} loại máy`
      );
    } catch (error) {
      showNotification(
        "error",
        "Lỗi lưu",
        error.response?.data?.message || error.message
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAutoCreateSchedule = async () => {
    setAutoCreating(true);
    try {
      const res = await api.admin.autoCreateMaintenanceSchedule();
      setAutoCreateConfirmOpen(false);
      if (!res?.success) {
        showNotification(
          "error",
          "Lỗi tạo lịch bảo dưỡng",
          res?.message || "Có lỗi xảy ra khi tạo lịch bảo dưỡng"
        );
        return;
      }
      setAutoCreateResult(res);
      // Notification tóm tắt
      showNotification(
        res.inserted > 0 ? "success" : "info",
        `Tạo lịch bảo dưỡng ${res.year}`,
        res.inserted > 0
          ? `Đã chèn ${res.inserted} dòng vào lịch bảo dưỡng năm ${res.year}.`
          : `Lịch bảo dưỡng năm ${res.year} đã đầy đủ. Không có dòng nào được tạo thêm.`
      );
      // Reload data nếu có dòng được tạo (để chip "loại máy đã có lịch" v.v. cập nhật)
      if (res.inserted > 0) {
        fetchMaintenanceMatrix();
      }
    } catch (error) {
      showNotification(
        "error",
        "Lỗi tạo lịch bảo dưỡng",
        error.response?.data?.message || error.message
      );
    } finally {
      setAutoCreating(false);
    }
  };

  // --- Matrix hover: thao tác DOM trực tiếp, không dùng state → không re-render ---
  const handleMatrixColMouseEnter = (colKey) => {
    const prevKey = prevHoveredColKeyRef.current;
    if (prevKey && prevKey !== colKey) {
      const prevEl = headerCellRefs.current[prevKey];
      // Xóa inline style → sx (React) tự lo màu dirty/normal
      if (prevEl) prevEl.style.backgroundColor = "";
    }
    const el = headerCellRefs.current[colKey];
    if (el) {
      el.style.backgroundColor = "#fff000";
      prevHoveredColKeyRef.current = colKey;
    }
  };

  const handleMatrixBodyMouseLeave = () => {
    const prevKey = prevHoveredColKeyRef.current;
    if (prevKey) {
      const el = headerCellRefs.current[prevKey];
      if (el) el.style.backgroundColor = "";
      prevHoveredColKeyRef.current = null;
    }
  };

  const handleMatrixLabelMouseEnter = () => {
    const prevKey = prevHoveredColKeyRef.current;
    if (prevKey) {
      const el = headerCellRefs.current[prevKey];
      if (el) el.style.backgroundColor = "";
      prevHoveredColKeyRef.current = null;
    }
  };

  // --- Render Dialog Content ---
  const renderDialogContent = () => {
    if (!currentItem) return null;
    const { type } = currentItem;

    switch (type) {
      case "department":
        return (
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên Đơn vị"
              name="name_department"
              value={currentItem.name_department || ""}
              onChange={handleDialogChange}
              required
              sx={inputStyle}
            />
            <FormControl fullWidth sx={inputStyle}>
              <InputLabel id="hitimesheet-dept-select-label">
                Phòng ban liên kết (HiTimeSheet)
              </InputLabel>
              <Select
                labelId="hitimesheet-dept-select-label"
                name="ten_phong_ban"
                value={
                  currentItem.ten_phong_ban === "N/A"
                    ? ""
                    : currentItem.ten_phong_ban || ""
                }
                label="Phòng ban liên kết (HiTimeSheet)"
                onChange={handleDialogChange}
              >
                <MenuItem value="">
                  <em>Không chọn (N/A)</em>
                </MenuItem>
                {hiTimeSheetDepartments.map((dept) => (
                  <MenuItem key={dept.ten_phong_ban} value={dept.ten_phong_ban}>
                    {dept.ten_phong_ban}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        );
      case "location":
        return (
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên Vị trí"
              name="name_location"
              value={currentItem.name_location || ""}
              onChange={handleDialogChange}
              required
              sx={inputStyle}
            />
          </Stack>
        );
      case "category":
        return (
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên Loại"
              name="name_category"
              value={currentItem.name_category || ""}
              onChange={handleDialogChange}
              required
              sx={inputStyle}
            />
          </Stack>
        );
      case "machine-type":
        return (
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên Loại máy"
              name="name_machine_type"
              value={currentItem.name_machine_type || ""}
              onChange={handleDialogChange}
              required
              sx={inputStyle}
            />
          </Stack>
        );
      case "machine-attribute":
        return (
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên Đặc tính"
              name="name_machine_attribute"
              value={currentItem.name_machine_attribute || ""}
              onChange={handleDialogChange}
              required
              sx={inputStyle}
            />
          </Stack>
        );
      case "machine-manufacturer":
        return (
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên Hãng sản xuất"
              name="name_machine_manufacturer"
              value={currentItem.name_machine_manufacturer || ""}
              onChange={handleDialogChange}
              required
              sx={inputStyle}
            />
          </Stack>
        );
      case "machine-supplier":
        return (
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tên Nhà cung cấp"
              name="name_machine_supplier"
              value={currentItem.name_machine_supplier || ""}
              onChange={handleDialogChange}
              required
              sx={inputStyle}
            />
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <NavigationBar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* HEADER */}
        <Box sx={{ mb: 6 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                background: "linear-gradient(45deg, #667eea, #764ba2)",
              }}
            >
              <AdminPanelSettings sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography
                variant={isMobile ? "h4" : "h3"}
                component="h1"
                sx={gradientText}
              >
                Trang Quản Trị
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
              >
                Quản lý danh mục & phân quyền hệ thống
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* MAIN CONTENT CARD */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 4 },
            borderRadius: "20px",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              aria-label="Admin tabs"
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  borderRadius: "12px 12px 0 0",
                },
                "& .Mui-selected": {
                  color: "#764ba2",
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#764ba2",
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
              }}
            >
              <Tab
                label="Đơn vị & Vị trí"
                icon={<Business />}
                iconPosition="start"
              />
              {/* <Tab label="Phân Loại" icon={<Category />} iconPosition="start" /> */}
              <Tab
                label="Danh mục máy móc"
                icon={<Build />}
                iconPosition="start"
              />
              <Tab label="Quản lý RFID" icon={<Nfc />} iconPosition="start" />
              <Tab label="Phân Quyền" icon={<People />} iconPosition="start" />
              <Tab
                label="Cấu hình nội dung bảo dưỡng"
                icon={<PlaylistAddCheck />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* === TAB ĐƠN VỊ & VỊ TRÍ === */}
              <TabPanel value={currentTab} index={0}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog("create", "department")}
                  sx={{ mb: 3, px: 3, py: 1.2, ...btnGreenStyle }}
                >
                  Thêm Đơn vị
                </Button>

                <Stack spacing={2}>
                  {departments.map((dept) => (
                    <Accordion
                      key={dept.uuid_department}
                      elevation={0}
                      expanded={
                        expandedAccordions[dept.uuid_department] || false
                      }
                      onChange={(e, isExpanded) =>
                        setExpandedAccordions((prev) => ({
                          ...prev,
                          [dept.uuid_department]: isExpanded,
                        }))
                      }
                      sx={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: "12px !important",
                        "&:before": { display: "none" },
                        overflow: "hidden",
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{
                          bgcolor: "rgba(245, 245, 245, 0.5)",
                          "& .MuiAccordionSummary-content": {
                            alignItems: "center",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            flexGrow: 1,
                            display: "flex",
                            alignItems: "center",
                            pr: 2,
                          }}
                        >
                          <Avatar
                            sx={{
                              background:
                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              width: 40,
                              height: 40,
                              mr: 2,
                            }}
                          >
                            <Business sx={{ fontSize: 20 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {dept.name_department}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Liên kết HiTimeSheet:{" "}
                              <Box
                                component="span"
                                fontWeight="bold"
                                color="primary.main"
                              >
                                {dept.ten_phong_ban || "N/A"}
                              </Box>
                            </Typography>
                          </Box>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={1}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isMobile && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Add />}
                              onClick={() => handleOpenAddLocation(dept)}
                              sx={{ borderRadius: "8px" }}
                            >
                              Vị trí
                            </Button>
                          )}
                          {isMobile && (
                            <IconButton
                              size="small"
                              onClick={() => handleOpenAddLocation(dept)}
                              sx={{
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                              }}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          )}

                          <IconButton
                            color="primary"
                            onClick={() =>
                              handleOpenDialog("edit", "department", dept)
                            }
                            sx={{ bgcolor: "rgba(102, 126, 234, 0.1)" }}
                          >
                            <Edit />
                          </IconButton>
                        </Stack>
                      </AccordionSummary>

                      <AccordionDetails sx={{ pt: 2, px: 3, pb: 3 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            mb: 2,
                            fontWeight: 700,
                            color: "text.secondary",
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Danh sách vị trí ({dept.locations.length})
                        </Typography>

                        {dept.locations.length > 0 ? (
                          <Grid container spacing={2}>
                            {dept.locations.map((loc) => (
                              <Grid
                                size={{ xs: 12, sm: 6, md: 4 }}
                                key={loc.uuid_location}
                              >
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    p: 1.5,
                                    display: "flex",
                                    alignItems: "center",
                                    borderRadius: "12px",
                                    borderColor: "rgba(0,0,0,0.08)",
                                  }}
                                >
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <LocationOn
                                      color="action"
                                      fontSize="small"
                                    />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={loc.name_location}
                                    primaryTypographyProps={{
                                      fontSize: "0.95rem",
                                      fontWeight: 500,
                                    }}
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenDialog(
                                        "edit",
                                        "location",
                                        loc,
                                        dept
                                      )
                                    }
                                  >
                                    <Edit fontSize="small" color="primary" />
                                  </IconButton>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Alert severity="info" sx={{ borderRadius: "12px" }}>
                            Chưa có vị trí nào được thêm vào đơn vị này.
                          </Alert>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </TabPanel>

              {/* === TAB PHÂN LOẠI === */}
              {/* <TabPanel value={currentTab} index={1}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog("create", "category")}
                  sx={{ mb: 3, px: 3, py: 1.2, ...btnGreenStyle }}
                >
                  Thêm Phân Loại
                </Button>

                <Paper
                  variant="outlined"
                  sx={{ borderRadius: "16px", overflow: "hidden" }}
                >
                  <List disablePadding>
                    {categories.map((row, index) => (
                      <ListItem
                        key={row.uuid_category}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={() =>
                              handleOpenDialog("edit", "category", row)
                            }
                            sx={{ bgcolor: "rgba(0,0,0,0.03)" }}
                          >
                            <Edit color="primary" />
                          </IconButton>
                        }
                        divider={index < categories.length - 1}
                        sx={{ py: 2, px: 3 }}
                      >
                        <ListItemIcon sx={{ minWidth: 50 }}>
                          <Avatar
                            sx={{
                              bgcolor: "rgba(118, 75, 162, 0.1)",
                              color: "#764ba2",
                            }}
                          >
                            <Category />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={row.name_category}
                          primaryTypographyProps={{
                            fontWeight: 600,
                            fontSize: "1.05rem",
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </TabPanel> */}

              {/* === TAB DANH MỤC MÁY MÓC === */}
              <TabPanel value={currentTab} index={1}>
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                  <Tabs
                    value={machineCatalogSubTab}
                    onChange={(e, newValue) =>
                      setMachineCatalogSubTab(newValue)
                    }
                    aria-label="Machine catalog sub tabs"
                    variant={isMobile ? "scrollable" : "standard"}
                    scrollButtons="auto"
                    sx={{
                      "& .MuiTab-root": {
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        minHeight: 48,
                      },
                      "& .Mui-selected": {
                        color: "#764ba2",
                      },
                      "& .MuiTabs-indicator": {
                        backgroundColor: "#764ba2",
                        height: 3,
                      },
                    }}
                  >
                    <Tab
                      label="Loại máy & Đặc tính"
                      icon={<Settings />}
                      iconPosition="start"
                    />
                    <Tab
                      label="Hãng sản xuất"
                      icon={<Factory />}
                      iconPosition="start"
                    />
                    <Tab
                      label="Nhà cung cấp"
                      icon={<LocalShipping />}
                      iconPosition="start"
                    />
                  </Tabs>
                </Box>

                {/* TAB CON: LOẠI MÁY & ĐẶC TÍNH */}
                <MachineCatalogSubTabPanel
                  value={machineCatalogSubTab}
                  index={0}
                >
                  <Grid container spacing={3}>
                    {/* LIÊN KẾT ĐẶC TÍNH VỚI LOẠI MÁY */}
                    <Grid size={{ xs: 12 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 3,
                          borderRadius: "16px",
                        }}
                      >
                        <Typography variant="h6" fontWeight={600} mb={2}>
                          Liên kết Đặc tính với Loại máy
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth sx={inputStyle}>
                              <InputLabel>Chọn Loại máy</InputLabel>
                              <Select
                                value={selectedTypeForAttributes || ""}
                                label="Chọn Loại máy"
                                onChange={(e) => {
                                  const uuid = e.target.value;
                                  setSelectedTypeForAttributes(uuid);
                                  fetchTypeAttributes(uuid);
                                }}
                              >
                                <MenuItem value="">
                                  <em>Chọn loại máy</em>
                                </MenuItem>
                                {machineTypes.map((type) => (
                                  <MenuItem key={type.uuid} value={type.uuid}>
                                    {type.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, md: 8 }}>
                            {selectedTypeForAttributes ? (
                              <Box>
                                <Typography variant="subtitle2" mb={1}>
                                  Đặc tính đã liên kết:
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 1,
                                    mb: 2,
                                  }}
                                >
                                  {typeAttributes.map((attr) => (
                                    <Chip
                                      key={attr.uuid}
                                      label={attr.name}
                                      onDelete={() =>
                                        handleUnlinkAttribute(
                                          selectedTypeForAttributes,
                                          attr.uuid
                                        )
                                      }
                                      deleteIcon={<LinkOff />}
                                      color="primary"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                                <Typography variant="subtitle2" mb={1}>
                                  Đặc tính chưa liên kết:
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 1,
                                  }}
                                >
                                  {machineAttributes
                                    .filter(
                                      (attr) =>
                                        !typeAttributes.some(
                                          (ta) => ta.uuid === attr.uuid
                                        )
                                    )
                                    .map((attr) => (
                                      <Chip
                                        key={attr.uuid}
                                        label={attr.name}
                                        onClick={() =>
                                          handleLinkAttribute(
                                            selectedTypeForAttributes,
                                            attr.uuid
                                          )
                                        }
                                        icon={<Link />}
                                        color="default"
                                        variant="outlined"
                                        sx={{ cursor: "pointer" }}
                                      />
                                    ))}
                                </Box>
                              </Box>
                            ) : (
                              <Alert severity="info">
                                Vui lòng chọn loại máy để quản lý đặc tính
                              </Alert>
                            )}
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>

                    {/* LOẠI MÁY */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 3,
                          borderRadius: "16px",
                          height: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6" fontWeight={600}>
                            Loại máy
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() =>
                              handleOpenDialog("create", "machine-type")
                            }
                            sx={btnGreenStyle}
                          >
                            Thêm
                          </Button>
                        </Box>
                        <List disablePadding>
                          {machineTypes.map((item, index) => (
                            <ListItem
                              key={item.uuid}
                              secondaryAction={
                                <Box>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenDialog("edit", "machine-type", {
                                        uuid: item.uuid,
                                        name_machine_type: item.name,
                                      })
                                    }
                                  >
                                    <Edit fontSize="small" color="primary" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDelete(
                                        "machine-type",
                                        item.uuid,
                                        item.name
                                      )
                                    }
                                  >
                                    <Delete fontSize="small" color="error" />
                                  </IconButton>
                                </Box>
                              }
                              divider={index < machineTypes.length - 1}
                              sx={{ py: 1 }}
                            >
                              <ListItemText primary={item.name} />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>

                    {/* ĐẶC TÍNH */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 3,
                          borderRadius: "16px",
                          height: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6" fontWeight={600}>
                            Đặc tính
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() =>
                              handleOpenDialog("create", "machine-attribute")
                            }
                            sx={btnGreenStyle}
                          >
                            Thêm
                          </Button>
                        </Box>
                        <List disablePadding>
                          {machineAttributes.map((item, index) => (
                            <ListItem
                              key={item.uuid}
                              secondaryAction={
                                <Box>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenDialog(
                                        "edit",
                                        "machine-attribute",
                                        {
                                          uuid: item.uuid,
                                          name_machine_attribute: item.name,
                                        }
                                      )
                                    }
                                  >
                                    <Edit fontSize="small" color="primary" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDelete(
                                        "machine-attribute",
                                        item.uuid,
                                        item.name
                                      )
                                    }
                                  >
                                    <Delete fontSize="small" color="error" />
                                  </IconButton>
                                </Box>
                              }
                              divider={index < machineAttributes.length - 1}
                              sx={{ py: 1 }}
                            >
                              <ListItemText primary={item.name} />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  </Grid>
                </MachineCatalogSubTabPanel>

                {/* TAB CON: HÃNG SẢN XUẤT */}
                <MachineCatalogSubTabPanel
                  value={machineCatalogSubTab}
                  index={1}
                >
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 3,
                          borderRadius: "16px",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6" fontWeight={600}>
                            Hãng sản xuất
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() =>
                              handleOpenDialog("create", "machine-manufacturer")
                            }
                            sx={btnGreenStyle}
                          >
                            Thêm
                          </Button>
                        </Box>
                        <List disablePadding>
                          {machineManufacturers.map((item, index) => (
                            <ListItem
                              key={item.uuid}
                              secondaryAction={
                                <Box>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenDialog(
                                        "edit",
                                        "machine-manufacturer",
                                        {
                                          uuid: item.uuid,
                                          name_machine_manufacturer: item.name,
                                        }
                                      )
                                    }
                                  >
                                    <Edit fontSize="small" color="primary" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDelete(
                                        "machine-manufacturer",
                                        item.uuid,
                                        item.name
                                      )
                                    }
                                  >
                                    <Delete fontSize="small" color="error" />
                                  </IconButton>
                                </Box>
                              }
                              divider={index < machineManufacturers.length - 1}
                              sx={{ py: 1 }}
                            >
                              <ListItemText primary={item.name} />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  </Grid>
                </MachineCatalogSubTabPanel>

                {/* TAB CON: NHÀ CUNG CẤP */}
                <MachineCatalogSubTabPanel
                  value={machineCatalogSubTab}
                  index={2}
                >
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 3,
                          borderRadius: "16px",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6" fontWeight={600}>
                            Nhà cung cấp
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() =>
                              handleOpenDialog("create", "machine-supplier")
                            }
                            sx={btnGreenStyle}
                          >
                            Thêm
                          </Button>
                        </Box>
                        <List disablePadding>
                          {machineSuppliers.map((item, index) => (
                            <ListItem
                              key={item.uuid}
                              secondaryAction={
                                <Box>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenDialog(
                                        "edit",
                                        "machine-supplier",
                                        {
                                          uuid: item.uuid,
                                          name_machine_supplier: item.name,
                                        }
                                      )
                                    }
                                  >
                                    <Edit fontSize="small" color="primary" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDelete(
                                        "machine-supplier",
                                        item.uuid,
                                        item.name
                                      )
                                    }
                                  >
                                    <Delete fontSize="small" color="error" />
                                  </IconButton>
                                </Box>
                              }
                              divider={index < machineSuppliers.length - 1}
                              sx={{ py: 1 }}
                            >
                              <ListItemText primary={item.name} />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  </Grid>
                </MachineCatalogSubTabPanel>
              </TabPanel>

              {/* === TAB QUẢN LÝ RFID === */}
              <TabPanel value={currentTab} index={2}>
                <Box>
                  {rfidLoading ? (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        py: 6,
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper
                            role="button"
                            tabIndex={0}
                            onClick={() => setRfidStatusFilter("all")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setRfidStatusFilter("all");
                              }
                            }}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: "16px",
                              textAlign: "center",
                              cursor: "pointer",
                              borderWidth: 2,
                              borderColor:
                                rfidStatusFilter === "all"
                                  ? "primary.main"
                                  : "divider",
                              transition: "border-color 0.2s, box-shadow 0.2s",
                              boxShadow:
                                rfidStatusFilter === "all" ? 2 : "none",
                              "&:hover": {
                                boxShadow: 1,
                              },
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Tổng số thẻ
                            </Typography>
                            <Typography variant="h5" fontWeight={700}>
                              {rfidPayload?.stats?.total ?? 0}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper
                            role="button"
                            tabIndex={0}
                            onClick={() => setRfidStatusFilter("active")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setRfidStatusFilter("active");
                              }
                            }}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: "16px",
                              textAlign: "center",
                              cursor: "pointer",
                              borderWidth: 2,
                              borderColor:
                                rfidStatusFilter === "active"
                                  ? "primary.main"
                                  : "success.light",
                              bgcolor: "rgba(46, 125, 50, 0.06)",
                              transition: "border-color 0.2s, box-shadow 0.2s",
                              boxShadow:
                                rfidStatusFilter === "active" ? 2 : "none",
                              "&:hover": {
                                boxShadow: 1,
                              },
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Đang sử dụng
                            </Typography>
                            <Typography
                              variant="h5"
                              fontWeight={700}
                              color="success.dark"
                            >
                              {rfidPayload?.stats?.active ?? 0}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper
                            role="button"
                            tabIndex={0}
                            onClick={() => setRfidStatusFilter("inactive")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setRfidStatusFilter("inactive");
                              }
                            }}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: "16px",
                              textAlign: "center",
                              cursor: "pointer",
                              borderWidth: 2,
                              borderColor:
                                rfidStatusFilter === "inactive"
                                  ? "primary.main"
                                  : "action.disabled",
                              bgcolor: "rgba(0, 0, 0, 0.04)",
                              transition: "border-color 0.2s, box-shadow 0.2s",
                              boxShadow:
                                rfidStatusFilter === "inactive" ? 2 : "none",
                              "&:hover": {
                                boxShadow: 1,
                              },
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Không sử dụng
                            </Typography>
                            <Typography variant="h5" fontWeight={700}>
                              {rfidPayload?.stats?.inactive ?? 0}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {unusedRfidTargetsForSearch.length > 0
                            ? `Danh sách có ${unusedRfidTargetsForSearch.length} thẻ không sử dụng — mở dò tìm để quét lần lượt các mã đã điền sẵn (có thể sửa hoặc thêm mã).`
                            : "Chưa có thẻ không sử dụng trong danh sách hiện tại; bạn vẫn có thể mở dò tìm và nhập mã RFID thủ công."}
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<Radar />}
                          disabled={rfidLoading}
                          onClick={() => setOpenUnusedRfidSearchDialog(true)}
                          sx={{
                            alignSelf: { xs: "stretch", sm: "center" },
                            borderRadius: "12px",
                            px: 2.5,
                            py: 1,
                            ...btnGradientStyle,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Dò tìm thẻ không sử dụng
                        </Button>
                      </Stack>

                      <Box sx={{ mb: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          variant="outlined"
                          placeholder="Tìm mã RFID, serial, loại máy, vị trí, đơn vị..."
                          value={rfidSearchInput}
                          onChange={(e) => setRfidSearchInput(e.target.value)}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <Search
                                  sx={{ color: "text.secondary", mr: 1 }}
                                  fontSize="small"
                                />
                              ),
                              endAdornment: rfidSearchInput ? (
                                <IconButton
                                  size="small"
                                  onClick={() => setRfidSearchInput("")}
                                  aria-label="Xoá tìm kiếm"
                                >
                                  <Close fontSize="small" />
                                </IconButton>
                              ) : null,
                            },
                          }}
                          sx={inputStyle}
                        />
                        {rfidSearchQuery.trim() && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5, ml: 0.5 }}
                          >
                            {`Tìm thấy ${rfidFilteredItems.length} kết quả khớp "${rfidSearchQuery.trim()}"`}
                          </Typography>
                        )}
                      </Box>

                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ maxHeight: 560, borderRadius: "16px" }}
                      >
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Mã RFID
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Trạng thái
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Máy đang gán
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Vị trí / Đơn vị
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                Ngày tạo thẻ
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(rfidPayload?.items || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  <Typography
                                    color="text.secondary"
                                    sx={{ py: 3 }}
                                  >
                                    Chưa có dữ liệu thẻ RFID.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ) : rfidFilteredItems.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  <Typography
                                    color="text.secondary"
                                    sx={{ py: 3 }}
                                  >
                                    Không có mã nào khớp bộ lọc đã chọn.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ) : (
                              rfidFilteredItems.map((row) => (
                                <RfidTableRow
                                  key={row.uuid_machine_rfid}
                                  row={row}
                                  onClick={handleRfidRowClick}
                                />
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 2 }}
                      >
                        Bấm vào một dòng để xem chi tiết lịch sử gán thẻ.
                      </Typography>
                    </>
                  )}
                </Box>
              </TabPanel>

              {/* === TAB PHÂN QUYỀN === */}
              <TabPanel value={currentTab} index={3}>
                <Grid container spacing={3}>
                  {/* CỘT TRÁI: TÌM KIẾM */}
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        height: "100%",
                        borderRadius: "20px",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        Tìm kiếm nhân viên
                      </Typography>

                      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
                        <TextField
                          fullWidth
                          label="Nhập Mã NV hoặc Tên"
                          variant="outlined"
                          value={userSearchQuery}
                          onChange={handleUserSearchChange}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUserSearchSubmit()
                          }
                          sx={inputStyle}
                        />
                        <Button
                          variant="contained"
                          onClick={handleUserSearchSubmit}
                          disabled={loadingUsers}
                          sx={{
                            minWidth: "60px",
                            borderRadius: "12px",
                            background:
                              "linear-gradient(45deg, #667eea, #764ba2)",
                          }}
                        >
                          {loadingUsers ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            <Search />
                          )}
                        </Button>
                      </Box>

                      <Box
                        sx={{
                          flexGrow: 1,
                          overflow: "auto",
                          maxHeight: "400px",
                        }}
                      >
                        {userSearchResults.length > 0 ? (
                          <List dense>
                            {userSearchResults.map((user) => (
                              <ListItemButton
                                key={user.ma_nv}
                                onClick={() => handleSelectUser(user)}
                                selected={selectedUser?.ma_nv === user.ma_nv}
                                sx={{
                                  borderRadius: "12px",
                                  mb: 1,
                                  "&.Mui-selected": {
                                    bgcolor: "rgba(102, 126, 234, 0.1)",
                                    border: "1px solid #667eea",
                                  },
                                }}
                              >
                                <ListItemAvatar>
                                  <Avatar src={user.avatar_url}>
                                    <Person />
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={user.ten_nv}
                                  secondary={user.ma_nv}
                                  primaryTypographyProps={{ fontWeight: 600 }}
                                />
                              </ListItemButton>
                            ))}
                          </List>
                        ) : (
                          <Box
                            sx={{
                              textAlign: "center",
                              color: "text.secondary",
                              mt: 4,
                            }}
                          >
                            <Search sx={{ fontSize: 40, opacity: 0.2 }} />
                            <Typography variant="body2">
                              Nhập thông tin để tìm kiếm
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>

                  {/* CỘT PHẢI: PHÂN QUYỀN */}
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        minHeight: "400px",
                        height: "100%",
                        borderRadius: "20px",
                        bgcolor: selectedUser ? "white" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      {selectedUser ? (
                        <>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              mb: 2,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 56,
                                height: 56,
                                bgcolor: "primary.main",
                              }}
                            >
                              {selectedUser.ten_nv.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="h5"
                                fontWeight={700}
                                color="primary.main"
                              >
                                {selectedUser.ten_nv}
                              </Typography>
                              <Typography
                                variant="body1"
                                color="text.secondary"
                              >
                                Mã NV: {selectedUser.ma_nv}
                              </Typography>
                            </Box>
                          </Box>

                          <Divider sx={{ my: 3 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                bgcolor: "#f5f5f5",
                                px: 1,
                                borderRadius: 1,
                              }}
                            >
                              QUYỀN HẠN
                            </Typography>
                          </Divider>

                          {loadingUserPermissions ? (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                my: 5,
                              }}
                            >
                              <CircularProgress />
                            </Box>
                          ) : (
                            <Box>
                              <FormGroup sx={{ ml: 1 }}>
                                {allPermissions.map((permName) => (
                                  <FormControlLabel
                                    key={permName}
                                    control={
                                      <Checkbox
                                        checked={
                                          selectedUserPermissions[permName] ||
                                          false
                                        }
                                        onChange={handlePermissionToggle}
                                        name={permName}
                                        sx={{
                                          "&.Mui-checked": { color: "#764ba2" },
                                        }}
                                      />
                                    }
                                    label={
                                      <Typography
                                        variant="body1"
                                        fontWeight={500}
                                        sx={{ textTransform: "uppercase" }}
                                      >
                                        {permName}
                                      </Typography>
                                    }
                                    sx={{
                                      mb: 1,
                                      p: 1,
                                      borderRadius: "12px",
                                      transition: "background 0.2s",
                                      "&:hover": {
                                        bgcolor: "rgba(0,0,0,0.03)",
                                      },
                                    }}
                                  />
                                ))}
                              </FormGroup>

                              <Box sx={{ mt: 4 }}>
                                <Button
                                  variant="contained"
                                  startIcon={
                                    savingPermissions ? (
                                      <CircularProgress
                                        size={20}
                                        color="inherit"
                                      />
                                    ) : (
                                      <Save />
                                    )
                                  }
                                  onClick={handleSavePermissions}
                                  disabled={savingPermissions}
                                  sx={{ px: 4, py: 1.2, ...btnGradientStyle }}
                                >
                                  Lưu thay đổi
                                </Button>
                              </Box>
                            </Box>
                          )}
                        </>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            opacity: 0.6,
                          }}
                        >
                          <People
                            sx={{
                              fontSize: 60,
                              color: "text.secondary",
                              mb: 2,
                            }}
                          />
                          <Typography variant="h6" color="text.secondary">
                            Chưa chọn nhân viên
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Vui lòng tìm và chọn nhân viên từ danh sách bên trái
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* === TAB CẤU HÌNH NỘI DUNG BẢO DƯỠNG === */}
              <TabPanel value={currentTab} index={4}>
                {loadingMatrix ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: 300,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Box
                      sx={{
                        mb: 3,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          Nội dung bảo dưỡng theo loại máy
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tick vào ô tương ứng để gán nội dung bảo dưỡng, sau đó
                          nhấn <strong>Lưu thay đổi</strong> để lưu vào hệ
                          thống.
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {dirtyColKeys.size > 0 && (
                          <Chip
                            label={`${dirtyColKeys.size} cột chưa lưu`}
                            color="warning"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                        <Button
                          variant="contained"
                          startIcon={
                            savingMatrix ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <Save />
                            )
                          }
                          onClick={handleSaveMatrix}
                          disabled={savingMatrix || dirtyColKeys.size === 0}
                          sx={{ ...btnGradientStyle, px: 3, py: 1 }}
                        >
                          {savingMatrix ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                      </Stack>
                    </Box>

                    {/* --- Bộ lọc Matrix --- */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Lọc theo nội dung bảo dưỡng"
                          value={searchContent}
                          onChange={(e) => setSearchContent(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <Search
                                sx={{
                                  color: "action.active",
                                  mr: 1,
                                  fontSize: 20,
                                }}
                              />
                            ),
                          }}
                          sx={inputStyle}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Lọc theo loại máy (cột)"
                          value={searchMachineType}
                          onChange={(e) => setSearchMachineType(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <Search
                                sx={{
                                  color: "action.active",
                                  mr: 1,
                                  fontSize: 20,
                                }}
                              />
                            ),
                          }}
                          sx={inputStyle}
                        />
                      </Grid>
                    </Grid>

                    {maintenanceContents.length === 0 ||
                    machineTypesForMatrix.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: "12px" }}>
                        {maintenanceContents.length === 0
                          ? "Chưa có nội dung bảo dưỡng nào trong hệ thống."
                          : "Chưa có loại máy nào trong hệ thống."}
                      </Alert>
                    ) : (
                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{
                          maxHeight: 600,
                          borderRadius: "16px",
                          overflow: "auto",
                          position: "relative",
                        }}
                      >
                        <Table
                          stickyHeader
                          size="small"
                          sx={{ borderCollapse: "separate", borderSpacing: 0 }}
                        >
                          <TableHead>
                            <TableRow>
                              {/* Corner cell — sticky theo cả top lẫn left */}
                              <TableCell
                                sx={{
                                  position: "sticky",
                                  left: 0,
                                  top: 0,
                                  zIndex: 5,
                                  backgroundColor: "#eef0fb",
                                  borderRight: "2px solid #d0d4f0",
                                  borderBottom: "2px solid #d0d4f0",
                                  fontWeight: 700,
                                  minWidth: 250,
                                  width: 250,
                                  fontSize: "0.875rem",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Nội dung bảo dưỡng
                              </TableCell>
                              {filteredMachineTypes.map((col) => {
                                const colKey = getColKey(col);
                                const isDirty = dirtyColKeys.has(colKey);
                                return (
                                  <TableCell
                                    key={colKey}
                                    ref={(el) => {
                                      if (el)
                                        headerCellRefs.current[colKey] = el;
                                    }}
                                    align="center"
                                    sx={{
                                      position: "sticky",
                                      top: 0,
                                      zIndex: 2,
                                      fontWeight: 700,
                                      minWidth: 100,
                                      width: 100,
                                      whiteSpace: "normal",
                                      lineHeight: 1.3,
                                      fontSize: "0.75rem",
                                      // Màu do React quản lý (dirty/normal)
                                      // Hover do DOM ref quản lý (không re-render)
                                      backgroundColor: isDirty
                                        ? "#fff8dc"
                                        : "#eef0fb",
                                      borderBottom: isDirty
                                        ? "2px solid #f59e0b"
                                        : "2px solid #d0d4f0",
                                      padding: "8px 4px",
                                      verticalAlign: "bottom",
                                    }}
                                  >
                                    {col.machine_name}
                                    {isDirty && (
                                      <Box
                                        component="span"
                                        sx={{
                                          display: "block",
                                          fontSize: "0.6rem",
                                          color: "#b45309",
                                          fontWeight: 700,
                                          mt: 0.3,
                                        }}
                                      >
                                        ● chưa lưu
                                      </Box>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          </TableHead>
                          <TableBody onMouseLeave={handleMatrixBodyMouseLeave}>
                            {filteredContents.map((content, idx) => (
                              <MatrixRow
                                key={content.id_maintenance_content}
                                content={content}
                                machineTypesForMatrix={filteredMachineTypes}
                                rowChecked={
                                  matrixChecked[
                                    content.name_maintenance_content
                                  ]
                                }
                                rowBg={idx % 2 === 0 ? "#ffffff" : "#f8f8fc"}
                                onCheckboxChange={handleMatrixCheckboxChange}
                                onLabelMouseEnter={handleMatrixLabelMouseEnter}
                                onCellMouseEnter={handleMatrixColMouseEnter}
                                isEditing={
                                  editingContentId ===
                                  content.id_maintenance_content
                                }
                                onSaveEdit={handleSaveEditContent}
                                onCancelEdit={handleCancelEditContent}
                                onEdit={handleStartEditContent}
                                onDelete={handleConfirmDeleteContent}
                                isSaving={savingEditContent}
                                isDeleting={
                                  deletingContentId ===
                                  content.id_maintenance_content
                                }
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 2 }}
                    >
                      Tổng: {filteredContents.length} nội dung bảo dưỡng ×{" "}
                      {filteredMachineTypes.length} loại máy
                    </Typography>

                    {/* --- Thêm nội dung bảo dưỡng mới --- */}
                    <Divider sx={{ my: 3 }} />
                    <Box>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        gutterBottom
                      >
                        Thêm nội dung bảo dưỡng mới
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        Sau khi thêm, nội dung mới sẽ xuất hiện ngay trong ma
                        trận bên trên.
                      </Typography>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <TextField
                          size="small"
                          label="Tên nội dung bảo dưỡng"
                          value={newContentName}
                          onChange={(e) => setNewContentName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleAddMaintenanceContent();
                          }}
                          disabled={addingContent}
                          sx={{ flex: 1, maxWidth: 480 }}
                          placeholder="VD: Kiểm tra, vệ sinh, bơm dầu"
                        />
                        <Button
                          variant="contained"
                          startIcon={
                            addingContent ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <Add />
                            )
                          }
                          onClick={handleAddMaintenanceContent}
                          disabled={addingContent || !newContentName.trim()}
                          sx={{
                            ...btnGradientStyle,
                            px: 3,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {addingContent ? "Đang thêm..." : "Thêm"}
                        </Button>
                      </Stack>
                    </Box>

                    {/* --- Lịch bảo dưỡng định kỳ theo tháng --- */}
                    <Divider sx={{ my: 3 }} />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          Lịch bảo dưỡng định kỳ theo tháng
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tick vào tháng tương ứng để lên lịch bảo dưỡng cho
                          từng loại máy, sau đó nhấn <strong>Lưu lịch</strong>{" "}
                          để lưu vào hệ thống.
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {dirtyScheduleKeys.size > 0 && (
                          <Chip
                            label={`${dirtyScheduleKeys.size} loại máy chưa lưu`}
                            color="warning"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                        <Button
                          variant="outlined"
                          onClick={() => setAutoCreateConfirmOpen(true)}
                          disabled={autoCreating || savingSchedule}
                          sx={{
                            borderRadius: "10px",
                            borderColor: "#9333ea",
                            color: "#9333ea",
                            fontWeight: 600,
                            px: 2.5,
                            py: 1,
                            "&:hover": {
                              borderColor: "#7e22ce",
                              bgcolor: "rgba(147,51,234,0.06)",
                            },
                          }}
                        >
                          {autoCreating
                            ? "Đang chạy..."
                            : "Chạy tạo lịch tự động"}
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={
                            savingSchedule ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <Save />
                            )
                          }
                          onClick={handleSaveSchedule}
                          disabled={
                            savingSchedule || dirtyScheduleKeys.size === 0
                          }
                          sx={{ ...btnGradientStyle, px: 3, py: 1 }}
                        >
                          {savingSchedule ? "Đang lưu..." : "Lưu lịch"}
                        </Button>
                      </Stack>
                    </Box>

                    {/* --- Bộ lọc Lịch bảo dưỡng --- */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Lọc theo loại máy"
                          value={searchScheduleMachineType}
                          onChange={(e) =>
                            setSearchScheduleMachineType(e.target.value)
                          }
                          InputProps={{
                            startAdornment: (
                              <Search
                                sx={{
                                  color: "action.active",
                                  mr: 1,
                                  fontSize: 20,
                                }}
                              />
                            ),
                          }}
                          sx={inputStyle}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small" sx={inputStyle}>
                          <InputLabel>Lọc theo tháng</InputLabel>
                          <Select
                            multiple
                            value={searchScheduleMonth}
                            onChange={(e) =>
                              setSearchScheduleMonth(e.target.value)
                            }
                            label="Lọc theo tháng"
                            renderValue={(selected) =>
                              selected.length === 0
                                ? "Tất cả tháng"
                                : MONTHS_CONFIG.filter((m) =>
                                    selected.includes(m.key)
                                  )
                                    .map((m) => m.fullLabel)
                                    .join(", ")
                            }
                          >
                            {MONTHS_CONFIG.map(({ key, fullLabel }) => (
                              <MenuItem key={key} value={key}>
                                <Checkbox
                                  checked={searchScheduleMonth.includes(key)}
                                  size="small"
                                />
                                <ListItemText primary={fullLabel} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    {machineTypesForMatrix.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: "12px" }}>
                        Chưa có loại máy nào trong hệ thống.
                      </Alert>
                    ) : filteredScheduleMachineTypes.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: "12px" }}>
                        Không tìm thấy loại máy phù hợp.
                      </Alert>
                    ) : (
                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{
                          maxHeight: 500,
                          borderRadius: "16px",
                          overflow: "auto",
                          position: "relative",
                        }}
                      >
                        <Table
                          stickyHeader
                          size="small"
                          sx={{ borderCollapse: "separate", borderSpacing: 0 }}
                        >
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  position: "sticky",
                                  left: 0,
                                  top: 0,
                                  zIndex: 5,
                                  backgroundColor: "#eef0fb",
                                  borderRight: "2px solid #d0d4f0",
                                  borderBottom: "2px solid #d0d4f0",
                                  fontWeight: 700,
                                  minWidth: 220,
                                  width: 220,
                                  fontSize: "0.875rem",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 1,
                                  }}
                                >
                                  <span>Loại máy</span>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 500,
                                      color: "#6b7280",
                                    }}
                                  >
                                    SL
                                  </span>
                                </Box>
                              </TableCell>
                              {filteredScheduleMonths.map(
                                ({ key, fullLabel }) => (
                                  <TableCell
                                    key={key}
                                    align="center"
                                    sx={{
                                      top: 0,
                                      zIndex: 2,
                                      backgroundColor: "#eef0fb",
                                      borderBottom: "2px solid #d0d4f0",
                                      fontWeight: 700,
                                      minWidth: 52,
                                      width: 52,
                                      fontSize: "0.8rem",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {fullLabel}
                                  </TableCell>
                                )
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredScheduleMachineTypes.map((col, idx) => {
                              const rowKey = getColKey(col);
                              return (
                                <ScheduleRow
                                  key={rowKey}
                                  col={col}
                                  rowKey={rowKey}
                                  rowData={scheduleData[rowKey]}
                                  rowBg={idx % 2 === 0 ? "#ffffff" : "#f8f8fc"}
                                  isDirty={dirtyScheduleKeys.has(rowKey)}
                                  onCheckboxChange={handleScheduleChange}
                                  visibleMonths={filteredScheduleMonths}
                                  contentCount={
                                    contentCountByColKey[rowKey] ?? 0
                                  }
                                />
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 2 }}
                    >
                      Tổng: {filteredScheduleMachineTypes.length} loại máy ×{" "}
                      {filteredScheduleMonths.length} tháng
                    </Typography>
                  </>
                )}
              </TabPanel>
            </>
          )}
        </Paper>

        {/* --- Dialog Tạo/Sửa --- */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: "20px" },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              {dialogMode === "create" ? "Tạo mới" : "Chỉnh sửa"}{" "}
              {currentItem?.type === "department"
                ? "Đơn vị"
                : currentItem?.type === "location"
                  ? "Vị trí"
                  : currentItem?.type === "category"
                    ? "Phân Loại"
                    : currentItem?.type === "machine-type"
                      ? "Loại máy"
                      : currentItem?.type === "machine-attribute"
                        ? "Đặc tính"
                        : currentItem?.type === "machine-manufacturer"
                          ? "Hãng sản xuất"
                          : currentItem?.type === "machine-supplier"
                            ? "Nhà cung cấp"
                            : ""}
            </Box>
            <IconButton onClick={handleCloseDialog} sx={{ color: "white" }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {dialogLoading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 150,
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              renderDialogContent()
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleCloseDialog}
              disabled={dialogLoading}
              variant="outlined"
              sx={{
                borderRadius: "10px",
                color: "text.secondary",
                borderColor: "rgba(0,0,0,0.2)",
              }}
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={dialogLoading}
              variant="contained"
              sx={{ ...btnGradientStyle, px: 4 }}
            >
              {dialogLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Lưu thông tin"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={rfidDetailOpen}
          onClose={handleCloseRfidDetail}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: "20px" },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography component="span" variant="h6" fontWeight={700}>
                Lịch sử gán thẻ RFID
              </Typography>
              {selectedRfidRow?.RFID_machine ? (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ opacity: 0.95, fontWeight: 500 }}
                >
                  Mã: {selectedRfidRow.RFID_machine}
                </Typography>
              ) : null}
            </Box>
            <IconButton onClick={handleCloseRfidDetail} sx={{ color: "white" }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 1 }}>
            {rfidDetailLoading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  py: 4,
                }}
              >
                <CircularProgress />
              </Box>
            ) : rfidHistory.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                Chưa có bản ghi lịch sử gán thẻ cho mã này.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Máy (mã serial)
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Loại máy</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rfidHistory.map((h) => (
                      <TableRow key={h.uuid_machine_rfid_history}>
                        <TableCell>
                          {h.created_at
                            ? new Date(h.created_at).toLocaleString("vi-VN")
                            : "—"}
                        </TableCell>
                        <TableCell>{h.serial_machine}</TableCell>
                        <TableCell>{h.type_machine || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseRfidDetail} variant="outlined">
              Đóng
            </Button>
          </DialogActions>
        </Dialog>

        <RfidDialog
          mode="radar"
          open={openUnusedRfidSearchDialog}
          onClose={() => setOpenUnusedRfidSearchDialog(false)}
          title="Dò tìm thẻ RFID không sử dụng"
          subtitle="Chế độ chỉ RFID — quét để khớp từng mã trong danh sách mục tiêu"
          selectedMachines={unusedRfidTargetsForSearch}
          skipResolveApi
        />

        {/* --- Dialog xác nhận xoá nội dung bảo dưỡng --- */}
        <Dialog
          open={!!confirmDeleteContent}
          onClose={() => setConfirmDeleteContent(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "16px" } }}
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
            Xác nhận xoá
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Bạn có chắc muốn xoá nội dung bảo dưỡng{" "}
              <strong>
                "{confirmDeleteContent?.name_maintenance_content}"
              </strong>{" "}
              không?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Thao tác này không thể hoàn tác.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setConfirmDeleteContent(null)}
              sx={{ borderRadius: "10px" }}
            >
              Huỷ
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteContent}
              disabled={!!deletingContentId}
              startIcon={
                deletingContentId ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Delete />
                )
              }
              sx={{ borderRadius: "10px" }}
            >
              {deletingContentId ? "Đang xoá..." : "Xoá"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- Dialog xác nhận chạy tạo lịch tự động --- */}
        <Dialog
          open={autoCreateConfirmOpen}
          onClose={() => !autoCreating && setAutoCreateConfirmOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "16px" } }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            Xác nhận tạo lịch bảo dưỡng tự động
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Hệ thống sẽ quét tất cả máy đủ điều kiện và tự động phân bổ lịch
              bảo dưỡng cho các tháng được cấu hình trong năm hiện tại. Lịch đã
              có sẽ không bị tạo trùng.
              <br />
              <br />
              <strong>Lưu ý:</strong> nếu vừa lưu thay đổi cấu hình lịch ở trên,
              hãy đảm bảo đã nhấn <strong>Lưu lịch</strong> trước khi chạy.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setAutoCreateConfirmOpen(false)}
              disabled={autoCreating}
              sx={{ borderRadius: "10px", color: "text.secondary" }}
            >
              Huỷ
            </Button>
            <Button
              variant="contained"
              onClick={handleAutoCreateSchedule}
              disabled={autoCreating}
              sx={{
                borderRadius: "10px",
                bgcolor: "#9333ea",
                "&:hover": { bgcolor: "#7e22ce" },
                fontWeight: 600,
              }}
            >
              {autoCreating ? "Đang chạy..." : "Xác nhận"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- Dialog kết quả --- */}
        <Dialog
          open={!!autoCreateResult}
          onClose={() => setAutoCreateResult(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: "16px" } }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            Kết quả tạo lịch bảo dưỡng {autoCreateResult?.year}
          </DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={`Đã chèn: ${autoCreateResult?.inserted ?? 0} dòng`}
                color={autoCreateResult?.inserted > 0 ? "success" : "default"}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              {(autoCreateResult?.pass1?.length ?? 0) > 0 && (
                <Chip
                  label={`Pass 1: ${autoCreateResult.pass1.length} nhóm`}
                  color="info"
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
              {(autoCreateResult?.pass2?.length ?? 0) > 0 && (
                <Chip
                  label={`Pass 2: ${autoCreateResult.pass2.length} nhóm`}
                  color="warning"
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>
            <Box
              sx={{
                bgcolor: "#0f172a",
                color: "#e2e8f0",
                p: 2,
                borderRadius: "10px",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                whiteSpace: "pre-wrap",
                maxHeight: 480,
                overflowY: "auto",
                lineHeight: 1.6,
              }}
            >
              {(autoCreateResult?.messages ?? []).length === 0
                ? `[AutoMaintenanceSchedule] Lịch bảo dưỡng năm ${autoCreateResult?.year} đã đầy đủ. Không có dòng nào được tạo thêm.`
                : autoCreateResult.messages
                    .map((m) => `[AutoMaintenanceSchedule] ${m}`)
                    .join("\n\n")}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              variant="contained"
              onClick={() => setAutoCreateResult(null)}
              sx={{ ...btnGradientStyle, borderRadius: "10px", px: 3 }}
            >
              Đóng
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- Snackbar --- */}
        <Snackbar
          open={notification.open}
          autoHideDuration={5000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseNotification}
            onClick={handleCloseNotification}
            severity={notification.severity}
            variant="filled"
            sx={{
              width: "100%",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              fontWeight: 500,
            }}
          >
            <AlertTitle sx={{ fontWeight: 800 }}>
              {notification.title}
            </AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default AdminPage;
