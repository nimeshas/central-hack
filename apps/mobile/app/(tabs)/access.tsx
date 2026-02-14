import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

type AccessItem = {
  id: string;
  name: string;
  doctor: string;
  date: string;
};

type AccessHistoryItem = {
  id: string;
  name: string;
  doctor: string;
  date: string;
  status: "approved" | "denied";
};

const currentAccess: AccessItem[] = [
  { id: "1", name: "X-Ray Scan", doctor: "Dr. Sharma", date: "Yesterday" },
  { id: "2", name: "Lab Report", doctor: "Insurer", date: "Today" },
  { id: "3", name: "Prescription", doctor: "Insurer", date: "Today" },
];

const accessRequests: AccessItem[] = [
  { id: "1", name: "MRI Scan", doctor: "Dr. Sharma", date: "Yesterday" },
];

const accessHistory: AccessHistoryItem[] = [
  {
    id: "1",
    name: "MRI Scan",
    doctor: "Dr. Sharma",
    date: "10.02.2026",
    status: "denied",
  },
  {
    id: "2",
    name: "MRI Scan",
    doctor: "Dr. Sharma",
    date: "10.02.2026",
    status: "approved",
  },
  {
    id: "3",
    name: "MRI Scan",
    doctor: "Dr. Sharma",
    date: "10.02.2026",
    status: "approved",
  },
];

function ApproveIcon() {
  return (
    <View style={styles.approveIcon}>
      <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
    </View>
  );
}

function DenyIcon() {
  return (
    <View style={styles.denyIcon}>
      <IconSymbol name="xmark" size={14} color="#FFFFFF" />
    </View>
  );
}

function StatusBadge({ status }: { status: "approved" | "denied" }) {
  const isApproved = status === "approved";
  return (
    <View
      style={[
        styles.statusBadge,
        isApproved ? styles.statusApproved : styles.statusDenied,
      ]}
    >
      <IconSymbol
        name={isApproved ? "checkmark" : "xmark"}
        size={10}
        color={isApproved ? "#15803D" : "#DC2626"}
      />
    </View>
  );
}

export default function AccessScreen() {
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
              <View style={styles.activeDot} />
              <Text style={styles.activeSharingText}>ACTIVE SHARING</Text>
            </View>
            <Text style={styles.institutesText}>3 Institutes Authorised</Text>
            <Text style={styles.viewingText}>Viewing your vitals live</Text>
          </View>
        </View>

        {/* Current Access */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Current Access</Text>
          <View style={styles.accessList}>
            {currentAccess.map((item) => (
              <View key={item.id} style={styles.accessRow}>
                <View style={styles.accessRowLeft}>
                  <View style={styles.fileIconContainer}>
                    <IconSymbol
                      name="doc.text.fill"
                      size={16}
                      color="#6B7280"
                    />
                  </View>
                  <View style={styles.accessInfo}>
                    <Text style={styles.accessName}>{item.name}</Text>
                    <Text style={styles.accessMeta}>
                      {item.doctor} | {item.date}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Access Request */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Access Request</Text>
          <View style={styles.accessList}>
            {accessRequests.map((item) => (
              <View key={item.id} style={[styles.accessRow, styles.requestRow]}>
                <View style={styles.accessRowLeft}>
                  <View
                    style={[
                      styles.fileIconContainer,
                      styles.requestIconContainer,
                    ]}
                  >
                    <IconSymbol
                      name="doc.text.fill"
                      size={16}
                      color="#E53935"
                    />
                  </View>
                  <View style={styles.accessInfo}>
                    <Text style={styles.accessName}>{item.name}</Text>
                    <Text style={styles.accessMeta}>
                      {item.doctor} | {item.date}
                    </Text>
                  </View>
                </View>
                <View style={styles.accessActions}>
                  <TouchableOpacity>
                    <ApproveIcon />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <DenyIcon />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Access History */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Access History</Text>
          <View style={styles.historyList}>
            {accessHistory.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyRowLeft}>
                  <StatusBadge status={item.status} />
                  <View
                    style={[
                      styles.fileIconContainer,
                      item.status === "denied"
                        ? styles.historyDeniedIcon
                        : styles.historyApprovedIcon,
                    ]}
                  >
                    <IconSymbol
                      name="doc.text.fill"
                      size={16}
                      color={item.status === "denied" ? "#E53935" : "#22C55E"}
                    />
                  </View>
                  <View style={styles.accessInfo}>
                    <Text style={styles.accessName}>{item.name}</Text>
                    <Text style={styles.accessMeta}>{item.doctor}</Text>
                  </View>
                </View>
                <Text style={styles.historyDate}>{item.date}</Text>
              </View>
            ))}
          </View>
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
  activeSharingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: 0.8,
    textTransform: "uppercase",
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

  // Section
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  // Access List
  accessList: {
    gap: 8,
  },
  accessRow: {
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
  requestRow: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  accessRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  fileIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  requestIconContainer: {
    backgroundColor: "#FEE2E2",
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
  accessActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  approveIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
  },
  denyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#6B7280",
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
    gap: 10,
    flex: 1,
  },
  historyDeniedIcon: {
    backgroundColor: "#FEE2E2",
  },
  historyApprovedIcon: {
    backgroundColor: "#ECFDF5",
  },
  historyDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
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
});
