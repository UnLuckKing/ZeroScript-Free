// SPDX-License-Identifier: GPL-3.0-or-later
// Universal, provider-independent fallback launcher.
//
// The normal ZeroScript bar is positioned near each site's composer and can be
// hidden when a provider changes its layout. This compact panel is deliberately
// fixed to the viewport and only delegates to the real provider loop. It makes
// Start/Stop reachable on every supported site, including ChatGPT, Claude,
// Copilot and Mistral, without duplicating the agent implementation.

(() => {
  "use strict";
  if (document.getElementById("zs-universal-host")) return;

  const PROVIDERS = {
    "chat.deepseek.com": "DeepSeek",
    "deepseek.com": "DeepSeek",
    "gemini.google.com": "Gemini",
    "www.kimi.com": "Kimi",
    "kimi.com": "Kimi",
    "chat.z.ai": "GLM",
    "chat.qwen.ai": "Qwen",
    "arena.ai": "Arena",
    "chatgpt.com": "ChatGPT",
    "claude.ai": "Claude",
    "copilot.microsoft.com": "Copilot",
    "chat.mistral.ai": "Mistral",
  };

  const host = document.createElement("div");
  host.id = "zs-universal-host";
  host.style.cssText = "all:initial;position:fixed;right:18px;top:18px;z-index:2147483647;font-family:Segoe UI,Arial,sans-serif;color-scheme:dark;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      *{box-sizing:border-box}
      #panel{width:286px;background:rgba(11,13,18,.97);color:#f4f7fb;border:1px solid #2b3448;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.48);overflow:hidden;backdrop-filter:blur(16px)}
      #head{height:46px;display:flex;align-items:center;gap:9px;padding:0 12px;background:#151a25;cursor:pointer;user-select:none}
      #logo{width:24px;height:24px;border-radius:8px;background:linear-gradient(135deg,#7c5cfc,#36bffa);display:grid;place-items:center;font-weight:800;font-size:13px}
      #name{font-size:13px;font-weight:700;flex:1}.muted{color:#9aa5b6;font-size:10px;font-weight:500}
      #dot{width:8px;height:8px;border-radius:50%;background:#f6b84a;box-shadow:0 0 0 4px rgba(246,184,74,.12)}
      #toggle{border:0;background:transparent;color:#9aa5b6;font-size:16px;cursor:pointer;padding:4px}
      #body{padding:12px}.collapsed #body{display:none}.collapsed{width:210px}
      #state{font-size:12px;line-height:1.4;min-height:34px;color:#cbd3df;margin-bottom:10px}
      #actions{display:flex;gap:7px}button.action{border:0;border-radius:9px;padding:9px 11px;font:600 12px Segoe UI,Arial;cursor:pointer;color:white;background:#2a3142}button.action:hover{filter:brightness(1.12)}button.action:disabled{opacity:.45;cursor:not-allowed}#start{background:#7c5cfc;flex:1}#stop{background:#482531;color:#ff9baa}#open{background:#183d34;color:#78e7c8}
      #hint{margin-top:9px;color:#738096;font-size:10px;line-height:1.35}
    </style>
    <div id="panel">
      <div id="head">
        <div id="logo">Z</div>
        <div id="name">ZeroScript <span class="muted" id="provider"></span></div>
        <div id="dot"></div><button id="toggle" title="Küçült">−</button>
      </div>
      <div id="body">
        <div id="state">Sayfa hazırlanıyor…</div>
        <div id="actions">
          <button class="action" id="start">Agent'ı başlat</button>
          <button class="action" id="stop">Durdur</button>
          <button class="action" id="open" title="Ana ZeroScript çubuğunu göster">Göster</button>
        </div>
        <div id="hint">Start.exe açık olmalı. Bu panel yalnızca bu AI sekmesini ZeroScript'e bağlar.</div>
      </div>
    </div>`;

  document.documentElement.appendChild(host);

  const panel = shadow.getElementById("panel");
  const provider = shadow.getElementById("provider");
  const state = shadow.getElementById("state");
  const dot = shadow.getElementById("dot");
  const start = shadow.getElementById("start");
  const stop = shadow.getElementById("stop");
  const open = shadow.getElementById("open");
  const toggle = shadow.getElementById("toggle");
  provider.textContent = `· ${PROVIDERS[location.hostname] || location.hostname}`;

  function visible(element) {
    if (!element || element.hidden) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function mainElements() {
    return {
      root: document.getElementById("zs-root"),
      action: document.getElementById("zs-action"),
      stop: document.getElementById("zs-stop"),
      state: document.getElementById("zs-state"),
      bar: document.getElementById("zs-bar"),
    };
  }

  function setTone(kind) {
    const table = {
      ready: ["#2dd4a3", "rgba(45,212,163,.12)"],
      work: ["#7c5cfc", "rgba(124,92,252,.14)"],
      warn: ["#f6b84a", "rgba(246,184,74,.12)"],
      error: ["#f06276", "rgba(240,98,118,.12)"],
    };
    const colors = table[kind] || table.warn;
    dot.style.background = colors[0];
    dot.style.boxShadow = `0 0 0 4px ${colors[1]}`;
  }

  function refresh() {
    const main = mainElements();
    const text = (main.state && main.state.textContent || "").replace(/\s+/g, " ").trim();
    const stopVisible = visible(main.stop);
    const startVisible = visible(main.action) && !main.action.disabled;
    const active = stopVisible || /agent active|starting|working|çalış/i.test(text);

    if (!main.root) {
      state.textContent = "ZeroScript ana kontrolü yüklenemedi. Uzantıyı yeniden yükleyip sayfayı yenile.";
      start.disabled = true;
      stop.disabled = true;
      setTone("error");
      return;
    }

    state.textContent = text || (active ? "Agent çalışıyor." : "Agent başlatılmaya hazır.");
    start.disabled = !startVisible || active;
    stop.disabled = !stopVisible && !active;
    start.textContent = active ? "Agent aktif" : (main.action && main.action.textContent.trim() || "Agent'ı başlat");
    setTone(active ? "work" : startVisible ? "ready" : /offline|kapalı|open|run|mcp|studio/i.test(text) ? "warn" : "ready");
  }

  start.addEventListener("click", () => {
    const action = mainElements().action;
    if (action) {
      action.scrollIntoView({ block: "nearest" });
      action.click();
      state.textContent = "Başlatma isteği gönderildi…";
      setTone("work");
    }
  });

  stop.addEventListener("click", () => {
    const controls = mainElements();
    if (controls.stop) controls.stop.click();
    else {
      try { chrome.runtime.sendMessage({ type: "team_stop_all" }); } catch {}
    }
    state.textContent = "Durduruluyor…";
    setTone("warn");
  });

  open.addEventListener("click", () => {
    const main = mainElements();
    if (!main.root) return;
    main.root.style.setProperty("display", "block", "important");
    main.root.style.setProperty("visibility", "visible", "important");
    main.root.style.setProperty("opacity", "1", "important");
    if (main.bar) main.bar.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  function togglePanel() {
    panel.classList.toggle("collapsed");
    toggle.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  }
  toggle.addEventListener("click", (event) => { event.stopPropagation(); togglePanel(); });
  shadow.getElementById("head").addEventListener("dblclick", togglePanel);

  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "disabled", "style", "class"] });
  setInterval(refresh, 700);
  refresh();
})();
