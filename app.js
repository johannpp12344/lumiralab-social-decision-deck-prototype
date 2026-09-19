const STORAGE_KEY = "lumira-social-decision-deck:v1";

const cards = [
  {
    id: "schimmelanalyse",
    format: "INSTAGRAM · CAROUSEL",
    kicker: "CLAIM-CHECK OFFEN",
    title: "Schimmelanalyse: vom Verdacht zum Befund",
    question: "Darf dieser Draft in die visuelle Produktion?",
    copy: "Von der Oberflächenprobe bis zum verständlichen Befund: Schimmel gezielt einordnen.",
    source: "LumiraLab beschreibt Schimmelanalyse, MycoPatch-Diagnostik und verständliche Empfehlungen auf der Live-Website.",
    sourceUrl: "https://lumiralab.de/",
    assetNote: "Originales MycoPatch- oder Laborfoto aus Drive einsetzen; die blaue Fläche ist nur ein Platzhalter.",
  },
  {
    id: "fuenf-schritte",
    format: "INSTAGRAM · INFO",
    kicker: "QUELLE VORHANDEN",
    title: "In fünf Schritten zu klaren Ergebnissen",
    question: "Als Education-Post vormerken?",
    copy: "Beratung → Probennahme → Einsendung → Analyse → Befund & Bericht",
    source: "Die fünf Schritte stehen als Ablauf auf der LumiraLab-Website. Vor Produktion: Copy, Grafik und CTA getrennt prüfen.",
    sourceUrl: "https://lumiralab.de/",
    assetNote: "Für das finale Motiv ein echtes Labor-/Probenahme-Asset verwenden; keine generierte Produktdarstellung als Beleg.",
  },
  {
    id: "formaldehyd-voc",
    format: "INSTAGRAM · PRODUCT",
    kicker: "SACHLICH PRÜFEN",
    title: "Formaldehyd & VOC-Analyse",
    question: "Für einen sachlichen Produkt-Post vormerken?",
    copy: "Testkits und Probenahme helfen, die Chemikalienbelastung der Luft zu erfassen und Quellen gezielt aufzuspüren.",
    source: "Die Live-Website beschreibt Formaldehyd- und VOC-Analysen sowie die Kombination aus Probenahme und Laboranalyse.",
    sourceUrl: "https://lumiralab.de/",
    assetNote: "Messparameter, Grenzwerte und Leistungsversprechen erst nach Quellen-/Claim-Ledger ergänzen.",
  },
];

const statusLabels = {
  prepare: "Zur Produktion vorgemerkt",
  reject: "Zurückgestellt",
  later: "Für später gemerkt",
};

const state = loadState();
let drag = null;
let lastDecision = null;

const els = {
  card: document.querySelector("#decisionCard"),
  swipeFeedback: document.querySelector("#swipeFeedback"),
  emptyState: document.querySelector("#emptyState"),
  areaChip: document.querySelector("#areaChip"),
  formatChip: document.querySelector("#formatChip"),
  cardIndex: document.querySelector("#cardIndex"),
  cardKicker: document.querySelector("#cardKicker"),
  cardTitle: document.querySelector("#cardTitle"),
  decisionQuestion: document.querySelector("#decisionQuestion"),
  cardCopy: document.querySelector("#cardCopy"),
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
  const completed = cards.length - Object.keys(state.decisions).length;
  const visiblePosition = Math.min(state.index + 1, cards.length);
  els.progressLabel.textContent = card ? `${visiblePosition} / ${cards.length}` : "fertig";
  els.progressBar.style.width = `${Math.min((Object.keys(state.decisions).length / cards.length) * 100, 100)}%`;
  renderSummary();

  const cardParts = els.card.querySelectorAll(".card-head, .asset-placeholder, .card-body, .card-hint");
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
  els.cardTitle.textContent = card.title;
  els.decisionQuestion.textContent = card.question;
  els.cardCopy.textContent = card.copy;
  els.sourceText.textContent = card.source;
  els.sourceLink.href = card.sourceUrl;
  els.assetNote.textContent = card.assetNote;
  els.sourcePanel.hidden = true;
  els.sourceToggle.setAttribute("aria-expanded", "false");
  els.card.style.removeProperty("--drag-x");
  els.card.style.removeProperty("--drag-y");
  els.card.classList.remove("is-dragging", "is-exiting");
}

function renderSummary() {
  const counts = { prepare: 0, reject: 0, later: 0 };
  Object.values(state.decisions).forEach((action) => { if (counts[action] !== undefined) counts[action] += 1; });
  els.summaryGrid.innerHTML = `
    <div class="summary-item ${counts.prepare ? "is-active" : ""}"><strong>${counts.prepare}</strong><span>vorgemerkt</span></div>
    <div class="summary-item ${counts.later ? "is-active" : ""}"><strong>${counts.later}</strong><span>für später</span></div>
    <div class="summary-item ${counts.reject ? "is-active" : ""}"><strong>${counts.reject}</strong><span>zurückgestellt</span></div>`;
}

function toggleSource(event) {
  event.stopPropagation();
  const expanded = els.sourceToggle.getAttribute("aria-expanded") === "true";
  els.sourceToggle.setAttribute("aria-expanded", String(!expanded));
  els.sourcePanel.hidden = expanded;
}

function actionFromDelta(dx, dy) {
  if (Math.abs(dx) > 82 && Math.abs(dx) > Math.abs(dy) * 1.12) return dx > 0 ? "prepare" : "reject";
  if (dy < -82 && Math.abs(dy) > Math.abs(dx) * 1.12) return "later";
  return null;
}

function labelForAction(action) {
  return { prepare: "VORMERKEN", reject: "STOPP", later: "SPÄTER" }[action] || "";
}

function startDrag(event) {
  if (event.target.closest("button, a")) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  els.card.setPointerCapture?.(event.pointerId);
  els.card.classList.add("is-dragging");
}

function moveDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) < 8) return;
  drag.moved = true;
  const rotation = Math.max(-8, Math.min(8, dx / 22));
  els.card.style.transform = `translate3d(${dx}px, ${Math.min(dy, 30)}px, 0) rotate(${rotation}deg)`;
  const action = actionFromDelta(dx, dy);
  els.swipeFeedback.textContent = labelForAction(action);
  els.swipeFeedback.classList.toggle("visible", Boolean(action));
}

function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  const wasMoved = drag.moved;
  const action = actionFromDelta(dx, dy);
  drag = null;
  els.card.classList.remove("is-dragging");
  els.swipeFeedback.classList.remove("visible");
  if (action) {
    commitDecision(action);
  } else {
    els.card.style.transform = "translate3d(0,0,0) rotate(0deg)";
    if (!wasMoved) toggleSource(event);
  }
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
els.card.addEventListener("pointerdown", startDrag);
els.card.addEventListener("pointermove", moveDrag);
els.card.addEventListener("pointerup", endDrag);
els.card.addEventListener("pointercancel", endDrag);
els.card.addEventListener("keydown", (event) => {
  if (event.target !== els.card) return;
  if (event.key === "ArrowRight") commitDecision("prepare");
  if (event.key === "ArrowLeft") commitDecision("reject");
  if (event.key === "ArrowUp") commitDecision("later");
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); els.sourceToggle.click(); }
});

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
