# Lab: CrashLoopBackOff

The `orders` Deployment in the `shop` namespace never becomes ready. The developers say the app reads its database settings from a ConfigMap called `orders-config`:

- `DB_HOST=postgres.data.svc.cluster.local`
- `DB_PORT=5432`

## Tasks

1. Find out why the Pods aren't running (`get pods`, `describe`, `get events`).
2. Fix it. The ConfigMap must hold **both** settings.
3. If the Pods start and then crash, read their logs (`kubectl logs deploy/orders -n shop --previous`).
4. Confirm both `orders` Pods are `Running`.
