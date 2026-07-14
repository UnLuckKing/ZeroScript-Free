// SPDX-License-Identifier: GPL-3.0-or-later
// Final phase-count guard for the 1.32 Easy Mode blueprint.
// Each queued blueprint stage is already a complete pass, so it must not expand
// into Builder + QA again. This keeps a publishable game at exactly two model
// operations instead of two stages multiplied by two phases.

const zsSoloFixCorePhases = zsSoloPhases;
zsSoloPhases = function zsSoloBlueprintPhases(goal) {
  const text = String(goal || "");
  if (/GAME BLUEPRINT/i.test(text)) {
    return /Polish and verify|FINAL VERIFY/i.test(text) ? ["qa"] : ["builder"];
  }
  return zsSoloFixCorePhases(goal);
};
