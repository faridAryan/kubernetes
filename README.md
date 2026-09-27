# KubeLearn

A gamified platform for learning Kubernetes and preparing for the KCNA, CKA, CKAD and CKS certifications.

- **4 learning paths, 71 lessons**: readings, quizzes and 32 hands-on labs, including troubleshooting, NetworkPolicy, quota, health-probe and storage scenarios
- **Hands-on labs**: a simulated 3-node cluster runs on the server. `kubectl` commands change its state and validation checks the result, so only real solutions pass. The simulator covers:
  - scheduling, taints and drains
  - image pull errors, CrashLoopBackOff (missing env or ConfigMap) and OOMKilled
  - ResourceQuota admission
  - liveness, readiness and startup probes (restarts, unready Pods, missing endpoints)
  - StorageClasses, PersistentVolumes and claims (static and dynamic binding, WaitForFirstConsumer, reclaim policies, expansion)
  - RBAC
  - NetworkPolicies, including DNS egress, tested with `kubectl exec -- curl/wget/nc/nslookup`
  - YAML manifests written in an in-lab editor and applied with `kubectl apply -f`, exported with `get -o yaml > file`, generated with `--dry-run=client -o yaml`, or changed with `kubectl patch`
- **Worked solutions**: after two failed validations (or when time runs out) a lab's solution can be revealed. Finishing after viewing it earns half the XP.
- **Timed mock exams** drawn from each path's question bank
- **Spaced-repetition review** of questions you answered wrong
- **XP, levels, streaks, badges, leaderboard and verifiable certificates**

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Next.js 14 (App Router, server components), TypeScript, Tailwind |
| Auth | NextAuth (credentials, JWT sessions) |
| Data | PostgreSQL with Prisma |
| Validation | zod |
| Hosting | AWS: CloudFront → ALB → ECS Fargate → RDS PostgreSQL, provisioned with CDK (TypeScript) |
| CI/CD | Azure DevOps (`azure-pipelines.yml`) |

## Documentation

| Guide | Covers |
|-------|--------|
| [Running locally](docs/RUNNING_LOCALLY.md) | Setup on Windows 11, everyday commands, running the production container, troubleshooting |
| [Deploying to AWS](docs/DEPLOYING_TO_AWS.md) | Architecture, costs, first deploy with CDK, updates, Azure DevOps pipeline, operations, tear-down |

## Quick start (Windows 11 / PowerShell)

Prerequisites: Node.js 22 and Docker Desktop.

```powershell
# Start PostgreSQL in Docker
docker compose up -d
# Create your local environment file, then set NEXTAUTH_SECRET (and SEED_DEMO_USER="true" for a demo login) in it
Copy-Item .env.example .env
# Install dependencies (also generates the Prisma client)
npm install
# Create the tables
npm run db:migrate
# Load the course content
npm run db:seed
# Start the dev server on http://localhost:3000
npm run dev
```

The demo account (when seeded with `SEED_DEMO_USER="true"`) is `demo@kubelearn.dev` / `kubelearn-demo`. The full walkthrough is in [docs/RUNNING_LOCALLY.md](docs/RUNNING_LOCALLY.md).

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript checks |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Upsert course content and badges (safe to re-run) |
| `npm run db:studio` | Browse the database |

## Project layout

```
prisma/
  schema.prisma          Postgres schema
  migrations/            Versioned migrations
  seed.ts                Idempotent content seeder
  content/               Course catalog (typed) + lessons/<path>/<module>/<lesson>.md
src/
  app/                   Pages (server components) and API routes
  components/            Client components (quiz, lab terminal, exam, ...)
  lib/
    lab/                 kubectl simulator, cluster state, checks, sessions
    learning/            progress, unlocking, quizzes, review queue, exams, certificates
    gamification/        XP, streaks, badges
    queries/             Data loading for pages
    validation/          zod schemas
infra/                   AWS CDK app
```

## Adding content

1. Write the lesson body in `prisma/content/lessons/<path>/<module>/<lesson>.md`. A lab's Markdown file holds its instructions.
2. Register the lesson in `prisma/content/<path>.ts`. Quizzes list their questions; labs list their starting cluster resources (`initialState`), `hints` and `checks`.
3. Run `npm run db:seed`. In AWS, content is applied automatically when the containers start.

Lab checks can require:

| Check | Passes when |
|-------|-------------|
| `command` | a matching command was run |
| `exists` | a resource exists with the given fields (`match`) and without forbidden values (`exclude`) |
| `absent` | a resource is gone |
| `pods` | enough Pods matching a selector are Running (optionally Ready, or not on a given node) |
| `endpoints` | a Service has at least N ready endpoints |
| `connectivity` | a client Pod can (or can't) open a connection to `host:port` through Services, DNS and NetworkPolicies |
| `can-i` | an RBAC question (`kubectl auth can-i`) has the expected answer |
| `claim-volume` | the PersistentVolume bound to a claim has the given fields (works for dynamically named PVs) |

Every lab also has a `solution` (explanation, commands and optional files). It's shown to learners after failed attempts, and the content test runs it to prove each lab is solvable.

Lab resources can describe container behaviour: `envFrom`, `env`, `requiredEnv` (the app crashes without these variables), `resources` and `memoryUsage` (above the limit it gets OOMKilled), plus `listenPort`, `httpPaths` and `startupSeconds`, which probes and connections are checked against.

Troubleshooting labs start from a broken `initialState`. A seed with the same kind and name as a base resource (for example, a cordoned `worker-1` Node) replaces it.

## Deploy to AWS

`infra/` is an AWS CDK app that builds the image and creates CloudFront, an Application Load Balancer, ECS Fargate, RDS PostgreSQL 16 and Secrets Manager secrets. Containers apply migrations and seed the content on start.

```powershell
# Move into the CDK project
cd infra
# Install the CDK dependencies
npm ci
# Once per account and region
npx cdk bootstrap
# Build, push and deploy; prints AppUrl when done
npx cdk deploy
```

`azure-pipelines.yml` validates pull requests and deploys `main`. Setup, costs, operations and tear-down are covered in [docs/DEPLOYING_TO_AWS.md](docs/DEPLOYING_TO_AWS.md).

## Security notes

- Every request body is validated with zod. Login, registration, quiz answers, lab commands and exam starts are rate-limited, with counters stored in Postgres.
- Lesson and exam APIs never send correct answers or lab checks to the browser. Quizzes, labs and exams are scored on the server.
- Security headers (CSP, HSTS, frame denial) are set in `next.config.mjs`.
- The load balancer only accepts requests carrying CloudFront's secret header.
