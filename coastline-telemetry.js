/* Coastline's minimal PostHog telemetry. No session replay, identity details, coordinates, or URL query strings are collected. */
(() => {
  'use strict';
  const API_KEY = 'phc_qGpiEJTtssTEKDcJPeC6FRQ3jkkLi8DziTccva4bC9tA';
  const ENDPOINT = 'https://us.i.posthog.com/i/v0/e/';
  const startedAt = performance.now();
  const instrumentationVersion = 2;
  let distinctId;
  const longTaskState = { count: 0, totalMs: 0, maxMs: 0 };
  const frameTimeBuckets = { under17: 0, ms17to33: 0, ms33to100: 0, over100: 0, total: 0 };

  try {
    if (typeof PerformanceObserver === 'function' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const duration = Math.max(0, Number(entry.duration) || 0);
          longTaskState.count += 1;
          longTaskState.totalMs += duration;
          longTaskState.maxMs = Math.max(longTaskState.maxMs, duration);
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
    }
  } catch {
    // Long-task instrumentation is optional and must never affect gameplay.
  }

  let lastObservedFrame = performance.now();
  const observeFrame = now => {
    const delta = Math.max(0, now - lastObservedFrame);
    lastObservedFrame = now;
    if (delta > 0) {
      frameTimeBuckets.total += 1;
      if (delta < 16.67) frameTimeBuckets.under17 += 1;
      else if (delta < 33.34) frameTimeBuckets.ms17to33 += 1;
      else if (delta < 100) frameTimeBuckets.ms33to100 += 1;
      else frameTimeBuckets.over100 += 1;
    }
    requestAnimationFrame(observeFrame);
  };
  requestAnimationFrame(observeFrame);

  function canvasMetrics() {
    try {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      const canvas = canvases
        .filter(item => item && item.width > 0 && item.height > 0)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
      const cssWidth = Math.max(1, window.innerWidth || canvas?.clientWidth || 1);
      const cssHeight = Math.max(1, window.innerHeight || canvas?.clientHeight || 1);
      return {
        width: cssWidth,
        height: cssHeight,
        backingWidth: canvas?.width || 0,
        backingHeight: canvas?.height || 0,
        canvasCount: canvases.length
      };
    } catch {
      return { width: window.innerWidth || 0, height: window.innerHeight || 0, backingWidth: 0, backingHeight: 0, canvasCount: 0 };
    }
  }

  function diagnosticSnapshot() {
    const canvas = canvasMetrics();
    const effectivePixelRatio = canvas.backingWidth > 0 && canvas.width > 0
      ? +(canvas.backingWidth / canvas.width).toFixed(3)
      : +(window.devicePixelRatio || 1).toFixed(3);
    return {
      instrumentationVersion,
      effectivePixelRatio,
      canvas,
      frameTimeBuckets: { ...frameTimeBuckets },
      longTasks: {
        count: longTaskState.count,
        totalMs: +longTaskState.totalMs.toFixed(1),
        maxMs: +longTaskState.maxMs.toFixed(1)
      }
    };
  }

  window.__coastlinePerformanceDiagnostics = diagnosticSnapshot;

  try {
    distinctId = sessionStorage.getItem('coastline_telemetry_session');
    if (!distinctId) {
      distinctId = 'coastline-' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
      sessionStorage.setItem('coastline_telemetry_session', distinctId);
    }
  } catch {
    distinctId = 'coastline-tab-' + Math.random().toString(36).slice(2);
  }

  function capture(event, properties = {}) {
    try {
      const body = JSON.stringify({
        api_key: API_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          app: 'Coastline',
          telemetry_version: instrumentationVersion,
          path: location.pathname,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          device_pixel_ratio: Math.min(window.devicePixelRatio || 1, 5),
          device_memory_gb: navigator.deviceMemory || null,
          elapsed_ms: Math.round(performance.now() - startedAt),
          ...properties
        }
      });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      }).catch(() => {});
    } catch {
      // Telemetry must never prevent the game from starting or running.
    }
  }

  window.coastlineTelemetry = { capture };
  capture('coastline_page_loaded', { ready_state: document.readyState, diagnostics: diagnosticSnapshot() });

  const originalReady = window.__coastlineBootReady;
  if (typeof originalReady === 'function') {
    window.__coastlineBootReady = function () {
      capture('coastline_game_ready', { startup_ms: Math.round(performance.now() - startedAt), diagnostics: diagnosticSnapshot() });
      return originalReady.apply(this, arguments);
    };
  }

  window.addEventListener('error', event => {
    const target = event.target;
    if (event.message) {
      capture('coastline_javascript_error', {
        message: String(event.message).slice(0, 180),
        source_file: event.filename ? event.filename.split('/').pop().split('?')[0].slice(0, 100) : '',
        line: Number(event.lineno) || 0,
        diagnostics: diagnosticSnapshot()
      });
    } else if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      capture('coastline_resource_error', {
        resource_type: String(target.tagName).toLowerCase(),
        resource_file: String(target.src || target.href || '').split('/').pop().split('?')[0].slice(0, 100),
        diagnostics: diagnosticSnapshot()
      });
    }
  }, true);

  window.addEventListener('unhandledrejection', event => {
    capture('coastline_unhandled_rejection', {
      message: String(event.reason && (event.reason.message || event.reason) || 'unknown rejection').slice(0, 180),
      diagnostics: diagnosticSnapshot()
    });
  });

  let lastSample = 0;
  setInterval(() => {
    if (document.hidden || typeof window.__coastlineTelemetrySnapshot !== 'function') return;
    const now = performance.now();
    if (now - lastSample < 20000) return;
    lastSample = now;
    try {
      capture('coastline_performance_sample', {
        ...window.__coastlineTelemetrySnapshot(),
        diagnostics: diagnosticSnapshot()
      });
    } catch {
      // Ignore snapshot errors; gameplay has priority.
    }
  }, 5000);

  window.addEventListener('pagehide', () => {
    capture('coastline_page_hidden', { diagnostics: diagnosticSnapshot() });
  });
})();
