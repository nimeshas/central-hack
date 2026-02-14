import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  type: "navigate" | "toggle";
};

const menuItems: MenuItem[] = [
  {
    id: "personal",
    label: "Personal Details",
    icon: "person.fill",
    iconColor: "#6366F1",
    iconBgColor: "#EEF2FF",
    type: "navigate",
  },
  {
    id: "health",
    label: "General Health Details",
    icon: "heart.fill",
    iconColor: "#E53935",
    iconBgColor: "#FEF2F2",
    type: "navigate",
  },
  {
    id: "biometric",
    label: "Biometric Authentication",
    icon: "faceid",
    iconColor: "#0EA5E9",
    iconBgColor: "#F0F9FF",
    type: "toggle",
  },
  {
    id: "insurance",
    label: "Active Insurance",
    icon: "checkmark.shield.fill",
    iconColor: "#22C55E",
    iconBgColor: "#F0FDF4",
    type: "navigate",
  },
  {
    id: "immunization",
    label: "Immunization Record",
    icon: "cross.case.fill",
    iconColor: "#F59E0B",
    iconBgColor: "#FFFBEB",
    type: "navigate",
  },
  {
    id: "datasharing",
    label: "Data Sharing Permissions",
    icon: "lock.shield.fill",
    iconColor: "#8B5CF6",
    iconBgColor: "#F5F3FF",
    type: "navigate",
  },
  {
    id: "past",
    label: "Past something",
    icon: "clock.fill",
    iconColor: "#6B7280",
    iconBgColor: "#F3F4F6",
    type: "navigate",
  },
  {
    id: "recovery",
    label: "Recovery Key Status",
    icon: "key.fill",
    iconColor: "#D97706",
    iconBgColor: "#FEF3C7",
    type: "navigate",
  },
  {
    id: "help",
    label: "Help and Support",
    icon: "questionmark.circle.fill",
    iconColor: "#0891B2",
    iconBgColor: "#ECFEFF",
    type: "navigate",
  },
];

export default function ProfileScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const router = useRouter();

  const handleSignOut = () => {
    // TODO: Implement sign out logic
  };

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
          <TouchableOpacity style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backButton} />
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <IconSymbol name="person.fill" size={44} color="#9CA3AF" />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <IconSymbol name="pencil" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>Nimesha S</Text>
          <View style={styles.passportIdBadge}>
            <Text style={styles.passportIdLabel}>PASSPORT ID</Text>
            <Text style={styles.passportIdValue}> HP-9823-X</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.6}
              onPress={
                item.type === "toggle"
                  ? () => setBiometricEnabled(!biometricEnabled)
                  : undefined
              }
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
                <Text style={styles.menuItemLabel}>{item.label}</Text>
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

  // Avatar Section
  avatarSection: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
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
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
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
