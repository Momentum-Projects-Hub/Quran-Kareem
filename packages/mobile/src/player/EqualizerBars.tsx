import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const BAR_COUNT = 4;
const BAR_MIN_HEIGHT = 6;
const BAR_MAX_HEIGHT = 20;

interface EqualizerBarsProps {
  active: boolean;
}

export function EqualizerBars({ active }: EqualizerBarsProps) {
  const values = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(value, { toValue: 1, duration: 420, easing: Easing.ease, useNativeDriver: false }),
          Animated.timing(value, { toValue: 0, duration: 420, easing: Easing.ease, useNativeDriver: false }),
        ]),
      ),
    );

    if (active) {
      loops.forEach((loop) => loop.start());
    } else {
      loops.forEach((loop) => loop.stop());
      values.forEach((value) => value.setValue(0));
    }

    return () => loops.forEach((loop) => loop.stop());
  }, [active, values]);

  return (
    <View style={styles.row}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              height: value.interpolate({
                inputRange: [0, 1],
                outputRange: [BAR_MIN_HEIGHT, BAR_MAX_HEIGHT],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: BAR_MAX_HEIGHT,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#fbbf24',
  },
});
