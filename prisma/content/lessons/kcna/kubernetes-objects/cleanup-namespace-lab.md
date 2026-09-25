# Lab: Clean Up Leftovers

A team migrated away and left resources behind. Clean up without breaking what's still in use.

## Tasks

1. Delete the whole `old-team` namespace, along with everything in it.
2. Delete the leftover `tmp-debug` Pod in the `default` namespace.
3. **Keep** the `api` Deployment in `default` running with its 2 replicas.

> Deleting a namespace deletes every namespaced object inside it. Double-check the name first!
