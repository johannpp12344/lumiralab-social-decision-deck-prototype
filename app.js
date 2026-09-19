const STORAGE_KEY = "lumira-social-decision-deck:v3";
const SWIPE_THRESHOLD_X = 150;
const SWIPE_THRESHOLD_Y = 120;
const ACTIVATION_DISTANCE = 20;
const testMode = new URLSearchParams(window.location.search).get("test") === "1";

const cards = [
  {
    id: "schimmelanalyse",
    format: "INSTAGRAM · CAROUSEL",
    kicker: "CLAIM-CHECK OFFEN",
    question: "Soll ich daraus ein Carousel zur Textprüfung machen?",
    reason: "Der Draft hat eine LumiraLab-Quelle. Bild und Claim müssen vor Produktion noch geprüft werden.",
    copy: "Von der Oberflächenprobe bis zum verständlichen Befund: Schimmel gezielt einordnen.",
    nextStep: "Hermes erstellt zuerst den Text- und Claim-Check. Es wird nichts veröffentlicht.",
    prepareLabel: "Ja, Textprüfung",
    sourceText: "Quelle: LumiraLab beschreibt Schimmelanalyse, Oberflächenproben und das MycoPatch-Diagnoseverfahren.",
    assetNote: "Für die Produktion ein echtes, freigegebenes Labor- oder MycoPatch-Asset einsetzen.",
    sourceUrl: "https://lumiralab.de/"
  },
  {
    id: "fuenf-schritte",
    format: "INSTAGRAM · EDUCATION",
    kicker: "EDUCATION-DRAFT",
    question: "Soll ich daraus einen Education-Post ausarbeiten?",
    reason: "Die Website hat bereits einen klaren Ablauf. Der nächste Schritt wäre ein verständlicher Social-Entwurf.",
    copy: "Beratung → Probennahme → Einsendung → Analyse → Befund & Bericht.",
    nextStep: "Hermes baut daraus eine sachliche Carousel-Struktur. Veröffentlichung bleibt gesperrt.",
    prepareLabel: "Ja, Post ausarbeiten",
    sourceText: "Quelle: LumiraLab nennt diese fünf Schritte auf der Seite zu Analyseleistungen.",
    assetNote: "Vor Produktion prüfen: Reihenfolge, Wortwahl und passendes Originalbild.",
    sourceUrl: "https://lumiralab.de/"
  },
  {
    id: "formaldehyd-voc",
    format: "INSTAGRAM · EXPLAINER",
    kicker: "QUELLE VORHANDEN",
    question: "Soll ich den Formaldehyd-/VOC-Entwurf sachlich vorbereiten?",
    reason: "Thema und Leistungsbeschreibung sind vorhanden. Die Formulierung darf keine unbelegten Wirkversprechen enthalten.",
    copy: "Formaldehyd & VOC gezielt prüfen: von der Fragestellung zur passenden Analyse.",
    nextStep: "Hermes erstellt eine vorsichtige Textfassung mit markierten Prüfstellen.",
    prepareLabel: "Ja, Text vorbereiten",
    sourceText: "Quelle: LumiraLab beschreibt Formaldehyd- und VOC-Analysen mit Absorbern, Testkits und Probenahme.",
    assetNote: "Keine Gesundheits- oder Rechtsversprechen ergänzen, die nicht belegt sind.",
    sourceUrl: "https://lumiralab.de/"
  },
  {
    id: "original-asset",
    format: "INSTAGRAM · BILD",
    kicker: "ASSET FEHLT",
    question: "Soll diese Karte warten, bis ein Original-Asset vorliegt?",
    reason: "Der Text ist prüfbar, aber das Bild wäre aktuell nur ein Platzhalter.",
    copy: "Klarheit entsteht, wenn Ergebnis und echte Laborarbeit zusammenpassen.",
    nextStep: "Hermes lässt den Text liegen und wartet auf ein freigegebenes Originalbild.",
    prepareLabel: "Ja, auf Bild warten",
    sourceText: "Prüfhinweis: Für ein finales Social-Motiv soll ein echtes, freigegebenes LumiraLab-Asset verwendet werden.",
    assetNote: "Kein KI-Ersatzbild als finale Produktionsquelle verwenden.",
    sourceUrl: "https://lumiralab.de/"
  },
  {
    id: "claim-review",
    format: "INSTAGRAM · REVIEW",
    kicker: "FACHLICHE PRÜFUNG",
    question: "Soll dieser Draft bis zur fachlichen Prüfung zurückgestellt werden?",
    reason: "Der Inhalt kann als Entwurf weiterleben, aber die fachliche Aussagegrenze ist noch nicht bestätigt.",
    copy: "Erst die Fragestellung klären, dann gezielt prüfen und verständlich einordnen.",
    nextStep: "Hermes markiert die offenen Stellen und legt den Draft zur fachlichen Prüfung vor.",
    prepareLabel: "Ja, Prüfung vormerken",
    sourceText: "Quelle: LumiraLab beschreibt eine zielgerichtete Messstrategie und verständliche Einordnung.",
    assetNote: "Fachliche Freigabe bleibt bei Johann.",
    sourceUrl: "https://lumiralab.de/"
  }
];

const baseState = () => ({
  index: 0,
  decisions: {},
  events: [],
  rating: null,
  lastDecision: null,
  busy: false
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return baseState();
    return {
      ...baseState(),
      ...saved,
      decisions: saved.decisions && typeof saved.decisions === "object" ? saved.decisions : {},
      events: Array.isArray(saved.events) ? saved.events : []
    };
  } catch {
    return baseState();
  }
}

let state = loadState();
let lastViewedId = null;
let feedbackTimer = null;
let drag = null;

const els = {
  card: document.querySelector("#decisionCard"),
  emptyState: document.querySelector("#emptyState"),
  handle: document.querySelector("#swipeHandle"),
  swipeFeedback: document.querySelector("#swipeFeedback"),
  formatChip: document.querySelector("#formatChip"),
  cardIndex: document.querySelector("#cardIndex"),
  cardKicker: document.querySelector("#cardKicker"),
  decisionQuestion: document.querySelector("#decisionQuestion"),
  cardReason: document.querySelector("#cardReason"),
  cardCopy: document.querySelector("#cardCopy"),
  nextStep: document.querySelector("#nextStep"),
  sourceToggle: document.querySelector("#sourceToggle"),
  sourceToggleLabel: document.querySelector("#sourceToggleLabel"),
  sourcePanel: document.querySelector("#sourcePanel"),
  sourceText: document.querySelector("#sourceText"),
  sourceLink: document.querySelector("#sourceLink"),
  assetNote: document.querySelector("#assetNote"),
  progressLabel: document.querySelector("#progressLabel"),
  progressBar: document.querySelector("#progressBar"),
  feedback: document.querySelector("#feedback"),
  feedbackText: document.querySelector("#feedbackText"),
  undoButton: document.querySelector("#undoButton"),
  summaryGrid: document.querySelector("#summaryGrid"),
  resetButton: document.querySelector("#resetButton"),
  testPanel: document.querySelector("#testPanel"),
  testModeBadge: document.querySelector("#testModeBadge"),
  copyReport: document.querySelector("#copyReport"),
  copyStatus: document.querySelector("#copyStatus")
};

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function logEvent(type, details = {}) {
  if (!testMode) return;
  state.events.push({ at: new Date().toISOString(), type, ...details });
  if (state.events.length > 300) state.events = state.events.slice(-300);
  persist();
}

function currentCard() {
  return cards[state.index] || null;
}

function render() {
  const card = currentCard();
  const cardParts = els.card.querySelectorAll(".card-head, .asset-placeholder, .card-body, .swipe-handle");
  els.testPanel.hidden = !testMode;

  if (!card) {
    cardParts.forEach((part) => { part.hidden = true; });
    els.emptyState.hidden = false;
    els.card.classList.add("is-empty");
    document.querySelector(".action-dock").hidden = true;
    els.progressLabel.textContent = `${cards.length} von ${cards.length}`;
    els.progressBar.style.width = "100%";
    renderSummary();
    renderTestPanel();
    return;
  }

  cardParts.forEach((part) => { part.hidden = false; });
  els.emptyState.hidden = true;
  els.card.classList.remove("is-empty");
  document.querySelector(".action-dock").hidden = false;
  document.querySelectorAll("[data-action]").forEach((button) => { button.disabled = Boolean(state.busy); });

  if (lastViewedId !== card.id) {
    logEvent("view", { cardId: card.id, index: state.index });
    lastViewedId = card.id;
  }

  els.formatChip.textContent = card.format;
  els.cardIndex.textContent = String(state.index + 1).padStart(2, "0");
  els.cardKicker.textContent = card.kicker;
  els.decisionQuestion.textContent = card.question;
  els.cardReason.textContent = card.reason;
  els.cardCopy.textContent = card.copy;
  els.nextStep.textContent = card.nextStep;
  els.sourceText.textContent = card.sourceText;
  els.sourceLink.href = card.sourceUrl;
  els.assetNote.textContent = card.assetNote;
  document.querySelector("#prepareLabel").textContent = card.prepareLabel;
  els.sourcePanel.hidden = true;
  els.sourceToggle.setAttribute("aria-expanded", "false");
  els.sourceToggleLabel.textContent = "Quelle und Prüfhinweis öffnen";
  els.progressLabel.textContent = `${state.index + 1} von ${cards.length}`;
  els.progressBar.style.width = `${Math.min((state.index / cards.length) * 100 + 20, 100)}%`;
  renderSummary();
  renderTestPanel();
}

function renderSummary() {
  els.summaryGrid.innerHTML = cards.map((card, index) => {
    const decision = state.decisions[card.id];
    const active = index === state.index && currentCard();
    const status = decision ? decision.action : (active ? "offen" : "wartet");
    const labels = { prepare: "weiter", reject: "nein", later: "später", offen: "jetzt", wartet: "wartet" };
    return `<div class="summary-item ${active ? "is-active" : ""} ${decision ? "is-done" : ""}">
      <span class="summary-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="summary-name">${card.format.split(" · ")[1] || "Draft"}</span>
      <span class="summary-status">${labels[status] || status}</span>
    </div>`;
  }).join("");
}

function renderTestPanel() {
  if (!testMode) return;
  document.querySelectorAll("[data-rating]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.rating === state.rating);
  });
}

function showFeedback(message, canUndo = false) {
  clearTimeout(feedbackTimer);
  els.feedbackText.textContent = message;
  els.undoButton.hidden = !canUndo;
  els.feedback.hidden = false;
  feedbackTimer = setTimeout(() => { els.feedback.hidden = true; }, 5000);
}

function actionMessage(action) {
  return {
    prepare: "Vorgemerkt: Der nächste interne Arbeitsschritt ist klar. Nichts veröffentlicht.",
    reject: "Aus diesem Stapel entfernt. Nichts veröffentlicht.",
    later: "Für später gespeichert. Nichts veröffentlicht."
  }[action];
}

function commitDecision(action, origin = "button") {
  const card = currentCard();
  if (!card || state.busy) return;
  state.busy = true;
  state.decisions[card.id] = { action, at: new Date().toISOString() };
  state.lastDecision = { index: state.index, cardId: card.id, action };
  logEvent("decision", { cardId: card.id, action, origin });
  persist();
  showFeedback(actionMessage(action), true);
  els.card.classList.add("is-exiting");
  document.querySelectorAll("[data-action]").forEach((button) => { button.disabled = true; });

  window.setTimeout(() => {
    state.index += 1;
    state.busy = false;
    els.card.classList.remove("is-exiting");
    persist();
    render();
  }, 280);
}

function undoLast() {
  const last = state.lastDecision;
  if (!last || state.index <= last.index) return;
  delete state.decisions[last.cardId];
  state.index = last.index;
  state.lastDecision = null;
  logEvent("undo", { cardId: last.cardId, action: last.action });
  persist();
  els.feedback.hidden = true;
  lastViewedId = null;
  render();
}

function resetDemo() {
  state = baseState();
  lastViewedId = null;
  persist();
  els.feedback.hidden = true;
  render();
}

function toggleSource() {
  const open = els.sourcePanel.hidden;
  els.sourcePanel.hidden = !open;
  els.sourceToggle.setAttribute("aria-expanded", String(open));
  els.sourceToggleLabel.textContent = open ? "Quelle und Prüfhinweis schließen" : "Quelle und Prüfhinweis öffnen";
  if (open && currentCard()) logEvent("source_open", { cardId: currentCard().id });
}

function actionForDelta(dx, dy, axis) {
  if (axis === "x" && dx >= SWIPE_THRESHOLD_X) return "prepare";
  if (axis === "x" && dx <= -SWIPE_THRESHOLD_X) return "reject";
  if (axis === "y" && dy <= -SWIPE_THRESHOLD_Y) return "later";
  return null;
}

function showSwipePreview(action) {
  const text = {
    prepare: "JA · nächsten Schritt starten",
    reject: "NEIN · nicht weiter",
    later: "SPÄTER · zurücklegen"
  }[action] || "Noch weiter wischen …";
  els.swipeFeedback.textContent = text;
  els.swipeFeedback.className = `swipe-feedback visible ${action || "is-neutral"}`;
}

function startDrag(event) {
  if (state.busy || !currentCard()) return;
  drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, axis: null, moved: false };
  els.handle.setPointerCapture(event.pointerId);
  logEvent("gesture_start", { cardId: currentCard().id });
}

function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  if (distance < ACTIVATION_DISTANCE) return;
  drag.moved = true;
  if (!drag.axis) drag.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
  event.preventDefault();
  const visualX = drag.axis === "x" ? dx * 0.22 : 0;
  const visualY = drag.axis === "y" ? dy * 0.18 : 0;
  const rotate = drag.axis === "x" ? dx * 0.012 : 0;
  els.card.style.transform = `translate(${visualX}px, ${visualY}px) rotate(${rotate}deg)`;
  showSwipePreview(actionForDelta(dx, dy, drag.axis));
}

function finishDrag(event, cancelled = false) {
  if (!drag || (event && event.pointerId !== drag.pointerId)) return;
  const active = drag;
  const dx = event ? event.clientX - active.startX : 0;
  const dy = event ? event.clientY - active.startY : 0;
  const action = cancelled ? null : actionForDelta(dx, dy, active.axis);
  try { els.handle.releasePointerCapture(active.pointerId); } catch {}
  drag = null;
  els.card.style.transform = "";
  els.swipeFeedback.textContent = "";
  els.swipeFeedback.className = "swipe-feedback";

  if (action) {
    logEvent("gesture_commit", { cardId: currentCard().id, action, dx, dy });
    commitDecision(action, "gesture");
  } else if (active.moved) {
    logEvent("gesture_cancel", { cardId: currentCard()?.id || null, dx, dy });
    showFeedback("Noch keine Entscheidung — nutze die drei Buttons oder wische deutlich weiter.");
  }
}

function handleKey(event) {
  if (event.key === "ArrowRight") { event.preventDefault(); commitDecision("prepare", "keyboard"); }
  if (event.key === "ArrowLeft") { event.preventDefault(); commitDecision("reject", "keyboard"); }
  if (event.key === "ArrowUp") { event.preventDefault(); commitDecision("later", "keyboard"); }
}

function buildReport() {
  const decisions = cards.map((card) => {
    const decision = state.decisions[card.id];
    return `${card.id}: ${decision ? decision.action : "offen"}`;
  }).join("\n");
  const counts = state.events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});
  return [
    "LumiraLab Social Check — Usability-Test",
    `Zeitpunkt: ${new Date().toLocaleString("de-DE")}`,
    `Klarheit: ${state.rating || "nicht bewertet"}`,
    "",
    "Entscheidungen:",
    decisions,
    "",
    "Interaktionsdaten:",
    JSON.stringify(counts),
    "",
    "Keine Veröffentlichung ausgelöst."
  ].join("\n");
}

async function copyReport() {
  const report = buildReport();
  try {
    await navigator.clipboard.writeText(report);
    els.copyStatus.textContent = "Testbericht kopiert — in Slack einfügen.";
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = report;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    els.copyStatus.textContent = "Testbericht kopiert — in Slack einfügen.";
  }
}

els.sourceToggle.addEventListener("click", toggleSource);
els.undoButton.addEventListener("click", undoLast);
els.resetButton.addEventListener("click", resetDemo);
els.emptyState.querySelector(".reset-main").addEventListener("click", resetDemo);
els.handle.addEventListener("pointerdown", startDrag);
els.handle.addEventListener("pointermove", moveDrag);
els.handle.addEventListener("pointerup", finishDrag);
els.handle.addEventListener("pointercancel", (event) => finishDrag(event, true));
els.handle.addEventListener("keydown", handleKey);
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => commitDecision(button.dataset.action, "button"));
});
document.querySelectorAll("[data-rating]").forEach((button) => {
  button.addEventListener("click", () => {
    state.rating = button.dataset.rating;
    logEvent("rating", { rating: state.rating });
    persist();
    renderTestPanel();
  });
});
els.copyReport.addEventListener("click", copyReport);

if (testMode) els.testModeBadge.hidden = false;
if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
render();
