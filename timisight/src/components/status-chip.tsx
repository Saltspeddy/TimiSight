import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { RC, type CommissionStatus } from '@/constants/roles';
import { useLang } from '@/hooks/use-lang';

// The state of a commission as a coloured pill: requested, in discussion, agreed, declined
// or cancelled.
const COLOR: Record<CommissionStatus, string> = {
  requested: Brand.yellow,
  discussing: '#c9d0ff',
  agreed: '#9fd56b',
  declined: '#e6e2d8',
  cancelled: '#e6e2d8',
};

export function StatusChip({ status }: { status: CommissionStatus }) {
  const [lang] = useLang();
  const c = RC[lang];
  const label = {
    requested: c.statusRequested,
    discussing: c.statusDiscussing,
    agreed: c.statusAgreed,
    declined: c.statusDeclined,
    cancelled: c.statusCancelled,
  }[status];

  return (
    <View style={[s.chip, { backgroundColor: COLOR[status] }]}>
      <Text style={s.text}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  text: { fontSize: 12, fontWeight: '800', color: Brand.ink },
});
