import { Alert, Platform } from 'react-native';

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Delete'
): void {
  if (Platform.OS === 'web') {
    const anyGlobal = globalThis as { confirm?: (msg: string) => boolean };
    if (typeof anyGlobal.confirm === 'function') {
      if (anyGlobal.confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const anyGlobal = globalThis as { alert?: (msg: string) => void };
    if (typeof anyGlobal.alert === 'function') {
      anyGlobal.alert(message ? `${title}\n\n${message}` : title);
      return;
    }
  }
  Alert.alert(title, message);
}
