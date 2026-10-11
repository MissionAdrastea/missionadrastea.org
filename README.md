# missionadrastea.org

Static website, no build step.

| Path      | What lives there                                                                 |
| --------- | -------------------------------------------------------------------------------- |
| `page/`   | The pages: `index.html`, `div.html`, `about.html`, `contact.html`                |
| `style/`  | One stylesheet per page                                                          |
| `assets/` | Everything shared: `site.css`, the header and footer markup, scripts, roster data |
| `images/` | Photos, partner logos, profile portraits                                         |

The root `index.html` only redirects the bare domain to `page/index.html`.

## Running it locally

The shared header and footer are loaded with `fetch`, so serve the project over HTTP rather than
opening an HTML file directly. From the project root, run:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/page/index.html>.

In VS Code, run the **Open site in external browser** task (`Terminal` → `Run Task`) to start a local server and open the home page in your default browser.

## Design system

Colours, fonts, spacing and the shared pieces (nav, buttons, hero, closing call, footer) are defined
once in [`assets/site.css`](./assets/site.css). Change a token in `:root` there and every page
follows. The typefaces are Fraunces and Instrument Serif, loaded from Google Fonts in each page's
`<head>`. Cards use the `--card` background, which is opaque so the sky never shows through them.

The nav and footer are edited in [`assets/header.html`](./assets/header.html) and
[`assets/footer.html`](./assets/footer.html); the footer holds the social links.

## Motion

Animation runs on [GSAP](https://gsap.com) and ScrollTrigger, vendored in `assets/vendor/`.
[`assets/motion.js`](./assets/motion.js) wires everything from attributes in the HTML, so adding
motion to new content needs no JavaScript:

| Attribute       | Effect                                                             |
| --------------- | ------------------------------------------------------------------ |
| `data-orbit`    | Which state the orbit takes in this section: `hero`, `ghost`, `drift`, `join` or `dock` |
| `data-intro`    | Children rise in on page load                                      |
| `data-reveal`   | Rises in when it enters the viewport                               |
| `data-zoom`     | Grows in while entering, dims while leaving                        |
| `data-parallax` | Image drifts inside its frame                                      |
| `data-scrub`    | Paragraph lights up word by word as it is scrolled                 |
| `data-stack`    | Cards that stack on top of each other (the Divisions page)         |
| `data-marquee`  | `"One\|Two\|Three"` becomes an endless row of words                |
| `data-gallery`  | A row of cards that scrolls sideways; buttons with `data-gallery-step="-1"` or `"1"` in the same section move it one card |
| `data-sky`      | `quiet` hushes the background constellations while this section is on screen |

The other scripts: [`sky.js`](./assets/sky.js) draws the starry sky and its drifting constellations
behind every page, [`ring.js`](./assets/ring.js) draws the divisions stage on the home page,
[`constellation.js`](./assets/constellation.js) draws the roadmap on the About page and
[`star-trail.js`](./assets/star-trail.js) is the cursor trail. All motion is switched off for
visitors who ask their system for reduced motion.

Do not add `scroll-behavior: smooth` to the CSS: ScrollTrigger then measures positions mid-scroll
and scroll animations end up in the wrong place.

## The roadmap constellation

The roadmap on the About page is written in `page/about.html`: every caption inside `.roadmap` that
carries `data-star="x,y"` becomes a star, in order, and the script joins each one to the next. To
add, remove or reword a milestone, edit those captions; no JavaScript changes are needed.

- `data-star` is the star’s position in sky units, roughly 0 to 1000 across and 0 to 600 down.
- `data-link="4"` also joins that star to the 4th star, to close a shape.
- `data-label="left"`, `right`, `above` or `below` moves the star’s name clear of the lines in the
  final wide view.

## The About page roster

The roster is maintained in [`assets/people-data.json`](./assets/people-data.json), so names and groups can be edited without changing JavaScript:

- Add or rename groups in `teams`, then set each person’s `team` value to the matching group `id`.
- Each person needs a `name`, `title`, and matching `team`; `bio` and `image` are optional.
- Director portraits are optional and use files under `images/profile/`.
- Partner entries can include a `logo` filename stored under `images/logo/`; entries without a logo display their name instead.
- The founder `bio` accepts an array of paragraph strings so text stays spaced and readable.
- `council` lists the Astronaut Advisory Council: each entry has a `name`, and optionally a `bio` and
  an `image` under `images/profile/`.
- `advisors` lists other advisors: each entry has a `name` and `title`, and optionally a `bio`.
