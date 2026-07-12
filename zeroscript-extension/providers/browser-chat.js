// SPDX-License-Identifier: GPL-3.0-or-later
// Experimental semantic adapter for browser chat providers whose DOM changes
// frequently. It intentionally relies on stable accessibility attributes and
// broad fallbacks instead of hashed classes.
// eslint-disable-next-line no-unused-vars
const ZSProvider = (() => {
  "use strict";

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let diag = () => {};

  const HOST = location.hostname.replace(/^www\./, "");
  const PROFILES = {
    "chatgpt.com": {
      id: "chatgpt",
      displayName: "ChatGPT",
      user: '[data-message-author-role="user"]',
      assistant: '[data-message-author-role="assistant"]',
      any: '[data-message-author-role="user"], [data-message-author-role="assistant"]',
      editor: '#prompt-textarea, textarea[data-id="root"], div[contenteditable="true"][data-virtualkeyboard="true"]',
      send: '[data-testid="send-button"], button[aria-label*="Send" i], button[aria-label*="Gönder" i]',
      stop: '[data-testid="stop-button"], button[aria-label*="Stop" i], button[aria-label*="Durdur" i]',
      reply: '.markdown, [class*="markdown"]',
      thinking: '[data-testid*="thinking"], [class*="reasoning"], [class*="thinking"]',
      supportsVision: false,
    },
    "claude.ai": {
      id: "claude",
      displayName: "Claude",
      user: '[data-testid*="user" i], [data-message-author-role="user"]',
      assistant: '[data-testid*="assistant" i], [data-message-author-role="assistant"]',
      any: '[data-testid*="user" i], [data-testid*="assistant" i], [data-message-author-role]',
      editor: 'div[contenteditable="true"], textarea',
      send: 'button[aria-label*="Send" i], button[data-testid*="send" i]',
      stop: 'button[aria-label*="Stop" i], button[data-testid*="stop" i]',
      reply: '[class*="prose"], [class*="markdown"], [data-testid*="assistant" i]',
      thinking: '[class*="thinking"], [class*="reasoning"]',
      supportsVision: false,
    },
    "copilot.microsoft.com": {
      id: "copilot",
      displayName: "Microsoft Copilot",
      user: '[data-content="user-message"], [data-message-author-role="user"], [data-testid*="user" i]',
      assistant: '[data-content="ai-message"], [data-message-author-role="assistant"], [data-testid*="assistant" i]',
      any: '[data-content="user-message"], [data-content="ai-message"], [data-message-author-role], [data-testid*="message" i]',
      editor: 'textarea, div[contenteditable="true"]',
      send: 'button[aria-label*="Submit" i], button[aria-label*="Send" i], button[data-testid*="send" i]',
      stop: 'button[aria-label*="Stop" i], button[data-testid*="stop" i]',
      reply: '[class*="markdown"], [class*="prose"], [data-content="ai-message"]',
      thinking: '[class*="thinking"], [class*="reasoning"]',
      supportsVision: false,
    },
    "chat.mistral.ai": {
      id: "mistral",
      displayName: "Mistral",
      user: '[data-message-author-role="user"], [data-testid*="user" i]',
      assistant: '[data-message-author-role="assistant"], [data-testid*="assistant" i]',
      any: '[data-message-author-role], [data-testid*="message" i], [data-testid*="user" i], [data-testid*="assistant" i]',
      editor: 'textarea, div[contenteditable="true"]',
      send: 'button[aria-label*="Send" i], button[aria-label*="Envoyer" i], button[data-testid*="send" i]',
      stop: 'button[aria-label*="Stop" i], button[aria-label*="Arrêter" i], button[data-testid*="stop" i]',
      reply: '[class*="markdown"], [class*="prose"], [data-message-author-role="assistant"]',
      thinking: '[class*="thinking"], [class*="reasoning"]',
      supportsVision: false,
    },
  };

  const profile = PROFILES[HOST] || {
    id: HOST.split(".")[0] || "browser",
    displayName: HOST,
    user: '[data-message-author-role="user"], [data-testid*="user" i]',
    assistant: '[data-message-author-role="assistant"], [data-testid*="assistant" i]',
    any: '[data-message-author-role], [data-testid*="message" i]',
    editor: 'textarea, div[contenteditable="true"]',
    send: 'button[aria-label*="Send" i], button[data-testid*="send" i]',
    stop: 'button[aria-label*="Stop" i], button[data-testid*="stop" i]',
    reply: '[class*="markdown"], [class*="prose"]',
    thinking: '[class*="thinking"], [class*="reasoning"]',
    supportsVision: false,
  };

  const timings = {
    GEN_IDLE_MS: 1800,
    REASON_IDLE_MS: 12000,
    WARMUP_MS: 45000,
    REASON_NOREPLY_MS: 90000,
    STABLE_MS: 9000,
    RESPONSE_TIMEOUT_MS: 300000,
  };

  function visible(el) {
    if (!el || el.closest("#zs-root")) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0;
  }

  function queryVisible(selector, root = document) {
    if (!selector) return null;
    try {
      return [...root.querySelectorAll(selector)].find(visible) || null;
    } catch {
      return null;
    }
  }

  function queryAll(selector, root = document) {
    if (!selector) return [];
    try { return [...root.querySelectorAll(selector)]; } catch { return []; }
  }

  function closestMessage(el) {
    if (!el) return null;
    const semantic = el.closest('[data-message-author-role], [data-testid*="message" i], article');
    return semantic || el;
  }

  function dedupe(nodes) {
    const seen = new Set();
    const out = [];
    for (const node of nodes) {
      const item = closestMessage(node);
      if (!item || seen.has(item) || item.closest("#zs-root")) continue;
      seen.add(item);
      out.push(item);
    }
    return out.sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  function allItems() {
    let items = dedupe(queryAll(profile.any));
    if (items.length) return items;
    items = dedupe([...queryAll(profile.user), ...queryAll(profile.assistant)]);
    return items;
  }

  function matchesOrContains(item, selector) {
    if (!item || !selector) return false;
    try { return item.matches(selector) || !!item.querySelector(selector); } catch { return false; }
  }

  function roleAttr(item) {
    return String(item && item.getAttribute && item.getAttribute("data-message-author-role") || "").toLowerCase();
  }

  function isUserItem(item) {
    if (!item) return false;
    if (roleAttr(item) === "user") return true;
    return matchesOrContains(item, profile.user) && !matchesOrContains(item, profile.assistant);
  }

  function isAssistantItem(item) {
    if (!item) return false;
    if (roleAttr(item) === "assistant") return true;
    return matchesOrContains(item, profile.assistant) && !isUserItem(item);
  }

  function textWithout(root, excludeSel) {
    if (!root) return "";
    let text = "";
    const skip = [".zs-chip", ".zs-tool-hide", profile.thinking, excludeSel].filter(Boolean).join(",");
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) { text += node.nodeValue || ""; return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (skip) {
        try { if (node.matches(skip)) return; } catch {}
      }
      for (const child of node.childNodes) walk(child);
    };
    walk(root);
    return text;
  }

  function replyRoot(item) {
    if (!item) return null;
    const candidates = queryAll(profile.reply, item).filter((node) => !profile.thinking || !node.closest(profile.thinking));
    return candidates.length ? candidates[candidates.length - 1] : item;
  }

  function itemText(item) {
    if (!item) return "";
    return isAssistantItem(item) ? textWithout(replyRoot(item)) : textWithout(item);
  }

  function classifyText(item, excludeSel) {
    if (!item) return "";
    return isAssistantItem(item) ? textWithout(replyRoot(item), excludeSel) : textWithout(item, excludeSel);
  }

  const assistantItems = () => allItems().filter(isAssistantItem);
  const assistantCount = () => assistantItems().length;
  const userCount = () => allItems().filter(isUserItem).length;
  const lastAssistant = () => assistantItems().at(-1) || null;
  const lastAssistantId = () => {
    const item = lastAssistant();
    if (!item) return null;
    return item.getAttribute("data-message-id") || item.id || item.getAttribute("data-testid") || null;
  };

  function getEditor() {
    const candidates = queryAll(profile.editor).filter((el) => visible(el) && !el.closest("[aria-hidden='true']"));
    if (!candidates.length) return null;
    return candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
  }

  function editorText() {
    const editor = getEditor();
    if (!editor) return "";
    return editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement
      ? editor.value || ""
      : editor.innerText || editor.textContent || "";
  }

  function buttonBy(selector, regex) {
    const editor = getEditor();
    const scopedRoot = editor && (editor.closest("form") || editor.parentElement);
    const direct = queryVisible(selector, scopedRoot || document) || queryVisible(selector);
    if (direct) return direct;
    return [...document.querySelectorAll("button")].find((button) => {
      if (!visible(button)) return false;
      const label = `${button.getAttribute("aria-label") || ""} ${button.title || ""} ${button.textContent || ""}`.trim();
      return regex.test(label);
    }) || null;
  }

  const sendButton = () => buttonBy(profile.send, /send|submit|gönder|envoyer/i);
  const stopButton = () => buttonBy(profile.stop, /stop|durdur|arrêter|cancel generation/i);
  const isHardGenerating = () => !!stopButton();

  function streamText(item = lastAssistant()) {
    if (!item) return "";
    const thinking = profile.thinking ? queryAll(profile.thinking, item).map((node) => node.textContent || "").join("\n") : "";
    return `${thinking}\n${itemText(item)}`;
  }
  const streamLen = (item) => streamText(item === undefined ? lastAssistant() : item).length;

  let streamItem = null;
  let streamMax = -1;
  let streamAt = 0;
  function sampleStream() {
    const item = lastAssistant();
    const length = streamLen(item);
    const now = Date.now();
    if (item !== streamItem || length < streamMax - 400) {
      streamItem = item;
      streamMax = length;
      streamAt = now;
    } else if (length > streamMax) {
      streamMax = length;
      streamAt = now;
    }
  }
  const grewWithin = (ms) => streamMax > 0 && Date.now() - streamAt < ms;

  function isGenerating() {
    if (isHardGenerating()) return true;
    sampleStream();
    return grewWithin(timings.GEN_IDLE_MS);
  }
  const isBusyNow = () => isHardGenerating();

  function snapshot() {
    const item = lastAssistant();
    const thinking = item && profile.thinking ? queryAll(profile.thinking, item).reduce((n, el) => n + (el.textContent || "").length, 0) : 0;
    return { th: thinking, rp: itemText(item).length };
  }
  const genDebug = () => ({ stop: isHardGenerating(), streamMax, streamAgeMs: streamAt ? Date.now() - streamAt : -1, gen: isGenerating() });

  function readAssistant() {
    const item = lastAssistant();
    if (!item) return { present: false, reply: "", thinking: "", item: null };
    const thinking = profile.thinking ? queryAll(profile.thinking, item).map((el) => el.textContent || "").join("\n") : "";
    return { present: true, reply: itemText(item).trim(), thinking: thinking.trim(), item };
  }

  const chatIsEmpty = () => allItems().length === 0;
  const isFreshChat = () => chatIsEmpty() && !!getEditor();

  function composerFrame() {
    const editor = getEditor();
    if (!editor) return null;
    return editor.closest("form") || editor.closest('[class*="composer" i]') || editor.parentElement;
  }

  function barMount() {
    const frame = composerFrame();
    if (!frame || !frame.parentElement) return null;
    return { parent: frame.parentElement, before: frame };
  }

  let locked = false;
  function setInputLock(on) {
    locked = !!on;
    const editor = getEditor();
    if (!editor) return;
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      editor.readOnly = locked;
    } else {
      editor.setAttribute("contenteditable", locked ? "false" : "true");
    }
  }

  function setEditorText(editor, text) {
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      const proto = editor instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(editor, text); else editor.value = text;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    editor.setAttribute("contenteditable", "true");
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("insertText", false, text);
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }

  function pressEnter(editor) {
    const opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    editor.dispatchEvent(new KeyboardEvent("keydown", opts));
    editor.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  async function waitFor(predicate, timeout) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (predicate()) return true;
      await sleep(120);
    }
    return false;
  }

  async function typeAndSend(text) {
    const editor = getEditor();
    if (!editor) throw new Error(`${profile.displayName} input box not found`);
    editor.focus();
    setEditorText(editor, String(text));
    await waitFor(() => editorText().trim().length > 0, 3000);
    await sleep(350);
    const button = sendButton();
    if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true" && !isHardGenerating()) {
      button.click();
    } else if (!isBusyNow()) {
      pressEnter(editor);
    }
    if (locked) setTimeout(() => setInputLock(true), 0);
  }

  function stopGeneration() {
    const button = stopButton();
    if (button) button.click();
  }

  function findContinueBtn() {
    return [...document.querySelectorAll("button")].find((button) => visible(button) && /^(continue|continuer|devam|resume)$/i.test((button.textContent || "").trim())) || null;
  }
  function clickContinueBtn() {
    const button = findContinueBtn();
    if (!button) return false;
    button.click();
    return true;
  }

  const turnHalted = (item) => !!item && /stopped|interrupted|durduruldu|arrêté/i.test(item.textContent || "");

  function scanError() {
    for (const el of document.querySelectorAll('[role="alert"], [class*="error" i], [class*="toast" i]')) {
      if (!visible(el) || el.closest("#zs-root") || allItems().some((item) => item.contains(el))) continue;
      const text = (el.textContent || "").trim();
      if (text.length > 8 && text.length < 500 && /limit|too long|try again|error|unavailable|failed/i.test(text)) return text.slice(0, 240);
    }
    if (!getEditor()) return `${profile.displayName} input box is unavailable.`;
    return null;
  }

  const isTooLongMsg = (text) => /conversation|context|message/.test(String(text).toLowerCase()) && /too long|limit|maximum/.test(String(text).toLowerCase());
  const isBusyMsg = (text) => /busy|try again|temporarily unavailable|overloaded/i.test(String(text));
  const conversationKey = () => `${HOST}${location.pathname}${location.search}`;
  const enforceComposer = () => ({ ready: !!getEditor() });
  const ensureComposerReady = async () => ({ ready: !!getEditor() });
  const clearAttachments = () => {};
  const attachImages = async () => false;

  function installSendHooks(handlers) {
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      const editor = getEditor();
      if (!editor || !(event.target === editor || editor.contains(event.target))) return;
      if (!editorText().trim() || handlers.isBlocked()) return;
      if (!handlers.isStarted()) {
        if (chatIsEmpty()) handlers.onBlockedAttempt();
        return;
      }
      handlers.onUserMessage(assistantCount());
    }, true);

    document.addEventListener("click", (event) => {
      const button = event.target && event.target.closest && event.target.closest("button");
      if (!button || !getEditor()) return;
      if (button === stopButton()) { handlers.onNativeStop(); return; }
      if (button === findContinueBtn()) { handlers.onNativeContinue(); return; }
      if (button !== sendButton() || handlers.isBlocked() || !editorText().trim()) return;
      if (!handlers.isStarted()) {
        if (chatIsEmpty()) handlers.onBlockedAttempt();
        return;
      }
      handlers.onUserMessage(assistantCount());
    }, true);
  }

  function findToolBlockSpot(item, chip) {
    if (!item) return null;
    const roots = queryAll("pre, code, [class*='markdown'], [class*='prose']", item);
    for (const node of roots) {
      if (chip && (node === chip || node.contains(chip))) continue;
      const text = node.textContent || "";
      if (!ZSParse.hasCommandShape(text)) continue;
      const hide = node.closest("pre") || node;
      hide.classList.add("zs-tool-hide");
      return { parent: hide.parentElement, ref: hide };
    }
    return null;
  }

  return {
    id: profile.id,
    displayName: profile.displayName,
    supportsVision: profile.supportsVision,
    timings,
    thinkingSel: profile.thinking,
    init({ diag: nextDiag } = {}) { if (nextDiag) diag = nextDiag; diag("provider.experimental", { id: profile.id, host: HOST }); },
    allItems, isUserItem, isAssistantItem, itemText, classifyText,
    assistantCount, userCount, lastAssistant, lastAssistantId, readAssistant,
    streamLen, snapshot,
    getEditor, editorText, chatIsEmpty, isFreshChat, composerFrame, barMount,
    setInputLock, typeAndSend, stopGeneration,
    isGenerating, isBusyNow, isHardGenerating, genDebug,
    enforceComposer, ensureComposerReady,
    turnHalted, findContinueBtn, clickContinueBtn,
    scanError, isTooLongMsg, isBusyMsg,
    attachImages, clearAttachments, conversationKey,
    installSendHooks, findToolBlockSpot,
  };
})();
