import { Redirect } from 'expo-router';
import { usePlanStore } from '../src/store/usePlanStore';

/**
 * The anchor route. It resolves on the first frame because MMKV rehydration is
 * synchronous — and it is also where a blocked `Stack.Protected` guard lands,
 * so a guard bounce always ends somewhere valid.
 */
export default function Index() {
  const onboarded = usePlanStore((s) => s.onboarded);
  return <Redirect href={onboarded ? '/(tabs)/today' : '/onboarding/welcome'} />;
}
