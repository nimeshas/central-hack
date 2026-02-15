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
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDevWalletContext } from "@/lib/wallet";
import {
  getMedicalRecordContractWithSigner,
  safeContractCall,
  requestStatusLabel,
  isAccessExpired,
  formatRemainingTime,
  formatDuration,
  formatTimestamp,
  timeSince,
  truncateAddress,
  type AccessRequest,
} from "@/lib/medicalRecord";

type ActiveAccessor = {
  address: string;
  expiresAt: bigint;
};

export default function AccessScreen() {
  const { address, isConnected, signer } = useDevWalletContext();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [activeAccessors, setActiveAccessors] = useState<ActiveAccessor[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

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
      console.error("Failed to load access data:", error);
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

  // Categorize requests
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

  const totalActive = activeNonExpired.length;

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.emptyRoot}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="lock.shield.fill" size={48} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Wallet Not Connected</Text>
          <Text style={styles.emptySubtext}>
            Connect your wallet to manage access permissions for your
            decentralised health records.
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
          <View>
            <Text style={styles.pageTitle}>Privacy & Permissions</Text>
            <Text style={styles.pageSubtitle}>
              Manage who has access to your decentralised health records
            </Text>
          </View>
        </View>

        {/* Active Sharing Banner */}
        <View style={styles.sharingBanner}>
          <View style={styles.sharingBannerLeft}>
            <View style={styles.activeDotContainer}>
              <View
                style={[
                  styles.activeDot,
                  totalActive === 0 && styles.activeDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.activeSharingText,
                  totalActive === 0 && styles.activeSharingTextInactive,
                ]}
              >
                {totalActive > 0 ? "ACTIVE SHARING" : "NO ACTIVE SHARING"}
              </Text>
            </View>
            <Text style={styles.institutesText}>
              {totalActive} {totalActive === 1 ? "Address" : "Addresses"}{" "}
              Authorised
            </Text>
            <Text style={styles.viewingText}>
              {totalActive > 0
                ? "Viewing your records with time-limited access"
                : "No one currently has access to your records"}
            </Text>
          </View>
        </View>

        {/* Loading State */}
        {loading && !hasLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.loadingText}>Loading from blockchain...</Text>
          </View>
        )}

        {/* ─── Active Permissions ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Access</Text>
            {activeNonExpired.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {activeNonExpired.length}
                </Text>
              </View>
            )}
          </View>

          {activeNonExpired.length === 0 && hasLoaded ? (
            <View style={styles.emptySection}>
              <IconSymbol name="lock.fill" size={20} color="#D1D5DB" />
              <Text style={styles.emptySectionText}>
                No active access grants
              </Text>
            </View>
          ) : (
            <View style={styles.accessList}>
              {activeNonExpired.map((accessor) => {
                const remaining = formatRemainingTime(accessor.expiresAt);
                const isRevoking =
                  actionLoading === `revoke-${accessor.address}`;
                return (
                  <View key={accessor.address} style={styles.activeAccessRow}>
                    <View style={styles.accessRowLeft}>
                      <View style={styles.activeIconContainer}>
                        <IconSymbol
                          name="person.fill"
                          size={16}
                          color="#15803D"
                        />
                      </View>
                      <View style={styles.accessInfo}>
                        <Text style={styles.accessName}>
                          Dr. {accessor.address.slice(2, 6).toUpperCase()}
                        </Text>
                        <Text style={styles.accessMeta}>
                          {truncateAddress(accessor.address)}
                        </Text>
                        <View style={styles.remainingRow}>
                          <View style={styles.remainingDot} />
                          <Text style={styles.remainingText}>{remaining}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRevoke(accessor.address)}
                      disabled={isRevoking}
                      style={styles.revokeButton}
                    >
                      {isRevoking ? (
                        <ActivityIndicator size="small" color="#E53935" />
                      ) : (
                        <IconSymbol name="xmark" size={14} color="#E53935" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── Pending Requests ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Access Requests</Text>
            {pendingRequests.length > 0 && (
              <View style={[styles.countBadge, styles.countBadgeWarning]}>
                <Text
                  style={[styles.countBadgeText, styles.countBadgeTextWarning]}
                >
                  {pendingRequests.length}
                </Text>
              </View>
            )}
          </View>

          {pendingRequests.length === 0 && hasLoaded ? (
            <View style={styles.emptySection}>
              <IconSymbol
                name="checkmark.shield.fill"
                size={20}
                color="#D1D5DB"
              />
              <Text style={styles.emptySectionText}>No pending requests</Text>
            </View>
          ) : (
            <View style={styles.accessList}>
              {pendingRequests.map((req) => {
                const approveKey = `respond-${req.index}-true`;
                const denyKey = `respond-${req.index}-false`;
                const isApproving = actionLoading === approveKey;
                const isDenying = actionLoading === denyKey;
                const isAnyAction = isApproving || isDenying;

                return (
                  <View
                    key={`pending-${req.index}`}
                    style={[styles.accessRow, styles.requestRow]}
                  >
                    <View style={styles.requestContent}>
                      <View style={styles.accessRowLeft}>
                        <View style={styles.requestIconContainer}>
                          <IconSymbol
                            name="person.fill.questionmark"
                            size={16}
                            color="#D97706"
                          />
                        </View>
                        <View style={styles.accessInfo}>
                          <Text style={styles.accessName}>
                            Dr. {req.requester.slice(2, 6).toUpperCase()}
                          </Text>
                          <Text style={styles.accessMeta}>
                            {truncateAddress(req.requester)}
                          </Text>
                          <View style={styles.requestMetaRow}>
                            <View style={styles.durationBadge}>
                              <IconSymbol
                                name="clock.fill"
                                size={10}
                                color="#6B7280"
                              />
                              <Text style={styles.durationText}>
                                {formatDuration(Number(req.durationInHours))}
                              </Text>
                            </View>
                            <Text style={styles.requestTimeText}>
                              {timeSince(req.timestamp)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.accessActions}>
                        <TouchableOpacity
                          onPress={() => handleRespond(req.index, true)}
                          disabled={isAnyAction}
                          style={styles.approveIcon}
                        >
                          {isApproving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <IconSymbol
                              name="checkmark"
                              size={14}
                              color="#FFFFFF"
                            />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRespond(req.index, false)}
                          disabled={isAnyAction}
                          style={styles.denyIcon}
                        >
                          {isDenying ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <IconSymbol
                              name="xmark"
                              size={14}
                              color="#FFFFFF"
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── Access History ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Access History</Text>
            {resolvedRequests.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {resolvedRequests.length}
                </Text>
              </View>
            )}
          </View>

          {resolvedRequests.length === 0 && hasLoaded ? (
            <View style={styles.emptySection}>
              <IconSymbol name="clock.fill" size={20} color="#D1D5DB" />
              <Text style={styles.emptySectionText}>No access history yet</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {resolvedRequests.map((req) => {
                const statusNum = Number(req.status);
                const isApproved = statusNum === 1;
                const expired =
                  isApproved &&
                  Number(req.expiresAt) > 0 &&
                  isAccessExpired(req.expiresAt);

                let statusLabel = requestStatusLabel(req.status);
                if (expired) statusLabel = "Expired";

                return (
                  <View key={`history-${req.index}`} style={styles.historyRow}>
                    <View style={styles.historyRowLeft}>
                      <StatusBadgeIcon
                        status={
                          expired
                            ? "expired"
                            : isApproved
                              ? "approved"
                              : "denied"
                        }
                      />
                      <View
                        style={[
                          styles.fileIconContainer,
                          expired
                            ? styles.historyExpiredIcon
                            : isApproved
                              ? styles.historyApprovedIcon
                              : styles.historyDeniedIcon,
                        ]}
                      >
                        <IconSymbol
                          name="person.fill"
                          size={14}
                          color={
                            expired
                              ? "#D97706"
                              : isApproved
                                ? "#22C55E"
                                : "#E53935"
                          }
                        />
                      </View>
                      <View style={styles.accessInfo}>
                        <Text style={styles.accessName}>
                          Dr. {req.requester.slice(2, 6).toUpperCase()}
                        </Text>
                        <Text style={styles.accessMeta}>
                          {truncateAddress(req.requester)}
                        </Text>
                        {isApproved && Number(req.durationInHours) > 0 && (
                          <Text style={styles.historyDurationText}>
                            Duration:{" "}
                            {formatDuration(Number(req.durationInHours))}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.historyRight}>
                      <View
                        style={[
                          styles.historyStatusBadge,
                          expired
                            ? styles.historyStatusExpired
                            : isApproved
                              ? styles.historyStatusApproved
                              : styles.historyStatusDenied,
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyStatusText,
                            expired
                              ? styles.historyStatusTextExpired
                              : isApproved
                                ? styles.historyStatusTextApproved
                                : styles.historyStatusTextDenied,
                          ]}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>
                        {formatTimestamp(req.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadgeIcon({
  status,
}: {
  status: "approved" | "denied" | "expired";
}) {
  const isApproved = status === "approved";
  const isExpired = status === "expired";
  return (
    <View
      style={[
        styles.statusBadge,
        isExpired
          ? styles.statusExpired
          : isApproved
            ? styles.statusApproved
            : styles.statusDenied,
      ]}
    >
      <IconSymbol
        name={isExpired ? "clock.fill" : isApproved ? "checkmark" : "xmark"}
        size={10}
        color={isExpired ? "#D97706" : isApproved ? "#15803D" : "#DC2626"}
      />
    </View>
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
    paddingBottom: 100,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "400",
    lineHeight: 18,
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

  // Active Sharing Banner
  sharingBanner: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  sharingBannerLeft: {
    gap: 4,
  },
  activeDotContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  activeDotInactive: {
    backgroundColor: "#9CA3AF",
  },
  activeSharingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  activeSharingTextInactive: {
    color: "#6B7280",
  },
  institutesText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  viewingText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
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

  // Section
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  countBadge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeWarning: {
    backgroundColor: "#FEF3C7",
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  countBadgeTextWarning: {
    color: "#D97706",
  },

  // Empty section
  emptySection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    borderStyle: "dashed",
  },
  emptySectionText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Access List
  accessList: {
    gap: 8,
  },
  accessRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
  },
  activeAccessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  requestRow: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  requestContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accessRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  activeIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  requestIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  fileIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  accessInfo: {
    gap: 2,
    flex: 1,
  },
  accessName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  accessMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  remainingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  remainingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  remainingText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
  },
  requestMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  requestTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  accessActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  approveIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
  },
  denyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#6B7280",
    justifyContent: "center",
    alignItems: "center",
  },
  revokeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  // History
  historyList: {
    gap: 8,
  },
  historyRow: {
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
  historyRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  historyDeniedIcon: {
    backgroundColor: "#FEE2E2",
  },
  historyApprovedIcon: {
    backgroundColor: "#ECFDF5",
  },
  historyExpiredIcon: {
    backgroundColor: "#FEF3C7",
  },
  historyRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  historyDate: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  historyDurationText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "400",
    marginTop: 2,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyStatusApproved: {
    backgroundColor: "#DCFCE7",
  },
  historyStatusDenied: {
    backgroundColor: "#FEE2E2",
  },
  historyStatusExpired: {
    backgroundColor: "#FEF3C7",
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  historyStatusTextApproved: {
    color: "#15803D",
  },
  historyStatusTextDenied: {
    color: "#DC2626",
  },
  historyStatusTextExpired: {
    color: "#D97706",
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statusApproved: {
    backgroundColor: "#DCFCE7",
  },
  statusDenied: {
    backgroundColor: "#FEE2E2",
  },
  statusExpired: {
    backgroundColor: "#FEF3C7",
  },
});
