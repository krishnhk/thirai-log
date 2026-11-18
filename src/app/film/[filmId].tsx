import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import FilmDetailScreen from '../../screens/FilmDetailScreen';

export default function FilmRoute() {
  const { filmId } = useLocalSearchParams<{ filmId: string }>();
  return <FilmDetailScreen filmId={String(filmId)} />;
}
