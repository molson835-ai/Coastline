/* Coastline's minimal PostHog telemetry. No session replay, identity details, coordinates, or URL query strings are collected. */
(() => {
  'use strict';
  const API_KEY = 'phc_qGpiEJTtssTEKDcJPeC6FRQ3jkkLi8DziTccva4bC9tA';
  const ENDPOINT = 'https://us.i.posthog.com/i/v0/e/';
  const startedAt = performance.now();
  let distinctId;
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
          telemetry_version: 1,
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
  capture('coastline_page_loaded', { ready_state: document.readyState });

  const originalReady = window.__coastlineBootReady;
  if (typeof originalReady === 'function') {
    window.__coastlineBootReady = function () {
      capture('coastline_game_ready', { startup_ms: Math.round(performance.now() - startedAt) });
      return originalReady.apply(this, arguments);
    };
  }

  window.addEventListener('error', event => {
    const target = event.target;
    if (event.message) {
      capture('coastline_javascript_error', {
        message: String(event.message).slice(0, 180),
        source_file: event.filename ? event.filename.split('/').pop().split('?')[0].slice(0, 100) : '',
        line: Number(event.lineno) || 0
      });
    } else if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      capture('coastline_resource_error', {
        resource_type: String(target.tagName).toLowerCase(),
        resource_file: String(target.src || target.href || '').split('/').pop().split('?')[0].slice(0, 100)
      });
    }
  }, true);

  window.addEventListener('unhandledrejection', event => {
    capture('coastline_unhandled_rejection', {
      message: String(event.reason && (event.reason.message || event.reason) || 'unknown rejection').slice(0, 180)
    });
  });

  let lastSample = 0;
  setInterval(() => {
    if (document.hidden || typeof window.__coastlineTelemetrySnapshot !== 'function') return;
    const now = performance.now();
    if (now - lastSample < 20000) return;
    lastSample = now;
    try {
      capture('coastline_performance_sample', window.__coastlineTelemetrySnapshot());
    } catch {
      // Ignore snapshot errors; gameplay has priority.
    }
  }, 5000);

  window.addEventListener('pagehide', () => {
    capture('coastline_page_hidden');
  });
})();
