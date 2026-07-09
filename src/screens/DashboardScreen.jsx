import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import TopBar from "../components/TopBar";
import StatusPill from "../components/StatusPill";
import SOSButton from "../components/SOSButton";
import BottomNav from "../components/BottomNav";
import useAppStore from "../store/useAppStore";
import { useTranslation } from "../i18n";
import { COLORS } from "../utils/constants";
import * as Location from "expo-location";
import { startTracking, stopTracking } from "../services/tracking";
import { triggerSOS } from "../services/sos";

export default function DashboardScreen() {
  const nav = useNavigation();
  const {
    user,
    shiftActive,
    startShift,
    endShift,
    location,
    activityLog,
    addActivity,
    setLocation,
    cityZones,
  } = useAppStore();
  const t = useTranslation();

  const [lastScore, setLastScore] = useState(null);
  const [shiftSpeed, setShiftSpeed] = useState(0);
  const [shiftDist, setShiftDist] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // Pulse animation when shift is active
  useEffect(() => {
    if (!shiftActive) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shiftActive]);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? t.goodMorning : h < 17 ? t.goodAfternoon : t.goodEvening;
  };

  const handleShiftToggle = async () => {
    if (shiftActive) {
      const score = await stopTracking();
      endShift();
      if (score) {
        setLastScore(score);
        setShiftDist(score.total_distance || 0);
      }
      addActivity({
        type: "endshift",
        title: "Shift Ended",
        sub: score
          ? `Score ${score.score}/100 · ${score.rating} · ${(score.total_distance || 0).toFixed(1)}km`
          : "Shift completed",
      });
    } else {
      startShift();
      setLastScore(null);
      setShiftSpeed(0);
      setShiftDist(0);
      addActivity({
        type: "shift",
        title: "Shift Started",
        sub: "Tracking active",
      });
      if (user) startTracking(user, cityZones || []);
    }
  };

  const handleSOS = async () => {
    if (!user) return;
    addActivity({
      type: "sos",
      title: "SOS Triggered",
      sub: "Escalating to emergency services",
    });
    await triggerSOS({
      workerId: user.id,
      workerName: user.name,
      workerPhone: user.phone,
      type: "manual",
    });
  };

  const recent = activityLog.slice(0, 4);

  const scoreColor = (s) =>
    !s
      ? COLORS.text3
      : s.rating === "SAFE"
        ? "#22C55E"
        : s.rating === "MODERATE"
          ? "#F59E0B"
          : "#EF4444";

  return (
    <SafeAreaView style={styles.screen}>
      <TopBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name}>
            {user?.name?.toUpperCase() || "WORKER"}
          </Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <StatusPill active={shiftActive} />
        </View>

        {/* ── Shift toggle ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.shiftBtn, shiftActive && styles.shiftBtnActive]}
              onPress={handleShiftToggle}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.shiftText,
                  shiftActive && { color: COLORS.green },
                ]}
              >
                {shiftActive ? `■  ${t.endShift}` : `▶  ${t.startShift}`}
              </Text>
              {shiftActive && (
                <Text style={styles.shiftSub}>
                  Tracking active · tap to end
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Live stats (only during shift) ─────────────────────────────── */}
        {shiftActive && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>
                {location
                  ? `${location.latitude?.toFixed(3)}, ${location.longitude?.toFixed(3)}`
                  : "—"}
              </Text>
              <Text style={styles.statLabel}>CURRENT LOCATION</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxMid]}>
              <Text style={styles.statVal}>{shiftDist.toFixed(1)} km</Text>
              <Text style={styles.statLabel}>DISTANCE</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: COLORS.green }]}>
                LIVE
              </Text>
              <Text style={styles.statLabel}>STATUS</Text>
            </View>
          </View>
        )}

        {/* ── Last shift score ────────────────────────────────────────────── */}
        {lastScore && !shiftActive && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>LAST SHIFT</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreMain}>
                <Text
                  style={[styles.scoreNum, { color: scoreColor(lastScore) }]}
                >
                  {lastScore.score}
                </Text>
                <Text style={styles.scoreOf}>/100</Text>
              </View>
              <View style={styles.scoreStats}>
                <Text style={styles.scoreStat}>
                  🛑 {lastScore.harsh_brakes} harsh brakes
                </Text>
                <Text style={styles.scoreStat}>
                  ⚡ {lastScore.rapid_accels} rapid accels
                </Text>
                <Text style={styles.scoreStat}>
                  ⚠️ {lastScore.risk_zone_crossings} risk zones
                </Text>
                <Text style={styles.scoreStat}>
                  📍 {lastScore.total_distance?.toFixed(1)} km
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.ratingPill,
                {
                  backgroundColor: scoreColor(lastScore) + "22",
                  borderColor: scoreColor(lastScore) + "55",
                },
              ]}
            >
              <Text
                style={[styles.ratingText, { color: scoreColor(lastScore) }]}
              >
                {lastScore.rating}
              </Text>
            </View>
          </View>
        )}

        {/* ── SOS ─────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SOSButton onTrigger={handleSOS} />
        </View>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <Text style={styles.secLabel}>QUICK ACTIONS</Text>
        <View style={styles.grid}>
          {[
            {
              ico: "🗺️",
              label: t.safeRoutes,
              sub: "Plan safe route",
              onPress: () => nav.navigate("Routes"),
            },
            {
              ico: "⚠️",
              label: t.reportIncident,
              sub: "Log safety event",
              onPress: () => nav.navigate("Report"),
            },
            {
              ico: "📋",
              label: t.survey,
              sub: "Community reports",
              onPress: () => nav.navigate("Survey"),
            },
            {
              ico: "📊",
              label: "Activity",
              sub: "Your history",
              onPress: () => nav.navigate("Activity"),
            },
          ].map((a, i) => (
            <TouchableOpacity
              key={i}
              style={styles.card}
              onPress={a.onPress}
              activeOpacity={0.8}
            >
              <Text style={styles.cardIco}>{a.ico}</Text>
              <Text style={styles.cardLabel}>{a.label}</Text>
              <Text style={styles.cardSub}>{a.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent activity ──────────────────────────────────────────────── */}
        <Text style={styles.secLabel}>{t.recentActivity}</Text>
        <View style={styles.activityList}>
          {recent.length === 0 ? (
            <Text style={styles.noActivity}>{t.noActivity}</Text>
          ) : (
            recent.map((ev) => (
              <View key={ev.id} style={styles.actItem}>
                <View
                  style={[
                    styles.actDot,
                    {
                      backgroundColor:
                        ev.type === "sos"
                          ? "#EF4444"
                          : ev.type === "shift"
                            ? COLORS.green
                            : ev.type === "endshift"
                              ? "#F59E0B"
                              : COLORS.border,
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actLabel}>{ev.title}</Text>
                  {ev.sub ? <Text style={styles.actSub}>{ev.sub}</Text> : null}
                </View>
                <Text style={styles.actTime}>
                  {new Date(ev.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomNav
        activeTab="home"
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
  scroll: { flex: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 18 },
  greeting: {
    color: COLORS.text3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
  },
  name: {
    color: COLORS.text1,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 4,
  },
  phone: { color: COLORS.text3, fontSize: 12, marginTop: 3 },

  section: { paddingHorizontal: 22, marginBottom: 8 },

  shiftBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    alignItems: "center",
  },
  shiftBtnActive: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  shiftText: {
    color: COLORS.text1,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  shiftSub: {
    color: "rgba(34,197,94,0.6)",
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 22,
    marginBottom: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statBoxMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  statVal: {
    color: COLORS.text1,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  statLabel: {
    color: COLORS.text3,
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 3,
    textAlign: "center",
  },

  scoreCard: {
    marginHorizontal: 22,
    marginBottom: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
  },
  scoreTitle: {
    color: COLORS.text3,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreMain: { flexDirection: "row", alignItems: "flex-end" },
  scoreNum: { fontSize: 52, fontWeight: "800", lineHeight: 56 },
  scoreOf: {
    color: COLORS.text3,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  scoreStats: { flex: 1, gap: 4 },
  scoreStat: { color: COLORS.text3, fontSize: 11 },
  ratingPill: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  ratingText: { fontSize: 10, fontWeight: "800", letterSpacing: 2 },

  secLabel: {
    color: COLORS.text3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 22,
  },
  card: {
    width: "47%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  cardIco: { fontSize: 22 },
  cardLabel: { color: COLORS.text1, fontSize: 13, fontWeight: "700" },
  cardSub: { color: COLORS.text3, fontSize: 11 },

  activityList: { paddingHorizontal: 22 },
  actItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  actDot: { width: 7, height: 7, borderRadius: 4 },
  actLabel: { color: COLORS.text1, fontSize: 13, fontWeight: "500" },
  actSub: { color: COLORS.text3, fontSize: 11, marginTop: 1 },
  actTime: { color: COLORS.text3, fontSize: 11 },
  noActivity: {
    color: COLORS.text3,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
});
