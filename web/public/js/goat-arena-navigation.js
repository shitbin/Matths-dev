(() => {
  const mailbox = document.querySelector("[data-arena-mailbox]");
  if (mailbox) {
    const toggle = mailbox.querySelector("[data-arena-mailbox-toggle]");
    const panel = mailbox.querySelector("[data-arena-mailbox-panel]");
    if (toggle && panel) {
      const closeMailbox = () => {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      };
      toggle.addEventListener("click", () => {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", String(willOpen));
      });
      document.addEventListener("click", (event) => {
        if (!mailbox.contains(event.target)) closeMailbox();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMailbox();
      });
    }
  }

  const mobileToggle = document.querySelector("[data-arena-mobile-more-toggle]");
  const mobilePanel = document.querySelector("[data-arena-mobile-more-panel]");
  if (!mobileToggle || !mobilePanel) return;

  const closeMobileMenu = ({ restoreFocus = false } = {}) => {
    mobilePanel.hidden = true;
    mobileToggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) mobileToggle.focus();
  };
  mobileToggle.addEventListener("click", () => {
    const willOpen = mobilePanel.hidden;
    mobilePanel.hidden = !willOpen;
    mobileToggle.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) mobilePanel.querySelector("a")?.focus();
  });
  document.addEventListener("click", (event) => {
    if (!mobileToggle.contains(event.target) && !mobilePanel.contains(event.target)) {
      closeMobileMenu();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobilePanel.hidden) {
      closeMobileMenu({ restoreFocus: true });
    }
  });
})();
