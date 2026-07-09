import { View, Text } from 'react-native';

export default function SentinelLogo({ size = 'md' }) {
  const h1 = size === 'lg' ? 36 : size === 'sm' ? 20 : 28;
  const h2 = size === 'lg' ? 25 : size === 'sm' ? 14 : 20;
  const fs = size === 'lg' ? 26 : size === 'sm' ? 16 : 20;
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
      <View style={{ flexDirection:'row', alignItems:'flex-end', gap:5 }}>
        <View style={{ width:h1*0.4, height:h1, backgroundColor:'white', borderRadius:3 }} />
        <View style={{ width:h1*0.4, height:h2, backgroundColor:'white', borderRadius:3 }} />
      </View>
      <View style={{ width:1, height:h1+8, backgroundColor:'rgba(255,255,255,0.2)' }} />
      <View>
        <Text style={{ color:'white', fontSize:fs, fontWeight:'800', letterSpacing:3 }}>SENTINEL</Text>
        <Text style={{ color:'rgba(255,255,255,0.35)', fontSize:7, letterSpacing:2.5, marginTop:2 }}>BY SECURED SYSTEMS</Text>
      </View>
    </View>
  );
}