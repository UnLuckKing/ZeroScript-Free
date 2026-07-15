// SPDX-License-Identifier: GPL-3.0-or-later
// ChatGPT-specific UI/runtime helpers for ZeroScript 1.35.

(() => {
  "use strict";
  if (location.hostname !== "chatgpt.com" || window.__zsChatGPTMaxInstalled) return;
  window.__zsChatGPTMaxInstalled = true;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const visible = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0;
  };

  function text(el) {
    return String(el && (el.innerText || el.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function detectCapability() {
    const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(visible);
    const candidates = buttons.map((el) => text(el)).filter((value) => /GPT[-‑ ]?5\.[56]|Sol|Pro|Instant|Medium|High|Extra High|Thinking/i.test(value));
    const unique = [...new Set(candidates)].slice(0, 8);
    const model = unique.find((value) => /GPT[-‑ ]?5\.[56]|Sol|Pro/i.test(value)) || "ChatGPT";
    const reasoning = unique.find((value) => /^(Instant|Medium|High|Extra High|Pro|Thinking)$/i.test(value))
      || unique.find((value) => /Extra High|High|Medium|Instant|Thinking/i.test(value))
      || "";
    return { model: model.slice(0, 120), reasoning: reasoning.slice(0, 80), labels: unique };
  }

  function modelSwitcher() {
    const selectors = [
      '[data-testid="model-switcher-dropdown-button"]',
      '[data-testid*="model-switcher" i]',
      'button[aria-label*="model" i]',
      'button[aria-haspopup="menu"]',
    ];
    for (const selector of selectors) {
      const values = [...document.querySelectorAll(selector)].filter(visible);
      const preferred = values.find((el) => /GPT|model|Sol|Instant|Thinking/i.test(`${text(el)} ${el.getAttribute("aria-label") || ""}`));
      if (preferred) return preferred;
    }
    return null;
  }

  async function selectStrongestReasoning() {
    const trigger = modelSwitcher();
    if (!trigger) return { ok: false, error: "ChatGPT model seçici bulunamadı." };
    trigger.click();
    await sleep(450);
    const items = [...document.querySelectorAll('[role="menuitem"], [role="option"], button, [role="button"]')].filter(visible);
    const ranked = [
      /GPT[-‑ ]?5\.6.*Pro|\bPro\b/i,
      /Extra High/i,
      /^High$/i,
      /GPT[-‑ ]?5\.6.*High/i,
      /^Medium$/i,
      /GPT[-‑ ]?5\.6.*Sol/i,
    ];
    for (const pattern of ranked) {
      const item = items.find((el) => {
        const label = text(el);
        const disabled = el.disabled || el.getAttribute("aria-disabled") === "true" || /upgrade|yükselt|locked|kilitli/i.test(label);
        return !disabled && pattern.test(label);
      });
      if (item) {
        item.click();
        await sleep(500);
        return { ok: true, selected: text(item) };
      }
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    return { ok: false, error: "Hesabında seçilebilir High/Pro seçeneği bulunamadı." };
  }

  async function reportCapability() {
    const capability = detectCapability();
    try { await chrome.runtime.sendMessage({ type: "zs-chatgpt-capability", ...capability }); } catch {}
    return capability;
  }

  function enhancePanel() {
    const host = document.getElementById("zs-universal-host");
    const root = host && host.shadowRoot;
    if (!root || root.getElementById("chatgpt-max-row")) return;
    const body = root.getElementById("body");
    const state = root.getElementById("state");
    if (!body || !state) return;

    const row = document.createElement("div");
    row.id = "chatgpt-max-row";
    row.innerHTML = `
      <style>
        #chatgpt-max-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:-2px 0 10px;padding:9px 10px;border:1px solid #2d3950;border-radius:11px;background:linear-gradient(135deg,rgba(34,211,238,.08),rgba(139,92,246,.1))}
        #chatgpt-max-info{font:700 10px/1.35 Inter,Segoe UI,Arial;color:#cbd5e1}#chatgpt-max-info span{display:block;color:#7dd3fc;font-weight:800;margin-bottom:2px}
        #chatgpt-max-select{border:0;border-radius:9px;padding:8px 9px;background:#1d4ed8;color:white;font:750 10px Inter,Segoe UI,Arial;cursor:pointer}#chatgpt-max-select:hover{filter:brightness(1.12)}
      </style>
      <div id="chatgpt-max-info"><span>ChatGPT Max</span><b id="chatgpt-max-model">Model algılanıyor…</b></div>
      <button id="chatgpt-max-select" title="Hesabındaki en güçlü kullanılabilir reasoning seviyesini seç">Gücü yükselt</button>`;
    state.insertAdjacentElement("afterend", row);
    const button = root.getElementById("chatgpt-max-select");
    const label = root.getElementById("chatgpt-max-model");

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Seçiliyor…";
      const result = await selectStrongestReasoning();
      await reportCapability();
      button.textContent = result.ok ? "Seçildi" : "Elle seç";
      button.disabled = false;
      if (!result.ok) label.textContent = result.error;
      setTimeout(() => { button.textContent = "Gücü yükselt"; }, 2200);
    });

    const update = async () => {
      const capability = await reportCapability();
      label.textContent = [capability.model, capability.reasoning].filter(Boolean).join(" · ") || "ChatGPT hazır";
      const hint = root.getElementById("hint");
      if (hint) hint.textContent = "ChatGPT Max: tek builder, kompakt proje bağlamı, aynı geçişte yapım + test + düzeltme.";
    };
    update();
    setInterval(update, 4500);
  }

  async function nudge(prompt) {
    try {
      if (typeof ZSProvider === "undefined" || !ZSProvider || typeof ZSProvider.typeAndSend !== "function") return false;
      if (ZSProvider.isGenerating && ZSProvider.isGenerating()) return false;
      await ZSProvider.typeAndSend(String(prompt || "").slice(0, 9000));
      return true;
    } catch {
      return false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return false;
    if (message.type === "zs-chatgpt-max-nudge") {
      nudge(message.prompt).then((ok) => sendResponse({ ok }));
      return true;
    }
    if (message.type === "zs-workbench-autostart") {
      reportCapability().catch(() => {});
    }
    return false;
  });

  const observer = new MutationObserver(() => enhancePanel());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhancePanel();
  reportCapability().catch(() => {});
})();
