import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Brand } from '@/constants/brand';
import { RC } from '@/constants/roles';
import { useAuth } from '@/hooks/auth';
import { useLang } from '@/hooks/use-lang';
import { useQuery } from '@/hooks/use-query';
import { getArtist, updateMyArtist, type Artist } from '@/lib/commissions';

// Where an artist edits the profile organizations see in the directory.
export default function ArtistEditScreen() {
  const [lang] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const sub = user?.sub ?? '';
  const { data: artist, loading, error, reload } = useQuery(`artist:${sub}`, () => (sub ? getArtist(sub) : Promise.resolve(null)));

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <BackButton />
        <Text style={s.h1}>{c.editTitle}</Text>

        {loading && !artist ? <ActivityIndicator color={Brand.ink} /> : null}

        {(error && !artist) || (!loading && !artist) ? (
          <View style={{ gap: 12 }}>
            <Text style={s.problem}>{c.errGeneric}</Text>
            <Button label={c.retry} onPress={reload} variant="ghost" />
          </View>
        ) : null}

        {/* The form starts from the loaded profile (its own state), so it mounts only once the profile is here. */}
        {artist ? <EditForm key={artist.sub} initial={artist} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EditForm({ initial }: { initial: Artist }) {
  const [lang] = useLang();
  const c = RC[lang];

  const [name, setName] = useState(initial.name);
  const [headline, setHeadline] = useState(initial.headline ?? '');
  const [bio, setBio] = useState(initial.bio ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [specialties, setSpecialties] = useState(initial.specialties.join(', '));
  const [available, setAvailable] = useState(initial.available);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const save = async () => {
    if (name.trim().length < 2) {
      setNameError(c.nameRequired);
      return;
    }
    setNameError(null);
    setFormError(null);
    setStatus('saving');
    try {
      await updateMyArtist(initial.sub, {
        name: name.trim(),
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        specialties: specialties
          .split(',')
          .map((x) => x.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 12),
        available,
      });
      setStatus('saved');
      setTimeout(() => router.back(), 600);
    } catch {
      setFormError(c.errGeneric);
      setStatus('idle');
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Field label={c.fieldName} value={name} onChangeText={setName} maxLength={120} error={nameError} />
      <Field label={c.fieldHeadline} value={headline} onChangeText={setHeadline} maxLength={160} />
      <Field label={c.fieldBio} value={bio} onChangeText={setBio} multiline maxLength={2000} />
      <Field label={c.fieldCity} value={city} onChangeText={setCity} maxLength={80} />
      <Field label={c.fieldSpecialties} value={specialties} onChangeText={setSpecialties} />

      <View style={s.switchRow}>
        <Text style={s.switchLabel}>{c.artistOpen}</Text>
        <Switch
          value={available}
          onValueChange={setAvailable}
          trackColor={{ false: '#c9c7c0', true: Brand.blue }}
          thumbColor="#fff"
        />
      </View>

      {formError ? <Text style={s.problem}>{formError}</Text> : null}

      <Button
        label={status === 'saved' ? `✓ ${c.saved}` : status === 'saving' ? c.saving : c.save}
        onPress={() => void save()}
        loading={status === 'saving'}
        disabled={status === 'saved'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h1: { fontSize: 30, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  problem: { fontSize: 15, fontWeight: '800', color: Brand.orange },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    backgroundColor: Brand.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  switchLabel: { fontSize: 16, fontWeight: '800', color: Brand.ink },
});
