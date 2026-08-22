// frontend/src/theme/statusTokens.js
//
// ============================================================================
// MÀU + NHÃN TRẠNG THÁI MÁY - NGUỒN DUY NHẤT
// ============================================================================
//
// Bảng màu này trước đây bị COPY NGUYÊN VĂN trong 6 trang:
//   MachineListPage, LocationTrackPage, MaintenanceSchedulePage,
//   TestProposalPage, TicketManagementPage, ReportPage
// Đổi một màu trạng thái tức là phải sửa 6 file, rất dễ sót.
//
// LƯU Ý: hệ thống thực tế đang dùng HAI bộ màu khác nhau cho cùng một trạng
// thái, và đó là chủ ý về mặt thiết kế:
//   - STATUS_COLORS : dùng cho CHIP trạng thái trong bảng/danh sách
//                     (in_use = tím thương hiệu #667eea)
//   - STAT_COLORS   : dùng cho THẺ SỐ LIỆU và BẢNG MA TRẬN thống kê
//                     (in_use = xanh primary #1976d2, kèm nền pastel)
// Giữ nguyên cả hai, nhưng nay đã được đặt tên rõ ràng thay vì hex rải rác.

// ---------------------------------------------------------------------------
// 1. Bộ màu cho CHIP trạng thái
// ---------------------------------------------------------------------------
export const STATUS_COLORS = {
  available: "#2e7d32",
  in_use: "#667eea",
  maintenance: "#ff9800",
  rented: "#673ab7",
  rented_return: "#673ab7",
  borrowed: "#03a9f4",
  borrowed_return: "#03a9f4",
  borrowed_out: "#00bcd4",
  liquidation: "#f44336",
  pending_liquidation: "#ff5722",
  disabled: "#9e9e9e",
  broken: "#9e9e9e",
};

/**
 * Nhãn mặc định. Một số trang dùng nhãn khác cho cùng trạng thái
 * (ví dụ TicketManagementPage gọi `disabled` là "Vô hiệu hóa"), nên
 * getStatusInfo() cho phép truyền bảng nhãn riêng để ghi đè.
 */
export const STATUS_LABELS = {
  available: "Có thể sử dụng",
  in_use: "Đang sử dụng",
  maintenance: "Bảo trì",
  rented: "Máy thuê",
  rented_return: "Đã trả (Máy Thuê)",
  borrowed: "Máy mượn",
  borrowed_return: "Đã trả (Máy Mượn)",
  borrowed_out: "Cho mượn",
  liquidation: "Thanh lý",
  pending_liquidation: "Chờ thanh lý",
  disabled: "Chưa sử dụng",
  broken: "Máy hư",
};

export const STATUS_FALLBACK = { bg: "#f0f0f0", color: "#555", label: "-" };

/**
 * Trả về { bg, color, label } cho một trạng thái.
 * Nền chip là màu chính + độ mờ 13% (hậu tố "22" trong hex 8 ký tự).
 *
 * @param {string} status
 * @param {object} [options]
 * @param {object} [options.labels]   bảng nhãn riêng của trang, ghi đè nhãn mặc định
 * @param {object|func} [options.fallback] giá trị trả về khi không nhận ra trạng thái;
 *        truyền hàm (status) => ({...}) nếu cần dựng theo chính trạng thái đó.
 *        Các trang không dùng chung một fallback: MachineListPage trả về
 *        { "#f0f0f0", "#555", "-" }, còn LocationTrackPage trả về màu xám kèm
 *        chính tên trạng thái - nên fallback phải để trang tự quyết.
 */
export const getStatusInfo = (status, options = {}) => {
  const { labels, fallback } = options;
  const color = STATUS_COLORS[status];
  if (!color) {
    if (typeof fallback === "function") return fallback(status);
    return fallback || STATUS_FALLBACK;
  }
  return {
    bg: `${color}22`,
    color,
    label: (labels && labels[status]) || STATUS_LABELS[status] || "-",
  };
};

/**
 * Bảng tra cứu sẵn { status: { bg, color, label } }.
 * Dùng khi trang cần TRA CỨU TRỰC TIẾP thay vì gọi hàm, ví dụ
 * `STATUS_CONFIG[machine.current_status] && (...)`.
 * Nội dung y hệt kết quả của getStatusInfo() cho từng trạng thái.
 */
export const STATUS_CONFIG = Object.fromEntries(
  Object.keys(STATUS_COLORS).map((k) => [k, getStatusInfo(k)])
);

/**
 * Fallback "màu xám + chính tên trạng thái".
 * LocationTrackPage, TestProposalPage và TicketManagementPage đều dùng dạng
 * này (MachineListPage thì dùng STATUS_FALLBACK với dấu "-").
 */
export const grayFallback = (status) => ({
  bg: "#9e9e9e22",
  color: "#9e9e9e",
  label: status,
});

/**
 * Bảng nhãn "Đã trả" viết THƯỜNG. TicketManagementPage và TestProposalPage
 * dùng dạng này, khác với MachineListPage / LocationTrackPage viết hoa.
 * Truyền vào buildStatusConfig() để ghi đè nhãn mặc định.
 */
export const STATUS_LABELS_LOWER = {
  rented_return: "Đã trả (máy thuê)",
  borrowed_return: "Đã trả (máy mượn)",
};

/**
 * Dựng bảng { status: { bg, color, label } } với bảng nhãn ghi đè riêng.
 * Dùng khi trang cần nhãn khác mặc định, ví dụ
 *   buildStatusConfig({ ...STATUS_LABELS_LOWER, disabled: "Vô hiệu hóa" })
 */
export const buildStatusConfig = (labels) =>
  Object.fromEntries(
    Object.keys(STATUS_COLORS).map((k) => [k, getStatusInfo(k, { labels })])
  );

// ---------------------------------------------------------------------------
// 4. Trạng thái PHIẾU xuất/nhập
//    Khác hẳn trạng thái máy và trạng thái bảo dưỡng, dù dùng chung một số
//    khoá như `pending`, `completed`. Đừng trộn ba bảng này với nhau.
// ---------------------------------------------------------------------------

/** Chip trạng thái phiếu trộn lẫn trong bảng danh sách máy (TicketManagement,
 *  TestProposal). LƯU Ý: `pending` ở đây là "Chờ xử lý", khác với
 *  TICKET_FLOW.pending ("Chờ duyệt") và MAINT_STATUS.pending ("Chưa thực hiện"). */
export const TICKET_STATUS = {
  pending: { bg: "#ff980022", color: "#ff9800", label: "Chờ xử lý" },
  completed: { bg: "#2e7d3222", color: "#2e7d32", label: "Đã duyệt" },
  cancelled: { bg: "#f4433622", color: "#f44336", label: "Đã hủy" },
};

/** Luồng duyệt phiếu -> màu Chip của MUI + nhãn.
 *  Trước đây cặp getStatusColor/getStatusLabel này bị copy y nguyên trong
 *  ReportPage và TestProposalPage. */
export const TICKET_FLOW = {
  draft: { muiColor: "info", label: "Nháp" },
  pending: { muiColor: "warning", label: "Chờ duyệt" },
  pending_confirmation: { muiColor: "warning", label: "Chờ xác nhận" },
  pending_approval: { muiColor: "warning", label: "Chờ duyệt" },
  completed: { muiColor: "success", label: "Đã duyệt" },
  cancelled: { muiColor: "error", label: "Đã hủy" },
};

/** Màu Chip MUI cho trạng thái phiếu; "default" nếu không nhận ra. */
export const getTicketFlowColor = (status) =>
  TICKET_FLOW[status]?.muiColor || "default";

/** Nhãn tiếng Việt cho trạng thái phiếu; trả về chính `status` nếu lạ. */
export const getTicketFlowLabel = (status) =>
  TICKET_FLOW[status]?.label || status;

// ---------------------------------------------------------------------------
// 3. Trạng thái của LỊCH BẢO DƯỠNG (khác với trạng thái máy ở trên)
//    Trước đây bị copy trong MaintenanceSchedulePage và ReportPage.
//    Chỉ chứa dữ liệu - phần `icon` do trang tự gắn để theme không phải
//    import component React.
// ---------------------------------------------------------------------------
export const MAINT_STATUS = {
  pending: {
    label: "Chưa thực hiện",
    color: "#e65100",
    bg: "#fff3e0",
    borderColor: "#ffcc80",
  },
  completed: {
    label: "Đã thực hiện",
    color: "#1565c0",
    bg: "#e3f2fd",
    borderColor: "#90caf9",
  },
  confirm_completed: {
    label: "Đã hoàn thành",
    color: "#2e7d32",
    bg: "#e8f5e9",
    borderColor: "#a5d6a7",
  },
};

/**
 * Biến thể dùng riêng ở MachineProfileCard. Nó KHÁC MAINT_STATUS ở 2 điểm và
 * đây là chênh lệch thật, không phải lỗi copy:
 *   - viền đậm hơn một bậc (ffb74d/64b5f6/81c784 thay vì ffcc80/90caf9/a5d6a7)
 *   - `confirm_completed` gọi là "Đã duyệt hoàn thành", không phải "Đã hoàn thành"
 * Nhãn/màu chữ/nền thì dùng chung, nên chỉ ghi đè đúng phần lệch.
 */
export const MAINT_STATUS_CARD = {
  pending: { ...MAINT_STATUS.pending, borderColor: "#ffb74d" },
  completed: { ...MAINT_STATUS.completed, borderColor: "#64b5f6" },
  confirm_completed: {
    ...MAINT_STATUS.confirm_completed,
    borderColor: "#81c784",
    label: "Đã duyệt hoàn thành",
  },
};

// ---------------------------------------------------------------------------
// 2. Bộ màu cho THẺ SỐ LIỆU + BẢNG MA TRẬN thống kê
//    color  = màu chữ số / màu nhấn
//    soft   = nền thẻ (độ mờ ~7%)
//    pastel = nền ô trong bảng ma trận
// ---------------------------------------------------------------------------
export const STAT_COLORS = {
  total: { color: "#667eea", soft: "#667eea22", pastel: "#eef0fb" },
  available: { color: "#2e7d32", soft: "#2e7d3211", pastel: "#e8f5e9" },
  in_use: { color: "#1976d2", soft: "#1976d211", pastel: "#e3f2fd" },
  not_in_use: { color: "#ed6c02", soft: "#ff980011", pastel: "#fff3e0" },
  pending_liquidation: {
    color: "#ff5722",
    soft: "#ff572211",
    pastel: "#fbe9e7",
  },
  liquidation: { color: "#d32f2f", soft: "#f4433611", pastel: "#ffebee" },
  // Ba trạng thái con của "Chưa sử dụng" dùng chung một màu
  maintenance: { color: "#00bcd4", soft: "#00bcd411", pastel: "#e0f7fa" },
  broken: { color: "#00bcd4", soft: "#00bcd411", pastel: "#e0f7fa" },
  disabled: { color: "#00bcd4", soft: "#00bcd411", pastel: "#e0f7fa" },
};

export default STATUS_COLORS;
