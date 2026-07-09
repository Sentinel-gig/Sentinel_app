// ─── BottomNav.jsx ───────────────────────────────────────────────────────────
// Custom bottom tab bar. Used inside each main screen.
// activeTab: 'home' | 'map' | 'report' | 'activity' | 'more'

import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { id:'home',     icon:'🏠', label:'Home'     },
  { id:'map',      icon:'🗺️', label:'Map'      },
  { id:'report',   icon:'⚠️', label:'Report'   },
  { id:'activity', icon:'🕐', label:'Activity' },
  { id:'more',     icon:'📋', label:'More'     },
];

export default function BottomNav({ activeTab, onTabPress }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingBottom: insets.bottom + 10 }]}>
      {TABS.map(tab => (
        <TouchableOpacity key={tab.id} style={styles.item} onPress={() => onTabPress(tab.id)}>
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text style={[styles.label, activeTab === tab.id && styles.active]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav:    { flexDirection:'row', justifyContent:'space-around', backgroundColor:'rgba(8,13,24,0.98)', paddingTop:10 },
  item:   { alignItems:'center', gap:3, paddingHorizontal:8 },
  icon:   { fontSize:18 },
  label:  { color:'#475569', fontSize:9, fontWeight:'700', letterSpacing:0.5 },
  active: { color:'#4F8EF7' },
});
