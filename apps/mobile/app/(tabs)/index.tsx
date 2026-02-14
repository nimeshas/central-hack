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

export default function DashboardScreen() {
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
              <Text style={styles.welcomeName}>Hello, Nimesha!</Text>
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
              <Text style={styles.userInfoName}>Nimesha S</Text>
            </View>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>ID: #6767-NS</Text>
            </View>
          </View>

          <View style={styles.userInfoRow}>
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>Blood Group</Text>
              <Text style={styles.userInfoValue}>O+</Text>
            </View>
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>Allergies</Text>
              <Text style={styles.userInfoValue}>Dairy, Peanuts</Text>
            </View>
          </View>

          <View style={styles.userInfoItem}>
            <Text style={styles.userInfoLabel}>Last Check-Up Date</Text>
            <Text style={styles.userInfoValue}>12.02.2026</Text>
          </View>
        </View>

        {/* Two Column Cards Row */}
        <View style={styles.twoColumnRow}>
          {/* Records Card */}
          <TouchableOpacity style={[styles.infoCard, styles.recordsCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Records</Text>
              <IconSymbol name="arrow.up.right" size={14} color="#374151" />
            </View>
            <View style={styles.recordsContent}>
              <View style={styles.recordStat}>
                <Text style={styles.recordStatLabel}>Total Records</Text>
                <Text style={styles.recordStatValue}>11</Text>
              </View>
              <View style={styles.recordStat}>
                <Text style={styles.recordStatLabel}>Last Uploaded</Text>
                <Text style={styles.recordStatValue}>12.02.2026</Text>
              </View>
              <View style={styles.recordStatRow}>
                <View style={styles.recordStat}>
                  <Text style={styles.recordStatLabel}>Lab Reports</Text>
                  <Text style={styles.recordStatValue}>6</Text>
                </View>
              </View>
              <View style={styles.recordStatRow}>
                <View style={styles.recordStat}>
                  <Text style={styles.recordStatLabel}>Prescriptions</Text>
                  <Text style={styles.recordStatValue}>3</Text>
                </View>
              </View>
              <View style={styles.recordStatRow}>
                <View style={styles.recordStat}>
                  <Text style={styles.recordStatLabel}>Scans</Text>
                  <Text style={styles.recordStatValue}>2</Text>
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
                <Text style={styles.accessValue}>3 doctors</Text>
                <Text style={styles.accessLabel}>Access granted to</Text>
                <Text style={styles.accessValue}>4 documents</Text>
              </View>
            </View>

            {/* Insurance Card */}
            <View style={[styles.infoCard, styles.insuranceCard]}>
              <Text style={styles.cardTitle}>Insurance</Text>
              <View style={styles.insuranceContent}>
                <View style={styles.insuranceStat}>
                  <Text style={styles.insuranceLabel}>Pending Claims</Text>
                  <Text style={styles.insuranceValue}>1</Text>
                </View>
                <View style={styles.insuranceStat}>
                  <Text style={styles.insuranceLabel}>Approved</Text>
                  <Text style={styles.insuranceValue}>2</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Access History Card */}
        <View style={[styles.infoCard, styles.accessHistoryCard]}>
          <Text style={styles.cardTitle}>Access History</Text>
          <View style={styles.historyContent}>
            <View style={styles.historyRow}>
              <View>
                <Text style={styles.historyLabel}>Last Accessed Document</Text>
                <Text style={styles.historyValue}>Blood Test</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyLabel}>Accessed on</Text>
                <Text style={styles.historyValue}>13.02.2026</Text>
              </View>
            </View>
            <View style={styles.historyRow}>
              <View>
                <Text style={styles.historyLabel}>Accessed by</Text>
                <Text style={styles.historyValue}>Dr. Sharma</Text>
              </View>
              <TouchableOpacity style={styles.viewHistoryButton}>
                <Text style={styles.viewHistoryText}>View History</Text>
                <IconSymbol name="arrow.up.right" size={12} color="#E53935" />
              </TouchableOpacity>
            </View>
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
});
