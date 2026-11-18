import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import WatchItemScreen from '../../screens/WatchItemScreen';

export default function WatchItemRoute() {
  const { itemId, year } = useLocalSearchParams<{ itemId: string; year?: string }>();
  return <WatchItemScreen itemId={String(itemId)} year={Number(year) || new Date().getFullYear()} />;
}
