# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Being rebuilt as a React app (Vite), using React Bits components and the Motion animation library
(formerly Framer Motion), deployed to GitHub Pages at the custom domain missionadrastea.org.
Confirmed by the owner on 2026-10-21; the current site is plain static HTML/CSS/JS with no build step.
The Framer site builder was considered and not chosen: the site stays a code project in GitHub.

## Users

In order of weight, confirmed by the owner:

1. **Sponsors and funders**: organisations deciding whether Adrastea is credible enough to fund or
   support in kind (funding, aerospace connections, expert mentorship, in-kind support).
2. **Partners and experts**: universities, labs, clinicians, mentors and advisors deciding whether to
   collaborate.
3. **People joining** (a minor focus): anyone at any stage, from students to early-career researchers
   and professionals, choosing a division to apply to. There is no age or education requirement.

## Product Purpose

Adrastea is a youth-led accelerator and collaboration hub advancing women in space through research
and advocacy: "Equipping women to better access, endure & thrive in space." It works on women's
health and space medicine through four divisions (Health & Physiology, Bioengineering & Technology,
Policy & Advocacy, Scientific Media & Marketing). Success for the website: a sponsor or partner trusts
the organisation, then gets in touch.

## Positioning

From the site's own copy:

- Conducts original research, not only awareness or networking.
- Addresses women's health across the lifespan, not only among students.
- Youth-led and built to scale, bringing in younger fellows as leaders move on.
- Translates findings for the public through media, not only paywalled publications.
- "Closing the sex gap in aerospace."

## Operating Context

- Every inquiry arrives through the contact form, which a Google Apps Script web app saves as a row
  in the "Inquiries" tab of a Google Sheet. There is no other contact channel on the site today.
- Links can preset the form: `contact.html?type=sponsorship`, `?type=application&division=<slug>`.
- Email alerts for new inquiries are built but switched off.
- The repository is public; private details (such as the alert address) live only in Apps Script.

## Capabilities and Constraints

- Four pages: home, divisions, about (roster), contact.
- The roster (founder, Astronaut Advisory Council, advisors, teams, partners) lives in
  `assets/people-data.json`.
- Clean addresses (`/about`, not `/about.html`) on GitHub Pages; old `/page/...` and `.html` links
  must keep arriving.
- Open decision: a partnerships email address for the site (the owner will supply it).
- Open decision: what sponsorship specifically funds (the owner has not supplied figures or tiers).

## Brand Commitments

- Name "Adrastea"; tagline "ad astra, for all."; logo `images/general/emblem.jpg` (astronaut helmet in
  an orbit ring, brand purple).
- Voice: concrete and plain, naming real projects (for example a microgravity menstrual cup,
  satellite maps of period poverty) rather than generic aspiration.

## Evidence on Hand

- Named people with portraits: founder, three Astronaut Advisory Council members, three advisors,
  17 team members (`assets/people-data.json`, `images/profile/`).
- Partner logos for 4 institutions and a list of institutions worked with (`images/logo/`).
- Real division projects with descriptions (`div.html`), including a 2029 analog research project.
- A history timeline of women in spaceflight with archival photographs (`images/history/`).
- Space imagery courtesy of NASA and partner missions (use must not imply endorsement).
- Absent, and not to be invented: testimonials, funding amounts or tiers, impact statistics,
  publication lists, press coverage.
- Unresolved inconsistencies: the site says "About 30 members" over 17 rendered profiles, and the
  lists of institutions differ between pages.

## Product Principles

1. **Earn trust, then ask.** Every page proves legitimacy with real people, credentials, institutions
   and projects before asking a sponsor or partner to get in touch.
2. **Sponsors and partners first.** Their path is the clearest one; joining remains available but
   secondary.
3. **Never claim more than the evidence.** Show what exists; leave gaps as gaps rather than filling
   them with invented numbers or quotes.
4. **One channel, honestly handled.** The contact form is the only door, and it only says "sent" when
   the inquiry is saved.
