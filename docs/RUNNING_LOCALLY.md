# Running KubeLearn Locally

This guide gets KubeLearn running on your machine for development. Commands are written for **Windows 11 / PowerShell**. They work the same in a macOS or Linux terminal, except `Copy-Item` (use `cp`).

## 1. Prerequisites

| Tool | Version | Check with |
|------|---------|------------|
| [Node.js](https://nodejs.org/) | 22 LTS | `node -v` |
| npm | comes with Node | `npm -v` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | any recent | `docker version` |
| Git | any recent | `git --version` |

Docker is only used to run PostgreSQL. If you already have PostgreSQL 16 installed, you can use that instead and skip step 3.

## 2. Get the code

```powershell
# Download the repository
git clone https://github.com/faridAryan/kubernetes.git
# Move into the project folder
cd kubernetes
```

## 3. Start the database

```powershell
# Start PostgreSQL 16 in the background (defined in docker-compose.yml)
docker compose up -d
# Check it's running: the STATUS column should say "Up"
docker compose ps
```

The database listens on `localhost:5432` with user `postgres`, password `postgres` and database `kubelearn`. Its data is kept in the `pgdata` Docker volume, so it survives restarts.

## 4. Configure environment variables

```powershell
# Create your local settings file from the template
Copy-Item .env.example .env
# Generate a random secret for signing login sessions, and copy the output
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Open `.env` and paste the generated value into `NEXTAUTH_SECRET`:

```dotenv
# Connection string for the database started in step 3
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kubelearn?schema=public"
# Random value used to sign session cookies; never reuse it between environments
NEXTAUTH_SECRET="paste-the-generated-value-here"
# The URL you open in the browser
NEXTAUTH_URL="http://localhost:3000"
# "true" creates the login demo@kubelearn.dev / kubelearn-demo when seeding
SEED_DEMO_USER="true"
```

`.env` is git-ignored, so it never gets committed.

## 5. Install, create the tables and load the content

```powershell
# Install dependencies; this also generates the Prisma database client
npm install
# Create all tables by applying the migrations in prisma/migrations
npm run db:migrate
# Load certification paths, lessons, quizzes, labs and badges (safe to run again)
npm run db:seed
```

`db:migrate` only creates the tables. You always need `db:seed` afterwards to load the course content.

## 6. Start the app

```powershell
# Start the development server with hot reload
npm run dev
```

Open <http://localhost:3000>. Sign in with the demo account (`demo@kubelearn.dev` / `kubelearn-demo`) or register a new user.

Stop the server with `Ctrl+C`, and the database with `docker compose stop`.

## Everyday commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server with hot reload |
| `npm run lint` | ESLint with the Next.js rules |
| `npm run typecheck` | TypeScript check of the app, seed and content |
| `npm run build` | Production build (also lints and type-checks) |
| `npm start` | Runs the production build on port 3000 |
| `npm run db:migrate` | Applies migrations; after a `schema.prisma` change it creates a new migration |
| `npm run db:seed` | Upserts course content and badges without touching learners' progress |
| `npm run db:studio` | Opens Prisma Studio to browse the database |

### After changing course content

Lessons live in `prisma/content/`. After editing them, run `npm run db:seed` again. It updates the existing rows in place.

### After changing the database schema

```powershell
# Create a new migration from your schema.prisma changes and apply it
npm run db:migrate -- --name describe_your_change
```

Commit the new folder in `prisma/migrations/`. The cloud deployment applies it automatically.

### Start over with an empty database

```powershell
# Stop PostgreSQL and delete its data volume
docker compose down -v
# Start a fresh, empty PostgreSQL
docker compose up -d
# Recreate the tables
npm run db:migrate
# Reload the course content
npm run db:seed
```

## Run the production container locally (optional)

This runs exactly the image that is deployed to AWS. The database from step 3 must be running.

```powershell
# Build the production image from the Dockerfile
docker build -t kubelearn .
# Run it on port 3000; the container reaches your local PostgreSQL through host.docker.internal
docker run --rm -p 3000:3000 `
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/kubelearn?schema=public" `
  -e NEXTAUTH_SECRET="paste-a-generated-secret-here" `
  -e NEXTAUTH_URL="http://localhost:3000" `
  -e SEED_ON_START="true" `
  kubelearn
```

On start-up, the container applies any pending migrations, seeds the content (because `SEED_ON_START=true`) and then starts the server. Several containers can start at once safely: the seed takes a database lock.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `port is already allocated` when starting Docker | Another PostgreSQL is using 5432. Stop it, or change the port mapping in `docker-compose.yml` and the port in `DATABASE_URL`. |
| `Can't reach database server at localhost:5432` | Start Docker Desktop, then `docker compose up -d`. |
| The home page loads but certification pages are empty | You skipped `npm run db:seed`. |
| `[next-auth][warn][NO_SECRET]` | `NEXTAUTH_SECRET` is missing from `.env`. |
| "Too many login attempts" | Login is rate-limited to 5 tries per 15 minutes per email. Wait, or run `docker compose exec postgres psql -U postgres -d kubelearn -c 'DELETE FROM "RateLimit";'`. |
| A lab still behaves the old way after an update | Lab sessions keep their cluster state. Wait for the session's time limit, or click **Start a fresh cluster** when it expires. |
