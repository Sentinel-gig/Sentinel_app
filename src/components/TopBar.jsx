// ─── TopBar.jsx ──────────────────────────────────────────────────────────────
// Top navigation bar shown on every screen.
// Shows Sentinel logo + language toggle button.

import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SentinelLogo from './SentinelLogo';
import useAppStore from '../store/useAppStore';

export default function TopBar() {
  const { lang, setLang } = useAppStore();
  return (
    <View style={styles.bar}>
      <SentinelLogo size="sm" />
      <TouchableOpacity style={styles.langBtn} onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}>
        <Text style={styles.langText}>{lang === 'en' ? 'हि' : 'EN'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:22, paddingTop:16, paddingBottom:10 },
  langBtn: { backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.07)', borderRadius:20, paddingHorizontal:13, paddingVertical:7 },
  langText:{ color:'#94A3B8', fontSize:11, fontWeight:'700', letterSpacing:0.5 },
});
