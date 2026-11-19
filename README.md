# Valuonic

Track your investments in Argentine pesos and US dollars at the same time. Valuonic builds your whole portfolio from your transactions: CEDEARs and ETFs, crypto and dollars, all in one place.

**Live app:** [valuonic.linepixer.com](https://valuonic.linepixer.com) (the interface is in Spanish)

## Features

- **Two currencies at once:** every value shown in both ARS and USD.
- **Live prices:** CEDEARs and ETFs from IOL, crypto from Bitso, dollar rates from DolarHoy.
- **Gains by period:** last week, month, year or all time, excluding the money you put in.
- **Metrics:** annualized return (XIRR), monthly investment pace, interest earned and a growth projection.
- **Also included:** CSV import, email or Google sign-in, and an admin panel.

**Stack:** FastAPI and PostgreSQL on the backend, React and Vite on the frontend, all running in Docker.

---

## Quick start

If you already have Git and Docker running, these commands give you a working app with sample data:

```bash
git clone https://github.com/Linepixer/Valuonic.git
cd Valuonic
cp .env.example .env
docker compose up -d --build
docker compose exec api python -m app.seed_demo
```

Then open [http://localhost:3000](http://localhost:3000) and sign in with `demo@example.com` / `valuonic-demo`.

The rest of this guide explains each step and the daily workflow.

---

## Local development

### Requirements

| Tool | Notes |
|---|---|
| [Git](https://git-scm.com/downloads) | Any recent version. |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | On Windows and macOS. On Linux, Docker Engine with the Compose plugin works too. It must be running before you start. |

That's all. You don't need Python, Node.js or PostgreSQL installed: everything runs inside Docker. It works on Windows, macOS and Linux, on both Intel and Apple Silicon.

### Setup, step by step

**1. Clone the repository**

```bash
git clone https://github.com/Linepixer/Valuonic.git
cd Valuonic
```

**2. Create your local configuration**

```bash
cp .env.example .env
```

The defaults work as they are, with no editing needed. This command works in macOS, Linux, Git Bash and PowerShell. In the Windows Command Prompt (`cmd`), use `copy .env.example .env` instead.

**3. Build and start the app**

```bash
docker compose up -d --build
```

The first run takes a few minutes while the images are built. It starts three containers:

- `db`: PostgreSQL, reachable only from inside Docker.
- `api`: the FastAPI backend, on port 8000. It applies database migrations every time it starts.
- `web`: the frontend, on port 3000.

**4. Load the demo data** (recommended)

```bash
docker compose exec api python -m app.seed_demo
```

This does three things:

- creates a demo user;
- loads the sample transactions from [`samples/demo_transactions.csv`](samples/demo_transactions.csv);
- downloads price and dollar-rate history, splits and CEDEAR ratios from the production instance.

When it finishes, it prints the login details. It is safe to run again: nothing gets duplicated.

**5. Open the app**

Go to [http://localhost:3000](http://localhost:3000) and sign in:

| Email | Password |
|---|---|
| `demo@example.com` | `valuonic-demo` |

This account exists only in your local database, and it is also the local admin, so the admin panel works out of the box. `seed_demo` refuses to run unless the configuration is for local development.

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |

### Creating your own account

1. Sign up from the app.
2. With the default configuration no email is sent. The verification link is printed in the API logs instead:

   ```bash
   docker compose logs api
   ```

3. Find the line that starts with `Verification Link:` and open that URL in your browser.

**Admin access.** The demo account is already an admin. To make your own account one too, add its email to `ADMIN_EMAILS` in `.env` (comma-separated), then recreate the API so it picks up the change:

```bash
docker compose up -d --force-recreate api
```

### Everyday commands

The code is built into the images, so **after changing any code, rebuild with `docker compose up -d --build`**. Your data is kept.

| To… | Run |
|---|---|
| Apply your code changes | `docker compose up -d --build` |
| Follow the logs | `docker compose logs -f api` (or `web`, `db`) |
| Update market data (prices, dollar rates, splits) | `docker compose exec api python -m app.sync_prices` |
| Open a database shell | `docker compose exec db psql -U valuonic -d valuonic` |
| Stop everything (data is kept) | `docker compose down` |
| Start from scratch (**deletes your local database**) | `docker compose down -v` |

### Database migrations

Migrations run automatically every time the API starts. To create a new one after changing a model:

```bash
docker compose exec api alembic revision --autogenerate -m "describe the change"
docker compose cp api:/app/alembic/versions/. backend/alembic/versions/
```

The first command generates the migration inside the container. The second copies it into `backend/alembic/versions/` so you can review it and commit it.

### Frontend lint (optional)

This step needs Node.js 20.19+ or 22.12+ installed on your machine:

```bash
cd frontend
npm ci
npm run lint
```

### Market data

- **Current prices** are fetched live from IOL, Bitso and DolarHoy, so the app needs an internet connection.
- **Price and dollar-rate history** is downloaded by `seed_demo` and `sync_prices` from the production instance's public endpoint, `/api/public/market-data`. Both commands only add the days you are missing.
- **Splits and CEDEAR ratio changes** come with it, so your holdings match production. Events you already have are kept, and each CEDEAR's current ratio is copied.
- **While the containers are running,** the API also records one price per asset every day at 18:00 UTC.

If the charts look empty or out of date, run `docker compose exec api python -m app.sync_prices`. To download the history from a different Valuonic instance, change `MARKET_DATA_SOURCE_URL` in `.env`.

### Configuration

Every variable is documented in [`.env.example`](.env.example). For local development you don't need to change any of them.

| Variable | Local default | What it does |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `valuonic` | Database credentials, used only inside Docker. |
| `SECRET_KEY` | A development-only placeholder | Signs the session tokens. |
| `FRONTEND_URL` | `http://localhost:3000` | Used in email links. It also decides whether the session cookie requires HTTPS. |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT` | Empty | Sends verification and password-reset emails. When empty, the links are printed in the API logs. |
| `ADMIN_EMAILS` | `demo@example.com` | Comma-separated emails with access to the admin panel. On a real deployment the API refuses to start with the demo account in it. |
| `GOOGLE_CLIENT_ID` | Empty | Enables Google sign-in. When empty, only email sign-in works. |
| `MARKET_DATA_SOURCE_URL` | Valuonic production | Where `seed_demo` and `sync_prices` download history from. |
| `CORS_ORIGINS` | Not set | Only needed if you move the app off port 3000 (see Troubleshooting). |

### Troubleshooting

**`Cannot connect to the Docker daemon` or `docker: command not found`**
Docker is not installed or not running. Open Docker Desktop and wait until it reports that the engine is running.

**`port is already allocated` (3000 or 8000)**
Another program is using that port. Close it, or change the number on the left of the `ports` mapping in `docker-compose.yml`. If you move the app, for example to `3001:80`, also add these two lines to `.env`:

```
FRONTEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3001
```

If you move the API, also update `VITE_API_URL` in `docker-compose.yml`. Then run `docker compose up -d --build --force-recreate`.

**My code changes don't show up**
The images contain a copy of your code. Run `docker compose up -d --build` after every change.

**The verification link is not in the logs**
`SMTP_USER` and `SMTP_PASSWORD` must be empty in `.env`. If they have values, the API tries to send a real email instead of printing the link.

**The Google button shows an error**
Set `GOOGLE_CLIENT_ID` in `.env` and add `http://localhost:3000` as an authorized JavaScript origin in Google Cloud. Then run `docker compose up -d --build --force-recreate`.

**The charts are empty or stop at an old date**
The price history is missing or outdated. Run `docker compose exec api python -m app.sync_prices`.

**`seed_demo` prints "seed_demo es solo para desarrollo local"**
This is the safety check. `FRONTEND_URL` in `.env` must point to `http://localhost:...` for the demo user to be created.

**Windows line endings**
There is nothing to configure. `.gitattributes` makes Git use LF line endings on every operating system.

### Project structure

| Path | Contents |
|---|---|
| `backend/` | FastAPI app (`app/`) and database migrations (`alembic/`). |
| `frontend/` | React + Vite app, served by nginx in Docker. |
| `samples/` | Demo transactions used by `seed_demo`, in the same format as the CSV import. |
| `docker-compose.yml` | Local development stack. |
| `docker-compose.prod.yml` | Production stack, using prebuilt images. |
| `.github/workflows/` | Builds the Docker images and publishes them to GitHub Container Registry. |

---

## Production

On every push to `main`, GitHub Actions builds the images and publishes them to GitHub Container Registry. On the server, `docker-compose.prod.yml` runs those images, and Watchtower updates them automatically.

- Start from `.env.example` and change every value marked `[PROD]`. For `SECRET_KEY`, use `openssl rand -hex 32`; on Windows it is available in Git Bash.
- **After editing the server's `.env`, recreate the API.** Watchtower recreates containers with the settings they already had and does not re-read the file.

  ```bash
  docker compose -f docker-compose.prod.yml up -d --force-recreate api
  ```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## License

[MIT](LICENSE)
