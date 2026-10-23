# Elite NG — Premium Media Asset Plan
Updated: 2026-10-20

## Creative direction
- **Visual system:** obsidian / near-black surfaces, champagne-gold highlights, restrained glass, editorial typography, generous negative space.
- **Conversion principle:** show the creator, deliverable, process and evidence before decorative atmosphere. Keep each page's primary action visually dominant.
- **Avoid:** generic stock-photo grids, fake client logos, invented performance metrics, unlicensed creator footage, autoplay audio, and unlabelled concept work.

## Priority asset backlog

| Priority | Placement | Asset to produce | Recommended format | Conversion purpose |
|---|---|---|---|---|
| P0 | Brand Growth hero | 6–10 second silent loop: creator preparing a shoot, editing a vertical clip, reviewing a brand board; no embedded text | 1920×1080 MP4/WebM, 4–6 MB target; 1600×900 AVIF/WebP poster | Makes the service tangible immediately |
| P0 | Monetization hero | Editorial triptych: raw footage → branded edit → finished vertical deliverable | 3 separate 4:5 or 3:2 images, AVIF/WebP | Explains the transformation being purchased |
| P0 | Offer cards | Distinct cover per offer: launch pack, creator workspace, highlight edits, agency retainer | 1200×1500 AVIF/WebP; consistent crop | Improves scanability and offer differentiation |
| P0 | Proof section | 3–5 real project examples with brief, deliverables, and measured outcomes where available | 4:5 cover + 9:16 preview + concise caption | Builds trust without unsupported claims |
| P1 | Creator media kit | Portrait, creator niche, content pillars, collaboration formats, audience metrics only when verified | 4:5 portrait + structured metadata | Helps brands evaluate fit quickly |
| P1 | Brand identity portfolio | Logo lockup, type specimen, palette, social-template mockups | 1:1 tile + 16:9 case-study board | Makes brand consistency visible |
| P1 | Campaign case study | Brief, concept, final creative, deliverables and verified result panel | 16:9 case-study cover + 9:16 creatives | Makes process and value easy to compare |
| P1 | How it works | Five simple illustrated stages: brief, curate, edit, approve, deliver | SVG icons or lightweight WebP | Reduces uncertainty and purchase friction |
| P1 | Trust / FAQ | Original process photos, secure workflow illustration, permissions checklist | SVG / WebP | Reinforces responsible handling of creator media |
| P2 | Testimonials | Approved customer portrait or brand mark, exact quote, name/role permission | 1:1 portrait/logo | Social proof only when consent and source are recorded |
| P2 | Empty states | Minimal gold-line illustrations for no portfolio, no scheduled content, no connected account | SVG | Makes first-use states feel intentional |

## Asset production standards
- Use original commissioned or customer-supplied media with documented usage permission as the default source.
- Stock alternatives: search Unsplash or Pexels for editorial lighting and creator-workflow scenes; verify the current license and any model/property-release requirements before commercial use. Stock imagery must never be presented as an Elite NG customer or creator.
- Keep the visual language coherent: warm directional light, deep shadows, natural skin tones, real environments, subtle gold accents, no excessive neon.
- Export photography as AVIF with WebP fallback where the image pipeline supports it. Use SVG for simple icons. Use video only where it communicates the service better than a still.
- Target image weight: hero poster ≤250 KB; card image ≤160 KB; small supporting image ≤100 KB. Measure actual output and adjust for visual quality.
- Use responsive srcset / sizes, explicit width and height, lazy-load below-the-fold media, and preload only the actual above-the-fold hero asset.
- Every informative image needs descriptive alt text. Decorative images use empty alt text. Never bake key headings, prices, legal text or CTAs into images.
- For video, ship a poster, muted playback, no audio track where possible, pause when off-screen, and honor reduced-motion preferences. Keep a static poster for reduced-motion users.
- Use filenames such as brand-growth-hero-poster.webp, offer-highlight-launch-cover.avif, portfolio-campaign-case-study-01.avif, and workflow-approve-deliver.svg.

## Conversion-focused page order
1. **Hero:** clear outcome, one primary CTA, one secondary CTA, and one strong representative visual.
2. **Deliverable preview:** show what the buyer actually receives.
3. **Offer comparison:** scope, best-fit audience, turnaround assumptions, revision boundary and price basis.
4. **Process:** brief → asset permissions → production → review → delivery.
5. **Evidence:** permissioned case studies, genuine testimonials, and metrics with date/source/context.
6. **Risk reduction:** FAQs, payment/refund terms, delivery expectations, and a clear contact route.
7. **Final CTA:** repeat the primary action after the buyer has seen value and scope.

## Required asset metadata
Track each asset's asset_id, filename, owner, usage_permission, source, alt_text, focal_point, width, height, format, file_size_bytes, created_at, and approved_at in the asset inventory. Keep releases and source files in the authorized project storage; do not place credentials or private release documents in public asset metadata.

## Release checklist
- [ ] Hero poster and mobile crop reviewed at iPhone-width.
- [ ] Offer cards remain distinct and legible without animation.
- [ ] All media has correct rights/consent and descriptive metadata.
- [ ] Mobile LCP, image weight and layout shift measured on the deployed route.
- [ ] Keyboard focus, contrast, reduced motion and screen-reader names checked.
- [ ] Conversion events are instrumented and tested before making performance claims.
