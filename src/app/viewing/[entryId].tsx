import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ViewingDetailScreen from '../../screens/ViewingDetailScreen';

export default function ViewingRoute() {
  const { entryId, justLogged } = useLocalSearchParams<{ entryId: string; justLogged?: string }>();
  return <ViewingDetailScreen entryId={String(entryId)} showDone={justLogged === '1'} />;
}
