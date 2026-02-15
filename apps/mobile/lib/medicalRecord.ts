import { BrowserProvider, Contract, type Signer } from "ethers";
import MedicalRecord from "@/constants/MedicalRecord.json";
import { MEDICAL_RECORD_ADDRESS } from "@/constants/address";

// Minimal type for the EIP-1193 compatible provider passed by AppKit
type Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

const abi = MedicalRecord.abi;

/**
 * Checks whether contract bytecode exists at MEDICAL_RECORD_ADDRESS.
 * When a local Hardhat node is restarted all previous deployments are lost,
 * so calls to the old address return `0x` and ethers throws BAD_DATA.
 * Call this once before issuing contract reads/writes to surface a clear message.
 */
export async function ensureContractDeployed(signer: Signer): Promise<void> {
  const provider = signer.provider;
  if (!provider) {
    throw new ContractNotDeployedError(
      "No provider available on signer – is the wallet connected?",
    );
  }

  const code = await provider.getCode(MEDICAL_RECORD_ADDRESS);
  // "0x" or "0x0" means no bytecode at that address
  if (!code || code === "0x" || code === "0x0") {
    throw new ContractNotDeployedError(
      `No contract found at ${MEDICAL_RECORD_ADDRESS}. ` +
        "The local Hardhat node was probably restarted. " +
        "Redeploy the contract with:\n" +
        "  npx hardhat ignition deploy ignition/modules/MedicalRecord.ts --network localhost",
    );
  }
}

/** Sentinel class so callers can distinguish deployment errors from other failures. */
export class ContractNotDeployedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractNotDeployedError";
  }
}

/**
 * Wraps a contract call with a user-friendly error for BAD_DATA / missing-contract scenarios.
 * Usage:  const data = await safeContractCall(() => contract.getRecords(addr));
 */
export async function safeContractCall<T>(
  signer: Signer,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    // ethers v6 uses code "BAD_DATA" when it cannot decode return data
    if (
      err?.code === "BAD_DATA" ||
      (typeof err?.message === "string" &&
        err.message.includes("could not decode result data"))
    ) {
      // Double-check whether the contract is actually deployed
      await ensureContractDeployed(signer);

      // If ensureContractDeployed didn't throw, the contract exists but the
      // ABI is out of sync – give a different hint.
      throw new Error(
        "Contract returned unexpected data. " +
          "The on-chain contract may have been redeployed with a different ABI. " +
          "Run `pnpm sync-abi` in packages/contracts and restart the app.",
      );
    }
    throw err;
  }
}

export type AccessRequest = {
  requester: string;
  timestamp: bigint;
  status: bigint;
  durationInHours: bigint;
  grantedAt: bigint;
  expiresAt: bigint;
};

export type RecordItem = {
  ipfsHash: string;
  fileName: string;
  doctor: string;
  timestamp: bigint;
};

export async function getMedicalRecordContract(provider: Provider) {
  const ethersProvider = new BrowserProvider(provider as any);
  const signer = await ethersProvider.getSigner();
  return new Contract(MEDICAL_RECORD_ADDRESS, abi, signer);
}

export function getMedicalRecordContractWithSigner(signer: Signer) {
  return new Contract(MEDICAL_RECORD_ADDRESS, abi, signer);
}

export function requestStatusLabel(status: bigint) {
  switch (Number(status)) {
    case 0:
      return "Pending";
    case 1:
      return "Approved";
    case 2:
      return "Rejected";
    default:
      return "Unknown";
  }
}

export function isAccessExpired(expiresAt: bigint): boolean {
  if (Number(expiresAt) === 0) return true;
  return Math.floor(Date.now() / 1000) > Number(expiresAt);
}

export function formatRemainingTime(expiresAt: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = Number(expiresAt);
  if (expiry === 0) return "No access";
  const diff = expiry - now;
  if (diff <= 0) return "Expired";
  if (diff < 60) return `${diff}s remaining`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m remaining`;
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${h}h ${m}m remaining`;
  }
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  return `${d}d ${h}h remaining`;
}

export function formatDuration(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

export function formatTimestamp(ts: bigint): string {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTimestampShort(ts: bigint): string {
  const date = new Date(Number(ts) * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function timeSince(ts: bigint): string {
  const diff = Math.floor(Date.now() / 1000) - Number(ts);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
