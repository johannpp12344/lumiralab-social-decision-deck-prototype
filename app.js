const STORAGE_KEY = "lumira-social-decision-deck:v2";
const SWIPE_THRESHOLD_X = 150;
const SWIPE_THRESHOLD_Y = 120;
const ACTIVATION_DISTANCE = 20;

const cards = [
  {
    id: "schimmelanalyse",
    format: "INSTAGRAM · CAROUSEL",
    kicker: "CLAIM-CHECK OFFEN",
    question: "Soll ich daraus ein Carousel zur Textprüfung machen?",
    reason: "Der Draft hat eine Quelle, aber Bild- und Claim-Prüfung sind noch offen.",
    copy: "Von der Oberflächenprobe bis zum verständlichen Befund: Schimmel gezielt einordnen.",
    nextStep: "Ich strukturiere zuerst Text, Claim und Quellenhinweis. Es wird nichts veröffentlicht.",
    prepareLabel: "Ja, Textprüfung",
    source: "LumiraLab beschreibt Schimmelanalyse, MycoPatch-Diagnostik und verständliche Empfehlungen auf der Live-Website.",
    sourceUrl: "https://lumiralab.de/",
    assetNote: "Originales MycoPatch- oder Laborfoto aus Drive einsetzen; die blaue Fläche ist nur ein Platzhalter.",
  },
  {
    id: "fuenf-schritte",
    format: "INSTAGRAM · INFO",
    kicker: "QUELLE VORHANDEN",
    question: "Soll ich den Ablauf als Education-Post ausarbeiten?",
    reason: "Die fünf Schritte sind auf der Website klar vorhanden; die Social-Version braucht nur eine verständliche Dramaturgie.",
    copy: "Beratung → Probennahme → Einsendung → Analyse → Befund & Bericht",
    nextStep: "Ich erstelle einen ruhigen Education-Entwurf mit fünf Karten und einem Quellenhinweis.",
    prepareLabel: "Ja, Education-Entwurf",
    source: "Die fünf Schritte stehen als Ablauf auf der LumiraLab-Website. Copy, Grafik und CTA werden getrennt geprüft.",
    sourceUrl: "https://lumiralab.de/",
    assetNote: "Für das finale Motiv ein echtes Labor-/Probenahme-Asset verwenden; keine generierte Produktdarstellung als Beleg.",
  },
  {
    id: "formaldehyd-voc",
    format: "INSTAGRAM · PRODUCT",
    kicker: "SACHLICH PRÜFEN",
    question: "Soll ich einen sachlichen Produkt-Entwurf vorbereiten?",
    reason: "Die Leistung ist beschrieben, aber Messparameter und Leistungsversprechen dürfen nicht über den Beleg hinausgehen.",
    copy: "Testkits und Probenahme helfen, die Chemikalienbelastung der Luft zu erfassen und Quellen gezielt aufzuspüren.",
    nextStep: "Ich formuliere einen vorsichtigen Entwurf und markiere jede Stelle, die noch einen Claim-Check braucht.",
    prepareLabel: "Ja, Entwurf vorbereiten",
    source: "Die Live-Website beschreibt Formaldehyd- und VOC-Analysen sowie die Kombination aus Probenahme und Laboranalyse.",
    sourceUrl: "https://lumiralab.de/",
    assetNote: "Messparameter, Grenzwerte und Leistungsversprechen erst nach Quellen-/Claim-Ledger ergänzen.",
  },
];

const statusLabels = {
  prepare: "Nächster Arbeitsschritt vorgemerkt",
  reject: "Aus dem Stapel entfernt",
  later: "Für später gespeichert",
};

const state = loadState();
let drag = null;
let lastDecision = null;

const els = {
  card: document.querySelector("#decisionCard"),
  handle: document.querySelector("#swipeHandle"),
  swipeFeedback: document.querySelector("#swipeFeedback"),
  emptyState: document.querySelector("#emptyState"),
  areaChip: document.querySelector("#areaChip"),
  formatChip: document.querySelector("#formatChip"),
  cardIndex: document.querySelector("#cardIndex"),
  cardKicker: document.querySelector("#cardKicker"),
  decisionQuestion: document.querySelector("#decisionQuestion"),
  cardReason: document.querySelector("#cardReason"),
  cardCopy: document.querySelector("#cardCopy"),
  nextStep: document.querySelector("#nextStep"),
  sourceToggle: document.querySelector("#sourceToggle"),
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
  prepareLabel: document.querySelector("#prepareLabel"),
};

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_error) {
    // The prototype remains usable when localStorage is unavailable.
  }
  return { index: 0, decisions: {}, history: [] };
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_error) { /* demo fallback */ }
}

function currentCard() {
  return cards[state.index] || null;
}

function render() {
  const card = currentCard();
  const completed = Object.keys(state.decisions).length;
  els.progressLabel.textContent = card ? `${state.index + 1} / ${cards.length}` : "fertig";
  els.progressBar.style.width = `${Math.min((completed / cards.length) * 100, 100)}%`;
  renderSummary();

  const cardParts = els.card.querySelectorAll(".card-head, .asset-placeholder, .card-body, .swipe-handle");
  if (!card) {
    cardParts.forEach((part) => { part.hidden = true; });
    els.emptyState.hidden = false;
    els.card.classList.add("is-empty");
    document.querySelector(".action-dock").hidden = true;
    return;
  }

  cardParts.forEach((part) => { part.hidden = false; });
  els.emptyState.hidden = true;
  els.card.classList.remove("is-empty");
  document.querySelector(".action-dock").hidden = false;
  els.areaChip.textContent = "LUMIRALAB";
  els.formatChip.textContent = card.format;
  els.cardIndex.textContent = String(state.index + 1).padStart(2, "0");
  els.cardKicker.textContent = card.kicker;
  els.decisionQuestion.textContent = card.question;
  els.cardReason.textContent = card.reason;
  els.cardCopy.textContent = card.copy;
  els.nextStep.textContent = card.nextStep;
  els.prepareLabel.textContent = card.prepareLabel;
  els.sourceText.textContent = card.source;
  els.sourceLink.href = card.sourceUrl;
  els.assetNote.textContent = card.assetNote;
  els.sourcePanel.hidden = true;
  els.sourceToggle.setAttribute("aria-expanded", "false");
  resetCardTransform();
}

function renderSummary() {
  const counts = { prepare: 0, reject: 0, later: 0 };
  Object.values(state.decisions).forEach((action) => { if (counts[action] !== undefined) counts[action] += 1; });
  els.summaryGrid.innerHTML = `
    <div class="summary-item ${counts.prepare ? "is-active" : ""}"><strong>${counts.prepare}</strong><span>nächster Schritt</span></div>
    <div class="summary-item ${counts.later ? "is-active" : ""}"><strong>${counts.later}</strong><span>für später</span></div>
    <div class="summary-item ${counts.reject ? "is-active" : ""}"><strong>${counts.reject}</strong><span>nicht weiter</span></div>`;
}

function toggleSource(event) {
  event.stopPropagation();
  const expanded = els.sourceToggle.getAttribute("aria-expanded") === "true";
  els.sourceToggle.setAttribute("aria-expanded", String(!expanded));
  els.sourcePanel.hidden = expanded;
}

function resetCardTransform() {
  els.card.style.transform = "translate3d(0,0,0) rotate(0deg)";
  els.card.classList.remove("is-dragging", "is-exiting");
  els.swipeFeedback.classList.remove("visible");
  els.swipeFeedback.textContent = "";
}

function actionFromDelta(dx, dy, axis = null) {
  const lockedAxis = axis || (Math.abs(dx) >= Math.abs(dy) ? "x" : "y");
  if (lockedAxis === "x" && Math.abs(dx) >= SWIPE_THRESHOLD_X) return dx > 0 ? "prepare" : "reject";
  if (lockedAxis === "y" && dy <= -SWIPE_THRESHOLD_Y) return "later";
  return null;
}

function labelForAction(action) {
  return { prepare: "JA · NÄCHSTER SCHRITT", reject: "NEIN · NICHT WEITER", later: "SPÄTER" }[action] || "";
}

function startDrag(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, axis: null };
  els.handle.setPointerCapture?.(event.pointerId);
  els.handle.classList.add("is-dragging");
}

function moveDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const rawDx = event.clientX - drag.x;
  const rawDy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(rawDx, rawDy) < ACTIVATION_DISTANCE) return;
  drag.moved = true;
  if (!drag.axis && Math.max(Math.abs(rawDx), Math.abs(rawDy)) >= ACTIVATION_DISTANCE) {
    drag.axis = Math.abs(rawDx) >= Math.abs(rawDy) ? "x" : "y";
  }
  const dx = drag.axis === "y" ? 0 : rawDx;
  const dy = drag.axis === "x" ? 0 : Math.min(rawDy, 0);
  const action = actionFromDelta(rawDx, rawDy, drag.axis);
  const visualX = Math.max(-105, Math.min(105, dx * 0.32));
  const visualY = Math.max(-52, Math.min(0, dy * 0.22));
  els.card.style.transform = `translate3d(${visualX}px, ${visualY}px, 0) rotate(${visualX / 48}deg)`;
  els.swipeFeedback.textContent = action ? labelForAction(action) : "NOCH WEITER WISCHEN";
  els.swipeFeedback.classList.add("visible");
  event.preventDefault();
}

function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const rawDx = event.clientX - drag.x;
  const rawDy = event.clientY - drag.y;
  const action = actionFromDelta(rawDx, rawDy, drag.axis);
  drag = null;
  els.handle.classList.remove("is-dragging");
  if (action) {
    els.swipeFeedback.classList.remove("visible");
    commitDecision(action);
  } else {
    resetCardTransform();
    if (Math.hypot(rawDx, rawDy) >= ACTIVATION_DISTANCE) showFeedback("Noch nicht entschieden — nutze die drei klaren Buttons.", false);
  }
}

function handleKeydown(event) {
  if (event.key === "ArrowRight") { event.preventDefault(); commitDecision("prepare"); }
  if (event.key === "ArrowLeft") { event.preventDefault(); commitDecision("reject"); }
  if (event.key === "ArrowUp") { event.preventDefault(); commitDecision("later"); }
}

function commitDecision(action) {
  const card = currentCard();
  if (!card) return;
  lastDecision = { index: state.index, cardId: card.id, action };
  state.history.push(lastDecision);
  state.decisions[card.id] = action;
  els.card.classList.add("is-exiting");
  showFeedback(`${statusLabels[action]} · nichts veröffentlicht`, true);
  persist();
  window.setTimeout(() => {
    state.index += 1;
    persist();
    render();
  }, 280);
}

function showFeedback(message, showUndo) {
  els.feedbackText.textContent = message;
  els.undoButton.hidden = !showUndo;
  els.feedback.hidden = false;
}

function undoLast() {
  if (!lastDecision) return;
  const { cardId, index } = lastDecision;
  delete state.decisions[cardId];
  state.index = index;
  state.history = state.history.filter((entry) => entry !== lastDecision);
  lastDecision = null;
  els.feedback.hidden = true;
  persist();
  render();
}

function resetDemo() {
  state.index = 0;
  state.decisions = {};
  state.history = [];
  lastDecision = null;
  els.feedback.hidden = true;
  persist();
  render();
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => commitDecision(button.dataset.action));
});
els.sourceToggle.addEventListener("click", toggleSource);
els.undoButton.addEventListener("click", undoLast);
els.resetButton.addEventListener("click", resetDemo);
document.querySelector(".reset-main").addEventListener("click", resetDemo);
els.handle.addEventListener("pointerdown", startDrag);
els.handle.addEventListener("pointermove", moveDrag);
els.handle.addEventListener("pointerup", endDrag);
els.handle.addEventListener("pointercancel", endDrag);
els.handle.addEventListener("keydown", handleKeydown);

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
