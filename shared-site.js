(function hydrateSharedSiteData() {
  const config = window.EBOOST_SITE_CONFIG;
  if (!config?.company) return;

  const values = {
    version: config.version,
    companyName: config.company.name,
    shortName: config.company.shortName,
    positioning: config.company.positioning,
    address: config.company.address,
    phone: config.company.phone,
  };

  const linkMap = {
    phone: `tel:${config.company.phone}`,
    line: config.company.lineUrl,
    facebook: config.company.facebook,
    instagram: config.company.instagram,
    tiktok: config.company.tiktok,
    maps: config.company.mapsUrl,
  };

  document.querySelectorAll("[data-site-text]").forEach((element) => {
    const key = element.dataset.siteText;
    const value = values[key];
    if (!value) return;

    element.textContent = `${element.dataset.sitePrefix || ""}${value}${element.dataset.siteSuffix || ""}`;
  });

  document.querySelectorAll("[data-site-link]").forEach((element) => {
    const key = element.dataset.siteLink;
    const href = linkMap[key];
    if (!href) return;

    element.setAttribute("href", href);
    if (key !== "phone") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer");
    }
  });
})();
