// ─── RouteCard.jsx ───────────────────────────────────────────────────────────
// Single route option card (Safest / Balanced / Fastest).
// Props: type, label, meta, selected, onPress

import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { getRouteColor } from '../utils/riskScore';

export default function RouteCard({ type, label, meta, badge, selected, onPress }) {
  const color = getRouteColor(type);
  return (
    <TouchableOpacity style={[styles.card, selected && { borderColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.info}>
        <Text style={styles.name}>{label}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.badgeText, { color }]}>{badge}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:      { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.07)', borderRadius:14, padding:15, marginBottom:10 },
  bar:       { width:4, height:42, borderRadius:2 },
  info:      { flex:1 },
  name:      { color:'#F1F5F9', fontSize:14, fontWeight:'700' },
  meta:      { color:'#475569', fontSize:11, marginTop:3 },
  badge:     { paddingHorizontal:10, paddingVertical:5, borderRadius:8 },
  badgeText: { fontSize:10, fontWeight:'700', letterSpacing:0.5 },
});
