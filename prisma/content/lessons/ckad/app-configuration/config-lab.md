# Lab: Configure an App

The `shop` namespace is ready for a new service.

## Tasks

1. Create a ConfigMap named `app-config` in `shop` with:
   - `APP_MODE=production`
   - `LOG_LEVEL=info`
2. Create a generic Secret named `db-creds` in `shop` with:
   - `username=shop`
   - `password=s3cure-pass`
3. Inspect both with `kubectl describe`. Notice that the Secret's values are not printed.
