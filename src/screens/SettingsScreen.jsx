import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../utils/supabase";
import useAppStore from "../store/useAppStore";
import { COLORS } from "../utils/constants";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";

const RELATIONS = [
  "Wife",
  "Husband",
  "Brother",
  "Sister",
  "Mother",
  "Father",
  "Friend",
  "Manager",
];

export default function SettingsScreen() {
  const nav = useNavigation();
  const { user, logout } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [employerId, setEmployerId] = useState("sentinel001-work");
  const [employerName, setEmployerName] = useState("");
  const [empLoading, setEmpLoading] = useState(false);
  const [empSaved, setEmpSaved] = useState(false);
  const [empError, setEmpError] = useState("");

  const [contacts, setContacts] = useState([
    { name: "", phone: "", relation: "" },
    { name: "", phone: "", relation: "" },
    { name: "", phone: "", relation: "" },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("workers")
        .select(
          "trusted_contact_1_name, trusted_contact_1_phone, trusted_contact_1_relation, trusted_contact_2_name, trusted_contact_2_phone, trusted_contact_2_relation, trusted_contact_3_name, trusted_contact_3_phone, trusted_contact_3_relation, employer_id, employer_name",
        )
        .eq("id", user.id)
        .single();

      if (data) {
        setContacts([
          {
            name: data.trusted_contact_1_name || "",
            phone: data.trusted_contact_1_phone || "",
            relation: data.trusted_contact_1_relation || "",
          },
          {
            name: data.trusted_contact_2_name || "",
            phone: data.trusted_contact_2_phone || "",
            relation: data.trusted_contact_2_relation || "",
          },
          {
            name: data.trusted_contact_3_name || "",
            phone: data.trusted_contact_3_phone || "",
            relation: data.trusted_contact_3_relation || "",
          },
        ]);
        if (data.employer_id) setEmployerId(data.employer_id);
        if (data.employer_name) setEmployerName(data.employer_name);
      }
    } catch (e) {
      console.log("Load error:", e.message);
    }
  };

  const updateContact = (index, field, value) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const saveContacts = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from("workers")
        .update({
          trusted_contact_1_name: contacts[0].name,
          trusted_contact_1_phone: contacts[0].phone,
          trusted_contact_1_relation: contacts[0].relation,
          trusted_contact_2_name: contacts[1].name,
          trusted_contact_2_phone: contacts[1].phone,
          trusted_contact_2_relation: contacts[1].relation,
          trusted_contact_3_name: contacts[2].name,
          trusted_contact_3_phone: contacts[2].phone,
          trusted_contact_3_relation: contacts[2].relation,
        })
        .eq("id", user.id);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Alert.alert("Error", "Contacts save nahi hue: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveEmployerId = async () => {
    setEmpError("");
    setEmpLoading(true);
    setEmpSaved(false);
    try {
      // Verify employer code exists
      const { data: cluster, error: clErr } = await supabase
        .from("employer_clusters")
        .select("name")
        .eq("code", employerId.trim())
        .single();

      if (clErr || !cluster) {
        setEmpError("Invalid employer code. Please check and try again.");
        return;
      }

      // Update worker
      const { error } = await supabase
        .from("workers")
        .update({
          employer_id: employerId.trim(),
          employer_name: cluster.name,
        })
        .eq("id", user.id);

      if (error) throw error;
      setEmployerName(cluster.name);
      setEmpSaved(true);
      setTimeout(() => setEmpSaved(false), 2000);
    } catch (e) {
      setEmpError("Failed to save: " + e.message);
    } finally {
      setEmpLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={s.screen}>
      <TopBar />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>Settings</Text>
        </View>

        {/* Worker Info */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Name</Text>
            <Text style={s.infoValue}>{user?.name}</Text>
          </View>
          <View style={s.infoDivider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Phone</Text>
            <Text style={s.infoValue}>+91 {user?.phone}</Text>
          </View>
          <View style={s.infoDivider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>City</Text>
            <Text style={s.infoValue}>{user?.city}</Text>
          </View>
          {employerName ? (
            <>
              <View style={s.infoDivider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Employer</Text>
                <Text style={[s.infoValue, { color: "#22C55E" }]}>
                  {employerName}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Employer Code */}
        <Text style={s.sectionLabel}>EMPLOYER / FLEET CODE</Text>
        <Text style={s.sectionSub}>
          Connect with your fleet operator or employer
        </Text>
        <View style={s.empCard}>
          <View style={s.field}>
            <TextInput
              style={s.input}
              placeholder="Enter employer code (e.g. rapido-kanpur-001)"
              placeholderTextColor={COLORS.text3}
              value={employerId}
              onChangeText={setEmployerId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {empError ? <Text style={s.empError}>{empError}</Text> : null}
          <TouchableOpacity
            style={[
              s.saveBtn,
              (empLoading || empSaved) && { opacity: 0.8 },
              empSaved && s.saveBtnDone,
            ]}
            onPress={saveEmployerId}
            disabled={empLoading}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>
              {empLoading
                ? "Verifying..."
                : empSaved
                  ? "✓ Connected"
                  : "Connect"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trusted Contacts */}
        <Text style={s.sectionLabel}>TRUSTED CONTACTS</Text>
        <Text style={s.sectionSub}>
          Emergency alert will be sent to these contacts when SOS triggers
        </Text>

        {contacts.map((contact, i) => (
          <View key={i} style={s.contactCard}>
            <Text style={s.contactNum}>Contact {i + 1}</Text>
            <View style={s.field}>
              <TextInput
                style={s.input}
                placeholder="Full Name"
                placeholderTextColor={COLORS.text3}
                value={contact.name}
                onChangeText={(v) => updateContact(i, "name", v)}
                autoCapitalize="words"
              />
            </View>
            <View style={s.field}>
              <Text style={s.prefix}>+91</Text>
              <View style={s.divider} />
              <TextInput
                style={s.input}
                placeholder="Phone Number"
                placeholderTextColor={COLORS.text3}
                keyboardType="phone-pad"
                value={contact.phone}
                onChangeText={(v) => updateContact(i, "phone", v)}
                maxLength={10}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chips}
            >
              {RELATIONS.map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[s.chip, contact.relation === rel && s.chipActive]}
                  onPress={() => updateContact(i, "relation", rel)}
                >
                  <Text
                    style={[
                      s.chipText,
                      contact.relation === rel && s.chipTextActive,
                    ]}
                  >
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}

        <TouchableOpacity
          style={[
            s.saveBtn,
            saved && s.saveBtnDone,
            loading && { opacity: 0.6 },
          ]}
          onPress={saveContacts}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>
            {loading ? "Saving..." : saved ? "✓ Saved" : "Save Contacts"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={s.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav
        activeTab="more"
        onTabPress={(id) => {
          const map = {
            home: "Dashboard",
            map: "Routes",
            report: "Report",
            activity: "Activity",
            more: "More",
          };
          if (map[id]) nav.navigate("Main", { screen: map[id] });
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: COLORS.text2, fontSize: 16 },
  title: { color: COLORS.text1, fontSize: 28, fontWeight: "800" },
  infoCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: { color: COLORS.text3, fontSize: 13 },
  infoValue: { color: COLORS.text1, fontSize: 13, fontWeight: "600" },
  infoDivider: { height: 1, backgroundColor: COLORS.border },
  sectionLabel: {
    color: COLORS.text3,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },
  sectionSub: { color: COLORS.text3, fontSize: 12, marginBottom: 12 },
  empCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  empError: { color: "#EF4444", fontSize: 12 },
  contactCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  contactNum: {
    color: COLORS.text2,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    gap: 10,
  },
  prefix: { color: "#2563EB", fontSize: 14, fontWeight: "600" },
  divider: { width: 1, height: 18, backgroundColor: COLORS.border },
  input: { flex: 1, color: COLORS.text1, fontSize: 14 },
  chips: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  chipText: { color: COLORS.text3, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "white" },
  saveBtn: {
    backgroundColor: "#2563EB",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnDone: { backgroundColor: "#22C55E" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  logoutBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  logoutBtnText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
});
