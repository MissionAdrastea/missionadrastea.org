const peopleDirectory = document.querySelector("#people-directory");

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createImage(src, alt) {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function createPersonCard(person) {
  const card = document.createElement("li");
  const isDirector = person.title.toLowerCase().startsWith("director");
  card.className = isDirector ? "person person--director" : "person";

  if (isDirector && person.image) {
    const portrait = document.createElement("span");
    portrait.className = "person-portrait";
    portrait.append(createImage(`../images/profile/${person.image}`, ""));
    card.append(portrait);
  }

  const details = document.createElement("div");
  details.append(createTextElement("h4", "person-name", person.name));
  if (person.title) {
    details.append(createTextElement("p", "person-title", person.title));
  }

  card.append(details);
  return card;
}

function renderFounder(founder) {
  const profile = document.querySelector("#founder-profile");
  if (!profile) throw new Error("The About page founder profile container is missing.");

  const portrait = document.createElement("figure");
  portrait.className = "founder-portrait";
  portrait.dataset.reveal = "";
  portrait.append(createImage(`../images/profile/${founder.image}`, `Portrait of ${founder.name}`));

  const details = document.createElement("div");
  details.dataset.reveal = "";
  details.append(
    createTextElement("p", "founder-title", founder.title),
    createTextElement("h2", "founder-name", founder.name),
  );

  if (Array.isArray(founder.highlights)) {
    const points = document.createElement("ul");
    points.className = "founder-points";
    founder.highlights.forEach((point) => points.append(createTextElement("li", "", point)));
    details.append(points);
  }

  // the full biography stays available, folded away so the page reads in lines
  const more = document.createElement("details");
  more.className = "founder-more";
  more.append(createTextElement("summary", "link", "Read the full story"));

  const bio = document.createElement("div");
  bio.className = "founder-bio";
  const paragraphs = Array.isArray(founder.bio)
    ? founder.bio
    : founder.bio.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());
  paragraphs.forEach((paragraph) => {
    bio.append(createTextElement("p", "founder-bio-paragraph", paragraph));
  });
  more.append(bio);
  details.append(more);
  profile.append(portrait, details);
}

function renderPartners(partners) {
  const partnerList = document.querySelector("#partner-list");
  if (!partnerList) throw new Error("The About page partner list container is missing.");

  partners.forEach((partner) => {
    const card = document.createElement("article");
    card.className = "partner";
    card.dataset.reveal = "";

    // Entries without a logo show their name instead.
    if (partner.logo) {
      card.append(createImage(`../images/logo/${partner.logo}`, `${partner.name} logo`));
    } else {
      card.textContent = partner.name;
    }

    partnerList.append(card);
  });
}

function renderCouncil(council) {
  const list = document.querySelector("#council-list");
  if (!list) return;

  council.forEach((member) => {
    const card = document.createElement("article");
    card.className = "council-member";
    card.dataset.zoom = "";

    if (member.image) {
      const portrait = document.createElement("figure");
      portrait.className = "council-portrait";
      portrait.append(
        createImage(`../images/profile/${member.image}`, `Portrait of ${member.name}`),
      );
      card.append(portrait);
    }

    const body = document.createElement("div");
    body.className = "council-body";
    body.append(createTextElement("h3", "council-name", member.name));

    card.append(body);
    list.append(card);
  });
}

function renderAdvisors(advisors) {
  const list = document.querySelector("#advisor-list");
  if (!list) return;

  advisors.forEach((advisor) => {
    const card = createPersonCard(advisor);
    card.classList.add("advisor");
    card.dataset.reveal = "";
    list.append(card);
  });
}

function renderTeams(teams, people) {
  if (!peopleDirectory) throw new Error("The About page people directory container is missing.");

  const teamIds = new Set(teams.map((team) => team.id));
  const unmatchedPeople = people.filter((person) => !teamIds.has(person.team));
  if (unmatchedPeople.length > 0) {
    throw new Error(
      `People refer to unknown teams: ${unmatchedPeople.map((person) => person.name).join(", ")}`,
    );
  }

  teams.forEach((team) => {
    const section = document.createElement("section");
    section.className = "split team";
    section.dataset.reveal = "";
    section.setAttribute("aria-labelledby", `people-team-${team.id}`);

    const heading = createTextElement("h3", "team-name", team.name);
    heading.id = `people-team-${team.id}`;

    const members = document.createElement("ul");
    members.className = "team-members";
    people
      .filter((person) => person.team === team.id)
      .forEach((person) => members.append(createPersonCard(person)));

    section.append(heading, members);
    peopleDirectory.append(section);
  });
}

async function loadPeopleDirectory() {
  if (!peopleDirectory) return;

  const response = await fetch("../assets/people-data.json?v=5");
  if (!response.ok) {
    throw new Error(`Could not load the About page roster: ${response.status}`);
  }

  const data = await response.json();
  if (
    !data.founder ||
    !Array.isArray(data.partners) ||
    !Array.isArray(data.teams) ||
    !Array.isArray(data.people)
  ) {
    throw new Error("The About page roster data is incomplete.");
  }

  renderFounder(data.founder);
  renderPartners(data.partners);
  renderCouncil(data.council || []);
  renderAdvisors(data.advisors || []);
  renderTeams(data.teams, data.people);
  window.adrasteaRefreshScrollEffects?.();
}

loadPeopleDirectory().catch((error) => {
  console.error("Unable to render the About page directory.", error);
});
