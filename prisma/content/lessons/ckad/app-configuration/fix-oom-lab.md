# Lab: Right-Size a Crashing App

The `thumbnailer` Deployment in `media` keeps restarting. It processes images in memory and needs about **180Mi** at peak.

## Tasks

1. Find out why the container is being restarted (`kubectl describe pod`: look at **Last State**).
2. Set the Deployment's memory **request to 128Mi** and **limit to 256Mi**.
3. Confirm both Pods are `Running`.
