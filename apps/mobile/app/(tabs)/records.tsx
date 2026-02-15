import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDevWalletContext } from "@/lib/wallet";
import {
  getMedicalRecordContractWithSigner,
  safeContractCall,
  type RecordItem,
} from "@/lib/medicalRecord";

const ipfsGateway =
  process.env.EXPO_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud";

type Category = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  iconBgColor: string;
  keywords: string[];
};

const categories: Category[] = [
  {
    id: "lab",
    name: "Lab Reports",
    subtitle: "Blood Tests, Urinalysis",
    icon: "heart.text.square.fill",
    bgColor: "#FEF2F2",
    borderColor: "#FECACA",
    iconBgColor: "#FCA5A5",
    keywords: ["lab", "blood", "urinalysis", "test", "report", "cbc", "lipid"],
  },
  {
    id: "prescriptions",
    name: "Prescriptions",
    subtitle: "Active and past medications",
    icon: "pills.fill",
    bgColor: "#ECFDF5",
    borderColor: "#D1FAE5",
    iconBgColor: "#6EE7B7",
    keywords: ["prescription", "medication", "medicine", "drug", "rx"],
  },
  {
    id: "scans",
    name: "Scans",
    subtitle: "X-Rays, MRI, CT",
    icon: "person.fill.viewfinder",
    bgColor: "#FFF7ED",
    borderColor: "#FED7AA",
    iconBgColor: "#FDBA74",
    keywords: ["scan", "x-ray", "xray", "mri", "ct", "ultrasound", "imaging"],
  },
  {
    id: "insurance",
    name: "Insurance",
    subtitle: "Policies and Claims",
    icon: "checkmark.shield.fill",
    bgColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    iconBgColor: "#93C5FD",
    keywords: ["insurance", "policy", "claim", "coverage"],
  },
];

function categorizeCounts(records: RecordItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const cat of categories) {
    counts[cat.id] = 0;
  }
  counts["other"] = 0;

  for (const record of records) {
    const name = record.fileName.toLowerCase();
    let matched = false;
    for (const cat of categories) {
      if (cat.keywords.some((kw) => name.includes(kw))) {
        counts[cat.id] = (counts[cat.id] ?? 0) + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      counts["other"] = (counts["other"] ?? 0) + 1;
    }
  }
  return counts;
}

function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function RecordsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { address, isConnected, signer } = useDevWalletContext();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadRecords = useCallback(
    async (silent = false) => {
      if (!signer || !address) {
        setError("Wallet not connected.");
        return;
      }
      try {
        if (!silent) setLoading(true);
        setError(null);
        const contract = getMedicalRecordContractWithSigner(signer);
        const data = (await safeContractCall(signer, () =>
          contract.getRecords(address),
        )) as RecordItem[];
        setRecords(data);
        setHasLoaded(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load records.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [address, signer],
  );

  useEffect(() => {
    if (isConnected && signer && address) {
      loadRecords();
    }
  }, [isConnected, signer, address, loadRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecords(true);
  }, [loadRecords]);

  const sortedRecords = [...records].sort((a, b) => {
    return Number(b.timestamp) - Number(a.timestamp);
  });

  const filteredRecords = sortedRecords.filter((record) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      record.fileName.toLowerCase().includes(q) ||
      record.doctor.toLowerCase().includes(q)
    );
  });

  const recentRecords = filteredRecords.slice(0, 5);
  const categoryCounts = categorizeCounts(records);

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
            <Text style={styles.pageTitle}>Records</Text>
            <Text style={styles.pageSubtitle}>
              Secure vault for your medical history
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => loadRecords()}
          >
            <IconSymbol name="arrow.clockwise" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your documents"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <IconSymbol name="xmark.circle.fill" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Banner */}
        {hasLoaded && (
          <View style={styles.statsBanner}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{records.length}</Text>
              <Text style={styles.statLabel}>Total Records</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {records.length > 0
                  ? formatTimestamp(sortedRecords[0]?.timestamp ?? BigInt(0))
                  : "—"}
              </Text>
              <Text style={styles.statLabel}>Last Uploaded</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                <IconSymbol name="link" size={14} color="#22C55E" />
                {" On-Chain"}
              </Text>
              <Text style={styles.statLabel}>Storage</Text>
            </View>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={16}
              color="#DC2626"
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading State */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.loadingText}>
              Loading records from blockchain...
            </Text>
          </View>
        )}

        {/* Recent Files */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {searchQuery.trim() ? "Search Results" : "Recent Files"}
          </Text>

          {!loading && hasLoaded && filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="doc.text.fill" size={32} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? "No records match your search."
                  : "No records found on-chain."}
              </Text>
              {!searchQuery.trim() && (
                <Text style={styles.emptyStateSubtext}>
                  Records uploaded by your doctors will appear here.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.recentFilesList}>
              {(searchQuery.trim() ? filteredRecords : recentRecords).map(
                (record, index) => (
                  <TouchableOpacity
                    key={`${record.ipfsHash}-${index}`}
                    style={styles.recentFileItem}
                    onPress={() =>
                      WebBrowser.openBrowserAsync(
                        `${ipfsGateway}/ipfs/${record.ipfsHash}`,
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentFileLeft}>
                      <View style={styles.fileIconContainer}>
                        <IconSymbol
                          name="doc.text.fill"
                          size={18}
                          color="#E53935"
                        />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {record.fileName}
                        </Text>
                        <Text style={styles.fileMeta}>
                          {truncateAddress(record.doctor)} |{" "}
                          {formatTimestamp(record.timestamp)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.openButton}
                      onPress={() =>
                        WebBrowser.openBrowserAsync(
                          `${ipfsGateway}/ipfs/${record.ipfsHash}`,
                        )
                      }
                    >
                      <IconSymbol
                        name="arrow.up.right"
                        size={14}
                        color="#6366F1"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ),
              )}

              {!searchQuery.trim() && filteredRecords.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>
                    View all {filteredRecords.length} records
                  </Text>
                  <IconSymbol name="chevron.right" size={14} color="#6366F1" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Categories */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: category.bgColor,
                    borderColor: category.borderColor,
                  },
                ]}
              >
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.categoryIconContainer,
                      { backgroundColor: category.iconBgColor },
                    ]}
                  >
                    <IconSymbol
                      name={category.icon as any}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.categoryCountBadge}>
                    <Text style={styles.categoryCount}>
                      {categoryCounts[category.id] ?? 0}
                    </Text>
                  </View>
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Upload FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push("/upload-record" as any)}
      >
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
    alignItems: "flex-start",
    paddingTop: 8,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "400",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
    fontWeight: "400",
  },

  // Stats Banner
  statsBanner: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },

  // Error
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#DC2626",
    flex: 1,
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
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    borderStyle: "dashed",
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    textAlign: "center",
    paddingHorizontal: 32,
  },

  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  recentFilesList: {
    gap: 8,
  },
  recentFileItem: {
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
  recentFileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: {
    gap: 2,
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  fileMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  openButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryCountBadge: {
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
    lineHeight: 18,
  },

  // Upload FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
