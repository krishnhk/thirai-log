import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import MovieDetailsScreen from '../../screens/MovieDetailsScreen';

export default function MovieRoute() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  return <MovieDetailsScreen movieId={String(movieId)} />;
}
