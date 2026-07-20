const siteData = window.EBOOST_SITE;
const form = document.querySelector("#teslaQuoteForm");
const successPanel = document.querySelector("#quoteSuccess");
const submitButton = document.querySelector("#quoteSubmit");
const googleFormAction = "https://docs.google.com/forms/d/e/1FAIpQLSfZxx1X7Rmlh3PdwFJ1lSG7AkcItTSLM_95immAk_moAoJz2w/formResponse";
const googleFormEntries = {
  name: "entry.2096154645",
  contact: "entry.483048131",
  service: "entry.658611731",
  note: "entry.1448401652",
};

function fillSelect(selectId, options) {
  const select = document.querySelector(selectId);
  select.innerHTML = options.map((option) => `<option value="${option}">${option}</option>`).join("");
}

function renderServices() {
  const container = document.querySelector("#serviceCheckboxes");
  container.innerHTML = siteData.quoteOptions.services
    .map((service) => `
      <label class="checkbox-pill">
        <input type="checkbox" name="services" value="${service}" />
        <span>${service}</span>
      </label>
    `)
    .join("");
}

function applyPlanFromUrl() {
  const planId = new URLSearchParams(window.location.search).get("plan");
  if (!planId) return;

  const plan = siteData.teslaPlans.find((item) => item.id === planId);
  if (!plan) return;

  const note = form.elements.note;
  note.value = `我想了解「${plan.name}」：${plan.bestFor}`;
}

function collectQuotePayload() {
  const formData = new FormData(form);
  return {
    name: formData.get("name"),
    phone: formData.get("phone"),
    lineId: formData.get("lineId"),
    model: formData.get("model"),
    year: formData.get("year"),
    color: formData.get("color"),
    deliveryStatus: formData.get("deliveryStatus"),
    deliveryDate: formData.get("deliveryDate"),
    area: formData.get("area"),
    services: formData.getAll("services"),
    budget: formData.get("budget"),
    pickup: formData.get("pickup"),
    note: formData.get("note"),
    createdAt: new Date().toISOString(),
  };
}

async function submitQuote(payload) {
  const googlePayload = new FormData();
  googlePayload.append(googleFormEntries.name, payload.name);
  googlePayload.append(googleFormEntries.contact, `${payload.phone} / LINE: ${payload.lineId || "未填"}`);
  googlePayload.append(googleFormEntries.service, payload.services.join("、"));
  googlePayload.append(googleFormEntries.note, [
    `車型：${payload.model}`,
    `年份：${payload.year || "未填"}`,
    `車色：${payload.color || "未填"}`,
    `交車狀態：${payload.deliveryStatus}`,
    `預計交車日期：${payload.deliveryDate || "未填"}`,
    `所在區域：${payload.area || "未填"}`,
    `預算區間：${payload.budget}`,
    `是否需要接送車：${payload.pickup}`,
    `備註：${payload.note || "未填"}`,
  ].join("\n"));

  window.localStorage.setItem("eboost_last_tesla_quote", JSON.stringify(payload));
  await fetch(googleFormAction, {
    method: "POST",
    mode: "no-cors",
    body: googlePayload,
  });

  return { ok: true };
}

fillSelect("#modelSelect", siteData.quoteOptions.models);
fillSelect("#deliveryStatusSelect", siteData.quoteOptions.deliveryStatus);
fillSelect("#budgetSelect", siteData.quoteOptions.budgets);
fillSelect("#pickupSelect", siteData.quoteOptions.pickup);
renderServices();
applyPlanFromUrl();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (form.elements.company.value) return;
  if (!form.reportValidity()) return;

  const selectedServices = form.querySelectorAll('input[name="services"]:checked');
  if (!selectedServices.length) {
    alert("請至少選擇一個希望施工項目。");
    return;
  }

  submitButton.textContent = "送出中...";
  submitButton.disabled = true;

  try {
    const result = await submitQuote(collectQuotePayload());
    if (!result.ok) throw new Error("送出失敗");

    trackEBoostEvent("submit_tesla_quote_form", {
      form_id: "teslaQuoteForm",
    });

    form.hidden = true;
    successPanel.hidden = false;
    successPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    alert("送出時發生問題，請改用 LINE 或電話聯絡我們。");
    submitButton.textContent = "送出 Tesla 施工詢問";
    submitButton.disabled = false;
  }
});
