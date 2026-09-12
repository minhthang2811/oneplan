import * as Haptics from 'expo-haptics';

/**
 * Haptics are punctuation: one per user action, on the same frame as the
 * visual, never the only feedback and never in a loop.
 */
export const haptic = {
  /** A value crossed a step (dial tick, segment change). */
  tick: () => Haptics.selectionAsync(),
  /** Something snapped home (sheet settled, item committed). */
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** A weightier commit (task completed, timer started). */
  bump: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** An outcome the user was waiting for. */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
