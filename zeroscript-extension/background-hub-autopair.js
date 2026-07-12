// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript Hub opens a short localhost pairing window. The service worker can
// claim it automatically, removing token copy/paste and usually removing the
// need to open the extension popup during first setup.

let zsHubPairBusy = false;

async function zsHubTryAutoPair() {
  if (zsHubPairBusy || String(zsStudioPanel.token || "").trim()) return false;
  zsHubPairBusy = true;
  try {
    const response = await fetch("http://127.0.0.1:17614/pair", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok || !data.token) return false;
    zsStudioPanel = {
      ...zsStudioPanel,
      enabled: true,
      url: String(data.url || "http://127.0.0.1:17614").replace(/\/+$/, ""),
      token: String(data.token).trim(),
      connected: false,
      lastError: "Paired with ZeroScript Hub; waiting for sync",
    };
    await zsStudioPanelPersist();
    broadcastTeam();
    await zsStudioPanelSync();
    return true;
  } catch {
    return false;
  } finally {
    zsHubPairBusy = false;
  }
}

setTimeout(() => zsHubTryAutoPair().catch(() => {}), 800);
setInterval(() => zsHubTryAutoPair().catch(() => {}), 2500);
