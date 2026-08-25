// frontend/src/components/ui/PageHeader.jsx
//
// Tiêu đề trang dùng chung: avatar gradient + tiêu đề tô gradient + phụ đề,
// kèm chỗ đặt widget bên phải (prop `action`).
//
// CỠ CHỮ: tiêu đề dùng variant h3 - theme đã tự lùi xuống cỡ h4 khi màn hình
// dưới 600px (xem §6 trong theme.js), nên ở đây không cần isMobile.
// Riêng PHỤ ĐỀ phải lùi tại chỗ: bản cũ dùng `variant={isMobile ? "body1" :
// "h6"}`, mà h6 KHÔNG được lùi toàn cục (72 chỗ khác dùng h6 cố định).
//
// BỐ CỤC: khi có `action`, hàng ngoài xếp DỌC trên điện thoại và NGANG từ
// tablet trở lên. Không dùng `flex: 1` + `minWidth: 0` cho khối tiêu đề, vì
// khi đó tiêu đề bị bóp về gần 0 và xuống dòng từng chữ thay vì đẩy widget
// xuống hàng dưới.

import React from "react";
import { Box, Stack, Avatar, Typography } from "@mui/material";
import { sx as preset, gradients } from "../../theme";

const PageHeader = ({
  icon,
  title,
  subtitle,
  gradient = gradients.brand,
  action,
  titleSx,
  sx,
}) => (
  <Box sx={{ mb: { xs: 3, md: 6 }, ...sx }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={2}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ minWidth: 0 }}
      >
        {icon && (
          <Avatar
            sx={{ width: 60, height: 60, background: gradient, flexShrink: 0 }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 30 } })}
          </Avatar>
        )}

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              ...preset.gradientText(gradient),
              ...titleSx,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="h6"
              color="text.secondary"
              // Dưới 600px dùng cỡ body1 (1rem), từ 600px dùng cỡ h6 (1.25rem)
              // - đúng như bản cũ `variant={isMobile ? "body1" : "h6"}`.
              // Viết thẳng ở đây thay vì lùi h6 trong theme, vì 72 chỗ khác
              // trong dự án dùng h6 cố định và không được nhỏ đi.
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  </Box>
);

export default PageHeader;
