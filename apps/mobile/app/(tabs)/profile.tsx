import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDevWalletContext } from "@/lib/wallet";
import { truncateAddress } from "@/lib/medicalRecord";
import { loadProfile, type UserProfile } from "@/lib/profile-storage";

type MenuItem = {
  id: string;
  label: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  type: "navigate" | "toggle";
  route?: string;
};

const menuItems: MenuItem[] = [
  {
    id: "personal",
    label: "Personal Details",
    subtitle: "Name, DOB, contact info",
    icon: "person.fill",
    iconColor: "#6366F1",
    iconBgColor: "#EEF2FF",
    type: "navigate",
    route: "/personal-details",
  },
  {
    id: "health",
    label: "General Health Details",
    subtitle: "Vitals, allergies, conditions",
    icon: "heart.fill",
    iconColor: "#E53935",
    iconBgColor: "#FEF2F2",
    type: "navigate",
    route: "/health-details",
  },
  {
    id: "biometric",
    label: "Biometric Authentication",
    subtitle: "Face ID / Fingerprint",
    icon: "faceid",
    iconColor: "#0EA5E9",
    iconBgColor: "#F0F9FF",
    type: "toggle",
  },
  {
    id: "insurance",
    label: "Active Insurance",
    subtitle: "Policy and coverage details",
    icon: "checkmark.shield.fill",
    iconColor: "#22C55E",
    iconBgColor: "#F0FDF4",
    type: "navigate",
    route: "/insurance",
  },
  {
    id: "immunization",
    label: "Immunization Record",
    subtitle: "Vaccines and schedules",
    icon: "cross.case.fill",
    iconColor: "#F59E0B",
    iconBgColor: "#FFFBEB",
    type: "navigate",
    route: "/immunization",
  },
  {
    id: "datasharing",
    label: "Data Sharing Permissions",
    subtitle: "Control who sees your data",
    icon: "lock.shield.fill",
    iconColor: "#8B5CF6",
    iconBgColor: "#F5F3FF",
    type: "navigate",
    route: "/data-sharing",
  },
  {
    id: "past",
    label: "Past Visits",
    subtitle: "Medical visit history",
    icon: "clock.fill",
    iconColor: "#6B7280",
    iconBgColor: "#F3F4F6",
    type: "navigate",
    route: "/past-visits",
  },
  {
    id: "recovery",
    label: "Recovery Key Status",
    subtitle: "Backup and recovery options",
    icon: "key.fill",
    iconColor: "#D97706",
    iconBgColor: "#FEF3C7",
    type: "navigate",
    route: "/recovery-key",
  },
  {
    id: "help",
    label: "Help and Support",
    subtitle: "FAQ, contact, feedback",
    icon: "questionmark.circle.fill",
    iconColor: "#0891B2",
    iconBgColor: "#ECFEFF",
    type: "navigate",
    route: "/help-support",
  },
];

export default function ProfileScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const router = useRouter();
  const { address, isConnected } = useDevWalletContext();

  const fetchProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const data = await loadProfile();
      setProfile(data);
    } catch {
      // fallback handled by loadProfile
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Reload profile every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  const handleSignOut = () => {
    // TODO: Implement sign out logic
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.type === "toggle") {
      setBiometricEnabled(!biometricEnabled);
      return;
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const displayName = profile?.fullName || "User";
  const passportId = profile?.passportId || "—";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.editHeaderButton}
            onPress={() => router.push("/personal-details" as any)}
          >
            <IconSymbol name="pencil" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {loadingProfile ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => router.push("/personal-details" as any)}
            >
              <IconSymbol name="pencil" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <View style={styles.passportIdBadge}>
            <Text style={styles.passportIdLabel}>PASSPORT ID</Text>
            <Text style={styles.passportIdValue}> {passportId}</Text>
          </View>

          {/* Wallet Address */}
          {isConnected && address && (
            <View style={styles.walletBadge}>
              <View style={styles.walletDot} />
              <Text style={styles.walletText}>{truncateAddress(address)}</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        {profile && (
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {profile.bloodGroup || "—"}
              </Text>
              <Text style={styles.quickStatLabel}>Blood</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {profile.weight ? `${profile.weight}kg` : "—"}
              </Text>
              <Text style={styles.quickStatLabel}>Weight</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {profile.height ? `${profile.height}cm` : "—"}
              </Text>
              <Text style={styles.quickStatLabel}>Height</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {profile.insuranceStatus === "active" ? "Active" : "None"}
              </Text>
              <Text style={styles.quickStatLabel}>Insurance</Text>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              activeOpacity={0.6}
              onPress={() => handleMenuPress(item)}
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: item.iconBgColor },
                  ]}
                >
                  <IconSymbol
                    name={item.icon as any}
                    size={18}
                    color={item.iconColor}
                  />
                </View>
                <View style={styles.menuItemTextContainer}>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
              </View>

              {item.type === "toggle" ? (
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: "#D1D5DB", true: "#22C55E" }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                  style={styles.switchStyle}
                />
              ) : (
                <IconSymbol name="chevron.right" size={16} color="#D1D5DB" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Dev Tools Button */}
        <TouchableOpacity
          style={styles.devToolsButton}
          onPress={() => router.push("/dev-tools")}
        >
          <View style={styles.devToolsLeft}>
            <View style={styles.devToolsIconContainer}>
              <IconSymbol
                name="chevron.left.forwardslash.chevron.right"
                size={18}
                color="#F59E0B"
              />
            </View>
            <View>
              <Text style={styles.devToolsText}>Dev Tools</Text>
              <Text style={styles.devToolsSubtext}>
                Hardhat wallet, approvals & records
              </Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={16} color="#D1D5DB" />
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  editHeaderButton: {
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

  // Avatar Section
  avatarSection: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#6B7280",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  passportIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  passportIdLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  passportIdValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E53935",
  },
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  walletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  walletText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
    fontFamily: "monospace",
  },

  // Quick Stats
  quickStats: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    alignItems: "center",
    justifyContent: "space-around",
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  quickStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E5E7EB",
  },

  // Menu
  menuContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemTextContainer: {
    flex: 1,
    gap: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  menuItemSubtitle: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  switchStyle: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },

  // Dev Tools
  devToolsButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  devToolsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  devToolsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  devToolsText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  devToolsSubtext: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
    marginTop: 1,
  },

  // Sign Out
  signOutButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E53935",
    marginBottom: 16,
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E53935",
  },
});
