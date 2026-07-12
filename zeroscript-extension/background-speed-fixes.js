// SPDX-License-Identifier: GPL-3.0-or-later
// Follow-up safeguards for the 1.26 speed pack.

zsSpeedGoalInfo = function zsSpeedGoalInfoSafe(goal, requestedMode) {
  const text = String(goal || "").trim();
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean).length;
  const release = /release manager|prepare.*release|production[- ]ready|publish|yayın|yayına|tüm proje|entire project|complete project|entire game|full game|oyunu komple|komple tamamla|her şeyi|sıfırdan oyun/i.test(lower);
  const security = /security|exploit|remoteevent|remotefunction|datastore|processreceipt|purchase|gamepass|developer product|currency|economy|dupe|güvenlik|veri kaybı|satın alma|ekonomi/i.test(lower);
  const destructive = /delete|remove all|replace entire|rewrite all|wipe|reset data|sil|hepsini kaldır|baştan yaz/i.test(lower);
  const inspection = /inspect only|audit only|without changing|do not change|sadece incele|değiştirmeden/i.test(lower);
  const ui = /\b(ui|gui|hud|menu|panel|button|mobile|responsive|text|label|inventory|shop|arayüz|buton|yazı)\b/i.test(lower);
  const map = /\b(map|world|terrain|lobby|lighting|spawn|zone|island|harita|dünya|ışıklandırma)\b/i.test(lower);
  const tinyHint = /\b(single|one|only|just|small|quick|fix|change|rename|küçük|tek|sadece|hızlı|düzelt|değiştir)\b/i.test(lower);
  const broadBuild = /build|create|complete|system|framework|full|entire|yap|oluştur|kur|sistem|tamamla|komple|baştan/i.test(lower);
  const tiny = !release && !security && !destructive && tinyHint && words <= 30 && !broadBuild;
  const highRisk = release || security || destructive;

  let effective = requestedMode || "balanced";
  let reason = `User selected ${effective}`;
  if (effective === "auto") {
    if (release) {
      effective = "best";
      reason = "Release or full-project work needs full review and QA";
    } else if (highRisk) {
      effective = "balanced";
      reason = "Security, data, purchase, or destructive work needs guarded review";
    } else if (tiny) {
      effective = "turbo";
      reason = "Small targeted fix can use one specialist with a mandatory self-test";
    } else if (ui && map) {
      effective = "balanced";
      reason = "Combined map and UI work needs coordinated phases";
    } else {
      effective = "fast";
      reason = "Scoped work can use the relevant specialist plus QA";
    }
  } else if (effective === "turbo" && highRisk) {
    effective = "balanced";
    reason = "Turbo was escalated because the task affects security, data, purchases, destructive changes, or release readiness";
  }

  return { requested: requestedMode || "balanced", effective, reason, highRisk, inspection, tiny, ui, map, release, checkedAt: Date.now() };
};

// The desktop Hub normally uses zsHubApplyConfig. Keep direct extension callers
// compatible with the two new modes as well.
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "suite_set_config") return;
  if (["auto", "turbo"].includes(msg.qualityMode)) {
    zsSuite.qualityMode = msg.qualityMode;
    teamConfig.maxRepairRounds = msg.qualityMode === "turbo" ? 0 : 2;
    chrome.storage.local.set({ zsTeamConfig: teamConfig }).catch(() => {});
    zsSuitePersist().catch(() => {});
  }
});
