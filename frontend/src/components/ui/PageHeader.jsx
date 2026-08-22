// frontend/src/components/ui/PageHeader.jsx
//
// Tiêu đề trang dùng chung: avatar gradient + tiêu đề tô gradient + phụ đề,
// kèm chỗ đặt widget bên phải (prop `action`).
// Cỡ chữ do theme lo (variant h3/h6 đã tự co giãn) nên KHÔNG cần isMobile.
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
            <Typography variant="h6" color="text.secondary">
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
