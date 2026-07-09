// ─── components/CrashWarning.jsx ─────────────────────────────────────────────
// Full screen overlay shown after crash detection
// 30 second countdown → no response → SOS fires

import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Animated,
} from "react-native";
import { cancelCrashWarning } from "../services/crash";

export default function CrashWarning({ onSOS, onCancel }) {
  const [seconds, setSeconds] = useState(30);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Vibrate pattern — alert user
    Vibration.vibrate([500, 500, 500, 500, 500], true);

    // Countdown
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          Vibration.cancel();
          onSOS();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => {
      clearInterval(interval);
      Vibration.cancel();
    };
  }, []);

  const handleImOkay = () => {
    Vibration.cancel();
    cancelCrashWarning();
    onCancel();
  };

  const handleSOSNow = () => {
    Vibration.cancel();
    onSOS();
  };

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        {/* Warning icon */}
        <Animated.View
          style={[s.iconWrap, { transform: [{ scale: pulseAnim }] }]}
        >
          <Text style={s.icon}>⚠️</Text>
        </Animated.View>

        <Text style={s.title}>Crash Detected</Text>
        <Text style={s.sub}>
          Are you okay? Emergency services will be alerted in
        </Text>

        {/* Countdown */}
        <View style={s.countdownWrap}>
          <Text style={s.countdown}>{seconds}</Text>
          <Text style={s.countdownLabel}>seconds</Text>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={s.okayBtn}
          onPress={handleImOkay}
          activeOpacity={0.85}
        >
          <Text style={s.okayBtnText}>✓ I'm Okay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.sosBtn}
          onPress={handleSOSNow}
          activeOpacity={0.85}
        >
          <Text style={s.sosBtnText}>🆘 Send SOS Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    inset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.92)",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "85%",
    backgroundColor: "#0F1520",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  icon: { fontSize: 36 },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  countdownWrap: { alignItems: "center", paddingVertical: 8 },
  countdown: {
    color: "#EF4444",
    fontSize: 72,
    fontWeight: "900",
    lineHeight: 80,
  },
  countdownLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    letterSpacing: 2,
  },
  okayBtn: {
    width: "100%",
    backgroundColor: "#22C55E",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  okayBtnText: { color: "white", fontSize: 16, fontWeight: "800" },
  sosBtn: {
    width: "100%",
    backgroundColor: "rgba(239,68,68,0.15)",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  sosBtnText: { color: "#EF4444", fontSize: 16, fontWeight: "800" },
});
