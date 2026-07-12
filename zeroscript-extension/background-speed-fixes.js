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
  const code = /\b(script|code|server|client|backend|logic|remote|module|service|controller|luau|kod|sunucu|istemci|mantık)\b/i.test(lower);
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
      reason = "Scoped work can use only the relevant specialist(s) plus QA";
    }
  } else if (effective === "turbo" && (highRisk || broadBuild || (ui && map))) {
    effective = "balanced";
    reason = "Turbo was escalated because the task is broad, cross-domain, destructive, release-related, or affects security/data/purchases";
  } else if (effective === "fast" && highRisk) {
    effective = "balanced";
    reason = "Fast was escalated because security, data, purchases, destructive work, or release readiness needs an independent review";
  }

  return { requested: requestedMode || "balanced", effective, reason, highRisk, inspection, tiny, ui, map, code, release, broadBuild, checkedAt: Date.now() };
};

// Replace the first speed-pack phase reducer with a more targeted one. A pure
// UI fix no longer pays for an unrelated builder phase; the same applies to map
// work. Builder is retained whenever the goal explicitly includes code/logic.
phasesForGoal = function zsSpeedSafePhasesForGoal(goal) {
  // Use the full pre-quality plan. Calling the already-reduced Fast wrapper here
  // would make a later safety escalation unable to restore Analyst/Reviewer.
  const base = typeof zsSuiteCorePhasesForGoal === "function"
    ? zsSuiteCorePhasesForGoal(goal)
    : zsSpeedCorePhasesForGoal(goal);
  zsSpeedDecision = zsSpeedGoalInfo(goal, zsSuite.qualityMode);
  let phases = base;

  if (zsSpeedDecision.effective === "turbo") {
    if (zsSpeedDecision.inspection) phases = ["analyst"];
    else if (zsSpeedDecision.map && !zsSpeedDecision.ui && !zsSpeedDecision.code) phases = ["map"];
    else if (zsSpeedDecision.ui && !zsSpeedDecision.code) phases = ["ui"];
    else phases = ["builder"];
  } else if (zsSpeedDecision.effective === "fast") {
    if (zsSpeedDecision.inspection) {
      phases = ["analyst", "qa"];
    } else {
      const selected = [];
      if (zsSpeedDecision.code || (!zsSpeedDecision.ui && !zsSpeedDecision.map)) selected.push("builder");
      if (zsSpeedDecision.map) selected.push("map");
      if (zsSpeedDecision.ui) selected.push("ui");
      phases = [...new Set([...(selected.length ? selected : ["builder"]), "qa"])];
    }
  } else if (zsSpeedDecision.effective === "best") {
    phases = [...new Set(["analyst", ...base.filter((phase) => !["analyst", "reviewer", "qa"].includes(phase)), "reviewer", "qa"])];
  }

  if (typeof zsManager !== "undefined") zsManager.plan = zsSpeedPlanSteps(goal, phases);
  if (typeof zsSuiteLedger === "function") {
    zsSuiteLedger("speed_mode", `${zsSpeedDecision.requested} → ${zsSpeedDecision.effective}: ${zsSpeedDecision.reason}`, { phases });
  }
  return phases;
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
