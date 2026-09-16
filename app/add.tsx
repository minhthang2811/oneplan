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
import { useT } from '../src/i18n';
import { usePlanStore } from '../src/store/usePlanStore';
import { EMOJI_CHOICES, TAGS, SUGGESTIONS, tagLabel } from '../src/data/seed';
import { SLOT_ORDER, slotLabel, formatDurationShort, formatClock, type Slot } from '../src/lib/time';
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
  const { t } = useT();
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
          {
            options: [t('add.discardAction'), t('add.keepEditing')],
            destructiveButtonIndex: 0,
            cancelButtonIndex: 1,
          },
          (i) => { if (i === 0) discard(); }
        );
      } else {
        Alert.alert(t('add.discardTitle'), t('add.discardBody'), [
          { text: t('add.keepEditing'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: discard },
        ]);
      }
    });
    return unsub;
  }, [navigation, t]);

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
          <Txt variant="body" tone="muted">{t('common.cancel')}</Txt>
        </Pressable>
        <Txt variant="title">{t(isInbox ? 'add.newTodo' : 'add.newActivity')}</Txt>
        <Pressable onPress={() => save()} hitSlop={10} disabled={!title.trim()} accessibilityRole="button">
          <Txt variant="title" tone={title.trim() ? 'accent' : 'faint'}>{t('common.add')}</Txt>
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
            accessibilityLabel={t('add.chooseIcon')}
          >
            <EmojiAvatar emoji={emoji} tint={tint} size={52} />
          </PressScale>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            placeholder={t(isInbox ? 'add.placeholderTodo' : 'add.placeholderActivity')}
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
              <FieldLabel>{t('add.icon')}</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {EMOJI_CHOICES.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => { haptic.tick(); setEmoji(e); }}
                    accessibilityRole="button"
                    accessibilityLabel={t('add.iconA11y', { emoji: e })}
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
              <FieldLabel>{t('add.colour')}</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {TINT_NAMES.map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => { haptic.tick(); setTint(name); }}
                    accessibilityRole="button"
                    accessibilityLabel={t('add.colourA11y', { name })}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      borderWidth: tint === name ? 2.5 : 0, borderColor: c.ink,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <EmojiAvatar emoji="" tint={name} size={tint === name ? 26 : 34} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {!title.trim() && !pickingEmoji ? (
          <View>
            <FieldLabel>{t('add.quickPick')}</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s.key}
                  label={`${s.emoji}  ${t(s.key)}`}
                  onPress={() => {
                    haptic.tick();
                    setTitle(t(s.key)); setEmoji(s.emoji); setTint(s.tint); setMinutes(s.minutes);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <FieldLabel>{t('add.howLong')}</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={formatDurationShort(d)}
                selected={minutes === d}
                onPress={() => { haptic.tick(); setMinutes(d); }}
              />
            ))}
          </View>
        </View>

        {!isInbox ? (
          <View>
            <FieldLabel>{t('add.when')}</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {SLOT_ORDER.map((s) => (
                <Chip
                  key={s}
                  label={slotLabel(s)}
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
            <FieldLabel>{t('add.startsAt')}</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <Chip
                label={t('add.noSetTime')}
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
          <FieldLabel>{t('add.tag')}</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {TAGS.map((id) => (
              <Chip
                key={id}
                label={tagLabel(id)}
                selected={tag === id}
                onPress={() => { haptic.tick(); setTag(tag === id ? null : id); }}
              />
            ))}
          </View>
        </View>

        <View>
          <FieldLabel>{t('add.steps')}</FieldLabel>
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
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('add.removeStep', { title: s })}
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
                placeholder={t('add.stepPlaceholder')}
                placeholderTextColor={c.inkFaint}
                returnKeyType="done"
                style={{ flex: 1, color: c.ink, fontFamily: 'Inter_400Regular', fontSize: 15, paddingVertical: space.md }}
              />
              <Icon name="plus" size={14} color={c.inkFaint} weight="semibold" />
            </View>
          </View>
        </View>

        <Button label={t('add.addActivity')} onPress={() => save()} disabled={!title.trim()} />
      </KeyboardAwareScrollView>
    </View>
  );
}
