// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const pack = fs.readFileSync(path.join(__dirname, "background-automation-pack.js"), "utf8");
const fixes = fs.readFileSync(path.join(__dirname, "background-automation-fixes.js"), "utf8");
const instanceFixes = fs.readFileSync(path.join(__dirname, "background-automation-instance-fixes.js"), "utf8");
let startCalls = 0;
let checkpointCalls = 0;
let toolCalls = 0;
let notifications = 0;
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
  zsManager: { stats: {}, memory: { changedPaths: [], verified: [], remaining: [], outputErrors: [] } },
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
  robloxTool: () => ({ name: "execute_luau" }),
  send: async (message) => {
    toolCalls += 1;
    const code = String(message && message.arguments && message.arguments.code || "");
    if (code.includes("INSTANCE_RESTORE")) return { ok: true, text: "INSTANCE_RESTORE_OK:1:skipped=0" };
    return { ok: true, text: "INSTANCE_BACKUP_OK:1:skipped=0" };
  },
  runConnectionDoctor: async () => ({ ok: true, rows: [] }),
  zsSuiteProbeProviders: async () => ({}),
  scanAndPersistProject: async () => ({}),
  zsBuildProjectIndex: async () => ({}),
  zsOutputWatchTick: async () => ({}),
  parseAuditWarnings: () => [],
  zsQueueAdd: (goal, options) => ({ id: `q-${Date.now()}`, goal, ...options }),
  zsQueueStartNext: async () => false,
  zsProductivityPersist: async () => {},
  createCheckpoint: async (id) => { checkpointCalls += 1; return { ok: true, id }; },
  restoreCheckpoint: async (id) => ({ ok: true, id }),
  phasePrompt: () => "core prompt",
  zsStudioPanelHandleAction: async (item) => {
    if (item.action === "start_task") {
      startCalls += 1;
      return context.startTeamTask(item.payload.goal);
    }
    return { ok: true };
  },
  zsStudioPanelStatusPayload: () => ({ ok: true }),
  zsStudioPanelBroadcastStop: async () => {},
  startTeamTask: async (goal) => ({ ok: true, goal }),
  dispatchTask: async () => ({ ok: true }),
  chrome: {
    storage: {
      local: {
        get: (_key, callback) => callback({}),
        set: async () => {},
      },
    },
    runtime: { getURL: (value) => value },
    notifications: {
      create: async () => { notifications += 1; },
    },
  },
};

vm.createContext(context);
vm.runInContext(pack, context, { filename: "background-automation-pack.js" });
vm.runInContext(fixes, context, { filename: "background-automation-fixes.js" });
vm.runInContext(instanceFixes, context, { filename: "background-automation-instance-fixes.js" });

(async () => {
  vm.runInContext("zsAutomation.settings.autoDecomposeBroadTasks = true", context);
  const response = await context.zsStudioPanelHandleAction({
    action: "start_task",
    payload: { goal: "complete the entire shop UI and security system" },
  });
  assert.strictEqual(startCalls, 1, "automatic planning must still start the original Hub task");
  assert.strictEqual(response.goal, "complete the entire shop UI and security system");
  assert.strictEqual(vm.runInContext("zsAutomation.plans.at(-1).status", context), "attached_to_task");

  context.teamTask = { goal: "fix one server script typo", performanceMode: "turbo" };
  toolCalls = 0;
  const checkpoint = await context.createCheckpoint("cp-code");
  assert.strictEqual(checkpoint.ok, true);
  assert.strictEqual(checkpointCalls, 1);
  assert.strictEqual(toolCalls, 0, "script-only work must skip expensive instance cloning");

  context.teamTask = { goal: "fix the mobile UI", performanceMode: "turbo" };
  await context.createCheckpoint("cp-ui");
  assert.ok(toolCalls >= 1, "UI work should attach an instance-level backup");
  assert.strictEqual(vm.runInContext("zsAutomation.instanceBackup.status", context), "saved");

  vm.runInContext("zsAutomationNotice('task', 'Completed', 'done', 'success')", context);
  await Promise.resolve();
  assert.strictEqual(notifications, 1, "important notices should reach browser notifications");

  console.log("automation safeguard tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
