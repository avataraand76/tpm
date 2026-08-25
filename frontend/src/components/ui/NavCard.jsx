// frontend/src/components/ui/NavCard.jsx
//
// Thẻ điều hướng dùng ở trang chủ. Trước đây mỗi thẻ là ~55 dòng JSX với
// gradient/bóng đổ/hover copy-paste 6 lần. Giờ chỉ cần khai báo dữ liệu.

import React from "react";
import { Card, CardContent, Avatar, Typography, Button } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import {
  accentGradient,
  accentWash,
  accentShadow,
  borders,
  radii,
} from "../../theme";

/**
 * @param {string}  accent      khoá màu trong theme.js §3 (red|green|cyan|amber|purple|slate|brand)
 * @param {node}    icon        icon MUI, ví dụ <Receipt />
 * @param {string}  title       tiêu đề thẻ
 * @param {node}    description mô tả
 * @param {string}  actionLabel chữ trên nút
 * @param {func}    onAction    hàm gọi khi bấm nút
 */
const NavCard = ({ accent, icon, title, description, actionLabel, onAction }) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      borderRadius: `${radii.lg}px`,
      border: borders.subtle,
      background: accentWash(accent),
      transition: "all 0.3s ease",
      "&:hover": {
        transform: "translateY(-8px)",
        boxShadow: accentShadow(accent),
      },
    }}
  >
    <CardContent sx={{ p: 4, textAlign: "center" }}>
      <Avatar
        sx={{
          width: 70,
          height: 70,
          background: accentGradient(accent),
          mx: "auto",
          mb: 3,
        }}
      >
        {React.cloneElement(icon, { sx: { fontSize: 35 } })}
      </Avatar>

      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      <Button
        variant="contained"
        size="large"
        endIcon={<ArrowForward />}
        onClick={onAction}
        sx={{
          borderRadius: `${radii.md}px`,
          background: accentGradient(accent),
          px: 4,
          py: 1.5,
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: accentShadow(accent, 8, 25, 0.3),
          },
        }}
      >
        {actionLabel}
      </Button>
    </CardContent>
  </Card>
);

export default NavCard;
