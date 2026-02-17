# CareID

CareID is a decentralised healthcare identity and records platform.
It gives patients ownership of their medical data while allowing healthcare providers to request time-bound access through on-chain permissions. The system combines a provider web portal, a patient mobile app, a backend upload API, and smart contracts that enforce auditable access control.

## Project Structure

This repository is a pnpm workspace managed with Turborepo.

### Applications (`apps/*`)

- `apps/web`: Provider-facing Next.js portal for searching patients, requesting/reviewing record access, and uploading/viewing records.
- `apps/mobile`: Patient-facing Expo app for managing identity, consent, and record-sharing from a phone.
- `apps/backend`: Express service that handles file uploads and pushes files to Pinata/IPFS.
- `apps/docs`: Next.js documentation app for project docs and internal reference pages.

### Shared Packages (`packages/*`)

- `packages/contracts`: Solidity contracts + Hardhat tooling for medical record metadata and access-permission logic.
- `packages/ui`: Reusable UI components shared across frontend apps.
- `packages/eslint-config`: Central ESLint presets used by workspace apps.
- `packages/typescript-config`: Shared TypeScript configuration presets.

## Tech Stack

- Monorepo: Turborepo + pnpm workspaces
- Web: Next.js + React
- Mobile: Expo + React Native
- Backend: Express
- Contracts: Solidity + Hardhat
- Storage: Pinata/IPFS

## Getting Started

### Prerequisites

- Node.js `>=18`
- pnpm `9.x`

### Install dependencies

```bash
pnpm install
```

### Run everything for local development (Windows)

```bash
pnpm dev:local
```

This script will:

1. Start a local Hardhat node
2. Deploy contracts
3. Sync contract address and ABI to apps
4. Start backend, web, and mobile dev servers

### Useful root commands

```bash
pnpm dev          # Run turborepo dev pipeline
pnpm build        # Build all apps/packages
pnpm lint         # Run lint tasks across workspace
pnpm check-types  # Run TypeScript checks across workspace
pnpm sync-abi     # Sync contract ABI to dependent apps
```

## Contribution Guide

### 1. Create a branch

Use a focused branch name, for example:

```bash
git checkout -b feat/patient-history-filter
```

### 2. Make your changes

Keep changes scoped to one concern (UI, contract logic, backend API, etc.).

### 3. Validate locally

Before opening a PR, run:

```bash
pnpm lint
pnpm check-types
pnpm build
```

If you changed smart contracts, also run:

```bash
pnpm --filter contracts exec hardhat test
pnpm sync-abi
```

### 4. Open a pull request

Include:

- What changed
- Why it changed
- Screenshots/videos for UI updates
- Any migration or environment variable requirements

### 5. PR review expectations

- Keep PRs small and reviewable
- Resolve all review comments before merge
- Avoid mixing refactors with feature changes unless necessary

## Contract Notes

Contract-specific commands and deployment details are documented in `packages/contracts/README.md`.