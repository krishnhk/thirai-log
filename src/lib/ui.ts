/** What a popup shows. Popups are drawn inside the app by the DialogHost in the app root. */
export interface DialogSpec {
  title: string;
  message?: string;
  /** Text of the main button. */
  confirmLabel: string;
  /** Shows a second "Cancel" button. Notices have only the main button ("OK"). */
  cancellable: boolean;
  /** The main button is drawn in the warning colour (for deleting). */
  danger: boolean;
  onConfirm?: () => void;
}

type DialogListener = (spec: DialogSpec) => void;
let dialogListener: DialogListener | null = null;
const pendingDialogs: DialogSpec[] = [];

/** Used by the DialogHost to receive popups. Returns an unsubscribe function. */
export function subscribeDialogs(listener: DialogListener): () => void {
  dialogListener = listener;
  // Anything asked for before the host mounted is shown now, one after another.
  pendingDialogs.splice(0).forEach((spec) => listener(spec));
  return () => {
    if (dialogListener === listener) dialogListener = null;
  };
}

function showDialog(spec: DialogSpec): void {
  if (dialogListener) dialogListener(spec);
  else pendingDialogs.push(spec);
}

/**
 * Asks before doing something. The popup is drawn inside the app, not by the system. The main button is red
 * unless `options.danger` is false.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Delete',
  options: { danger?: boolean } = {}
): void {
  showDialog({ title, message, confirmLabel, cancellable: true, danger: options.danger ?? true, onConfirm });
}

/** Tells the user something, with one "OK" button. Drawn inside the app. */
export function notify(title: string, message?: string): void {
  showDialog({ title, message, confirmLabel: 'OK', cancellable: false, danger: false });
}

/**
 * Waits until the saving page has been up for at least `minMs`, so a very quick save does not make it
 * flash on and off. Pass the time the save started.
 */
export function holdSaving(startedAt: number, minMs = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, minMs - (Date.now() - startedAt))));
}
