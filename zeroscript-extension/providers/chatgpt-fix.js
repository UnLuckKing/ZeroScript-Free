// SPDX-License-Identifier: GPL-3.0-or-later
// ChatGPT-specific stability layer. ChatGPT frequently reconciles/replaces its
// composer subtree; inserting the ZeroScript bar into that React-owned tree can
// make the bar disappear. Keep the bar in ZeroScript's own fixed layer and use
// broader semantic selectors for the current composer controls.

(() => {
  "use strict";
  if (location.hostname.replace(/^www\./, "") !== "chatgpt.com") return;
  if (typeof ZSProvider === "undefined" || !ZSProvider) return;

  let inputLocked = false;

  function visible(element) {
    if (!element || !element.isConnected || element.closest("#zs-root")) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function editorCandidates() {
    const selectors = [
      "#prompt-textarea",
      '[data-testid="composer-text-input"]',
      'div.ProseMirror[contenteditable="true"]',
      'div.ProseMirror[contenteditable="false"]',
      'main form div[contenteditable="true"]',
      'main form div[contenteditable="false"]',
      'textarea[data-id="root"]',
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Mesaj" i]',
    ];
    const found = [];
    for (const selector of selectors) {
      try {
        for (const element of document.querySelectorAll(selector)) {
          if (visible(element) && !found.includes(element)) found.push(element);
        }
      } catch {}
    }
    return found.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
  }

  function getEditor() {
    return editorCandidates()[0] || null;
  }

  function editorText() {
    const editor = getEditor();
    if (!editor) return "";
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) return editor.value || "";
    return editor.innerText || editor.textContent || "";
  }

  function composerFrame() {
    const editor = getEditor();
    if (!editor) {
      return document.querySelector('form[data-type="unified-composer"], form[data-testid*="composer" i], main form') || null;
    }
    return editor.closest('form[data-type="unified-composer"], form[data-testid*="composer" i], form') ||
      editor.closest('[data-testid*="composer" i], [class*="composer" i]') ||
      editor.parentElement;
  }

  function dispatchInput(editor, text) {
    try {
      editor.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: text,
      }));
    } catch {}
    try {
      editor.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text,
      }));
    } catch {
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function setEditorText(editor, text) {
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      const proto = editor instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      editor.readOnly = false;
      if (setter) setter.call(editor, text); else editor.value = text;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    // The core intentionally locks the composer while bootstrapping. The old
    // ChatGPT override then tried to inject into contenteditable=false, so the
    // hidden startup prompt never landed and the UI stayed on "Starting…".
    // Temporarily unlock only for our own synthetic write, then restore the lock.
    editor.setAttribute("contenteditable", "true");
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    let inserted = false;
    try { inserted = document.execCommand("insertText", false, text); } catch {}
    if (!inserted || !editorText().trim()) {
      editor.textContent = text;
      const fallback = document.createRange();
      fallback.selectNodeContents(editor);
      fallback.collapse(false);
      selection.removeAllRanges();
      selection.addRange(fallback);
    }
    dispatchInput(editor, text);
  }

  function sendButton() {
    const selectors = [
      '[data-testid="send-button"]',
      '[data-testid="composer-submit-button"]',
      'button[aria-label*="Send prompt" i]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Gönder" i]',
    ];
    for (const selector of selectors) {
      try {
        const button = [...document.querySelectorAll(selector)].find(visible);
        if (button) return button;
      } catch {}
    }
    return null;
  }

  function stopButton() {
    const selectors = [
      '[data-testid="stop-button"]',
      '[data-testid="composer-stop-button"]',
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Durdur" i]',
    ];
    for (const selector of selectors) {
      try {
        const button = [...document.querySelectorAll(selector)].find(visible);
        if (button) return button;
      } catch {}
    }
    return null;
  }

  function waitFor(predicate, timeoutMs) {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        let passed = false;
        try { passed = !!predicate(); } catch {}
        if (passed || Date.now() - started >= timeoutMs) return resolve(passed);
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  async function typeAndSend(text) {
    const editor = getEditor();
    if (!editor) throw new Error("ChatGPT input box not found. Reload the ChatGPT tab and open a normal new chat.");
    editor.focus();
    setEditorText(editor, String(text));
    const inserted = await waitFor(() => editorText().trim().length > 0, 3500);
    if (!inserted) {
      if (inputLocked) setInputLock(true);
      throw new Error("ChatGPT composer rejected the injected startup prompt. Reload this chat and retry.");
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    const button = sendButton();
    if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true" && !stopButton()) {
      button.click();
    } else {
      const eventInit = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
      editor.dispatchEvent(new KeyboardEvent("keydown", eventInit));
      editor.dispatchEvent(new KeyboardEvent("keyup", eventInit));
    }

    const accepted = await waitFor(() => editorText().trim() === "" || !!stopButton() || ZSProvider.userCount() > 0, 4500);
    if (inputLocked) setTimeout(() => setInputLock(true), 0);
    if (!accepted) throw new Error("ChatGPT did not accept the ZeroScript startup message. Press Yenile and open a fresh chat.");
  }

  function setInputLock(on) {
    inputLocked = !!on;
    const editor = getEditor();
    if (!editor) return;
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) editor.readOnly = inputLocked;
    else editor.setAttribute("contenteditable", inputLocked ? "false" : "true");
  }

  // Critical fix: never insert ZeroScript into ChatGPT's React composer tree.
  // Returning null makes core/main.js use its fixed-position fallback above the
  // live editor, which survives SPA navigation and composer reconciliation.
  ZSProvider.barMount = () => null;
  ZSProvider.barAnchor = () => null;
  ZSProvider.getEditor = getEditor;
  ZSProvider.editorText = editorText;
  ZSProvider.composerFrame = composerFrame;
  ZSProvider.isFreshChat = () => ZSProvider.chatIsEmpty() && !!getEditor();
  ZSProvider.enforceComposer = () => ({ ready: !!getEditor() });
  ZSProvider.ensureComposerReady = async () => ({ ready: !!getEditor() });
  ZSProvider.typeAndSend = typeAndSend;
  ZSProvider.setInputLock = setInputLock;
  ZSProvider.stopGeneration = () => { const button = stopButton(); if (button) button.click(); };
  ZSProvider.isHardGenerating = () => !!stopButton();
  ZSProvider.isBusyNow = () => !!stopButton();

  console.log("[zeroscript] ChatGPT composer compatibility layer active");
})();
