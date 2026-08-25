---
name: tpm-page
description: Dựng hoặc sửa trang/khối giao diện trong frontend của hệ thống TPM (quản lý máy móc thiết bị) sao cho khớp theme hiện tại và lấy dữ liệu đúng cách qua api.jsx. Dùng skill này mỗi khi thêm trang mới, thêm tab, thêm dialog, thêm bảng/thẻ thống kê, hoặc chỉnh màu/cỡ chữ/bo góc/bóng đổ trong `frontend/src`.
---

# Dựng trang trong hệ thống TPM

Dự án: `frontend/` — React 19 + Vite + MUI v7, tiếng Việt, dùng pnpm.
Backend riêng ở `backend/`, frontend gọi qua **một** file: `src/api/api.jsx`.

## 0. Ba luật bất di bất dịch

1. **Import giao diện CHỈ từ `../ui`.** Không import trực tiếp `@mui/material`, `@mui/icons-material`, `../theme`, hay `../hooks/useResponsive` trong `pages/` và `components/`.
2. **Giá trị hình ảnh nằm trong `src/theme.js`.** Không viết mã hex, `fontSize` bằng rem/px, `borderRadius` bằng số, gradient hay `boxShadow` trực tiếp trong trang. Cần giá trị mới → thêm token vào đúng mục của `theme.js`.
3. **Không tự gọi `useMediaQuery`/`useTheme`.** Dùng `useResponsive()`. ESLint (`no-restricted-imports`) chặn việc này; chỉ `src/theme.js`, `src/hooks/`, `src/ui/`, `src/components/ui/` được miễn.

Ngược lại: **style chỉ dùng MỘT lần thì viết `sx` ngay tại phần tử** — đừng tạo preset. (Đã từng tạo 7 preset kiểu đó, không nơi nào dùng, phải xoá.)

## 1. Bộ khung một trang mới

```jsx
// frontend/src/pages/TenTrangPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  // component MUI, icon MUI, primitive của dự án, token, hook — TẤT CẢ từ đây
  Alert, Box, Button, Card, CardContent, CircularProgress, Typography,
  Refresh, Assessment,
  PageHeader, StatCard,
  sx as preset, colors, radii, gradients, autoGrid, useResponsive,
} from "../ui";
import NavigationBar from "../components/NavigationBar";
import { api } from "../api/api.jsx";

const TenTrangPage = () => {
  const { isMobile, dialogFullScreen, tableSize, rowsPerPage } = useResponsive();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.machines.getAll({ page: 1, limit: rowsPerPage });
      if (result.success) setData(result.data);
      else setError(result.message || "Không tải được dữ liệu");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <NavigationBar />
      <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 4 }, maxWidth: 1600, mx: "auto" }}>
        <PageHeader
          icon={<Assessment />}
          title="Tên trang"
          subtitle="Mô tả ngắn chức năng của trang"
          titleSx={{ textTransform: "uppercase" }}
          action={
            <Button variant="contained" startIcon={<Refresh />} onClick={fetchData}>
              Làm mới
            </Button>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Card elevation={0} sx={{ ...preset.softCard, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>{/* nội dung */}</CardContent>
          </Card>
        )}
      </Box>
    </>
  );
};

export default TenTrangPage;
```

Rồi nối vào `src/App.jsx`:

```jsx
<Route
  path="/duong-dan"
  element={
    <ProtectedRoute>
      <TenTrangPage />
    </ProtectedRoute>
  }
/>
```

Nếu trang chỉ dành cho admin thì bọc `<AdminPCDRoute>` (đã có trong `App.jsx`) thay cho `ProtectedRoute`.

## 2. Giao diện — lấy gì từ `theme.js`

`src/theme.js` là **file duy nhất** chứa giá trị hình ảnh. 7 mục, Ctrl+F theo `§n.`

| Cần | Dùng | Ví dụ |
|---|---|---|
Màu | `colors` (§1) | `colors.brand.main`, `colors.green.wash`, `colors.grey[100]`, `colors.navy.dark` |
Màu mờ | `hexA(hex, "11")` | `hexA(colors.blue.main, "11")` → `#1976d211` |
Cỡ chữ ghi đè | `fontSizes` (§2) | `caption label small body lead title xl xxl` — 8 bậc, đừng thêm bậc mới |
Gradient | `gradients` (§3) | `gradients.brand`, `gradients.brandDeep`, `gradients.teal` |
Màu nhấn cho thẻ | `accents` + `accentGradient/Wash/Shadow` (§3) | `accentWash("green")` |
Bo góc | `radii` (§4) | `radii.sm 8` / `radii.md 12` / `radii.lg 20` / `circle` / `pill`. **Chỉ 3 bậc này** |
Viền | `borders` (§4) | `borders.subtle`, `borders.light`, `borders.dashed` |
Bóng | `shadows` (§4) | `shadows.card` (bóng chuẩn mặt phẳng), `brandLift`, `greenLift`, `overlay` |
Bóng tuỳ ý | `shadow(y, blur, shadowRgb.x, alpha)` | `shadow(8, 25, shadowRgb.brand, 0.3)` |
Màu + nhãn trạng thái | §5 | `getStatusInfo(status)`, `STATUS_LABELS`, `STAT_COLORS`, `MAINT_STATUS`, `TICKET_FLOW` |

**Đừng tự viết lại bảng trạng thái.** `§5` là nguồn duy nhất cho nhãn tiếng Việt và màu của trạng thái máy / phiếu / lịch bảo dưỡng. Trước đây nó bị copy trong 6 trang.

### Preset `sx` dùng lại (§7)

```
softCard        thẻ nội dung: bo lớn + viền nhạt + bóng chuẩn
panel           panel viền xám rõ (mục trong dialog lý lịch)
chipRow         hàng chip tự xuống dòng
cardSelectable  thẻ bấm được, chưa chọn
cardSelected(theme)  thẻ đang chọn (viền 3px primary)
ellipsis        cắt 1 dòng kèm ...
gradientText(g) chữ tô gradient
centerFull      canh giữa toàn màn hình (loading)
dialogPaper(fullScreen) / dialogTitle
fieldHighlight  ô nhập bị khoá: nền vàng, chữ đỏ
```

### Primitive dùng lại (`src/components/ui/`)

- `PageHeader` — avatar gradient + tiêu đề + phụ đề + `action`. **Mọi trang phải dùng cái này**, đừng tự dựng header.
- `StatCard` — thẻ số liệu bấm được, 4 cỡ: `heroLg heroMd md sm`. **Không truyền prop `border`** (viền do trạng thái `active` quyết định).
- `NavCard` — thẻ điều hướng ở trang chủ.

### Style mặc định đã có (§6) — đừng khai lại

Button bo 12px · Card có bóng `shadows.card` · Paper `variant="outlined"` có bóng · TextField/Select/Autocomplete bo 12px · Alert bo 12px · TableCell `size="small"` 14px · Tooltip chạm được trên màn cảm ứng.

## 3. Responsive — 4 tầng, chọn đúng tầng

Breakpoint: `xs 0 · sm 600 · md 900 · lg 1200 · xl 1536` (khai trong §6).

**Tầng 1 — Cỡ chữ tự lo, không cần code.** Dưới 600px các variant lùi một bậc: `h1→60 h2→48 h3→34 h4→24 h5→20` px. Nên chỉ cần `variant="h3"` cho tiêu đề, `variant="h4"` cho tiêu đề mục — mobile tự nhỏ lại.
`h6` **không** lùi bậc (72 chỗ trong dự án dùng h6 cố định). Cần h6 nhỏ lại thì viết tại chỗ: `sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}`.

**Tầng 2 — Giá trị theo breakpoint trong `sx`** (cách dùng nhiều nhất, thuần CSS):
```jsx
sx={{ p: { xs: 2, md: 4 }, flexDirection: { xs: "column", sm: "row" } }}
```

**Tầng 3 — Lưới.** Hai lựa chọn:
- `<Grid container spacing={2}>` + `<Grid size={{ xs: 12, sm: 6, md: 4 }}>` — dùng khi cần kiểm soát cột chính xác.
- `autoGrid(minPx, gap, maxCols)` — số cột tự tính theo bề rộng container, không breakpoint:
  ```jsx
  <Box sx={autoGrid(250, 3, 3)}>  {/* tối đa 3 cột, tự bớt khi hẹp */}
  ```
  **Đừng bọc `Chip` trong `<Grid size={{ xs: 12 }}>`** — mobile mỗi chip sẽ chiếm trọn một dòng. Dùng `preset.chipRow`.

**Tầng 4 — Breakpoint bằng JS** khi CSS không làm được (đổi prop, đổi số lượng, đổi component):
```jsx
const { isMobile, isTablet, isDesktop, isTouch, belowSm, belowMd, belowLg,
        dialogFullScreen, tableSize, rowsPerPage, maxInlineActions, stackDirection,
        theme } = useResponsive();
```
Các giá trị phái sinh đã đặt luật một lần cho cả hệ thống — dùng chúng thay vì tự viết `isMobile ? ... : ...`:
`dialogFullScreen` · `tableSize` (small/medium) · `rowsPerPage` (10/25/50) · `maxInlineActions` (1/2/4) · `stackDirection`.

## 4. Lấy dữ liệu — `src/api/api.jsx`

```jsx
import { api } from "../api/api.jsx";
```

Một object `api` duy nhất, 14 nhóm:

```
api.login(data)          api.auth.getPermissions()
api.machines.*           api.departments.*        api.locations.*
api.imports.*            api.exports.*            api.internal_transfers.*
api.tracking.*           api.admin.*              api.test_proposals.*
api.inventory.*          api.maintenance.*        api.reports.*
```

Mỗi hàm là `async`, đã `return response.data`, nên **không** cần `.data` ở trang. Quy ước phản hồi backend: `{ success, data, message }`.

**Interceptor đã lo sẵn, đừng làm lại:**
- Gắn `Authorization: Bearer <token>` từ `localStorage` vào mọi request.
- `FormData` thì tự bỏ `Content-Type` để axios đặt `multipart/form-data` kèm boundary → **upload file chỉ cần truyền `FormData`**.
- Gặp 401/403 (trừ `/api/auth/login`): xoá token, xoá user, reload về trang đăng nhập.

**Thêm endpoint mới:** thêm hàm vào đúng nhóm trong `api.jsx`, dưới đúng dải `// MARK:` tương ứng. Đừng gọi `axios`/`fetch` trực tiếp trong trang.

```js
// trong api.jsx, MARK: REPORTS
reports: {
  getMonthlySummary: async (params = {}) => {
    const response = await httpConnect.get("/api/reports/monthly", { params });
    return response.data;
  },
},
```

**Mảng trong query string:** backend là Express, cần `paramsSerializer` để gửi `&key=A&key=B`. Đã có sẵn ở `api.machines.getAll` và `getDistinctValues` — copy y nguyên nếu endpoint mới cũng nhận mảng.

**Mẫu fetch chuẩn của dự án:** `useCallback` + `useEffect`, ba state `data / loading / error`, `try/catch/finally`, kiểm `result.success`, lỗi lấy từ `err.response?.data?.message`. Xem `fetchData` ở mục 1.

## 5. Quyền truy cập

```jsx
const { user, permissions, isAuthenticated, loading } = useAuth(); // "../hooks/useAuth"

if (permissions.includes("admin")) { /* ... */ }
```

`permissions` là mảng **tên quyền** (`['admin', 'edit', ...]`), nạp sẵn bởi `AuthContext` khi đăng nhập. Ẩn/hiện nút theo quyền ở trang; chặn cả trang thì làm ở route trong `App.jsx`.

## 6. Bẫy đã gặp thật — đọc trước khi sửa giao diện

1. **`<Card elevation={0}>` VẪN có bóng.** Theme đặt `MuiCard.styleOverrides.root.boxShadow` và khai báo đó nằm sau `box-shadow: var(--Paper-shadow)` trong cùng rule CSS nên nó thắng. Đừng thêm `boxShadow: "none"` vào preset dùng chung — đã từng làm mất bóng của 4 card lớn.
2. **`<Paper variant="outlined">` bị MUI bỏ bóng** và bỏ luôn `elevation`. Theme đã trả lại bóng cho nó; đừng ghi đè.
3. **`colors.navy` ≠ `colors.grey`.** `navy` là thang xám pha xanh cho các khối tối của `ReportPage`/`AdminPage`. Đừng gộp vào `grey`.
4. **7 tên trùng giữa hai package MUI**: `Badge Input Link List Menu Radio Tab`. Component giữ tên gốc, icon mang hậu tố `Icon` → `<MenuIcon />` là icon burger, `<Menu>` là dropdown. Nhầm cái này không bị lint hay build bắt.
5. **Chữ đè `sx` lên preset**: `sx` của người dùng được trộn TRƯỚC khối `active` trong `StatCard`, nên đừng truyền `border` vào nó.
6. **Cỡ chữ cố định là chủ ý.** `FLUID_TYPE = false` trong §2. Đừng bật `true` để "sửa" chữ to trên mobile — nó làm chữ nhỏ hơn cả bản cũ và kéo theo toàn bộ 214 chỗ ghi đè.

## 7. Xong thì kiểm

```bash
cd frontend
npx eslint src --max-warnings=0   # phải sạch, gồm cả luật chặn useMediaQuery
npm run build                      # phải pass
```

Nếu sửa giá trị hình ảnh và muốn chắc không lệch ngoài ý muốn: render cùng một cây phần tử với theme cũ và theme mới, trích rule CSS của emotion rồi so **giá trị cuối cùng** của từng thuộc tính. Đếm số lần token xuất hiện trong code **không** phát hiện được lỗi kiểu `boxShadow: "none"` che mất bóng.
