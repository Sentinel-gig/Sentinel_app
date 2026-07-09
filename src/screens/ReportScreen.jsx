import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import TopBar from "../components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";
import useAppStore from "../store/useAppStore";
import { useTranslation } from "../i18n";
import { COLORS } from "../utils/constants";
import { supabase } from "../utils/supabase";
import * as Location from "expo-location";

export default function ReportScreen() {
  const nav = useNavigation();
  const t = useTranslation();
  const { location, addActivity, user } = useAppStore();

  const [incType, setIncType] = useState(null);
  const [severity, setSeverity] = useState(null);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!incType || !severity) {
      Alert.alert("Incomplete", "Please select Incident type and severity");
      return;
    }

    setLoading(true);
    try {
      let lat = null,
        lng = null,
        city = user?.city || null;

      try {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch (e) {}

      // Save incident
      const { error } = await supabase.from("incidents").insert([
        {
          worker_id: user?.id,
          worker_name: user?.name,
          worker_phone: user?.phone,
          type: incType,
          severity,
          description: desc.trim(),
          lat,
          lng,
          city,
        },
      ]);

      if (error) throw error;

      // Add to community survey for validation
      await supabase.from("surveys").insert([
        {
          type: incType,
          location: user?.city || "Unknown",
          city: user?.city,
          lat,
          lng,
          reported_by: user?.id,
          reported_by_name: user?.name,
          status: "pending",
        },
      ]);

      addActivity({
        type: "report",
        title: "Incident Reported",
        sub: `${incType} · ${severity}`,
      });

      Alert.alert("Reported", "Incident successfully report ho gaya", [
        { text: "OK", onPress: () => nav.navigate("Dashboard") },
      ]);
    } catch (e) {
      Alert.alert("Error", "Report submit nahi hua: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const Chip = ({ label, selected, onPress }) => (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <TopBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => nav.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t.reportIncident}</Text>
        </View>

        <Text style={styles.label}>{t.incidentType}</Text>
        <View style={styles.chips}>
          {["accident", "theft", "roadRage", "fight", "medical", "other"].map(
            (k) => (
              <Chip
                key={k}
                label={t[k]}
                selected={incType === k}
                onPress={() => setIncType(k)}
              />
            ),
          )}
        </View>

        <Text style={styles.label}>{t.severity}</Text>
        <View style={styles.chips}>
          {[
            ["low", t.low],
            ["elevated", t.elevated],
            ["high", t.high],
            ["critical", t.critical],
          ].map(([k, v]) => (
            <Chip
              key={k}
              label={v}
              selected={severity === k}
              onPress={() => setSeverity(k)}
            />
          ))}
        </View>

        <Text style={styles.label}>{t.describe}</Text>
        <TextInput
          style={styles.textarea}
          placeholder={t.placeholder}
          placeholderTextColor={COLORS.text3}
          multiline
          value={desc}
          onChangeText={setDesc}
        />

        <Text style={styles.label}>{t.uploadEvidence}</Text>
        <TouchableOpacity style={styles.uploadBox}>
          <Text style={styles.uploadText}>📷 {t.uploadImage}</Text>
        </TouchableOpacity>
        <Text style={styles.optional}>{t.optional}</Text>

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitText}>{t.submit}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNav
        activeTab="report"
        onTabPress={(id) => {
          const map = {
            home: "Dashboard",
            map: "Routes",
            report: "Report",
            activity: "Activity",
            more: "More",
          };
          if (map[id]) nav.navigate(map[id]);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1, paddingHorizontal: 22 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  back: {
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
  title: {
    color: COLORS.text1,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1,
  },
  label: {
    color: COLORS.text3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: COLORS.bdim,
    borderColor: "rgba(79,142,247,0.4)",
  },
  chipText: { color: COLORS.text2, fontSize: 13, fontWeight: "500" },
  chipTextSelected: { color: COLORS.blue, fontWeight: "600" },
  textarea: {
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    color: COLORS.text1,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  uploadBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 14,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: { color: COLORS.text3, fontSize: 13, fontWeight: "500" },
  optional: {
    color: COLORS.text3,
    fontSize: 11,
    marginTop: 6,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "white", fontSize: 15, fontWeight: "700" },
});
