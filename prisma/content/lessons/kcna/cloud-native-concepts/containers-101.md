# Containers 101

## What are Containers?

Containers are lightweight, standalone, executable packages that include everything needed to run a piece of software: code, runtime, system tools, libraries, and settings.

## Containers vs Virtual Machines

| Feature | Containers | VMs |
|---------|-----------|-----|
| **Boot time** | Seconds | Minutes |
| **Size** | MBs | GBs |
| **OS** | Shares host kernel | Full OS per VM |
| **Isolation** | Process-level | Hardware-level |
| **Density** | 1000s per host | Tens per host |

## Container Images

A container image is a lightweight, standalone, and executable software package that includes:

- Application code
- Runtime environment
- System libraries
- Configuration files

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Container Registries

Container images are stored in **registries**:

- **Docker Hub** - Public registry with millions of images
- **Google Container Registry (GCR)** - Google's managed registry
- **Amazon ECR** - AWS managed registry
- **GitHub Container Registry** - GitHub's registry

## The OCI Standard

The **Open Container Initiative (OCI)** defines industry standards for container formats and runtimes, ensuring portability across different platforms.

> **Key Takeaway**: Containers solve the "it works on my machine" problem by packaging applications with all their dependencies.
