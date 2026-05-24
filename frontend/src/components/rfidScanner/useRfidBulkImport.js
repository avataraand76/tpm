import { useState, useRef, useCallback } from "react";
import { api } from "../../api/api";
import { parseRfidCodeList, filterValidRfidCodes } from "./rfidCodeUtils";

const createNotFoundMachinePlaceholder = (rfid) => ({
  uuid_machine: `NOT_FOUND_${rfid}`,
  code_machine: null,
  type_machine: null,
  model_machine: null,
  serial_machine: null,
  RFID_machine: rfid,
  NFC_machine: null,
  current_status: null,
  is_borrowed_or_rented_or_borrowed_out: null,
  is_borrowed_or_rented_or_borrowed_out_name: null,
  is_borrowed_or_rented_or_borrowed_out_date: null,
  is_borrowed_or_rented_or_borrowed_out_return_date: null,
  name_category: null,
  uuid_location: null,
  name_location: null,
  isNotFound: true,
});

export function useRfidBulkImport({
  onAddMachines,
  apiParams,
  showNotification,
  selectedMachineUuids,
  isInventoryMode = false,
  onComplete,
}) {
  const [rfidInput, setRfidInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef(null);

  const reset = useCallback(() => {
    setRfidInput("");
    setIsProcessing(false);
  }, []);

  const handleClearInput = () => {
    setRfidInput("");
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      const filteredCodes = filterValidRfidCodes(parseRfidCodeList(rfidInput));
      if (filteredCodes.length === 0) {
        showNotification(
          "warning",
          "Chưa nhập mã",
          "Vui lòng nhập hoặc dán danh sách mã RFID."
        );
        setIsProcessing(false);
        return;
      }

      const result = await api.machines.getByRfidList({
        rfid_list: filteredCodes,
        ...apiParams,
      });

      if (result.success) {
        const { foundMachines, notFoundRfids, filterMessage } = result.data;
        const machinesToAdd = [];
        const duplicateMachines = [];
        const selectedSet = new Set(selectedMachineUuids || []);

        for (const machine of foundMachines) {
          if (selectedSet.has(machine.uuid_machine)) {
            duplicateMachines.push(machine);
          } else {
            machinesToAdd.push(machine);
            selectedSet.add(machine.uuid_machine);
          }
        }

        if (isInventoryMode && notFoundRfids.length > 0) {
          machinesToAdd.push(
            ...notFoundRfids
              .filter((rfid) => !selectedSet.has(`NOT_FOUND_${rfid}`))
              .map((rfid) => {
                const p = createNotFoundMachinePlaceholder(rfid);
                selectedSet.add(p.uuid_machine);
                return p;
              })
          );
        }

        if (machinesToAdd.length > 0) onAddMachines(machinesToAdd);

        const addedCount = machinesToAdd.length;
        const duplicateCount = duplicateMachines.length;
        const notFoundCount = notFoundRfids.length;

        if (isInventoryMode) {
          if (notFoundCount > 0) {
            showNotification(
              "info",
              "Đã ghi nhận RFID không tìm thấy",
              `${notFoundCount} mã không tìm thấy đã được ghi nhận: [${notFoundRfids.join(", ")}]`
            );
          }
        } else {
          let title;
          let message;
          let severity = "success";
          if (addedCount > 0 && duplicateCount === 0 && notFoundCount === 0) {
            title = "Thành công";
            message = `Đã tìm thấy và thêm ${addedCount} máy.`;
          } else if (
            addedCount === 0 &&
            duplicateCount > 0 &&
            notFoundCount === 0
          ) {
            title = "Không thêm máy mới";
            message = `Đã tìm thấy ${duplicateCount} máy, nhưng tất cả đều đã có trong danh sách.`;
            severity = "info";
          } else {
            title = "Hoàn tất (có cảnh báo)";
            severity = "warning";
            const parts = [];
            if (addedCount > 0) parts.push(`Đã thêm ${addedCount} máy`);
            if (duplicateCount > 0)
              parts.push(
                `${duplicateCount} máy bị bỏ qua (đã có trong danh sách)`
              );
            if (notFoundCount > 0)
              parts.push(
                `${notFoundCount} mã không tìm thấy: [${notFoundRfids.join(", ")}]`
              );
            message =
              parts.join(". ") +
              `. (Lý do lọc: ${filterMessage || "Máy không hợp lệ"})`;
          }
          showNotification(severity, title, message);
        }

        reset();
        onComplete?.();
      } else {
        showNotification(
          "error",
          "Lỗi",
          result.message || "Lỗi khi tìm máy bằng RFID."
        );
      }
    } catch (error) {
      console.error("Error processing RFID list:", error);
      showNotification(
        "error",
        "Lỗi nghiêm trọng",
        error.response?.data?.message || "Lỗi máy chủ khi xử lý danh sách RFID."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    rfidInput,
    setRfidInput,
    isProcessing,
    inputRef,
    handleClearInput,
    handleSubmit,
    reset,
  };
}
