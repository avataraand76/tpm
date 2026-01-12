// frontend/src/pages/AdminPage.jsx

import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import {
  AdminPanelSettings,
  Edit,
  Add,
  Business,
  LocationOn,
  Category,
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
} from "@mui/icons-material";
import NavigationBar from "../components/NavigationBar";
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedTypeForAttributes) {
      fetchTypeAttributes(selectedTypeForAttributes);
    }
  }, [selectedTypeForAttributes, fetchTypeAttributes]);

  // --- Handlers ---
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

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
      showNotification(
        "error",
        "Lỗi",
        error.response?.data?.message || error.message
      );
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
              <Tab label="Phân Quyền" icon={<People />} iconPosition="start" />
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

              {/* === TAB PHÂN QUYỀN === */}
              <TabPanel value={currentTab} index={2}>
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

        {/* --- Snackbar --- */}
        <Snackbar
          open={notification.open}
          autoHideDuration={5000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseNotification}
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
