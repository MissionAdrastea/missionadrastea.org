const scriptUrl = document.currentScript.src;
const componentDirectory = new URL(".", scriptUrl);

// The copy kept from the previous page. Storage can be switched off in the browser, hence the guards.
function remembered(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function remember(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // nothing to do: the component simply loads from the network on the next page
  }
}

async function loadComponent(selector, filename) {
  const placeholder = document.querySelector(selector);
  if (!placeholder) return;

  // Show the remembered copy at once, so the nav does not blink in on every page, then check the
  // network and swap it only if the file has changed.
  const key = `adrastea:${filename}`;
  const cached = remembered(key);
  if (cached) placeholder.innerHTML = cached;

  const response = await fetch(new URL(filename, componentDirectory), { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Could not load ${filename}: ${response.status}`);
  }

  const markup = await response.text();
  if (markup !== cached) {
    placeholder.innerHTML = markup;
    remember(key, markup);
  }
}

function markCurrentPage() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a, .foot a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.setAttribute("aria-current", "page");
    }
  });
}

// The nav slides away while scrolling down so it never sits on content,
// and returns on any upward scroll or keyboard focus.
function wireNav() {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  let lastY = window.scrollY;
  let hidden = false;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) < 6) return;

      const hide = delta > 0 && y > 140;
      if (hide !== hidden) {
        hidden = hide;
        nav.classList.toggle("hide", hide);
      }
      lastY = y;
    },
    { passive: true },
  );

  nav.addEventListener("focusin", () => {
    hidden = false;
    nav.classList.remove("hide");
  });
}

async function loadSiteComponents() {
  try {
    const loading = Promise.all([
      loadComponent("[data-site-header]", "header.html"),
      loadComponent("[data-site-footer]", "footer.html"),
    ]);
    markCurrentPage(); // for the remembered copies, which are already on the page

    await loading;
    markCurrentPage();
    wireNav();
    window.adrasteaRefreshScrollEffects?.();
  } catch (error) {
    console.error("Unable to load shared site components.", error);
  }
}

loadSiteComponents();
