// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "providers/browser-chat-init-fix.js"), "utf8");
const queued = [];
let originalInitCalls = 0;
let diagCalls = 0;

const context = {
  console,
  setTimeout: (fn) => { queued.push(fn); return queued.length; },
  ZSProvider: {
    init({ diag }) {
      originalInitCalls += 1;
      diag("provider.experimental", { id: "chatgpt" });
    },
  },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "browser-chat-init-fix.js" });
context.ZSProvider.init({ diag: () => { diagCalls += 1; } });

assert.strictEqual(originalInitCalls, 1, "provider init must stay synchronous");
assert.strictEqual(diagCalls, 0, "diagnostic callback must not run before main runtime state exists");
assert.strictEqual(queued.length, 1, "diagnostic callback should be queued once");
queued.shift()();
assert.strictEqual(diagCalls, 1, "queued diagnostic should run after initialization stack finishes");

console.log("browser chat init fix tests passed");
