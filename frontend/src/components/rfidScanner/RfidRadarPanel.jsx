import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Alert,
  AlertTitle,
  alpha,
  Badge,
  borders,
  Box,
  CheckCircle,
  Chip,
  CircularProgress,
  colors,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  fontSizes,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LocationOn,
  MenuItem,
  radii,
  Replay,
  Save,
  Search,
  Select,
  shadow,
  shadowRgb,
  shadows,
  Snackbar,
  Stack,
  SwapHoriz,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useResponsive,
} from "../../ui";
import { RFID_LOOKUP_LENGTH, filterValidRfidCodes } from "./rfidCodeUtils";
import { api } from "../../api/api";
import { buildRadarTargetFromMachine } from "./rfidMachineUtils";
import {
  getRfidVariantStyle,
  RFID_DIALOG_RADIUS,
  rfidSectionSx,
  rfidMonoInputSx,
} from "./rfidDialogTheme";
import {
  RfidPanelBody,
  RfidInfoAlert,
  RfidStepLabel,
  RfidClearableMultiline,
  RfidProgressHeader,
  RfidTargetList,
  RfidScanZone,
  RfidPrimaryButton,
  RfidSecondaryButton,
} from "./rfidUiPrimitives";

const RfidRadarPanel = ({
  uiVariant = "default",
  onClose,
  selectedMachines = [],
  onClearSelection,
  // Khi ở chế độ kiểm kê (inventory) thì không cần gọi API resolve target
  skipResolveApi = false,
  // Danh sách vị trí để chọn khi tìm thấy máy (chế độ kiểm kê)
  inventoryLocations = [],
  // Callback khi user xác nhận thêm máy vào vị trí (chế độ kiểm kê - từng máy)
  onFoundMachineInventory = null,
  // Khi đã chọn sẵn vị trí (batch mode): tích lũy danh sách, user bấm xác nhận mới lưu 1 lần
  preSelectedLocationUuid = null,
  // Callback batch: (targets[], locationUuid) => Promise — lưu toàn bộ 1 lần
  onBatchConfirm = null,
  // Chế độ thay thẻ RFID (thống kê sót liên tiếp): quét thẻ cũ → nhập thẻ mới
  onReplaceRfid = null,
  /** Ẩn khối Chế độ quét (vd. dò tìm cập nhật vị trí kiểm kê) */
  hideScanModeToggle = false,
}) => {
  const { isMobile } = useResponsive();

  const isInventoryLocationMode = Boolean(
    skipResolveApi && (onFoundMachineInventory || onBatchConfirm)
  );
  /** Radar chỉ RFID (vd. thẻ không sử dụng trên Admin) — không cần toggle chế độ */
  const isStandaloneRfidRadar = Boolean(
    skipResolveApi &&
    !onFoundMachineInventory &&
    !onBatchConfirm &&
    !onReplaceRfid
  );
  const showScanModeToggle =
    !hideScanModeToggle &&
    !isInventoryLocationMode &&
    !onReplaceRfid &&
    !isStandaloneRfidRadar;
  const useRfidInputOnly = Boolean(
    onReplaceRfid || isInventoryLocationMode || isStandaloneRfidRadar
  );

  // --- STATE ---
  const [step, setStep] = useState(1); // 1: Nhập mục tiêu, 2: Đang dò
  const [inputTarget, setInputTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState([]);
  // Switch để chọn chế độ: true = chỉ tìm RFID (không dùng API), false = dùng API
  const [useRfidOnly, setUseRfidOnly] = useState(skipResolveApi);

  // State cho Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarTitle, setSnackbarTitle] = useState("");

  // Dữ liệu mục tiêu đã được server xác nhận (mảng)
  const [targets, setTargets] = useState([]);

  // State xử lý quét
  const [scanInput, setScanInput] = useState("");
  const [foundTargets, setFoundTargets] = useState(new Set()); // Set các RFID đã tìm thấy
  const [currentFoundTarget, setCurrentFoundTarget] = useState(null); // Target vừa tìm thấy để hiển thị overlay

  // State cho dialog chọn vị trí khi ở chế độ kiểm kê
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  // Sync ref để dùng trong interval (tránh stale closure)
  useEffect(() => {
    openLocationDialogRef.current = openLocationDialog;
  }, [openLocationDialog]);
  const [pendingFoundTarget, setPendingFoundTarget] = useState(null);
  const [selectedLocationUuid, setSelectedLocationUuid] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  // Batch mode: tích lũy máy tìm thấy, user xác nhận mới lưu 1 lần
  const [batchFoundList, setBatchFoundList] = useState([]); // [{target, locationUuid}]
  const [batchSaving, setBatchSaving] = useState(false);
  const [openBatchConfirmDialog, setOpenBatchConfirmDialog] = useState(false);

  // Thay thẻ RFID
  const [openReplaceDialog, setOpenReplaceDialog] = useState(false);
  const [pendingReplaceTarget, setPendingReplaceTarget] = useState(null);
  const [newRfidInput, setNewRfidInput] = useState("");
  const [replacingRfid, setReplacingRfid] = useState(false);
  const [replaceError, setReplaceError] = useState("");
  const [replaceSerialInput, setReplaceSerialInput] = useState("");
  const [replaceSerialError, setReplaceSerialError] = useState("");

  useEffect(() => {
    openReplaceDialogRef.current = openReplaceDialog;
  }, [openReplaceDialog]);

  // Refs
  const scanInputRef = useRef(null);
  const newRfidInputRef = useRef(null);
  const audioRef = useRef(null);
  const openLocationDialogRef = useRef(false);
  const openReplaceDialogRef = useRef(false);

  const getMachineRfidValue = useCallback((machine) => {
    if (machine?.RFID_machine && String(machine.RFID_machine).trim() !== "") {
      return String(machine.RFID_machine).trim();
    }
    return null;
  }, []);

  // Hàm lấy giá trị ưu tiên từ máy (serial -> rfid -> nfc -> code)
  const getMachineSearchValue = useCallback(
    (machine) => {
      if (onReplaceRfid) {
        return getMachineRfidValue(machine);
      }
      if (machine.serial_machine && machine.serial_machine.trim() !== "") {
        return machine.serial_machine.trim();
      }
      if (machine.RFID_machine && machine.RFID_machine.trim() !== "") {
        return machine.RFID_machine.trim();
      }
      if (machine.NFC_machine && machine.NFC_machine.trim() !== "") {
        return machine.NFC_machine.trim();
      }
      if (machine.code_machine && machine.code_machine.trim() !== "") {
        return machine.code_machine.trim();
      }
      return null;
    },
    [onReplaceRfid, getMachineRfidValue]
  );

  // Tự động điền inputTarget khi có selectedMachines
  useEffect(() => {
    if (selectedMachines && selectedMachines.length > 0) {
      const values = selectedMachines
        .map((machine) =>
          useRfidInputOnly
            ? getMachineRfidValue(machine)
            : getMachineSearchValue(machine)
        )
        .filter((value) => value !== null);

      if (values.length > 0) {
        setInputTarget(values.join("\n"));
      }
    }
  }, [
    selectedMachines,
    useRfidInputOnly,
    getMachineRfidValue,
    getMachineSearchValue,
  ]);

  useEffect(() => {
    if (useRfidInputOnly) setUseRfidOnly(true);
  }, [useRfidInputOnly]);

  // --- AUDIO LOGIC ---
  // Khởi tạo Audio object từ file trong public folder
  useEffect(() => {
    // Tạo Audio object với file từ public folder
    audioRef.current = new Audio("/coibaochay.mp3");
    audioRef.current.preload = "auto"; // Tải sẵn để phát nhanh hơn

    return () => {
      // Cleanup khi component unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Hàm phát âm thanh từ file
  const playSound = () => {
    if (!audioRef.current) return;

    try {
      // Reset về đầu file và phát
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error("Lỗi phát âm thanh:", err);
      });
    } catch (err) {
      console.error("Lỗi phát âm thanh:", err);
    }
  };

  const buildRfidToMachineMap = useCallback(() => {
    const map = new Map();
    (selectedMachines || []).forEach((m) => {
      const rfid = getMachineRfidValue(m);
      if (rfid) map.set(rfid.toUpperCase(), m);
    });
    return map;
  }, [selectedMachines, getMachineRfidValue]);

  const openReplaceDialogByTarget = useCallback((target, source = "scan") => {
    if (!target) return;
    setPendingReplaceTarget({ ...target, source });
    setNewRfidInput("");
    setReplaceError("");
    setOpenReplaceDialog(true);
  }, []);

  const handleOpenReplaceDialogBySerial = useCallback(() => {
    const serial = replaceSerialInput.trim();
    if (!serial) {
      setReplaceSerialError("Vui lòng nhập serial máy.");
      return;
    }

    const machine = (selectedMachines || []).find(
      (m) =>
        m?.serial_machine &&
        String(m.serial_machine).trim().toUpperCase() === serial.toUpperCase()
    );

    if (!machine) {
      setReplaceSerialError(
        "Không tìm thấy serial này trong danh sách máy sót."
      );
      return;
    }

    const rfid = getMachineRfidValue(machine);
    if (!rfid) {
      setReplaceSerialError("Máy này chưa có RFID cũ để đối chiếu.");
      return;
    }

    const target =
      targets.find(
        (t) =>
          t?.info?.serial &&
          String(t.info.serial).trim().toUpperCase() === serial.toUpperCase()
      ) || buildRadarTargetFromMachine(machine, rfid);

    if (!target) {
      setReplaceSerialError(
        "Không thể tạo thông tin cập nhật RFID cho máy này."
      );
      return;
    }

    setReplaceSerialInput("");
    setReplaceSerialError("");
    openReplaceDialogByTarget(target, "serial");
  }, [
    getMachineRfidValue,
    openReplaceDialogByTarget,
    replaceSerialInput,
    selectedMachines,
    targets,
  ]);

  /** Tra cứu tên/serial từ RFID qua API, gộp với dữ liệu đã có */
  const enrichMachinesByRfidApi = async (rfidList, existingMap) => {
    const merged = new Map(existingMap);
    const codes = filterValidRfidCodes(
      rfidList.map((r) => String(r).trim()).filter(Boolean)
    );
    if (codes.length === 0) return merged;

    try {
      const result = await api.machines.getByRfidList({ rfid_list: codes });
      if (result?.success && result.data?.foundMachines) {
        result.data.foundMachines.forEach((machine) => {
          const rfid =
            machine?.RFID_machine && String(machine.RFID_machine).trim();
          if (!rfid) return;
          const key = rfid.toUpperCase();
          merged.set(key, { ...merged.get(key), ...machine });
        });
      }
    } catch (err) {
      console.error("enrichMachinesByRfidApi:", err);
    }
    return merged;
  };

  // --- BƯỚC 1: THIẾT LẬP MỤC TIÊU ---
  const handleSetTarget = async (e) => {
    e?.preventDefault();
    if (!inputTarget.trim()) return;

    setLoading(true);
    setError("");
    setErrors([]);
    setTargets([]);
    setFoundTargets(new Set());
    setCurrentFoundTarget(null);

    try {
      // Tách input thành mảng (mỗi dòng là một keyword)
      const keywords = inputTarget
        .split("\n")
        .map((k) => k.trim())
        .filter((k) => k);

      if (useRfidOnly) {
        let rfidToMachine = buildRfidToMachineMap();

        const rfidsToEnrich = onReplaceRfid
          ? (selectedMachines || [])
              .map((m) => getMachineRfidValue(m))
              .filter(Boolean)
          : keywords;

        if (onReplaceRfid || isInventoryLocationMode) {
          rfidToMachine = await enrichMachinesByRfidApi(
            rfidsToEnrich,
            rfidToMachine
          );
        }

        let localTargets;

        if (onReplaceRfid) {
          localTargets = (selectedMachines || [])
            .map((m) => getMachineRfidValue(m))
            .filter(Boolean)
            .map((rfid) => {
              const machineRecord = rfidToMachine.get(rfid.toUpperCase());
              return buildRadarTargetFromMachine(machineRecord, rfid);
            })
            .filter(Boolean);
        } else {
          localTargets = keywords
            .map((keyword) => {
              const targetRfid = keyword.toUpperCase();
              const machineRecord = rfidToMachine.get(targetRfid) || {
                RFID_machine: keyword,
              };
              return buildRadarTargetFromMachine(machineRecord, keyword);
            })
            .filter(Boolean);
        }

        if (localTargets.length === 0) {
          setError(
            onReplaceRfid
              ? "Không có mã RFID thẻ cũ hợp lệ trong danh sách."
              : "Vui lòng nhập ít nhất một RFID để dò tìm."
          );
          return;
        }

        setTargets(localTargets);
        setStep(2);
      } else {
        // --- CHẾ ĐỘ MẶC ĐỊNH: GỌI API ĐỂ XÁC THỰC THIẾT BỊ ---
        const res = await api.machines.resolveTarget(keywords);
        if (res.success) {
          // res.data có thể là object (backward compatibility) hoặc array
          const targetsArray = Array.isArray(res.data) ? res.data : [res.data];
          // Hoặc dùng res.targets nếu có
          const finalTargets = res.targets || targetsArray;

          if (finalTargets.length === 0) {
            setError("Không có máy nào hợp lệ để dò tìm.");
            return;
          }

          setTargets(finalTargets);
          if (res.errors && res.errors.length > 0) {
            setErrors(res.errors);
            // Hiển thị snackbar cho các lỗi về RFID chưa được gán
            const rfidErrors = res.errors.filter((err) =>
              err.message.includes("chưa được gán thẻ RFID")
            );
            if (rfidErrors.length > 0) {
              const errorMessages = rfidErrors
                .map((err) => err.message)
                .join("; ");
              setSnackbarTitle("Cảnh báo");
              setSnackbarMessage(errorMessages);
              setSnackbarOpen(true);
            }
          }
          setStep(2);
        }
      }
    } catch (err) {
      console.error("Lỗi xử lý mục tiêu RFID:", err);
      // Giữ lại logic thông báo lỗi cũ khi có response từ server
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (!useRfidOnly) {
        setError("Lỗi kết nối server");
      } else {
        setError("Đã xảy ra lỗi khi chuẩn bị danh sách RFID.");
      }

      if (!useRfidOnly && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        const rfidErrors = err.response.data.errors.filter((er) =>
          er.message.includes("chưa được gán thẻ RFID")
        );
        if (rfidErrors.length > 0) {
          const errorMessages = rfidErrors.map((er) => er.message).join("; ");
          setSnackbarTitle("Cảnh báo");
          setSnackbarMessage(errorMessages);
          setSnackbarOpen(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // --- BƯỚC 2: LOGIC QUÉT MỚI (QUAN TRỌNG) ---

  // Tự động focus liên tục vào ô nhập liệu ẩn (tắt khi có dialog con)
  useEffect(() => {
    if (step === 2 && scanInputRef.current) {
      if (!openLocationDialogRef.current && !openReplaceDialogRef.current) {
        scanInputRef.current.focus();
      }
      const interval = setInterval(() => {
        const activeElement = document.activeElement;
        const isUserTyping =
          activeElement &&
          activeElement !== scanInputRef.current &&
          ["INPUT", "TEXTAREA"].includes(activeElement.tagName);
        if (
          scanInputRef.current &&
          document.activeElement !== scanInputRef.current &&
          !isUserTyping &&
          !openLocationDialogRef.current &&
          !openReplaceDialogRef.current
        ) {
          scanInputRef.current.focus();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    if (!openReplaceDialog) return undefined;
    const timer = setTimeout(() => {
      newRfidInputRef.current?.focus();
      const input = newRfidInputRef.current;
      if (input?.setSelectionRange) {
        const len = input.value?.length ?? 0;
        input.setSelectionRange(len, len);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [openReplaceDialog]);

  // Tự động ẩn overlay sau 3.5 giây khi tìm thấy máy (chỉ ở chế độ thông thường)
  useEffect(() => {
    if (
      currentFoundTarget &&
      !(skipResolveApi && (onFoundMachineInventory || onReplaceRfid))
    ) {
      const timer = setTimeout(() => {
        setCurrentFoundTarget(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [
    currentFoundTarget,
    skipResolveApi,
    onFoundMachineInventory,
    onReplaceRfid,
  ]);

  // Hàm xử lý khi dữ liệu từ máy quét đổ vào
  const handleStreamInput = (e) => {
    const rawValue = e.target.value;
    setScanInput(rawValue); // Cập nhật state để debug nếu cần

    // Kiểm tra tất cả các targets chưa tìm thấy
    targets.forEach((target) => {
      const targetRfid = target.targetRfid.toUpperCase();
      const isAlreadyFound = foundTargets.has(targetRfid);

      // Nếu chưa tìm thấy và khớp với dữ liệu quét
      if (!isAlreadyFound && rawValue.toUpperCase().includes(targetRfid)) {
        // Phát âm thanh cảnh báo
        playSound();

        if (skipResolveApi && preSelectedLocationUuid && onBatchConfirm) {
          // Batch mode: tích lũy vào danh sách tạm, chờ user bấm xác nhận
          setFoundTargets((prev) => new Set([...prev, targetRfid]));
          setCurrentFoundTarget(target);
          setBatchFoundList((prev) => {
            const alreadyIn = prev.some(
              (item) => item.target.targetRfid.toUpperCase() === targetRfid
            );
            if (alreadyIn) return prev;
            return [...prev, { target, locationUuid: preSelectedLocationUuid }];
          });
        } else if (skipResolveApi && onReplaceRfid) {
          openReplaceDialogByTarget(target, "scan");
        } else if (skipResolveApi && onFoundMachineInventory) {
          // Chế độ kiểm kê thông thường: hiện dialog chọn vị trí
          setPendingFoundTarget(target);
          setSelectedLocationUuid("");
          setOpenLocationDialog(true);
        } else {
          // Chế độ thông thường: hiện overlay toàn màn hình
          setFoundTargets((prev) => new Set([...prev, targetRfid]));
          setCurrentFoundTarget(target);
        }
      }
    });

    // Tùy chọn: Giới hạn độ dài bộ nhớ đệm.
    if (rawValue.length > 5000) {
      setScanInput(rawValue.slice(-1000)); // Chỉ giữ lại 1000 ký tự cuối
    }
  };

  // Xử lý khi user xác nhận chọn vị trí trong dialog
  const handleConfirmLocation = async () => {
    if (!selectedLocationUuid || !pendingFoundTarget) return;

    setSavingLocation(true);
    try {
      await onFoundMachineInventory(pendingFoundTarget, selectedLocationUuid);
      // Đánh dấu đã tìm thấy sau khi lưu thành công
      setFoundTargets(
        (prev) =>
          new Set([...prev, pendingFoundTarget.targetRfid.toUpperCase()])
      );
      setOpenLocationDialog(false);
      setPendingFoundTarget(null);
      setSelectedLocationUuid("");
      // Xóa bộ đệm scan để tránh match lại RFID cũ khi quét máy tiếp theo
      setScanInput("");
      setTimeout(() => {
        if (scanInputRef.current) {
          scanInputRef.current.value = "";
          scanInputRef.current.focus();
        }
      }, 200);
    } catch (err) {
      console.error("Lỗi lưu máy vào vị trí:", err);
    } finally {
      setSavingLocation(false);
    }
  };

  // Đóng dialog chọn vị trí mà không lưu — máy vẫn ở trạng thái "chưa quét"
  const handleConfirmReplaceRfid = async () => {
    const newRfid = newRfidInput.trim().toUpperCase();
    if (!newRfid || !pendingReplaceTarget || !onReplaceRfid) return;

    if (newRfid === pendingReplaceTarget.targetRfid.toUpperCase()) {
      setReplaceError("RFID mới phải khác RFID cũ.");
      return;
    }

    setReplacingRfid(true);
    setReplaceError("");
    try {
      await onReplaceRfid(
        pendingReplaceTarget,
        newRfid,
        pendingReplaceTarget.machineRecord
      );
      setFoundTargets(
        (prev) =>
          new Set([...prev, pendingReplaceTarget.targetRfid.toUpperCase()])
      );
      setOpenReplaceDialog(false);
      setPendingReplaceTarget(null);
      setNewRfidInput("");
      setScanInput("");
      setTimeout(() => {
        if (scanInputRef.current) {
          scanInputRef.current.value = "";
          scanInputRef.current.focus();
        }
      }, 200);
    } catch (err) {
      setReplaceError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể cập nhật RFID mới."
      );
    } finally {
      setReplacingRfid(false);
    }
  };

  const handleCancelReplaceDialog = () => {
    setOpenReplaceDialog(false);
    setPendingReplaceTarget(null);
    setNewRfidInput("");
    setReplaceError("");
    setScanInput("");
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.value = "";
        scanInputRef.current.focus();
      }
    }, 200);
  };

  const handleCancelLocationDialog = () => {
    setOpenLocationDialog(false);
    setPendingFoundTarget(null);
    setSelectedLocationUuid("");
    // Xóa bộ đệm scan để tránh match lại RFID cũ khi quét máy tiếp theo
    setScanInput("");
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.value = "";
        scanInputRef.current.focus();
      }
    }, 200);
  };

  const handleReset = () => {
    setStep(1);
    setFoundTargets(new Set());
    setCurrentFoundTarget(null);
    setInputTarget("");
    setScanInput("");
    setError("");
    setErrors([]);
    setBatchFoundList([]);
    setReplaceSerialInput("");
    setReplaceSerialError("");
  };

  // Batch mode: user bấm xác nhận → lưu toàn bộ 1 lần
  const handleBatchConfirm = async () => {
    if (!onBatchConfirm || batchFoundList.length === 0) return;
    setBatchSaving(true);
    try {
      await onBatchConfirm(batchFoundList);
      setBatchFoundList([]);
      setFoundTargets(new Set());
      setCurrentFoundTarget(null);
      setScanInput("");
      setOpenBatchConfirmDialog(false);
    } catch (err) {
      console.error("Lỗi xác nhận batch:", err);
    } finally {
      setBatchSaving(false);
    }
  };

  // Hàm để người dùng reset trạng thái tìm kiếm (để quét tiếp)
  const handleRescanSameTarget = () => {
    setCurrentFoundTarget(null);
    setScanInput("");
    // Focus lại ngay
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  // Hàm xóa nội dung input
  const handleClearInput = () => {
    setInputTarget("");
    setError("");
    setErrors([]);
    // Gọi callback để bỏ chọn các máy trong MachineListPage
    if (onClearSelection) {
      onClearSelection();
    }
  };

  // Handler đóng snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  // Kiểm tra xem còn máy nào chưa tìm thấy không
  const allFound = targets.length > 0 && foundTargets.size === targets.length;

  return (
    <>
      {/* OVERLAY KHI TÌM THẤY */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: currentFoundTarget
            ? getRfidVariantStyle(uiVariant).foundOverlay
            : "transparent",
          zIndex: currentFoundTarget ? 9999 : -1,
          transition: "background-color 0.1s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          pointerEvents: currentFoundTarget ? "auto" : "none",
        }}
        onClick={handleRescanSameTarget}
      >
        {currentFoundTarget && (
          <Stack
            alignItems="center"
            spacing={2}
            sx={{ animation: "pulse 0.5s infinite", cursor: "pointer" }}
          >
            <CheckCircle sx={{ fontSize: 180, color: colors.white }} />
            <Typography variant="h1" sx={{ color: colors.white, fontWeight: "900" }}>
              TÌM THẤY!
            </Typography>
            <Typography
              variant="h3"
              sx={{ color: colors.white, textAlign: "center" }}
            >
              {currentFoundTarget.info.serial}
            </Typography>
            <Typography
              variant="h5"
              sx={{ color: colors.white, textAlign: "center" }}
            >
              {currentFoundTarget.info.name}
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: alpha(colors.white, 0.8), mt: 2 }}
            >
              Đã tìm thấy: {foundTargets.size} / {targets.length} máy
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: alpha(colors.white, 0.8), mt: 2 }}
            >
              (Chạm vào màn hình để quét tiếp)
            </Typography>
          </Stack>
        )}
      </Box>

      {/* DIALOG CHỌN VỊ TRÍ KHI TÌM THẤY MÁY (CHẾ ĐỘ KIỂM KÊ) */}
      <Dialog
        open={openLocationDialog}
        onClose={handleCancelLocationDialog}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        PaperProps={{ sx: { borderRadius: `${radii.lg}px` } }}
      >
        <DialogTitle
          sx={{
            background: getRfidVariantStyle(uiVariant).gradient,
            color: "white",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <CheckCircle sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Đã tìm thấy thiết bị!
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Chọn vị trí để lưu máy này vào phiếu kiểm kê
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, bgcolor: colors.grey[50] }}>
          {pendingFoundTarget && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              {/* Thông tin máy tìm thấy */}
              <Box sx={rfidSectionSx(uiVariant)}>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ color: getRfidVariantStyle(uiVariant).iconColor }}
                >
                  {pendingFoundTarget.info.name !==
                  pendingFoundTarget.info.serial
                    ? pendingFoundTarget.info.name
                    : pendingFoundTarget.info.serial}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}
                >
                  <Chip
                    label={`Serial: ${pendingFoundTarget.info.serial}`}
                    size="small"
                    variant="outlined"
                    color="success"
                  />
                  <Chip
                    label={`RFID: ${pendingFoundTarget.targetRfid}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Box>

              {/* Chọn vị trí */}
              <FormControl fullWidth>
                <InputLabel id="location-select-label">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <LocationOn sx={{ fontSize: 18 }} />
                    Chọn vị trí lưu máy
                  </Box>
                </InputLabel>
                <Select
                  labelId="location-select-label"
                  value={selectedLocationUuid}
                  onChange={(e) => setSelectedLocationUuid(e.target.value)}
                  label="Chọn vị trí lưu máy"
                  sx={{ borderRadius: `${radii.md}px` }}
                >
                  {inventoryLocations.length === 0 ? (
                    <MenuItem disabled value="">
                      <Typography color="text.secondary" variant="body2">
                        Không có vị trí nào
                      </Typography>
                    </MenuItem>
                  ) : (
                    inventoryLocations.map((loc) => (
                      <MenuItem
                        key={loc.uuid_location || loc.id_location}
                        value={loc.uuid_location}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {loc.name_location}
                          </Typography>
                          {loc._dept_name && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {loc._dept_name}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {/* Tiến độ tìm thấy */}
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: alpha(colors.black, 0.04),
                  borderRadius: `${radii.md}px`,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Đã tìm thấy:{" "}
                  <strong>
                    {foundTargets.size + 1} / {targets.length} máy
                  </strong>
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            gap: 1,
            bgcolor: colors.grey[50],
            borderTop: `1px solid ${alpha(colors.black, 0.06)}`,
            "& > :not(style) + :not(style)": {
              marginLeft: { xs: "0px !important", sm: "8px !important" },
            },
          }}
        >
          <RfidSecondaryButton
            onClick={handleCancelLocationDialog}
            disabled={savingLocation}
          >
            Bỏ qua
          </RfidSecondaryButton>
          <RfidPrimaryButton
            variant={uiVariant}
            onClick={handleConfirmLocation}
            disabled={!selectedLocationUuid || savingLocation}
            startIcon={
              savingLocation ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <CheckCircle />
              )
            }
          >
            {savingLocation ? "Đang lưu..." : "Xác nhận lưu"}
          </RfidPrimaryButton>
        </DialogActions>
      </Dialog>

      {/* Dialog nhập RFID mới sau khi quét thẻ cũ */}
      <Dialog
        open={openReplaceDialog}
        onClose={handleCancelReplaceDialog}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        PaperProps={{ sx: { borderRadius: `${radii.lg}px` } }}
      >
        <DialogTitle
          sx={{
            background: getRfidVariantStyle(uiVariant).gradient,
            color: "white",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <SwapHoriz sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Cập nhật thẻ RFID mới
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Quét được thẻ cũ — nhập mã thẻ mới gắn cho máy
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, bgcolor: colors.grey[50] }}>
          {pendingReplaceTarget && (
            <Stack spacing={2.5} sx={{ pt: 2 }}>
              <Box sx={rfidSectionSx(uiVariant)}>
                <Typography variant="h6" fontWeight={700}>
                  {pendingReplaceTarget.info?.name ||
                    pendingReplaceTarget.info?.serial}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Serial: {pendingReplaceTarget.info?.serial || "—"}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  RFID cũ trên danh sách
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: "break-all" }}>
                  {pendingReplaceTarget.targetRfid}
                </Typography>
              </Box>
              {pendingReplaceTarget.machineRecord?.RFID_machine_current !=
                null && (
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color={colors.green.main}
                    display="block"
                  >
                    RFID hiện trên hệ thống
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    color
                    sx={{ wordBreak: "break-all" }}
                  >
                    {pendingReplaceTarget.machineRecord.RFID_machine_current ||
                      "(chưa gán)"}
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                autoFocus
                inputRef={newRfidInputRef}
                label="RFID mới"
                placeholder="Quét hoặc nhập mã thẻ mới"
                value={newRfidInput}
                onChange={(e) => {
                  setNewRfidInput(
                    e.target.value.slice(0, RFID_LOOKUP_LENGTH).toUpperCase()
                  );
                  if (replaceError) setReplaceError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmReplaceRfid();
                  }
                }}
                disabled={replacingRfid}
                sx={rfidMonoInputSx()}
                inputProps={{ maxLength: RFID_LOOKUP_LENGTH }}
              />
              {replaceError ? (
                <Alert
                  severity="error"
                  sx={{ borderRadius: RFID_DIALOG_RADIUS.alert }}
                >
                  {replaceError}
                </Alert>
              ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            gap: 1,
            bgcolor: colors.grey[50],
            borderTop: `1px solid ${alpha(colors.black, 0.06)}`,
            "& > :not(style) + :not(style)": {
              marginLeft: { xs: "0px !important", sm: "8px !important" },
            },
          }}
        >
          <RfidSecondaryButton
            onClick={handleCancelReplaceDialog}
            disabled={replacingRfid}
          >
            Bỏ qua
          </RfidSecondaryButton>
          <RfidPrimaryButton
            variant={uiVariant}
            onClick={handleConfirmReplaceRfid}
            disabled={!newRfidInput.trim() || replacingRfid}
            startIcon={
              replacingRfid ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <Save />
              )
            }
          >
            {replacingRfid ? "Đang lưu..." : "Xác nhận cập nhật"}
          </RfidPrimaryButton>
        </DialogActions>
      </Dialog>

      {step === 1 && (
        <Box
          component="form"
          onSubmit={handleSetTarget}
          sx={{ m: 0, display: "block" }}
        >
          <RfidPanelBody>
            <RfidStepLabel
              step={1}
              total={2}
              label={
                useRfidInputOnly
                  ? "Danh sách RFID cần quét"
                  : "Nhập thiết bị cần dò tìm"
              }
              variant={uiVariant}
            />
            <RfidInfoAlert>
              {onReplaceRfid
                ? "Danh sách RFID thẻ cũ cần tìm. Nếu thẻ cũ/hư, nhập serial bên dưới để mở cập nhật RFID mới."
                : isInventoryLocationMode
                  ? "Mỗi dòng một mã RFID. Khi quét trúng, chọn vị trí để cập nhật máy vào phiếu kiểm kê."
                  : isStandaloneRfidRadar
                    ? "Mỗi dòng một mã RFID. Quét để khớp từng mã trong danh sách mục tiêu."
                    : "Nhập nhiều máy, mỗi dòng một mã (Serial, mã máy hoặc RFID/NFC)."}
            </RfidInfoAlert>
            <RfidClearableMultiline
              label={
                useRfidInputOnly ? "Danh sách mã RFID" : "Danh sách mục tiêu"
              }
              placeholder={
                useRfidInputOnly
                  ? "E28011704000021D4F6DTEST\nE28011..."
                  : "SN123456\nE28011...\nNFC123"
              }
              rows={8}
              autoFocus
              value={inputTarget}
              onChange={(e) => setInputTarget(e.target.value)}
              onClear={handleClearInput}
              disabled={loading}
            />
            {onReplaceRfid ? (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: colors.white,
                  borderRadius: RFID_DIALOG_RADIUS.input,
                  border: borders.subtle2,
                }}
              >
                <Typography variant="body2" fontWeight={700} gutterBottom>
                  Thẻ RFID cũ/hư không quét được?
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1 }}
                >
                  Nhập serial máy trong danh sách để cập nhật trực tiếp RFID
                  mới.
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", sm: "flex-start" }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    label="Serial máy"
                    value={replaceSerialInput}
                    onChange={(e) => {
                      setReplaceSerialInput(e.target.value);
                      if (replaceSerialError) setReplaceSerialError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleOpenReplaceDialogBySerial();
                      }
                    }}
                    disabled={loading}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: RFID_DIALOG_RADIUS.input,
                      },
                    }}
                  />
                  <RfidSecondaryButton
                    onClick={handleOpenReplaceDialogBySerial}
                    disabled={loading}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    Cập nhật bằng serial
                  </RfidSecondaryButton>
                </Stack>
                {replaceSerialError ? (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ display: "block", mt: 0.75 }}
                  >
                    {replaceSerialError}
                  </Typography>
                ) : null}
              </Box>
            ) : null}
            {error ? (
              <Alert
                severity="error"
                sx={{ borderRadius: RFID_DIALOG_RADIUS.alert }}
              >
                {error}
              </Alert>
            ) : null}
            {errors.length > 0 ? (
              <Alert
                severity="warning"
                sx={{ borderRadius: RFID_DIALOG_RADIUS.alert }}
              >
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Một số máy không hợp lệ:
                </Typography>
                <List dense>
                  {errors.map((err, idx) => (
                    <ListItem key={idx} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={err.keyword}
                        secondary={err.message}
                      />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            ) : null}
            {showScanModeToggle ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  bgcolor: colors.white,
                  borderRadius: RFID_DIALOG_RADIUS.input,
                  border: borders.subtle2,
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Chế độ quét
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {useRfidOnly
                      ? "Chỉ quét RFID"
                      : "Chỉ quét thiết bị trong hệ thống"}
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useRfidOnly}
                      onChange={(e) => setUseRfidOnly(e.target.checked)}
                      color="primary"
                    />
                  }
                  label=""
                />
              </Box>
            ) : null}
            <RfidPrimaryButton
              type="submit"
              fullWidth
              variant={uiVariant}
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Search />
                )
              }
            >
              {loading ? "Đang kiểm tra..." : "Bắt đầu dò tìm"}
            </RfidPrimaryButton>
          </RfidPanelBody>
        </Box>
      )}

      {step === 2 && targets.length > 0 && (
        <RfidPanelBody>
          <RfidStepLabel
            step={2}
            total={2}
            label="Quét và khớp mục tiêu"
            variant={uiVariant}
          />
          <RfidProgressHeader
            title={`DANH SÁCH MỤC TIÊU (${targets.length} máy)`}
            found={foundTargets.size}
            total={targets.length}
            variant={uiVariant}
          />
          <RfidTargetList targets={targets} foundSet={foundTargets} />
          {onReplaceRfid ? (
            <Box
              sx={{
                p: 1.5,
                bgcolor: colors.white,
                borderRadius: RFID_DIALOG_RADIUS.input,
                border: borders.subtle2,
              }}
            >
              <Typography variant="body2" fontWeight={700} gutterBottom>
                Thẻ RFID cũ không quét được?
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "flex-start" }}
              >
                <TextField
                  fullWidth
                  size="small"
                  label="Nhập serial để cập nhật RFID mới"
                  value={replaceSerialInput}
                  onChange={(e) => {
                    setReplaceSerialInput(e.target.value);
                    if (replaceSerialError) setReplaceSerialError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleOpenReplaceDialogBySerial();
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: RFID_DIALOG_RADIUS.input,
                    },
                  }}
                />
                <RfidSecondaryButton
                  onClick={handleOpenReplaceDialogBySerial}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Cập nhật bằng serial
                </RfidSecondaryButton>
              </Stack>
              {replaceSerialError ? (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ display: "block", mt: 0.75 }}
                >
                  {replaceSerialError}
                </Typography>
              ) : null}
            </Box>
          ) : null}
          {allFound ? (
            <Alert
              severity="success"
              sx={{ borderRadius: RFID_DIALOG_RADIUS.alert }}
            >
              Hoàn thành! Đã tìm thấy tất cả {targets.length} máy.
            </Alert>
          ) : null}
          <Box sx={{ position: "relative" }}>
            <textarea
              ref={scanInputRef}
              value={scanInput}
              onChange={handleStreamInput}
              style={{
                opacity: 0,
                position: "absolute",
                top: "-2000px",
                width: "1px",
                height: "1px",
              }}
              autoComplete="off"
              spellCheck="false"
            />
            <RfidScanZone
              variant={uiVariant}
              scanPreview={scanInput.slice(-50)}
              onFocusScan={() => scanInputRef.current?.focus()}
            />
          </Box>

          {/* BATCH MODE: FAB xác nhận lưu */}
          {preSelectedLocationUuid && onBatchConfirm && (
            <>
              <Tooltip
                title={
                  batchFoundList.length === 0
                    ? "Chưa quét được máy nào"
                    : `Xác nhận lưu ${batchFoundList.length} máy`
                }
                placement="left"
              >
                <Fab
                  size="large"
                  onClick={() => setOpenBatchConfirmDialog(true)}
                  disabled={batchFoundList.length === 0}
                  sx={{
                    position: "fixed",
                    bottom: 24,
                    right: 24,
                    zIndex: 1000,
                    color: colors.white,
                    background: getRfidVariantStyle(uiVariant).primaryButton,
                    boxShadow: shadow(6, 24, shadowRgb.black, 0.2),
                    "&:not(:disabled)": {
                      animation: "fabPulse 2s ease-in-out infinite",
                    },
                  }}
                >
                  <Badge
                    badgeContent={batchFoundList.length}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: fontSizes.px12,
                        fontWeight: "bold",
                        minWidth: "24px",
                        height: "24px",
                      },
                    }}
                  >
                    <Save />
                  </Badge>
                </Fab>
              </Tooltip>

              {/* Dialog xác nhận lưu batch */}
              <Dialog
                open={openBatchConfirmDialog}
                onClose={() => !batchSaving && setOpenBatchConfirmDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: `${radii.lg}px` } }}
              >
                <DialogTitle
                  sx={{
                    background: getRfidVariantStyle(uiVariant).gradient,
                    color: "white",
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Xác nhận lưu
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Phát hiện {batchFoundList.length} máy
                    </Typography>
                  </Box>
                  <Chip
                    label={`${batchFoundList.length} máy`}
                    sx={{
                      bgcolor: alpha(colors.white, 0.25),
                      color: "white",
                      fontWeight: 700,
                      fontSize: fontSizes.px15_2,
                    }}
                  />
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                  <List dense sx={{ maxHeight: 360, overflowY: "auto" }}>
                    {batchFoundList.map((item, idx) => (
                      <ListItem
                        key={idx}
                        sx={{
                          py: 1,
                          px: 2.5,
                          borderBottom: `1px solid ${alpha(colors.black, 0.06)}`,
                          "&:last-child": { borderBottom: "none" },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircle
                            sx={{ color: colors.green.main, fontSize: 20 }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600}>
                              {item.target.info?.code ||
                                item.target.info?.serial ||
                                item.target.targetRfid}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {[item.target.info?.type, item.target.info?.model]
                                .filter(Boolean)
                                .join(" ")}{" "}
                              {[
                                item.target.info?.type,
                                item.target.info?.model,
                              ].some(Boolean) && "·"}{" "}
                              RFID: {item.target.targetRfid}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </DialogContent>
                <DialogActions
                  sx={{
                    p: 2.5,
                    gap: 1,
                    bgcolor: colors.grey[50],
                    borderTop: `1px solid ${alpha(colors.black, 0.06)}`,
                    "& > :not(style) + :not(style)": {
                      marginLeft: {
                        xs: "0px !important",
                        sm: "8px !important",
                      },
                    },
                  }}
                >
                  <RfidSecondaryButton
                    onClick={() => setOpenBatchConfirmDialog(false)}
                    disabled={batchSaving}
                  >
                    Quét thêm
                  </RfidSecondaryButton>
                  <RfidPrimaryButton
                    variant={uiVariant}
                    onClick={handleBatchConfirm}
                    disabled={batchSaving}
                    startIcon={
                      batchSaving ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <Save />
                      )
                    }
                  >
                    {batchSaving
                      ? "Đang lưu..."
                      : `Lưu ${batchFoundList.length} máy`}
                  </RfidPrimaryButton>
                </DialogActions>
              </Dialog>
            </>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              flexWrap: "wrap",
              "& > :not(style) + :not(style)": {
                marginLeft: { xs: "0px !important", sm: "8px !important" },
              },
            }}
          >
            <RfidSecondaryButton
              startIcon={<Replay />}
              onClick={handleReset}
              sx={{ flex: { xs: "1 1 100%", sm: "0 0 auto" } }}
            >
              Chọn thiết bị khác
            </RfidSecondaryButton>
            {onClose ? (
              <RfidSecondaryButton
                onClick={onClose}
                sx={{
                  flex: { xs: "1 1 100%", sm: "0 0 auto" },
                  color: "error.main",
                  borderColor: "error.light",
                }}
              >
                Đóng
              </RfidSecondaryButton>
            ) : null}
          </Stack>
        </RfidPanelBody>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.9; }
        }
        @keyframes fabPulse {
          0% { box-shadow: 0 6px 24px rgba(46,125,50,0.45); }
          50% { box-shadow: 0 6px 32px rgba(46,125,50,0.75), 0 0 0 8px rgba(76,175,80,0.15); }
          100% { box-shadow: 0 6px 24px rgba(46,125,50,0.45); }
        }
      `}</style>

      {/* Snackbar thông báo lỗi RFID */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={
          isMobile
            ? { vertical: "bottom", horizontal: "center" }
            : { vertical: "top", horizontal: "right" }
        }
      >
        <Alert
          onClose={handleCloseSnackbar}
          onClick={handleCloseSnackbar}
          severity="warning"
          variant="filled"
          sx={{
            width: "100%",
            minWidth: { xs: "auto", sm: "350px" },
            boxShadow: shadows.overlay,
          }}
        >
          <AlertTitle sx={{ fontWeight: "bold", fontSize: fontSizes.px17_6 }}>
            {snackbarTitle}
          </AlertTitle>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RfidRadarPanel;
