import { useLocalSearchParams } from 'expo-router';

import { FlowerView } from '@/components/flower-view';

export default function FlowerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FlowerView id={id} />;
}