import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import CrashWarning from "./src/components/Crashwarning";
import { startCrashDetection, stopCrashDetection } from "./src/services/crash";
import { triggerSOS } from "./src/services/sos";
import {
  startDeadZoneMonitor,
  stopDeadZoneMonitor,
} from "./src/services/deadzone";
import {
  subscribePeerAlerts,
  unsubscribePeerAlerts,
} from "./src/services/peerMesh";
import useAppStore from "./src/store/useAppStore";

const { width, height } = Dimensions.get("window");

function SplashScreen({ onDone }) {
  const barsFade = useRef(new Animated.Value(0)).current;
  const barsScale = useRef(new Animated.Value(0.7)).current;
  const wordFade = useRef(new Animated.Value(0)).current;
  const wordSlide = useRef(new Animated.Value(40)).current;
  const bylineFade = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(barsFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(barsScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(wordFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(wordSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(300),
      Animated.timing(bylineFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(screenFade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[s.splash, { opacity: screenFade }]}>
      <StatusBar barStyle="light-content" backgroundColor="#080D18" />
      {Array.from({ length: 8 }).map((_, col) =>
        Array.from({ length: 14 }).map((_, row) => (
          <View
            key={`${col}-${row}`}
            style={[
              s.dot,
              {
                left: (col + 1) * (width / 9) - 1.5,
                top: (row + 1) * (height / 15) - 1.5,
              },
            ]}
          />
        )),
      )}
      <View style={s.logoWrap}>
        <Animated.View
          style={[
            s.bars,
            { opacity: barsFade, transform: [{ scale: barsScale }] },
          ]}
        >
          <View style={s.bar1} />
          <View style={s.bar2} />
        </Animated.View>
        <Animated.View style={[s.textSide, { opacity: wordFade }]}>
          <View style={s.divider} />
          <View>
            <Animated.Text
              style={[s.wordmark, { transform: [{ translateX: wordSlide }] }]}
            >
              SENTINEL
            </Animated.Text>
            <Animated.Text style={[s.byline, { opacity: bylineFade }]}>
              BY SECURED SYSTEMS
            </Animated.Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function AppWithCrash() {
  const { isLoggedIn, user } = useAppStore();
  const [showWarning, setShowWarning] = useState(false);
  const [crashData, setCrashData] = useState(null);

  // Crash detection
  useEffect(() => {
    if (!isLoggedIn) {
      stopCrashDetection();
      return;
    }

    startCrashDetection({
      onWarning: (data) => {
        setCrashData(data);
        setShowWarning(true);
      },
      onSOS: async () => {
        setShowWarning(false);
        if (user)
          await triggerSOS({
            workerId: user.id,
            workerName: user.name,
            workerPhone: user.phone,
            type: "crash",
          });
      },
      onCancel: () => {
        setShowWarning(false);
        setCrashData(null);
      },
    });

    return () => stopCrashDetection();
  }, [isLoggedIn]);

  // Dead zone monitor
  useEffect(() => {
    if (!isLoggedIn) {
      stopDeadZoneMonitor();
      return;
    }

    startDeadZoneMonitor({
      onSoftAlert: ({ minutesOffline }) => {
        Alert.alert(
          "⚠️ Network Warning",
          `${minutesOffline} minutes se network nahi hai. Are you okay?`,
          [{ text: "I'm Okay" }],
        );
      },
      onHardAlert: ({ minutesOffline }) => {
        Alert.alert(
          "🔴 Network Alert",
          `${minutesOffline} minutes se offline hain. Trusted contacts ko alert bheja ja raha hai.`,
        );
      },
      onNetworkBack: () => console.log("Network wapas aa gaya"),
    });

    return () => stopDeadZoneMonitor();
  }, [isLoggedIn]);

  // Peer mesh
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    subscribePeerAlerts({
      worker: user,
      currentLat: null,
      currentLng: null,
      onAlert: (alert) => {
        Alert.alert(
          "🆘 Nearby SOS Alert",
          `${alert.worker_name} ko madad chahiye!\n${alert.distanceM ? alert.distanceM + "m door" : "Nearby"}\n\n${alert.message}`,
          [{ text: "OK" }],
        );
      },
    });

    return () => unsubscribePeerAlerts();
  }, [isLoggedIn, user]);

  const handleSOS = async () => {
    setShowWarning(false);
    if (user)
      await triggerSOS({
        workerId: user.id,
        workerName: user.name,
        workerPhone: user.phone,
        type: "crash",
      });
  };

  return (
    <>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      {showWarning && (
        <CrashWarning
          onSOS={handleSOS}
          onCancel={() => {
            setShowWarning(false);
            setCrashData(null);
          }}
        />
      )}
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <SafeAreaProvider>
      {showSplash ? (
        <SplashScreen onDone={() => setShowSplash(false)} />
      ) : (
        <AppWithCrash />
      )}
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#080D18",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(79,142,247,0.12)",
  },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 16 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  bar1: { width: 14, height: 40, backgroundColor: "white", borderRadius: 4 },
  bar2: { width: 14, height: 28, backgroundColor: "white", borderRadius: 4 },
  textSide: { flexDirection: "row", alignItems: "center", gap: 16 },
  divider: { width: 1, height: 56, backgroundColor: "rgba(255,255,255,0.2)" },
  wordmark: {
    fontSize: 40,
    color: "white",
    letterSpacing: 6,
    fontWeight: "800",
  },
  byline: {
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 3,
    marginTop: 4,
  },
});
