/** @deprecated Dùng RfidDialog với mode="bulk-import" */
import RfidDialog from "./rfidScanner/RfidDialog";

const RfidScannerDialog = (props) => (
  <RfidDialog mode="bulk-import" {...props} />
);

export default RfidScannerDialog;
