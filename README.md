# missionadrastea.org

Static website pages are in `page/`, page-specific styles are in `style/`, and shared header/footer markup, styles, and loader are in `assets/`.

The shared components are loaded with `fetch`, so serve the project over HTTP rather than opening an HTML file directly. From the project root, run:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/page/index.html>.

In VS Code, run the **Open site in external browser** task (`Terminal` → `Run Task`) to start a local server and open the home page in your default browser.

The About page roster is maintained in [`assets/people-data.json`](./assets/people-data.json), so names and groups can be edited without changing JavaScript:

- Add or rename groups in `teams`, then set each person’s `team` value to the matching group `id`.
- Each person needs a `name`, `title`, and matching `team`; `bio` and `image` are optional.
- Director portraits are optional and use files under `images/profile/`.
- Partner entries can include a `logo` filename stored under `images/logo/`; entries without a logo display their name in the flexible partner-card layout.
- The founder `bio` accepts an array of paragraph strings so text stays spaced and readable.
- The shared footer social links are in `assets/footer.html`.
