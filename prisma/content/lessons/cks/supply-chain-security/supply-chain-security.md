# Supply Chain and Secrets Security

An attacker who can't break into your cluster may simply ship you a malicious image, or read a password left in plain text.

## Pin your images

`nginx:latest` can change under you at any time. Pin a specific version, or better, an immutable digest:

```bash
kubectl set image deployment/billing nginx=nginx:1.27.2
# strongest: nginx@sha256:<digest>
```

## Scan and sign

- **Scan** images for known CVEs in CI (Trivy, Grype) and fail the build on critical findings.
- **Sign** images (Sigstore cosign) and verify signatures at admission time (Kyverno, Connaisseur, policy-controller).
- Use minimal base images (distroless, alpine) to shrink the attack surface.
- Restrict allowed registries with an admission policy.

## Keep secrets out of ConfigMaps

ConfigMaps are readable by anyone with broad `get` access and often end up in Git. Credentials belong in Secrets, which are:

- separately RBAC-controlled,
- encrypted at rest when `EncryptionConfiguration` is enabled on the API server,
- never baked into images or committed to Git. Use a secrets manager (Vault, AWS Secrets Manager plus the External Secrets Operator) for the source of truth.

```bash
kubectl create secret generic billing-db --from-literal=DB_PASSWORD='<new password>' -n billing
kubectl delete configmap billing-config -n billing
kubectl create configmap billing-config --from-literal=DB_HOST=db -n billing
```

> **Rotate, don't just move**: a password that was ever stored in plain text should be considered leaked. Rotate it when moving it into a Secret.
