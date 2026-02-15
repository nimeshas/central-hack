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
  Linking,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_DATA: FAQItem[] = [
  {
    id: "1",
    question: "How are my medical records stored?",
    answer:
      "Your medical records are encrypted and stored on IPFS (InterPlanetary File System), a decentralised storage network. The record metadata and access permissions are managed through a smart contract on the Ethereum blockchain, ensuring immutability and transparency.",
  },
  {
    id: "2",
    question: "Who can access my health data?",
    answer:
      "Only addresses you explicitly approve can access your health data. Access is time-limited and managed through blockchain smart contracts. You can approve, deny, or revoke access at any time from the Access or Data Sharing screens.",
  },
  {
    id: "3",
    question: "What happens if I lose my device?",
    answer:
      "Your on-chain records remain safe on the blockchain regardless of your device. Use your Recovery Key to regain access from a new device. Make sure to generate and securely store your Recovery Key from the Profile > Recovery Key Status screen.",
  },
  {
    id: "4",
    question: "How do doctors request access to my records?",
    answer:
      "Doctors or healthcare providers use the MedVault web portal to request access to your records by entering your wallet address and specifying a duration. You'll see the request appear in your Access tab where you can approve or deny it.",
  },
  {
    id: "5",
    question: "Can I delete my medical records?",
    answer:
      "Records stored on the blockchain are immutable and cannot be deleted. However, you can revoke access permissions at any time, preventing others from viewing your records. This is by design to maintain a trustworthy medical history.",
  },
  {
    id: "6",
    question: "Is my personal profile data stored on the blockchain?",
    answer:
      "No. Your personal profile information (name, contact details, allergies, etc.) is stored locally on your device only. It is never uploaded to the blockchain or any server, giving you full control over your personal data.",
  },
  {
    id: "7",
    question: "What is a Health Passport ID?",
    answer:
      "Your Health Passport ID is a unique identifier assigned to your medical profile within MedVault. It helps healthcare providers quickly locate and reference your records without needing to share your full wallet address.",
  },
  {
    id: "8",
    question: "How does time-limited access work?",
    answer:
      "When a provider requests access, they specify a duration (e.g., 24 hours). Once you approve, a smart contract records the grant with an expiry timestamp. After expiry, the provider can no longer view your records unless they request access again.",
  },
];

type ContactOption = {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  action: () => void;
};

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<
    "bug" | "feature" | "general"
  >("general");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleSendFeedback = () => {
    const trimmed = feedbackText.trim();
    if (!trimmed) {
      Alert.alert("Empty Feedback", "Please write something before submitting.");
      return;
    }
    // In a real app this would send to a backend
    Alert.alert(
      "Thank You!",
      "Your feedback has been submitted. We appreciate you helping us improve MedVault.",
      [
        {
          text: "OK",
          onPress: () => {
            setFeedbackText("");
            setFeedbackSent(true);
            setTimeout(() => setFeedbackSent(false), 3000);
          },
        },
      ],
    );
  };

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@medvault.health?subject=MedVault%20Support%20Request");
  };

  const handleOpenDocs = () => {
    Linking.openURL("https://docs.medvault.health");
  };

  const contactOptions: ContactOption[] = [
    {
      id: "email",
      label: "Email Support",
      sublabel: "support@medvault.health",
      icon: "envelope.fill",
      iconColor: "#3B82F6",
      iconBg: "#DBEAFE",
      action: handleEmailSupport,
    },
    {
      id: "docs",
      label: "Documentation",
      sublabel: "Browse guides and tutorials",
      icon: "book.fill",
      iconColor: "#8B5CF6",
      iconBg: "#F5F3FF",
      action: handleOpenDocs,
    },
    {
      id: "community",
      label: "Community Forum",
      sublabel: "Join the discussion",
      icon: "person.3.fill",
      iconColor: "#22C55E",
      iconBg: "#F0FDF4",
      action: () =>
        Linking.openURL("https://community.medvault.health"),
    },
    {
      id: "twitter",
      label: "Follow Us",
      sublabel: "@MedVaultHealth",
      icon: "bubble.left.fill",
      iconColor: "#0EA5E9",
      iconBg: "#F0F9FF",
      action: () => Linking.openURL("https://twitter.com/MedVaultHealth"),
    },
  ];

  const FEEDBACK_CATEGORIES: {
    id: "bug" | "feature" | "general";
    label: string;
    icon: string;
    color: string;
    bg: string;
  }[] = [
    {
      id: "bug",
      label: "Bug Report",
      icon: "ant.fill",
      color: "#DC2626",
      bg: "#FEE2E2",
    },
    {
      id: "feature",
      label: "Feature Request",
      icon: "lightbulb.fill",
      color: "#F59E0B",
      bg: "#FEF3C7",
    },
    {
      id: "general",
      label: "General",
      icon: "bubble.left.fill",
      color: "#3B82F6",
      bg: "#DBEAFE",
    },
  ];

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
            <Text style={styles.headerTitle}>Help & Support</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Welcome Banner */}
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeIconWrap}>
              <IconSymbol
                name="questionmark.circle.fill"
                size={32}
                color="#0891B2"
              />
            </View>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>How can we help?</Text>
              <Text style={styles.welcomeSubtext}>
                Find answers to common questions, contact support, or share your
                feedback to help us improve.
              </Text>
            </View>
          </View>

          {/* ─── Quick Links ─── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Contact & Resources</Text>
            </View>

            <View style={styles.contactGrid}>
              {contactOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.contactCard}
                  onPress={option.action}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.contactIconWrap,
                      { backgroundColor: option.iconBg },
                    ]}
                  >
                    <IconSymbol
                      name={option.icon as any}
                      size={20}
                      color={option.iconColor}
                    />
                  </View>
                  <Text style={styles.contactLabel}>{option.label}</Text>
                  <Text style={styles.contactSublabel}>{option.sublabel}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── FAQ Section ─── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{FAQ_DATA.length}</Text>
              </View>
            </View>

            <View style={styles.faqList}>
              {FAQ_DATA.map((faq) => {
                const isExpanded = expandedFAQ === faq.id;
                return (
                  <TouchableOpacity
                    key={faq.id}
                    style={[
                      styles.faqItem,
                      isExpanded && styles.faqItemExpanded,
                    ]}
                    onPress={() => toggleFAQ(faq.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqHeader}>
                      <View style={styles.faqQuestionRow}>
                        <View
                          style={[
                            styles.faqNumberBadge,
                            isExpanded && styles.faqNumberBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.faqNumberText,
                              isExpanded && styles.faqNumberTextActive,
                            ]}
                          >
                            {faq.id}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.faqQuestion,
                            isExpanded && styles.faqQuestionExpanded,
                          ]}
                        >
                          {faq.question}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.faqChevron,
                          isExpanded && styles.faqChevronExpanded,
                        ]}
                      >
                        <IconSymbol
                          name="chevron.down"
                          size={14}
                          color={isExpanded ? "#0891B2" : "#9CA3AF"}
                        />
                      </View>
                    </View>
                    {isExpanded && (
                      <View style={styles.faqAnswerContainer}>
                        <View style={styles.faqDivider} />
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── Feedback Section ─── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Send Feedback</Text>
            </View>

            <View style={styles.feedbackCard}>
              {feedbackSent ? (
                <View style={styles.feedbackSentContainer}>
                  <View style={styles.feedbackSentIcon}>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={48}
                      color="#22C55E"
                    />
                  </View>
                  <Text style={styles.feedbackSentTitle}>
                    Feedback Submitted!
                  </Text>
                  <Text style={styles.feedbackSentSubtext}>
                    Thank you for helping us improve MedVault.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Category Selection */}
                  <View style={styles.feedbackCategoryRow}>
                    {FEEDBACK_CATEGORIES.map((cat) => {
                      const isSelected = feedbackCategory === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.feedbackCategoryChip,
                            {
                              backgroundColor: isSelected ? cat.bg : "#F3F4F6",
                              borderColor: isSelected ? cat.color : "#E5E7EB",
                            },
                          ]}
                          onPress={() => setFeedbackCategory(cat.id)}
                        >
                          <IconSymbol
                            name={cat.icon as any}
                            size={14}
                            color={isSelected ? cat.color : "#9CA3AF"}
                          />
                          <Text
                            style={[
                              styles.feedbackCategoryText,
                              { color: isSelected ? cat.color : "#6B7280" },
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Feedback Input */}
                  <View style={styles.feedbackInputContainer}>
                    <TextInput
                      style={styles.feedbackInput}
                      value={feedbackText}
                      onChangeText={setFeedbackText}
                      placeholder={
                        feedbackCategory === "bug"
                          ? "Describe the issue you encountered..."
                          : feedbackCategory === "feature"
                            ? "What feature would you like to see?"
                            : "Share your thoughts with us..."
                      }
                      placeholderTextColor="#D1D5DB"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                    <Text style={styles.charCount}>
                      {feedbackText.length}/500
                    </Text>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      !feedbackText.trim() && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSendFeedback}
                    disabled={!feedbackText.trim()}
                  >
                    <IconSymbol
                      name="paperplane.fill"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* ─── App Info Card ─── */}
          <View style={styles.appInfoCard}>
            <View style={styles.appInfoHeader}>
              <View style={styles.appInfoLogo}>
                <IconSymbol name="heart.fill" size={20} color="#E53935" />
              </View>
              <View style={styles.appInfoContent}>
                <Text style={styles.appInfoTitle}>MedVault</Text>
                <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
              </View>
            </View>
            <View style={styles.appInfoDivider} />
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Platform</Text>
              <Text style={styles.appInfoValue}>
                {Platform.OS === "ios" ? "iOS" : "Android"}
              </Text>
            </View>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Network</Text>
              <View style={styles.networkBadge}>
                <View style={styles.networkDot} />
                <Text style={styles.networkText}>Connected</Text>
              </View>
            </View>
            <View style={[styles.appInfoRow, styles.appInfoRowLast]}>
              <Text style={styles.appInfoLabel}>Storage</Text>
              <Text style={styles.appInfoValue}>
                IPFS + Ethereum Blockchain
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://medvault.health/privacy")
              }
            >
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://medvault.health/terms")
              }
            >
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://medvault.health/licenses")
              }
            >
              <Text style={styles.footerLink}>Licenses</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerCopyright}>
            © 2025 MedVault. All rights reserved.
          </Text>

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

  // Welcome Banner
  welcomeBanner: {
    flexDirection: "row",
    backgroundColor: "#ECFEFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#A5F3FC",
    gap: 14,
    alignItems: "flex-start",
  },
  welcomeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeContent: {
    flex: 1,
    gap: 4,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0E7490",
  },
  welcomeSubtext: {
    fontSize: 13,
    fontWeight: "400",
    color: "#0E7490",
    lineHeight: 19,
  },

  // Section
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  sectionBadge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  // Contact Grid
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  contactCard: {
    width: "48%" as any,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  contactSublabel: {
    fontSize: 11,
    fontWeight: "400",
    color: "#9CA3AF",
    lineHeight: 15,
  },

  // FAQ List
  faqList: {
    gap: 8,
  },
  faqItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  faqItemExpanded: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  faqNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  faqNumberBadgeActive: {
    backgroundColor: "#0891B2",
  },
  faqNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CA3AF",
  },
  faqNumberTextActive: {
    color: "#FFFFFF",
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    lineHeight: 20,
  },
  faqQuestionExpanded: {
    color: "#0E7490",
  },
  faqChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  faqChevronExpanded: {
    backgroundColor: "#CCFBF1",
    transform: [{ rotate: "180deg" }],
  },
  faqAnswerContainer: {
    marginTop: 12,
  },
  faqDivider: {
    height: 1,
    backgroundColor: "#99F6E4",
    marginBottom: 12,
  },
  faqAnswer: {
    fontSize: 13,
    fontWeight: "400",
    color: "#374151",
    lineHeight: 20,
    paddingLeft: 34,
  },

  // Feedback Card
  feedbackCard: {
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
  feedbackSentContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    gap: 10,
  },
  feedbackSentIcon: {
    marginBottom: 4,
  },
  feedbackSentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  feedbackSentSubtext: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
    textAlign: "center",
  },
  feedbackCategoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  feedbackCategoryChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  feedbackCategoryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  feedbackInputContainer: {
    marginBottom: 16,
  },
  feedbackInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    fontWeight: "400",
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 120,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    fontWeight: "500",
    color: "#D1D5DB",
    textAlign: "right",
    marginTop: 6,
    paddingRight: 4,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0891B2",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // App Info Card
  appInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  appInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  appInfoLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  appInfoContent: {
    flex: 1,
    gap: 2,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  appInfoVersion: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  appInfoDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 4,
  },
  appInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  appInfoRowLast: {
    borderBottomWidth: 0,
  },
  appInfoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  appInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  networkText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0891B2",
  },
  footerDot: {
    fontSize: 13,
    color: "#D1D5DB",
  },
  footerCopyright: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "400",
    color: "#D1D5DB",
    marginBottom: 8,
  },
});
