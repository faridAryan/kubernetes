# Lab: Your First Pod

Create an isolated namespace and run a web server in it.

## Tasks

1. Create a namespace called `sandbox`.
2. Run a Pod named `web` in the `sandbox` namespace using the image `nginx:1.27`.
3. Add the label `tier=frontend` to the `web` Pod.
4. Confirm it's running with `kubectl get pods -n sandbox --show-labels`.

> Remember `-n sandbox` on every command, otherwise kubectl uses the `default` namespace.
