// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "background-learning-sync.js"), "utf8");
const context = {
  Date,
  String,
  Number,
  Array,
  teamTask: {
    id: "task-1",
    status: "done",
    provider: "gemini",
    phase: "qa",
    updatedAt: 123,
  },
  zsManager: {
    memory: {
      verified: ["desktop pass", "mobile pass"],
      changedPaths: ["StarterGui.MainGui"],
      remaining: [],
      outputErrors: [],
      reports: [{
        phase: "qa",
        provider: "gemini",
        verdict: "PASS",
        verified: ["mobile pass"],
        changes: ["updated UI"],
        remaining: [],
        paths: ["StarterGui.MainGui"],
        outputErrors: [],
        testEvidence: "button flow passed",
        summary: "all good",
        at: 100,
      }],
    },
    regression: ["open and close inventory"],
    diff: { changed: ["StarterGui.MainGui"] },
    stats: { gemini: { attempts: 2, completed: 2 } },
    release: { score: 90 },
  },
  zsAutomation: { activeProject: { placeId: 1, gameId: 2, name: "Test", key: "1:2" } },
  zsStudioPanelStatusPayload: () => ({ ok: true }),
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "background-learning-sync.js" });
const payload = context.zsStudioPanelStatusPayload();
assert.ok(payload.learningSnapshot);
assert.strictEqual(payload.learningSnapshot.taskId, "task-1");
assert.strictEqual(payload.learningSnapshot.memory.verified.length, 2);
assert.strictEqual(payload.learningSnapshot.memory.reports[0].testEvidence, "button flow passed");
assert.strictEqual(payload.learningSnapshot.project.key, "1:2");
console.log("learning sync tests passed");
