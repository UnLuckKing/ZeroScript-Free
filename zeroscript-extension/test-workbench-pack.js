// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-workbench-pack.js"), "utf8");
const listeners = [];
const context = {
  console, Date, Math, JSON, String, Number, Object, Array, Set, Map, Promise, Error,
  setTimeout: () => 1,
  setInterval: () => 1,
  chrome: {
    storage: { local: { get: (_k, cb) => cb({}), set: async () => {}, remove: async () => {} } },
    tabs: { query: async () => [], sendMessage: async () => {} },
    runtime: { onMessage: { addListener: (fn) => listeners.push(fn) } },
  },
  teamAgents: new Map([["a", { provider: "chatgpt", ready: true }]]),
  providerHealth: {},
  teamTask: null,
  teamHistory: [],
  writerLease: null,
  pendingApprovals: [],
  taskStarting: false,
  zsSolo: { selectedProvider: "" },
  phasesForGoal: () => ["analyst", "builder", "reviewer", "qa"],
  teamObj: () => ({}),
  zsStudioPanelStatusPayload: () => ({}),
  zsStudioPanelHandleAction: async () => {},
  zsEasyHardReset: async () => ({ ok: true }),
  startTeamTask: async () => ({ ok: true }),
  broadcastTeam: () => {},
  zsHubSuggestedProvider: () => "chatgpt",
  zsSuitePrepareProvider: async () => {},
};
vm.createContext(context);
vm.runInContext(source, context, { filename: "background-workbench-pack.js" });

const prompt = context.zsWorkbenchGoal("Fix the RNG UI");
assert.ok(prompt.includes("ONE-PASS BUILD"));
assert.ok(prompt.includes("do not stop after explaining or planning"));
assert.ok(prompt.includes("Do not create a separate reviewer task"));
assert.deepStrictEqual(Array.from(context.phasesForGoal(prompt)), ["builder"]);
assert.deepStrictEqual(Array.from(context.phasesForGoal("normal task")), ["analyst", "builder", "reviewer", "qa"]);
assert.strictEqual(context.zsWorkbenchReadyProviders()[0], "chatgpt");
assert.ok(listeners.length >= 1);

console.log("workbench pack tests passed");
