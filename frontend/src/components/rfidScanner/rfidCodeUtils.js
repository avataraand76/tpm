export function parseRfidCodeList(rawInput) {
  return rawInput
    .split(/\r\n|\r|\n|,/)
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

export function filterValidRfidCodes(codes) {
  return codes.filter(
    (code) =>
      code.toUpperCase().startsWith("E") ||
      code.toUpperCase().startsWith("A") ||
      code.toUpperCase().startsWith("00") ||
      code.toLowerCase().includes("test")
  );
}

export const RFID_LOOKUP_LENGTH = 24;
