# Lab: Fix Leaked Credentials and Unpinned Images

A review of the `billing` namespace found two problems:

- the ConfigMap `billing-config` stores `DB_PASSWORD` in plain text next to `DB_HOST=db`,
- the `billing` Deployment runs `nginx:latest`.

## Tasks

1. The old password must be treated as leaked. Create a Secret `billing-db` in `billing` holding the **rotated** password `DB_PASSWORD=N3w-Pa55-2024`.
2. Replace `billing-config` with a ConfigMap of the same name that only contains `DB_HOST=db`.
3. Pin the `billing` Deployment's `nginx` container to `nginx:1.27.2`.
