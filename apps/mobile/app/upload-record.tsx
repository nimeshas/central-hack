import React, { useState } from "react";
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
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDevWalletContext } from "@/lib/wallet";
import {
  getMedicalRecordContractWithSigner,
  safeContractCall,
  truncateAddress,
} from "@/lib/medicalRecord";

const backendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type PickedFile = {
  name: string;
  uri: string;
  mimeType: string;
  size: number;
};

type UploadStep = "pick" | "details" | "uploading" | "registering" | "done";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const RECORD_TYPES = [
  {
    id: "lab",
    label: "Lab Report",
    icon: "flask.fill",
    color: "#6366F1",
    bg: "#EEF2FF",
  },
  {
    id: "prescription",
    label: "Prescription",
    icon: "pill.fill",
    color: "#22C55E",
    bg: "#F0FDF4",
  },
  {
    id: "scan",
    label: "Scan / Imaging",
    icon: "camera.filters",
    color: "#0EA5E9",
    bg: "#F0F9FF",
  },
  {
    id: "discharge",
    label: "Discharge Summary",
    icon: "doc.text.fill",
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    id: "vaccination",
    label: "Vaccination",
    icon: "cross.case.fill",
    color: "#E53935",
    bg: "#FEF2F2",
  },
  {
    id: "other",
    label: "Other",
    icon: "folder.fill",
    color: "#6B7280",
    bg: "#F3F4F6",
  },
];

export default function UploadRecordScreen() {
  const router = useRouter();
  const { address, isConnected, signer } = useDevWalletContext();

  const [step, setStep] = useState<UploadStep>("pick");
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [recordName, setRecordName] = useState("");
  const [selectedType, setSelectedType] = useState("other");
  const [patientAddress, setPatientAddress] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [txHash, setTxHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "application/dicom", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset) return;

      setPickedFile({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? "application/octet-stream",
        size: asset.size ?? 0,
      });

      // Pre-fill record name from file name (without extension)
      const nameWithoutExt = asset.name.replace(/\.[^/.]+$/, "");
      setRecordName(nameWithoutExt);

      // Default patient address to own address
      if (address && !patientAddress) {
        setPatientAddress(address);
      }

      setStep("details");
    } catch {
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!pickedFile) {
      Alert.alert("Error", "No file selected.");
      return;
    }
    if (!recordName.trim()) {
      Alert.alert("Error", "Please enter a record name.");
      return;
    }
    if (!signer || !address) {
      Alert.alert(
        "Error",
        "Wallet not connected. Please connect your wallet first.",
      );
      return;
    }

    const targetPatient = patientAddress.trim() || address;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(targetPatient)) {
      Alert.alert("Error", "Invalid patient address format.");
      return;
    }

    setErrorMessage("");

    // Step 1: Upload to IPFS via backend
    setStep("uploading");
    try {
      const fileInfo = await FileSystem.getInfoAsync(pickedFile.uri);
      if (!fileInfo.exists) {
        throw new Error("File no longer exists at the selected path.");
      }

      // Read the file and create FormData
      const formData = new FormData();
      formData.append("file", {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType,
      } as any);

      const response = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as any)?.error ||
            `Upload failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      const hash = (data as any).ipfsHash;

      if (!hash) {
        throw new Error("No IPFS hash returned from server.");
      }

      setIpfsHash(hash);

      // Step 2: Register on-chain
      setStep("registering");

      const selectedTypeObj = RECORD_TYPES.find((t) => t.id === selectedType);
      const fullRecordName = selectedTypeObj
        ? `[${selectedTypeObj.label}] ${recordName.trim()}`
        : recordName.trim();

      const contract = getMedicalRecordContractWithSigner(signer);
      const tx = await safeContractCall(signer, () =>
        contract.addRecord(targetPatient, hash, fullRecordName),
      );
      await tx.wait();

      setTxHash(tx.hash ?? "");
      setStep("done");
    } catch (err: any) {
      const msg =
        err?.reason ||
        err?.message ||
        "Upload failed. Please check your connection and try again.";
      setErrorMessage(msg);
      // Go back to details so user can retry
      setStep("details");
      Alert.alert("Upload Failed", msg);
    }
  };

  const handleReset = () => {
    setStep("pick");
    setPickedFile(null);
    setRecordName("");
    setSelectedType("other");
    setIpfsHash("");
    setTxHash("");
    setErrorMessage("");
  };

  const handleBack = () => {
    if (step === "details") {
      setStep("pick");
      return;
    }
    router.back();
  };

  const getFileIcon = (): string => {
    if (!pickedFile) return "doc.fill";
    const mime = pickedFile.mimeType.toLowerCase();
    if (mime.includes("pdf")) return "doc.text.fill";
    if (mime.includes("image")) return "photo.fill";
    if (mime.includes("dicom")) return "waveform.path.ecg";
    return "doc.fill";
  };

  // Loading states
  if (step === "uploading" || step === "registering") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.uploadingContainer}>
          <View style={styles.uploadingIconWrap}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
          <Text style={styles.uploadingTitle}>
            {step === "uploading"
              ? "Uploading to IPFS..."
              : "Registering on Blockchain..."}
          </Text>
          <Text style={styles.uploadingSubtext}>
            {step === "uploading"
              ? "Your file is being securely uploaded to decentralized storage."
              : "Recording the file hash on-chain for immutable proof of ownership."}
          </Text>

          {step === "registering" && ipfsHash && (
            <View style={styles.hashBadge}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={14}
                color="#22C55E"
              />
              <Text style={styles.hashBadgeText}>
                IPFS: {ipfsHash.slice(0, 8)}...{ipfsHash.slice(-6)}
              </Text>
            </View>
          )}

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View
              style={[
                styles.stepLine,
                step === "registering" && styles.stepLineActive,
              ]}
            />
            <View
              style={[
                styles.stepDot,
                step === "registering" && styles.stepDotActive,
              ]}
            />
          </View>
          <View style={styles.stepLabels}>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>
              IPFS Upload
            </Text>
            <Text
              style={[
                styles.stepLabel,
                step === "registering" && styles.stepLabelActive,
              ]}
            >
              On-Chain
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (step === "done") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
        <View style={styles.doneContainer}>
          <View style={styles.doneIconWrap}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={64}
              color="#22C55E"
            />
          </View>
          <Text style={styles.doneTitle}>Record Uploaded!</Text>
          <Text style={styles.doneSubtext}>
            Your medical record has been securely stored on IPFS and registered
            on the blockchain.
          </Text>

          <View style={styles.doneDetailsCard}>
            <View style={styles.doneDetailRow}>
              <Text style={styles.doneDetailLabel}>File</Text>
              <Text style={styles.doneDetailValue} numberOfLines={1}>
                {pickedFile?.name}
              </Text>
            </View>
            <View style={styles.doneDetailRow}>
              <Text style={styles.doneDetailLabel}>Record Name</Text>
              <Text style={styles.doneDetailValue} numberOfLines={1}>
                {recordName}
              </Text>
            </View>
            <View style={styles.doneDetailRow}>
              <Text style={styles.doneDetailLabel}>IPFS Hash</Text>
              <Text style={styles.doneDetailValueMono} numberOfLines={1}>
                {ipfsHash.slice(0, 12)}...{ipfsHash.slice(-8)}
              </Text>
            </View>
            {txHash ? (
              <View style={[styles.doneDetailRow, styles.doneDetailRowLast]}>
                <Text style={styles.doneDetailLabel}>Transaction</Text>
                <Text style={styles.doneDetailValueMono} numberOfLines={1}>
                  {txHash.slice(0, 10)}...{txHash.slice(-6)}
                </Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={handleReset}>
            <IconSymbol name="plus.circle.fill" size={18} color="#FFFFFF" />
            <Text style={styles.doneButtonText}>Upload Another</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneSecondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.doneSecondaryButtonText}>Back to Records</Text>
          </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Upload Record</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Wallet Status */}
          {isConnected && address ? (
            <View style={styles.walletBanner}>
              <View style={styles.walletDot} />
              <Text style={styles.walletText}>
                Connected: {truncateAddress(address)}
              </Text>
            </View>
          ) : (
            <View style={styles.walletBannerDisconnected}>
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={14}
                color="#DC2626"
              />
              <Text style={styles.walletTextDisconnected}>
                Wallet not connected — connect to upload
              </Text>
            </View>
          )}

          {step === "pick" && (
            <>
              {/* Drop Zone */}
              <TouchableOpacity
                style={styles.dropZone}
                onPress={handlePickFile}
                activeOpacity={0.7}
              >
                <View style={styles.dropZoneIconWrap}>
                  <IconSymbol
                    name="arrow.up.doc.fill"
                    size={36}
                    color="#6366F1"
                  />
                </View>
                <Text style={styles.dropZoneTitle}>Select a File</Text>
                <Text style={styles.dropZoneSubtext}>
                  Tap to choose a medical document from your device
                </Text>
                <View style={styles.dropZoneFormats}>
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>PDF</Text>
                  </View>
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>JPG</Text>
                  </View>
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>PNG</Text>
                  </View>
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>DICOM</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <IconSymbol
                    name="lock.shield.fill"
                    size={16}
                    color="#6366F1"
                  />
                  <Text style={styles.infoCardTitle}>How It Works</Text>
                </View>
                <View style={styles.infoStep}>
                  <View style={styles.infoStepNumber}>
                    <Text style={styles.infoStepNumberText}>1</Text>
                  </View>
                  <View style={styles.infoStepContent}>
                    <Text style={styles.infoStepTitle}>Pick a file</Text>
                    <Text style={styles.infoStepText}>
                      Select a medical document from your device.
                    </Text>
                  </View>
                </View>
                <View style={styles.infoStep}>
                  <View style={styles.infoStepNumber}>
                    <Text style={styles.infoStepNumberText}>2</Text>
                  </View>
                  <View style={styles.infoStepContent}>
                    <Text style={styles.infoStepTitle}>Upload to IPFS</Text>
                    <Text style={styles.infoStepText}>
                      The file is encrypted and stored on decentralized storage.
                    </Text>
                  </View>
                </View>
                <View style={styles.infoStep}>
                  <View
                    style={[styles.infoStepNumber, styles.infoStepNumberLast]}
                  >
                    <Text style={styles.infoStepNumberText}>3</Text>
                  </View>
                  <View style={styles.infoStepContent}>
                    <Text style={styles.infoStepTitle}>Register on-chain</Text>
                    <Text style={styles.infoStepText}>
                      The IPFS hash is recorded on the blockchain as immutable
                      proof.
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {step === "details" && pickedFile && (
            <>
              {/* Selected File Preview */}
              <View style={styles.filePreviewCard}>
                <View style={styles.filePreviewTop}>
                  <View style={styles.filePreviewIconWrap}>
                    <IconSymbol
                      name={getFileIcon() as any}
                      size={22}
                      color="#6366F1"
                    />
                  </View>
                  <View style={styles.filePreviewInfo}>
                    <Text style={styles.filePreviewName} numberOfLines={1}>
                      {pickedFile.name}
                    </Text>
                    <Text style={styles.filePreviewMeta}>
                      {formatFileSize(pickedFile.size)} •{" "}
                      {pickedFile.mimeType.split("/").pop()?.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.fileChangeButton}
                    onPress={handlePickFile}
                  >
                    <IconSymbol
                      name="arrow.triangle.2.circlepath"
                      size={14}
                      color="#6366F1"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Record Details Form */}
              <View style={styles.formCard}>
                <View style={styles.formSectionHeader}>
                  <IconSymbol name="doc.text.fill" size={16} color="#6366F1" />
                  <Text style={styles.formSectionTitle}>Record Details</Text>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Record Name</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={recordName}
                    onChangeText={setRecordName}
                    placeholder="e.g. Blood Test Results - Jan 2025"
                    placeholderTextColor="#D1D5DB"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Record Type</Text>
                  <View style={styles.typeGrid}>
                    {RECORD_TYPES.map((type) => {
                      const isSelected = selectedType === type.id;
                      return (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: isSelected ? type.bg : "#F9FAFB",
                              borderColor: isSelected ? type.color : "#E5E7EB",
                            },
                          ]}
                          onPress={() => setSelectedType(type.id)}
                        >
                          <IconSymbol
                            name={type.icon as any}
                            size={14}
                            color={isSelected ? type.color : "#9CA3AF"}
                          />
                          <Text
                            style={[
                              styles.typeChipText,
                              { color: isSelected ? type.color : "#6B7280" },
                            ]}
                          >
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Patient Address</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.fieldInputMono]}
                    value={patientAddress}
                    onChangeText={setPatientAddress}
                    placeholder={address || "0x..."}
                    placeholderTextColor="#D1D5DB"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.fieldHint}>
                    Leave empty to use your own wallet address
                  </Text>
                </View>
              </View>

              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <IconSymbol
                    name="exclamationmark.triangle.fill"
                    size={16}
                    color="#DC2626"
                  />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Upload Button */}
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  (!isConnected || !recordName.trim()) &&
                    styles.uploadButtonDisabled,
                ]}
                onPress={handleUpload}
                disabled={!isConnected || !recordName.trim()}
              >
                <IconSymbol
                  name="arrow.up.circle.fill"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.uploadButtonText}>
                  Upload & Register On-Chain
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setStep("pick")}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

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

  // Wallet Banner
  walletBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  walletText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  walletBannerDisconnected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  walletTextDisconnected: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },

  // Drop Zone
  dropZone: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#C7D2FE",
    borderStyle: "dashed",
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  dropZoneIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  dropZoneTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  dropZoneSubtext: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  dropZoneFormats: {
    flexDirection: "row",
    gap: 8,
  },
  formatBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  formatBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.5,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  infoStep: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  infoStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#C7D2FE",
  },
  infoStepNumberLast: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  infoStepNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6366F1",
  },
  infoStepContent: {
    flex: 1,
    gap: 2,
  },
  infoStepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  infoStepText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7280",
    lineHeight: 18,
  },

  // File Preview Card
  filePreviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  filePreviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filePreviewIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  filePreviewInfo: {
    flex: 1,
    gap: 3,
  },
  filePreviewName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  filePreviewMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  fileChangeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
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
  fieldInputMono: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 13,
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
    marginTop: 6,
    paddingLeft: 2,
  },

  // Type Grid
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#DC2626",
    flex: 1,
    lineHeight: 18,
  },

  // Upload Button
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  uploadButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  // Uploading State
  uploadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  uploadingIconWrap: {
    marginBottom: 8,
  },
  uploadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  uploadingSubtext: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  hashBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 16,
  },
  hashBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginTop: 8,
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#D1D5DB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  stepDotActive: {
    backgroundColor: "#6366F1",
    borderColor: "#818CF8",
  },
  stepLine: {
    width: 80,
    height: 3,
    backgroundColor: "#E5E7EB",
  },
  stepLineActive: {
    backgroundColor: "#6366F1",
  },
  stepLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 80 + 14 + 14,
    paddingHorizontal: 0,
    marginTop: 6,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#D1D5DB",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  stepLabelActive: {
    color: "#6366F1",
  },

  // Done State
  doneContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  doneIconWrap: {
    marginBottom: 12,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  doneSubtext: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  doneDetailsCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    marginBottom: 24,
  },
  doneDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  doneDetailRowLast: {
    borderBottomWidth: 0,
  },
  doneDetailLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  doneDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    maxWidth: "55%",
  },
  doneDetailValueMono: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    maxWidth: "55%",
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  doneSecondaryButton: {
    paddingVertical: 12,
  },
  doneSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
});
