// frontend/src/theme/breakpoints.js
//
// Điểm ngắt (breakpoint) tập trung một chỗ.
// Hiện đang giữ đúng giá trị mặc định của MUI để không làm lệch các trang cũ
// (NavigationBar dùng down("lg"), nhiều trang dùng down("sm")...).
//
// Muốn chỉnh cho đúng thiết bị thật ở nhà máy thì sửa DUY NHẤT ở đây,
// ví dụ máy tính bảng công nghiệp 1024-1280 -> đổi lg: 1280.

export const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};

export default breakpoints;
