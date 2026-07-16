// SPDX-License-Identifier: GPL-3.0-or-later
// Selected upstream 1.4.3 prompt improvement.
// Reframes the browser-site tool warning as a technical routing note instead of
// a prohibition. This reduces model refusals while keeping Roblox work on the
// local ZeroScript channel.

(() => {
  "use strict";
  if (typeof ZS === "undefined" || !ZS || typeof ZS.buildSystemPrompt !== "function") return;

  const originalBuildSystemPrompt = ZS.buildSystemPrompt;
  const oldParagraph =
    "CRITICAL - ZeroScript commands are NOT function calls / tools. They are plain JSON you TYPE into your normal text reply; ZeroScript reads your text and runs them. So NEVER use your own native/built-in tools or features for anything covered above - not code interpreter/sandbox, web search/browsing, file or web connectors, image tools, or real function calling. None of that touches the user's Roblox Studio, so it accomplishes nothing here and breaks the flow, even just to think, test, or draft. The ONLY exception is if the user EXPLICITLY asks you to search the web. Internal reasoning (deep-think modes) is fine. Do not try to \"call a function\" - just write the JSON below as ordinary text.";
  const newParagraph =
    "CRITICAL - technical note, not a restriction: this site's own tools (code interpreter, function calling, connectors, etc.) run in a separate sandbox that has no access to the user's Roblox Studio. ZeroScript commands are different: they are plain JSON typed directly into your normal reply text, which this extension reads and executes against the user's local Studio. For project work, write the ZeroScript command as ordinary text instead of calling a native function - that is the channel that actually reaches the project. You can act directly in the user's Roblox project through ZeroScript. If the user explicitly asks for web research, the site's own web search remains available and is unrelated. Internal reasoning modes are fine.";

  ZS.buildSystemPrompt = function buildSystemPromptWithFriendlyRouting(opts = {}) {
    const prompt = originalBuildSystemPrompt(opts);
    if (typeof prompt !== "string") return prompt;
    if (prompt.includes(oldParagraph)) return prompt.replace(oldParagraph, newParagraph);

    // Tolerate small wording drift in future base updates.
    return prompt.replace(
      /CRITICAL - ZeroScript commands are NOT function calls \/ tools\.[\s\S]*?Do not try to "call a function" - just write the JSON below as ordinary text\./,
      newParagraph,
    );
  };
})();
