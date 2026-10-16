# ELITE NG — Live Agency Creative Asset Brief

Canonical production domain: https://elite.resofit.fit  
Visual direction: Pitch-Noir Glass — obsidian black, restrained champagne gold, soft glass surfaces, premium creator economy, Nigerian/African talent presented with global editorial polish.

## 1. Google Flow / Veo prompt — `hero.mp4` (8–10 seconds, seamless loop)

Create a premium 9-second, 16:9 cinematic website hero video for ELITE NG, a Nigerian talent discovery and creator agency platform powered by ResoFlex. No spoken dialogue and no generated text. 24 fps, high-end commercial cinematography, deep obsidian-black environment, soft champagne-gold rim lighting, subtle emerald accents, realistic skin texture, tasteful glass reflections, smooth camera movement, refined and aspirational rather than flashy.

Timeline:
- 0.0–2.0s: macro shot of a dark glass surface catching a narrow champagne-gold light; a subtle luminous ring expands like a camera aperture.
- 2.0–4.0s: transition into a beautiful, diverse group of adult African creators preparing for a shoot: a fashion model, a wellness/fitness host, a confident live presenter and a commercial creator. Natural expressions, professional styling, no exaggerated luxury props.
- 4.0–6.5s: fluid lateral camera move past a modern creator set with a phone on a tripod, soft key light, camera monitor and tasteful studio details. Show collaboration and readiness, not a fake app interface.
- 6.5–8.0s: close-up of a creator smiling at the camera, then a smooth pullback revealing the studio's warm gold edge lighting.
- 8.0–9.0s: return to the opening abstract light and framing so the loop is visually seamless.

Keep the central 60% visually quiet for HTML headline and CTA overlay. Keep faces and key action away from the lower 20% where mobile controls may appear. Do not include logos, watermarks, text, currency values, viewer counts, fake live badges, fake app screens, or UI labels. No rapid cuts, strobing, glitch effects, floating coins, unrealistic skin smoothing, or sexualized styling. The final result should communicate talent, opportunity, trust, creativity and forward momentum. Export a high-quality master and a compressed web version; mute audio for the web hero.

Recommended web encodes: 1920×1080 master, plus 1280×720 web version, H.264 MP4, yuv420p, fast-start metadata, muted. Use a separate poster image for reduced-motion and data-saving contexts.

## 2. Image-generation prompt — `bg-hero.png`

Create a premium 16:9 website hero background for ELITE NG / ResoFlex: pitch-black obsidian studio atmosphere, extremely subtle champagne-gold light ribbons flowing diagonally across the far background, low-opacity smoked-glass planes, soft volumetric edge lighting, a faint emerald accent far to the right, gentle film grain, luxurious editorial lighting, realistic material rendering, lots of clean negative space on the left and center for white headline text and buttons. A few out-of-focus circular light bokeh elements at the edges only. Keep contrast high enough for accessible white text. Composition must crop elegantly to a tall mobile viewport. No people, no words, no typography, no logos, no UI, no coins, no charts, no fake notification badges, no watermarks. Premium global creator platform, minimal, cinematic, restrained and timeless.

Save as `public/images/bg-hero.png`, preferably 2400×1350 or larger, optimized to WebP/AVIF for delivery while retaining PNG as the source asset.

## 3. Supporting image prompts

### Talent discovery card imagery
Generate a consistent editorial portrait series for adult African talent (18+), each image vertical 3:4, natural skin texture, premium but attainable wardrobe, clean studio or real creative workspace, obsidian background with restrained gold rim light, subject centered with face unobstructed, ample lower area for a dark UI gradient. Create separate images for:
- fashion/editorial model
- commercial brand presenter
- wellness and fitness host
- relationship/lifestyle conversation host
- beauty and lifestyle creator
- emerging creator in a simple home studio

No text, fake UI, watermarks, platform logos, exaggerated luxury symbols, sexualized presentation, or claims of real platform activity. These are editorial placeholders only; replace with talent-approved photos before representing a real person.

### Category tile background
Create a dark 4:3 abstract category tile using obsidian glass, one champagne-gold light accent and one clear visual motif for the selected category (camera aperture, studio light, microphone, wellness movement, or brand campaign). No text or people. Maintain consistent lighting and palette across the series.

### Empty state / no active stream
Minimal obsidian-black background, a softly illuminated empty creator stage, one camera tripod and a warm practical light in the distance, quiet hopeful mood, centered composition, no people, no UI, no text, no fake LIVE label. This must not imply any broadcast is currently active.

## 4. Carousel and motion behavior

- Category pills: horizontal swipe on mobile; selected pill uses a restrained gold fill and visible focus state.
- Featured talent: use real approved database profiles; horizontal snap carousel on mobile, 3–4 column grid on desktop.
- Never fabricate viewer counts, diamond earnings, online status, rankings, gifts, or active streams. Render those fields only when a verified provider/backend supplies them; otherwise omit them or label the section as a preview.
- Motion: 180–260 ms ease-out transitions, transform/opacity only where possible, no layout-shifting animations. Respect `prefers-reduced-motion` and avoid autoplay video when reduced motion is requested.
- Hero video: autoplay muted, playsInline, loop, preload metadata, poster fallback, and no blocking of first paint. Disable autoplay on reduced-motion and constrained-data modes.
- Every card should have a single clear primary action (View profile / Book talent); keep Save as a secondary action.
- Mobile dock must include safe-area padding, keyboard focus visibility, and sufficient touch targets.

## 5. FFmpeg encode recipes

Create a 720p web delivery file from a 1080p source:
```bash
ffmpeg -i hero-master.mp4 -an -vf "scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2" -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart -an hero.mp4
```

Create a 2-second poster frame:
```bash
ffmpeg -ss 00:00:02 -i hero-master.mp4 -frames:v 1 -vf "scale=1600:-2" -q:v 2 bg-hero-poster.jpg
```

Optional WebM encode for browsers that benefit from it:
```bash
ffmpeg -i hero-master.mp4 -an -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -vf "scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2" hero.webm
```

Check the resulting file size and playback on a real iPhone over a constrained mobile connection before selecting the final bitrate. Avoid a large video as the only hero asset; keep a poster and static background fallback.

## 6. Conversion copy overlay

Eyebrow: ELITE NG · RESOFLEX SCOUT  
Headline: Your next breakthrough starts here.  
Support: Discover talent, build your creator profile, and prepare for brand opportunities and live sessions in one premium space.  
Primary CTA: Join as talent  
Secondary CTA: Explore talent  
Trust line: Profile-led discovery · Mobile-first experience · Live tools rolling out

Use the words “Live now”, viewer counts, earnings, gifts, or instant booking confirmation only when the underlying integration verifies those states in real time.
