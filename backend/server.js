require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createSupabaseClient } = require("./supabase");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const supabase = createSupabaseClient();

app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("This frontend origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json({ limit: "20kb" }));

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
function cleanText(value, fieldName) {
  if (typeof value !== "string") throw Object.assign(new Error(`${fieldName} must be a string.`), { status: 400 });
  const clean = value.trim();
  if (clean.length < 2 || clean.length > 180) {
    throw Object.assign(new Error(`${fieldName} must be between 2 and 180 characters.`), { status: 400 });
  }
  return clean;
}
function validateVehicleType(value) {
  const vehicleType = value || "all";
  if (!["all", "bike", "auto", "cab"].includes(vehicleType)) {
    throw Object.assign(new Error("vehicleType must be all, bike, auto, or cab."), { status: 400 });
  }
  return vehicleType;
}
function requireDatabase(res) {
  if (!supabase) {
    res.status(503).json({
      error: "Supabase is not configured. Copy backend/.env.example to backend/.env, add your project URL and server-side key, then run database/schema.sql in Supabase."
    });
    return false;
  }
  return true;
}
function estimateDistance(pickup, destination) {
  // This is explicitly a deterministic demo estimate, not a real geocoded route.
  const hash = (text) => [...text.toLowerCase()].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const seed = hash(`${pickup}|${destination}`);
  return Number((2.5 + (seed % 175) / 10).toFixed(1));
}
function buildDemoFares(distanceKm, vehicleType) {
  const categories = vehicleType === "all" ? ["bike", "auto", "cab"] : [vehicleType];
  const base = { bike: 18, auto: 30, cab: 55 };
  const perKm = { bike: 6.2, auto: 10.5, cab: 15.8 };
  const providerMultiplier = { ola: 1.02, uber: 1.08, rapido: 0.96 };
  const providers = ["ola", "uber", "rapido"];
  return categories.flatMap((category) => providers.map((provider) => {
    const deterministicAdjustment = ((distanceKm * 10 + provider.length * 7 + category.length * 3) % 9) - 4;
    const estimate = Math.max(25, Math.round((base[category] + distanceKm * perKm[category]) * providerMultiplier[provider] + deterministicAdjustment));
    return {
      provider,
      vehicleType: category,
      estimatedFare: estimate,
      minFare: Math.max(20, estimate - Math.round(estimate * 0.08)),
      maxFare: Math.round(estimate + estimate * 0.12),
      durationMinutes: Math.max(5, Math.round(distanceKm * (category === "bike" ? 2.3 : category === "auto" ? 2.7 : 2.5) + 4)),
      distanceKm,
      dataSource: "demo"
    };
  }));
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "FareFusion API", databaseConfigured: Boolean(supabase), timestamp: new Date().toISOString() });
});
app.post("/api/fares/compare", asyncHandler(async (req, res) => {
  const pickup = cleanText(req.body?.pickup, "pickup");
  const destination = cleanText(req.body?.destination, "destination");
  if (pickup.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
    return res.status(400).json({ error: "Pickup and destination must be different." });
  }
  const vehicleType = validateVehicleType(req.body?.vehicleType);
  const distanceKm = estimateDistance(pickup, destination);
  const durationMinutes = Math.max(5, Math.round(distanceKm * 2.5 + 4));
  // Explicit demo estimate data. No claim is made that provider prices are live.
  const fares = buildDemoFares(distanceKm, vehicleType);
  res.json({
    message: "Demo comparison ready. These are example estimates, not live provider fares.",
    route: { pickup, destination, vehicleType, distanceKm, durationMinutes },
    fares,
    dataSource: "demo",
    generatedAt: new Date().toISOString()
  });
}));
app.get("/api/saved-searches", asyncHandler(async (req, res) => {
  if (!requireDatabase(res)) return;
  const { data, error } = await supabase.from("saved_searches")
    .select("id,pickup,destination,vehicle_type,preferred_provider,created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  res.json({ savedSearches: data.map((row) => ({
    id: row.id, pickup: row.pickup, destination: row.destination,
    vehicleType: row.vehicle_type, preferredProvider: row.preferred_provider,
    createdAt: row.created_at
  })) });
}));
app.post("/api/saved-searches", asyncHandler(async (req, res) => {
  if (!requireDatabase(res)) return;
  const pickup = cleanText(req.body?.pickup, "pickup");
  const destination = cleanText(req.body?.destination, "destination");
  if (pickup.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
    return res.status(400).json({ error: "Pickup and destination must be different." });
  }
  const vehicleType = validateVehicleType(req.body?.vehicleType);
  const provider = req.body?.preferredProvider == null || req.body?.preferredProvider === "" ? null : String(req.body.preferredProvider).toLowerCase();
  if (provider && !["ola", "uber", "rapido"].includes(provider)) {
    return res.status(400).json({ error: "preferredProvider must be ola, uber, rapido, or empty." });
  }
  const { data, error } = await supabase.from("saved_searches").insert({
    pickup, destination, vehicle_type: vehicleType, preferred_provider: provider
  }).select("id,pickup,destination,vehicle_type,preferred_provider,created_at").single();
  if (error) throw error;
  res.status(201).json({
    message: "Saved search created.",
    savedSearch: { id: data.id, pickup: data.pickup, destination: data.destination, vehicleType: data.vehicle_type, preferredProvider: data.preferred_provider, createdAt: data.created_at }
  });
}));
app.patch("/api/saved-searches/:id", asyncHandler(async (req, res) => {
  if (!requireDatabase(res)) return;
  const id = req.params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: "Saved search ID must be a valid UUID." });
  }
  const updates = {};
  if (req.body?.pickup !== undefined) updates.pickup = cleanText(req.body.pickup, "pickup");
  if (req.body?.destination !== undefined) updates.destination = cleanText(req.body.destination, "destination");
  if (req.body?.vehicleType !== undefined) updates.vehicle_type = validateVehicleType(req.body.vehicleType);
  if (req.body?.preferredProvider !== undefined) {
    const provider = req.body.preferredProvider === null || req.body.preferredProvider === ""
      ? null : String(req.body.preferredProvider).toLowerCase();
    if (provider && !["ola", "uber", "rapido"].includes(provider)) {
      return res.status(400).json({ error: "preferredProvider must be ola, uber, rapido, or empty." });
    }
    updates.preferred_provider = provider;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: "Provide at least one field to update." });
  const pickup = updates.pickup;
  const destination = updates.destination;
  if (pickup && destination && pickup.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
    return res.status(400).json({ error: "Pickup and destination must be different." });
  }
  // If only one location is updated, compare it against the stored other location.
  if (pickup || destination) {
    const { data: existing, error: readError } = await supabase.from("saved_searches")
      .select("pickup,destination").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!existing) return res.status(404).json({ error: "Saved search not found." });
    const finalPickup = pickup || existing.pickup;
    const finalDestination = destination || existing.destination;
    if (finalPickup.toLocaleLowerCase() === finalDestination.toLocaleLowerCase()) {
      return res.status(400).json({ error: "Pickup and destination must be different." });
    }
  }
  const { data, error } = await supabase.from("saved_searches").update(updates).eq("id", id)
    .select("id,pickup,destination,vehicle_type,preferred_provider,created_at").maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: "Saved search not found." });
  res.json({ message: "Saved search updated.", savedSearch: {
    id: data.id, pickup: data.pickup, destination: data.destination,
    vehicleType: data.vehicle_type, preferredProvider: data.preferred_provider, createdAt: data.created_at
  } });
}));
app.delete("/api/saved-searches/:id", asyncHandler(async (req, res) => {
  if (!requireDatabase(res)) return;
  const id = req.params.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: "Saved search ID must be a valid UUID." });
  }
  const { data, error } = await supabase.from("saved_searches").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) return res.status(404).json({ error: "Saved search not found." });
  res.json({ message: "Saved search deleted.", id });
}));
app.delete("/api/saved-searches", asyncHandler(async (req, res) => {
  if (!requireDatabase(res)) return;
  // This educational demo has no user accounts: this clears the shared table.
  const { error } = await supabase.from("saved_searches").delete().not("id", "is", null);
  if (error) throw error;
  res.json({ message: "All saved searches deleted." });
}));
app.use((req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.status) || 500;
  if (status >= 500) console.error("[FareFusion API]", error.message || error);
  res.status(status).json({ error: status >= 500 ? "An unexpected server or database error occurred. Check backend logs and Supabase configuration." : error.message });
});
app.listen(PORT, () => {
  console.log(`FareFusion API listening on http://localhost:${PORT}`);
  console.log(`Supabase configured: ${Boolean(supabase)}`);
});
