import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import TopBar from "../components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";
import { useTranslation } from "../i18n";
import { COLORS } from "../utils/constants";
import { supabase } from "../utils/supabase";
import useAppStore from "../store/useAppStore";

export default function SurveyScreen() {
  const nav = useNavigation();
  const t = useTranslation();
  const { user } = useAppStore();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState({});

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!error && data) setSurveys(data);
    } catch (e) {
      console.log("Survey fetch error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = (id, vote) => {
    setVotes((prev) => ({ ...prev, [id]: vote }));
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return "Just now";
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

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
          <Text style={styles.title}>{t.surveyTitle}</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            color={COLORS.blue}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : surveys.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIco}>📋</Text>
            <Text style={styles.emptyText}>No surveys pending right now</Text>
          </View>
        ) : (
          <>
            <Text style={styles.pending}>
              {surveys.length} {t.pending}
            </Text>
            {surveys.map((s) => (
              <View key={s.id} style={styles.card}>
                <Text style={styles.type}>{s.type?.toUpperCase()}</Text>
                <Text style={styles.location}>{s.location}</Text>
                <Text style={styles.time}>{formatTime(s.created_at)}</Text>
                <Text style={styles.question}>{t.surveyQ}</Text>
                <View style={styles.btns}>
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      styles.btnYes,
                      votes[s.id] === "yes" && styles.btnVoted,
                    ]}
                    onPress={() => handleVote(s.id, "yes")}
                  >
                    <Text style={[styles.btnText, { color: COLORS.green }]}>
                      {votes[s.id] === "yes" ? "✓ Confirmed" : `✓ ${t.yes}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      styles.btnNo,
                      votes[s.id] === "no" && styles.btnVoted,
                    ]}
                    onPress={() => handleVote(s.id, "no")}
                  >
                    <Text style={[styles.btnText, { color: COLORS.red }]}>
                      {votes[s.id] === "no" ? "✗ Denied" : `✗ ${t.no}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      votes[s.id] === "unsure" && styles.btnVoted,
                    ]}
                    onPress={() => handleVote(s.id, "unsure")}
                  >
                    <Text style={styles.btnText}>{t.unsure}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1, paddingHorizontal: 22 },
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
  title: {
    color: COLORS.text1,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pending: {
    color: COLORS.text3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 10,
  },
  type: {
    color: COLORS.amber,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 6,
  },
  location: {
    color: COLORS.text1,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 3,
  },
  time: { color: COLORS.text3, fontSize: 11, marginBottom: 14 },
  question: {
    color: COLORS.text2,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 11,
  },
  btns: { flexDirection: "row", gap: 7 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
  },
  btnYes: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.2)",
  },
  btnNo: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)",
  },
  btnVoted: { opacity: 0.6 },
  btnText: { fontSize: 11, fontWeight: "700", color: COLORS.text2 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIco: { fontSize: 40, opacity: 0.4 },
  emptyText: { color: COLORS.text3, fontSize: 13 },
});
