// frontend/src/components/ui/StatCard.jsx
//
// Thẻ số liệu bấm được (dùng làm filter). Trước đây mỗi thẻ là 25-30 dòng JSX
// lặp lại y nguyên: 12 lần trong MachineListPage, 12 lần trong LocationTrackPage.
//
// Cỡ chữ do theme lo (variant h1/h3/h4/h5 đã tự co giãn) nên KHÔNG cần isMobile.

import React from "react";
import { Card, CardContent, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { sx as preset, radii } from "../../theme";

// Bốn cỡ thẻ đang dùng trong hệ thống. Thêm cỡ mới thì khai báo ở đây,
// đừng truyền variant rời rạc từ ngoài vào.
const SIZES = {
  // Thẻ tổng lớn (MachineListPage): nhãn ở trên, chữ IN HOA, số cỡ h1
  heroLg: {
    valueVariant: "h1",
    labelVariant: "body1",
    pad: { p: 4 },
    labelFirst: true,
    uppercase: true,
    stretch: true,
  },
  // Thẻ tổng vừa (LocationTrackPage): nhãn ở trên, số cỡ h3
  heroMd: {
    valueVariant: "h3",
    labelVariant: "body2",
    pad: { p: 3 },
    labelFirst: true,
    stretch: true,
  },
  // Thẻ trạng thái thường
  md: {
    valueVariant: "h4",
    labelVariant: "body2",
    pad: { py: 3 },
  },
  // Thẻ trạng thái nén
  sm: {
    valueVariant: "h5",
    labelVariant: "caption",
    pad: { p: 2 },
  },
};

/**
 * @param {number|string} value  con số hiển thị
 * @param {string}  label        nhãn
 * @param {string}  color        màu của con số
 * @param {string}  background   nền thẻ (màu hoặc gradient)
 * @param {string}  size         "heroLg" | "heroMd" | "md" | "sm"
 * @param {boolean} active       đang được chọn làm filter
 * @param {func}    onClick
 * @param {object}  sx           style bổ sung.
 *        LƯU Ý: KHÔNG truyền `border` qua đây. Viền do trạng thái `active`
 *        quyết định (3px màu primary khi chọn, viền nhạt khi không) và `sx`
 *        được trộn SAU nên sẽ ghi đè, làm mất viền focus.
 */
const StatCard = ({
  value,
  label,
  color,
  background,
  size = "md",
  active = false,
  onClick,
  sx,
}) => {
  const theme = useTheme();
  const s = SIZES[size] || SIZES.md;

  const valueNode = (
    <Typography variant={s.valueVariant} fontWeight="bold" color={color}>
      {value}
    </Typography>
  );
  const labelNode = (
    <Typography
      variant={s.labelVariant}
      color="text.secondary"
      sx={{
        ...(s.labelFirst && { mb: 1, display: "block" }),
        ...(s.uppercase && { textTransform: "uppercase" }),
      }}
    >
      {label}
    </Typography>
  );

  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: `${radii.lg}px`,
        background,
        ...(s.stretch && {
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }),
        // sx của người dùng trộn TRƯỚC khối active, để viền focus luôn thắng
        ...sx,
        ...(active ? preset.cardSelected(theme) : preset.cardSelectable),
      }}
    >
      <CardContent sx={{ textAlign: "center", ...s.pad }}>
        {s.labelFirst ? (
          <>
            {labelNode}
            {valueNode}
          </>
        ) : (
          <>
            {valueNode}
            {labelNode}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
