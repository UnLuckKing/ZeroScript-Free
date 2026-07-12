// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-superior-pack.js"), "utf8");
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
  Error,
  connected: false,
  studioConnected: false,
  writerLease: null,
  teamTask: null,
  zsAutomation: { activeProject: null },
  zsProductivity: { outputWatch: { errors: [] } },
  chrome: {
    storage: {
      local: {
        get: (_key, callback) => callback({}),
        set: async () => {},
      },
    },
  },
  broadcastTeam: () => {},
  teamObj: () => ({}),
  zsStudioPanelStatusPayload: () => ({}),
  startTeamTask: async () => ({ ok: true }),
  phasePrompt: () => "base prompt",
  zsStudioPanelHandleAction: async () => {},
  setInterval: () => 1,
  setTimeout: () => 1,
  clearTimeout: () => {},
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "background-superior-pack.js" });

const critical = context.zsSuperiorCompileIntent("Refactor the full DataStore and ProcessReceipt purchase system");
assert.ok(["high", "critical"].includes(critical.risk.level));
assert.strictEqual(critical.shadowRequired, true);
assert.strictEqual(critical.juryRequired, true);
assert.strictEqual(critical.proof.requiresRejoin, true);
assert.strictEqual(critical.proof.requiresSecurityInputs, true);

const ui = context.zsSuperiorCompileIntent("Fix the mobile UI and every shop button");
assert.strictEqual(ui.category, "ui");
assert.strictEqual(ui.proof.requiresScreenshots, true);
assert.ok(context.zsSuperiorIntentBlock(ui).includes("BEHAVIORAL CONTRACT"));
assert.ok(context.zsSuperiorIntentBlock(ui).includes("PROOF CONTRACT"));

const status = context.zsSuperiorPublic();
assert.strictEqual(status.decisionMode, "deterministic-local-rules-plus-connected-ai");
assert.strictEqual(status.settings.proofGate, true);

console.log("superior pack tests passed");
