// SPDX-License-Identifier: GPL-3.0-or-later
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const promptFix = fs.readFileSync(path.join(root, "core", "upstream-prompt-fixes.js"), "utf8");
const qwenFix = fs.readFileSync(path.join(root, "providers", "qwen-release-fixes.js"), "utf8");

assert.strictEqual(manifest.version, "1.36.0");
const allScripts = manifest.content_scripts.flatMap((entry) => entry.js || []);
assert.ok(allScripts.includes("core/upstream-prompt-fixes.js"));
assert.ok(allScripts.includes("providers/qwen-release-fixes.js"));
assert.ok(promptFix.includes("technical note, not a restriction"));
assert.ok(qwenFix.includes("chat-response-message-"));
assert.ok(qwenFix.includes("131072"));
assert.ok(!manifest.host_permissions.some((value) => /meta\.ai/.test(value)), "Meta AI should stay excluded from the simplified product");

console.log("upstream sync tests passed");
