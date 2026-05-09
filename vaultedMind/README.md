# 🛡️ VaultedMind Backend

Backend ultra-sécurisé pour application de santé mentale, bâti avec **NestJS**, **TypeORM**, et une **Clean Architecture** modulaire.

## 🚀 Stack Technique

- **Node.js**: v24.14.0+
- **Yarn**: v4.6.0 (Berry)
- **Framework**: NestJS 11
- **Base de données**: PostgreSQL 15
- **ORM**: TypeORM (ESM Mode)
- **Architecture**: Clean Architecture / EAV Model

## 🏗️ Architecture

Le projet suit une séparation stricte des responsabilités :
- `src/common/` : Exceptions globales, décorateurs, utilitaires.
- `src/config/` : Configuration typée et centralisée.
- `src/database/` : Entités, migrations et Repositories génériques.
- `src/modules/` : Modules métier (User, Logs, etc.).

### Modèle EAV (Entity-Attribute-Value)
L'application utilise un modèle EAV pour permettre une flexibilité totale dans le suivi des indicateurs de santé mentale :
- **User** : Propriétaire des données.
- **CustomField** : Définition dynamique des champs (ex: Humeur, Sommeil).
- **DailyLog** : Entrée journalière.
- **FieldValue** : Valeur associée à un champ pour un log donné.

## 🛠️ Installation

```bash
# Activer Corepack pour utiliser la bonne version de Yarn
corepack enable

# Installation des dépendances
yarn install

# Lancer la base de données
docker-compose up -d

# Appliquer les migrations
yarn migration:run
```

## ⚙️ Développement

```bash
# Linting & Build check
yarn lint
yarn build

# Lancer en mode dev
yarn start:dev
```

## 🔒 Sécurité & Qualité
- **Typage Strict** : Aucun `any` autorisé, Generics utilisés partout.
- **Soft Delete** : Historique conservé via `deleted_at`.
- **Transactions** : Support natif dans le Base Repository via `executeInTransaction`.
- **CI/CD** : GitHub Actions vérifie chaque push (Build + Lint).
- **Husky** : Pre-commit linting activé.
