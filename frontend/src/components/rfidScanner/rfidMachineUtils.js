/** Gộp danh sách máy theo mã RFID (giữ bản ghi đầy đủ nhất) */
export function mergeMachinesByRfid(machines) {
  const byRfid = new Map();
  (machines || []).forEach((machine) => {
    const rfid = machine?.RFID_machine && String(machine.RFID_machine).trim();
    if (!rfid) return;
    const key = rfid.toUpperCase();
    const existing = byRfid.get(key);
    byRfid.set(key, existing ? { ...existing, ...machine } : { ...machine });
  });
  return Array.from(byRfid.values());
}

export function getMachineDisplayName(machine) {
  if (!machine) return "";
  const parts = [
    machine.type_machine,
    machine.attribute_machine,
    machine.model_machine,
  ]
    .map((p) => (p && String(p).trim()) || "")
    .filter(Boolean);
  const joined = parts.join(" ").trim();
  if (joined) return joined;
  if (machine.serial_machine && String(machine.serial_machine).trim()) {
    return String(machine.serial_machine).trim();
  }
  if (machine.code_machine && String(machine.code_machine).trim()) {
    return String(machine.code_machine).trim();
  }
  return "";
}

/** Tạo object mục tiêu dò RFID cho RfidRadarPanel */
export function buildRadarTargetFromMachine(machineRecord, rfidOverride) {
  const rfid = (rfidOverride || machineRecord?.RFID_machine || "").trim();
  if (!rfid) return null;

  const targetRfid = rfid.toUpperCase();
  const name = getMachineDisplayName(machineRecord) || targetRfid;
  const serial =
    machineRecord?.serial_machine && String(machineRecord.serial_machine).trim()
      ? String(machineRecord.serial_machine).trim()
      : "—";

  return {
    targetRfid,
    machineRecord: machineRecord || { RFID_machine: rfid },
    info: {
      serial,
      name,
      code: machineRecord?.code_machine,
      type: machineRecord?.type_machine,
      model: machineRecord?.model_machine,
    },
  };
}
