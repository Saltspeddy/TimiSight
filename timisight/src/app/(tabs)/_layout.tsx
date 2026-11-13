import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icon, Label, VectorIcon } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { Brand } from '@/constants/brand';
import { useLang } from '@/hooks/use-lang';

export default function TabsLayout() {
  const [, t] = useLang();

  return (
    <NativeTabs
      backgroundColor={Brand.paper}
      indicatorColor={Brand.yellow}
      labelStyle={{ color: Brand.ink, selected: { color: Brand.blue } }}>
      <NativeTabs.Trigger name="index">
        <Label>{t.tabs.home}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="home" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="places">
        <Label>{t.tabs.places}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="place" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shop">
        <Label>{t.tabs.shop}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="shopping-cart" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="leaderboard">
        <Label>{t.tabs.board}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="leaderboard" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
