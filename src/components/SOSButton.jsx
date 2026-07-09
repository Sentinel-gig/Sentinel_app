// ─── SOSButton.jsx ───────────────────────────────────────────────────────────
// Hold for 2 seconds to trigger SOS.
// Shows a progress bar while holding. Calls onTrigger() when threshold reached.

import { useRef, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';

export default function SOSButton({ onTrigger }) {
  const [holding, setHolding] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const anim     = useRef(null);

  const handlePressIn = () => {
    setHolding(true);
    anim.current = Animated.timing(progress, {
      toValue: 1, duration: 2000, useNativeDriver: false,
    });
    anim.current.start(({ finished }) => {
      if (finished) { setHolding(false); progress.setValue(0); onTrigger(); }
    });
  };

  const handlePressOut = () => {
    setHolding(false);
    if (anim.current) anim.current.stop();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const width = progress.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] });

  return (
    <TouchableOpacity style={[styles.btn, holding && styles.holding]} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
      <Text style={styles.label}>{holding ? 'Release to Cancel' : 'Hold for SOS'}</Text>
      <Animated.View style={[styles.progress, { width }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn:      { width:'100%', height:70, backgroundColor:'#DC2626', borderRadius:18, alignItems:'center', justifyContent:'center', overflow:'hidden', marginBottom:8 },
  holding:  { backgroundColor:'#B91C1C' },
  label:    { color:'white', fontSize:18, fontWeight:'800', letterSpacing:2 },
  progress: { position:'absolute', bottom:0, left:0, height:3, backgroundColor:'rgba(255,255,255,0.5)' },
});
