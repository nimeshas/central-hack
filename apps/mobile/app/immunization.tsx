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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  loadProfile,
  saveProfile,
  type UserProfile,
  type ImmunizationRecord,
} from "@/lib/profile-storage";

const STATUS_OPTIONS: {
  label: string;
  value: ImmunizationRecord["status"];
  color: string;
  bg: string;
  dot: string;
}[] = [
  {
    label: "Completed",
    value: "completed",
    color: "#15803D",
    bg: "#DCFCE7",
    dot: "#22C55E",
  },
  {
    label: "Scheduled",
    value: "scheduled",
    color: "#2563EB",
    bg: "#DBEAFE",
    dot: "#3B82F6",
  },
  {
    label: "Overdue",
    value: "overdue",
    color: "#DC2626",
    bg: "#FEE2E2",
    dot: "#EF4444",
  },
];

function getStatusStyle(status: ImmunizationRecord["status"]) {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found ?? STATUS_OPTIONS[0]!;
}

export default function ImmunizationScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [immunizations, setImmunizations] = useState<ImmunizationRecord[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formProvider, setFormProvider] = useState("");
  const [formStatus, setFormStatus] =
    useState<ImmunizationRecord["status"]>("scheduled");

  useEffect(() => {
    (async () => {
      try {
        const data = await loadProfile();
        setProfile(data);
        setImmunizations([...data.immunizations]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistImmunizations = async (records: ImmunizationRecord[]) => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated: UserProfile = {
        ...profile,
        immunizations: records,
      };
      await saveProfile(updated);
      setProfile(updated);
      setImmunizations(records);
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormDate("");
    setFormProvider("");
    setFormStatus("scheduled");
    setModalVisible(true);
  };

  const openEditModal = (record: ImmunizationRecord) => {
    setEditingId(record.id);
    setFormName(record.name);
    setFormDate(record.date);
    setFormProvider(record.provider);
    setFormStatus(record.status);
    setModalVisible(true);
  };

  const handleSaveRecord = async () => {
    const trimmedName = formName.trim();
    const trimmedDate = formDate.trim();
    const trimmedProvider = formProvider.trim();

    if (!trimmedName) {
      Alert.alert("Validation", "Vaccine name is required.");
      return;
    }
    if (!trimmedDate) {
      Alert.alert("Validation", "Date is required.");
      return;
    }

    let updated: ImmunizationRecord[];

    if (editingId) {
      updated = immunizations.map((r) =>
        r.id === editingId
          ? {
              ...r,
              name: trimmedName,
              date: trimmedDate,
              provider: trimmedProvider,
              status: formStatus,
            }
          : r,
      );
    } else {
      const newRecord: ImmunizationRecord = {
        id: Date.now().toString(),
        name: trimmedName,
        date: trimmedDate,
        provider: trimmedProvider || "Unknown",
        status: formStatus,
      };
      updated = [...immunizations, newRecord];
    }

    await persistImmunizations(updated);
    setModalVisible(false);
  };

  const handleDeleteRecord = (id: string) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to remove this immunization record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = immunizations.filter((r) => r.id !== id);
            await persistImmunizations(updated);
          },
        },
      ],
    );
  };

  // Separate by status
  const completedRecords = immunizations.filter(
    (r) => r.status === "completed",
  );
  const scheduledRecords = immunizations.filter(
    (r) => r.status === "scheduled",
  );
  const overdueRecords = immunizations.filter((r) => r.status === "overdue");

  const totalCompleted = completedRecords.length;
  const totalScheduled = scheduledRecords.length;
  const totalOverdue = overdueRecords.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading immunization records...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Immunization Record</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <IconSymbol name="plus" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.statValue}>{totalCompleted}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#3B82F6" }]} />
            <Text style={styles.statValue}>{totalScheduled}</Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.statValue}>{totalOverdue}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View>

        {/* Overdue Alert */}
        {totalOverdue > 0 && (
          <View style={styles.alertBanner}>
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={18}
              color="#DC2626"
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {totalOverdue} Overdue{" "}
                {totalOverdue === 1 ? "Vaccine" : "Vaccines"}
              </Text>
              <Text style={styles.alertSubtext}>
                Please consult your healthcare provider to schedule these
                immunizations.
              </Text>
            </View>
          </View>
        )}

        {/* ─── Overdue Records ─── */}
        {overdueRecords.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overdue</Text>
              <View
                style={[styles.sectionBadge, { backgroundColor: "#FEE2E2" }]}
              >
                <Text style={[styles.sectionBadgeText, { color: "#DC2626" }]}>
                  {overdueRecords.length}
                </Text>
              </View>
            </View>
            {overdueRecords.map((record) => (
              <ImmunizationCard
                key={record.id}
                record={record}
                onEdit={() => openEditModal(record)}
                onDelete={() => handleDeleteRecord(record.id)}
              />
            ))}
          </View>
        )}

        {/* ─── Scheduled Records ─── */}
        {scheduledRecords.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              <View
                style={[styles.sectionBadge, { backgroundColor: "#DBEAFE" }]}
              >
                <Text style={[styles.sectionBadgeText, { color: "#2563EB" }]}>
                  {scheduledRecords.length}
                </Text>
              </View>
            </View>
            {scheduledRecords.map((record) => (
              <ImmunizationCard
                key={record.id}
                record={record}
                onEdit={() => openEditModal(record)}
                onDelete={() => handleDeleteRecord(record.id)}
              />
            ))}
          </View>
        )}

        {/* ─── Completed Records ─── */}
        {completedRecords.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Completed</Text>
              <View
                style={[styles.sectionBadge, { backgroundColor: "#DCFCE7" }]}
              >
                <Text style={[styles.sectionBadgeText, { color: "#15803D" }]}>
                  {completedRecords.length}
                </Text>
              </View>
            </View>
            {completedRecords.map((record) => (
              <ImmunizationCard
                key={record.id}
                record={record}
                onEdit={() => openEditModal(record)}
                onDelete={() => handleDeleteRecord(record.id)}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {immunizations.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <IconSymbol
                name="cross.case.fill"
                size={40}
                color="#D1D5DB"
              />
            </View>
            <Text style={styles.emptyTitle}>No Immunization Records</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first immunization record. Keep track
              of all your vaccines in one place.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={openAddModal}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>Add Record</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <IconSymbol name="info.circle.fill" size={16} color="#0891B2" />
            <Text style={styles.infoCardTitle}>About Immunizations</Text>
          </View>
          <Text style={styles.infoCardText}>
            Keeping your immunization records up to date helps healthcare
            providers make informed decisions. Records are stored locally on your
            device and can be shared securely via the blockchain when needed.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Add / Edit Modal ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            {/* Drag Handle */}
            <View style={styles.modalDragRow}>
              <View style={styles.modalDragHandle} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingId ? "Edit Record" : "Add Immunization"}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <IconSymbol name="xmark" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.modalFieldContainer}>
                <Text style={styles.modalFieldLabel}>Vaccine Name *</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. COVID-19 (Booster)"
                  placeholderTextColor="#D1D5DB"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.modalFieldContainer}>
                <Text style={styles.modalFieldLabel}>Date *</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  value={formDate}
                  onChangeText={setFormDate}
                  placeholder="DD.MM.YYYY"
                  placeholderTextColor="#D1D5DB"
                />
              </View>

              <View style={styles.modalFieldContainer}>
                <Text style={styles.modalFieldLabel}>Healthcare Provider</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  value={formProvider}
                  onChangeText={setFormProvider}
                  placeholder="e.g. City Hospital"
                  placeholderTextColor="#D1D5DB"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.modalFieldContainer}>
                <Text style={styles.modalFieldLabel}>Status</Text>
                <View style={styles.statusChipRow}>
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = formStatus === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor: isSelected ? opt.bg : "#F3F4F6",
                            borderColor: isSelected ? opt.dot : "#E5E7EB",
                          },
                        ]}
                        onPress={() => setFormStatus(opt.value)}
                      >
                        <View
                          style={[
                            styles.chipDot,
                            {
                              backgroundColor: isSelected
                                ? opt.dot
                                : "#D1D5DB",
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusChipText,
                            {
                              color: isSelected ? opt.color : "#6B7280",
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

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveRecord}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>
                    {editingId ? "Update Record" : "Add Record"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Immunization Card Component                                          */
/* ────────────────────────────────────────────────────────────────────── */
function ImmunizationCard({
  record,
  onEdit,
  onDelete,
}: {
  record: ImmunizationRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusStyle = getStatusStyle(record.status);
  const iconName =
    record.status === "completed"
      ? "checkmark.circle.fill"
      : record.status === "overdue"
        ? "exclamationmark.circle.fill"
        : "clock.fill";

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordCardTop}>
        <View style={styles.recordCardLeft}>
          <View
            style={[
              styles.recordIconWrap,
              { backgroundColor: statusStyle.bg },
            ]}
          >
            <IconSymbol name={iconName} size={18} color={statusStyle.dot} />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordName}>{record.name}</Text>
            <Text style={styles.recordProvider}>{record.provider}</Text>
          </View>
        </View>
        <View style={styles.recordCardRight}>
          <View
            style={[styles.recordStatusBadge, { backgroundColor: statusStyle.bg }]}
          >
            <View
              style={[
                styles.recordStatusDot,
                { backgroundColor: statusStyle.dot },
              ]}
            />
            <Text
              style={[styles.recordStatusText, { color: statusStyle.color }]}
            >
              {statusStyle.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.recordCardBottom}>
        <View style={styles.recordDateRow}>
          <IconSymbol name="calendar" size={12} color="#9CA3AF" />
          <Text style={styles.recordDate}>{record.date}</Text>
        </View>
        <View style={styles.recordActions}>
          <TouchableOpacity
            style={styles.recordEditButton}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="pencil" size={12} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.recordDeleteButton}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="trash.fill" size={12} color="#E53935" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  STYLES                                                               */
/* ────────────────────────────────────────────────────────────────────── */
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  // Stats Banner
  statsBanner: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E5E7EB",
  },

  // Alert Banner
  alertBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  alertContent: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  alertSubtext: {
    fontSize: 12,
    fontWeight: "400",
    color: "#B91C1C",
    lineHeight: 17,
  },

  // Section
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Record Card
  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  recordCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  recordCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  recordIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  recordInfo: {
    flex: 1,
    gap: 2,
  },
  recordName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  recordProvider: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  recordCardRight: {
    alignItems: "flex-end",
  },
  recordStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recordStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recordStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  recordCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  recordDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  recordDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  recordActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordEditButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  recordDeleteButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Info Card
  infoCard: {
    backgroundColor: "#ECFEFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#A5F3FC",
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
    color: "#0E7490",
  },
  infoCardText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#0E7490",
    lineHeight: 19,
  },

  // ─── Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalDragRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal form fields
  modalFieldContainer: {
    marginBottom: 18,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalFieldInput: {
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

  // Status chips in modal
  statusChipRow: {
    flexDirection: "row",
    gap: 8,
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
    fontSize: 12,
    fontWeight: "700",
  },

  // Modal actions
  modalSaveButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});
