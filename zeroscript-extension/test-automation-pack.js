// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-automation-pack.js"), "utf8");
const stored = {};
const queued = [];
const context = {
  console,
  Date,
  Math,
  JSON,
  Set,
  Map,
  String,
  Number,
  Promise,
  clearTimeout,
  setTimeout: () => 1,
  setInterval: () => 1,
  zsManager: {
    stats: {
      gemini: { attempts: 4, completed: 3, failed: 1, totalMs: 240000, repairsRequested: 1, toolErrors: 0, contextFailures: 0, phases: {}, lastAt: Date.now() },
      qwen: { attempts: 2, completed: 2, failed: 0, totalMs: 60000, repairsRequested: 0, toolErrors: 0, contextFailures: 0, phases: {}, lastAt: Date.now() },
    },
    memory: { changedPaths: [], verified: [], remaining: [], outputErrors: [] },
  },
  zsProductivity: { queueRunning: false, outputWatch: { errors: [] } },
  teamTask: null,
  teamHistory: [],
  teamAgents: new Map(),
  providerHealth: {},
  writerLease: null,
  checkpointState: { latest: "cp-1" },
  pending: new Map(),
  connected: true,
  studioConnected: true,
  zsSuite: { qualityMode: "auto" },
  broadcastTeam: () => {},
  teamObj: () => ({}),
  robloxTool: () => null,
  send: async () => ({ ok: false }),
  runConnectionDoctor: async () => ({ ok: true, rows: [] }),
  zsSuiteProbeProviders: async () => ({}),
  scanAndPersistProject: async () => ({}),
  zsBuildProjectIndex: async () => ({}),
  zsOutputWatchTick: async () => ({}),
  parseAuditWarnings: () => [],
  zsQueueAdd: (goal, options) => {
    const item = { id: `q-${queued.length + 1}`, goal, ...options };
    queued.push(item);
    return item;
  },
  zsQueueStartNext: async () => false,
  zsProductivityPersist: async () => {},
  createCheckpoint: async (id) => ({ ok: true, id }),
  restoreCheckpoint: async (id) => ({ ok: true, id }),
  phasePrompt: () => "core prompt",
  zsStudioPanelHandleAction: async () => {},
  zsStudioPanelStatusPayload: () => ({ ok: true }),
  zsStudioPanelBroadcastStop: async () => {},
  startTeamTask: async () => ({ ok: true }),
  dispatchTask: async () => ({ ok: true }),
  chrome: {
    storage: {
      local: {
        get: (_key, callback) => callback({}),
        set: async (value) => Object.assign(stored, value),
      },
    },
  },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "background-automation-pack.js" });

(async () => {
  const plan = vm.runInContext('zsAutomationBuildPlan("build a secure shop UI and map")', context);
  assert.ok(plan.steps.length >= 5, "broad cross-domain goal should be decomposed");
  assert.match(plan.steps[0].goal, /Inspect/);
  assert.ok(plan.steps.some((step) => /UI/.test(step.title)));
  assert.ok(plan.steps.some((step) => /world/.test(step.title)));

  vm.runInContext("zsAutomationQueuePlan(zsAutomationBuildPlan('fix inventory UI'))", context);
  assert.ok(queued.length >= 3);
  assert.deepStrictEqual(queued[0].dependsOn, []);
  assert.deepStrictEqual(queued[1].dependsOn, [queued[0].id]);

  const groups = vm.runInContext("zsAutomationGroupErrors([{line:'Inventory:142 attempt to index nil',at:1},{line:'Inventory:999 attempt to index nil',at:2}])", context);
  assert.strictEqual(groups.length, 1, "line-number variants should group together");
  assert.strictEqual(groups[0].count, 2);

  const providers = vm.runInContext("zsAutomationProviderTable()", context);
  assert.strictEqual(providers[0].provider, "qwen");
  assert.strictEqual(providers[0].successRate, 100);

  const scopes = vm.runInContext("zsAutomationScopes('fix the UI and map lighting')", context);
  assert.ok(scopes.includes("StarterGui"));
  assert.ok(scopes.includes("Workspace"));
  assert.ok(scopes.includes("Lighting"));

  const workflow = vm.runInContext("zsAutomationWorkflowGoal('remote_fuzzer')", context);
  assert.match(workflow, /wrong types/);
  assert.match(workflow, /server-authority/);

  await context.zsStudioPanelHandleAction({ action: "set_automation", payload: { settings: { taskTimeoutMinutes: 30, toolboxQuarantine: false } } });
  const timeout = vm.runInContext("zsAutomation.settings.taskTimeoutMinutes", context);
  const quarantine = vm.runInContext("zsAutomation.settings.toolboxQuarantine", context);
  assert.strictEqual(timeout, 30);
  assert.strictEqual(quarantine, false);

  console.log("automation pack tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
