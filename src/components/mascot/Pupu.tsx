import { Image, type ImageSourcePropType } from 'react-native';

/**
 * Pupu — the mascot the app is named after.
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
 * There are THREE images, and each one is a drawing that exists rather than a
 * pose faked with a transform. `cheer` in particular used to be the sitting
 * artwork moved differently, which was an honest workaround for not having the
 * picture and is strictly worse than having it: a celebration reads as a
 * celebration because of the character's face and paws, and no amount of
 * squash-and-stretch on a calm sitting dog supplies either.
 *
 * Everything the app still cannot draw — dozing, arriving — remains carried by
 * motion in `PupuScene`. That is a real constraint, and it is why the mascot's
 * vocabulary is deliberately small.
 */

export type PupuImage = 'sit' | 'phone' | 'cheer';

const SOURCES: Record<PupuImage, ImageSourcePropType> = {
  /** Sitting, looking at you. The default, and the basis of every pose. */
  sit: require('../../../assets/mascot/pupu-sit.webp'),
  /** Holding a phone, with the notification marks already drawn in. */
  phone: require('../../../assets/mascot/pupu-phone.webp'),
  /** Both paws up, eyes shut, excitement marks drawn in. The celebration. */
  cheer: require('../../../assets/mascot/pupu-cheer.webp'),
};

export function Pupu({ size = 200, image = 'sit' }: { size?: number; image?: PupuImage }) {
  return (
    <Image
      source={SOURCES[image]}
      // `contain` inside a square box, because the three files do NOT share an
      // aspect ratio (768x768, 768x709 and 768x705). Forcing them all to a
      // square would quietly squash two of the three.
      resizeMode="contain"
      style={{ width: size, height: size }}
      // Decorative: every screen Pupu appears on states its meaning in adjacent
      // text, so an illustration that announced itself would read the same beat
      // twice. An illustration is either meaningful and labelled or decorative
      // and hidden — never unlabelled and focusable.
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
