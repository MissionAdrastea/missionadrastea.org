const peopleDirectory = document.querySelector("#people-directory");

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createPersonCard(person) {
  const card = document.createElement("article");
  const isDirector = person.title.toLowerCase() === "director";
  card.className = isDirector ? "people-card people-card--director" : "people-card";

  if (isDirector && person.image) {
    const portrait = document.createElement("span");
    portrait.className = "people-card-portrait";

    const image = document.createElement("img");
    image.className = "people-card-image";
    image.src = `../images/profile/${person.image}`;
    image.alt = "";
    image.loading = "lazy";
    portrait.append(image);
    card.append(portrait);
  }

  const details = document.createElement("div");
  details.className = "people-card-details";
  details.append(
    createTextElement("h3", "people-card-name", person.name),
    createTextElement("p", "people-card-title", person.title),
  );

  if (person.bio) {
    details.append(createTextElement("p", "people-card-bio", person.bio));
  }

  card.append(details);
  return card;
}

function renderFounder(founder) {
  const profile = document.querySelector("#founder-profile");
  if (!profile) throw new Error("The About page founder profile container is missing.");

  const portrait = document.createElement("img");
  portrait.className = "founder-portrait";
  portrait.src = `../images/profile/${founder.image}`;
  portrait.alt = `Portrait of ${founder.name}`;
  portrait.loading = "lazy";
  portrait.decoding = "async";

  const details = document.createElement("div");
  details.className = "founder-details";
  details.append(
    createTextElement("p", "founder-title", founder.title),
    createTextElement("h2", "founder-name", founder.name),
  );

  const bio = document.createElement("div");
  bio.className = "founder-bio";
  const paragraphs = Array.isArray(founder.bio)
    ? founder.bio
    : founder.bio.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());
  paragraphs.forEach((paragraph) => {
    bio.append(createTextElement("p", "founder-bio-paragraph", paragraph));
  });
  details.append(bio);
  profile.append(portrait, details);
}

function renderPartners(partners) {
  const partnerList = document.querySelector("#partner-list");
  if (!partnerList) throw new Error("The About page partner list container is missing.");

  partners.forEach((partner) => {
    const card = document.createElement("article");
    card.className = "partner-card";

    if (partner.logo) {
      const logo = document.createElement("img");
      logo.className = "partner-logo";
      logo.src = `../images/logo/${partner.logo}`;
      logo.alt = `${partner.name} logo`;
      logo.loading = "lazy";
      logo.decoding = "async";
      card.append(logo);
    }

    partnerList.append(card);
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
    section.className = "people-team";
    section.setAttribute("aria-labelledby", `people-team-${team.id}`);

    const heading = createTextElement("h2", "people-team-title", team.name);
    heading.id = `people-team-${team.id}`;

    const members = document.createElement("div");
    members.className = "people-team-members";
    people
      .filter((person) => person.team === team.id)
      .forEach((person) => members.append(createPersonCard(person)));

    section.append(heading, members);
    peopleDirectory.append(section);
  });
}

async function loadPeopleDirectory() {
  if (!peopleDirectory) return;

  const response = await fetch("../assets/people-data.json?v=2");
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
  renderTeams(data.teams, data.people);
  window.adrasteaRefreshScrollEffects?.();
}

loadPeopleDirectory().catch((error) => {
  console.error("Unable to render the About page directory.", error);
});
