import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Brand } from '@/constants/brand';
import { RC } from '@/constants/roles';
import { useLang } from '@/hooks/use-lang';
import { useQuery } from '@/hooks/use-query';
import { createCommission, friendlyError, getArtist } from '@/lib/commissions';

// The requirements form an organization fills in to ask an artist for a statue. Sending it
// opens the conversation; the artist has to accept before anyone can chat.
export default function NewCommissionScreen() {
  const { artist: artistSub } = useLocalSearchParams<{ artist: string }>();
  const [lang] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { data: artist, loading } = useQuery(`artist:${artistSub}`, () => getArtist(artistSub));

  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<{ title?: string; brief?: string; deadline?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (title.trim().length < 2) next.title = c.errTitle;
    if (brief.trim().length < 10) next.brief = c.errBrief;
    const day = deadline.trim();
    if (day) {
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) && new Date(day) >= startOfToday();
      if (!valid) next.deadline = c.errDate;
    }
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    try {
      const id = await createCommission({
        artist: artistSub,
        title: title.trim(),
        brief: brief.trim(),
        budget: budget.trim(),
        deadline: day,
        location: location.trim(),
      });
      router.replace({ pathname: '/commission/[id]', params: { id } });
    } catch (e) {
      setFormError(friendlyError(e, c));
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <BackButton />
        <Text style={s.h1}>{c.artistRequest}</Text>

        {loading && !artist ? (
          <ActivityIndicator color={Brand.ink} />
        ) : (
          <Text style={s.to}>
            {c.newTo}: <Text style={s.toName}>{artist?.name ?? ''}</Text>
          </Text>
        )}

        <Field label={c.fieldTitle} value={title} onChangeText={setTitle} maxLength={120} error={errors.title} />
        <Field
          label={c.fieldBrief}
          hint={c.fieldBriefHint}
          value={brief}
          onChangeText={setBrief}
          multiline
          maxLength={2000}
          error={errors.brief}
        />
        <Field label={c.fieldBudget} value={budget} onChangeText={setBudget} maxLength={80} />
        <Field
          label={c.fieldDeadline}
          value={deadline}
          onChangeText={setDeadline}
          placeholder="2027-06-30"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          error={errors.deadline}
        />
        <Field label={c.fieldLocation} value={location} onChangeText={setLocation} maxLength={120} />

        {formError ? <Text style={s.problem}>{formError}</Text> : null}

        <View style={{ marginTop: 4 }}>
          <Button label={sending ? c.sending : c.sendRequest} onPress={() => void submit()} loading={sending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h1: { fontSize: 30, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  to: { fontSize: 16, color: Brand.inkSoft },
  toName: { fontWeight: '800', color: Brand.ink },
  problem: { fontSize: 15, fontWeight: '800', color: Brand.orange },
});
