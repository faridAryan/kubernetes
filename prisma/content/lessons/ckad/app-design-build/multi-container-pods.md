# Multi-Container Pod Patterns

Pods can contain multiple containers that work together. There are three main patterns:

## 1. Sidecar Pattern

A sidecar container enhances the main container's functionality.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-logging
spec:
  containers:
  - name: web
    image: nginx
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  - name: log-shipper
    image: fluentd
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  volumes:
  - name: logs
    emptyDir: {}
```

**Use cases**: Logging agents, monitoring, sync processes

## 2. Ambassador Pattern

An ambassador container proxies network connections to the main container.

**Use cases**: Database proxy, API gateway, connection pooling

## 3. Adapter Pattern

An adapter container transforms the main container's output.

**Use cases**: Log format conversion, monitoring data adaptation

## Shared Resources

Containers in a pod share:
- **Network namespace** - Same IP address, communicate via localhost
- **Storage volumes** - Can mount the same volumes
- **Process namespace** (optional) - Can see each other's processes

> **CKAD Tip**: Know all three patterns and when to use each. Exam questions often describe a scenario and ask you to implement the right pattern.
