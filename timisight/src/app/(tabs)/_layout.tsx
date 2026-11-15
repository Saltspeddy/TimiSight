import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icon, Label, VectorIcon } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { Brand } from '@/constants/brand';
import { RC, ROLE_STYLE } from '@/constants/roles';
import { useLang } from '@/hooks/use-lang';
import { useRole } from '@/hooks/use-role';

// The tab bar depends on who is signed in:
//   visitor       Home, Garden, Shop, Leaderboard, Account
//   organization  Home, Artists, Commissions, My flowers, Account
//   artist        Home, Commissions, My works, Account
// Every screen stays registered; the ones a role doesn't use are just hidden from the bar.
export default function TabsLayout() {
  const [lang, t] = useLang();
  const c = RC[lang];
  const { role, phase } = useRole();

  // Until the database has answered, show only what every role has (Home and Account), so
  // nobody briefly sees tabs they can't use. If the lookup fails, fall back to the visitor
  // tabs so the app stays usable.
  const known = phase === 'ready' || phase === 'error';
  const current = known ? (role ?? 'user') : null;
  const isUser = current === 'user';
  const isOrg = current === 'organization';
  const isArtist = current === 'artist';

  return (
    <NativeTabs
      backgroundColor={Brand.paper}
      // The highlight behind the selected tab changes colour with the role.
      indicatorColor={ROLE_STYLE[current ?? 'user'].indicator}
      // Strong ink icons by default (not the muted OS gray); blue when selected
      // to match the label color below.
      iconColor={{ default: Brand.ink, selected: Brand.blue }}
      labelStyle={{ color: Brand.ink, selected: { color: Brand.blue } }}>
      <NativeTabs.Trigger name="index">
        <Label>{t.tabs.home}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="home" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="places" hidden={!isUser}>
        <Label>{t.tabs.places}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="eco" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shop" hidden={!isUser}>
        <Label>{t.tabs.shop}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="shopping-cart" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="leaderboard" hidden={!isUser}>
        <Label>{t.tabs.board}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="leaderboard" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="artists" hidden={!isOrg}>
        <Label>{c.tabArtists}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="palette" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="commissions" hidden={!isOrg && !isArtist}>
        <Label>{c.tabCommissions}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="forum" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="works" hidden={!isArtist && !isOrg}>
        <Label>{isOrg ? c.tabFlowers : c.tabWorks}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="collections" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <Label>{t.tabs.account}</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="person" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
