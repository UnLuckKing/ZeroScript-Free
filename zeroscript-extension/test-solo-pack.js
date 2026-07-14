// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-solo-pack.js"), "utf8");
const context = {
  console,
  Date,
  Math,
  JSON,
  Set,
  Map,
  Promise,
  String,
  Number,
  Object,
  Array,
  RegExp,
  teamTask: null,
  teamAgents: new Map(),
  providerHealth: {},
  writerLease: null,
  phasesForGoal: () => ["analyst", "builder", "reviewer", "qa"],
  phaseProvider: () => "qwen",
  phasePrompt: () => "core prompt",
  agentFor: () => null,
  zsEasyTarget: (value) => /prototype/i.test(String(value)) ? "prototype" : "publishable",
  zsEasyBaseContract: (payload) => `IDEA ${payload.idea}`,
  zsEasyBuildStages: () => new Array(8).fill({}),
  zsSuperior: { settings: { modelJury: true, selfHealing: "auto_shadow", autoGenome: true } },
  zsSuperiorPersist: async () => {},
  zsSuperiorCompileIntent: (goal) => ({ goal, juryRequired: true, phases: ["analyst", "builder", "reviewer", "qa"], proof: {}, decisionTrace: [] }),
  zsStudioPanelHandleAction: async () => {},
  zsStudioPanelBroadcastStop: async () => {},
  zsSuiteLedger: () => {},
  broadcastTeam: () => {},
  dispatchTask: async () => ({ ok: true }),
  zsProductivityPersist: async () => {},
  zsAutomationNotice: () => {},
  chrome: { storage: { local: { get: (_key, callback) => callback({}), set: async () => {}, remove: async () => {} } } },
  setInterval: () => 1,
  setTimeout: () => 1,
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "background-solo-pack.js" });

assert.deepStrictEqual(Array.from(context.zsSoloPhases("Fix the inventory button")), ["ui"]);
assert.deepStrictEqual(Array.from(context.zsSoloPhases("Build a complete RNG game")), ["builder", "qa"]);
assert.deepStrictEqual(Array.from(context.zsSoloPhases("Fix a nil error")), ["builder"]);

const stages = context.zsEasyBuildStages({ idea: "RNG game", target: "Yayınlanabilir oyun" });
assert.strictEqual(stages.length, 2, "publishable games should use only two large jobs");
assert.ok(stages[0].goal.includes("main loop"));
assert.ok(stages[1].goal.includes("Polish and verify"));

const intent = context.zsSuperiorCompileIntent("Build a complete game");
assert.strictEqual(intent.juryRequired, false);
assert.deepStrictEqual(Array.from(intent.phases), ["builder", "qa"]);
assert.strictEqual(context.zsSuperior.settings.modelJury, false);

console.log("solo pack tests passed");
