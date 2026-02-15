import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  loadProfile,
  saveProfile,
  type UserProfile,
} from "@/lib/profile-storage";

const STATUS_OPTIONS: { label: string; value: UserProfile["insuranceStatus"] }[] = [
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "None", value: "none" },
];

export default function InsuranceScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [provider, setProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState<UserProfile["insuranceStatus"]>("none");

  useEffect(() => {
    (async () => {
      try {
        const data = await loadProfile();
        setProfile(data);
        setProvider(data.insuranceProvider);
        setPolicyNumber(data.insurancePolicyNumber);
        setExpiryDate(data.insuranceExpiryDate);
        setStatus(data.insuranceStatus);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = () => {
    if (!profile) return false;
    return (
      provider !== profile.insuranceProvider ||
      policyNumber !== profile.insurancePolicyNumber ||
      expiryDate !== profile.insuranceExpiryDate ||
      status !== profile.insuranceStatus
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated: UserProfile = {
        ...profile,
        insuranceProvider: provider.trim(),
        insurancePolicyNumber: policyNumber.trim(),
        insuranceExpiryDate: expiryDate.trim(),
        insuranceStatus: status,
      };
      await saveProfile(updated);
      setProfile(updated);
      setEditing(false);
      Alert.alert("Saved", "Insurance details have been updated.");
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setProvider(profile.insuranceProvider);
    setPolicyNumber(profile.insurancePolicyNumber);
    setExpiryDate(profile.insuranceExpiryDate);
    setStatus(profile.insuranceStatus);
    setEditing(false);
  };

  const statusColor = (s: UserProfile["insuranceStatus"]) => {
    switch (s) {
      case "active":
        return { bg: "#DCFCE7", text: "#15803D", dot: "#22C55E" };
      case "expired":
        return { bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
    }
  };

  const colors = statusColor(status);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading insurance info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <IconSymbol name="chevron.left" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Active Insurance</Text>
            {editing ? (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !hasChanges() && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!hasChanges() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.saveButtonText,
                      !hasChanges() && styles.saveButtonTextDisabled,
                    ]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <IconSymbol name="pencil" size={14} color="#22C55E" />
              </TouchableOpacity>
            )}
          </View>

          {/* Status Banner */}
          <View
            style={[styles.statusBanner, { backgroundColor: colors.bg }]}
          >
            <View style={styles.statusBannerLeft}>
              <View
                style={[styles.statusDot, { backgroundColor: colors.dot }]}
              />
              <Text style={[styles.statusBannerLabel, { color: colors.text }]}>
                {status === "active"
                  ? "POLICY ACTIVE"
                  : status === "expired"
                    ? "POLICY EXPIRED"
                    : "NO POLICY"}
              </Text>
            </View>
            <View style={styles.statusBannerRight}>
              <IconSymbol
                name="checkmark.shield.fill"
                size={32}
                color={colors.dot}
              />
            </View>
          </View>

          {/* Policy Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol
                name="checkmark.shield.fill"
                size={18}
                color="#22C55E"
              />
              <Text style={styles.cardTitle}>Policy Information</Text>
            </View>

            {editing ? (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Insurance Provider</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={provider}
                    onChangeText={setProvider}
                    placeholder="e.g. Star Health Insurance"
                    placeholderTextColor="#D1D5DB"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Policy Number</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={policyNumber}
                    onChangeText={setPolicyNumber}
                    placeholder="e.g. SHI-2024-78901"
                    placeholderTextColor="#D1D5DB"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Expiry Date</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    placeholder="DD.MM.YYYY"
                    placeholderTextColor="#D1D5DB"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.statusChipRow}>
                    {STATUS_OPTIONS.map((opt) => {
                      const optColors = statusColor(opt.value);
                      const isSelected = status === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: isSelected
                                ? optColors.bg
                                : "#F3F4F6",
                              borderColor: isSelected
                                ? optColors.dot
                                : "#E5E7EB",
                            },
                          ]}
                          onPress={() => setStatus(opt.value)}
                        >
                          <View
                            style={[
                              styles.chipDot,
                              {
                                backgroundColor: isSelected
                                  ? optColors.dot
                                  : "#D1D5DB",
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusChipText,
                              {
                                color: isSelected
                                  ? optColors.text
                                  : "#6B7280",
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel Editing</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Provider</Text>
                  <Text style={styles.detailValue}>
                    {provider || "Not set"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Policy Number</Text>
                  <View style={styles.policyBadge}>
                    <Text style={styles.policyBadgeText}>
                      {policyNumber || "—"}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expiry Date</Text>
                  <Text style={styles.detailValue}>
                    {expiryDate || "Not set"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: colors.bg },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusBadgeDot,
                        { backgroundColor: colors.dot },
                      ]}
                    />
                    <Text
                      style={[styles.statusBadgeText, { color: colors.text }]}
                    >
                      {status === "active"
                        ? "Active"
                        : status === "expired"
                          ? "Expired"
                          : "None"}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Coverage Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol name="doc.text.fill" size={18} color="#3B82F6" />
              <Text style={styles.cardTitle}>Coverage Details</Text>
            </View>

            <View style={styles.coverageGrid}>
              <View style={styles.coverageItem}>
                <View
                  style={[
                    styles.coverageIconWrap,
                    { backgroundColor: "#EEF2FF" },
                  ]}
                >
                  <IconSymbol name="heart.fill" size={16} color="#6366F1" />
                </View>
                <Text style={styles.coverageLabel}>Hospitalization</Text>
                <Text style={styles.coverageValue}>Covered</Text>
              </View>

              <View style={styles.coverageItem}>
                <View
                  style={[
                    styles.coverageIconWrap,
                    { backgroundColor: "#FEF2F2" },
                  ]}
                >
                  <IconSymbol
                    name="cross.case.fill"
                    size={16}
                    color="#E53935"
                  />
                </View>
                <Text style={styles.coverageLabel}>Surgery</Text>
                <Text style={styles.coverageValue}>Covered</Text>
              </View>

              <View style={styles.coverageItem}>
                <View
                  style={[
                    styles.coverageIconWrap,
                    { backgroundColor: "#F0FDF4" },
                  ]}
                >
                  <IconSymbol
                    name="pills.fill"
                    size={16}
                    color="#22C55E"
                  />
                </View>
                <Text style={styles.coverageLabel}>Medication</Text>
                <Text style={styles.coverageValue}>Partial</Text>
              </View>

              <View style={styles.coverageItem}>
                <View
                  style={[
                    styles.coverageIconWrap,
                    { backgroundColor: "#FFFBEB" },
                  ]}
                >
                  <IconSymbol
                    name="stethoscope"
                    size={16}
                    color="#F59E0B"
                  />
                </View>
                <Text style={styles.coverageLabel}>Outpatient</Text>
                <Text style={styles.coverageValue}>Limited</Text>
              </View>
            </View>
          </View>

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <IconSymbol
                name="lightbulb.fill"
                size={16}
                color="#F59E0B"
              />
              <Text style={styles.tipsTitle}>Insurance Tips</Text>
            </View>
            <Text style={styles.tipsText}>
              Keep your insurance details up to date to ensure quick processing
              during emergencies. Your policy information is stored securely on
              your device.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  saveButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  saveButtonTextDisabled: {
    color: "#9CA3AF",
  },

  // Status Banner
  statusBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  statusBannerLeft: {
    gap: 6,
  },
  statusBannerLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statusBannerRight: {
    opacity: 0.6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  // Detail rows (read-only)
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  policyBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  policyBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Edit fields
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Status chips
  statusChipRow: {
    flexDirection: "row",
    gap: 10,
  },
  statusChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  // Coverage Grid
  coverageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  coverageItem: {
    width: "47%" as any,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  coverageIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  coverageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  coverageValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  // Tips
  tipsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  tipsText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#92400E",
    lineHeight: 19,
  },
});
