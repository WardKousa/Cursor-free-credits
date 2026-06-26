# Seedance 2.0 — mooizicht intro video prompt

Text-to-video prompt for the app's entry animation. Target: ~6–8s, 4K, 60fps, seamless
loop-out to black so it can hand off into the UI.

## Palette (use these exact colors)

- Background: near-black `#06060A`
- Magenta `#FF2D9B`
- Blue `#2F7DFF`
- Green `#4FD06A`
- Cream `#EFD29A`
- Orange `#FF8A3D`

Bands run cool→warm from the core outward: magenta → blue → green → cream → orange.

## Master prompt

> A futuristic human face reconstructed entirely from glowing point-cloud scan lines on a
> pure near-black background (#06060A). The face is built from thousands of tiny luminous
> dots arranged in horizontal scan rows, like a 3D depth-map render. The dots are colored in
> a vibrant spectrum that bands from the core outward — magenta (#FF2D9B) and blue (#2F7DFF)
> in the recessed areas, green (#4FD06A) and cream (#EFD29A) on the mid-contours, and bright
> orange (#FF8A3D) glowing on the closest edges and rim of the profile. Thin vertical neon
> light beams run top-to-bottom across the whole frame.
>
> Shot sequence: (1) The face is in side profile, turned to the left, calm and still, the
> vertical light lines faint. (2) The vertical beams brighten and sweep across, and a wave of
> distortion ripples through the face — the scan lines shear, glitch and tremble, warm orange
> and magenta sparks scatter where the wave passes. (3) The face smoothly rotates to look
> directly into the camera, the rippling settling back into a clean, sharp portrait. (4) The
> camera pushes in slowly toward the eyes, the dots blooming and dissolving into darkness.
>
> Style: high-contrast, minimal, data-driven, holographic, cinematic. Crisp glowing particles,
> subtle bloom, deep blacks, no text, no background clutter. 4K, 60fps, ultra sharp.

## Negative / avoid

> photorealistic skin, realistic human texture, busy background, on-screen text, watermark,
> logos, purple-dominant tint, low contrast, muddy colors, jpeg artifacts.

## Short variant (single shot)

> Neon point-cloud face made of horizontal scan-line dots on black (#06060A), spectrum colors
> banding magenta #FF2D9B → blue #2F7DFF → green #4FD06A → cream #EFD29A → orange #FF8A3D,
> vertical light beams sweeping and rippling the face, then it turns to camera and the camera
> zooms in and dissolves to black. Holographic, high-contrast, cinematic, 4K 60fps.

## Notes for matching the in-app intro

- The in-app version reads `public/face.png` as a depth map (brightness = closeness). For a
  perfectly matched render, feed Seedance the same source face as an image reference if your
  plan supports image-to-video.
- Keep the final frame fading to near-black `#06060A` so the video can cut straight into the
  dashboard.
