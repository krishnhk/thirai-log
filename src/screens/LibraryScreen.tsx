import React from 'react';
import { ScrollView, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTheme } from '../theme';
import { useLibrary } from '../hooks/useLibrary';
import { searchableFilms } from '../lib/library';
import { AppHeader } from '../components/AppHeader';
import { ListGroup, listPageStyles as page, type RowItem } from '../components/ListGroup';

/** Library: the collections (film database, theatres) and statistics. */
export default function LibraryScreen() {
  const { colors } = useTheme();
  const { library } = useLibrary();
  const films = searchableFilms(library).length;
  const theatres = library.theatres.length;

  const rows: RowItem[] = [
    {
      accent: true,
      icon: 'film',
      label: 'Film database',
      hint: `${films} ${films === 1 ? 'film' : 'films'}`,
      onPress: () => router.push('/films' as Href),
    },
    {
      accent: true,
      icon: 'location',
      label: 'Theatres',
      hint: `${theatres} ${theatres === 1 ? 'theatre' : 'theatres'}`,
      onPress: () => router.push('/theatres' as Href),
    },
    {
      accent: true,
      icon: 'stats-chart',
      label: 'Statistics',
      hint: 'Your year in numbers',
      onPress: () => router.push('/statistics' as Href),
    },
  ];

  return (
    <View style={[page.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Library" subtitle="Your theatres, films and numbers." />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={page.content}>
        <ListGroup rows={rows} />
      </ScrollView>
    </View>
  );
}
