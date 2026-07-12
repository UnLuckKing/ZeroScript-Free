// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-task-start-policy.js"), "utf8");
let coreDispatches = 0;
let saved = {
  id: "task-release",
  goal: "Run the Release Manager",
  status: "waiting",
  phase: "builder",
  provider: "gemini",
  error: "Extension restarted; press Retry to continue.",
};

const context = {
  console,
  Date,
  Set,
  String,
  Promise,
  setTimeout: (fn) => { fn(); return 1; },
  teamTask: { ...saved },
  dispatchTask: async () => { coreDispatches += 1; return { ok: true }; },
  broadcastTeam: () => {},
  zsSuiteTransition: () => {},
  chrome: {
    storage: {
      local: {
        get: (_key, callback) => callback({ zsTeamTask: { ...saved } }),
        set: async (value) => {
          if (value && value.zsTeamTask) saved = { ...value.zsTeamTask };
        },
      },
    },
  },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "background-task-start-policy.js" });

(async () => {
  const blocked = await context.dispatchTask();
  assert.strictEqual(blocked.paused, true, "restored task must be paused");
  assert.strictEqual(context.teamTask.status, "paused");
  assert.strictEqual(coreDispatches, 0, "provider readiness must not dispatch restored work");

  // This matches the existing explicit Retry handler: queued + cleared error.
  context.teamTask.status = "queued";
  context.teamTask.error = null;
  const resumed = await context.dispatchTask();
  assert.strictEqual(resumed.ok, true);
  assert.strictEqual(coreDispatches, 1, "explicit Retry must resume the task");
  assert.strictEqual(context.teamTask.autoResumeBlocked, undefined);

  console.log("task start policy tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
