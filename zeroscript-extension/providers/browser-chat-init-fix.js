// SPDX-License-Identifier: GPL-3.0-or-later
// Browser-chat providers call their diagnostic callback immediately from init().
// core/main.js creates its runtime state just after P.init(), so a synchronous
// callback accessed that state during the temporal-dead-zone and aborted the
// whole agent before #zs-root was created. Defer only the callback invocation;
// provider initialization itself remains synchronous.

(() => {
  "use strict";
  if (typeof ZSProvider === "undefined" || !ZSProvider || typeof ZSProvider.init !== "function") return;

  const originalInit = ZSProvider.init.bind(ZSProvider);
  ZSProvider.init = function zeroScriptSafeBrowserInit(options = {}) {
    const actualDiag = typeof options.diag === "function" ? options.diag : () => {};
    const deferredDiag = (...args) => setTimeout(() => {
      try { actualDiag(...args); } catch (error) {
        try { console.warn("[zeroscript] deferred provider diagnostic failed", error); } catch {}
      }
    }, 0);
    return originalInit({ ...options, diag: deferredDiag });
  };
})();
