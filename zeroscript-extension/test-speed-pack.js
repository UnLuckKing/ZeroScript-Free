// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-speed-pack.js"), "utf8");
const fixes = fs.readFileSync(path.join(__dirname, "background-speed-fixes.js"), "utf8");
const stored = {};
const listeners = [];
const context = {
  console,
  Date,
  Set,
  Map,
  String,
  Promise,
  URL,
  setTimeout,
  clearTimeout,
  zsSuite: { qualityMode: "auto" },
  teamConfig: { maxRepairRounds: 2 },
  zsSuitePublic: () => ({}),
  zsHubApplyConfig: async () => {},
  zsSuitePersist: async () => {},
  broadcastTeam: () => {},
  phasesForGoal: (goal) => {
    const text = String(goal).toLowerCase();
    return ["analyst", "builder", ...(text.includes("map") ? ["map"] : []), ...(text.includes("ui") ? ["ui"] : []), "reviewer", "qa"];
  },
  zsManager: { plan: null },
  zsSuiteLedger: () => {},
  phasePrompt: () => "core prompt",
  ensureStudioReadyForTask: async () => ({ ok: true }),
  connected: true,
  mcpAlive: true,
  studioConnected: true,
  hasRobloxTool: () => true,
  projectAudit: { status: "ready", report: "PREFLIGHT_OK:{}", scannedAt: Date.now() },
  teamTask: null,
  taskStarting: false,
  teamHistory: [],
  writerLease: null,
  teamObj: () => ({}),
  createCheckpoint: async (id) => ({ ok: true, id }),
  scanAndPersistProject: async () => ({ ok: true, audit: context.projectAudit }),
  dispatchTask: async () => ({ ok: true }),
  teamAgents: new Map(),
  zsSuitePrepareProvider: async (provider) => ({ provider, opened: true }),
  zsStudioPanelHandleAction: async () => ({ ok: true }),
  chrome: {
    storage: {
      local: {
        set: async (value) => Object.assign(stored, value),
      },
    },
    tabs: {
      query: (_query, callback) => callback([]),
      sendMessage: (_id, _message, callback) => callback(null),
      update: () => Promise.resolve(),
    },
    runtime: {
      lastError: null,
      onMessage: { addListener: (listener) => listeners.push(listener) },
    },
  },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "background-speed-pack.js" });
vm.runInContext(fixes, context, { filename: "background-speed-fixes.js" });

(async () => {
  let info = context.zsSpeedGoalInfo("fix the coin text formatting", "auto");
  assert.strictEqual(info.effective, "turbo");

  info = context.zsSpeedGoalInfo("Run the Release Manager for the complete project", "auto");
  assert.strictEqual(info.effective, "best");

  info = context.zsSpeedGoalInfo("oyunu komple tamamla", "auto");
  assert.strictEqual(info.effective, "best", "short broad goals must not be mistaken for tiny fixes");

  info = context.zsSpeedGoalInfo("fix DataStore saving", "turbo");
  assert.strictEqual(info.effective, "balanced", "unsafe Turbo work must auto-escalate");

  context.zsSuite.qualityMode = "auto";
  let phases = context.phasesForGoal("fix one UI button");
  assert.deepStrictEqual(Array.from(phases), ["ui"]);

  phases = context.phasesForGoal("audit DataStore security and purchases");
  assert.ok(phases.includes("reviewer"));
  assert.ok(phases.includes("qa"));

  context.zsSuite.qualityMode = "turbo";
  phases = context.phasesForGoal("fix one script typo");
  assert.deepStrictEqual(Array.from(phases), ["builder"]);

  const prompt = context.phasePrompt({ id: "t1", goal: "fix typo", phase: "builder", performanceMode: "turbo", lastReport: "" });
  assert.match(prompt, /TEST_EVIDENCE/);
  assert.match(prompt, /OUTPUT_ERRORS/);

  assert.ok(listeners.length >= 1, "direct config compatibility listener should be registered");
  listeners.forEach((listener) => listener({ type: "suite_set_config", qualityMode: "turbo" }));
  assert.strictEqual(context.zsSuite.qualityMode, "turbo");

  console.log("speed pack tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
