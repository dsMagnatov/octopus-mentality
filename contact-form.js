(() => {
  const STORAGE_KEY = "octopus-mentality:contact-draft:v1";
  const FIELD_NAMES = ["name", "email", "project", "message"];

  const initContactForm = () => {
    const form = document.querySelector("#contact-form");
    const status = document.querySelector("#contact-status");
    if (!form || !status) return;

    const fields = Object.fromEntries(
      FIELD_NAMES.map((fieldName) => [
        fieldName,
        form.querySelector(`[name="${fieldName}"]`),
      ])
    );
    if (FIELD_NAMES.some((fieldName) => !fields[fieldName])) return;

    fields.name.required = true;
    fields.email.required = true;
    fields.email.type = "email";
    fields.message.required = true;
    form.noValidate = false;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");

    const showStatus = (message) => {
      status.textContent = message;
    };

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (
        saved &&
        FIELD_NAMES.every((fieldName) => typeof saved[fieldName] === "string")
      ) {
        for (const fieldName of FIELD_NAMES) {
          if (!fields[fieldName].value) fields[fieldName].value = saved[fieldName];
        }
        showStatus(
          "Your saved idea has been restored on this device. It has not been sent yet."
        );
      }
    } catch {
      // Browsers can block local storage; the form still remains usable.
    }

    form.addEventListener("input", () => {
      showStatus("Changes are not saved yet. Your message has not been sent.");
    });

    form.addEventListener(
      "invalid",
      () => {
        showStatus(
          "Please complete the required fields and enter a valid email. Nothing has been sent."
        );
      },
      true
    );

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      for (const fieldName of FIELD_NAMES) {
        fields[fieldName].value = fields[fieldName].value.trim();
      }
      if (!form.reportValidity()) return;

      const draft = Object.fromEntries(
        FIELD_NAMES.map((fieldName) => [fieldName, fields[fieldName].value])
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        showStatus(
          "Your idea is saved on this device. It has not been sent yet."
        );
      } catch {
        showStatus(
          "This browser could not save your idea. It has not been sent. Please copy it before leaving this page."
        );
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactForm, { once: true });
  } else {
    initContactForm();
  }
})();
