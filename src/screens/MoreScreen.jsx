import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";
import { COLORS } from "../utils/constants";

const MENU_ITEMS = [
  {
    icon: "⚙️",
    label: "Settings",
    sub: "Trusted contacts, account",
    screen: "Settings",
  },
  {
    icon: "📋",
    label: "Survey",
    sub: "Validate reported incidents",
    screen: "Survey",
  },
  {
    icon: "💬",
    label: "Feedback",
    sub: "Rate your experience",
    screen: "Feedback",
  },
  {
    icon: "🛡️",
    label: "About Sentinel",
    sub: "Version, privacy policy",
    screen: "About",
  },
];

export default function MoreScreen() {
  const nav = useNavigation();

  const handlePress = (item) => {
    if (item.screen === "About") {
      Linking.openURL("https://sentinelco.in");
    } else {
      nav.navigate(item.screen);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <TopBar />
      <View style={s.header}>
        <Text style={s.title}>More</Text>
      </View>
      <View style={s.content}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={s.card}
            onPress={() => handlePress(item)}
            activeOpacity={0.8}
          >
            <Text style={s.icon}>{item.icon}</Text>
            <View style={s.info}>
              <Text style={s.label}>{item.label}</Text>
              <Text style={s.sub}>{item.sub}</Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20 },
  title: { color: COLORS.text1, fontSize: 28, fontWeight: "800" },
  content: { flex: 1, paddingHorizontal: 20, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  label: { color: COLORS.text1, fontSize: 15, fontWeight: "700" },
  sub: { color: COLORS.text3, fontSize: 12, marginTop: 2 },
  arrow: { color: COLORS.text3, fontSize: 22 },
});
