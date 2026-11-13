import { Directory, File, Paths } from 'expo-file-system';

// Posters the user picks are copied here so they survive cache clears.
// Resolved lazily: on web, reading Paths.document at import time throws and crashes the app.
function posterDir(): Directory {
  return new Directory(Paths.document, 'posters');
}

/** True for posters we stored ourselves (not TMDB URLs). */
export function isLocalPoster(uri?: string): boolean {
  try {
    return Boolean(uri && uri.startsWith(posterDir().uri));
  } catch {
    return false;
  }
}

/** Opens the photo library and returns the stored poster URI, or null if cancelled. */
export async function pickPosterFromLibrary(movieId: string): Promise<string | null> {
  // Loaded on demand: importing the native picker at startup stops the web preview from starting.
  const ImagePicker = await import('expo-image-picker');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [2, 3],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return null;

  const sourceUri = result.assets[0].uri;
  try {
    const dir = posterDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const safeId = movieId.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'film';
    const destination = new File(dir, `${safeId}-${Date.now()}.jpg`);
    new File(sourceUri).copy(destination);
    return destination.uri;
  } catch {
    // Where the file system can't store files (web), use the picked image directly.
    return sourceUri;
  }
}

/** Deletes a poster file we previously stored. Remote URLs are left alone. */
export function removeLocalPoster(uri?: string): void {
  if (!isLocalPoster(uri)) return;
  try {
    const file = new File(uri as string);
    if (file.exists) file.delete();
  } catch {
    // A missing file is fine; nothing else references it.
  }
}
