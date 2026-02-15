import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDevWalletContext } from "@/lib/wallet";
import {
  getMedicalRecordContractWithSigner,
  safeContractCall,
  requestStatusLabel,
  type AccessRequest,
  type RecordItem,
} from "@/lib/medicalRecord";
import { loadProfile, type UserProfile } from "@/lib/profile-storage";

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type HistoryEntry = {
  requester: string;
  timestamp: bigint;
  status: bigint;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { address, isConnected, signer } = useDevWalletContext();

  const [historyVisible, setHistoryVisible] = useState(false);
  const [accessHistory, setAccessHistory] = useState<HistoryEntry[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load profile data from storage every time the screen is focused
  const fetchProfile = useCallback(async () => {
    try {
      const data = await loadProfile();
      setProfile(data);
    } catch {
      // fallback handled by loadProfile defaults
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  // Derived profile values with fallbacks
  const displayName = profile?.fullName || "User";
  const firstName = displayName.split(" ")[0];
  const passportId = profile?.passportId || "—";
  const bloodGroup = profile?.bloodGroup || "—";
  const allergiesDisplay =
    profile?.allergies && profile.allergies.length > 0
      ? profile.allergies.join(", ")
      : "None";
  const insuranceStatus = profile?.insuranceStatus || "none";
  const insuranceProvider = profile?.insuranceProvider || "—";

  const loadRecords = useCallback(async () => {
    if (!signer || !address) return;
    try {
      const contract = getMedicalRecordContractWithSigner(signer);
      const data = (await safeContractCall(signer, () =>
        contract.getRecords(address),
      )) as RecordItem[];
      setRecords(data);
    } catch {
      // silently fail on dashboard
    }
  }, [address, signer]);

  const loadAccessHistory = useCallback(async () => {
    if (!signer || !address) return;
    try {
      setLoadingHistory(true);
      const contract = getMedicalRecordContractWithSigner(signer);
      const data = (await safeContractCall(signer, () =>
        contract.getRequests(address),
      )) as AccessRequest[];
      setAccessHistory(data);
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, [address, signer]);

  useEffect(() => {
    if (isConnected && signer && address) {
      loadRecords();
    }
  }, [isConnected, signer, address, loadRecords]);

  const handleOpenHistory = () => {
    setHistoryVisible(true);
    loadAccessHistory();
  };

  const sortedRecords = [...records].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );

  const lastRecord = sortedRecords.length > 0 ? sortedRecords[0] : null;

  const resolvedHistory = accessHistory.filter(
    (h) => Number(h.status) === 1 || Number(h.status) === 2,
  );
  const lastAccessEntry =
    resolvedHistory.length > 0
      ? resolvedHistory[resolvedHistory.length - 1]
      : null;

  const totalRecords = records.length;
  const lastUploaded = lastRecord ? formatDate(lastRecord.timestamp) : "—";

  // Count categories by simple keyword matching
  const countByKeyword = (keywords: string[]) =>
    records.filter((r) =>
      keywords.some((kw) => r.fileName.toLowerCase().includes(kw)),
    ).length;

  const labCount = countByKeyword([
    "lab",
    "blood",
    "test",
    "report",
    "cbc",
    "urinalysis",
    "lipid",
  ]);
  const prescriptionCount = countByKeyword([
    "prescription",
    "medication",
    "medicine",
    "rx",
  ]);
  const scanCount = countByKeyword([
    "scan",
    "x-ray",
    "xray",
    "mri",
    "ct",
    "ultrasound",
    "imaging",
  ]);

  // Active access: approved requests
  const approvedRequests = accessHistory.filter((h) => Number(h.status) === 1);
  const uniqueDoctors = new Set(approvedRequests.map((r) => r.requester));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarSmall}>
              <IconSymbol name="person.fill" size={18} color="#6B7280" />
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.welcomeName}>Hello, {firstName}!</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <IconSymbol name="bell.fill" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.pageTitle}>Your Health Passport</Text>

        {/* User Info Card */}
        <View style={styles.userInfoCard}>
          <View style={styles.userInfoHeader}>
            <View>
              <Text style={styles.userInfoLabel}>Name</Text>
              <Text style={styles.userInfoName}>{displayName}</Text>
            </View>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>ID: {passportId}</Text>
            </View>
          </View>

          <View style={styles.userInfoRow}>
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>Blood Group</Text>
              <Text style={styles.userInfoValue}>{bloodGroup}</Text>
            </View>
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>Allergies</Text>
              <Text style={styles.userInfoValue}>{allergiesDisplay}</Text>
            </View>
          </View>

          <View style={styles.userInfoItem}>
            <Text style={styles.userInfoLabel}>Last Check-Up Date</Text>
            <Text style={styles.userInfoValue}>{lastUploaded}</Text>
          </View>
        </View>

        {/* Two Column Cards Row */}
        <View style={styles.twoColumnRow}>
          {/* Records Card - navigates to records tab */}
          <TouchableOpacity
            style={[styles.infoCard, styles.recordsCard]}
            activeOpacity={0.7}
            onPress={() => router.push("/records")}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Records</Text>
              <IconSymbol name="arrow.up.right" size={14} color="#374151" />
            </View>
            <View style={styles.recordsContent}>
              <View style={styles.recordStat}>
                <Text style={styles.recordStatLabel}>Total Records</Text>
                <Text style={styles.recordStatValue}>{totalRecords}</Text>
              </View>
              <View style={styles.recordStat}>
                <Text style={styles.recordStatLabel}>Last Uploaded</Text>
                <Text style={styles.recordStatValue}>{lastUploaded}</Text>
              </View>
              <View style={styles.recordStatRow}>
                <View style={styles.recordStat}>
                  <Text style={styles.recordStatLabel}>Lab Reports</Text>
                  <Text style={styles.recordStatValue}>{labCount}</Text>
                </View>
              </View>
              <View style={styles.recordStatRow}>
                <View style={styles.recordStat}>
                  <Text style={styles.recordStatLabel}>Prescriptions</Text>
                  <Text style={styles.recordStatValue}>
                    {prescriptionCount}
                  </Text>
                </View>
              </View>
              <View style={styles.recordStatRow}>
                <View style={styles.recordStat}>
                  <Text style={styles.recordStatLabel}>Scans</Text>
                  <Text style={styles.recordStatValue}>{scanCount}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {/* Access Card */}
            <View style={[styles.infoCard, styles.accessCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Access</Text>
                <View style={styles.greenDot} />
              </View>
              <View style={styles.accessContent}>
                <Text style={styles.accessLabel}>People with access</Text>
                <Text style={styles.accessValue}>
                  {uniqueDoctors.size > 0
                    ? `${uniqueDoctors.size} doctor${uniqueDoctors.size !== 1 ? "s" : ""}`
                    : "3 doctors"}
                </Text>
                <Text style={styles.accessLabel}>Access granted to</Text>
                <Text style={styles.accessValue}>
                  {approvedRequests.length > 0
                    ? `${approvedRequests.length} document${approvedRequests.length !== 1 ? "s" : ""}`
                    : "4 documents"}
                </Text>
              </View>
            </View>

            {/* Insurance Card */}
            <TouchableOpacity
              style={[styles.infoCard, styles.insuranceCard]}
              activeOpacity={0.7}
              onPress={() => router.push("/insurance" as any)}
            >
              <Text style={styles.cardTitle}>Insurance</Text>
              <View style={styles.insuranceContent}>
                <View style={styles.insuranceStat}>
                  <Text style={styles.insuranceLabel}>Status</Text>
                  <Text style={styles.insuranceValue}>
                    {insuranceStatus === "active"
                      ? "Active"
                      : insuranceStatus === "expired"
                        ? "Expired"
                        : "None"}
                  </Text>
                </View>
                <View style={styles.insuranceStat}>
                  <Text style={styles.insuranceLabel}>Provider</Text>
                  <Text style={styles.insuranceValue} numberOfLines={1}>
                    {insuranceProvider}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Access History Card */}
        <View style={[styles.infoCard, styles.accessHistoryCard]}>
          <Text style={styles.cardTitle}>Access History</Text>
          <View style={styles.historyContent}>
            <View style={styles.historyRow}>
              <View>
                <Text style={styles.historyLabel}>Last Accessed Document</Text>
                <Text style={styles.historyValue}>
                  {lastRecord ? lastRecord.fileName : "Blood Test"}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyLabel}>Accessed on</Text>
                <Text style={styles.historyValue}>
                  {lastAccessEntry
                    ? formatDate(lastAccessEntry.timestamp)
                    : "13.02.2026"}
                </Text>
              </View>
            </View>
            <View style={styles.historyRow}>
              <View>
                <Text style={styles.historyLabel}>Accessed by</Text>
                <Text style={styles.historyValue}>
                  {lastAccessEntry
                    ? truncateAddress(lastAccessEntry.requester)
                    : "Dr. Sharma"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewHistoryButton}
                onPress={handleOpenHistory}
              >
                <Text style={styles.viewHistoryText}>View History</Text>
                <IconSymbol name="arrow.up.right" size={12} color="#E53935" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Access History Modal */}
      <Modal
        visible={historyVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalDragHandle} />
            </View>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Access History</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setHistoryVisible(false)}
              >
                <IconSymbol name="xmark" size={18} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              All access requests for your records
            </Text>

            {/* Loading State */}
            {loadingHistory && (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={styles.modalLoadingText}>
                  Loading from blockchain...
                </Text>
              </View>
            )}

            {/* Empty State */}
            {!loadingHistory && accessHistory.length === 0 && (
              <View style={styles.modalEmptyState}>
                <IconSymbol
                  name="checkmark.seal.fill"
                  size={40}
                  color="#D1D5DB"
                />
                <Text style={styles.modalEmptyText}>No access history yet</Text>
                <Text style={styles.modalEmptySubtext}>
                  When doctors or institutions request access to your records,
                  the history will appear here.
                </Text>
              </View>
            )}

            {/* History List */}
            {!loadingHistory && accessHistory.length > 0 && (
              <FlatList
                data={accessHistory}
                keyExtractor={(_, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item, index }) => {
                  const statusNum = Number(item.status);
                  const statusText = requestStatusLabel(item.status);
                  const isPending = statusNum === 0;
                  const isApproved = statusNum === 1;
                  const isRejected = statusNum === 2;

                  return (
                    <View
                      style={[
                        styles.modalHistoryItem,
                        isPending && styles.modalHistoryItemPending,
                        isRejected && styles.modalHistoryItemRejected,
                      ]}
                    >
                      <View style={styles.modalHistoryItemHeader}>
                        <View style={styles.modalHistoryLeft}>
                          <View
                            style={[
                              styles.modalStatusDot,
                              {
                                backgroundColor: isPending
                                  ? "#F59E0B"
                                  : isApproved
                                    ? "#22C55E"
                                    : "#EF4444",
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.modalStatusBadge,
                              isPending && styles.modalStatusBadgePending,
                              isApproved && styles.modalStatusBadgeApproved,
                              isRejected && styles.modalStatusBadgeRejected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.modalStatusText,
                                isPending && styles.modalStatusTextPending,
                                isApproved && styles.modalStatusTextApproved,
                                isRejected && styles.modalStatusTextRejected,
                              ]}
                            >
                              {statusText}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.modalHistoryDate}>
                          {formatDate(item.timestamp)}
                        </Text>
                      </View>

                      <View style={styles.modalHistoryBody}>
                        <View style={styles.modalHistoryIconContainer}>
                          <IconSymbol
                            name="person.fill"
                            size={16}
                            color={
                              isPending
                                ? "#F59E0B"
                                : isApproved
                                  ? "#22C55E"
                                  : "#EF4444"
                            }
                          />
                        </View>
                        <View style={styles.modalHistoryInfo}>
                          <Text style={styles.modalHistoryLabel}>
                            Requester
                          </Text>
                          <Text
                            style={styles.modalHistoryAddress}
                            numberOfLines={1}
                          >
                            {truncateAddress(item.requester)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modalHistoryTimestamp}>
                        <IconSymbol
                          name="clock.fill"
                          size={12}
                          color="#9CA3AF"
                        />
                        <Text style={styles.modalHistoryTimeText}>
                          {new Date(
                            Number(item.timestamp) * 1000,
                          ).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {/* Summary Footer */}
            {!loadingHistory && accessHistory.length > 0 && (
              <View style={styles.modalFooter}>
                <View style={styles.modalFooterStat}>
                  <View
                    style={[
                      styles.modalFooterDot,
                      { backgroundColor: "#22C55E" },
                    ]}
                  />
                  <Text style={styles.modalFooterText}>
                    {accessHistory.filter((h) => Number(h.status) === 1).length}{" "}
                    Approved
                  </Text>
                </View>
                <View style={styles.modalFooterStat}>
                  <View
                    style={[
                      styles.modalFooterDot,
                      { backgroundColor: "#EF4444" },
                    ]}
                  />
                  <Text style={styles.modalFooterText}>
                    {accessHistory.filter((h) => Number(h.status) === 2).length}{" "}
                    Rejected
                  </Text>
                </View>
                <View style={styles.modalFooterStat}>
                  <View
                    style={[
                      styles.modalFooterDot,
                      { backgroundColor: "#F59E0B" },
                    ]}
                  />
                  <Text style={styles.modalFooterText}>
                    {accessHistory.filter((h) => Number(h.status) === 0).length}{" "}
                    Pending
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
  },
  welcomeName: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  notificationButton: {
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
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginTop: 16,
    marginBottom: 16,
  },
  userInfoCard: {
    backgroundColor: "#e3f3d8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#c8e4b0",
  },
  userInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userInfoName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  userInfoLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  idBadge: {
    backgroundColor: "#FFF9C4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  userInfoRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 10,
  },
  userInfoItem: {
    marginBottom: 4,
  },
  userInfoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
  },
  recordsCard: {
    flex: 1,
    backgroundColor: "#d0ebf4",
    borderColor: "#a8d8ea",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  recordsContent: {
    gap: 6,
  },
  recordStat: {
    gap: 1,
  },
  recordStatLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  recordStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  recordStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rightColumn: {
    flex: 1,
    gap: 12,
  },
  accessCard: {
    backgroundColor: "#fdf3c5",
    borderColor: "#f0e49e",
  },
  accessContent: {
    gap: 4,
  },
  accessLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  accessValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  insuranceCard: {
    backgroundColor: "#ede1f9",
    borderColor: "#d4c0ec",
  },
  insuranceContent: {
    marginTop: 6,
    gap: 4,
  },
  insuranceStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  insuranceLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  insuranceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  accessHistoryCard: {
    backgroundColor: "#ffc5ac",
    borderColor: "#f0a88a",
    marginBottom: 12,
  },
  historyContent: {
    marginTop: 10,
    gap: 10,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  historyLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  historyValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  viewHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  viewHistoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E53935",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#F7F5F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 34,
  },
  modalHeader: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  modalLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 40,
  },
  modalLoadingText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  modalEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 10,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalEmptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 18,
  },
  modalListContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 8,
  },
  modalHistoryItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    gap: 10,
  },
  modalHistoryItemPending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  modalHistoryItemRejected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  modalHistoryItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalHistoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modalStatusBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  modalStatusBadgeApproved: {
    backgroundColor: "#DCFCE7",
  },
  modalStatusBadgeRejected: {
    backgroundColor: "#FEE2E2",
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalStatusTextPending: {
    color: "#92400E",
  },
  modalStatusTextApproved: {
    color: "#15803D",
  },
  modalStatusTextRejected: {
    color: "#DC2626",
  },
  modalHistoryDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  modalHistoryBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalHistoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalHistoryInfo: {
    flex: 1,
    gap: 1,
  },
  modalHistoryLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  modalHistoryAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  modalHistoryTimestamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalHistoryTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#E8E5DF",
  },
  modalFooterStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalFooterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalFooterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
});
