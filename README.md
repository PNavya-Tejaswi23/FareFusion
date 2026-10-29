# FareFusion — Smart Ride Fare Comparison

**Compare ride fares. Save money. Travel smarter.**

FareFusion is a beginner-friendly full-stack web application that compares estimated ride fares from Ola, Uber, and Rapido based on pickup and destination locations. It displays estimated distance, travel time, and fare comparisons to help users make cost-effective travel decisions.

> **Important:** FareFusion currently uses demonstration fare estimates. It does not fetch live prices from Ola, Uber, or Rapido. Always verify actual prices in the provider's official application.

## Features

- Responsive interface with a colorful design.
- Pickup and destination inputs with swap and clear controls.
- Vehicle-category filtering for bikes, autos, and cabs.
- Fare comparison cards for Ola, Uber, and Rapido.
- Highlighting of the lowest displayed fare estimate.
- Estimated distance and travel duration.
- REST API built with Node.js and Express.
- Supabase PostgreSQL integration for saved-route CRUD operations.
- Input validation, error handling, and API health endpoint.

## Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** Node.js, Express
- **Database:** Supabase PostgreSQL
- **API communication:** Fetch API
- **Tools:** VS Code, Git, GitHub

## Project Structure

```text
FareFusion/
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

- Node.js 18.18 or later
- npm
- A Supabase project for database-backed saved routes
- Visual Studio Code
- Git

## Setup Instructions

### 1. Configure Supabase

1. Create a project at https://supabase.com/.
2. Open the Supabase SQL Editor.
3. Run the SQL in `database/schema.sql`.
4. Copy your project URL and server-side secret key from your Supabase project settings.

Keep your secret key private. Never place it in frontend files or commit your `.env` file to GitHub.

### 2. Configure the backend

Open a terminal in the project root and run:

```powershell
cd backend
npm install
```

Create `backend/.env` using `backend/.env.example` as a template. Configure the required values, for example:

```dotenv
PORT=3000
FRONTEND_ORIGIN=http://127.0.0.1:5500,http://localhost:5500
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SECRET_KEY
```

Replace the placeholders with your actual values. Never share or commit your secret key.

Start the backend:

```bash
npm run dev
```

### 3. Start the frontend

Open a second terminal from the project root and run:

```bash
python -m http.server 5500 --directory frontend
```

Open http://localhost:5500 in your browser.

You can alternatively use the VS Code Live Server extension. Ensure the frontend origin matches the backend's `FRONTEND_ORIGIN` setting.

### 4. Check the backend

With the backend running, open:

http://localhost:3000/api/health

The health endpoint reports API status and whether Supabase is configured.

## API Endpoints

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API status |
| POST | `/fares/compare` | Return demonstration fare estimates |
| GET | `/saved-searches` | Retrieve saved routes |
| POST | `/saved-searches` | Save a route |
| PATCH | `/saved-searches/:id` | Update a saved route |
| DELETE | `/saved-searches/:id` | Delete a saved route |
| DELETE | `/saved-searches` | Delete all saved routes |

Database-backed operations require valid Supabase credentials and the SQL schema to be configured.

## How to Use

1. Open FareFusion in your browser.
2. Enter a pickup location.
3. Enter a destination.
4. Select a vehicle category, if available.
5. Click **Compare Rides**.
6. Compare the displayed fare estimates, distance, and duration.
7. Verify the actual fare in the selected provider's official app before booking.

## Limitations

- Live ride-provider fare APIs are not integrated.
- Distance and journey duration may be demonstration values rather than actual route calculations.
- A real routing or geocoding service is not integrated.
- Saved routes require a configured Supabase database.
- Authentication and per-user access controls are not implemented in this educational version.

Do not use the current shared saved-search setup for sensitive data or production users without adding appropriate authentication and access controls.

## Future Enhancements

- Authorized real-time fare integrations.
- Location autocomplete and route mapping.
- Improved trip history and saved-route management.
- User authentication and per-user data protection.
- Deployment of the frontend and backend.

## Author

**Project:** FareFusion

Developed as a student project to make ride fare comparison easier and more accessible.

---

*FareFusion is an independent project and is not affiliated with Ola, Uber, or Rapido. Actual fares, availability, and travel times vary.*
