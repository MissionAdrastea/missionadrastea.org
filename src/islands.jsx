import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// React Bits islands inside the plain HTML pages. A page asks for one with data-island="name"; each
// component is its own chunk, fetched only by pages that have a place for it. If this script fails,
// the page keeps its plain HTML version of the same content.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const mount = (el, node) => createRoot(el).render(<StrictMode>{node}</StrictMode>);
const people = () => fetch("assets/people-data.json?v=7").then((r) => r.json());

const islands = {
  // About: the Astronaut Advisory Council as holographic cards that tilt toward the cursor.
  async council(el) {
    const [{ default: ProfileCard }, data] = await Promise.all([import("./reactbits/ProfileCard.jsx"), people()]);
    // each member leads with their strongest credential, taken from their own bio
    const LEAD = {
      "Ruth Nichols": "Four-time analog astronaut",
      "Eleonore Poli": "PhD Materials, University of Cambridge",
      "Gretchen Green": "Physician-astronaut",
    };
    const lead = (member) => {
      const items = (member.bio ?? "").split("·").map((part) => part.trim()).filter(Boolean);
      const at = items.indexOf(LEAD[member.name]);
      return at > 0 ? [items[at], ...items.slice(0, at), ...items.slice(at + 1)] : items;
    };
    mount(
      el,
      <ul className="council-cards">
        {data.council.map((member) => {
          const [first, ...rest] = lead(member);
          return (
            <li key={member.name}>
              <ProfileCard
                avatarUrl={`images/profile/${member.image}`}
                name={member.name}
                title={first}
                showUserInfo={false}
                backdropColor="#0c0619"
                radius={28}
                enableTilt={finePointer && !reduceMotion}
                intro={!reduceMotion}
              />
              {rest.length > 0 && <p className="council-more">{rest.join(" · ")}</p>}
            </li>
          );
        })}
      </ul>,
    );
  },
};

// Buttons lean toward the cursor (Magnet). The existing link is moved into the magnet, not copied,
// so its href, text and focus behaviour stay exactly as written in the page.
async function magnetise() {
  const buttons = [...document.querySelectorAll(".btn:not(.contact-submit)")];
  if (!buttons.length || !finePointer || reduceMotion) return;
  const { default: Magnet } = await import("./reactbits/Magnet.jsx");
  function Adopt({ node }) {
    const ref = useRef(null);
    useEffect(() => {
      ref.current.append(node);
    }, [node]);
    return <span ref={ref} style={{ display: "inline-block" }} />;
  }
  buttons.forEach((button) => {
    const host = document.createElement("span");
    host.className = "magnet-host";
    button.before(host);
    mount(
      host,
      <Magnet padding={60} magnetStrength={4} maxOffset={14}>
        <Adopt node={button} />
      </Magnet>,
    );
  });
}

// A small burst of light wherever the visitor clicks (ClickSpark), on one layer over the page.
async function sparks() {
  if (reduceMotion) return;
  const { default: ClickSpark } = await import("./reactbits/ClickSpark.jsx");
  const host = document.createElement("div");
  host.className = "spark-layer";
  host.setAttribute("aria-hidden", "true");
  document.body.append(host);
  function Layer() {
    const ref = useRef(null);
    useEffect(() => {
      const onClick = (event) => ref.current?.spark(event.clientX, event.clientY);
      window.addEventListener("pointerdown", onClick, { passive: true });
      return () => window.removeEventListener("pointerdown", onClick);
    }, []);
    return <ClickSpark ref={ref} sparkColor={["#ffffff", "#c9a7ff", "#f08adf"]} sparkSize={10} sparkRadius={26} sparkCount={9} glow={0.6} />;
  }
  mount(host, <Layer />);
}

// Home: the portraits of the people behind Adrastea unmask from the bottom as the band comes into
// view, each settling from slightly enlarged (Motion). Without the script they are simply there.
async function revealPortraits() {
  const portraits = [...document.querySelectorAll(".people-row img")];
  if (!portraits.length || reduceMotion) return;
  const { animate, inView, stagger } = await import("motion");
  // a visitor who arrives already past the band (an anchor, a restored scroll) sees them at once
  if (document.querySelector(".people-groups").getBoundingClientRect().bottom < 0) return;
  portraits.forEach((img) => {
    img.style.clipPath = "inset(100% 0 0 0)";
    img.style.transform = "scale(1.12)";
  });
  inView(
    ".people-groups",
    () => {
      animate(portraits, { clipPath: "inset(0% 0 0 0)" }, { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: stagger(0.12) });
      animate(portraits, { transform: "scale(1)" }, { duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: stagger(0.12) });
    },
    { amount: 0.25 },
  );
}

document.querySelectorAll("[data-island]").forEach((el) => {
  const island = islands[el.dataset.island];
  island?.(el).then(() => el.setAttribute("data-island-ready", ""), (error) => console.error(`Island ${el.dataset.island} failed`, error));
});
magnetise();
sparks();
revealPortraits();
