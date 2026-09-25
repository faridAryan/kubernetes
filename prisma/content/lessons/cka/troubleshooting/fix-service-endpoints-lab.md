# Lab: Service Has No Endpoints

The `cart` Service in the `shop` namespace returns connection errors, although the `cart` Pods are healthy. The app listens on port **8080**.

## Tasks

1. Check the Service's endpoints.
2. Compare the Service selector with the Pod labels and fix the Service **without deleting the Deployment**.
3. Keep the Service on port **80**, forwarding to **8080**.
4. Confirm the Service now has 2 endpoints.
