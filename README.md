# Ocean Stays – Smart Hotel Management System (SHMS)

## Project Overview
Ocean Stays is a Smart Hotel Management System developed using React, Flask, and PostgreSQL.

## Technologies Used
- Frontend: React 19, Vite, Bootstrap Icons, Recharts
- Backend: Python, Flask, Flask-JWT-Extended
- Database: PostgreSQL (Neon)

## Project Structure
```text
OceanStays_SHMS/
├── OceanStays_backend/
│   ├── app.py              # Flask app: python app.py
│   ├── routes/             # one module per area (bookings, payments, housekeeping, ...)
│   ├── migrations/         # numbered SQL schema changes, applied by migrate.py
│   ├── scripts/            # one-off maintenance scripts
│   ├── tests/              # pytest suite (runs against a local throwaway database)
│   ├── requirements.txt
│   └── .env.example
├── OceanStays_frontend/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   └── package.json
└── README.md
```

## 1. Clone the Repository

```bash
git clone https://github.com/DishanthiniYashikkumar/Ocean-Stays__SHMS.git
cd OceanStays__SHMS
```

## 2. Database Setup (Neon or local PostgreSQL)

The backend works with any PostgreSQL 16+ database. The team database is on
[Neon](https://neon.com) (serverless PostgreSQL); a local PostgreSQL works the same way.

1. **Neon:** in the Neon Console open the project → *Connect* → copy the **pooled**
   connection string (it ends in `?sslmode=require`).
   **Local:** create an empty database in pgAdmin and build a URL like
   `postgresql://postgres:YOUR_PASSWORD@localhost:5432/oceanstays`.
2. Load the starting data once (an empty database only). `OceanStays.backup` was made with
   `pg_dump` 18, so use `pg_restore` 18 or newer:

   ```bash
   pg_restore --no-owner --no-privileges -d "YOUR_DATABASE_URL" OceanStays_backend/OceanStays.backup
   ```

3. Apply the schema changes the API needs (see `OceanStays_backend/migrations/`) and hash the
   seeded passwords. Both commands are safe to run again:

   ```bash
   cd OceanStays_backend
   python migrate.py
   python scripts/hash_passwords.py
   ```

Never share or commit your database URL or passwords. Dumps (`*.backup`) are git-ignored
because they contain real data.

## 3. Backend Setup

Open a terminal inside the backend folder:

```bash
cd OceanStays_backend
```

Create and activate a virtual environment:

```bash
python -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
source venv/bin/activate
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Create `OceanStays_backend/.env` from the example and fill in your values:

```bash
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Your Neon (or local) PostgreSQL connection string |
| `JWT_SECRET` | Long random string used to sign login tokens: `python -c "import secrets;print(secrets.token_urlsafe(48))"` |
| `FRONTEND_URL` | Where the React app runs; used in password-reset links |
| `CORS_ORIGINS` | Browser origins allowed to call the API (comma separated, regex allowed) |
| `APP_TIMEZONE` | The hotel's time zone, for "today" (default `Asia/Colombo`) |
| `FLASK_DEBUG` | `1` only while developing |

Run the backend:

```bash
python app.py
```

It listens on `http://127.0.0.1:5000`; `GET /health` reports whether the database is reachable.
The endpoint list, roles and status values are documented in
[`OceanStays_backend/README.md`](OceanStays_backend/README.md).

## 4. Frontend Setup

Open another terminal and navigate to the frontend folder:

```bash
cd OceanStays_frontend
```

Install the frontend dependencies:

```bash
npm install
```

Create your local `.env` file using the example file:

```powershell
Copy-Item .env.example .env
```

Update the values in `.env` if required. Use the correct backend API URL for your local setup.

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed in the terminal.

## 5. Important Notes

- Every team member needs their own `OceanStays_backend/.env` with a database URL (Neon or local).
- After pulling changes, run `python migrate.py` so your database has the latest schema.
- Every team member must create their own local `.env` files.
- Never commit or push `.env` files to GitHub.
- The `.env.example` file can be shared because it should contain only example values, not real passwords.
- Do not commit `node_modules`, virtual environments, or generated build folders.

## 6. Running the Project

Run the backend and frontend in two separate terminals:

**Terminal 1 – Backend**
```bash
cd OceanStays_backend
python app.py
```

**Terminal 2 – Frontend**
```bash
cd OceanStays_frontend
npm run dev
```
