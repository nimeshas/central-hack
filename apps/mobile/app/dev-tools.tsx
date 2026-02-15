import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDevWalletContext } from "@/lib/wallet";
import {
  getMedicalRecordContractWithSigner,
  safeContractCall,
  requestStatusLabel,
  type AccessRequest,
  type RecordItem,
} from "@/lib/medicalRecord";

const ipfsGateway =
  process.env.EXPO_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud";

export default function DevToolsScreen() {
  const router = useRouter();
  const { address, isConnected, signer } = useDevWalletContext();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!signer || !address) {
      setStatus("Dev wallet not available.");
      return;
    }
    try {
      setLoading(true);
      setStatus("Loading requests...");
      const contract = getMedicalRecordContractWithSigner(signer);
      const data = (await safeContractCall(signer, () =>
        contract.getRequests(address),
      )) as AccessRequest[];
      setRequests(data);
      setStatus(null);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to load requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [address, signer]);

  const resolveRequest = useCallback(
    async (requestId: number, approve: boolean) => {
      if (!signer || !address) {
        setStatus("Dev wallet not available.");
        return;
      }
      try {
        setStatus(approve ? "Approving request..." : "Rejecting request...");
        setLoading(true);
        const contract = getMedicalRecordContractWithSigner(signer);
        const tx = await contract.respondToRequest(requestId, approve);
        await tx.wait();
        await loadRequests();
        setStatus(approve ? "Request approved." : "Request rejected.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setLoading(false);
      }
    },
    [address, signer, loadRequests],
  );

  const loadRecords = useCallback(async () => {
    if (!signer || !address) {
      setStatus("Dev wallet not available.");
      return;
    }
    try {
      setLoading(true);
      setStatus("Loading records...");
      const contract = getMedicalRecordContractWithSigner(signer);
      const data = (await safeContractCall(signer, () =>
        contract.getRecords(address),
      )) as RecordItem[];
      setRecords(data);
      setStatus(null);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to load records.",
      );
    } finally {
      setLoading(false);
    }
  }, [address, signer]);

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dev Tools</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Wallet Status Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconContainer}>
              <IconSymbol name="key.fill" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.cardTitle}>Dev Wallet</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                isConnected
                  ? styles.statusConnected
                  : styles.statusDisconnected,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isConnected ? "#22C55E" : "#EF4444",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isConnected ? "#15803D" : "#DC2626" },
                ]}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </Text>
            </View>
          </View>

          {address ? (
            <View style={styles.addressContainer}>
              <Text style={styles.statusLabel}>Address</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {address}
              </Text>
            </View>
          ) : (
            <Text style={styles.mutedText}>
              Set EXPO_PUBLIC_DEV_WALLET_PRIVATE_KEY to connect.
            </Text>
          )}
        </View>

        {/* Global Status */}
        {status ? (
          <View style={styles.statusMessageContainer}>
            {loading && <ActivityIndicator size="small" color="#6B7280" />}
            <Text style={styles.statusMessage}>{status}</Text>
          </View>
        ) : null}

        {/* Access Approvals Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Access Approvals</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadRequests}
              disabled={loading}
            >
              <IconSymbol name="arrow.up.right" size={14} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Load</Text>
            </TouchableOpacity>
          </View>

          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                name="checkmark.seal.fill"
                size={32}
                color="#D1D5DB"
              />
              <Text style={styles.emptyStateText}>
                No requests yet. Tap Load to fetch.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {requests.map((request, index) => (
                <View
                  key={`${request.requester}-${index}`}
                  style={styles.requestCard}
                >
                  <View style={styles.requestHeader}>
                    <View
                      style={[
                        styles.requestStatusDot,
                        {
                          backgroundColor:
                            request.status === 0n
                              ? "#F59E0B"
                              : request.status === 1n
                                ? "#22C55E"
                                : "#EF4444",
                        },
                      ]}
                    />
                    <Text style={styles.requestStatusText}>
                      {requestStatusLabel(request.status)}
                    </Text>
                  </View>

                  <Text style={styles.requestAddress} numberOfLines={1}>
                    {request.requester}
                  </Text>
                  <Text style={styles.requestTimestamp}>
                    {new Date(
                      Number(request.timestamp) * 1000,
                    ).toLocaleString()}
                  </Text>

                  {request.status === 0n ? (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => resolveRequest(index, true)}
                        disabled={loading}
                      >
                        <IconSymbol
                          name="checkmark"
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => resolveRequest(index, false)}
                        disabled={loading}
                      >
                        <IconSymbol name="xmark" size={14} color="#FFFFFF" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Records Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Records</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadRecords}
              disabled={loading}
            >
              <IconSymbol name="arrow.up.right" size={14} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Load</Text>
            </TouchableOpacity>
          </View>

          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="doc.text.fill" size={32} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                No records yet. Tap Load to fetch.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {records.map((record, index) => (
                <View
                  key={`${record.ipfsHash}-${index}`}
                  style={styles.recordCard}
                >
                  <View style={styles.recordHeader}>
                    <View style={styles.recordIconContainer}>
                      <IconSymbol
                        name="doc.text.fill"
                        size={18}
                        color="#6366F1"
                      />
                    </View>
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordFileName}>
                        {record.fileName}
                      </Text>
                      <Text style={styles.recordMeta}>
                        Uploaded by {record.doctor}
                      </Text>
                      <Text style={styles.recordMeta}>
                        {new Date(
                          Number(record.timestamp) * 1000,
                        ).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.openFileButton}
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
                    <Text style={styles.openFileText}>Open on IPFS</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
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
  headerSpacer: {
    width: 40,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusConnected: {
    backgroundColor: "#ECFDF5",
  },
  statusDisconnected: {
    backgroundColor: "#FEF2F2",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  addressContainer: {
    gap: 4,
  },
  addressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
    fontFamily: "monospace",
  },
  mutedText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  // Status message
  statusMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  statusMessage: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    flex: 1,
  },

  // Section
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    borderStyle: "dashed",
    gap: 10,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // List
  listContainer: {
    gap: 10,
  },

  // Request card
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    gap: 6,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  requestStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  requestStatusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  requestAddress: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    fontFamily: "monospace",
  },
  requestTimestamp: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22C55E",
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Record card
  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    gap: 10,
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recordIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  recordInfo: {
    flex: 1,
    gap: 2,
  },
  recordFileName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  recordMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  openFileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingVertical: 10,
    borderRadius: 10,
  },
  openFileText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
});
