# Lab: Organise Pods with Labels

Three Pods run in the `default` namespace: `api-1`, `api-2` and `cache`.

## Tasks

1. Label `api-1` and `api-2` with `env=prod`.
2. Label `cache` with `env=staging`.
3. Run a Pod named `debug` with the image `busybox:1.36` and the labels `app=debug,env=dev`.
4. List only the production Pods with a label selector.
