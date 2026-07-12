#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const ROOT = __dirname;

function makeEvent() {
  const listeners = [];
  return {
    listeners,
    addListener(fn) { listeners.push(fn); },
  };
}

async function testBackgroundSuite() {
  const runtimeMessage = makeEvent();
  const storageChanged = makeEvent();
  const storage = {};
  const notifications = [];

  const chrome = {
    runtime: {
      getManifest: () => ({ version: "1.24.0", name: "ZeroScript Test" }),
      onMessage: runtimeMessage,
    },
    storage: {
      local: {
        get(keys, callback) { callback({}); },
        set(value) { Object.assign(storage, value); return Promise.resolve(); },
      },
      onChanged: storageChanged,
    },
    tabs: {
      query(query, callback) { callback([]); },
      create(options, callback) {
        const tab = { id: 99, url: options.url, title: "test" };
        if (callback) callback(tab);
        return Promise.resolve(tab);
      },
      sendMessage(tabId, message, callback) {
        if (callback) callback({ ok: true, provider: "chatgpt", composer: true, ready: false });
      },
    },
    notifications: {
      create(id, payload) { notifications.push({ id, payload }); },
    },
  };

  const sandbox = {
    console,
    chrome,
    URL,
    Date,
    Promise,
    JSON,
    Math,
    Set,
    Map,
    Object,
    String,
    Number,
    Array,
    RegExp,
    Error,
    setTimeout() { return 0; },
    setInterval() { return 0; },
    clearTimeout() {},
    teamTask: null,
    teamConfig: { smartRouting: true, maxRepairRounds: 2 },
    teamAgents: new Map(),
    providerHealth: {},
    writerLease: null,
    zsManager: { regression: [] },
    teamObj: () => ({ config: {} }),
    statusObj: () => ({ connected: true }),
    phasesForGoal: () => ["analyst", "builder", "reviewer", "qa"],
    dispatchTask: async () => ({ ok: true }),
    broadcastTeam() {},
    zsUniquePush(target, values) { return [...(target || []), ...(values || [])]; },
    zsTimeline() {},
    zsPersistManager: () => Promise.resolve(),
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "background-suite.js"), "utf8"), sandbox, { filename: "background-suite.js" });

  const publicTeam = sandbox.teamObj();
  assert.ok(publicTeam.controlSuite, "controlSuite must be exposed through teamObj");
  assert.equal(publicTeam.controlSuite.qualityMode, "balanced");

  const setConfig = runtimeMessage.listeners.find((listener) => {
    let responded = false;
    try {
      const result = listener({ type: "suite_set_config", qualityMode: "fast" }, {}, () => { responded = true; });
      return result === true || responded;
    } catch {
      return false;
    }
  });
  assert.ok(setConfig, "suite_set_config listener must be registered");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(sandbox.phasesForGoal("build one gameplay feature"), ["builder", "qa"]);

  sandbox.teamTask = { id: "task-1", status: "running", phase: "ui", provider: "gemini", goal: "fix UI" };
  await sandbox.dispatchTask();
  const afterDispatch = sandbox.teamObj().controlSuite;
  assert.equal(afterDispatch.runtime.state, "running");
  assert.equal(afterDispatch.ownership.claims.StarterGui.provider, "gemini");
}

async function testPermissionGuard() {
  const storageChanged = makeEvent();
  let forwarded = 0;
  const storage = {};
  const chrome = {
    runtime: {
      sendMessage(message, callback) {
        forwarded += 1;
        if (callback) callback({ ok: true });
      },
    },
    storage: {
      local: {
        get(keys, callback) {
          callback({
            zsProviderPermissions: { default: "inspect", providers: {} },
            zsTeamConfig: { approvalMode: "autonomous" },
          });
        },
        set(value) { Object.assign(storage, value); return Promise.resolve(); },
      },
      onChanged: storageChanged,
    },
  };
  const sandbox = {
    console,
    chrome,
    Date,
    JSON,
    Object,
    String,
    Array,
    RegExp,
    Error,
    queueMicrotask,
    location: { hostname: "chatgpt.com" },
    ZSProvider: { id: "chatgpt" },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "core", "permission-guard.js"), "utf8"), sandbox, { filename: "permission-guard.js" });

  const blocked = await new Promise((resolve) => {
    sandbox.chrome.runtime.sendMessage(
      { type: "call_tool", name: "execute_luau", arguments: { code: "return 1" } },
      resolve,
    );
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /Inspect only/);
  assert.equal(forwarded, 0, "blocked write must not reach the original runtime sender");
  assert.ok(storage.zsRiskLastAssessment, "risk assessment should be persisted");

  const allowed = await new Promise((resolve) => {
    sandbox.chrome.runtime.sendMessage(
      { type: "call_tool", name: "get_studio_state", arguments: {} },
      resolve,
    );
  });
  assert.equal(allowed.ok, true);
  assert.equal(forwarded, 1, "read tools should pass through inspect-only scope");
}

(async () => {
  await testBackgroundSuite();
  await testPermissionGuard();
  console.log("ZeroScript Control Suite smoke tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
