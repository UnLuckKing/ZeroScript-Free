// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-productivity-pack.js"), "utf8");
const fixes = fs.readFileSync(path.join(__dirname, "background-productivity-fixes.js"), "utf8");
const stored = {};
let sends = 0;
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
  setTimeout: () => 1,
  setInterval: () => 1,
  zsSuite: { qualityMode: "auto" },
  teamTask: null,
  teamHistory: [],
  teamAgents: new Map(),
  providerHealth: {},
  writerLease: null,
  projectAudit: { status: "ready", report: "PREFLIGHT_OK:{}", scannedAt: Date.now() },
  checkpointState: { latest: null, status: "idle", detail: "" },
  connected: true,
  studioConnected: true,
  robloxTool: () => ({ name: "get_console_output" }),
  send: async () => { sends += 1; return { ok: true, text: "clean" }; },
  broadcastTeam: () => {},
  startTeamTask: async () => ({ ok: true }),
  dispatchTask: async () => ({ ok: true }),
  createCheckpoint: async (id) => ({ ok: true, id }),
  restoreCheckpoint: async () => ({ ok: true }),
  phasePrompt: () => "core prompt",
  zsStudioPanelHandleAction: async () => {},
  zsSuiteLedger: () => {},
  teamObj: () => ({}),
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
vm.runInContext(source, context, { filename: "background-productivity-pack.js" });
vm.runInContext(fixes, context, { filename: "background-productivity-fixes.js" });

(async () => {
  const high = context.zsQueueAdd("high priority task", { priority: "high", qualityMode: "fast" });
  const low = context.zsQueueAdd("low priority task", { priority: "low", qualityMode: "turbo" });
  assert.strictEqual(high.priority, 3);
  assert.strictEqual(low.priority, 1);
  assert.strictEqual(vm.runInContext("zsProductivity.queue[0].id", context), high.id, "high priority task must sort first");

  assert.match(context.zsProductivityWorkflowGoal("datastore_lab"), /DataStore reliability lab/);
  assert.match(context.zsProductivityWorkflowGoal("marketplace_scan"), /backdoors/);

  context.teamTask = {
    id: "task-1",
    goal: "fix one UI button",
    phases: ["ui", "qa"],
    phaseIndex: 0,
    phase: "ui",
    status: "running",
    performanceMode: "fast",
    createdAt: Date.now() - 1000,
  };
  const progress = context.zsProductivityProgress();
  assert.ok(progress.percent > 0 && progress.percent < 100);

  const prompt = context.phasePrompt(context.teamTask);
  assert.match(prompt, /REQUIRED FINISH/);
  assert.match(prompt, /OUTPUT_ERRORS/);

  const services = Array.from(context.zsScopedCheckpointServices("fix the mobile UI button"));
  assert.deepStrictEqual(services, ["StarterGui", "StarterPlayer"]);

  vm.runInContext(`zsProductivity.projectIndex={status:"ready",builtAt:1,error:"",report:{counts:{scripts:99},scripts:Array.from({length:30},(_,i)=>({path:"S"+i})),remotes:[],guis:[]}}`, context);
  const publicState = context.zsProductivityPublic();
  assert.strictEqual(publicState.projectIndex.counts.scripts, 99);
  assert.strictEqual(publicState.projectIndex.samples.scripts.length, 12, "Hub sync must stay compact");

  context.writerLease = { provider: "gemini" };
  const skipped = await context.zsOutputWatchTick();
  assert.strictEqual(skipped.reason, "writer_busy");
  assert.strictEqual(sends, 0, "background Output polling must not compete with an active Studio writer");
  context.writerLease = null;
  await context.zsOutputWatchTick();
  assert.strictEqual(sends, 1);

  console.log("productivity pack tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
