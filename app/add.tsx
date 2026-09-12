import { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, ActionSheetIOS, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Txt } from '../src/components/Txt';
import { Icon } from '../src/components/Icon';
import { Chip, FieldLabel } from '../src/components/Chip';
import { EmojiAvatar } from '../src/components/EmojiAvatar';
import { Button } from '../src/components/Button';
import { PressScale } from '../src/components/Press';
import { useTheme } from '../src/theme/useTheme';
import { radius, space, TINT_NAMES, type TintName } from '../src/theme/tokens';
import { usePlanStore } from '../src/store/usePlanStore';
import { EMOJI_CHOICES, TAGS, SUGGESTIONS } from '../src/data/seed';
import { SLOT_ORDER, SLOT_LABEL, formatDuration, formatClock, type Slot } from '../src/lib/time';
import { haptic } from '../src/lib/haptics';

const DURATIONS = [5, 15, 30, 45, 60, 90];

/**
 * Start times offered per slot, as minutes from midnight.
 *
 * Presets rather than a wheel: the whole point of the loose morning/afternoon/
 * evening model is that most activities do not need a precise clock time. The
 * few that do are nearly always on the hour, and a chip is one tap where a
 * picker is four.
 */
const START_TIMES: Record<Slot, number[]> = {
  anytime: [],
  morning: [6, 7, 8, 9, 10, 11].map((h) => h * 60),
  afternoon: [12, 13, 14, 15, 16].map((h) => h * 60),
  evening: [17, 18, 19, 20, 21, 22].map((h) => h * 60),
};

export default function Add() {
  const params = useLocalSearchParams<{ date?: string; slot?: Slot; inbox?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const navigation = useNavigation();
  const addTask = usePlanStore((s) => s.addTask);

  const isInbox = params.inbox === '1';
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📌');
  const [tint, setTint] = useState<TintName>('lilac');
  const [minutes, setMinutes] = useState(15);
  const [slot, setSlot] = useState<Slot>(params.slot ?? 'anytime');
  const [tag, setTag] = useState<string | null>(null);
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [stepDraft, setStepDraft] = useState('');
  const [pickingEmoji, setPickingEmoji] = useState(false);

  const dirty = title.trim().length > 0 || steps.length > 0;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const savingRef = useRef(false);

  /**
   * Unsaved work in a modal asks before it disappears. `usePreventRemove` is
   * not exported by expo-router, so this uses the `beforeRemove` event that
   * hook is built on.
   */
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (!dirtyRef.current || savingRef.current) return;
      e.preventDefault();
      const discard = () => { savingRef.current = true; navigation.dispatch(e.data.action); };
      if (process.env.EXPO_OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ['Discard activity', 'Keep editing'], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
          (i) => { if (i === 0) discard(); }
        );
      } else {
        Alert.alert('Discard activity?', 'It has not been added yet.', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: discard },
        ]);
      }
    });
    return unsub;
  }, [navigation]);

  const save = (submitted?: string) => {
    const v = (submitted ?? title).trim();
    if (!v) return;
    savingRef.current = true;
    haptic.success();
    addTask({
      title: v, emoji, tint, minutes, slot, tag, startMinutes,
      date: isInbox ? null : (params.date ?? undefined),
      priority: isInbox ? 'medium' : 'todo',
      steps: steps.map((s, i) => ({ id: `s${Date.now()}${i}`, title: s, done: false })),
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: space.base, paddingTop: space.base, paddingBottom: space.md,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Txt variant="body" tone="muted">Cancel</Txt>
        </Pressable>
        <Txt variant="title">{isInbox ? 'New to-do' : 'New activity'}</Txt>
        <Pressable onPress={() => save()} hitSlop={10} disabled={!title.trim()} accessibilityRole="button">
          <Txt variant="title" tone={title.trim() ? 'accent' : 'faint'}>Add</Txt>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{
          paddingHorizontal: space.base,
          paddingBottom: insets.bottom + space.huge,
          gap: space.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title + identity */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <PressScale
            onPress={() => { haptic.tap(); setPickingEmoji((p) => !p); }}
            accessibilityRole="button"
            accessibilityLabel="Choose an icon"
          >
            <EmojiAvatar emoji={emoji} tint={tint} size={52} />
          </PressScale>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder={isInbox ? 'What needs doing?' : 'What are you doing?'}
            placeholderTextColor={c.inkFaint}
            returnKeyType="done"
            onSubmitEditing={(e) => save(e.nativeEvent.text)}
            style={{
              flex: 1, color: c.ink, fontFamily: 'Inter_600SemiBold',
              fontSize: 19, paddingVertical: space.sm,
            }}
          />
        </View>

        {pickingEmoji ? (
          <View style={{ gap: space.base }}>
            <View>
              <FieldLabel>Icon</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {EMOJI_CHOICES.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => { haptic.tick(); setEmoji(e); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Icon ${e}`}
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: emoji === e ? c.accentSoft : c.surfaceSunken,
                      borderWidth: emoji === e ? 1.5 : 0, borderColor: c.accent,
                    }}
                  >
                    <Txt style={{ fontSize: 20 }} allowFontScaling={false}>{e}</Txt>
                  </Pressable>
                ))}
              </View>
            </View>
            <View>
              <FieldLabel>Colour</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {TINT_NAMES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => { haptic.tick(); setTint(t); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Colour ${t}`}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      borderWidth: tint === t ? 2.5 : 0, borderColor: c.ink,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <EmojiAvatar emoji="" tint={t} size={tint === t ? 26 : 34} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {!title.trim() && !pickingEmoji ? (
          <View>
            <FieldLabel>Quick pick</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s.title}
                  label={`${s.emoji}  ${s.title}`}
                  onPress={() => {
                    haptic.tick();
                    setTitle(s.title); setEmoji(s.emoji); setTint(s.tint); setMinutes(s.minutes);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <FieldLabel>How long</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={formatDuration(d)}
                selected={minutes === d}
                onPress={() => { haptic.tick(); setMinutes(d); }}
              />
            ))}
          </View>
        </View>

        {!isInbox ? (
          <View>
            <FieldLabel>When</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {SLOT_ORDER.map((s) => (
                <Chip
                  key={s}
                  label={SLOT_LABEL[s]}
                  selected={slot === s}
                  onPress={() => {
                    haptic.tick();
                    setSlot(s);
                    // A time from the old slot would contradict the new one.
                    setStartMinutes(null);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {!isInbox && START_TIMES[slot].length > 0 ? (
          <View>
            <FieldLabel>Starts at</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <Chip
                label="No set time"
                selected={startMinutes === null}
                onPress={() => { haptic.tick(); setStartMinutes(null); }}
              />
              {START_TIMES[slot].map((m) => (
                <Chip
                  key={m}
                  label={formatClock(m)}
                  selected={startMinutes === m}
                  onPress={() => { haptic.tick(); setStartMinutes(m); }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <FieldLabel>Tag</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {TAGS.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={tag === t}
                onPress={() => { haptic.tick(); setTag(tag === t ? null : t); }}
              />
            ))}
          </View>
        </View>

        <View>
          <FieldLabel>Steps</FieldLabel>
          <View style={{ gap: space.sm }}>
            {steps.map((s, i) => (
              <View
                key={`${s}-${i}`}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: space.md,
                  backgroundColor: c.surfaceSunken, borderRadius: radius.input, borderCurve: 'continuous',
                  paddingHorizontal: space.md, paddingVertical: space.md,
                }}
              >
                <Icon name="circle" size={16} color={c.inkFaint} />
                <Txt variant="body" style={{ flex: 1 }}>{s}</Txt>
                <Pressable
                  onPress={() => { haptic.tap(); setSteps((p) => p.filter((_, j) => j !== i)); }}
                  hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove step ${s}`}
                >
                  <Icon name="xmark" size={13} color={c.inkFaint} weight="semibold" />
                </Pressable>
              </View>
            ))}
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: space.sm,
                borderRadius: radius.input, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed',
                borderColor: c.hairline, paddingHorizontal: space.md, minHeight: 46,
              }}
            >
              <TextInput
                value={stepDraft}
                onChangeText={setStepDraft}
                onSubmitEditing={() => {
                  const v = stepDraft.trim();
                  if (!v) return;
                  haptic.tick();
                  setSteps((p) => [...p, v]);
                  setStepDraft('');
                }}
                submitBehavior="submit"
                placeholder="Break it into steps"
                placeholderTextColor={c.inkFaint}
                returnKeyType="done"
                style={{ flex: 1, color: c.ink, fontFamily: 'Inter_400Regular', fontSize: 15, paddingVertical: space.md }}
              />
              <Icon name="plus" size={14} color={c.inkFaint} weight="semibold" />
            </View>
          </View>
        </View>

        <Button label="Add activity" onPress={() => save()} disabled={!title.trim()} />
      </KeyboardAwareScrollView>
    </View>
  );
}
