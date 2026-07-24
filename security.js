/* ======================================================
   UID BYPASS REGISTRY - ANTI-INSPECT & SOURCE PROTECTION
   ====================================================== */

(function () {
  'use strict';

  // 1. Disable Right Click Context Menu
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  }, false);

  // 2. Block Inspect & View Source Hotkeys
  document.addEventListener('keydown', function (e) {
    // F12
    if (e.keyCode === 123 || e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Windows/Linux)
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67 || e.key === 'I' || e.key === 'J' || e.key === 'C')) {
      e.preventDefault();
      return false;
    }
    // Cmd+Option+I, Cmd+Option+J, Cmd+Option+C (Mac)
    if (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && (e.keyCode === 85 || e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+S / Cmd+S (Save Page)
    if ((e.ctrlKey || e.metaKey) && (e.keyCode === 83 || e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }
  }, false);

  // 3. DevTools Detection & Anti-Debugger Protection
  setInterval(function () {
    const startTime = performance.now();
    debugger;
    const endTime = performance.now();
    if (endTime - startTime > 100) {
      console.clear();
    }
  }, 1000);

  // 4. Disable Dragging Images & Elements
  document.addEventListener('dragstart', function (e) {
    e.preventDefault();
  });
})();
