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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDevWalletContext } from "@/lib/wallet";
import {
  getMedicalRecordContractWithSigner,
  safeContractCall,
  truncateAddress,
  type RecordItem,
} from "@/lib/medicalRecord";

function categorizeVisit(fileName: string): {
  type: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  department: string;
} {
  const n = fileName.toLowerCase();
  if (n.includes("mri"))
    return {
      type: "MRI Scan",
      icon: "camera.viewfinder",
      iconColor: "#3B82F6",
      iconBg: "#DBEAFE",
      department: "Radiology",
    };
  if (n.includes("x-ray") || n.includes("xray"))
    return {
      type: "X-Ray",
      icon: "camera.viewfinder",
      iconColor: "#6366F1",
      iconBg: "#EEF2FF",
      department: "Radiology",
    };
  if (n.includes("ct"))
    return {
      type: "CT Scan",
      icon: "camera.viewfinder",
      iconColor: "#0EA5E9",
      iconBg: "#F0F9FF",
      department: "Radiology",
    };
  if (n.includes("blood") || n.includes("cbc") || n.includes("lipid"))
    return {
      type: "Blood Test",
      icon: "drop.fill",
      iconColor: "#E53935",
      iconBg: "#FEF2F2",
      department: "Pathology",
    };
  if (n.includes("ecg") || n.includes("ekg"))
    return {
      type: "ECG Report",
      icon: "waveform.path.ecg",
      iconColor: "#22C55E",
      iconBg: "#F0FDF4",
      department: "Cardiology",
    };
  if (n.includes("prescription") || n.includes("rx"))
    return {
      type: "Prescription",
      icon: "pills.fill",
      iconColor: "#F59E0B",
      iconBg: "#FFFBEB",
      department: "General Practice",
    };
  if (n.includes("lab") || n.includes("report"))
    return {
      type: "Lab Report",
      icon: "doc.text.fill",
      iconColor: "#8B5CF6",
      iconBg: "#F5F3FF",
      department: "Pathology",
    };
  if (n.includes("scan") || n.includes("ultrasound"))
    return {
      type: "Scan",
      icon: "camera.viewfinder",
      iconColor: "#0891B2",
      iconBg: "#ECFEFF",
      department: "Radiology",
    };
  if (n.includes("insurance") || n.includes("claim"))
    return {
      type: "Insurance",
      icon: "checkmark.shield.fill",
      iconColor: "#22C55E",
      iconBg: "#F0FDF4",
      department: "Administration",
    };
  return {
    type: "Medical Record",
    icon: "doc.text.fill",
    iconColor: "#6B7280",
    iconBg: "#F3F4F6",
    department: "General Practice",
  };
}

function groupByMonth(
  records: (RecordItem & { index: number })[],
): { month: string; records: (RecordItem & { index: number })[] }[] {
  const groups: Record<
    string,
    { month: string; records: (RecordItem & { index: number })[] }
  > = {};

  for (const record of records) {
    const date = new Date(Number(record.timestamp) * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    if (!groups[key]) {
      groups[key] = { month: monthLabel, records: [] };
    }
    groups[key]!.records.push(record);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);
}

export default function PastVisitsScreen() {
  const router = useRouter();
  const { address, isConnected, signer } = useDevWalletContext();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!signer || !address) return;
    try {
      setLoading(true);
      const contract = getMedicalRecordContractWithSigner(signer);
      const data = (await safeContractCall(signer, () =>
        contract.getRecords(address),
      )) as RecordItem[];
      setRecords(Array.from(data));
      setHasLoaded(true);
    } catch (error) {
      console.error("Failed to load records:", error);
    } finally {
      setLoading(false);
    }
  }, [address, signer]);

  useEffect(() => {
    if (isConnected && signer && address) {
      loadRecords();
    }
  }, [isConnected, signer, address, loadRecords]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const sortedRecords = records
    .map((r, i) => ({ ...r, index: i }))
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const groupedRecords = groupByMonth(sortedRecords);

  // Stats
  const totalRecords = records.length;
  const departments = new Set(
    records.map((r) => categorizeVisit(r.fileName).department),
  );
  const uniqueDoctors = new Set(records.map((r) => r.doctor));

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Past Visits</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyRoot}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="clock.fill" size={48} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Wallet Not Connected</Text>
          <Text style={styles.emptySubtext}>
            Connect your wallet to view your past medical visit history from the
            blockchain.
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
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Past Visits</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <IconSymbol name="arrow.clockwise" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalRecords}</Text>
            <Text style={styles.statLabel}>Records</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{uniqueDoctors.size}</Text>
            <Text style={styles.statLabel}>Providers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{departments.size}</Text>
            <Text style={styles.statLabel}>Departments</Text>
          </View>
        </View>

        {/* Loading State */}
        {loading && !hasLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.loadingText}>Loading visit history...</Text>
          </View>
        )}

        {/* Empty State */}
        {hasLoaded && records.length === 0 && (
          <View style={styles.emptySection}>
            <View style={styles.emptySectionIconWrap}>
              <IconSymbol name="clock.fill" size={36} color="#D1D5DB" />
            </View>
            <Text style={styles.emptySectionTitle}>No Visit History</Text>
            <Text style={styles.emptySectionText}>
              Your medical visit history will appear here once records are added
              to the blockchain.
            </Text>
          </View>
        )}

        {/* Grouped Records */}
        {groupedRecords.map((group) => (
          <View key={group.month} style={styles.monthSection}>
            <View style={styles.monthHeader}>
              <View style={styles.monthDot} />
              <Text style={styles.monthTitle}>{group.month}</Text>
              <View style={styles.monthCountBadge}>
                <Text style={styles.monthCountText}>
                  {group.records.length}
                </Text>
              </View>
            </View>

            {/* Timeline connector */}
            <View style={styles.timelineContainer}>
              {group.records.map((record, idx) => {
                const visit = categorizeVisit(record.fileName);
                const isLast = idx === group.records.length - 1;
                const date = new Date(Number(record.timestamp) * 1000);
                const dayStr = date.toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "2-digit",
                });
                const timeStr = date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });

                return (
                  <View
                    key={`visit-${record.index}`}
                    style={styles.timelineItem}
                  >
                    {/* Timeline line */}
                    <View style={styles.timelineLine}>
                      <View
                        style={[
                          styles.timelineDot,
                          { backgroundColor: visit.iconColor },
                        ]}
                      />
                      {!isLast && <View style={styles.timelineConnector} />}
                    </View>

                    {/* Visit Card */}
                    <View style={styles.visitCard}>
                      <View style={styles.visitCardTop}>
                        <View style={styles.visitCardLeft}>
                          <View
                            style={[
                              styles.visitIconWrap,
                              { backgroundColor: visit.iconBg },
                            ]}
                          >
                            <IconSymbol
                              name={visit.icon as any}
                              size={16}
                              color={visit.iconColor}
                            />
                          </View>
                          <View style={styles.visitInfo}>
                            <Text style={styles.visitFileName}>
                              {record.fileName}
                            </Text>
                            <Text style={styles.visitType}>{visit.type}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.visitCardBottom}>
                        <View style={styles.visitMetaItem}>
                          <IconSymbol
                            name="person.fill"
                            size={10}
                            color="#9CA3AF"
                          />
                          <Text style={styles.visitMetaText}>
                            {truncateAddress(record.doctor)}
                          </Text>
                        </View>
                        <View style={styles.visitMetaItem}>
                          <IconSymbol
                            name="building.2.fill"
                            size={10}
                            color="#9CA3AF"
                          />
                          <Text style={styles.visitMetaText}>
                            {visit.department}
                          </Text>
                        </View>
                        <View style={styles.visitMetaItem}>
                          <IconSymbol
                            name="clock.fill"
                            size={10}
                            color="#9CA3AF"
                          />
                          <Text style={styles.visitMetaText}>
                            {dayStr}, {timeStr}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Info Card */}
        {hasLoaded && records.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <IconSymbol name="info.circle.fill" size={16} color="#6B7280" />
              <Text style={styles.infoCardTitle}>On-Chain History</Text>
            </View>
            <Text style={styles.infoCardText}>
              All medical records are stored immutably on the blockchain. This
              history is derived from your on-chain records and cannot be
              altered or deleted.
            </Text>
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
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
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
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
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

  // Stats Banner
  statsBanner: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
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

  // Empty section
  emptySection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    borderStyle: "dashed",
    gap: 10,
  },
  emptySectionIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptySectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptySectionText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },

  // Month Section
  monthSection: {
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  monthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6B7280",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  monthCountBadge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  monthCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  // Timeline
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 0,
  },
  timelineLine: {
    width: 24,
    alignItems: "center",
    paddingTop: 18,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: -1,
  },

  // Visit Card
  visitCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginLeft: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  visitCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  visitCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  visitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  visitInfo: {
    flex: 1,
    gap: 2,
  },
  visitFileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  visitType: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6B7280",
  },
  visitCardBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  visitMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  visitMetaText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
  },

  // Info Card
  infoCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  infoCardText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7280",
    lineHeight: 19,
  },
});
