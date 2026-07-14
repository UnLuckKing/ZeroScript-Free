// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-prototype-pack.js"), "utf8");
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
  Promise,
  setTimeout,
  clearTimeout,
  chrome: { storage: { local: { get: (_key, cb) => cb({}), set: async () => {} } } },
  teamObj: () => ({}),
  zsStudioPanelStatusPayload: () => ({}),
  zsStudioPanelHandleAction: async () => {},
  broadcastTeam: () => {},
  zsEasyHardReset: async () => {},
  ensureStudioReadyForTask: async () => ({ ok: true }),
  zsWorkbenchStart: async () => ({ ok: true, provider: "chatgpt" }),
  robloxTool: () => ({ name: "roblox/execute_luau" }),
  send: async () => ({ ok: true, text: "ZS_TEMPLATE_OK:{}" }),
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "background-prototype-pack.js" });

const config = context.zsPrototypeConfig("neon cyber aura rng oyunu", "prototype");
assert.strictEqual(config.template, "rng");
assert.strictEqual(config.theme, "neon");
assert.strictEqual(config.timeBudgetMinutes, 15);
assert.strictEqual(config.toolBudget, 2);
assert.strictEqual(config.auras.length, 8);
assert.strictEqual(config.auras[7].rarity, "Secret");

const launch = context.zsPrototypeConfig("fantastik büyü rng", "launch");
assert.strictEqual(launch.theme, "fantasy");
assert.strictEqual(launch.timeBudgetMinutes, 45);
assert.strictEqual(launch.toolBudget, 35);

const code = context.zsRngInstallerCode(config);
assert.ok(code.includes("ZeroScriptRNGServer"));
assert.ok(code.includes("ZeroScriptRNGClient"));
assert.ok(code.includes("ZeroScriptRNGWorld"));
assert.ok(code.includes("UpdateAsync"));
assert.ok(code.includes("OnServerInvoke"));
assert.ok(context.zsRngVerifyCode().includes("ZS_TEMPLATE_VERIFY"));

console.log("prototype accelerator tests passed");
