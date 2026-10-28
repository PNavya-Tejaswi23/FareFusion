# FareFusion — Compare rides, travel smarter

FareFusion is a beginner-friendly full-stack student project that brings ride-option comparisons into one responsive dashboard. Enter a pickup and destination, choose a vehicle category, and view clearly labelled fare estimates for Ola, Uber, and Rapido side by side.

> **Important:** This project currently uses deterministic demo fare estimates. It does not fetch live prices from Ola, Uber, or Rapido. Live fare access requires an authorized provider API or partnership. Never present demo estimates as live prices.

## Features

- Responsive, modern landing page and comparison dashboard.
- Pickup/destination validation and swap/clear controls.
- Vehicle-category filter (bike, auto, cab) and sort by price, duration, or provider.
- Side-by-side provider cards with lowest displayed estimate highlighted.
- Explicit `DEMO ESTIMATE` labels and a fare disclaimer.
- REST API built with Node.js and Express.
- Supabase PostgreSQL integration for saved-search Create, Read, Update, and Delete operations.
- Input validation, error responses, loading states, empty states, and health endpoint.
- SQL schema with constraints, indexes, timestamps, update trigger, and Row Level Security enabled.
- Vanilla HTML, CSS, and JavaScript; no frontend framework.

## Technology stack

- Frontend: HTML5, CSS3, vanilla JavaScript
- Backend: Node.js, Express
- Database: Supabase PostgreSQL
- API calls: Fetch API
- Mapping: A map illustration is used in the landing-page hero. A real route map/geocoding service is not yet integrated.
- Version control / hosting: Git, GitHub, optional GitHub Pages for static frontend hosting

## Project structure

```text
farefusion/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   └── .env.example
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 18.18+ and npm
- A Supabase account and project
- A code editor such as VS Code
- Git (optional, for GitHub submission)
- A local static server for the frontend (VS Code Live Server is an easy option)

## 1. Create and configure Supabase

1. Create a project at [Supabase](https://supabase.com/).
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `database/schema.sql`, copy its contents, and run it.
4. In **Project Settings → API** (the exact labels may vary), copy your Project URL and a server-side secret/service-role key.
5. Keep that key private. Do not paste it into frontend files or commit it to GitHub.

The schema creates `public.saved_searches`, validation constraints, indexes, a timestamp trigger, and enables RLS. There are intentionally no anonymous browser policies. The Express server performs the database operations using a server-side key.

### Educational security limitation

This 3-day MVP does not implement sign-in or per-user ownership. Therefore, saved searches are shared across anyone using the same configured backend, and the “Clear all” button deletes all rows from the shared demo table. Do not deploy this setup for real users or sensitive data. Before production, add Supabase Auth, associate rows with a user ID, enforce per-user RLS policies, add rate limiting, and replace broad shared-table operations with authenticated, owner-scoped operations.

## 2. Configure backend environment variables

Open a terminal in the project directory, then:

**Windows PowerShell**
```powershell
cd backend
Copy-Item .env.example .env
```

**macOS / Linux**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and fill in your values:

```dotenv
PORT=3000
FRONTEND_ORIGIN=http://127.0.0.1:5500,http://localhost:5500
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SECRET_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` is a placeholder name for a server-side secret key. Use the appropriate secret/service-role key shown by your Supabase project. Never commit `backend/.env`.

If the frontend runs at a different origin, add that exact origin to `FRONTEND_ORIGIN` as a comma-separated value.

## 3. Install dependencies and start the backend

**All npm install commands below must be run inside the `backend` directory.**

```bash
cd backend
npm install
```

The package manifest already declares the required dependencies. These extra commands are included for clarity only; they are not required after a successful `npm install`:

```bash
npm install express cors dotenv @supabase/supabase-js ws
npm install --save-dev nodemon
```

Start in development mode (automatic restart):

```bash
npm run dev
```

Or start normally:

```bash
npm start
```

The API should report that it is listening on `http://localhost:3000`. If Supabase credentials are absent, health checks still work, but saved-search database routes return `503` with setup instructions.

## 4. Start the frontend

Open a **second terminal** in the project root.

### Option A: VS Code Live Server
1. Open the `frontend` folder in VS Code.
2. Install/use the Live Server extension.
3. Right-click `frontend/index.html` and select **Open with Live Server**.
4. Ensure the origin (usually `http://127.0.0.1:5500`) is included in `FRONTEND_ORIGIN`.

### Option B: Python static server
From the project root:

```bash
python -m http.server 5500 --directory frontend
```

Then open `http://localhost:5500`. Add `http://localhost:5500` to `FRONTEND_ORIGIN` if needed and restart the backend.

The frontend calls `http://localhost:3000/api` by default. To change it, define `window.FAREFUSION_API_BASE` before `script.js` is loaded, or edit `API_BASE` at the top of `frontend/script.js`.

## 5. API endpoints

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | API status and whether Supabase is configured |
| POST | `/fares/compare` | Validate a route and return clearly labelled demo fare estimates |
| GET | `/saved-searches` | Read saved routes from Supabase |
| POST | `/saved-searches` | Create a saved route in Supabase |
| PATCH | `/saved-searches/:id` | Update fields on a saved route by UUID |\n| DELETE | `/saved-searches/:id` | Delete one saved route by UUID |
| DELETE | `/saved-searches` | Delete all rows in the shared educational demo table |

### Example request: compare fares

```bash
curl -X POST http://localhost:3000/api/fares/compare \
  -H "Content-Type: application/json" \
  -d '{"pickup":"MRECW, Hyderabad","destination":"HITEC City, Hyderabad","vehicleType":"all"}'
```

Expected response shape:

```json
{
  "message": "Demo comparison ready. These are example estimates, not live provider fares.",
  "route": {
    "pickup": "MRECW, Hyderabad",
    "destination": "HITEC City, Hyderabad",
    "vehicleType": "all",
    "distanceKm": 10.2,
    "durationMinutes": 30
  },
  "fares": [
    {
      "provider": "ola",
      "vehicleType": "bike",
      "estimatedFare": 80,
      "minFare": 74,
      "maxFare": 90,
      "durationMinutes": 27,
      "distanceKm": 10.2,
      "dataSource": "demo"
    }
  ],
  "dataSource": "demo"
}
```

The numbers above are illustrative response-shape examples only; the API computes deterministic demo estimates based on the entered text and category.

### Example saved search request

```bash
curl -X POST http://localhost:3000/api/saved-searches \
  -H "Content-Type: application/json" \
  -d '{"pickup":"MRECW, Hyderabad","destination":"HITEC City, Hyderabad","vehicleType":"all","preferredProvider":"uber"}'
```

This endpoint requires a configured Supabase project and the SQL schema to have been applied.

## 6. Test the app

With the backend running, visit:

```text
http://localhost:3000/api/health
```

Try route comparison:

```bash
curl -X POST http://localhost:3000/api/fares/compare \
  -H "Content-Type: application/json" \
  -d '{"pickup":"Ameerpet, Hyderabad","destination":"Gachibowli, Hyderabad","vehicleType":"bike"}'
```

Validation check (expected HTTP 400):

```bash
curl -i -X POST http://localhost:3000/api/fares/compare \
  -H "Content-Type: application/json" \
  -d '{"pickup":"Same place","destination":"Same place","vehicleType":"all"}'
```

For saved-search CRUD, configure Supabase, run the schema, then use the website or the POST/GET/PATCH/DELETE endpoints above. Do not claim database tests passed until you have tested using your own Supabase credentials.

## 7. Git and GitHub submission

From the project root:

```bash
git init
git add .
git commit -m "Build FareFusion ride fare comparison app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/farefusion.git
git push -u origin main
```

Create an empty GitHub repository named `farefusion` first and replace `YOUR-USERNAME`. Confirm `.env` is not staged before pushing.

For a static GitHub Pages demo, publish the `frontend` directory using GitHub Pages configuration. The backend and Supabase database will not run on GitHub Pages; deploy the backend separately (for example, to a Node-compatible hosting service) and set the frontend API base URL to the deployed backend.

## 8. Common errors and troubleshooting

- **`Supabase is not configured` / HTTP 503:** Check that `backend/.env` exists and `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` contain real values. Restart the backend after editing `.env`.
- **CORS error:** Add the exact frontend origin to `FRONTEND_ORIGIN`, including protocol and port, then restart the API.
- **Saved searches fail:** Ensure `database/schema.sql` ran successfully in the correct Supabase project and the key is server-side and valid.
- **`Cannot reach the FareFusion API`:** Start the backend and confirm port 3000 is available.
- **`EADDRINUSE`:** Another process uses the port. Stop it or set another `PORT` in `.env`.
- **`npm` command not found:** Install Node.js 18.18+ and reopen the terminal.
- **CORS works in terminal but not browser:** Check the browser's exact origin and include it in the allowlist.
- **Provider prices differ:** This app shows demo estimates only. Confirm real fares in the provider's own app.
- **Database access denied:** Keep RLS enabled; use the server-side key only in backend environment variables. Do not “fix” the problem by disabling RLS or exposing the secret key.

## 9. Known limitations and next steps

- No official live fare APIs are integrated; fare amounts are demo estimates.
- Distance and journey time are deterministic demonstration values, not actual geocoded routes.
- The hero map is an illustration, not an interactive routing map.
- Saved searches are shared because authentication is not included. The Clear All action affects all saved rows in this demo database.
- The UI links to official provider websites, but does not deep-link to a prefilled booking or book a ride.
- Supabase functionality cannot be verified without your own credentials and database schema setup.
- Production hardening still needed: authentication, user-scoped RLS, rate limiting, logging/monitoring, input abuse protection, and authorized live fare integrations.

## 10. Short demonstration script

1. Open FareFusion and explain the problem: comparing ride apps manually takes time.
2. Enter a pickup and destination, for example “MRECW, Hyderabad” and “HITEC City, Hyderabad”.
3. Click **Compare rides** and point out the provider cards and `DEMO ESTIMATE` labels.
4. Change the vehicle type or sort by shortest time.
5. Save a route using the bookmark icon, then load or delete it from Saved searches.
6. Explain that saved searches use Supabase, while current fare numbers are demo estimates until authorized live APIs are integrated.
7. Finish by describing how the project uses a vanilla JavaScript frontend, Express REST API, and PostgreSQL database.

## 11. Beginner-friendly viva questions and answers

**Q1. What is FareFusion?**  
FareFusion is a web application concept that organizes ride-provider fare estimates in one dashboard so users can compare options without switching between multiple apps.

**Q2. Why use Node.js and Express?**  
Node.js runs JavaScript on the server. Express makes it easier to define REST endpoints, validate requests, and return JSON responses.

**Q3. What is Supabase?**  
Supabase is a backend platform that provides a PostgreSQL database and related developer tools. FareFusion stores saved routes in a Supabase PostgreSQL table.

**Q4. What is an API and how does Fetch work?**  
An API defines how software components communicate. The browser's Fetch API sends HTTP requests to Express endpoints and reads JSON responses to update the interface.

**Q5. Why is Row Level Security important?**  
RLS lets the database enforce which rows a database role can access. This project enables RLS and keeps database operations on the server, but a production version needs authentication and per-user ownership policies.

---

**Project status:** Source files and integration are prepared for local setup. You must configure Supabase credentials and run the SQL schema before database-backed saved searches can work. Live ride-provider prices are not implemented.
