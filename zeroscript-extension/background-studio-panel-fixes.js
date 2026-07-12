// SPDX-License-Identifier: GPL-3.0-or-later
// Compatibility fix for the checkpoint message name used by the proven popup.

const zsStudioPanelHandleActionCore = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsStudioPanelHandleActionFixed(item) {
  const action = String(item && item.action || "").toLowerCase();
  if (action === "rollback") {
    zsStudioPanel.lastActionAt = Date.now();
    if (typeof zsSuiteLedger === "function") {
      zsSuiteLedger("studio_panel", "Studio requested action: rollback", { actionId: item && item.id });
    }
    return zsStudioPanelSendRuntime({ type: "team_checkpoint_restore" });
  }
  return zsStudioPanelHandleActionCore(item);
};
