// Lightweight presentation layer. It intentionally owns only DOM presentation so
// gameplay simulation and Three.js rendering remain isolated and cache-friendly.

const css = `
.coast-vignette{position:fixed;inset:0;z-index:4;pointer-events:none;background:radial-gradient(circle at 50% 48%,transparent 48%,rgba(0,0,0,.16) 100%);mix-blend-mode:multiply;opacity:.72}
#coastMap,.card,.toast,.bug-report{box-shadow:0 8px 28px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.05)}
#coastMap{border-color:rgba(170,235,245,.38)!important}
.mission{transition:opacity .35s ease,transform .35s ease}.mission.coast-idle{opacity:.18;transform:translateY(-4px)}
@media(prefers-reduced-motion:reduce){.mission{transition:none}.coast-vignette{opacity:.4}}
`;

function installStyles() {
  if (document.getElementById('coast-presentation-style')) return;
  const style = document.createElement('style'); style.id = 'coast-presentation-style'; style.textContent = css; document.head.appendChild(style);
}

function installVignette() {
  if (document.querySelector('.coast-vignette')) return;
  const el = document.createElement('div'); el.className = 'coast-vignette'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el);
}

function installMissionFade() {
  const card = document.querySelector('.mission'), mission = document.getElementById('mission'), objective = document.getElementById('objective');
  if (!card || !mission || !objective || card.dataset.coastFadeInstalled) return;
  card.dataset.coastFadeInstalled = '1';
  let last = `${mission.textContent}|${objective.textContent}`;
  let timer = 0;
  const reveal = () => { card.classList.remove('coast-idle'); clearTimeout(timer); timer = setTimeout(() => card.classList.add('coast-idle'), 5200); };
  const observer = new MutationObserver(() => {
    const next = `${mission.textContent}|${objective.textContent}`;
    if (next !== last) { last = next; reveal(); }
  });
  observer.observe(mission, { childList: true, characterData: true, subtree: true });
  observer.observe(objective, { childList: true, characterData: true, subtree: true });
  reveal();
}

export function installPresentationRuntime() {
  if (typeof document === 'undefined') return false;
  const run = () => { installStyles(); installVignette(); installMissionFade(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else run();
  return true;
}

installPresentationRuntime();
