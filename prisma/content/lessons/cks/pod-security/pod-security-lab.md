# Lab: Enforce Pod Security Standards

Apply Pod Security Admission to two namespaces.

## Tasks

1. `prod` must **enforce** the `restricted` level.
2. `sandbox` must **enforce** `baseline` and **warn** on `restricted` violations.
3. Check the labels with `kubectl get ns --show-labels`.

Label keys look like `pod-security.kubernetes.io/<mode>=<level>`.
