import { Image, type ImageSourcePropType } from 'react-native';

/**
 * Pip — the Oneplan mascot.
 *
 * This renders the ORIGINAL artwork. An earlier version of this file redrew the
 * character as react-native-svg paths, which bought arbitrary poses and
 * token-driven recolouring at the cost of not actually being the character. The
 * supplied art is the specification, not a reference for a copy.
 *
 * Using the real files also deleted a whole mechanism: the artwork already has
 * the pale die-cut sticker border baked in, which is exactly what a dark canvas
 * needs to keep a dark-outlined character from dissolving into it. The vector
 * version had to reconstruct that border with an extra pass of every silhouette
 * shape, and only in dark mode. Here it is simply part of the picture.
 *
 * Shipped as WebP: ~75KB each against ~500KB for the same PNG, alpha intact.
 * React Native decodes WebP through ImageIO on iOS and natively on Android.
 *
 * There are TWO images, so there are two looks. Everything else — celebrating,
 * dozing, arriving — is carried by motion in `PipScene`, not by a third
 * drawing. That is a real constraint and it is why the mascot's vocabulary is
 * deliberately small.
 */

export type PipImage = 'sit' | 'phone';

const SOURCES: Record<PipImage, ImageSourcePropType> = {
  /** Sitting, looking at you. The default, and the basis of every pose. */
  sit: require('../../../assets/mascot/pip-sit.webp'),
  /** Holding a phone, with the notification marks already drawn in. */
  phone: require('../../../assets/mascot/pip-phone.webp'),
};

export function Pip({ size = 200, image = 'sit' }: { size?: number; image?: PipImage }) {
  return (
    <Image
      source={SOURCES[image]}
      // `contain` inside a square box, because the two files do NOT share an
      // aspect ratio (768x768 and 768x709). Forcing both to a square would
      // quietly squash the one holding the phone.
      resizeMode="contain"
      style={{ width: size, height: size }}
      // Decorative: every screen Pip appears on states its meaning in adjacent
      // text, so an illustration that announced itself would read the same beat
      // twice. An illustration is either meaningful and labelled or decorative
      // and hidden — never unlabelled and focusable.
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
