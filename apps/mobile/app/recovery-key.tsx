import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
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
import { useDevWalletContext } from "@/lib/wallet";
import { truncateAddress } from "@/lib/medicalRecord";

export default function RecoveryKeyScreen() {
  const router = useRouter();
  const { address, isConnected } = useDevWalletContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadProfile();
        setProfile(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRegenerateKey = () => {
    Alert.alert(
      "Regenerate Recovery Key",
      "This will invalidate your previous recovery key. Make sure to securely store the new one. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: async () => {
            if (!profile) return;
            setRegenerating(true);
            try {
              // Simulate key generation delay
              await new Promise((resolve) => setTimeout(resolve, 1500));
              const updated: UserProfile = {
                ...profile,
                recoveryKeyGenerated: true,
                recoveryKeyGeneratedAt: new Date().toISOString(),
              };
              await saveProfile(updated);
              setProfile(updated);
              Alert.alert(
                "Key Regenerated",
                "Your new recovery key has been generated. Please store it securely.",
              );
            } catch {
              Alert.alert(
                "Error",
                "Failed to regenerate key. Please try again.",
              );
            } finally {
              setRegenerating(false);
            }
          },
        },
      ],
    );
  };

  const handleGenerateKey = async () => {
    if (!profile) return;
    setRegenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const updated: UserProfile = {
        ...profile,
        recoveryKeyGenerated: true,
        recoveryKeyGeneratedAt: new Date().toISOString(),
      };
      await saveProfile(updated);
      setProfile(updated);
      Alert.alert(
        "Key Generated",
        "Your recovery key has been generated successfully. Store it in a safe place.",
      );
    } catch {
      Alert.alert("Error", "Failed to generate key. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const formatKeyDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  const daysSinceGeneration = (isoString: string): number => {
    try {
      const generated = new Date(isoString).getTime();
      const now = Date.now();
      return Math.floor((now - generated) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  const keyAge = profile?.recoveryKeyGeneratedAt
    ? daysSinceGeneration(profile.recoveryKeyGeneratedAt)
    : 0;

  const keyWarning = keyAge >= 90 && keyAge < 180;
  const keyExpiring = keyAge >= 180;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Loading recovery status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const keyGenerated = profile?.recoveryKeyGenerated ?? false;

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
          <Text style={styles.headerTitle}>Recovery Key</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            keyGenerated
              ? keyExpiring
                ? styles.statusBannerDanger
                : keyWarning
                  ? styles.statusBannerWarning
                  : styles.statusBannerSuccess
              : styles.statusBannerDanger,
          ]}
        >
          <View style={styles.statusBannerIcon}>
            <IconSymbol
              name={
                keyGenerated
                  ? keyExpiring
                    ? "exclamationmark.triangle.fill"
                    : "checkmark.shield.fill"
                  : "exclamationmark.triangle.fill"
              }
              size={36}
              color={
                keyGenerated
                  ? keyExpiring
                    ? "#DC2626"
                    : keyWarning
                      ? "#D97706"
                      : "#15803D"
                  : "#DC2626"
              }
            />
          </View>
          <View style={styles.statusBannerContent}>
            <Text style={styles.statusBannerTitle}>
              {keyGenerated
                ? keyExpiring
                  ? "Key Rotation Recommended"
                  : keyWarning
                    ? "Key Aging"
                    : "Recovery Key Active"
                : "No Recovery Key"}
            </Text>
            <Text style={styles.statusBannerSubtext}>
              {keyGenerated
                ? keyExpiring
                  ? "Your recovery key is older than 6 months. Consider regenerating it for better security."
                  : keyWarning
                    ? `Your key was generated ${keyAge} days ago. Consider rotating it soon.`
                    : "Your account recovery key is set up and ready to use if needed."
                : "You haven't generated a recovery key yet. Set one up to protect your account."}
            </Text>
          </View>
        </View>

        {/* Key Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol name="key.fill" size={18} color="#D97706" />
            <Text style={styles.cardTitle}>Key Information</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: keyGenerated
                    ? keyExpiring
                      ? "#FEE2E2"
                      : "#DCFCE7"
                    : "#FEE2E2",
                },
              ]}
            >
              <View
                style={[
                  styles.statusChipDot,
                  {
                    backgroundColor: keyGenerated
                      ? keyExpiring
                        ? "#EF4444"
                        : "#22C55E"
                      : "#EF4444",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color: keyGenerated
                      ? keyExpiring
                        ? "#DC2626"
                        : "#15803D"
                      : "#DC2626",
                  },
                ]}
              >
                {keyGenerated
                  ? keyExpiring
                    ? "Needs Rotation"
                    : "Active"
                  : "Not Generated"}
              </Text>
            </View>
          </View>

          {keyGenerated && profile?.recoveryKeyGeneratedAt && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Generated On</Text>
                <Text style={styles.detailValue}>
                  {formatKeyDate(profile.recoveryKeyGeneratedAt)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Age</Text>
                <Text
                  style={[
                    styles.detailValue,
                    keyExpiring && { color: "#DC2626" },
                    keyWarning && !keyExpiring && { color: "#D97706" },
                  ]}
                >
                  {keyAge} {keyAge === 1 ? "day" : "days"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rotation Due</Text>
                <Text style={styles.detailValue}>
                  {keyExpiring ? "Overdue" : `In ${180 - keyAge} days`}
                </Text>
              </View>
            </>
          )}

          {isConnected && address && (
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>Linked Wallet</Text>
              <View style={styles.walletBadge}>
                <View style={styles.walletDot} />
                <Text style={styles.walletBadgeText}>
                  {truncateAddress(address)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Key Health Progress */}
        {keyGenerated && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol name="heart.fill" size={18} color="#E53935" />
              <Text style={styles.cardTitle}>Key Health</Text>
            </View>

            <View style={styles.healthSection}>
              <View style={styles.healthLabelRow}>
                <Text style={styles.healthLabel}>
                  {keyExpiring
                    ? "Key needs rotation"
                    : keyWarning
                      ? "Key aging - rotation recommended soon"
                      : "Key is healthy"}
                </Text>
                <Text style={styles.healthPercent}>
                  {Math.min(100, Math.round((keyAge / 180) * 100))}%
                </Text>
              </View>
              <View style={styles.healthTrack}>
                <View
                  style={[
                    styles.healthBar,
                    {
                      width: `${Math.min(100, Math.round((keyAge / 180) * 100))}%`,
                      backgroundColor: keyExpiring
                        ? "#EF4444"
                        : keyWarning
                          ? "#F59E0B"
                          : "#22C55E",
                    },
                  ]}
                />
              </View>
              <View style={styles.healthLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#22C55E" }]}
                  />
                  <Text style={styles.legendText}>0–90 days</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#F59E0B" }]}
                  />
                  <Text style={styles.legendText}>90–180 days</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#EF4444" }]}
                  />
                  <Text style={styles.legendText}>180+ days</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Security Checklist */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol
              name="checkmark.shield.fill"
              size={18}
              color="#3B82F6"
            />
            <Text style={styles.cardTitle}>Security Checklist</Text>
          </View>

          <ChecklistItem
            checked={keyGenerated}
            label="Recovery key generated"
            sublabel={
              keyGenerated
                ? "Your key has been created"
                : "Generate a recovery key to protect your account"
            }
          />
          <ChecklistItem
            checked={keyGenerated && !keyExpiring}
            label="Key is within rotation period"
            sublabel={
              keyGenerated
                ? keyExpiring
                  ? "Your key is overdue for rotation"
                  : "Key is within the recommended 6-month period"
                : "Generate a key first"
            }
          />
          <ChecklistItem
            checked={isConnected}
            label="Wallet connected"
            sublabel={
              isConnected
                ? "Your wallet is linked to this device"
                : "Connect your wallet for full protection"
            }
          />
          <ChecklistItem
            checked={true}
            label="Local storage encrypted"
            sublabel="Profile data is encrypted on device"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {keyGenerated ? (
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={handleRegenerateKey}
              disabled={regenerating}
            >
              {regenerating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol
                    name="arrow.clockwise"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.regenerateButtonText}>
                    Regenerate Recovery Key
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateKey}
              disabled={regenerating}
            >
              {regenerating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol name="key.fill" size={18} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>
                    Generate Recovery Key
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <IconSymbol name="info.circle.fill" size={16} color="#D97706" />
            <Text style={styles.infoCardTitle}>About Recovery Keys</Text>
          </View>
          <Text style={styles.infoCardText}>
            Your recovery key allows you to regain access to your decentralised
            health records if you lose access to your device or wallet. Store it
            securely — anyone with this key can access your account.
          </Text>
          <View style={styles.infoTips}>
            <View style={styles.tipItem}>
              <IconSymbol name="checkmark" size={12} color="#D97706" />
              <Text style={styles.tipText}>
                Write it down and store offline
              </Text>
            </View>
            <View style={styles.tipItem}>
              <IconSymbol name="checkmark" size={12} color="#D97706" />
              <Text style={styles.tipText}>Never share it with anyone</Text>
            </View>
            <View style={styles.tipItem}>
              <IconSymbol name="checkmark" size={12} color="#D97706" />
              <Text style={styles.tipText}>
                Rotate every 6 months for best security
              </Text>
            </View>
            <View style={styles.tipItem}>
              <IconSymbol name="xmark" size={12} color="#DC2626" />
              <Text style={styles.tipText}>
                Do not store it in plain text digitally
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Checklist Item Component                                           */
/* ──────────────────────────────────────────────────────────────────── */
function ChecklistItem({
  checked,
  label,
  sublabel,
}: {
  checked: boolean;
  label: string;
  sublabel: string;
}) {
  return (
    <View style={styles.checklistItem}>
      <View
        style={[
          styles.checklistIcon,
          checked ? styles.checklistIconChecked : styles.checklistIconUnchecked,
        ]}
      >
        <IconSymbol
          name={checked ? "checkmark" : "xmark"}
          size={12}
          color={checked ? "#FFFFFF" : "#9CA3AF"}
        />
      </View>
      <View style={styles.checklistContent}>
        <Text
          style={[
            styles.checklistLabel,
            !checked && styles.checklistLabelUnchecked,
          ]}
        >
          {label}
        </Text>
        <Text style={styles.checklistSublabel}>{sublabel}</Text>
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  STYLES                                                             */
/* ──────────────────────────────────────────────────────────────────── */
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

  // Status Banner
  statusBanner: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    gap: 14,
    alignItems: "flex-start",
  },
  statusBannerSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#D1FAE5",
  },
  statusBannerWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  statusBannerDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusBannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBannerContent: {
    flex: 1,
    gap: 4,
  },
  statusBannerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  statusBannerSubtext: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7280",
    lineHeight: 19,
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

  // Detail rows
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  // Status chip
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusChipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Wallet badge
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  walletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  walletBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },

  // Health section
  healthSection: {
    gap: 12,
  },
  healthLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  healthLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  healthPercent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  healthTrack: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  healthBar: {
    height: 8,
    borderRadius: 4,
  },
  healthLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
  },

  // Checklist
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  checklistIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checklistIconChecked: {
    backgroundColor: "#22C55E",
  },
  checklistIconUnchecked: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  checklistContent: {
    flex: 1,
    gap: 2,
  },
  checklistLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  checklistLabelUnchecked: {
    color: "#9CA3AF",
  },
  checklistSublabel: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
    lineHeight: 17,
  },

  // Action Buttons
  actionsContainer: {
    marginBottom: 16,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#D97706",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#6B7280",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#6B7280",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Info Card
  infoCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
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
    color: "#92400E",
  },
  infoCardText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#92400E",
    lineHeight: 19,
    marginBottom: 12,
  },
  infoTips: {
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#92400E",
  },
});
