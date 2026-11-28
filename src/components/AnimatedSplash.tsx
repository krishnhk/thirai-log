import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const LID = require('../../assets/logo/mark-lid.png');
const IRIS = require('../../assets/logo/mark-iris.png');
// A halftone dot pattern, red dots growing toward the bottom (red on transparent), behind the mark.
const HALFTONE = require('../../assets/images/splash-halftone.png');

// Near-black splash with the mark in cinema red, the same colours as the app icon and the ThiraiDesk
// theme: red mark and the whole title in cinema red.
const BACKGROUND = '#1f2022';
const DENIM = '#e5484d';
const MARK_WIDTH = 140;
const MARK_HEIGHT = Math.round((MARK_WIDTH * 121) / 152);
const LETTERS = 'thirailog'.split('');
const LETTER_STAGGER = 80;
const LETTERS_START = 900;
const HOLD_MS = 600;
const FADE_MS = 350;

interface AnimatedSplashProps {
  /** Called once the animation has finished and faded out. */
  onDone: () => void;
}

/**
 * The "Lid opens" splash: the lid lifts from closed, the iris pops in, then the title rises letter
 * by letter. It starts on the same sand colour as the native splash, so the hand-over is seamless.
 */
export function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const [lid] = useState(() => new Animated.Value(0));
  const [iris] = useState(() => new Animated.Value(0));
  const [letters] = useState(() => LETTERS.map(() => new Animated.Value(0)));
  const [overall] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(lid, {
          toValue: 1,
          duration: 1000,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(iris, {
          toValue: 1,
          duration: 600,
          delay: 900,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        ...letters.map((value, index) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 600,
            delay: LETTERS_START + index * LETTER_STAGGER,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ]),
      Animated.delay(HOLD_MS),
      Animated.timing(overall, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => animation.stop();
  }, [lid, iris, letters, overall, onDone]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: BACKGROUND, opacity: overall }]}
      pointerEvents="none"
    >
      <Animated.Image
        source={HALFTONE}
        resizeMode="cover"
        // An explicit width and height: without them the web build keeps the picture's own size and only its
        // empty top corner shows.
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: lid }]}
      />
      <View style={styles.center}>
        <View style={{ width: MARK_WIDTH, height: MARK_HEIGHT }}>
          <Animated.Image
            source={LID}
            resizeMode="contain"
            tintColor={DENIM}
            style={[
              styles.layer,
              {
                opacity: lid.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0, 1, 1],
                }),
                transform: [
                  {
                    translateY: lid.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.Image
            source={IRIS}
            resizeMode="contain"
            tintColor={DENIM}
            style={[
              styles.layer,
              {
                opacity: iris.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 1, 1],
                }),
                transform: [{ scale: iris }],
              },
            ]}
          />
        </View>
        <View style={styles.title}>
          {LETTERS.map((char, index) => (
            <Animated.Text
              key={index}
              allowFontScaling={false}
              style={[
                styles.letter,
                {
                  color: DENIM,
                  opacity: letters[index],
                  transform: [
                    {
                      translateY: letters[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [22, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: MARK_WIDTH,
    height: MARK_HEIGHT,
  },
  title: {
    flexDirection: 'row',
  },
  letter: {
    fontFamily: 'Righteous_400Regular',
    fontSize: 60,
    // Tall enough line box that Android does not clip the descender of the "g".
    lineHeight: 104,
    letterSpacing: 0.3,
    includeFontPadding: true,
    paddingBottom: 6,
    paddingRight: 2,
  },
});
