// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript One browser workspace: direct task entry, auto-start and recovery.

(() => {
  "use strict";
  if (document.getElementById("zs-universal-host")) return;

  const PROVIDERS = {
    "chat.deepseek.com": "DeepSeek", "deepseek.com": "DeepSeek",
    "gemini.google.com": "Gemini", "www.kimi.com": "Kimi", "kimi.com": "Kimi",
    "chat.z.ai": "GLM", "chat.qwen.ai": "Qwen", "arena.ai": "Arena",
    "chatgpt.com": "ChatGPT", "claude.ai": "Claude",
    "copilot.microsoft.com": "Copilot", "chat.mistral.ai": "Mistral",
  };

  const host = document.createElement("div");
  host.id = "zs-universal-host";
  host.style.cssText = "all:initial;position:fixed;right:18px;top:18px;z-index:2147483647;font-family:Inter,Segoe UI,Arial,sans-serif;color-scheme:dark;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      *{box-sizing:border-box}
      #panel{width:330px;background:rgba(9,12,18,.98);color:#f7f8fc;border:1px solid #293247;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.58);overflow:hidden;backdrop-filter:blur(20px)}
      #head{height:52px;display:flex;align-items:center;gap:10px;padding:0 14px;background:linear-gradient(180deg,#171d2a,#121722);cursor:pointer;user-select:none}
      #logo{width:28px;height:28px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);display:grid;place-items:center;font-weight:900;font-size:14px;box-shadow:0 0 28px rgba(124,92,252,.35)}
      #name{font-size:14px;font-weight:750;flex:1}.muted{color:#9aa7bd;font-size:10px;font-weight:600}
      #dot{width:9px;height:9px;border-radius:50%;background:#f6b84a;box-shadow:0 0 0 4px rgba(246,184,74,.12)}
      #toggle{border:0;background:transparent;color:#9aa7bd;font-size:17px;cursor:pointer;padding:5px}
      #body{padding:14px}.collapsed #body{display:none}.collapsed{width:220px}
      #state{font-size:12px;line-height:1.45;min-height:38px;color:#cdd5e3;margin-bottom:10px}
      #task{width:100%;min-height:86px;max-height:160px;resize:vertical;border:1px solid #303b53;border-radius:12px;background:#151b29;color:#f7f8fc;padding:11px 12px;font:500 12px/1.45 Inter,Segoe UI,Arial;outline:none}
      #task:focus{border-color:#8064ff;box-shadow:0 0 0 3px rgba(124,92,252,.14)}
      #task::placeholder{color:#738097}
      #actions{display:flex;gap:7px;margin-top:9px}button.action{border:0;border-radius:10px;padding:10px 12px;font:700 12px Inter,Segoe UI,Arial;cursor:pointer;color:white;background:#2a3142}button.action:hover{filter:brightness(1.1)}button.action:disabled{opacity:.42;cursor:not-allowed}
      #build{background:linear-gradient(135deg,#7957ff,#8b5cf6);flex:1;box-shadow:0 8px 24px rgba(124,92,252,.25)}#stop{background:#42232e;color:#ff9eae}#retry{background:#183c35;color:#7ce7c8}
      #activity{margin-top:11px;border-top:1px solid #252e40;padding-top:9px;display:grid;gap:6px}
      .row{display:flex;align-items:flex-start;gap:8px;color:#aeb9ca;font-size:10px;line-height:1.35}.mark{width:7px;height:7px;border-radius:50%;margin-top:3px;background:#58657a;flex:none}.row.done .mark{background:#2dd4a3}.row.active .mark{background:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.12)}.row.error .mark{background:#f06276}.row.warn .mark{background:#f6b84a}
      #hint{margin-top:9px;color:#718096;font-size:9.5px;line-height:1.4}
      #diag{display:none;margin-top:8px;padding:8px;border-radius:9px;background:#241b24;color:#ffb2bf;font:10px/1.35 Consolas,monospace;word-break:break-word}
    </style>
    <div id="panel">
      <div id="head"><div id="logo">Z</div><div id="name">ZeroScript One <span class="muted" id="provider"></span></div><div id="dot"></div><button id="toggle" title="Küçült">−</button></div>
      <div id="body">
        <div id="state">ZeroScript hazırlanıyor…</div>
        <textarea id="task" placeholder="Oyunda ne yapayım? Örn: RNG UI'yi profesyonelleştir ve bütün butonları çalıştır."></textarea>
        <div id="actions"><button class="action" id="build">Yap</button><button class="action" id="stop">Durdur</button><button class="action" id="retry">Yenile</button></div>
        <div id="activity"></div><div id="diag"></div>
        <div id="hint">Tek istek, tek AI, tek uygulama geçişi. Eski görev otomatik silinir.</div>
      </div>
    </div>`;
  document.documentElement.appendChild(host);

  const panel = shadow.getElementById("panel");
  const provider = shadow.getElementById("provider");
  const state = shadow.getElementById("state");
  const dot = shadow.getElementById("dot");
  const task = shadow.getElementById("task");
  const build = shadow.getElementById("build");
  const stop = shadow.getElementById("stop");
  const retry = shadow.getElementById("retry");
  const activity = shadow.getElementById("activity");
  const diag = shadow.getElementById("diag");
  const toggle = shadow.getElementById("toggle");
  provider.textContent = `· ${PROVIDERS[location.hostname] || location.hostname}`;

  let workbench = null;
  let lastMainError = "";
  window.addEventListener("error", (event) => {
    const message = String(event && event.message || "");
    if (/ZeroScript|ZSProvider|Cannot access|not defined/i.test(message)) lastMainError = message;
  });

  function setTone(kind) {
    const table = { ready:["#2dd4a3","rgba(45,212,163,.12)"], work:["#8b5cf6","rgba(139,92,246,.14)"], warn:["#f6b84a","rgba(246,184,74,.12)"], error:["#f06276","rgba(240,98,118,.12)"] };
    const colors = table[kind] || table.warn;
    dot.style.background = colors[0]; dot.style.boxShadow = `0 0 0 4px ${colors[1]}`;
  }

  function mainElements() {
    return { root:document.getElementById("zs-root"), action:document.getElementById("zs-action"), stop:document.getElementById("zs-stop"), state:document.getElementById("zs-state") };
  }

  function renderActivity(items) {
    const values = Array.isArray(items) ? items.slice(-5) : [];
    activity.innerHTML = values.map((item) => `<div class="row ${item.kind || ""}"><span class="mark"></span><span>${String(item.text || "").replace(/[&<>]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}${item.detail ? `<br><span style="color:#758399">${String(item.detail).replace(/[&<>]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}</span>` : ""}</span></div>`).join("");
  }

  function refreshMain() {
    const main = mainElements();
    if (!main.root) {
      state.textContent = "AI kontrolü yüklenemedi. Yenile düğmesiyle bu sekmeyi temiz başlat.";
      setTone("error");
      diag.style.display = "block";
      diag.textContent = lastMainError || "MAIN_AGENT_NOT_MOUNTED";
      build.disabled = true;
      return;
    }
    diag.style.display = "none";
    const text = String(main.state && main.state.textContent || "").replace(/\s+/g," ").trim();
    const active = workbench && ["preparing","starting","running"].includes(workbench.state);
    state.textContent = active ? (workbench.detail || "Çalışıyor") : text || "Hazır. İsteğini yaz ve Yap'a bas.";
    build.disabled = active;
    stop.disabled = !active;
    setTone(active ? "work" : /offline|kapalı|mcp|studio|open|run/i.test(text) ? "warn" : "ready");
  }

  async function getStatus() {
    try {
      const result = await chrome.runtime.sendMessage({ type:"zs-workbench-status" });
      if (result && result.ok) { workbench = result.workbench; renderActivity(workbench.activity); refreshMain(); }
    } catch {}
  }

  async function ensureAgentStarted() {
    const main = mainElements();
    if (!main.root) return false;
    if (main.action && !main.action.disabled && /start|başlat/i.test(main.action.textContent || "")) {
      main.action.click();
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    return true;
  }

  async function startTask() {
    const goal = task.value.trim();
    if (!goal) { state.textContent = "Önce ne yapılacağını yaz."; setTone("warn"); task.focus(); return; }
    build.disabled = true; state.textContent = "AI ve Studio hazırlanıyor…"; setTone("work");
    await ensureAgentStarted();
    try {
      const result = await chrome.runtime.sendMessage({ type:"zs-workbench-start", goal, source:"extension" });
      if (!result || !result.ok) throw new Error(String(result && result.error || "Görev başlatılamadı"));
      state.textContent = `${result.provider || "AI"} çalışmaya başladı.`;
    } catch (error) {
      state.textContent = String(error && error.message || error); setTone("error"); build.disabled = false;
    }
    getStatus();
  }

  build.addEventListener("click", startTask);
  task.addEventListener("keydown", (event) => { if (event.ctrlKey && event.key === "Enter") startTask(); });
  stop.addEventListener("click", async () => { try { await chrome.runtime.sendMessage({ type:"zs-workbench-stop" }); } catch {} getStatus(); });
  retry.addEventListener("click", () => location.reload());
  toggle.addEventListener("click", (event) => { event.stopPropagation(); panel.classList.toggle("collapsed"); toggle.textContent = panel.classList.contains("collapsed") ? "+" : "−"; });
  shadow.getElementById("head").addEventListener("dblclick", () => toggle.click());

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "zs-workbench-autostart") ensureAgentStarted();
    if (message && message.type === "zs-team-status" && message.team && message.team.workbench) {
      workbench = message.team.workbench; renderActivity(workbench.activity); refreshMain();
    }
  });

  setInterval(() => { refreshMain(); getStatus(); }, 900);
  refreshMain(); getStatus();
})();
