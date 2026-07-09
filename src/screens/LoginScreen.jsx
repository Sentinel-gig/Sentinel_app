import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import SentinelLogo from "../components/SentinelLogo";
import useAppStore from "../store/useAppStore";
import { supabase } from "../utils/supabase";
import * as Crypto from "expo-crypto";
import { useTranslation } from "../i18n";
import { COLORS } from "../utils/constants";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAppStore();
  const t = useTranslation();
  const navigation = useNavigation();

  const handleLogin = async () => {
    setError("");
    if (!phone || phone.length < 10) {
      setError("Valid phone number daalo");
      return;
    }
    if (!password) {
      setError("Password daalo");
      return;
    }

    setLoading(true);
    try {
      const pwHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password.toLowerCase().trim(),
      );

      const { data, error: dbErr } = await supabase
        .from("workers")
        .select("*")
        .eq("phone", phone.trim())
        .eq("password_hash", pwHash)
        .single();

      if (dbErr || !data) {
        setError("Phone ya password galat hai");
        return;
      }

      login({
        name: data.name,
        phone: data.phone,
        city: data.city,
        id: data.id,
      });
    } catch (e) {
      setError("Login fail hua, dobara try karo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <View style={styles.topBar}>
          <SentinelLogo size="sm" />
        </View>

        <View style={styles.hero}>
          <View style={styles.mark}>
            <View style={styles.bars}>
              <View
                style={{
                  width: 10,
                  height: 28,
                  backgroundColor: "white",
                  borderRadius: 3,
                }}
              />
              <View
                style={{
                  width: 10,
                  height: 20,
                  backgroundColor: "white",
                  borderRadius: 3,
                  marginLeft: 4,
                }}
              />
            </View>
          </View>
          <Text style={styles.title}>SENTINEL</Text>
          <Text style={styles.sub}>{t.secureAccess}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.prefix}>+91</Text>
            <View style={styles.divider} />
            <TextInput
              style={styles.input}
              placeholder={t.enterMobile}
              placeholderTextColor={COLORS.text3}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={10}
            />
          </View>

          <View style={[styles.field, error ? styles.fieldError : null]}>
            <Text style={{ fontSize: 18 }}>🔒</Text>
            <View style={styles.divider} />
            <TextInput
              style={styles.input}
              placeholder={t.enterPassword}
              placeholderTextColor={COLORS.text3}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError("");
              }}
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)}>
              <Text style={styles.eye}>{showPw ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Working..." : t.signIn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={[styles.foot, { textAlign: "right" }]}>
              <Text style={styles.link}>Forgotten Password?</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.foot}>
              {t.newUser} <Text style={styles.link}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1 },
  topBar: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bars: { flexDirection: "row", alignItems: "flex-end" },
  title: {
    color: "white",
    fontSize: 38,
    letterSpacing: 3,
    fontWeight: "800",
    marginTop: 14,
  },
  sub: {
    color: COLORS.text3,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
  },
  form: { paddingHorizontal: 26, paddingBottom: 48, gap: 10 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    height: 58,
    paddingHorizontal: 18,
    gap: 10,
  },
  fieldError: { borderColor: "rgba(239,68,68,0.6)" },
  divider: { width: 1, height: 18, backgroundColor: "rgba(255,255,255,0.07)" },
  prefix: { color: COLORS.blue, fontSize: 14, fontWeight: "600" },
  input: { flex: 1, color: COLORS.text1, fontSize: 15 },
  eye: { fontSize: 16, color: COLORS.text3 },
  error: { color: COLORS.red, fontSize: 12, fontWeight: "500", paddingLeft: 4 },
  btn: {
    backgroundColor: "#2563EB",
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  foot: { textAlign: "center", color: COLORS.text3, fontSize: 13 },
  link: { color: COLORS.blue, fontWeight: "600" },
});
