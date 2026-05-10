# Kubernetes Deployment

Manifests K8s pour déployer Vault sur un cluster K3s avec ArgoCD.

## Structure

```
k8s/
├── postgres/        # PostgreSQL database
├── backend/         # NestJS backend API
├── frontend/        # Next.js frontend
└── argocd-apps/     # ArgoCD Application resources
```

## Prérequis

- K3s cluster running
- ArgoCD installed
- kubectl configured
- Traefik Ingress Controller (comes with K3s)

## Étapes de déploiement

### 1. Créer le namespace
```bash
kubectl create namespace vault-prod
```

### 2. Créer les secrets (IMPORTANT: faire avant ArgoCD sync)
```bash
# PostgreSQL credentials
kubectl create secret generic postgres-secret \
  --from-literal=username='postgres' \
  --from-literal=password='CHANGE_ME_SECURE_PASSWORD' \
  -n vault-prod

# Backend secrets
kubectl create secret generic vault-backend-secret \
  --from-literal=jwt-secret='CHANGE_ME_RANDOM_JWT_SECRET' \
  --from-literal=encryption-key='<VOTRE_CLE_AES_256_64_CHARS_HEXADECIMAUX>' \
  -n vault-prod
```

### 3. Mettre à jour le domaine
Edit `k8s/frontend/ingress.yaml`:
```yaml
- host: your-domain.com  # Change this
```

### 4. Ajouter les Applications ArgoCD

Option A: Via kubectl
```bash
kubectl apply -f k8s/argocd-apps/postgres-app.yaml
kubectl apply -f k8s/argocd-apps/backend-app.yaml
kubectl apply -f k8s/argocd-apps/frontend-app.yaml
```

Option B: Via ArgoCD UI
- ArgoCD URL: https://192.168.1.94:31921
- New App → Git Repo → VaultedBack
- App Name: vault-postgres, Path: k8s/postgres
- Repeat for backend and frontend

### 5. Vérifier le déploiement
```bash
kubectl get pods -n vault-prod
kubectl get svc -n vault-prod
kubectl get ingress -n vault-prod
```

## Services internes

- **Backend API:** `http://vault-backend:3000` (accessible depuis le cluster)
- **PostgreSQL:** `postgresql://postgres:password@postgres:5432/vaultedmind_db`
- **Frontend:** Accessible via domaine Cloudflare

## Configuration Cloudflare

1. Ajouter DNS record:
   - Type: A
   - Name: app
   - Content: 192.168.1.94 (IP du cluster)
   - Proxy: On

2. SSL/TLS: Full (ou Flexible selon ta setup)

3. Firewall: Configure selon tes besoins

## Monitoring

```bash
# Logs backend
kubectl logs -f deployment/vault-backend -n vault-prod

# Logs frontend
kubectl logs -f deployment/vault-frontend -n vault-prod

# Logs postgres
kubectl logs -f deployment/postgres -n vault-prod

# Port-forward pour debugging
kubectl port-forward svc/vault-backend 3000:3000 -n vault-prod
```

## Notes

- Les secrets doivent être créés AVANT le premier sync d'ArgoCD
- ArgoCD auto-synce à chaque push sur main
- PostgreSQL utilise une PVC 20Gi (à adapter selon tes besoins)
- Les images viennent de ghcr.io/victoragahi/
