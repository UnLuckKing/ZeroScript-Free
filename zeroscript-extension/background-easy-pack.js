// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.31 beginner-first game blueprint builder.

const ZS_EASY_KEY = "zsEasyState";
let zsEasy = {
  version: 1,
  activeBlueprint: null,
  lastBlueprint: null,
  updatedAt: Date.now(),
};

chrome.storage.local.get(ZS_EASY_KEY, (result) => {
  const saved = result && result[ZS_EASY_KEY];
  if (saved && typeof saved === "object") zsEasy = { ...zsEasy, ...saved };
  broadcastTeam();
});

function zsEasyPersist() {
  zsEasy.updatedAt = Date.now();
  return chrome.storage.local.set({ [ZS_EASY_KEY]: zsEasy });
}

function zsEasySlug(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function zsEasyTarget(target) {
  const text = String(target || "").toLowerCase();
  if (/premium/.test(text)) return "premium";
  if (/prototip|prototype|hızlı/.test(text)) return "prototype";
  return "publishable";
}

function zsEasyGenre(genre) {
  const text = String(genre || "").toLowerCase();
  if (/rng|aura/.test(text)) return "rng";
  if (/simulator/.test(text)) return "simulator";
  if (/clicker|incremental/.test(text)) return "clicker";
  if (/tycoon/.test(text)) return "tycoon";
  if (/obby/.test(text)) return "obby";
  if (/pet/.test(text)) return "pet";
  return "custom";
}

const ZS_EASY_GENRE_RULES = {
  rng: {
    loop: "Build or improve a server-authoritative roll loop with clear rarity reveal, inventory/equip, pity, luck and duplicate handling.",
    progression: "Balance luck upgrades, roll speed, pity targets, discovery goals, rebirth/prestige and world or content unlocks from actual configs.",
    ui: "Create a premium compact RNG HUD, reveal card, result feed, inventory, discovery and upgrade navigation with mobile-safe controls.",
  },
  simulator: {
    loop: "Build or improve the collect/click → capacity → sell/convert → upgrade loop with clear server authority and satisfying feedback.",
    progression: "Balance tools, capacity, zones, upgrades, companions and rebirth milestones with measurable time-to-upgrade targets.",
    ui: "Create a premium simulator HUD, upgrade/shop/inventory navigation and clear currency feedback without covering gameplay.",
  },
  clicker: {
    loop: "Build or improve the click/tap → multiplier → automation → rebirth loop with anti-spam server validation.",
    progression: "Balance multipliers, auto income, upgrades, milestones, rebirths and offline-safe progression without exponential collapse.",
    ui: "Create a responsive tap target, readable number formatting, upgrade panels and progression feedback for desktop and mobile.",
  },
  tycoon: {
    loop: "Build or improve claim → earn → purchase button → unlock production/content loop with secure ownership checks.",
    progression: "Balance droppers, income, unlock order, reset/prestige and completion pacing from actual tycoon values.",
    ui: "Create clear ownership, income, next purchase and progress UI that remains secondary to the 3D tycoon.",
  },
  obby: {
    loop: "Build or improve checkpoint → obstacle → reward → next stage flow with reliable respawn and exploit-resistant completion.",
    progression: "Design a fair difficulty curve, checkpoint spacing, rewards, optional challenges and return goals without frustrating resets.",
    ui: "Create a minimal stage, timer, checkpoint and reward HUD with strong mobile readability and no obstructive overlays.",
  },
  pet: {
    loop: "Build or improve acquire → inventory → equip → follow/boost → upgrade/merge loop with server-owned pet data.",
    progression: "Balance eggs, rarity, capacity, equip slots, upgrades, worlds and duplicate value from actual economy configs.",
    ui: "Create a premium pet inventory, equip best, egg/shop and collection interface with efficient mobile interaction.",
  },
  custom: {
    loop: "Identify the real core action, reward and repeat loop from the current project or idea, then implement the smallest complete enjoyable version.",
    progression: "Create measurable short-, medium- and long-term goals using the project's actual systems and avoid unnecessary feature sprawl.",
    ui: "Create a consistent responsive interface based on the project's Design DNA and real gameplay hierarchy.",
  },
};

function zsEasyBaseContract(payload) {
  return `ORIGINAL GAME IDEA\n${String(payload.idea || "").trim()}\n\nGAME PROFILE\nGenre: ${payload.genre}\nQuality target: ${payload.target}\nDevice priority: ${payload.device}\n\nGLOBAL RULES\n- Inspect the actual open Roblox Studio project before changing anything.\n- Preserve working systems and public APIs.\n- Use server-authoritative validation for rewards, currencies, inventory, purchases and progression.\n- Keep scope focused; do not add features that do not strengthen the core loop.\n- Every stage must playtest its changed path, read Studio Output and return exact TEST_EVIDENCE.\n- Use the project Design DNA and Behavioral Contracts when available.\n- Do not claim completion when proof is missing.`;
}

function zsEasyStage(name, goal, payload, acceptance) {
  return {
    name,
    goal: `${goal}\n\n${zsEasyBaseContract(payload)}\n\nSTAGE ACCEPTANCE\n${acceptance.map((item) => `- ${item}`).join("\n")}`,
  };
}

function zsEasyBuildStages(payload) {
  const kind = zsEasyGenre(payload.genre);
  const target = zsEasyTarget(payload.target);
  const rules = ZS_EASY_GENRE_RULES[kind] || ZS_EASY_GENRE_RULES.custom;
  const stages = [
    zsEasyStage(
      "Project understanding",
      "Inspect the current project and idea. Build or refresh Project Genome, identify the real main loop, current systems, broken paths, duplicate/legacy systems, existing visual style and the shortest safe implementation plan. Make only tiny prerequisite fixes; return exact affected paths and a prioritized contract for later stages.",
      payload,
      ["Actual systems and dependencies are named", "Existing working features and do-not-touch paths are recorded", "The main loop and first-session goal are explicit", "No speculative full rewrite"],
    ),
    zsEasyStage(
      "Safe foundation",
      `Create or repair the minimum secure foundation required by the game idea. ${rules.loop}`,
      payload,
      ["Core action completes end to end", "Invalid client input cannot grant value", "Respawn does not break the loop", "Output is clean for the tested path"],
    ),
    zsEasyStage(
      "Progression and persistence",
      `${rules.progression} Inspect existing save/load code and safely complete persistence for only the systems used by this game.`,
      payload,
      ["First meaningful upgrade has a measurable target", "No negative, duplicate or overflow rewards", "Rejoin restores compatible state", "Failure handling avoids overwriting valid data"],
    ),
    zsEasyStage(
      "Professional UI and onboarding",
      `${rules.ui} Teach the first action without a long blocking tutorial. Apply the current Design DNA, responsive constraints and clear feedback states.`,
      payload,
      ["First action is obvious within the first session", "Desktop and mobile layouts pass", "Every reachable changed button works", "Loading, disabled, success and error states are visible"],
    ),
  ];

  if (target !== "prototype") {
    stages.push(
      zsEasyStage(
        "Retention and fair monetization",
        "Strengthen session goals, discovery, milestones, return hooks and optional monetization using the real game economy. Keep the core game enjoyable without payment. Secure gamepass and Developer Product flows when they exist; do not invent product IDs.",
        payload,
        ["A short-, medium- and return-session goal exists", "Purchases are server-authoritative and idempotent", "No paywall blocks the basic loop", "Economy values come from actual project data"],
      ),
      zsEasyStage(
        "Quality, performance and release proof",
        "Polish feedback, VFX/audio hooks, navigation and visual hierarchy without replacing good systems. Audit Output, remotes, DataStores, performance hotspots, respawn, mobile UI and the main gameplay loop. Fix verified blockers and produce a proof-based release report.",
        payload,
        ["Main loop passes after respawn", "Studio Output is clean or exact remaining blockers are listed", "Mobile and desktop evidence exists", "Security, data and purchase risks have explicit results"],
      ),
    );
  }

  if (target === "premium") {
    stages.splice(stages.length - 1, 0,
      zsEasyStage(
        "Content depth and delight",
        "Add or refine only high-value content that increases mastery, discovery or collection depth. Improve moment-to-moment feedback, reveal quality, VFX/audio timing and meaningful variation while respecting performance budgets.",
        payload,
        ["New content reinforces the existing loop", "Feedback is visible but not obstructive", "Mobile performance and readability remain acceptable", "No duplicate or placeholder systems remain"],
      ),
      zsEasyStage(
        "Independent quality jury",
        "Act as an independent product and Roblox engineering jury. Inspect the implemented experience, compare it with at least one safer or simpler alternative, fix verified high-impact issues, and issue an explicit verdict covering fun, clarity, visual consistency, security, persistence, performance and release confidence.",
        payload,
        ["A credible alternative is compared", "Remaining weaknesses are prioritized", "Claims cite actual playtest or inspection evidence", "Final verdict is explicit"],
      ),
    );
  }
  return stages;
}

async function zsEasyCreateBlueprint(payload) {
  const idea = String(payload.idea || "").trim();
  if (!idea) throw new Error("Game idea is empty.");
  const normalized = {
    idea: idea.slice(0, 5000),
    genre: String(payload.genre || "Custom"),
    target: String(payload.target || "Yayınlanabilir oyun"),
    device: String(payload.device || "Masaüstü + mobil"),
    autoStart: payload.autoStart !== false,
  };
  const stages = zsEasyBuildStages(normalized);
  const blueprintId = `blueprint-${Date.now()}-${zsEasySlug(normalized.genre).slice(0, 12) || "game"}`;
  const queueItems = [];
  let previousId = "";
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    const mode = index === 0 ? "auto" : (zsEasyTarget(normalized.target) === "prototype" ? "auto" : "best");
    const item = zsQueueAdd(
      `GAME BLUEPRINT ${blueprintId}\nSTAGE ${index + 1}/${stages.length}: ${stage.name}\n\n${stage.goal}`,
      {
        qualityMode: mode,
        priority: index === 0 ? "high" : "normal",
        dependsOn: previousId ? [previousId] : [],
        source: `easy_blueprint:${blueprintId}`,
      },
    );
    queueItems.push({ id: item.id, name: stage.name });
    previousId = item.id;
  }
  zsProductivity.queueRunning = normalized.autoStart;
  zsEasy.activeBlueprint = {
    id: blueprintId,
    ...normalized,
    status: normalized.autoStart ? "running" : "paused",
    stages: queueItems,
    createdAt: Date.now(),
  };
  zsEasy.lastBlueprint = zsEasy.activeBlueprint;
  await zsProductivityPersist();
  await zsEasyPersist();
  broadcastTeam();
  if (normalized.autoStart) setTimeout(() => zsQueueStartNext().catch(() => {}), 150);
  if (typeof zsAutomationNotice === "function") {
    zsAutomationNotice("blueprint", "Oyun geliştirme planı hazır", `${stages.length} bağımlı görev · ${normalized.genre} · ${normalized.target}`);
  }
  return zsEasy.activeBlueprint;
}

function zsEasyPublic() {
  const active = zsEasy.activeBlueprint;
  if (active) {
    const completed = new Set(zsProductivity.completedQueueIds || []);
    const count = (active.stages || []).filter((stage) => completed.has(stage.id)).length;
    active.completedStages = count;
    active.percent = Math.round(count / Math.max(1, active.stages.length) * 100);
    if (count >= active.stages.length) active.status = "done";
  }
  return {
    version: zsEasy.version,
    activeBlueprint: active,
    lastBlueprint: zsEasy.lastBlueprint,
    updatedAt: zsEasy.updatedAt,
  };
}

const zsEasyCoreTeamObj = teamObj;
teamObj = function zsTeamObjEasy() {
  return { ...zsEasyCoreTeamObj(), easy: zsEasyPublic() };
};

const zsEasyCoreStatusPayload = zsStudioPanelStatusPayload;
zsStudioPanelStatusPayload = function zsEasyStatusPayload() {
  const payload = zsEasyCoreStatusPayload();
  payload.easy = zsEasyPublic();
  return payload;
};

const zsEasyCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsEasyHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "build_game_blueprint") {
    await zsEasyCreateBlueprint(payload);
    return;
  }
  if (action === "blueprint_pause") {
    zsProductivity.queueRunning = false;
    if (zsEasy.activeBlueprint) zsEasy.activeBlueprint.status = "paused";
    await zsProductivityPersist(); await zsEasyPersist(); broadcastTeam(); return;
  }
  if (action === "blueprint_resume") {
    zsProductivity.queueRunning = true;
    if (zsEasy.activeBlueprint) zsEasy.activeBlueprint.status = "running";
    await zsProductivityPersist(); await zsEasyPersist(); broadcastTeam(); await zsQueueStartNext(); return;
  }
  return zsEasyCoreHubAction(item);
};

setInterval(() => {
  const active = zsEasy.activeBlueprint;
  if (!active) return;
  const before = `${active.status}:${active.completedStages || 0}`;
  zsEasyPublic();
  const after = `${active.status}:${active.completedStages || 0}`;
  if (before !== after) zsEasyPersist().catch(() => {});
}, 3000);
