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

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function HealthDetailsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);

  // Editable fields
  const [bloodGroup, setBloodGroup] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await loadProfile();
        setProfile(data);
        setBloodGroup(data.bloodGroup);
        setWeight(data.weight);
        setHeight(data.height);
        setAllergies([...data.allergies]);
        setConditions([...data.conditions]);
        setEmergencyContactName(data.emergencyContactName);
        setEmergencyContactRelation(data.emergencyContactRelation);
        setEmergencyContactPhone(data.emergencyContactPhone);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = useCallback(() => {
    if (!profile) return false;
    return (
      bloodGroup !== profile.bloodGroup ||
      weight !== profile.weight ||
      height !== profile.height ||
      JSON.stringify(allergies) !== JSON.stringify(profile.allergies) ||
      JSON.stringify(conditions) !== JSON.stringify(profile.conditions) ||
      emergencyContactName !== profile.emergencyContactName ||
      emergencyContactRelation !== profile.emergencyContactRelation ||
      emergencyContactPhone !== profile.emergencyContactPhone
    );
  }, [
    profile,
    bloodGroup,
    weight,
    height,
    allergies,
    conditions,
    emergencyContactName,
    emergencyContactRelation,
    emergencyContactPhone,
  ]);

  useEffect(() => {
    setEdited(hasChanges());
  }, [hasChanges]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated: UserProfile = {
        ...profile,
        bloodGroup,
        weight: weight.trim(),
        height: height.trim(),
        allergies,
        conditions,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactRelation: emergencyContactRelation.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
      };
      await saveProfile(updated);
      setProfile(updated);
      setEdited(false);
      Alert.alert("Saved", "Your health details have been updated.");
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (edited) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Discard them?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  };

  const addAllergy = () => {
    const trimmed = newAllergy.trim();
    if (!trimmed) return;
    if (allergies.map((a) => a.toLowerCase()).includes(trimmed.toLowerCase())) {
      Alert.alert("Duplicate", "This allergy is already in your list.");
      return;
    }
    setAllergies([...allergies, trimmed]);
    setNewAllergy("");
  };

  const removeAllergy = (index: number) => {
    const updated = [...allergies];
    updated.splice(index, 1);
    setAllergies(updated);
  };

  const addCondition = () => {
    const trimmed = newCondition.trim();
    if (!trimmed) return;
    if (
      conditions.map((c) => c.toLowerCase()).includes(trimmed.toLowerCase())
    ) {
      Alert.alert("Duplicate", "This condition is already in your list.");
      return;
    }
    setConditions([...conditions, trimmed]);
    setNewCondition("");
  };

  const removeCondition = (index: number) => {
    const updated = [...conditions];
    updated.splice(index, 1);
    setConditions(updated);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={styles.loadingText}>Loading health details...</Text>
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
            <Text style={styles.headerTitle}>Health Details</Text>
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

          {/* ─── Vitals Card ─── */}
          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <IconSymbol name="heart.fill" size={16} color="#E53935" />
              <Text style={styles.formSectionTitle}>Vitals</Text>
            </View>

            {/* Blood Group */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Blood Group</Text>
              <View style={styles.chipRow}>
                {BLOOD_GROUPS.map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    style={[
                      styles.bloodChip,
                      bloodGroup === bg && styles.bloodChipActive,
                    ]}
                    onPress={() => setBloodGroup(bg)}
                  >
                    <Text
                      style={[
                        styles.bloodChipText,
                        bloodGroup === bg && styles.bloodChipTextActive,
                      ]}
                    >
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Weight & Height */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 50"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="e.g. 160"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* ─── Allergies Card ─── */}
          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={16}
                color="#F59E0B"
              />
              <Text style={styles.formSectionTitle}>Allergies</Text>
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCountText}>{allergies.length}</Text>
              </View>
            </View>

            {/* Existing allergies */}
            {allergies.length > 0 ? (
              <View style={styles.tagContainer}>
                {allergies.map((allergy, index) => (
                  <View key={`allergy-${index}`} style={styles.allergyTag}>
                    <Text style={styles.allergyTagText}>{allergy}</Text>
                    <TouchableOpacity
                      onPress={() => removeAllergy(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <IconSymbol
                        name="xmark.circle.fill"
                        size={16}
                        color="#C2410C"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyTagState}>
                <Text style={styles.emptyTagText}>No allergies recorded</Text>
              </View>
            )}

            {/* Add new allergy */}
            <View style={styles.addTagRow}>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                value={newAllergy}
                onChangeText={setNewAllergy}
                placeholder="Add an allergy..."
                placeholderTextColor="#D1D5DB"
                onSubmitEditing={addAllergy}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.addTagButton,
                  !newAllergy.trim() && styles.addTagButtonDisabled,
                ]}
                onPress={addAllergy}
                disabled={!newAllergy.trim()}
              >
                <IconSymbol name="plus" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Conditions Card ─── */}
          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <IconSymbol name="stethoscope" size={16} color="#3B82F6" />
              <Text style={styles.formSectionTitle}>Conditions</Text>
              <View style={[styles.sectionCountBadge, styles.conditionCountBg]}>
                <Text
                  style={[styles.sectionCountText, styles.conditionCountText]}
                >
                  {conditions.length}
                </Text>
              </View>
            </View>

            {/* Existing conditions */}
            {conditions.length > 0 ? (
              <View style={styles.tagContainer}>
                {conditions.map((condition, index) => (
                  <View key={`condition-${index}`} style={styles.conditionTag}>
                    <Text style={styles.conditionTagText}>{condition}</Text>
                    <TouchableOpacity
                      onPress={() => removeCondition(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <IconSymbol
                        name="xmark.circle.fill"
                        size={16}
                        color="#1D4ED8"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyTagState}>
                <Text style={styles.emptyTagText}>No conditions recorded</Text>
              </View>
            )}

            {/* Add new condition */}
            <View style={styles.addTagRow}>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                value={newCondition}
                onChangeText={setNewCondition}
                placeholder="Add a condition..."
                placeholderTextColor="#D1D5DB"
                onSubmitEditing={addCondition}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.addTagButton,
                  styles.addConditionButton,
                  !newCondition.trim() && styles.addTagButtonDisabled,
                ]}
                onPress={addCondition}
                disabled={!newCondition.trim()}
              >
                <IconSymbol name="plus" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Emergency Contact Card ─── */}
          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <IconSymbol name="staroflife.fill" size={16} color="#E53935" />
              <Text style={styles.formSectionTitle}>Emergency Contact</Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Contact Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                placeholder="Emergency contact name"
                placeholderTextColor="#D1D5DB"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Relation</Text>
              <TextInput
                style={styles.fieldInput}
                value={emergencyContactRelation}
                onChangeText={setEmergencyContactRelation}
                placeholder="e.g. Caretaker, Spouse, Parent"
                placeholderTextColor="#D1D5DB"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.fieldInput}
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor="#D1D5DB"
                keyboardType="phone-pad"
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
    backgroundColor: "#E53935",
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
    flex: 1,
  },
  sectionCountBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
  },
  conditionCountBg: {
    backgroundColor: "#DBEAFE",
  },
  conditionCountText: {
    color: "#2563EB",
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
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },

  // Blood Group Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bloodChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    minWidth: 52,
    alignItems: "center",
  },
  bloodChipActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#E53935",
  },
  bloodChipText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },
  bloodChipTextActive: {
    color: "#E53935",
  },

  // Tags (Allergies & Conditions)
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  allergyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  allergyTagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#C2410C",
  },
  conditionTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  conditionTagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  emptyTagState: {
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    marginBottom: 16,
  },
  emptyTagText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Add tag row
  addTagRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
  },
  addConditionButton: {
    backgroundColor: "#3B82F6",
  },
  addTagButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
});
