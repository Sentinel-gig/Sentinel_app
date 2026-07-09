// ─── StatusPill.jsx ──────────────────────────────────────────────────────────
// Shows "Protected" (green) or "Inactive" (grey) based on shift state.

import { View, Text, StyleSheet } from 'react-native';

export default function StatusPill({ active }) {
  return (
    <View style={[styles.pill, active ? styles.active : styles.inactive]}>
      <View style={[styles.dot, active ? styles.dotActive : styles.dotInactive]} />
      <Text style={[styles.label, { color: active ? '#22C55E' : '#475569' }]}>
        {active ? 'Protected' : 'Inactive'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill:        { flexDirection:'row', alignItems:'center', gap:7, paddingHorizontal:14, paddingVertical:6, borderRadius:20, alignSelf:'flex-start', marginTop:12 },
  active:      { backgroundColor:'rgba(34,197,94,0.12)', borderWidth:1, borderColor:'rgba(34,197,94,0.2)' },
  inactive:    { backgroundColor:'rgba(30,41,59,1)',     borderWidth:1, borderColor:'rgba(255,255,255,0.07)' },
  dot:         { width:7, height:7, borderRadius:4 },
  dotActive:   { backgroundColor:'#22C55E' },
  dotInactive: { backgroundColor:'#475569' },
  label:       { fontSize:12, fontWeight:'700', letterSpacing:0.5 },
});
