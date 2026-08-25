# da ávErk á Aakalay — The Legend of Aakalay (Part the First)

A **self-contained, self-playing short film** (~23:00) rendered in the same art
style as the Dya'Akara game: the warm torchlit leather-and-stone palette, gold
Guild accents, Georgia serif type, and the game's own **acorn Eikar rigs** and
**Nekh'Vorran beast rig** — all hand-animated on an HTML canvas.

It adapts the opening of the legend: Kiet riding his Great Nekh'Vorran
**Jhealanil** toward the shining city of Aakalay, the three-nights-ago flashback,
the ride through the **Duat** and the vision of the **Karnen**, the silent city,
the **OathTaken** family and the **Gustniptune**, and the reunion of Kiet,
Stamijan, and Naelst at the low building as the **Sunear'Zikhron** arrives.

## How to watch

Open **`the-legend-of-aakalay.html`** in any modern browser (Chrome, Firefox,
Safari, Edge) and press **Begin**. No internet, build step, or dependencies —
it's one file. Best in a dark room with headphones.

- **Space** — play / pause
- **← / →** — skip back / forward 10s
- **M** — mute (audio is a procedural score + ambient bed; dialogue is closed-captioned, no voices)
- **F** — fullscreen
- Scrub or click chapter marks on the timeline.

## Music

The film plays an **original procedural score** (generated in code, per act — a
driving cue for the worm ride, something fragile for the Karnen vision, a
tragic line for OathTaken, a resolve for the ending) layered over the ambient
bed. Nothing is streamed or licensed.

**To swap in your own track later:** drop an audio file (e.g. `aakalay-score.mp3`)
next to this HTML and set `MUSIC_FILE = 'aakalay-score.mp3'` in the film's script
(it's marked with a comment in the `Audio2` engine). The synth cues then step
aside and your track plays as the score, still synced to play/pause and mute.

## Notes

- It is intentionally kept **separate from the game** for now — nothing here
  imports from or modifies `js/`, `css/`, or the game state.
- Runtime is exactly 23:00 across 15 scenes. All dialogue is shown as closed
  captions (narration in gold italics; Jhealanil's telepathic voice in su-blue).
- The rig/palette code mirrors `js/engine/sprites.js` and `css/style.css`
  (acorn biped, quad beast, `shade()`, element colors, torch theme).

## Scenes

I. The Sky Over the Mbaru Tatu · II. The Ride to Aakalay · III. Fifty Letters ·
IV. Reading the Sky · V. The Gate · VI. The Wrong Quiet · VII. The Road Beneath
(the Duat) · VIII. The Vision of the Karnen · IX. The Silent City · X. The Low
Building · XI. Stamijan West, Naelst Stays · XII. What the Streets Kept ·
XIII. OathTaken · XIV. The Bzukot'lic · XV. At the Low Building.
