# ☸️ VaultedMind Infrastructure

Production-grade Kubernetes orchestration for VaultedMind using **K3s**, **ArgoCD**, and **Traefik**.

## 🏗️ Deployment Architecture

### 1. GitOps with ArgoCD
The cluster state is synchronized with this repository.
- **Root App**: `k8s/argocd/root-app.yaml`
- **Namespaces**: All resources reside in the `vault-prod` namespace.

### 2. Network Isolation (Zero Trust)
We enforce strict traffic rules using `NetworkPolicies`:
- **Backend Isolation**: Only pods with label `app: vault-frontend` and the Ingress Controller can reach the backend.
- **Database Isolation**: Only pods with label `app: vault-backend` can reach the PostgreSQL database.

### 3. Edge Security (Traefik)
Traefik handles incoming traffic with hardened security middlewares:
- **security-headers**: HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff.
- **TLS**: Automated SSL certificates via Let's Encrypt and cert-manager.

---

## 🚀 Setup Instructions

### 1. Secret Management
Secrets are **not** stored in Git. You must create them manually before syncing:

```bash
# Database Secrets
kubectl create secret generic postgres-secret \
  --from-literal=username='postgres' \
  --from-literal=password='YOUR_SECURE_PASSWORD' \
  -n vault-prod

# Backend Secrets
kubectl create secret generic vault-backend-secret \
  --from-literal=jwt-secret='YOUR_JWT_SECRET' \
  --from-literal=encryption-key='YOUR_AES_256_HEX_KEY' \
  -n vault-prod
```

### 2. Deployment with Kustomize
```bash
# Frontend
kubectl apply -k k8s/services/frontend/overlays/prod

# Backend
kubectl apply -k k8s/services/backend/overlays/prod

# Database
kubectl apply -k k8s/services/postgres/overlays/prod
```

---

## 📊 Monitoring & Logs
- **Logs**: `kubectl logs -n vault-prod -l app=vault-backend`
- **Status**: `kubectl get pods -n vault-prod`

---
© 2026 VaultedMind SRE Team
