// frontend/src/components/FileUploadComponent.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Link,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import {
  AttachFile,
  Delete,
  CloudUpload,
  Description,
  Close,
} from "@mui/icons-material";

const FileUploadComponent = ({
  onFilesChange,
  existingFiles,
  disabled,
  showNotification,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null); // {name, link}
  const handleOpenPreview = (file) => setPreviewFile(file);
  const handleClosePreview = () => setPreviewFile(null);

  // Parse the existing files string (e.g., "link1; link2") into an array
  const filesFromLinks = (existingFiles || "")
    .split(";")
    .map((pairString) => {
      const trimmedPair = pairString.trim();
      if (!trimmedPair) return null;

      // Tách chuỗi bằng dấu '|'
      const parts = trimmedPair.split("|");

      // Xử lý trường hợp tên file có dấu '|' hoặc link bị hỏng
      if (parts.length < 2) {
        // Fallback: nếu không có dấu '|', coi cả chuỗi là link
        // (để hỗ trợ dữ liệu cũ nếu có)
        if (trimmedPair.startsWith("http")) {
          return { name: "File đính kèm (link cũ)", link: trimmedPair };
        }
        return { name: "File đính kèm (lỗi định dạng)", link: "#" };
      }

      // Phần tử cuối cùng LUÔN LÀ link
      const link = parts.pop();
      // Nối tất cả phần còn lại (phòng trường hợp tên file chứa '|')
      const name = parts.join("|");

      return { name, link };
    })
    .filter(Boolean); // Lọc ra các entry null

  useEffect(() => {
    // Pass the File objects array to the parent
    onFilesChange(selectedFiles);
  }, [selectedFiles, onFilesChange]);

  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files);
    const MAX_FILES = 10;
    const MAX_SIZE_MB = 100;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    // Check 1: Tổng số file
    if (selectedFiles.length + newFiles.length > MAX_FILES) {
      const message = `Bạn chỉ có thể tải lên tối đa ${MAX_FILES} file cùng lúc.`;
      if (showNotification) {
        showNotification("error", "Quá giới hạn file", message);
      } else {
        alert(message);
      }
      return;
    }

    const validFiles = [];
    for (const file of newFiles) {
      // Check 2: Kích thước file
      if (file.size > MAX_SIZE_BYTES) {
        const message = `File "${file.name}" (${formatFileSize(
          file.size
        )}) vượt quá giới hạn ${MAX_SIZE_MB}MB.`;
        if (showNotification) {
          showNotification("error", "File quá lớn", message);
        } else {
          alert(message);
        }
        continue; // Bỏ qua file này
      }
      validFiles.push(file);
    }

    setSelectedFiles((prevFiles) => {
      // Check 3: Chống trùng lặp (giữ nguyên)
      const uniqueNewFiles = validFiles.filter(
        (newFile) =>
          !prevFiles.some((prevFile) => prevFile.name === newFile.name)
      );
      return [...prevFiles, ...uniqueNewFiles];
    });
    // Clear the input value to allow selecting the same file again after removing
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleRemoveFile = (fileName) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileName)
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{ p: 2, borderRadius: "12px", mt: 2, mb: 1 }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          File đính kèm
        </Typography>

        {!disabled && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              sx={{ borderRadius: "12px" }}
            >
              Chọn file
              <input
                type="file"
                hidden
                multiple
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </Button>
          </Box>
        )}

        {/* List of NEW files to be uploaded */}
        {selectedFiles.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              File mới (sẽ tải lên):
            </Typography>
            <List dense>
              {selectedFiles.map((file) => (
                <ListItem
                  key={file.name}
                  secondaryAction={
                    !disabled && (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveFile(file.name)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    )
                  }
                  sx={{
                    bgcolor: "rgba(102, 126, 234, 0.05)",
                    borderRadius: "8px",
                    mb: 0.5,
                  }}
                >
                  <ListItemIcon>
                    <Description color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={formatFileSize(file.size)}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* List of EXISTING files (links) */}
        {filesFromLinks.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mt: selectedFiles.length > 0 ? 2 : 0,
              }}
            >
              File đã tải lên:
            </Typography>
            <List dense>
              {/* 'link' bây giờ là 'file' (object {name, link}) */}
              {filesFromLinks.map((file, index) => {
                return (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: "rgba(0, 0, 0, 0.03)",
                      borderRadius: "8px",
                      mb: 0.5,
                    }}
                  >
                    <ListItemIcon>
                      <AttachFile color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Link
                          component="button"
                          variant="body1"
                          onClick={() => handleOpenPreview(file)} // Mở preview
                          underline="hover"
                          sx={{ textAlign: "left" }} // Căn lề trái
                        >
                          {file.name} {/* Dùng file.name */}
                        </Link>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </>
        )}

        {/* Show if no files at all */}
        {selectedFiles.length === 0 && filesFromLinks.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Không có file đính kèm.
          </Typography>
        )}
      </Paper>
      <Dialog
        open={Boolean(previewFile)}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "90vh",
            width: "90vw",
            maxWidth: "1400px",
            borderRadius: "20px",
            overflow: "hidden", // Ẩn thanh cuộn của dialog
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          {previewFile?.name}
          <IconButton onClick={handleClosePreview} sx={{ ml: 2 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: "hidden" }}>
          <iframe
            src={previewFile?.link} // Link "preview" đã lấy từ server
            width="100%"
            height="100%"
            frameBorder="0"
            title={previewFile?.name}
            style={{ border: "none" }} // Đảm bảo không có viền
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileUploadComponent;
