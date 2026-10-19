// Core Coastline sandbox: keep ambient wildlife helpers available, but defer resident
// activities, replayability encounters, rumors and story progression until the systems
// are deliberately redesigned. This keeps the driving sandbox lightweight.
import { REALISM_PROFILES, realismLibraryRules } from './realism-library.js';
import { createNpcAgency, NPC_ROLES, NPC_STORY_ARCS } from './npc-agency-engine.js';

const residentActivities = Object.freeze(['idle']);

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
  const memory = {
    snapshot: () => ({})
  };
  const encounters = {
    next: () => null,
    update: () => null,
    snapshot: () => ({})
  };
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
