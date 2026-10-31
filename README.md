# Ocean Stays – Smart Hotel Management System (SHMS)

## Project Overview
Ocean Stays is a Smart Hotel Management System developed using React, Flask, and PostgreSQL.

## Technologies Used
- Frontend: React, Vite, Bootstrap
- Backend: Python, Flask
- Database: PostgreSQL

## Project Structure
```text
OceanStays_SHMS/
├── OceanStays_backend/
│   └── app.py
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

## 2. PostgreSQL Database Setup

Each team member must use their own local PostgreSQL installation and credentials.

1. Open pgAdmin or PostgreSQL.
2. Create a new database for Ocean Stays.
3. Use your own PostgreSQL username and password.
4. Make sure the database name and credentials match your backend configuration.

Do not share or upload your local database password.

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

Install the required Python packages:

```bash
pip install Flask Flask-Cors psycopg2-binary python-dotenv
```

Create a local `.env` file in the backend folder and enter your own PostgreSQL configuration.

**Important:** Use the exact environment variable names expected by `app.py`. Do not copy another team member's password.

Run the backend:

```bash
python app.py
```

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

- Every team member must configure their own local PostgreSQL database.
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
