import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import MovieDetailsScreen from '../../screens/MovieDetailsScreen';

export default function MovieRoute() {
  const { movieId, entryId } = useLocalSearchParams<{ movieId: string; entryId?: string }>();
  return <MovieDetailsScreen movieId={String(movieId)} entryId={entryId ? String(entryId) : undefined} />;
}
