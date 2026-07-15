// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-chatgpt-max.js"), "utf8");
const listeners = [];
const context = {
  console,
  Date,
  Math,
  JSON,
  String,
  Number,
  Object,
  Array,
  RegExp,
  Set,
  Map,
  Promise,
  setInterval: () => 1,
  setTimeout: () => 1,
  teamAgents: new Map([[1, { provider: "qwen", ready: true }], [2, { provider: "chatgpt", ready: true }]]),
  providerHealth: {},
  teamTask: null,
  writerLease: null,
  broadcastTeam: () => {},
  phaseProvider: () => "qwen",
  phasePrompt: () => "base prompt",
  teamObj: () => ({}),
  zsStudioPanelStatusPayload: () => ({}),
  zsSoloProviderOrder: () => ["qwen", "deepseek", "chatgpt"],
  zsWorkbenchReadyProviders: () => ["qwen", "chatgpt"],
  zsWorkbenchGoal: (goal) => `BASE\n${goal}`,
  chrome: {
    storage: { local: { get: (_key, cb) => cb({}), set: async () => {} } },
    tabs: { query: async () => [], sendMessage: async () => ({}) },
    runtime: { onMessage: { addListener: (fn) => listeners.push(fn) } },
  },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "background-chatgpt-max.js" });

assert.strictEqual(context.zsSoloProviderOrder("fix UI")[0], "chatgpt", "ChatGPT should be first in Max mode");
assert.strictEqual(context.zsWorkbenchReadyProviders()[0], "chatgpt", "ready ChatGPT should be selected first");
const prompt = context.zsWorkbenchGoal("Build a responsive RNG UI");
assert.ok(prompt.includes("CHATGPT MAX EXECUTION CONTRACT"));
assert.ok(prompt.includes("PROJECT CAPSULE"));
assert.ok(prompt.includes("Do not delegate"));
assert.strictEqual(context.phaseProvider("builder"), "qwen", "non-workbench tasks keep normal routing");

context.teamTask = { workbench: true, originalGoal: "Build RNG", goal: "Build RNG", status: "running" };
assert.strictEqual(context.phaseProvider("builder"), "chatgpt", "workbench task should lock to ready ChatGPT");
const phase = context.phasePrompt(context.teamTask);
assert.ok(phase.includes("FAST PROOF"));
assert.ok(phase.includes("Detected:"));

console.log("chatgpt max tests passed");
