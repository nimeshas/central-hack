import React, { useCallback, useEffect, useState } from "react";
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

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [passportId, setPassportId] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await loadProfile();
        setProfile(data);
        setFullName(data.fullName);
        setDateOfBirth(data.dateOfBirth);
        setGender(data.gender);
        setAge(data.age);
        setPhone(data.phone);
        setEmail(data.email);
        setAddress(data.address);
        setPassportId(data.passportId);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = useCallback(() => {
    if (!profile) return false;
    return (
      fullName !== profile.fullName ||
      dateOfBirth !== profile.dateOfBirth ||
      gender !== profile.gender ||
      age !== profile.age ||
      phone !== profile.phone ||
      email !== profile.email ||
      address !== profile.address ||
      passportId !== profile.passportId
    );
  }, [profile, fullName, dateOfBirth, gender, age, phone, email, address, passportId]);

  useEffect(() => {
    setEdited(hasChanges());
  }, [hasChanges]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated: UserProfile = {
        ...profile,
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender: gender.trim(),
        age: age.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        passportId: passportId.trim(),
      };
      await saveProfile(updated);
      setProfile(updated);
      setEdited(false);
      Alert.alert("Saved", "Your personal details have been updated.");
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (edited) {
      Alert.alert("Unsaved Changes", "You have unsaved changes. Discard them?", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
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
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <IconSymbol name="chevron.left" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Personal Details</Text>
            <TouchableOpacity
              style={[styles.saveButton, !edited && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!edited || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.saveButtonText,
                    !edited && styles.saveButtonTextDisabled,
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <IconSymbol name="info.circle.fill" size={16} color="#6366F1" />
            <Text style={styles.infoBannerText}>
              Your personal details are stored locally on this device and are not
              shared with anyone.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <IconSymbol name="person.fill" size={16} color="#6366F1" />
              <Text style={styles.formSectionTitle}>Identity</Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#D1D5DB"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Health Passport ID</Text>
              <TextInput
                style={styles.fieldInput}
                value={passportId}
                onChangeText={setPassportId}
                placeholder="e.g. HP-9823-X"
                placeholderTextColor="#D1D5DB"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="DD.MM.YYYY"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="default"
                />
              </View>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Age"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.genderChip,
                      gender === option && styles.genderChipActive,
                    ]}
                    onPress={() => setGender(option)}
                  >
                    <Text
                      style={[
                        styles.genderChipText,
                        gender === option && styles.genderChipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <IconSymbol name="phone.fill" size={16} color="#22C55E" />
              <Text style={styles.formSectionTitle}>Contact Information</Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor="#D1D5DB"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#D1D5DB"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                value={address}
                onChangeText={setAddress}
                placeholder="Your address"
                placeholderTextColor="#D1D5DB"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Bottom spacer */}
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
  saveButton: {
    backgroundColor: "#6366F1",
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

  // Info Banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  infoBannerText: {
    fontSize: 13,
    color: "#4338CA",
    fontWeight: "400",
    lineHeight: 18,
    flex: 1,
  },

  // Form Card
  formCard: {
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
  formSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  // Fields
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
  fieldInputMultiline: {
    minHeight: 70,
    paddingTop: 12,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },

  // Gender chips
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  genderChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  genderChipTextActive: {
    color: "#6366F1",
  },
});
