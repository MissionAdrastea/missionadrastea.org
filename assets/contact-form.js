const contactForm = document.querySelector(".contact-form");

if (contactForm) {
  const requestTypeSelect = contactForm.querySelector("#contact-request-type");
  const joiningTeamSelect = contactForm.querySelector("#contact-joining-team");
  const applicationDetails = contactForm.querySelector("[data-application-details]");
  const status = contactForm.querySelector(".contact-form-status");
  const submitButton = contactForm.querySelector(".contact-submit");
  let sending = false;

  function updateConditionalFields() {
    const isApplication =
      requestTypeSelect.value === "Student/Research Application" ||
      joiningTeamSelect.value === "Yes";
    applicationDetails.hidden = !isApplication;
    applicationDetails.disabled = !isApplication;
  }

  // state is "sending", "success" or "error"; the stylesheet colours the message from it
  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  // A result belongs to the submission that produced it. It goes as soon as the visitor edits the
  // form again, and when the page is restored from the back/forward cache, so "Thank you" is only
  // ever on screen straight after an inquiry was confirmed as saved.
  function clearStatus() {
    if (sending) return;
    status.textContent = "";
    delete status.dataset.state;
  }

  contactForm.addEventListener("input", clearStatus);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) clearStatus();
  });

  requestTypeSelect.addEventListener("change", updateConditionalFields);
  joiningTeamSelect.addEventListener("change", updateConditionalFields);
  updateConditionalFields();

  // The form is sent with fetch so the page can read the service's answer and only say "sent" when
  // the service confirms it saved the inquiry. Without JavaScript the form still posts normally.
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;

    const honeypot = contactForm.elements.namedItem("website_check");
    if (honeypot.value.trim()) {
      setStatus("We couldn’t send your message. Please check the form and try again.", "error");
      return;
    }

    sending = true;
    submitButton.disabled = true;
    setStatus("Sending your inquiry…", "sending");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);

    try {
      // URL-encoded keeps this a "simple" request, which the form service accepts across origins.
      // Fields inside the hidden application fieldset are disabled, so they are left out.
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: new URLSearchParams(new FormData(contactForm)),
        signal: controller.signal,
      });

      let result = null;
      try {
        result = JSON.parse(await response.text());
      } catch {
        // not JSON: handled below as an unconfirmed answer
      }

      if (response.ok && result?.ok === true) {
        contactForm.reset();
        updateConditionalFields();
        setStatus(
          "Thank you. Your inquiry has reached our team, and we’ll reply to the email address you gave.",
          "success",
        );
      } else if (result?.ok === false) {
        setStatus(
          result.message ||
            "The form service couldn’t accept your inquiry. Please check your answers and try again.",
          "error",
        );
      } else {
        setStatus(
          "The form service answered, but didn’t confirm that your inquiry was saved. Please try again in a moment.",
          "error",
        );
      }
    } catch (error) {
      setStatus(
        error.name === "AbortError"
          ? "The form service took too long to answer, so we can’t confirm your inquiry was sent. Your answers are still in the form; please try again."
          : "We couldn’t reach the form service, so your inquiry was not sent. Your answers are still in the form. Please try again, or message us on LinkedIn or Instagram using the links below.",
        "error",
      );
    } finally {
      window.clearTimeout(timeout);
      sending = false;
      submitButton.disabled = false;
    }
  });
}
