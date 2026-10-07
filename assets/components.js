const scriptUrl = document.currentScript.src;
const componentDirectory = new URL(".", scriptUrl);

async function loadComponent(selector, filename) {
  const placeholder = document.querySelector(selector);
  if (!placeholder) return;

  const response = await fetch(new URL(filename, componentDirectory), { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Could not load ${filename}: ${response.status}`);
  }

  placeholder.innerHTML = await response.text();
}

async function loadSiteComponents() {
  try {
    await Promise.all([
      loadComponent("[data-site-header]", "header.html"),
      loadComponent("[data-site-footer]", "footer.html"),
    ]);

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".site-nav a, .site-footer-links a").forEach((link) => {
      if (link.getAttribute("href") === currentPage) {
        link.setAttribute("aria-current", "page");
      }
    });
  } catch (error) {
    console.error("Unable to load shared site components.", error);
  }
}

loadSiteComponents();
