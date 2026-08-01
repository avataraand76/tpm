import { useState, useCallback } from "react";
import { api } from "../../api/api";

export function useRfidLookup({ onMachineFound, onComplete, year, month }) {
  const [rfidInput, setRfidInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  const reset = useCallback(() => {
    setRfidInput("");
    setError(null);
    setWarning(null);
    setLoading(false);
  }, []);

  const handleLookup = async (overrideCode) => {
    const code = (overrideCode ?? rfidInput).trim();
    if (!code || loading) return;

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const res = await api.maintenance.getMachineByRfid(code, year, month);
      if (res.success && res.data) {
        onMachineFound?.(res.data);
        reset();
        onComplete?.();
      } else {
        setError(res.message || "Không tìm thấy máy");
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === "NO_SCHEDULE" || data?.code === "NO_CONTENT") {
        setWarning({
          code: data.code,
          message: data.message,
          machine: data.machine,
        });
      } else {
        setError(data?.message || `Không tìm thấy máy với mã "${code}"`);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    rfidInput,
    setRfidInput,
    loading,
    error,
    setError,
    warning,
    setWarning,
    handleLookup,
    reset,
  };
}
