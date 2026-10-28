/* FareFusion frontend. Uses real REST requests for searches and saved-route CRUD.
   Fare amounts are demo estimates unless an authorized provider integration exists. */
const API_BASE = (window.FAREFUSION_API_BASE || "http://localhost:3000/api").replace(/\/$/, "");
const $ = (selector) => document.querySelector(selector);
const form = $("#rideForm");
const pickupInput = $("#pickup");
const destinationInput = $("#destination");
const vehicleSelect = $("#vehicleType");
const statusMessage = $("#statusMessage");
const fareCards = $("#fareCards");
const resultsSubtitle = $("#resultsSubtitle");
const routeSummary = $("#routeSummary");
const comparisonInsight = $("#comparisonInsight");
const sortBy = $("#sortBy");
const savedSearches = $("#savedSearches");
const clearSavedButton = $("#clearSaved");
const providerMeta = {
  ola: { name: "Ola", monogram: "O", className: "ola", url: "https://www.olacabs.com/" },
  uber: { name: "Uber", monogram: "U", className: "uber", url: "https://www.uber.com/in/en/" },
  rapido: { name: "Rapido", monogram: "R", className: "rapido", url: "https://www.rapido.bike/" }
};
let currentRoute = null;
let currentFares = [];
let savedRoutes = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function rupees(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
function showStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.hidden = false;
}
function hideStatus() { statusMessage.hidden = true; statusMessage.textContent = ""; }
function setLoading(loading) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = loading;
  button.innerHTML = loading ? '<span class="loading-spinner" aria-hidden="true"></span><span>Comparing…</span>' : '<span>Compare rides</span><span class="button-arrow">↗</span>';
}
function showEmpty(message) {
  fareCards.innerHTML = `<div class="empty-card"><div class="empty-illustration">⌁</div><h3>Nothing to compare just yet.</h3><p>${escapeHtml(message)}</p></div>`;
}
function validateRoute(pickup, destination) {
  if (!pickup.trim() || !destination.trim()) return "Please enter both pickup and destination locations.";
  if (pickup.trim().toLocaleLowerCase() === destination.trim().toLocaleLowerCase()) return "Pickup and destination must be different.";
  if (pickup.trim().length < 2 || destination.trim().length < 2) return "Please enter locations with at least 2 characters.";
  return "";
}
async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch (error) {
    throw new Error(`Cannot reach the FareFusion API. Start the backend and check ${API_BASE}.`);
  }
  let payload;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}
function normalizeFare(fare) {
  const provider = String(fare.provider || "").toLowerCase();
  if (!providerMeta[provider]) return null;
  return {
    id: fare.id || `${provider}-${fare.vehicleType || "cab"}`,
    provider, vehicleType: fare.vehicleType || "cab",
    estimatedFare: Number(fare.estimatedFare),
    minFare: Number(fare.minFare ?? fare.estimatedFare),
    maxFare: Number(fare.maxFare ?? fare.estimatedFare),
    durationMinutes: Number(fare.durationMinutes),
    distanceKm: Number(fare.distanceKm),
    dataSource: fare.dataSource || "demo"
  };
}
function renderFares() {
  const sorted = [...currentFares].sort((a, b) => {
    if (sortBy.value === "duration") return a.durationMinutes - b.durationMinutes;
    if (sortBy.value === "provider") return a.provider.localeCompare(b.provider);
    return a.estimatedFare - b.estimatedFare;
  });
  if (!sorted.length) {
    showEmpty("No fare estimates matched this vehicle filter. Try another category.");
    comparisonInsight.hidden = true;
    return;
  }
  const cheapestFare = Math.min(...sorted.map((fare) => fare.estimatedFare));
  fareCards.innerHTML = sorted.map((fare) => {
    const meta = providerMeta[fare.provider];
    const cheapest = fare.estimatedFare === cheapestFare;
    const sourceLabel = fare.dataSource === "live" ? "LIVE ESTIMATE" : "DEMO ESTIMATE";
    const vehicleLabel = fare.vehicleType.charAt(0).toUpperCase() + fare.vehicleType.slice(1);
    const externalUrl = meta.url;
    return `<article class="fare-card ${cheapest ? "cheapest" : ""}">
    ${cheapest ? '<span class="best-pill">✦ RECOMMENDED</span>' : ""}

      <div class="fare-card-header"><div class="provider-lockup"><div class="provider-logo ${meta.className}">${meta.monogram}</div><div><div class="provider-name">${meta.name}</div><div class="provider-type">${escapeHtml(vehicleLabel)} ride</div></div></div><span class="demo-pill">${sourceLabel}</span></div>
      <div class="fare-price-row"><span class="fare-price">${rupees(fare.estimatedFare)}</span><span class="fare-range">${fare.minFare !== fare.maxFare ? `${rupees(fare.minFare)}–${rupees(fare.maxFare)}` : "estimated fare"}</span></div>
      <div class="fare-details"><div class="fare-detail"><span class="detail-icon">◷</span>${fare.durationMinutes} min approx.</div><div class="fare-detail"><span class="detail-icon">⌁</span>${fare.distanceKm.toFixed(1)} km route</div></div>
      <div class="fare-actions"><a class="provider-link" href="${externalUrl}" target="_blank" rel="noopener noreferrer">Visit ${meta.name} <span>↗</span></a><button class="save-route-button" type="button" data-save-fare="${escapeHtml(fare.provider)}" aria-label="Save this route" title="Save this route">♡</button></div>
    </article>`;
  }).join("");
  const savings = Math.max(...sorted.map((fare) => fare.estimatedFare)) - cheapestFare;
  comparisonInsight.hidden = false;
  comparisonInsight.innerHTML = `<span class="insight-icon">✦</span><span><strong>${escapeHtml(providerMeta[sorted.find(fare => fare.estimatedFare === cheapestFare).provider].name)} has the lowest displayed estimate.</strong> The difference between the highest and lowest estimates is ${rupees(savings)}. Compare final prices in the provider app before booking.</span>`;
}
function renderRouteSummary(route) {
  routeSummary.hidden = false;
  routeSummary.innerHTML = `<span class="summary-arrow">⌖</span><span><strong>${escapeHtml(route.pickup)}</strong> <span style="color:#91a09a">→</span> <strong>${escapeHtml(route.destination)}</strong></span><span class="summary-spacer"></span><span>${Number(route.distanceKm).toFixed(1)} km</span><span>·</span><span>${Number(route.durationMinutes)} min approx.</span>`;
}
async function searchRides(event) {
  event.preventDefault();
  hideStatus();
  const pickup = pickupInput.value.trim();
  const destination = destinationInput.value.trim();
  const error = validateRoute(pickup, destination);
  if (error) { showStatus(error, "error"); (pickup ? destinationInput : pickupInput).focus(); return; }
  currentRoute = { pickup, destination, vehicleType: vehicleSelect.value };
  setLoading(true);
  showEmpty("Calculating available fare estimates…");
  comparisonInsight.hidden = true;
  try {
    const result = await apiRequest("/fares/compare", {
      method: "POST",
      body: JSON.stringify(currentRoute)
    });
    currentFares = (result.fares || []).map(normalizeFare).filter(Boolean);
    currentRoute = result.route || currentRoute;
    resultsSubtitle.textContent = `${currentFares.length} estimate${currentFares.length === 1 ? "" : "s"} for your selected route`;
    renderRouteSummary(currentRoute);
    renderFares();
    showStatus(result.message || "Comparison ready. Check each provider app for its final fare.", "success");
    await loadSavedRoutes();
  } catch (error) {
    currentFares = [];
    showEmpty("The comparison service is unavailable. Check that your backend and Supabase configuration are set up.");
    showStatus(error.message, "error");
    resultsSubtitle.textContent = "We couldn't complete this comparison.";
    routeSummary.hidden = true;
  } finally { setLoading(false); }
}
async function loadSavedRoutes() {
  try {
    const result = await apiRequest("/saved-searches");
    savedRoutes = result.savedSearches || [];
    renderSavedRoutes();
  } catch (error) {
    savedSearches.innerHTML = `<div class="saved-empty">Saved searches are unavailable. ${escapeHtml(error.message)}</div>`;
  }
}
function renderSavedRoutes() {
  if (!savedRoutes.length) {
    savedSearches.innerHTML = '<div class="saved-empty">No saved searches yet. Compare a route and save it for later.</div>';
    return;
  }
  savedSearches.innerHTML = savedRoutes.map((item) => `<article class="saved-item">
    <div class="saved-route-icon">⌁</div><div class="saved-route-text"><strong title="${escapeHtml(item.pickup)} → ${escapeHtml(item.destination)}">${escapeHtml(item.pickup)} → ${escapeHtml(item.destination)}</strong><small>${escapeHtml(item.vehicleType === "all" ? "All vehicle types" : item.vehicleType)} · Saved ${new Date(item.createdAt || item.created_at || Date.now()).toLocaleDateString()}</small></div>
    <div class="saved-actions"><button type="button" data-load-saved="${escapeHtml(item.id)}">Load</button><button type="button" data-edit-saved="${escapeHtml(item.id)}">Edit</button><button type="button" data-delete-saved="${escapeHtml(item.id)}" aria-label="Delete saved search">✕</button></div>
  </article>`).join("");
}
async function saveCurrentRoute(provider = "") {
  if (!currentRoute) { showStatus("Compare a route before saving it.", "error"); return; }
  try {
    const result = await apiRequest("/saved-searches", {
      method: "POST",
      body: JSON.stringify({ ...currentRoute, preferredProvider: provider || null })
    });
    showStatus(result.message || "Route saved.", "success");
    await loadSavedRoutes();
  } catch (error) { showStatus(error.message, "error"); }
}
async function deleteSavedRoute(id) {
  try {
    await apiRequest(`/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" });
    savedRoutes = savedRoutes.filter((item) => String(item.id) !== String(id));
    renderSavedRoutes();
    showStatus("Saved search deleted.", "success");
  } catch (error) { showStatus(error.message, "error"); }
}
async function clearAllSaved() {
  if (!savedRoutes.length) { showStatus("There are no saved searches to clear.", "info"); return; }
  if (!window.confirm("Delete all saved searches on this shared project database?")) return;
  try {
    await apiRequest("/saved-searches", { method: "DELETE" });
    savedRoutes = [];
    renderSavedRoutes();
    showStatus("All saved searches were deleted.", "success");
  } catch (error) { showStatus(error.message, "error"); }
}
form.addEventListener("submit", searchRides);
sortBy.addEventListener("change", renderFares);
$("#swapLocations").addEventListener("click", () => {
  const oldPickup = pickupInput.value;
  pickupInput.value = destinationInput.value;
  destinationInput.value = oldPickup;
});
document.querySelectorAll("[data-clear]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.clear);
    input.value = ""; input.focus();
  });
});
fareCards.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save-fare]");
  if (button) saveCurrentRoute(button.dataset.saveFare);
});
savedSearches.addEventListener("click", (event) => {
  const loadButton = event.target.closest("[data-load-saved]");
  const editButton = event.target.closest("[data-edit-saved]");
  const deleteButton = event.target.closest("[data-delete-saved]");
  if (editButton) {
    const item = savedRoutes.find((route) => String(route.id) === editButton.dataset.editSaved);
    if (item) {
      const pickup = window.prompt("Update pickup location:", item.pickup);
      if (pickup === null) return;
      const destination = window.prompt("Update destination:", item.destination);
      if (destination === null) return;
      const vehicleType = window.prompt("Vehicle type: all, bike, auto, or cab", item.vehicleType || "all");
      if (vehicleType === null) return;
      const providerInput = window.prompt("Preferred provider: ola, uber, rapido, or leave blank", item.preferredProvider || "");
      if (providerInput === null) return;
      apiRequest(`/saved-searches/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ pickup, destination, vehicleType: vehicleType.trim().toLowerCase(), preferredProvider: providerInput.trim().toLowerCase() || null })
      }).then(async () => {
        showStatus("Saved search updated.", "success");
        await loadSavedRoutes();
      }).catch((error) => showStatus(error.message, "error"));
    }
  }
  if (loadButton) {
    const item = savedRoutes.find((route) => String(route.id) === loadButton.dataset.loadSaved);
    if (item) {
      pickupInput.value = item.pickup;
      destinationInput.value = item.destination;
      vehicleSelect.value = item.vehicleType || "all";
      $("#compare").scrollIntoView({ behavior: "smooth" });
      showStatus("Saved route loaded. Press Compare rides to refresh estimates.", "info");
    }
  }
  if (deleteButton) deleteSavedRoute(deleteButton.dataset.deleteSaved);
});
clearSavedButton.addEventListener("click", clearAllSaved);
$("#currentYear").textContent = new Date().getFullYear();
const menuToggle = $("#menuToggle");
menuToggle.addEventListener("click", () => {
  const links = document.querySelector(".nav-links");
  const opened = links.classList.toggle("mobile-open");
  menuToggle.setAttribute("aria-expanded", String(opened));
  menuToggle.textContent = opened ? "×" : "☰";
});
document.querySelectorAll(".nav-links a").forEach((link) => link.addEventListener("click", () => {
  document.querySelector(".nav-links").classList.remove("mobile-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.textContent = "☰";
}));
loadSavedRoutes();
