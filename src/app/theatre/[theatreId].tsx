import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import TheatreDetailScreen from '../../screens/TheatreDetailScreen';

export default function TheatreRoute() {
  const { theatreId } = useLocalSearchParams<{ theatreId: string }>();
  return <TheatreDetailScreen theatreId={String(theatreId)} />;
}
