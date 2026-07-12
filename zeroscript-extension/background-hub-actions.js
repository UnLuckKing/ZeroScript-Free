// SPDX-License-Identifier: GPL-3.0-or-later
// Convenience layer for the desktop Hub: a task can be submitted without first
// opening and preparing an AI tab manually.

const zsHubCoreHandleAction = zsStudioPanelHandleAction;

function zsHubSuggestedProvider(goal) {
  const text = String(goal || "").toLowerCase();
  const visual = /\b(ui|gui|hud|menu|panel|button|mobile|map|world|terrain|lighting|arayüz|harita)\b/.test(text);
  if (visual) return teamConfig.uiDesigner || teamConfig.mapDesigner || "gemini";
  return teamConfig.writer || "qwen";
}

zsStudioPanelHandleAction = async function zsHubHandleAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "start_task") {
    const ready = [...teamAgents.values()].some((agent) => agent && agent.ready);
    if (!ready && typeof zsSuitePrepareProvider === "function") {
      const provider = zsHubSuggestedProvider(payload.goal);
      try {
        await zsSuitePrepareProvider(provider);
      } catch (error) {
        if (typeof zsSuiteLedger === "function") {
          zsSuiteLedger("hub_prepare", `Provider preparation needs user attention: ${String(error && error.message || error)}`, { provider });
        }
      }
    }
  }
  return zsHubCoreHandleAction(item);
};
