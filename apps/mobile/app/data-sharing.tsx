import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDevWalletContext } from "@/lib/wallet";
import {
  getMedicalRecordContractWithSigner,
  safeContractCall,
  isAccessExpired,
  formatRemainingTime,
  formatDuration,
  formatTimestamp,
  timeSince,
  truncateAddress,
  requestStatusLabel,
  type AccessRequest,
} from "@/lib/medicalRecord";

type ActiveAccessor = {
  address: string;
  expiresAt: bigint;
};

type TabId = "active" | "pending" | "log";

export default function DataSharingScreen() {
  const router = useRouter();
  const { address, isConnected, signer } = useDevWalletContext();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [activeAccessors, setActiveAccessors] = useState<ActiveAccessor[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("active");

  const loadData = useCallback(async () => {
    if (!signer || !address) return;
    try {
      setLoading(true);
      const contract = getMedicalRecordContractWithSigner(signer);

      const [reqData, accessData] = await Promise.all([
        safeContractCall(signer, () =>
          contract.getRequests(address),
        ) as Promise<AccessRequest[]>,
        safeContractCall(signer, () =>
          contract.getActiveAccessors(address),
        ) as Promise<[string[], bigint[]]>,
      ]);

      setRequests(Array.from(reqData));

      const [addrs, expiries] = accessData;
      const accessors: ActiveAccessor[] = [];
      for (let i = 0; i < addrs.length; i++) {
        accessors.push({
          address: addrs[i]!,
          expiresAt: expiries[i]!,
        });
      }
      setActiveAccessors(accessors);
      setHasLoaded(true);
    } catch (error) {
      console.error("Failed to load data sharing info:", error);
    } finally {
      setLoading(false);
    }
  }, [address, signer]);

  useEffect(() => {
    if (isConnected && signer && address) {
      loadData();
    }
  }, [isConnected, signer, address, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRespond = async (requestId: number, approve: boolean) => {
    if (!signer) return;
    const actionKey = `respond-${requestId}-${approve}`;
    setActionLoading(actionKey);
    try {
      const contract = getMedicalRecordContractWithSigner(signer);
      const tx = await contract.respondToRequest(requestId, approve);
      await tx.wait();
      await loadData();
    } catch (error: any) {
      Alert.alert(
        "Transaction Failed",
        error?.reason || error?.message || "Could not process request",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (requesterAddr: string) => {
    if (!signer) return;
    Alert.alert(
      "Revoke Access",
      `Are you sure you want to revoke access for ${truncateAddress(requesterAddr)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            setActionLoading(`revoke-${requesterAddr}`);
            try {
              const contract = getMedicalRecordContractWithSigner(signer);
              const tx = await contract.revokeAccess(requesterAddr);
              await tx.wait();
              await loadData();
            } catch (error: any) {
              Alert.alert(
                "Transaction Failed",
                error?.reason || error?.message || "Could not revoke access",
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  // Categorize
  const pendingRequests = requests
    .map((r, i) => ({ ...r, index: i }))
    .filter((r) => Number(r.status) === 0)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const resolvedRequests = requests
    .map((r, i) => ({ ...r, index: i }))
    .filter((r) => Number(r.status) !== 0)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const activeNonExpired = activeAccessors.filter(
    (a) => !isAccessExpired(a.expiresAt),
  );

  // Stats
  const totalActive = activeNonExpired.length;
  const totalPending = pendingRequests.length;
  const totalApproved = requests.filter((r) => Number(r.status) === 1).length;
  const totalRejected = requests.filter((r) => Number(r.status) === 2).length;

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Data Sharing</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyRoot}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="lock.shield.fill" size={48} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Wallet Not Connected</Text>
          <Text style={styles.emptySubtext}>
            Connect your wallet to manage data sharing permissions.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Data Sharing</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <IconSymbol name="arrow.clockwise" size={16} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <IconSymbol name="lock.shield.fill" size={16} color="#8B5CF6" />
          <Text style={styles.infoBannerText}>
            Control who can access your medical records on the blockchain. All
            actions are immutably recorded on-chain.
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#DCFCE7" }]}>
              <IconSymbol
                name="checkmark.shield.fill"
                size={16}
                color="#22C55E"
              />
            </View>
            <Text style={styles.statValue}>{totalActive}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <IconSymbol name="clock.fill" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{totalPending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#DBEAFE" }]}>
              <IconSymbol name="checkmark" size={16} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{totalApproved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#FEE2E2" }]}>
              <IconSymbol name="xmark" size={16} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>{totalRejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* Loading */}
        {loading && !hasLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading from blockchain...</Text>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "active" && styles.tabActive]}
            onPress={() => setActiveTab("active")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "active" && styles.tabTextActive,
              ]}
            >
              Active
            </Text>
            {totalActive > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === "active" && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === "active" && styles.tabBadgeTextActive,
                  ]}
                >
                  {totalActive}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pending" && styles.tabActive]}
            onPress={() => setActiveTab("pending")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "pending" && styles.tabTextActive,
              ]}
            >
              Pending
            </Text>
            {totalPending > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  styles.tabBadgeWarning,
                  activeTab === "pending" && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    styles.tabBadgeTextWarning,
                    activeTab === "pending" && styles.tabBadgeTextActive,
                  ]}
                >
                  {totalPending}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "log" && styles.tabActive]}
            onPress={() => setActiveTab("log")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "log" && styles.tabTextActive,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Active Tab ─── */}
        {activeTab === "active" && (
          <View style={styles.tabContent}>
            {activeNonExpired.length === 0 && hasLoaded ? (
              <View style={styles.emptySection}>
                <IconSymbol name="lock.fill" size={28} color="#D1D5DB" />
                <Text style={styles.emptySectionTitle}>No Active Sharing</Text>
                <Text style={styles.emptySectionText}>
                  No one currently has access to your medical records. Approved
                  requests will show here.
                </Text>
              </View>
            ) : (
              activeNonExpired.map((accessor) => {
                const remaining = formatRemainingTime(accessor.expiresAt);
                const isRevoking =
                  actionLoading === `revoke-${accessor.address}`;

                // Calculate progress
                const now = Math.floor(Date.now() / 1000);
                const exp = Number(accessor.expiresAt);
                const totalSec = exp > now ? exp - now : 0;
                const maxDuration = 30 * 24 * 3600; // rough max for bar
                const pct = Math.max(
                  5,
                  Math.min(100, (totalSec / maxDuration) * 100),
                );
                const barColor =
                  totalSec < 3600
                    ? "#EF4444"
                    : totalSec < 86400
                      ? "#F59E0B"
                      : "#22C55E";

                return (
                  <View key={accessor.address} style={styles.activeCard}>
                    <View style={styles.activeCardTop}>
                      <View style={styles.activeCardUser}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>
                            {accessor.address.slice(2, 4).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.activeCardInfo}>
                          <Text style={styles.activeCardName}>
                            Dr. {accessor.address.slice(2, 6).toUpperCase()}
                          </Text>
                          <Text style={styles.activeCardAddress}>
                            {truncateAddress(accessor.address)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.revokeButton}
                        onPress={() => handleRevoke(accessor.address)}
                        disabled={isRevoking}
                      >
                        {isRevoking ? (
                          <ActivityIndicator size="small" color="#E53935" />
                        ) : (
                          <>
                            <IconSymbol
                              name="xmark"
                              size={12}
                              color="#E53935"
                            />
                            <Text style={styles.revokeButtonText}>Revoke</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressLabel}>{remaining}</Text>
                        <Text style={styles.progressExpiry}>
                          Expires{" "}
                          {new Date(exp * 1000).toLocaleString("en-US", {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressBar,
                            { width: `${pct}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ─── Pending Tab ─── */}
        {activeTab === "pending" && (
          <View style={styles.tabContent}>
            {pendingRequests.length === 0 && hasLoaded ? (
              <View style={styles.emptySection}>
                <IconSymbol
                  name="checkmark.shield.fill"
                  size={28}
                  color="#D1D5DB"
                />
                <Text style={styles.emptySectionTitle}>All Caught Up</Text>
                <Text style={styles.emptySectionText}>
                  No pending access requests. New requests from doctors or
                  providers will appear here.
                </Text>
              </View>
            ) : (
              pendingRequests.map((req) => {
                const approveKey = `respond-${req.index}-true`;
                const denyKey = `respond-${req.index}-false`;
                const isApproving = actionLoading === approveKey;
                const isDenying = actionLoading === denyKey;
                const isAnyAction = isApproving || isDenying;

                return (
                  <View key={`pending-${req.index}`} style={styles.pendingCard}>
                    <View style={styles.pendingCardTop}>
                      <View style={styles.activeCardUser}>
                        <View
                          style={[
                            styles.avatarCircle,
                            { backgroundColor: "#FEF3C7" },
                          ]}
                        >
                          <Text
                            style={[styles.avatarText, { color: "#D97706" }]}
                          >
                            {req.requester.slice(2, 4).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.activeCardInfo}>
                          <Text style={styles.activeCardName}>
                            Dr. {req.requester.slice(2, 6).toUpperCase()}
                          </Text>
                          <Text style={styles.activeCardAddress}>
                            {truncateAddress(req.requester)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.pendingBadge}>
                        <View style={styles.pendingDot} />
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </View>
                    </View>

                    {/* Request Details */}
                    <View style={styles.pendingDetails}>
                      <View style={styles.pendingDetailItem}>
                        <IconSymbol
                          name="clock.fill"
                          size={12}
                          color="#6B7280"
                        />
                        <Text style={styles.pendingDetailText}>
                          Duration:{" "}
                          {formatDuration(Number(req.durationInHours))}
                        </Text>
                      </View>
                      <View style={styles.pendingDetailItem}>
                        <IconSymbol name="calendar" size={12} color="#6B7280" />
                        <Text style={styles.pendingDetailText}>
                          Requested {timeSince(req.timestamp)}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.pendingActions}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleRespond(req.index, true)}
                        disabled={isAnyAction}
                      >
                        {isApproving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <IconSymbol
                              name="checkmark"
                              size={14}
                              color="#FFFFFF"
                            />
                            <Text style={styles.approveButtonText}>
                              Approve
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.denyButton}
                        onPress={() => handleRespond(req.index, false)}
                        disabled={isAnyAction}
                      >
                        {isDenying ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <IconSymbol
                              name="xmark"
                              size={14}
                              color="#FFFFFF"
                            />
                            <Text style={styles.denyButtonText}>Deny</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ─── Log Tab ─── */}
        {activeTab === "log" && (
          <View style={styles.tabContent}>
            {resolvedRequests.length === 0 && hasLoaded ? (
              <View style={styles.emptySection}>
                <IconSymbol name="clock.fill" size={28} color="#D1D5DB" />
                <Text style={styles.emptySectionTitle}>No History Yet</Text>
                <Text style={styles.emptySectionText}>
                  Past access request decisions will be recorded here.
                </Text>
              </View>
            ) : (
              resolvedRequests.map((req) => {
                const statusNum = Number(req.status);
                const isApproved = statusNum === 1;
                const expired =
                  isApproved &&
                  Number(req.expiresAt) > 0 &&
                  isAccessExpired(req.expiresAt);
                let label = requestStatusLabel(req.status);
                if (expired) label = "Expired";

                const statusColor = expired
                  ? "#D97706"
                  : isApproved
                    ? "#15803D"
                    : "#DC2626";
                const statusBg = expired
                  ? "#FEF3C7"
                  : isApproved
                    ? "#DCFCE7"
                    : "#FEE2E2";
                const iconName = expired
                  ? "clock.fill"
                  : isApproved
                    ? "checkmark.circle.fill"
                    : "xmark.circle.fill";

                return (
                  <View key={`log-${req.index}`} style={styles.logCard}>
                    <View style={styles.logCardLeft}>
                      <View
                        style={[
                          styles.logIconWrap,
                          { backgroundColor: statusBg },
                        ]}
                      >
                        <IconSymbol
                          name={iconName}
                          size={16}
                          color={statusColor}
                        />
                      </View>
                      <View style={styles.logInfo}>
                        <Text style={styles.logName}>
                          {truncateAddress(req.requester)}
                        </Text>
                        <Text style={styles.logMeta}>
                          {formatTimestamp(req.timestamp)}
                          {Number(req.durationInHours) > 0 &&
                            ` · ${formatDuration(Number(req.durationInHours))}`}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.logStatusBadge,
                        { backgroundColor: statusBg },
                      ]}
                    >
                      <Text
                        style={[styles.logStatusText, { color: statusColor }]}
                      >
                        {label}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F5F0",
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F5F0",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },

  // Empty root
  emptyRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  // Info Banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  infoBannerText: {
    fontSize: 13,
    color: "#6D28D9",
    fontWeight: "400",
    lineHeight: 18,
    flex: 1,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E8E5DF",
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Loading
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#8B5CF6",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabBadge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeWarning: {
    backgroundColor: "#FEF3C7",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  tabBadgeTextWarning: {
    color: "#D97706",
  },
  tabBadgeTextActive: {
    color: "#FFFFFF",
  },

  // Tab Content
  tabContent: {
    gap: 10,
  },

  // Empty Section
  emptySection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    borderStyle: "dashed",
    gap: 10,
  },
  emptySectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptySectionText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 19,
  },

  // Active Card
  activeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  activeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  activeCardUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803D",
  },
  activeCardInfo: {
    flex: 1,
    gap: 2,
  },
  activeCardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  activeCardAddress: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
    fontFamily: "monospace",
  },
  revokeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  revokeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E53935",
  },

  // Progress
  progressSection: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  progressExpiry: {
    fontSize: 11,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },

  // Pending Card
  pendingCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  pendingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  pendingDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  pendingDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pendingDetailText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  pendingActions: {
    flexDirection: "row",
    gap: 10,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  denyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6B7280",
    paddingVertical: 12,
    borderRadius: 12,
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Log Card
  logCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
  },
  logCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  logIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logInfo: {
    flex: 1,
    gap: 2,
  },
  logName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    fontFamily: "monospace",
  },
  logMeta: {
    fontSize: 11,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  logStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  logStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
