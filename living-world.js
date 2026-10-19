// Core Coastline sandbox: keep ambient wildlife helpers available, but defer resident
// activities, replayability encounters, map/location discovery and story progression
// until those systems are deliberately redesigned. This keeps the driving sandbox lightweight.
import { REALISM_PROFILES, realismLibraryRules } from './realism-library.js';
import { createNpcAgency, NPC_ROLES, NPC_STORY_ARCS } from './npc-agency-engine.js';

const residentActivities = Object.freeze(['idle']);
const disabledAdapter = target => new Proxy(target, {
  get(obj, prop) {
    if (prop in obj) return obj[prop];
    return () => false;
  }
});

if (typeof window !== 'undefined') {
  window.__coastlineCoreSandbox = Object.freeze({
    version: 1,
    map: false,
    missions: false,
    activities: false,
    pedestrianInteraction: false,
    locationLabels: false,
    ordinaryBuildingInteriors: false,
    garageInterior: true
  });
  const stripDeferredUi = () => {
    try {
      document.getElementById('coastMap')?.remove();
      document.querySelectorAll('.mission,#mapCanvas,#mapLabel,#mapHint').forEach(node => node.remove());
    } catch {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stripDeferredUi, { once: true });
  else stripDeferredUi();
}

export function chooseResidentActivity() {
  return 'idle';
}

export function chooseWildlifeBehavior({ threatDistance = Infinity, species = 'deer' } = {}) {
  const fleeRadius = species === 'deer' ? 15 : 11;
  return Number.isFinite(threatDistance) && threatDistance < fleeRadius ? 'flee' : 'roam';
}

export function separationSteering() {
  return { x: 0, z: 0 };
}

export function createLivingWorldReplayability() {
  const memory = disabledAdapter({ snapshot: () => ({}) });
  const encounters = disabledAdapter({ snapshot: () => ({}) });
  return Object.freeze({
    memory,
    encounters,
    nextRumor: () => null,
    nextMysteryStage: () => null,
    snapshot: () => ({}),
    rules: () => ({ enabled: false })
  });
}

export { createNpcAgency, NPC_ROLES, NPC_STORY_ARCS };

export function livingWorldRules() {
  return {
    version: 7,
    coreSandbox: true,
    npcAgency: 'deferred',
    residentDecision: 'deferred',
    wildlifeDecision: 'ambient flee/roam only',
    localAvoidance: 'deferred',
    replayability: { enabled: false },
    decisionsPerRenderFrame: false,
    movementAuthority: 'game simulation',
    collisionAuthority: 'game physics',
    assetCaching: 'same-origin service-worker cache with network refresh',
    visualGrammar: realismLibraryRules().philosophy,
    realismProfiles: Object.keys(REALISM_PROFILES),
    presentationRuntime: 'core driving HUD only',
    activities: [...residentActivities],
    wildlifeBehaviors: ['flee', 'roam']
  };
}
