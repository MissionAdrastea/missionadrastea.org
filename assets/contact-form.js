const contactForm = document.querySelector(".contact-form");

if (contactForm) {
  const requestTypeSelect = contactForm.querySelector("#contact-request-type");
  const joiningTeamSelect = contactForm.querySelector("#contact-joining-team");
  const applicationDetails = contactForm.querySelector("[data-application-details]");
  const status = contactForm.querySelector(".contact-form-status");
  const submitButton = contactForm.querySelector(".contact-submit");
  const responseFrame = document.querySelector('[name="contact-form-response"]');
  let awaitingResponse = false;
  let responseTimeout;

  function updateConditionalFields() {
    const isApplication =
      requestTypeSelect.value === "Student/Research Application" ||
      joiningTeamSelect.value === "Yes";
    applicationDetails.hidden = !isApplication;
    applicationDetails.disabled = !isApplication;
  }

  requestTypeSelect.addEventListener("change", updateConditionalFields);
  joiningTeamSelect.addEventListener("change", updateConditionalFields);
  updateConditionalFields();

  contactForm.addEventListener("submit", (event) => {
    const honeypot = contactForm.elements.namedItem("website_check");
    if (honeypot.value.trim()) {
      event.preventDefault();
      status.textContent = "We couldn’t send your message. Please check the form and try again.";
      return;
    }

    awaitingResponse = true;
    submitButton.disabled = true;
    status.textContent = "Sending your inquiry…";
    window.clearTimeout(responseTimeout);
    responseTimeout = window.setTimeout(() => {
      if (!awaitingResponse) return;
      awaitingResponse = false;
      submitButton.disabled = false;
      status.textContent =
        "We couldn’t confirm a response from the submission service. Your information is still in the form; please try again later.";
    }, 30000);
  });

  responseFrame.addEventListener("load", () => {
    if (!awaitingResponse) return;
    awaitingResponse = false;
    window.clearTimeout(responseTimeout);
    submitButton.disabled = false;
    status.textContent =
      "The submission service responded, but this page can’t verify whether your information was saved. If you were asked to sign in or saw an error, your inquiry may not have reached our team.";
  });
}
