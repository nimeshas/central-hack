import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "central-hack:user_profile";

export type UserProfile = {
  // Personal Details
  fullName: string;
  dateOfBirth: string;
  gender: string;
  age: string;
  phone: string;
  email: string;
  address: string;
  passportId: string;

  // Health Details
  bloodGroup: string;
  weight: string;
  height: string;
  allergies: string[];
  conditions: string[];

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;

  // Insurance
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiryDate: string;
  insuranceStatus: "active" | "expired" | "none";

  // Immunization
  immunizations: ImmunizationRecord[];

  // Recovery Key
  recoveryKeyGenerated: boolean;
  recoveryKeyGeneratedAt: string;
};

export type ImmunizationRecord = {
  id: string;
  name: string;
  date: string;
  provider: string;
  status: "completed" | "scheduled" | "overdue";
};

export const DEFAULT_PROFILE: UserProfile = {
  fullName: "Nimesha S",
  dateOfBirth: "10.06.2006",
  gender: "Female",
  age: "20",
  phone: "+91 98765 43210",
  email: "nimesha@example.com",
  address: "Bangalore, India",
  passportId: "HP-9823-X",

  bloodGroup: "O+",
  weight: "50",
  height: "160",
  allergies: ["Dairy", "Peanuts"],
  conditions: ["Type-1 Diabetes", "Asthma"],

  emergencyContactName: "Abhyuday Rai",
  emergencyContactRelation: "Caretaker",
  emergencyContactPhone: "+91 98765 43210",

  insuranceProvider: "Star Health Insurance",
  insurancePolicyNumber: "SHI-2024-78901",
  insuranceExpiryDate: "15.03.2027",
  insuranceStatus: "active",

  immunizations: [
    {
      id: "1",
      name: "COVID-19 (Booster)",
      date: "15.01.2024",
      provider: "City Hospital",
      status: "completed",
    },
    {
      id: "2",
      name: "Influenza",
      date: "10.10.2024",
      provider: "City Hospital",
      status: "completed",
    },
    {
      id: "3",
      name: "Hepatitis B",
      date: "20.06.2025",
      provider: "General Clinic",
      status: "scheduled",
    },
    {
      id: "4",
      name: "Tetanus (Td)",
      date: "01.01.2024",
      provider: "City Hospital",
      status: "overdue",
    },
  ],

  recoveryKeyGenerated: true,
  recoveryKeyGeneratedAt: "2024-12-01T10:30:00Z",
};

export async function loadProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as Partial<UserProfile>;
      // Merge with defaults so new fields are always present
      return { ...DEFAULT_PROFILE, ...parsed };
    }
    return { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save profile:", error);
  }
}

export async function updateProfile(
  updates: Partial<UserProfile>,
): Promise<UserProfile> {
  const current = await loadProfile();
  const updated = { ...current, ...updates };
  await saveProfile(updated);
  return updated;
}

export async function addImmunization(
  record: ImmunizationRecord,
): Promise<UserProfile> {
  const current = await loadProfile();
  current.immunizations.push(record);
  await saveProfile(current);
  return current;
}

export async function removeImmunization(id: string): Promise<UserProfile> {
  const current = await loadProfile();
  current.immunizations = current.immunizations.filter((r) => r.id !== id);
  await saveProfile(current);
  return current;
}

export async function addAllergy(allergy: string): Promise<UserProfile> {
  const current = await loadProfile();
  if (!current.allergies.includes(allergy)) {
    current.allergies.push(allergy);
    await saveProfile(current);
  }
  return current;
}

export async function removeAllergy(allergy: string): Promise<UserProfile> {
  const current = await loadProfile();
  current.allergies = current.allergies.filter((a) => a !== allergy);
  await saveProfile(current);
  return current;
}

export async function addCondition(condition: string): Promise<UserProfile> {
  const current = await loadProfile();
  if (!current.conditions.includes(condition)) {
    current.conditions.push(condition);
    await saveProfile(current);
  }
  return current;
}

export async function removeCondition(condition: string): Promise<UserProfile> {
  const current = await loadProfile();
  current.conditions = current.conditions.filter((c) => c !== condition);
  await saveProfile(current);
  return current;
}
