# sq-bg-lab — Section Background Lab for Squarespace 7.1

Static and animated section backgrounds, plus a live tuning panel you open with `?bglab`.
SWTL Design · `github.com/zsawtelle-lgtm/sq-bg-lab` · v1.0.0

---

## 1. Basic install

### Overview
- **Visitors** see only the backgrounds you set in `window.sqBgLab.sections`. They never see the panel.
- **You** add `?bglab` to any page URL (`https://site.squarespace.com/?noredirect&bglab`). A panel opens in the corner. Pick a section, pick an effect, tune it, then click **Copy config** and paste the result into Code Injection.
- The panel remembers your tuning per site (browser localStorage), so a reload keeps your work.

### Step 1 — Installation (once per site)
Settings → Advanced → Code Injection → **Footer**:

```html
<!-- Section backgrounds | sq-bg-lab -->
<script>
window.sqBgLab = {
  accent: "#be8a2c",          // optional brand accent (gold cells, nodes, glow)
  sections: {}                // filled in by "Copy config"
};
</script>
<script src="https://cdn.jsdelivr.net/gh/zsawtelle-lgtm/sq-bg-lab@1/sq-bg-lab.js"></script>
```

Site must be on the **Core plan or higher** (Code Injection).

### Step 2 — Usage (once per section)
1. Open the live site with `?noredirect&bglab`. Code Injection does not run in the editor.
2. **Pick on page**, then click a section. Or use **All / Dark / Light** to set many at once.
3. Choose an effect and tune the sliders. Changes show live.
4. **Copy config** → replace the Step 1 block in the Footer injection with it. Save.

### Customizations (per section)

| Key | Effects | Default | Options | Description |
|---|---|---|---|---|
| `effect` | all | — | `grid` `contour` `stripe` `grain` `mark` `commit` `network` `flow` `aurora` `none` | Which background |
| `intensity` | all | `1` | `0`–`2.5` | Strength multiplier |
| `focusX` / `focusY` | grid, stripe, commit, flow | `85` / `20` | `0`–`100` (%) | Where the effect is strongest before fading |
| `reach` | grid, stripe, commit, flow | `78` | `30`–`150` (%) | How far it spreads before fading |
| `fade` | grid, stripe, commit, flow | `true` | `true` `false` | Turn the fade mask off |
| `major` / `minor` | grid | `120` / `24` | px | Big / small square size (big ÷ 5 keeps lines aligned) |
| `rings` | contour | `16` | `6`–`30` | Rings per center |
| `gap` / `angle` | stripe | `16` / `115` | px / deg | Line spacing and angle |
| `scale` / `src` | mark | `130` / site logo | % / image URL | Watermark size and image |
| `mode` | commit | `twinkle` | `twinkle` `wave` `ripple` `rain` | Grid pattern |
| `cell` / `gap` | commit | `10` / `3` | px | Cell size and gap |
| `density` | network | `1` | `0.3`–`2.5` | Node count multiplier |
| `lines` | flow | `22` | `8`–`40` | Line count |
| `speed` | commit, network, flow, aurora | `1` | `0.2`–`3` | Motion speed |
| `ink` | all | section text color | any CSS color | Override the line/cell color |

### Per-site checklist
- [ ] Core plan or higher
- [ ] Footer injection has the config + script (Step 1)
- [ ] Tuned on the live site with `?bglab`, config pasted, saved
- [ ] Checked desktop and mobile with `?noredirect` (and `&password=…` on staging)

---

## 2. Styling

### CSS-only option (no script)
For **Blueprint grid** and **Pinstripe**, the panel's **Copy CSS** button writes a Custom CSS block with variables at the top (`--bg-major`, `--bg-intensity`, `--bg-focus-x` …). Paste it into Design → Custom CSS as its own numbered section. No script needed. The LESS escapes (`~"…"`) are already in place.

### Targeting
Every effect is a `.sbl-layer` div inside the section's `.section-background`:

```css
[data-section-id="SECTION_ID"] .sbl-layer { opacity: .8; }
```

---

## 3. For developers

### Component HTML
```html
<section class="page-section" data-section-id="…">
  <div class="section-background">
    <div class="sbl-layer" style="mask-image: radial-gradient(…)">
      <canvas></canvas>            <!-- motion effects only -->
    </div>
  </div>
  …
</section>
```

### Global settings (`window.sqBgLab`, set above the script)

| Key | Default | Description |
|---|---|---|
| `sections` | `{}` | Per-section settings, keyed by `data-section-id` |
| `accent` | section text color | Accent for gold cells, network nodes, glow, flow highlight |
| `mark` | site logo | Default watermark image URL |
| `lab` | `false` | `true` opens the panel without `?bglab` (do not ship this) |

### Events and functions
In lab mode, `window.sqBgLab.api` exposes `settings`, `sections`, `renderAll()`, `configSnippet()`, `cssSnippet()`, `version`.

### Behavior
- Dark/light is detected per section from its background color. Line color defaults to the section's text color.
- Motion runs at ~30fps, pauses when the section is off screen, and freezes for visitors who set "reduce motion".

---

## 4. Support

### Troubleshooting
- **No panel:** the URL needs `?bglab`, and you must view the live site (`?noredirect`), not the editor.
- **Effect missing in the editor:** expected. Code Injection only runs on the live site.
- **Copy button does nothing:** the browser blocked clipboard access. The code is also in the box under the buttons; select and copy it.
- **Old tuning keeps coming back:** the panel restores from localStorage. Use **Reset section**, or clear `sqBgLab:<hostname>` in localStorage.

### Deployed on
- Buildkin (buildkin.squarespace.com) — lab used to choose the hero treatment; hero blueprint grid shipped as CSS-only (Custom CSS section 06).

### Open items
- Not yet pushed to GitHub, so the jsdelivr URL is not live yet.
- Watermark uses the site's header logo image by default. Text-only logos need `src`.
