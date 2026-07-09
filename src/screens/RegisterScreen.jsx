import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../utils/supabase";
import * as Crypto from "expo-crypto";
import { COLORS } from "../utils/constants";
import useAppStore from "../store/useAppStore";

const CITIES = ["Kanpur", "Mumbai", "Delhi", "Bangalore"];
const VEHICLES = ["Bike", "Car", "Auto", "Cycle"];
const PLATFORMS = [
  "Swiggy",
  "Zomato",
  "Blinkit",
  "Rapido",
  "Ola",
  "Urban Company",
  "Other",
];
const SECURITY_QUESTIONS = [
  "Mothers Name?",
  "First School?",
  "First Pet",
  "Favorite Food?",
  "Vehicle Number?",
];

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1=basic, 2=password, 3=security
  const { login } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [platform, setPlatform] = useState("");

  // Step 2
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // Step 3
  const [secQuestion, setSecQuestion] = useState("");
  const [secAnswer, setSecAnswer] = useState("");

  const hashText = async (text) => {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      text.toLowerCase().trim(),
    );
    return digest;
  };

  const validateStep1 = () => {
    if (!phone || phone.length < 10) return "Valid phone number ";
    if (!name.trim()) return "Name : ";
    if (!city) return "City";
    if (!vehicle) return "Vehicle type";
    if (!platform) return "Platform";
    return null;
  };

  const validateStep2 = () => {
    if (password.length < 6) return "Password should be atleast 6 characters";
    if (password !== password2) return "Passwords Not Matching";
    return null;
  };

  const validateStep3 = () => {
    if (!secQuestion) return "Security question ?";
    if (!secAnswer.trim()) return "Security answer";
    return null;
  };

  const handleNext = () => {
    setError("");
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setError(err);
        return;
      }
      setStep(3);
    }
  };

  const handleRegister = async () => {
    const err = validateStep3();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    try {
      const pwHash = await hashText(password);
      const ansHash = await hashText(secAnswer);

      const { data, error: dbErr } = await supabase
        .from("workers")
        .insert([
          {
            phone: phone.trim(),
            name: name.trim(),
            city: city,
            vehicle_type: vehicle,
            platform: platform,
            password_hash: pwHash,
            security_question: secQuestion,
            security_answer_hash: ansHash,
          },
        ])
        .select()
        .single();

      if (dbErr) {
        if (dbErr.code === "23505") {
          setError("phone number already registered");
        } else {
          setError("Registration failed : " + dbErr.message);
        }
        return;
      }

      // Save to local store
      login({
        name: data.name,
        phone: data.phone,
        city: data.city,
        id: data.id,
      });
    } catch (e) {
      setError("Something went wrong :" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const SelectRow = ({ label, options, value, onSelect }) => (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chips}
      >
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[s.chip, value === opt && s.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[s.chipText, value === opt && s.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.inner}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.bars}>
              <View style={s.bar1} />
              <View style={s.bar2} />
            </View>
            <Text style={s.title}>SENTINEL</Text>
            <Text style={s.sub}>Create new account :</Text>
          </View>

          {/* Steps indicator */}
          <View style={s.steps}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[s.stepDot, step >= i && s.stepDotActive]} />
            ))}
          </View>

          {/* Step 1 — Basic Info */}
          {step === 1 && (
            <View style={s.form}>
              <Text style={s.stepTitle}>Basic Details</Text>

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

              <View style={s.field}>
                <TextInput
                  style={s.input}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.text3}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <SelectRow
                label="City"
                options={CITIES}
                value={city}
                onSelect={setCity}
              />
              <SelectRow
                label="Vehicle"
                options={VEHICLES}
                value={vehicle}
                onSelect={setVehicle}
              />
              <SelectRow
                label="Platform"
                options={PLATFORMS}
                value={platform}
                onSelect={setPlatform}
              />
            </View>
          )}

          {/* Step 2 — Password */}
          {step === 2 && (
            <View style={s.form}>
              <Text style={s.stepTitle}>Password Set Karo</Text>

              <View style={s.field}>
                <TextInput
                  style={s.input}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={COLORS.text3}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View style={s.field}>
                <TextInput
                  style={s.input}
                  placeholder="Re-Enter Password"
                  placeholderTextColor={COLORS.text3}
                  secureTextEntry
                  value={password2}
                  onChangeText={setPassword2}
                />
              </View>
            </View>
          )}

          {/* Step 3 — Security */}
          {step === 3 && (
            <View style={s.form}>
              <Text style={s.stepTitle}>Security Question</Text>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Question select karo</Text>
                {SECURITY_QUESTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[s.qCard, secQuestion === q && s.qCardActive]}
                    onPress={() => setSecQuestion(q)}
                  >
                    <Text style={[s.qText, secQuestion === q && s.qTextActive]}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.field}>
                <TextInput
                  style={s.input}
                  placeholder="Your answer :"
                  placeholderTextColor={COLORS.text3}
                  value={secAnswer}
                  onChangeText={setSecAnswer}
                />
              </View>
            </View>
          )}

          {/* Error */}
          {error ? <Text style={s.error}>{error}</Text> : null}

          {/* Buttons */}
          <View style={s.btns}>
            {step > 1 && (
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                <Text style={s.backBtnText}>← Back</Text>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity style={s.btn} onPress={handleNext}>
                <Text style={s.btnText}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={s.btnText}>
                  {loading ? "Working..." : "Register"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Login link */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={s.loginLink}
          >
            <Text style={s.loginText}>
              Existing Account? <Text style={s.loginTextBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: "center", paddingTop: 32, paddingBottom: 24 },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: 12,
  },
  bar1: { width: 10, height: 28, backgroundColor: "white", borderRadius: 3 },
  bar2: {
    width: 10,
    height: 20,
    backgroundColor: "white",
    borderRadius: 3,
    opacity: 0.7,
  },
  title: { color: "white", fontSize: 28, fontWeight: "800", letterSpacing: 3 },
  sub: { color: COLORS.text3, fontSize: 13, marginTop: 4 },
  steps: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: "#2563EB" },
  stepTitle: {
    color: COLORS.text1,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  form: { gap: 12 },
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
  fieldGroup: { gap: 8 },
  fieldLabel: {
    color: COLORS.text3,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  chips: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg2,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  chipText: { color: COLORS.text3, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "white" },
  qCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg2,
    marginBottom: 6,
  },
  qCardActive: {
    borderColor: "#2563EB",
    backgroundColor: "rgba(37,99,235,0.1)",
  },
  qText: { color: COLORS.text3, fontSize: 13 },
  qTextActive: { color: "#2563EB", fontWeight: "600" },
  error: { color: "#EF4444", fontSize: 12, textAlign: "center", marginTop: 8 },
  btns: { flexDirection: "row", gap: 10, marginTop: 24 },
  btn: {
    flex: 1,
    backgroundColor: "#2563EB",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "white", fontSize: 15, fontWeight: "700" },
  backBtn: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { color: COLORS.text2, fontSize: 14, fontWeight: "600" },
  loginLink: { alignItems: "center", marginTop: 20 },
  loginText: { color: COLORS.text3, fontSize: 13 },
  loginTextBold: { color: "#2563EB", fontWeight: "600" },
});
