# Coastline Art Direction

## North star

Coastline should combine the cinematic environmental detail and open-world scale of premium driving games with an original graphic-novel visual signature. Keep vehicles, road layouts, lighting, and materials grounded, then add selective ink contours, halftone shadows, expressive color grading, graphic motion accents, and stylized shadow shapes.

Use other games and animated films as references for broad qualities only. Do not reproduce their characters, logos, exact designs, assets, or proprietary effects. Coastline needs its own world, silhouettes, palette, and visual language.

## Visual principles

1. **Believable foundation:** vehicle proportions, road widths, architecture, and light direction should feel coherent.
2. **Selective comic treatment:** contours, crosshatching, halftone shadows, and subtle color separation should emphasize form, not outline everything equally.
3. **Cinematic coastal color:** ocean blues and teals, warm sunlight, sunset coral, deep indigo shadows, and saturated accent colors with phone-readable contrast.
4. **Expressive motion:** use graphic speed accents, stylized tire smoke, and drift emphasis during action; keep ordinary driving clear.
5. **Distinct regions:** downtown, neighborhoods, suburbs, industrial areas, coast, countryside, and highways should have different silhouettes and environmental details.
6. **Performance first:** prefer reusable geometry, efficient materials, and optional effects. Profile expensive outlines and post-processing on real mobile devices.
7. **Readability wins:** HUD, mission targets, roads, traffic, and pedestrians must remain legible.

## Implementation order

- Establish a small, consistent palette and material tokens.
- Improve composition and landmarks before heavy screen effects.
- Prototype low-cost vehicle contours and graphic shadows in an isolated scene.
- Add optional halftone or color-separation effects only after profiling and quality fallbacks.
- Add drift smoke and mission-completion graphic beats as controlled effects.
- Compare equivalent camera angles on desktop and a real phone.

## Art review checklist

- [ ] Coastline has a distinct identity rather than a generic city template.
- [ ] Materials share a coherent lighting model.
- [ ] Comic details emphasize action without obscuring roads or actors.
- [ ] Dense and open regions look distinct.
- [ ] The style stays legible on small screens.
- [ ] Low/medium/high quality modes can disable costly effects.
- [ ] Third-party art, fonts, shaders, textures, audio, and code have compatible licenses and attribution.
