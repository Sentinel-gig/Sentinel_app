import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../utils/supabase";
import useAppStore from "../store/useAppStore";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";
import { COLORS } from "../utils/constants";

const CATEGORIES = [
  "App Experience",
  "Map Accuracy",
  "Route Quality",
  "Safety Alerts",
  "Other",
];

export default function FeedbackScreen() {
  const nav = useNavigation();
  const { user } = useAppStore();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      await supabase.from("feedback").insert([
        {
          worker_id: user?.id,
          worker_name: user?.name,
          rating,
          category,
          message: message.trim(),
        },
      ]);
      setDone(true);
    } catch (e) {
      console.log("Feedback error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={s.screen}>
        <TopBar />
        <View style={s.doneWrap}>
          <Text style={s.doneIcon}>🙏</Text>
          <Text style={s.doneTitle}>Thank You!</Text>
          <Text style={s.doneSub}>
            Your feedback helps us improve Sentinel for every worker.
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => nav.goBack()}>
            <Text style={s.doneBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <TopBar />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => nav.goBack()}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>Feedback</Text>
        </View>

        <Text style={s.sub}>
          Help us make Sentinel better for every gig worker.
        </Text>

        {/* Star Rating */}
        <Text style={s.label}>Rate your experience</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity key={i} onPress={() => setRating(i)}>
              <Text style={[s.star, i <= rating && s.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category */}
        <Text style={s.label}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chips}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[s.chip, category === cat && s.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[s.chipText, category === cat && s.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Message */}
        <Text style={s.label}>Tell us more (optional)</Text>
        <TextInput
          style={s.textArea}
          placeholder="What can we improve?"
          placeholderTextColor={COLORS.text3}
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[s.btn, (!rating || loading) && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={!rating || loading}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>
            {loading ? "Submitting..." : "Submit Feedback"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav
        activeTab="..."
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

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    marginBottom: 4,
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
  title: { color: COLORS.text1, fontSize: 26, fontWeight: "800" },
  sub: { color: COLORS.text3, fontSize: 13, marginBottom: 24, lineHeight: 20 },
  label: {
    color: COLORS.text3,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  stars: { flexDirection: "row", gap: 8, marginBottom: 24 },
  star: { fontSize: 36, color: COLORS.border },
  starActive: { color: "#F59E0B" },
  chips: { flexDirection: "row", marginBottom: 24 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  chipText: { color: COLORS.text3, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "white" },
  textArea: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    color: COLORS.text1,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: "#2563EB",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "white", fontSize: 15, fontWeight: "700" },
  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  doneIcon: { fontSize: 56 },
  doneTitle: { color: COLORS.text1, fontSize: 28, fontWeight: "800" },
  doneSub: {
    color: COLORS.text3,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  doneBtn: {
    backgroundColor: "#2563EB",
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
