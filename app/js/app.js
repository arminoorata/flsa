/* App entry point. Waits for DOMContentLoaded, then boots UI. */

(function () {
  function boot() {
    if (typeof UI === "undefined" || typeof Engine === "undefined") {
      console.error("FLSA tool: dependencies missing. Check script load order in index.html.");
      return;
    }
    UI.init();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
