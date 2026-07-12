// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-easy-pack.js"), "utf8");
const queued = [];
let counter = 0;
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
  chrome: { storage: { local: { get: (_key, cb) => cb({}), set: async () => {} } } },
  broadcastTeam: () => {},
  teamObj: () => ({}),
  zsStudioPanelStatusPayload: () => ({}),
  zsStudioPanelHandleAction: async () => {},
  zsAutomationNotice: () => {},
  zsProductivity: { queueRunning: true, completedQueueIds: [] },
  zsProductivityPersist: async () => {},
  zsQueueStartNext: async () => true,
  zsQueueAdd: (goal, options) => {
    const item = { id: `q-${++counter}`, goal, ...options };
    queued.push(item);
    return item;
  },
  setTimeout: () => 1,
  setInterval: () => 1,
};
vm.createContext(context);
vm.runInContext(source, context, { filename: "background-easy-pack.js" });

(async () => {
  const prototype = await context.zsEasyCreateBlueprint({
    idea: "A simple aura RNG game",
    genre: "RNG / Aura",
    target: "Hızlı prototip",
    device: "Masaüstü + mobil",
    autoStart: true,
  });
  assert.strictEqual(prototype.stages.length, 4);
  assert.strictEqual(queued[0].dependsOn.length, 0);
  assert.deepStrictEqual(queued[1].dependsOn, [queued[0].id]);
  assert.ok(queued[1].goal.includes("server-authoritative roll loop"));

  queued.length = 0;
  counter = 0;
  const premium = await context.zsEasyCreateBlueprint({
    idea: "A polished pet simulator",
    genre: "Pet Collection",
    target: "Premium kalite",
    device: "Mobil öncelikli",
    autoStart: false,
  });
  assert.strictEqual(premium.stages.length, 8);
  assert.strictEqual(context.zsProductivity.queueRunning, false);
  assert.ok(queued.some((item) => item.goal.includes("Independent quality jury")));
  assert.ok(queued.some((item) => item.goal.includes("premium pet inventory")));

  const publicState = context.zsEasyPublic();
  assert.strictEqual(publicState.activeBlueprint.id, premium.id);
  console.log("easy pack tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
