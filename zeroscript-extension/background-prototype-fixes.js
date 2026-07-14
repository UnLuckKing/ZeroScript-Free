// SPDX-License-Identifier: GPL-3.0-or-later
// Small reliability fixes layered after the Prototype Accelerator.

const zsPrototypeCoreInstallerCode = zsRngInstallerCode;
zsRngInstallerCode = function zsPrototypeFixedInstallerCode(config) {
  return zsPrototypeCoreInstallerCode(config)
    // Roblox cylinders use the X axis as thickness before the Z rotation.
    .replace('Vector3.new(120,5,120)', 'Vector3.new(5,120,120)')
    .replace('Vector3.new(122,1.2,122)', 'Vector3.new(1.2,122,122)')
    .replace('Vector3.new(18,2,18)', 'Vector3.new(2,18,18)');
};

// Launch mode remains visibly active while the single AI polish pass owns the
// task, then mirrors its terminal state back into the prototype card.
setInterval(() => {
  if (!zsPrototype || zsPrototype.mode !== "launch" || zsPrototype.state !== "polishing") return;
  if (!teamTask || !teamTask.workbench) return;
  if (teamTask.status === "done") {
    zsPrototype.state = "done";
    zsPrototype.finishedAt = Date.now();
    zsPrototypeAdd("done", "Launch Day tamamlandı", "Golden Template kuruldu ve tek AI polish geçişi bitti");
  } else if (["failed", "cancelled"].includes(teamTask.status)) {
    zsPrototype.state = "error";
    zsPrototype.finishedAt = Date.now();
    zsPrototype.lastError = String(teamTask.error || "Launch polish tamamlanamadı.");
    zsPrototypeAdd("error", "Launch polish tamamlanamadı", zsPrototype.lastError);
  }
}, 1500);
