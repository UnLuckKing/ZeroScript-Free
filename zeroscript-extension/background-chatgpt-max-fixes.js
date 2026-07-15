// SPDX-License-Identifier: GPL-3.0-or-later
// Avoid repeating the full Max contract and Project Capsule twice in phase prompts.

const zsChatGPTMaxVerbosePhasePrompt = phasePrompt;
phasePrompt = function zsChatGPTMaxCompactPhasePrompt(task) {
  const value = zsChatGPTMaxVerbosePhasePrompt(task);
  if (!zsChatGPTMax.enabled || !task || !task.workbench) return value;
  const marker = "\n\nCHATGPT MAX EXECUTION CONTRACT";
  const first = value.indexOf(marker);
  const duplicate = first >= 0 ? value.indexOf(marker, first + marker.length) : -1;
  if (duplicate < 0) return value;
  const detected = [zsChatGPTMax.selectedModel, zsChatGPTMax.reasoning].filter(Boolean).join(" · ") || "model not detected";
  return `${value.slice(0, duplicate)}\n\nCHATGPT SESSION\nDetected: ${detected}\nUse the strongest reasoning level already selected in ChatGPT. Start tool work immediately and do not discuss model choice.`;
};
