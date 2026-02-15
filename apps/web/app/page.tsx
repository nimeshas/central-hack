"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import MedicalRecord from "../constants/MedicalRecord.json";
import { MEDICAL_RECORD_ADDRESS } from "../constants/address";
import styles from "./page.module.css";
import { AiChat } from "./components/AiChat";

type RecordItem = {
  ipfsHash: string;
  fileName: string;
  doctor: `0x${string}`;
  timestamp: bigint;
};

type AccessRequestItem = {
  requester: string;
  timestamp: bigint;
  status: bigint;
  durationInHours: bigint;
  grantedAt: bigint;
  expiresAt: bigint;
};

type NavItem =
  | "dashboard"
  | "patient-access"
  | "uploads"
  | "verifications"
  | "settings"
  | "support";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const ipfsGateway =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud";
const abi = MedicalRecord.abi;

function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTimestamp(ts: bigint): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

const DURATION_OPTIONS = [
  { label: "1 Hour", hours: 1 },
  { label: "6 Hours", hours: 6 },
  { label: "12 Hours", hours: 12 },
  { label: "24 Hours", hours: 24 },
  { label: "48 Hours", hours: 48 },
  { label: "7 Days", hours: 168 },
  { label: "30 Days", hours: 720 },
] as const;

function formatDuration(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

function formatRemainingTime(expiresAt: bigint): string {
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

function isAccessExpired(expiresAt: bigint): boolean {
  if (Number(expiresAt) === 0) return true;
  return Math.floor(Date.now() / 1000) > Number(expiresAt);
}

function formatTime(ts: bigint): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(addr: string): string {
  if (!addr) return "??";
  const hex = addr.replace("0x", "").slice(0, 4).toUpperCase();
  return hex.slice(0, 2);
}

function getInitialColor(addr: string): string {
  const colors = [
    "#6366f1",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ef4444",
    "#14b8a6",
  ];
  if (!addr) return colors[0]!;
  const idx = parseInt(addr.slice(2, 4) || "0", 16) % colors.length;
  return colors[idx]!;
}

function categorizeRecord(name: string): {
  type: string;
  format: string;
  dept: string;
} {
  const n = name.toLowerCase();
  if (n.includes("mri"))
    return { type: "MRI Scan", format: "DICOM Format", dept: "Radiology" };
  if (n.includes("x-ray") || n.includes("xray"))
    return { type: "X-Ray", format: "DICOM Format", dept: "Radiology" };
  if (n.includes("ct"))
    return { type: "CT Scan", format: "DICOM Format", dept: "Radiology" };
  if (n.includes("blood") || n.includes("cbc") || n.includes("lipid"))
    return { type: "Blood Test", format: "PDF Report", dept: "Pathology" };
  if (n.includes("ecg") || n.includes("ekg"))
    return { type: "ECG Report", format: "PDF Report", dept: "Cardiology" };
  if (n.includes("prescription") || n.includes("rx"))
    return {
      type: "Prescription",
      format: "Digital RX",
      dept: "General Practice",
    };
  if (n.includes("lab") || n.includes("report"))
    return { type: "Lab Report", format: "PDF Report", dept: "Pathology" };
  if (n.includes("scan") || n.includes("ultrasound"))
    return { type: "Scan", format: "DICOM Format", dept: "Radiology" };
  if (n.includes("insurance") || n.includes("claim"))
    return { type: "Insurance", format: "PDF", dept: "Administration" };
  return {
    type: "Medical Record",
    format: "PDF Report",
    dept: "General Practice",
  };
}

function StatusBadge({ status }: { status: string }) {
  let cls = styles.badgeAvailable;
  if (
    status === "Pending" ||
    status === "Pending Audit" ||
    status === "Processing"
  )
    cls = styles.badgePending;
  else if (status === "Archived" || status === "Closed")
    cls = styles.badgeArchived;
  else if (status === "Rejected") cls = styles.badgeRejected;
  else if (status === "Expired") cls = styles.badgeExpired;
  else if (
    status === "Confirmed" ||
    status === "Verified" ||
    status === "Available" ||
    status === "Approved"
  )
    cls = styles.badgeAvailable;
  else if (status === "Action Needed") cls = styles.badgeAction;
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
}

/* ------------------------------------------------------------------ */
/*  SIDEBAR                                                           */
/* ------------------------------------------------------------------ */
function Sidebar({
  active,
  onNavigate,
  pendingVerifications,
}: {
  active: NavItem;
  onNavigate: (v: NavItem) => void;
  pendingVerifications: number;
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon} aria-hidden="true" />
          <span className={styles.logoText}>CareID</span>
        </div>

        <nav className={styles.sidebarNav}>
          <button
            className={`${styles.navItem} ${active === "dashboard" ? styles.navItemActive : ""}`}
            onClick={() => onNavigate("dashboard")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </button>
          <button
            className={`${styles.navItem} ${active === "patient-access" ? styles.navItemActive : ""}`}
            onClick={() => onNavigate("patient-access")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            Patient Access
          </button>
          <button
            className={`${styles.navItem} ${active === "uploads" ? styles.navItemActive : ""}`}
            onClick={() => onNavigate("uploads")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Uploads
          </button>
          <button
            className={`${styles.navItem} ${active === "verifications" ? styles.navItemActive : ""}`}
            onClick={() => onNavigate("verifications")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Verifications
            {pendingVerifications > 0 && (
              <span className={styles.navBadge}>{pendingVerifications}</span>
            )}
          </button>
        </nav>

        <div className={styles.sidebarDivider} />
        <p className={styles.sidebarSectionLabel}>SYSTEM</p>
        <nav className={styles.sidebarNav}>
          <button
            className={`${styles.navItem} ${active === "settings" ? styles.navItemActive : ""}`}
            onClick={() => onNavigate("settings")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Privacy & Permissions
          </button>
          <button
            className={`${styles.navItem} ${active === "support" ? styles.navItemActive : ""}`}
            onClick={() => onNavigate("support")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Support
          </button>
        </nav>
      </div>

      <div className={styles.sidebarBottom}>
        <div className={styles.sidebarDivider} />
        <div className={styles.sidebarUser}>
          <div className={styles.sidebarAvatar}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className={styles.sidebarUserInfo}>
            <span className={styles.sidebarUserName}>Dr. Ashman Singh</span>
            <span className={styles.sidebarUserRole}>Nurse</span>
          </div>
          <button className={styles.sidebarLogout} title="Disconnect">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        <div className={styles.sidebarWallet}>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  TOP BAR                                                           */
/* ------------------------------------------------------------------ */
function TopBar({
  searchValue,
  onSearch,
  title,
  sidebarOpen,
  onToggleSidebar,
}: {
  searchValue: string;
  onSearch: (v: string) => void;
  title: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className={styles.topBar}>
      <button
        className={styles.topBarMenuBtn}
        title={sidebarOpen ? "Hide menu" : "Show menu"}
        onClick={onToggleSidebar}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className={styles.searchBox}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={
            title === "Patient Access"
              ? "Search patient by Wallet ID, NHID, or Name..."
              : "Search by Patient ID, Name, or Record..."
          }
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className={styles.topBarRight}>
        <div className={styles.networkBadge}>
          <span className={styles.networkDot} />
          Network Online
        </div>
        <button className={styles.topBarIcon} title="Notifications">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGINATION                                                        */
/* ------------------------------------------------------------------ */
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i <= 3 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        &lt;
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className={styles.pageDots}>
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`}
            onClick={() => onPage(p as number)}
          >
            {p}
          </button>
        ),
      )}
      <button
        className={styles.pageBtn}
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
      >
        &gt;
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DASHBOARD VIEW                                                    */
/* ------------------------------------------------------------------ */
function DashboardView({
  records,
  requests,
  onNavigate,
}: {
  records: RecordItem[];
  requests: AccessRequestItem[];
  onNavigate: (v: NavItem) => void;
}) {
  const [page, setPage] = useState(1);
  const perPage = 5;

  const pendingVerifications = requests.filter(
    (r) => Number(r.status) === 0,
  ).length;

  type ActivityRow = {
    id: string;
    time: string;
    patientId: string;
    initials: string;
    color: string;
    actionType: string;
    initiator: string;
    status: string;
  };

  const activityRows: ActivityRow[] = useMemo(() => {
    const rows: ActivityRow[] = [];
    for (const req of requests) {
      const st = Number(req.status);
      rows.push({
        id: `req-${req.requester}-${req.timestamp}`,
        time: `${formatTimestamp(req.timestamp)}, ${formatTime(req.timestamp)}`,
        patientId: `PID-${req.requester.slice(2, 6).toUpperCase()}`,
        initials: getInitials(req.requester),
        color: getInitialColor(req.requester),
        actionType:
          st === 1
            ? "Access Granted"
            : st === 2
              ? "Consent Revoked"
              : "Verification Req",
        initiator: truncateAddress(req.requester),
        status: st === 0 ? "Action Needed" : st === 1 ? "Confirmed" : "Closed",
      });
    }
    for (const rec of records) {
      rows.push({
        id: `rec-${rec.ipfsHash}`,
        time: `${formatTimestamp(rec.timestamp)}, ${formatTime(rec.timestamp)}`,
        patientId: `PID-${rec.doctor.slice(2, 6).toUpperCase()}`,
        initials: getInitials(rec.doctor),
        color: getInitialColor(rec.doctor),
        actionType: "Record Upload",
        initiator: truncateAddress(rec.doctor),
        status: "Processing",
      });
    }
    rows.sort((a, b) => {
      if (a.time > b.time) return -1;
      if (a.time < b.time) return 1;
      return 0;
    });
    return rows;
  }, [records, requests]);

  const totalPages = Math.max(1, Math.ceil(activityRows.length / perPage));
  const pagedRows = activityRows.slice((page - 1) * perPage, page * perPage);
  const showFrom = activityRows.length === 0 ? 0 : (page - 1) * perPage + 1;
  const showTo = Math.min(page * perPage, activityRows.length);

  return (
    <div className={styles.viewContent}>
      <div className={styles.viewHeader}>
        <div>
          <h1 className={styles.viewTitle}>Dashboard Overview</h1>
          <p className={styles.viewSubtitle}>
            Welcome back, here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className={styles.viewActions}>
          <button
            className={styles.btnOutline}
            onClick={() => onNavigate("patient-access")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => onNavigate("uploads")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Record
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardBlue}`}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconWrap}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: "translateY(1px)" }}
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <span className={styles.statTrend}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M23 6l-9.5 9.5-5-5L1 18" />
              </svg>
              +5.2%
            </span>
          </div>
          <p className={styles.statLabel}>Active Consents</p>
          <p className={styles.statValue}>
            {requests
              .filter((r) => Number(r.status) === 1)
              .length.toLocaleString()}
          </p>
        </div>

        <div className={`${styles.statCard} ${styles.statCardAmber}`}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconWrap}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
          </div>
          <p className={styles.statLabel}>Total Records</p>
          <p className={styles.statValue}>{records.length.toLocaleString()}</p>
        </div>

        <div className={`${styles.statCard} ${styles.statCardRed}`}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconWrap}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendWarn}`}>
              Action Needed
            </span>
          </div>
          <p className={styles.statLabel}>Pending Verifications</p>
          <p className={styles.statValue}>{pendingVerifications}</p>
        </div>

        <div className={`${styles.statCard} ${styles.statCardGreen}`}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconWrap}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className={styles.statTrend}>Stable</span>
          </div>
          <p className={styles.statLabel}>System Uptime</p>
          <p className={styles.statValue}>99.9%</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitle}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h2>Recent Activity</h2>
          </div>
          <button className={styles.linkBtn}>View All History</button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>PATIENT ID</th>
                <th>ACTION TYPE</th>
                <th>INITIATOR</th>
                <th>STATUS</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.tableEmpty}>
                    No recent activity. Connect your wallet and load patient
                    data to see activity here.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.cellMuted}>{row.time}</td>
                    <td>
                      <div className={styles.patientIdCell}>
                        <span
                          className={styles.avatarCircle}
                          style={{ background: row.color }}
                        >
                          {row.initials}
                        </span>
                        {row.patientId}
                      </div>
                    </td>
                    <td>
                      <span
                        className={styles.actionDot}
                        style={{
                          background:
                            row.actionType === "Access Granted"
                              ? "#10b981"
                              : row.actionType === "Record Upload"
                                ? "#3b82f6"
                                : row.actionType === "Consent Revoked"
                                  ? "#ef4444"
                                  : "#f59e0b",
                        }}
                      />
                      {row.actionType}
                    </td>
                    <td>{row.initiator}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <button className={styles.detailsBtn}>&#8230;</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooter}>
          <span className={styles.tableFooterText}>
            Showing {showFrom}-{showTo} of {activityRows.length} records
          </span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PATIENT ACCESS VIEW                                               */
/* ------------------------------------------------------------------ */
function PatientAccessView({
  patientAddress,
  setPatientAddress,
  validPatient,
  hasAccess,
  accessExpiry,
  records,
  recordsQuery,
  accessQuery,
  handleRequestAccess,
  requestDuration,
  setRequestDuration,
  isPending,
  address,
}: {
  patientAddress: string;
  setPatientAddress: (v: string) => void;
  validPatient: boolean;
  hasAccess: boolean | undefined;
  accessExpiry: bigint | undefined;
  records: RecordItem[];
  recordsQuery: { refetch: () => void; isFetching: boolean; error: unknown };
  accessQuery: { refetch: () => void };
  handleRequestAccess: () => void;
  requestDuration: number;
  setRequestDuration: (v: number) => void;
  isPending: boolean;
  address?: string;
}) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [historyOpen, setHistoryOpen] = useState(false);
  const perPage = 5;

  const enrichedRecords = useMemo(() => {
    return records.map((r, i) => {
      const cat = categorizeRecord(r.fileName);
      return { ...r, ...cat, index: i };
    });
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = enrichedRecords;
    if (typeFilter !== "All Types") {
      result = result.filter((r) => r.type === typeFilter);
    }
    if (timeFilter === "Last 6 Months") {
      const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
      result = result.filter((r) => Number(r.timestamp) * 1000 > cutoff);
    } else if (timeFilter === "Last Year") {
      const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
      result = result.filter((r) => Number(r.timestamp) * 1000 > cutoff);
    }
    return result.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  }, [enrichedRecords, typeFilter, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / perPage));
  const pagedRecords = filteredRecords.slice(
    (page - 1) * perPage,
    page * perPage,
  );
  const showFrom = filteredRecords.length === 0 ? 0 : (page - 1) * perPage + 1;
  const showTo = Math.min(page * perPage, filteredRecords.length);

  const patientLoaded = validPatient && records.length > 0;

  return (
    <div className={styles.viewContent}>
      {/* Search / entry bar */}
      <div className={styles.patientSearchBar}>
        <input
          className={styles.patientSearchInput}
          placeholder="Enter patient wallet address (0x...)"
          value={patientAddress}
          onChange={(e) => setPatientAddress(e.target.value)}
        />
        <div className={styles.patientSearchActions}>
          <select
            className={styles.filterSelect}
            value={requestDuration}
            onChange={(e) => setRequestDuration(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.hours} value={opt.hours}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className={styles.btnOutline}
            onClick={() => accessQuery.refetch()}
            disabled={!validPatient || !address}
          >
            Check Access
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleRequestAccess}
            disabled={isPending}
          >
            Request Access
          </button>
        </div>
      </div>

      {/* Patient Info Card */}
      {validPatient && (
        <div className={styles.patientCard}>
          <div className={styles.patientCardLeft}>
            <div
              className={styles.patientAvatarLg}
              style={{ background: getInitialColor(patientAddress) }}
            >
              {getInitials(patientAddress)}
            </div>
            <div className={styles.patientInfo}>
              <h2 className={styles.patientName}>
                Patient {patientAddress.slice(2, 6).toUpperCase()}
              </h2>
              <div className={styles.patientMeta}>
                <span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  ID: #P-{patientAddress.slice(2, 6).toUpperCase()}-
                  {patientAddress.slice(38, 40).toUpperCase()}
                </span>
              </div>
              <div className={styles.patientAddressRow}>
                <code className={styles.addressCode}>
                  {truncateAddress(patientAddress)}
                </code>
                <button
                  className={styles.copyBtn}
                  onClick={() => navigator.clipboard.writeText(patientAddress)}
                >
                  Copy Address
                </button>
              </div>
            </div>
          </div>
          <div className={styles.patientCardRight}>
            <div
              className={`${styles.consentBox} ${hasAccess ? styles.consentGranted : styles.consentDenied}`}
            >
              {hasAccess ? (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#15803d"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div>
                    <strong>Active Consent Granted</strong>
                    <p>
                      {accessExpiry
                        ? formatRemainingTime(accessExpiry)
                        : "Access via Smart Contract"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <div>
                    <strong>
                      {hasAccess === undefined
                        ? "Access Unknown"
                        : accessExpiry && Number(accessExpiry) > 0
                          ? "Access Expired"
                          : "Access Not Granted"}
                    </strong>
                    <p>Request access from patient</p>
                  </div>
                </>
              )}
            </div>
            <div className={styles.consentActions}>
              <button
                className={styles.btnOutline}
                onClick={() => setHistoryOpen(!historyOpen)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                History
              </button>
              <button className={styles.btnDanger}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitle}>
            <h2>Medical Records</h2>
            <span className={styles.countBadge}>{filteredRecords.length}</span>
          </div>
          <div className={styles.tableFilters}>
            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option>All Types</option>
              <option>MRI Scan</option>
              <option>X-Ray</option>
              <option>Blood Test</option>
              <option>ECG Report</option>
              <option>Prescription</option>
              <option>Lab Report</option>
              <option>Scan</option>
              <option>Insurance</option>
              <option>Medical Record</option>
            </select>
            <select
              className={styles.filterSelect}
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option>All Time</option>
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
            <button
              className={styles.btnOutlineSm}
              onClick={() => recordsQuery.refetch()}
              disabled={!validPatient || !address}
            >
              {recordsQuery.isFetching ? "Loading..." : "Load Records"}
            </button>
          </div>
        </div>

        {recordsQuery.error ? (
          <div className={styles.errorBanner}>
            Unable to fetch records. Ensure access is approved for this patient.
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>RECORD TYPE</th>
                <th>DATE ADDED</th>
                <th>DEPARTMENT</th>
                <th>PROVIDER</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pagedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.tableEmpty}>
                    {patientLoaded
                      ? "No records match the current filters."
                      : "Enter a patient address and load records to view them here."}
                  </td>
                </tr>
              ) : (
                pagedRecords.map((r, i) => (
                  <tr key={`${r.ipfsHash}-${i}`}>
                    <td>
                      <div className={styles.recordTypeCell}>
                        <span
                          className={styles.recordTypeIcon}
                          style={{
                            background:
                              r.type.includes("Scan") ||
                              r.type.includes("X-Ray")
                                ? "#dbeafe"
                                : r.type.includes("Prescription")
                                  ? "#fef2f2"
                                  : r.type.includes("ECG")
                                    ? "#f0fdf4"
                                    : "#ede9fe",
                            color:
                              r.type.includes("Scan") ||
                              r.type.includes("X-Ray")
                                ? "#3b82f6"
                                : r.type.includes("Prescription")
                                  ? "#ef4444"
                                  : r.type.includes("ECG")
                                    ? "#22c55e"
                                    : "#8b5cf6",
                          }}
                        >
                          {r.type.includes("Scan") ||
                          r.type.includes("X-Ray") ? (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="2" y="2" width="20" height="20" rx="2" />
                              <circle cx="12" cy="12" r="4" />
                            </svg>
                          ) : r.type.includes("Prescription") ? (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
                            </svg>
                          ) : (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                        </span>
                        <div>
                          <strong>{r.fileName}</strong>
                          <span className={styles.recordFormatSub}>
                            {r.format}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.cellMuted}>
                      {formatTimestamp(r.timestamp)}
                    </td>
                    <td>{r.dept}</td>
                    <td>{truncateAddress(r.doctor)}</td>
                    <td>
                      <StatusBadge status="Available" />
                    </td>
                    <td>
                      {hasAccess ? (
                        <a
                          className={styles.viewLink}
                          href={`${ipfsGateway}/ipfs/${r.ipfsHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        <span
                          className={styles.cellMuted}
                          title="Request access to view this document"
                        >
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooter}>
          <span className={styles.tableFooterText}>
            Showing {showFrom} to {showTo} of {filteredRecords.length} results
          </span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  UPLOAD & VERIFICATION VIEW                                        */
/* ------------------------------------------------------------------ */
function UploadsView({
  patientAddress,
  setPatientAddress,
  fileName,
  setFileName,
  file,
  setFile,
  handleUpload,
  isPending,
  requests,
  isConnected,
  handleRespondToRequest,
}: {
  patientAddress: string;
  setPatientAddress: (v: string) => void;
  fileName: string;
  setFileName: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  handleUpload: () => void;
  isPending: boolean;
  requests: AccessRequestItem[];
  isConnected: boolean;
  handleRespondToRequest: (requestId: number, approve: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const [recordType, setRecordType] = useState("Blood Records");
  const [department, setDepartment] = useState("General Practice");
  const perPage = 5;

  const verificationQueue = useMemo(() => {
    return requests
      .map((r, i) => ({
        ...r,
        index: i,
        patientName: `Patient ${r.requester.slice(2, 6).toUpperCase()}`,
        treatment:
          Number(r.status) === 0
            ? "Pending Verification"
            : Number(r.status) === 1
              ? "Verified Record"
              : "Rejected Record",
      }))
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  }, [requests]);

  const totalPages = Math.max(1, Math.ceil(verificationQueue.length / perPage));
  const pagedQueue = verificationQueue.slice(
    (page - 1) * perPage,
    page * perPage,
  );

  const [dragOver, setDragOver] = useState(false);

  return (
    <div className={styles.viewContent}>
      <div className={styles.uploadGrid}>
        {/* Upload Form */}
        <div className={styles.uploadCard}>
          <div className={styles.uploadCardHeader}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h2>Upload Record</h2>
          </div>
          <p className={styles.uploadDesc}>
            Records are encrypted and stored on IPFS. This action requires a
            wallet signature.
          </p>

          <label className={styles.formLabel}>Patient Public Key / ID</label>
          <input
            className={styles.formInputDark}
            placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
            value={patientAddress}
            onChange={(e) => setPatientAddress(e.target.value)}
          />

          <label className={styles.formLabel}>Record Type</label>
          <select
            className={styles.formSelect}
            value={recordType}
            onChange={(e) => setRecordType(e.target.value)}
          >
            <option>Blood Records</option>
            <option>MRI Scan</option>
            <option>X-Ray</option>
            <option>ECG Report</option>
            <option>Prescription</option>
            <option>Lab Report</option>
            <option>Insurance Document</option>
          </select>

          <label className={styles.formLabel}>Department</label>
          <select
            className={styles.formSelect}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option>General Practice</option>
            <option>Radiology</option>
            <option>Pathology</option>
            <option>Cardiology</option>
            <option>Rehabilitation</option>
            <option>Dentistry</option>
            <option>Administration</option>
          </select>

          <label className={styles.formLabel}>Record Title (optional)</label>
          <input
            className={styles.formInput}
            placeholder="MRI Scan, Blood Report..."
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />

          <label className={styles.formLabel}>Attachment</label>
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
            }}
            onClick={() => document.getElementById("fileUploadInput")?.click()}
          >
            <input
              id="fileUploadInput"
              type="file"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className={styles.dropZoneFile}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>{file.name}</span>
                <button
                  className={styles.removeFile}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  &times;
                </button>
              </div>
            ) : (
              <>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className={styles.dropText}>
                  Upload a file or drag and drop
                </p>
                <p className={styles.dropHint}>DICOM, PDF, PNG up to 50MB</p>
              </>
            )}
          </div>

          <button
            className={styles.btnUpload}
            onClick={handleUpload}
            disabled={isPending || !isConnected}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {isPending ? "Uploading..." : "Sign & Upload"}
          </button>

          <div className={styles.complianceNotice}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <strong>Compliance Notice</strong>
              <p>
                Ensure patient consent token is valid before uploading sensitive
                records. All actions are logged on-chain.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Queue */}
        <div className={styles.verificationCard}>
          <div className={styles.verificationHeader}>
            <div className={styles.verificationTitle}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <h2>Verification Queue</h2>
            </div>
            <p className={styles.verificationDesc}>
              Pending insurance verifications requiring admin approval.
            </p>
          </div>

          <div className={styles.verificationSearch}>
            <input className={styles.formInput} placeholder="Search ID..." />
            <button className={styles.filterIconBtn}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PATIENT / ID</th>
                  <th>TREATMENT</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pagedQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.tableEmpty}>
                      No verification requests. Connect wallet and load data.
                    </td>
                  </tr>
                ) : (
                  pagedQueue.map((item, idx) => {
                    const st = Number(item.status);
                    const statusText =
                      st === 0 ? "Pending" : st === 1 ? "Verified" : "Rejected";
                    const isImmutable = st !== 0;
                    return (
                      <tr key={`${item.requester}-${idx}`}>
                        <td>
                          <div className={styles.patientIdCell}>
                            <span
                              className={styles.avatarCircle}
                              style={{
                                background: getInitialColor(item.requester),
                              }}
                            >
                              {getInitials(item.requester)}
                            </span>
                            <div>
                              <strong>{item.patientName}</strong>
                              <span className={styles.cellSubtext}>
                                {truncateAddress(item.requester)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span>{item.treatment}</span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span>{formatTimestamp(item.timestamp)}</span>
                            <span className={styles.cellSubtext}>
                              {formatTime(item.timestamp)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={statusText} />
                        </td>
                        <td>
                          {isImmutable ? (
                            <span className={styles.cellMuted}>Immutable</span>
                          ) : (
                            <div className={styles.queueActions}>
                              <button
                                className={styles.approveSmBtn}
                                title="Approve"
                                disabled={!isConnected || isPending}
                                onClick={() =>
                                  handleRespondToRequest(item.index, true)
                                }
                              >
                                &#10003;
                              </button>
                              <button
                                className={styles.rejectSmBtn}
                                title="Reject"
                                disabled={!isConnected || isPending}
                                onClick={() =>
                                  handleRespondToRequest(item.index, false)
                                }
                              >
                                &#10005;
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            <span className={styles.tableFooterText}>
              Showing 1 to {pagedQueue.length} of {verificationQueue.length}{" "}
              results
            </span>
            <div className={styles.paginationSimple}>
              <button
                className={styles.pageBtnSimple}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className={styles.pageBtnSimple}
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PLACEHOLDER VIEW                                                  */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  SETTINGS / PRIVACY & PERMISSIONS VIEW                             */
/* ------------------------------------------------------------------ */
function SettingsView({
  requests,
  activeAccessors,
  handleRespondToRequest,
  handleRevokeAccess,
  handleExtendAccess,
  isPending,
  onRefresh,
}: {
  requests: AccessRequestItem[];
  activeAccessors: [string[], bigint[]];
  handleRespondToRequest: (requestId: number, approve: boolean) => void;
  handleRevokeAccess: (requester: string) => void;
  handleExtendAccess: (requester: string, additionalHours: number) => void;
  isPending: boolean;
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"permissions" | "pending" | "log">(
    "pending",
  );
  const [permPage, setPermPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [extendAddr, setExtendAddr] = useState<string | null>(null);
  const [extendHours, setExtendHours] = useState(24);
  const perPage = 5;

  const pendingRequests = useMemo(
    () =>
      requests
        .map((r, i) => ({ ...r, index: i }))
        .filter((r) => Number(r.status) === 0)
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp)),
    [requests],
  );

  const resolvedRequests = useMemo(
    () =>
      requests
        .map((r, i) => ({ ...r, index: i }))
        .filter((r) => Number(r.status) !== 0)
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp)),
    [requests],
  );

  /* Full access log: every request ever, in chronological order */
  const accessLog = useMemo(() => {
    return requests
      .map((r, i) => {
        const st = Number(r.status);
        const wasApproved = st === 1;
        const expired =
          wasApproved &&
          Number(r.expiresAt) > 0 &&
          isAccessExpired(r.expiresAt);
        let eventType: string;
        if (st === 0) eventType = "Access Requested";
        else if (st === 2) eventType = "Access Rejected";
        else if (expired) eventType = "Access Expired";
        else eventType = "Access Granted";
        return { ...r, index: i, eventType, wasApproved, expired };
      })
      .sort((a, b) => {
        const tsA =
          a.wasApproved && Number(a.grantedAt) > 0
            ? Number(a.grantedAt)
            : Number(a.timestamp);
        const tsB =
          b.wasApproved && Number(b.grantedAt) > 0
            ? Number(b.grantedAt)
            : Number(b.timestamp);
        return tsB - tsA;
      });
  }, [requests]);

  const [accessAddresses, accessExpiries] = activeAccessors;

  /* Stats */
  const totalApproved = requests.filter((r) => Number(r.status) === 1).length;
  const totalRejected = requests.filter((r) => Number(r.status) === 2).length;
  const expiredCount = resolvedRequests.filter(
    (r) =>
      Number(r.status) === 1 &&
      Number(r.expiresAt) > 0 &&
      isAccessExpired(r.expiresAt),
  ).length;

  /* Pagination for active permissions */
  const permTotalPages = Math.max(
    1,
    Math.ceil(accessAddresses.length / perPage),
  );
  const pagedPerms = accessAddresses.slice(
    (permPage - 1) * perPage,
    permPage * perPage,
  );

  /* Pagination for log */
  const logTotalPages = Math.max(1, Math.ceil(accessLog.length / perPage));
  const pagedLog = accessLog.slice((logPage - 1) * perPage, logPage * perPage);

  /* Helper: compute how much % of time has elapsed for a permission */
  function expiryProgress(
    grantedAtReq: AccessRequestItem | undefined,
    expiry: bigint,
  ): number {
    const now = Math.floor(Date.now() / 1000);
    const exp = Number(expiry);
    if (exp === 0 || now >= exp) return 100;
    /* Try to find the matching request to know grantedAt */
    const granted = grantedAtReq ? Number(grantedAtReq.grantedAt) : 0;
    if (granted === 0 || granted >= exp) return 50;
    const total = exp - granted;
    const elapsed = now - granted;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  /* Find the matching request for an active accessor to get grantedAt */
  function findRequestForAddr(addr: string): AccessRequestItem | undefined {
    for (let i = requests.length - 1; i >= 0; i--) {
      if (
        requests[i]!.requester.toLowerCase() === addr.toLowerCase() &&
        Number(requests[i]!.status) === 1
      )
        return requests[i];
    }
    return undefined;
  }

  /* Time since a request was made */
  function timeSince(ts: bigint): string {
    const diff = Math.floor(Date.now() / 1000) - Number(ts);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className={styles.viewContent}>
      {/* Header */}
      <div className={styles.viewHeader}>
        <div>
          <h1 className={styles.viewTitle}>Privacy &amp; Permissions</h1>
          <p className={styles.viewSubtitle}>
            Manage who can access your medical records, review requests, and
            audit the full access log.
          </p>
        </div>
        <div className={styles.viewActions}>
          <button className={styles.btnOutline} onClick={onRefresh}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardBlue}`}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconWrap}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
          </div>
          <p className={styles.statLabel}>Active Now</p>
          <p className={styles.statValue}>{accessAddresses.length}</p>
        </div>

        <div className={`${styles.statCard} ${styles.statCardAmber}`}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconWrap}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            {pendingRequests.length > 0 && (
              <span className={`${styles.statTrend} ${styles.statTrendWarn}`}>
                Action Needed
              </span>
            )}
          </div>
          <p className={styles.statLabel}>Pending Requests</p>
          <p className={styles.statValue}>{pendingRequests.length}</p>
        </div>

        <div className={`${styles.statCard} ${styles.statCardGreen}`}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconWrap}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <p className={styles.statLabel}>Total Approved</p>
          <p className={styles.statValue}>{totalApproved}</p>
        </div>

        <div className={`${styles.statCard} ${styles.statCardRed}`}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconWrap}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          </div>
          <p className={styles.statLabel}>Rejected / Expired</p>
          <p className={styles.statValue}>{totalRejected + expiredCount}</p>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className={styles.settingsTabs}>
        <button
          className={`${styles.settingsTab} ${activeTab === "pending" ? styles.settingsTabActive : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Pending Requests
          {pendingRequests.length > 0 && (
            <span className={styles.navBadge}>{pendingRequests.length}</span>
          )}
        </button>
        <button
          className={`${styles.settingsTab} ${activeTab === "permissions" ? styles.settingsTabActive : ""}`}
          onClick={() => setActiveTab("permissions")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Active Permissions
          {accessAddresses.length > 0 && (
            <span className={styles.navBadge}>{accessAddresses.length}</span>
          )}
        </button>
        <button
          className={`${styles.settingsTab} ${activeTab === "log" ? styles.settingsTabActive : ""}`}
          onClick={() => setActiveTab("log")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Access Log
          {requests.length > 0 && (
            <span className={styles.navBadge}>{requests.length}</span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  PENDING REQUESTS TAB                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "pending" && (
        <div className={styles.tableCard}>
          <div className={styles.tableCardHeader}>
            <div className={styles.tableCardTitle}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h2>Incoming Access Requests</h2>
              <span className={styles.countBadge}>
                {pendingRequests.length}
              </span>
            </div>
            <span className={styles.tableFooterText}>
              Review and approve or deny access to your medical records
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className={styles.ppEmptyState}>
              <div className={styles.ppEmptyIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3>No Pending Requests</h3>
              <p>
                You&apos;re all caught up. New access requests from doctors or
                providers will appear here for your approval.
              </p>
            </div>
          ) : (
            <>
              {pendingRequests.map((req) => (
                <div
                  key={`pending-${req.index}`}
                  className={styles.ppRequestCard}
                >
                  <div className={styles.ppRequestLeft}>
                    <span
                      className={styles.avatarCircle}
                      style={{ background: getInitialColor(req.requester) }}
                    >
                      {getInitials(req.requester)}
                    </span>
                    <div className={styles.ppRequestInfo}>
                      <div className={styles.ppRequestName}>
                        <strong>
                          Dr. {req.requester.slice(2, 6).toUpperCase()}
                        </strong>
                        <StatusBadge status="Pending" />
                      </div>
                      <code className={styles.ppRequestAddr}>
                        {truncateAddress(req.requester)}
                      </code>
                      <div className={styles.ppRequestMeta}>
                        <span className={styles.ppMetaItem}>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Requested {timeSince(req.timestamp)}
                        </span>
                        <span className={styles.ppMetaItem}>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {formatTimestamp(req.timestamp)},{" "}
                          {formatTime(req.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.ppRequestRight}>
                    <div className={styles.ppDurationBox}>
                      <span className={styles.ppDurationLabel}>
                        Duration Requested
                      </span>
                      <span className={styles.durationBadge}>
                        {formatDuration(Number(req.durationInHours))}
                      </span>
                    </div>
                    <div className={styles.ppActionBtns}>
                      <button
                        className={styles.ppApproveBtn}
                        disabled={isPending}
                        onClick={() => handleRespondToRequest(req.index, true)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Approve
                      </button>
                      <button
                        className={styles.ppRejectBtn}
                        disabled={isPending}
                        onClick={() => handleRespondToRequest(req.index, false)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  ACTIVE PERMISSIONS TAB                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "permissions" && (
        <div className={styles.tableCard}>
          <div className={styles.tableCardHeader}>
            <div className={styles.tableCardTitle}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <h2>Active Access Grants</h2>
              <span className={styles.countBadge}>
                {accessAddresses.length}
              </span>
            </div>
            <span className={styles.tableFooterText}>
              These addresses currently have access to your records
            </span>
          </div>

          {accessAddresses.length === 0 ? (
            <div className={styles.ppEmptyState}>
              <div className={styles.ppEmptyIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <h3>No Active Permissions</h3>
              <p>
                No one currently has access to your medical records. Approved
                requests will appear here with their time-limited access status.
              </p>
            </div>
          ) : (
            <>
              {pagedPerms.map((addr, localIdx) => {
                const globalIdx = (permPage - 1) * perPage + localIdx;
                const expiry = accessExpiries[globalIdx]!;
                const expired = isAccessExpired(expiry);
                const matchReq = findRequestForAddr(addr);
                const pct = expiryProgress(matchReq, expiry);
                const barColor = expired
                  ? "#ef4444"
                  : pct > 75
                    ? "#f59e0b"
                    : "#10b981";
                return (
                  <div key={addr} className={styles.ppPermCard}>
                    <div className={styles.ppPermTop}>
                      <div className={styles.ppPermUser}>
                        <span
                          className={styles.avatarCircle}
                          style={{ background: getInitialColor(addr) }}
                        >
                          {getInitials(addr)}
                        </span>
                        <div>
                          <strong>Dr. {addr.slice(2, 6).toUpperCase()}</strong>
                          <code className={styles.ppRequestAddr}>
                            {truncateAddress(addr)}
                          </code>
                        </div>
                      </div>
                      <div className={styles.ppPermActions}>
                        {!expired && (
                          <>
                            <button
                              className={styles.ppExtendBtn}
                              onClick={() =>
                                setExtendAddr(extendAddr === addr ? null : addr)
                              }
                              disabled={isPending}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              Extend
                            </button>
                            <button
                              className={styles.btnDangerSm}
                              onClick={() => handleRevokeAccess(addr)}
                              disabled={isPending}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                              </svg>
                              Revoke
                            </button>
                          </>
                        )}
                        {expired && <StatusBadge status="Expired" />}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className={styles.ppProgressRow}>
                      <div className={styles.ppProgressInfo}>
                        <span className={styles.ppProgressLabel}>
                          {expired
                            ? "Access expired"
                            : formatRemainingTime(expiry)}
                        </span>
                        <span className={styles.ppProgressLabel}>
                          Expires{" "}
                          {new Date(Number(expiry) * 1000).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                      <div className={styles.ppProgressTrack}>
                        <div
                          className={styles.ppProgressBar}
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>

                    {/* Extend panel (inline) */}
                    {extendAddr === addr && !expired && (
                      <div className={styles.ppExtendPanel}>
                        <span className={styles.ppExtendLabel}>
                          Extend access by:
                        </span>
                        <select
                          className={styles.filterSelect}
                          value={extendHours}
                          onChange={(e) =>
                            setExtendHours(Number(e.target.value))
                          }
                        >
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt.hours} value={opt.hours}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className={styles.ppApproveBtn}
                          disabled={isPending}
                          onClick={() => {
                            handleExtendAccess(addr, extendHours);
                            setExtendAddr(null);
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          className={styles.btnOutlineSm}
                          onClick={() => setExtendAddr(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className={styles.tableFooter}>
                <span className={styles.tableFooterText}>
                  Showing{" "}
                  {Math.min(
                    (permPage - 1) * perPage + 1,
                    accessAddresses.length,
                  )}
                  -{Math.min(permPage * perPage, accessAddresses.length)} of{" "}
                  {accessAddresses.length} active permission
                  {accessAddresses.length !== 1 ? "s" : ""}
                </span>
                <Pagination
                  page={permPage}
                  totalPages={permTotalPages}
                  onPage={setPermPage}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  ACCESS LOG TAB                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "log" && (
        <div className={styles.tableCard}>
          <div className={styles.tableCardHeader}>
            <div className={styles.tableCardTitle}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <h2>Full Access Log</h2>
              <span className={styles.countBadge}>{accessLog.length}</span>
            </div>
            <span className={styles.tableFooterText}>
              Complete audit trail of all access requests and decisions
            </span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>EVENT</th>
                  <th>REQUESTER</th>
                  <th>DURATION</th>
                  <th>DATE</th>
                  <th>EXPIRES</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {pagedLog.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.tableEmpty}>
                      No access events yet. When someone requests access to your
                      records, the full audit trail will appear here.
                    </td>
                  </tr>
                ) : (
                  pagedLog.map((entry) => {
                    const dotColor =
                      entry.eventType === "Access Granted"
                        ? "#10b981"
                        : entry.eventType === "Access Rejected"
                          ? "#ef4444"
                          : entry.eventType === "Access Expired"
                            ? "#9ca3af"
                            : "#f59e0b";
                    const statusLabel =
                      entry.eventType === "Access Granted"
                        ? entry.expired
                          ? "Expired"
                          : "Approved"
                        : entry.eventType === "Access Rejected"
                          ? "Rejected"
                          : entry.eventType === "Access Expired"
                            ? "Archived"
                            : "Pending";
                    return (
                      <tr key={`log-${entry.index}`}>
                        <td>
                          <div className={styles.ppLogEvent}>
                            <span
                              className={styles.actionDot}
                              style={{ background: dotColor }}
                            />
                            {entry.eventType}
                          </div>
                        </td>
                        <td>
                          <div className={styles.patientIdCell}>
                            <span
                              className={styles.avatarCircle}
                              style={{
                                background: getInitialColor(entry.requester),
                              }}
                            >
                              {getInitials(entry.requester)}
                            </span>
                            <div>
                              <strong>
                                Dr. {entry.requester.slice(2, 6).toUpperCase()}
                              </strong>
                              <span className={styles.cellSubtext}>
                                {truncateAddress(entry.requester)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.durationBadge}>
                            {formatDuration(Number(entry.durationInHours))}
                          </span>
                        </td>
                        <td className={styles.cellMuted}>
                          <div>
                            <span>{formatTimestamp(entry.timestamp)}</span>
                            <span className={styles.cellSubtext}>
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>
                        </td>
                        <td className={styles.cellMuted}>
                          {entry.wasApproved && Number(entry.expiresAt) > 0
                            ? new Date(
                                Number(entry.expiresAt) * 1000,
                              ).toLocaleString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td>
                          <StatusBadge status={statusLabel} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            <span className={styles.tableFooterText}>
              Showing {accessLog.length === 0 ? 0 : (logPage - 1) * perPage + 1}
              -{Math.min(logPage * perPage, accessLog.length)} of{" "}
              {accessLog.length} events
            </span>
            <Pagination
              page={logPage}
              totalPages={logTotalPages}
              onPage={setLogPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className={styles.viewContent}>
      <div className={styles.placeholderBox}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2>{title}</h2>
        <p>This section is coming soon.</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */
export default function Home() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [activeNav, setActiveNav] = useState<NavItem>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patientAddress, setPatientAddress] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [requestDuration, setRequestDuration] = useState(24);
  const [status, setStatus] = useState<{
    tone: "info" | "error" | "success";
    message: string;
  } | null>(null);

  const validPatient = useMemo(
    () => isAddress(patientAddress),
    [patientAddress],
  );
  const patient = useMemo(
    () =>
      (validPatient
        ? patientAddress
        : "0x0000000000000000000000000000000000000000") as `0x${string}`,
    [patientAddress, validPatient],
  );

  const requesterAddress = (address ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const accessQuery = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi,
    functionName: "hasAccess",
    args: [patient, requesterAddress],
    query: { enabled: validPatient && Boolean(address) },
  });

  const accessExpiryQuery = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi,
    functionName: "getAccessExpiry",
    args: [patient, requesterAddress],
    query: { enabled: validPatient && Boolean(address) },
  });

  const activeAccessorsQuery = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi,
    functionName: "getActiveAccessors",
    args: [requesterAddress],
    account: address,
    query: { enabled: Boolean(address) },
  });

  const recordsQuery = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi,
    functionName: "getRecords",
    args: [patient],
    query: { enabled: false },
  });

  const requestsQuery = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi,
    functionName: "getRequests",
    args: [requesterAddress],
    account: address,
    query: { enabled: Boolean(address) },
  });

  const hasAccess = accessQuery.data as boolean | undefined;
  const accessExpiry = accessExpiryQuery.data as bigint | undefined;
  const records = (recordsQuery.data ?? []) as RecordItem[];
  const requests = (requestsQuery.data ?? []) as AccessRequestItem[];
  const activeAccessors = (activeAccessorsQuery.data ?? [[], []]) as [
    string[],
    bigint[],
  ];

  const pendingVerifications = requests.filter(
    (r) => Number(r.status) === 0,
  ).length;

  const handleRequestAccess = useCallback(async () => {
    if (!isConnected) {
      setStatus({
        tone: "error",
        message: "Connect your wallet to request access.",
      });
      return;
    }
    if (!validPatient) {
      setStatus({ tone: "error", message: "Enter a valid patient address." });
      return;
    }
    if (requestDuration <= 0) {
      setStatus({ tone: "error", message: "Select a valid access duration." });
      return;
    }
    try {
      setStatus({
        tone: "info",
        message: `Requesting ${formatDuration(requestDuration)} access...`,
      });
      await writeContractAsync({
        address: MEDICAL_RECORD_ADDRESS,
        abi,
        functionName: "requestAccess",
        args: [patient, BigInt(requestDuration)],
      });
      setStatus({
        tone: "success",
        message: `Access request for ${formatDuration(requestDuration)} submitted successfully.`,
      });
      await accessQuery.refetch();
      await accessExpiryQuery.refetch();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to request access.",
      });
    }
  }, [
    isConnected,
    validPatient,
    requestDuration,
    writeContractAsync,
    patient,
    accessQuery,
    accessExpiryQuery,
  ]);

  const handleRespondToRequest = useCallback(
    async (requestId: number, approve: boolean) => {
      if (!isConnected) {
        setStatus({
          tone: "error",
          message: "Connect your wallet first.",
        });
        return;
      }
      try {
        setStatus({
          tone: "info",
          message: approve
            ? "Approving access request..."
            : "Rejecting access request...",
        });
        await writeContractAsync({
          address: MEDICAL_RECORD_ADDRESS,
          abi,
          functionName: "respondToRequest",
          args: [BigInt(requestId), approve],
        });
        setStatus({
          tone: "success",
          message: approve
            ? "Access request approved."
            : "Access request rejected.",
        });
        await requestsQuery.refetch();
        await activeAccessorsQuery.refetch();
      } catch (error) {
        setStatus({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to respond to request.",
        });
      }
    },
    [isConnected, writeContractAsync, requestsQuery, activeAccessorsQuery],
  );

  const handleRevokeAccess = useCallback(
    async (requesterAddr: string) => {
      if (!isConnected) {
        setStatus({ tone: "error", message: "Connect your wallet first." });
        return;
      }
      try {
        setStatus({ tone: "info", message: "Revoking access..." });
        await writeContractAsync({
          address: MEDICAL_RECORD_ADDRESS,
          abi,
          functionName: "revokeAccess",
          args: [requesterAddr as `0x${string}`],
        });
        setStatus({ tone: "success", message: "Access revoked successfully." });
        await activeAccessorsQuery.refetch();
        await requestsQuery.refetch();
      } catch (error) {
        setStatus({
          tone: "error",
          message:
            error instanceof Error ? error.message : "Failed to revoke access.",
        });
      }
    },
    [isConnected, writeContractAsync, activeAccessorsQuery, requestsQuery],
  );

  const handleExtendAccess = useCallback(
    async (requesterAddr: string, additionalHours: number) => {
      if (!isConnected) {
        setStatus({ tone: "error", message: "Connect your wallet first." });
        return;
      }
      try {
        setStatus({
          tone: "info",
          message: `Extending access by ${formatDuration(additionalHours)}...`,
        });
        await writeContractAsync({
          address: MEDICAL_RECORD_ADDRESS,
          abi,
          functionName: "extendAccess",
          args: [requesterAddr as `0x${string}`, BigInt(additionalHours)],
        });
        setStatus({
          tone: "success",
          message: `Access extended by ${formatDuration(additionalHours)}.`,
        });
        await activeAccessorsQuery.refetch();
        await requestsQuery.refetch();
      } catch (error) {
        setStatus({
          tone: "error",
          message:
            error instanceof Error ? error.message : "Failed to extend access.",
        });
      }
    },
    [isConnected, writeContractAsync, activeAccessorsQuery, requestsQuery],
  );

  const handleUpload = useCallback(async () => {
    if (!isConnected) {
      setStatus({ tone: "error", message: "Connect your wallet to upload." });
      return;
    }
    if (!validPatient) {
      setStatus({ tone: "error", message: "Enter a valid patient address." });
      return;
    }
    if (!file) {
      setStatus({ tone: "error", message: "Select a file to upload." });
      return;
    }
    try {
      setStatus({ tone: "info", message: "Uploading file to IPFS..." });
      const data = new FormData();
      data.append("file", file);
      const response = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        body: data,
      });
      if (!response.ok)
        throw new Error("Upload failed. Check backend and Pinata settings.");
      const payload = (await response.json()) as {
        ipfsHash: string;
        url: string;
      };
      const recordName = fileName.trim() || file.name;
      setStatus({
        tone: "info",
        message: "Writing record metadata on-chain...",
      });
      await writeContractAsync({
        address: MEDICAL_RECORD_ADDRESS,
        abi,
        functionName: "addRecord",
        args: [patient, payload.ipfsHash, recordName],
      });
      setStatus({
        tone: "success",
        message: "Record uploaded and linked on-chain.",
      });
      setFile(null);
      setFileName("");
      await recordsQuery.refetch();
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }, [
    isConnected,
    validPatient,
    file,
    fileName,
    writeContractAsync,
    patient,
    recordsQuery,
  ]);

  // Auto-load data when patient is valid and access changes
  const handleLoadData = useCallback(() => {
    if (validPatient && address) {
      recordsQuery.refetch();
      requestsQuery.refetch();
      accessExpiryQuery.refetch();
    }
  }, [validPatient, address, recordsQuery, requestsQuery, accessExpiryQuery]);

  // Periodically refresh access expiry to keep UI up-to-date
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      accessQuery.refetch();
      accessExpiryQuery.refetch();
      activeAccessorsQuery.refetch();
      requestsQuery.refetch();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [
    isConnected,
    accessQuery,
    accessExpiryQuery,
    activeAccessorsQuery,
    requestsQuery,
  ]);

  const navTitles: Record<NavItem, string> = {
    dashboard: "Dashboard",
    "patient-access": "Patient Access",
    uploads: "Upload & Verification",
    verifications: "Verifications",
    settings: "Privacy & Permissions",
    support: "Support",
  };

  return (
    <div
      className={`${styles.layout} ${sidebarOpen ? styles.layoutSidebarOpen : styles.layoutSidebarClosed}`}
    >
      <Sidebar
        active={activeNav}
        onNavigate={(nav) => {
          setActiveNav(nav);
        }}
        pendingVerifications={pendingVerifications}
      />

      <div className={styles.main}>
        <TopBar
          searchValue={searchValue}
          onSearch={setSearchValue}
          title={navTitles[activeNav]}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className={styles.mainContent}>
          {activeNav === "dashboard" && (
            <DashboardView
              records={records}
              requests={requests}
              onNavigate={(nav) => {
                setActiveNav(nav);
              }}
            />
          )}
          {activeNav === "patient-access" && (
            <PatientAccessView
              patientAddress={patientAddress}
              setPatientAddress={(v) => {
                setPatientAddress(v);
              }}
              validPatient={validPatient}
              hasAccess={hasAccess}
              accessExpiry={accessExpiry}
              records={records}
              recordsQuery={{
                refetch: () => {
                  handleLoadData();
                },
                isFetching: false,
                error: recordsQuery.error,
              }}
              accessQuery={{ refetch: () => accessQuery.refetch() }}
              handleRequestAccess={handleRequestAccess}
              requestDuration={requestDuration}
              setRequestDuration={setRequestDuration}
              isPending={isPending}
              address={address}
            />
          )}
          {activeNav === "uploads" && (
            <UploadsView
              patientAddress={patientAddress}
              setPatientAddress={setPatientAddress}
              fileName={fileName}
              setFileName={setFileName}
              file={file}
              setFile={setFile}
              handleUpload={handleUpload}
              isPending={isPending}
              requests={requests}
              isConnected={isConnected}
              handleRespondToRequest={handleRespondToRequest}
            />
          )}
          {activeNav === "verifications" && (
            <PlaceholderView title="Verifications" />
          )}
          {activeNav === "settings" && (
            <SettingsView
              requests={requests}
              activeAccessors={activeAccessors}
              handleRespondToRequest={handleRespondToRequest}
              handleRevokeAccess={handleRevokeAccess}
              handleExtendAccess={handleExtendAccess}
              isPending={isPending}
              onRefresh={() => {
                requestsQuery.refetch();
                activeAccessorsQuery.refetch();
              }}
            />
          )}
          {activeNav === "support" && <PlaceholderView title="Support" />}
        </div>
      </div>

      {status && (
        <div className={`${styles.toast} ${styles[status.tone]}`}>
          <div className={styles.toastContent}>
            {status.tone === "success" && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            {status.tone === "error" && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {status.tone === "info" && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            <span>{status.message}</span>
          </div>
          <button className={styles.toastClose} onClick={() => setStatus(null)}>
            &times;
          </button>
        </div>
      )}

      <AiChat
        records={records}
        requests={requests}
        patientAddress={patientAddress}
        userAddress={address}
        hasAccess={hasAccess}
      />
    </div>
  );
}
