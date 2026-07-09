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
import { supabase } from "../utils/supabase";
import * as Crypto from "expo-crypto";
import { COLORS } from "../utils/constants";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [worker, setWorker] = useState(null);
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const navigation = useNavigation();

  const hashText = async (text) => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      text.toLowerCase().trim(),
    );
  };

  const handlePhoneSubmit = async () => {
    setError("");
    if (!phone || phone.length < 10) {
      setError("Enter valid phone number");
      return;
    }
    setLoading(true);
    try {
      const { data, error: dbErr } = await supabase
        .from("workers")
        .select("id, phone, name, security_question")
        .eq("phone", phone.trim())
        .single();
      if (dbErr || !data) {
        setError("Wrong phone number");
        return;
      }
      setWorker(data);
      setStep(2);
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async () => {
    setError("");
    if (!answer.trim()) {
      setError("Enter Answer");
      return;
    }
    setLoading(true);
    try {
      const ansHash = await hashText(answer);
      const { data, error: dbErr } = await supabase
        .from("workers")
        .select("id")
        .eq("phone", phone.trim())
        .eq("security_answer_hash", ansHash)
        .single();
      if (dbErr || !data) {
        setError("Wrong answer");
        return;
      }
      setStep(3);
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password should be atleast 6 characters");
      return;
    }
    if (password !== password2) {
      setError("Passwords aren't matching");
      return;
    }
    setLoading(true);
    try {
      const pwHash = await hashText(password);
      const { error: dbErr } = await supabase
        .from("workers")
        .update({ password_hash: pwHash })
        .eq("phone", phone.trim());
      if (dbErr) {
        setError("Password update failed");
        return;
      }
      navigation.navigate("Login");
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.inner}
      >
        <View style={s.container}>
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.title}>Password Reset</Text>

          <View style={s.steps}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[s.stepDot, step >= i && s.stepDotActive]} />
            ))}
          </View>

          {/* Step 1 — Phone */}
          {step === 1 && (
            <>
              <Text style={s.stepTitle}>Enter phone number</Text>
              <View style={s.field}>
                <Text style={s.prefix}>+91</Text>
                <View style={s.divider} />
                <TextInput
                  style={s.input}
                  placeholder="Phone number"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={10}
                />
              </View>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handlePhoneSubmit}
                disabled={loading}
              >
                <Text style={s.btnText}>
                  {loading ? "Searching..." : "Next →"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2 — Security Question */}
          {step === 2 && worker && (
            <>
              <Text style={s.stepTitle}>Security Question</Text>
              <View style={s.questionBox}>
                <Text style={s.questionText}>{worker.security_question}</Text>
              </View>
              <View style={s.field}>
                <TextInput
                  style={s.input}
                  placeholder="Enter Answer"
                  placeholderTextColor={COLORS.text3}
                  value={answer}
                  onChangeText={setAnswer}
                />
              </View>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleSecuritySubmit}
                disabled={loading}
              >
                <Text style={s.btnText}>
                  {loading ? "Verifying..." : "Verify →"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3 — New Password */}
          {step === 3 && (
            <>
              <Text style={s.stepTitle}>Setup new password</Text>
              <View style={s.field}>
                <TextInput
                  style={s.input}
                  placeholder="New password"
                  placeholderTextColor={COLORS.text3}
                  secureTextEntry={!showPw}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                  <Text style={s.eye}>{showPw ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.field}>
                <TextInput
                  style={s.input}
                  placeholder="Re-enter Password"
                  placeholderTextColor={COLORS.text3}
                  secureTextEntry={!showPw2}
                  value={password2}
                  onChangeText={setPassword2}
                />
                <TouchableOpacity onPress={() => setShowPw2(!showPw2)}>
                  <Text style={s.eye}>{showPw2 ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handlePasswordReset}
                disabled={loading}
              >
                <Text style={s.btnText}>
                  {loading ? "Updating..." : "Reset Password"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20, gap: 16 },
  back: { alignSelf: "flex-start" },
  backText: { color: COLORS.text3, fontSize: 14 },
  title: {
    color: COLORS.text1,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },
  steps: { flexDirection: "row", gap: 8 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: "#2563EB" },
  stepTitle: { color: COLORS.text2, fontSize: 15, fontWeight: "600" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    gap: 10,
  },
  prefix: { color: "#2563EB", fontSize: 14, fontWeight: "600" },
  divider: { width: 1, height: 18, backgroundColor: COLORS.border },
  input: { flex: 1, color: COLORS.text1, fontSize: 15 },
  eye: { fontSize: 16, color: COLORS.text3 },
  questionBox: {
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },
  questionText: { color: COLORS.text1, fontSize: 14, lineHeight: 22 },
  error: { color: "#EF4444", fontSize: 12 },
  btn: {
    backgroundColor: "#2563EB",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
