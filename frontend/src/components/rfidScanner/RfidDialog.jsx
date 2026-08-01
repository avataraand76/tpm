/**
 * RFID Action Center — một entry point cho mọi thao tác RFID/NFC.
 *
 * mode:
 *   - "bulk-import" — dán nhiều mã, thêm vào phiếu / kiểm kê
 *   - "radar"       — dò tìm theo danh sách mục tiêu (quét liên tục)
 *   - "lookup"      — tra cứu 1 mã (vd. lịch bảo dưỡng)
 */

import React, { useEffect } from "react";
import RfidDialogShell from "./RfidDialogShell";
import RfidRadarPanel from "./RfidRadarPanel";
import { useRfidBulkImport } from "./useRfidBulkImport";
import {
  RfidBulkImportPanelBody,
  RfidBulkImportPanelActions,
} from "./RfidBulkImportPanel";
import { useRfidLookup } from "./useRfidLookup";
import { RfidLookupPanelBody, RfidLookupPanelActions } from "./RfidLookupPanel";
import { RFID_MODE_DEFAULTS } from "./rfidDialogTheme";

// ─── bulk-import ───────────────────────────────────────────────────────────

const RfidDialogBulkImport = ({
  open,
  onClose,
  title,
  subtitle,
  onAddMachines,
  apiParams,
  showNotification,
  selectedMachineUuids,
  isInventoryMode,
}) => {
  const bulk = useRfidBulkImport({
    onAddMachines,
    apiParams,
    showNotification,
    selectedMachineUuids,
    isInventoryMode,
    onComplete: onClose,
  });

  const handleClose = () => {
    bulk.reset();
    onClose();
  };

  useEffect(() => {
    if (!open) bulk.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const defaults = RFID_MODE_DEFAULTS["bulk-import"];

  return (
    <RfidDialogShell
      open={open}
      onClose={handleClose}
      title={title ?? defaults.title}
      subtitle={subtitle}
      variant="default"
      maxWidth={defaults.maxWidth}
      contentSx={{ p: 0 }}
      actions={
        <RfidBulkImportPanelActions
          variant="default"
          onClose={handleClose}
          onSubmit={bulk.handleSubmit}
          isProcessing={bulk.isProcessing}
        />
      }
    >
      <RfidBulkImportPanelBody
        rfidInput={bulk.rfidInput}
        setRfidInput={bulk.setRfidInput}
        isProcessing={bulk.isProcessing}
        inputRef={bulk.inputRef}
        onClear={bulk.handleClearInput}
      />
    </RfidDialogShell>
  );
};

// ─── radar ─────────────────────────────────────────────────────────────────

const RfidDialogRadar = ({
  open,
  onClose,
  title,
  subtitle,
  variant,
  selectedMachines,
  onClearSelection,
  skipResolveApi,
  inventoryLocations,
  onFoundMachineInventory,
  preSelectedLocationUuid,
  onBatchConfirm,
  onReplaceRfid,
  hideScanModeToggle = false,
}) => {
  const defaults = RFID_MODE_DEFAULTS.radar;
  const resolvedVariant =
    variant ?? (preSelectedLocationUuid ? "batch" : defaults.variant);
  const resolvedTitle =
    title ??
    (preSelectedLocationUuid ? "Quét hàng loạt (RFID)" : defaults.title);

  return (
    <RfidDialogShell
      open={open}
      onClose={onClose}
      title={resolvedTitle}
      subtitle={subtitle}
      variant={resolvedVariant}
      maxWidth={defaults.maxWidth}
      contentSx={{ p: 0 }}
      disableEnforceFocus
    >
      <RfidRadarPanel
        uiVariant={resolvedVariant}
        onClose={onClose}
        selectedMachines={selectedMachines}
        onClearSelection={onClearSelection}
        skipResolveApi={skipResolveApi}
        inventoryLocations={inventoryLocations}
        onFoundMachineInventory={onFoundMachineInventory}
        preSelectedLocationUuid={preSelectedLocationUuid}
        onBatchConfirm={onBatchConfirm}
        onReplaceRfid={onReplaceRfid}
        hideScanModeToggle={hideScanModeToggle}
      />
    </RfidDialogShell>
  );
};

// ─── lookup ────────────────────────────────────────────────────────────────

const RfidDialogLookup = ({
  open,
  onClose,
  title,
  subtitle,
  onMachineFound,
  year,
  month,
}) => {
  const lookup = useRfidLookup({
    onMachineFound,
    onComplete: onClose,
    year,
    month,
  });

  const handleClose = () => {
    lookup.reset();
    onClose();
  };

  useEffect(() => {
    if (!open) lookup.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const defaults = RFID_MODE_DEFAULTS.lookup;

  return (
    <RfidDialogShell
      open={open}
      onClose={handleClose}
      title={title ?? defaults.title}
      subtitle={subtitle ?? defaults.subtitle}
      variant="lookup"
      maxWidth={defaults.maxWidth}
      disableClose={lookup.loading}
      actions={
        <RfidLookupPanelActions
          onClose={handleClose}
          onLookup={() => lookup.handleLookup()}
          loading={lookup.loading}
          rfidInput={lookup.rfidInput}
        />
      }
    >
      <RfidLookupPanelBody
        rfidInput={lookup.rfidInput}
        setRfidInput={lookup.setRfidInput}
        loading={lookup.loading}
        error={lookup.error}
        setError={lookup.setError}
        warning={lookup.warning}
        setWarning={lookup.setWarning}
        onLookup={lookup.handleLookup}
      />
    </RfidDialogShell>
  );
};

// ─── router ────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {"bulk-import"|"radar"|"lookup"} props.mode
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {"default"|"batch"|"lookup"} [props.variant] — override header color (radar batch)
 */
const RfidDialog = ({ mode = "bulk-import", ...props }) => {
  switch (mode) {
    case "radar":
      return <RfidDialogRadar {...props} />;
    case "lookup":
      return <RfidDialogLookup {...props} />;
    case "bulk-import":
    default:
      return <RfidDialogBulkImport {...props} />;
  }
};

export default RfidDialog;
