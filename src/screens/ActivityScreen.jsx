// ─── ActivityScreen.jsx ──────────────────────────────────────────────────────
// Full activity timeline — all shift events, alerts, reports, surveys.
// Reads from useAppStore().activityLog (also your audit log for research).
// Filter chips: All | Shifts | Alerts | Reports

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import TopBar from "../components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";
import useAppStore from "../store/useAppStore";
import { useTranslation } from "../i18n";
import { COLORS } from "../utils/constants";

const ICON_MAP = {
  shift: "🛡️",
  endshift: "⏹️",
  sos: "🆘",
  alert: "🚨",
  report: "⚠️",
  route: "🗺️",
  survey: "📋",
};
const TYPE_COLORS = {
  shift: COLORS.green,
  endshift: COLORS.text3,
  sos: COLORS.red,
  alert: COLORS.red,
  report: COLORS.amber,
  route: COLORS.blue,
  survey: "#A78BFA",
};

export default function ActivityScreen() {
  const nav = useNavigation();
  const t = useTranslation();
  const { activityLog } = useAppStore();
  const [filter, setFilter] = useState("all");

  const filterMap = {
    all: null,
    shift: ["shift", "endshift"],
    alert: ["alert", "sos"],
    report: ["report", "survey"],
  };

  const filtered =
    filter === "all"
      ? activityLog
      : activityLog.filter((e) => (filterMap[filter] || []).includes(e.type));

  return (
    <SafeAreaView style={styles.screen}>
      <TopBar />
      <View style={styles.header}>
        <Text style={styles.title}>{t.activityTitle}</Text>
      </View>

      <View style={styles.filters}>
        {[
          ["all", t.filterAll],
          ["shift", t.filterShift],
          ["alert", t.filterAlert],
          ["report", t.filterIncident],
        ].map(([k, v]) => (
          <TouchableOpacity
            key={k}
            style={[styles.fchip, filter === k && styles.fchipActive]}
            onPress={() => setFilter(k)}
          >
            <Text style={[styles.ftext, filter === k && styles.ftextActive]}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIco}>🕐</Text>
            <Text style={styles.emptyText}>{t.activityEmpty}</Text>
          </View>
        ) : (
          filtered.map((ev, idx) => (
            <View key={ev.id} style={styles.item}>
              <View style={styles.left}>
                <View
                  style={[
                    styles.ico,
                    {
                      backgroundColor:
                        (TYPE_COLORS[ev.type] || COLORS.blue) + "18",
                    },
                  ]}
                >
                  <Text style={styles.icoText}>
                    {ICON_MAP[ev.type] || "📌"}
                  </Text>
                </View>
                {idx < filtered.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.right}>
                <View style={styles.card}>
                  <Text style={styles.evTitle}>{ev.title}</Text>
                  <Text style={styles.evSub}>{ev.sub}</Text>
                  <Text style={styles.evTime}>
                    {new Date(ev.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 22, paddingBottom: 8 },
  title: {
    color: COLORS.text1,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  fchip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  fchipActive: {
    backgroundColor: "rgba(79,142,247,0.14)",
    borderColor: "rgba(79,142,247,0.4)",
  },
  ftext: {
    color: COLORS.text3,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  ftextActive: { color: COLORS.blue },
  scroll: { flex: 1, paddingHorizontal: 22 },
  item: { flexDirection: "row", gap: 14, marginBottom: 2 },
  left: { alignItems: "center", width: 36 },
  ico: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  icoText: { fontSize: 16 },
  line: { width: 1, flex: 1, backgroundColor: COLORS.border, marginTop: 4 },
  right: { flex: 1, paddingBottom: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 13,
  },
  evTitle: {
    color: COLORS.text1,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  evSub: { color: COLORS.text3, fontSize: 12 },
  evTime: { color: COLORS.text3, fontSize: 11, marginTop: 6 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyIco: { fontSize: 40, opacity: 0.4 },
  emptyText: { color: COLORS.text3, fontSize: 13, textAlign: "center" },
});
