# KubeLearn

A gamified platform for learning Kubernetes and preparing for the KCNA, CKA, CKAD and CKS certifications.

- **4 learning paths, 61 lessons**: readings, quizzes and 27 hands-on labs, including troubleshooting, NetworkPolicy and quota scenarios
- **Hands-on labs**: a simulated 3-node cluster runs on the server. `kubectl` commands change its state and validation checks the result, so only real solutions pass. The simulator covers:
  - scheduling, taints and drains
  - image pull errors, CrashLoopBackOff (missing env or ConfigMap) and OOMKilled
  - ResourceQuota admission
  - RBAC
  - NetworkPolicies, including DNS egress, tested with `kubectl exec -- curl/wget/nc/nslookup`
  - YAML manifests written in an in-lab editor and applied with `kubectl apply -f`
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

## Run locally (Windows 11 / PowerShell)

Prerequisites: Node.js 22 and Docker Desktop.

```powershell
# Start PostgreSQL in Docker
docker compose up -d

# Create your local environment file, then set NEXTAUTH_SECRET in it
Copy-Item .env.example .env

# Install dependencies (also generates the Prisma client)
npm install

# Create the tables
npm run db:migrate

# Load the course content (add $env:SEED_DEMO_USER="true" first for a demo login)
npm run db:seed

# Start the dev server on http://localhost:3000
npm run dev
```

The demo account (when seeded with `SEED_DEMO_USER=true`) is `demo@kubelearn.dev` / `kubelearn-demo`.

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
| `pods` | enough Pods matching a selector are Running (optionally not on a given node) |
| `endpoints` | a Service has at least N ready endpoints |
| `connectivity` | a client Pod can (or can't) open a connection to `host:port` through Services, DNS and NetworkPolicies |
| `can-i` | an RBAC question (`kubectl auth can-i`) has the expected answer |

Lab resources can describe container behaviour: `envFrom`, `env`, `requiredEnv` (the app crashes without these variables), `resources` and `memoryUsage` (above the limit it gets OOMKilled).

Troubleshooting labs start from a broken `initialState`. A seed with the same kind and name as a base resource (for example, a cordoned `worker-1` Node) replaces it.

## Deploy to AWS

The CDK app in `infra/` creates:

- a VPC (public, private and isolated subnets, 1 NAT gateway)
- RDS PostgreSQL 16 (encrypted, 7-day backups, deletion protection)
- ECS Fargate (2–6 tasks, CPU autoscaling) behind an Application Load Balancer
- CloudFront (HTTPS, edge caching for static assets)
- Secrets Manager secrets for the database, NextAuth and the CloudFront→ALB origin header

The container runs `prisma migrate deploy` and the seed on start, then starts Next.js.

```powershell
cd infra
npm install
npx cdk bootstrap     # once per account/region
npx cdk deploy        # prints AppUrl when done
```

Add `-c multiAz=true` for a standby database in a second Availability Zone.

### Azure DevOps

`azure-pipelines.yml` validates pull requests (lint, type-check, build) and deploys `main`:

1. Install the **AWS Toolkit for Azure DevOps** extension.
2. Create an AWS service connection named `aws-kubelearn` (or change `awsServiceConnection`).
3. Optionally add approvals to the `kubelearn-production` environment.

## Security notes

- Every request body is validated with zod. Login, registration, quiz answers, lab commands and exam starts are rate-limited, with counters stored in Postgres.
- Lesson and exam APIs never send correct answers or lab checks to the browser. Quizzes, labs and exams are scored on the server.
- Security headers (CSP, HSTS, frame denial) are set in `next.config.mjs`.
- The load balancer only accepts requests carrying CloudFront's secret header.
