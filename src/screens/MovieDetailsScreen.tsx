import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readJson, updateJson } from '../lib/storage';
import { markWatchlistWatched } from '../lib/library';
import { Movies, type Movie } from '../api/movies';
import { INPUT_RESET, SPACE, RADIUS, TYPE, useTheme } from '../theme';
import { Card } from '../components/Card';
import { TheatrePicker } from '../components/TheatrePicker';
import { CompanionPicker } from '../components/CompanionPicker';
import { useLibrary } from '../hooks/useLibrary';
import { PosterPicker } from '../components/PosterPicker';
import { RatingStars } from '../components/RatingStars';
import { Chip } from '../components/Chip';
import { StatusPill } from '../components/StatusPill';
import { ActionButton } from '../components/ActionButton';
import { notify } from '../lib/ui';
import {
  saveViewingEntry,
  STORAGE_KEYS,
  updateFilmPoster,
  type Companion,
  type EntryStatus,
  type ViewingEntry,
} from '../lib/library';
import { todayInputValue } from '../lib/format';

const STATUSES: EntryStatus[] = ['planned', 'watched', 'skipped', 'postponed'];

interface MovieDetailsProps {
  movieId: string;
  /** The viewing to edit. Without it the screen logs a new viewing of the film. */
  entryId?: string;
}

export default function MovieDetailsScreen({ movieId, entryId }: MovieDetailsProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [watchedAt, setWatchedAt] = useState(todayInputValue());
  const [theatre, setTheatre] = useState('');
  const [theatreId, setTheatreId] = useState<string | undefined>(undefined);
  const { library } = useLibrary();
  const [companion, setCompanion] = useState<Companion | undefined>(undefined);
  const [companionError, setCompanionError] = useState(false);
  const [unansweredOld, setUnansweredOld] = useState(false);
  // Id of the viewing this screen created, so saving again updates it instead of adding another.
  const [createdId, setCreatedId] = useState<string | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<EntryStatus>('planned');

  const loadMovie = async () => {
    try {
      const cached = await Movies.getCachedMovies();
      const cachedMovie = cached.find((item) => item.id === movieId);
      if (cachedMovie) setMovie(cachedMovie);

      const list = await readJson<ViewingEntry[]>(STORAGE_KEYS.viewingEntries, []);
      // Several viewings can share one film, so only the viewing that was opened is loaded.
      const entry = entryId ? list.find((item) => item.id === entryId) : undefined;
      if (entry) {
        setWatchedAt(entry.watchedAt ? new Date(entry.watchedAt).toISOString().slice(0, 10) : todayInputValue());
        setTheatre(entry.theatre ?? '');
        setTheatreId(entry.theatreId);
        setCompanion(entry.companion);
        setUnansweredOld(!entry.companion);
        setRating(entry.rating ?? 0);
        setNotes(entry.notes ?? '');
        setStatus((entry.status as EntryStatus) ?? 'planned');
      }
    } catch {
      // Ignore load failures; the screen still works with an empty form.
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMovie();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, entryId]);

  const saveViewing = async () => {
    if (!companion) {
      setCompanionError(true);
      return;
    }
    try {
      const list = await readJson<ViewingEntry[]>(STORAGE_KEYS.viewingEntries, []);
      const currentId = entryId ?? createdId;
      const existing = currentId ? list.find((item) => item.id === currentId) : undefined;
      const parsedDate = new Date(watchedAt);

      const savedId = existing?.id ?? `${movieId}-${Date.now()}`;
      await saveViewingEntry({
        id: savedId,
        movieId,
        title: movie?.title ?? '',
        watchedAt: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
        theatre: theatre.trim() || undefined,
        theatreId: theatre.trim() ? theatreId : undefined,
        companion,
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
        status,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      setCreatedId(savedId);
      if (status === 'watched') await markWatchlistWatched(movieId, movie?.title ?? '');
      notify('Saved', 'Your viewing record has been updated.');
    } catch {
      notify('Error', 'Could not save this viewing.');
    }
  };

  const addToWatchlist = async () => {
    try {
      const year = movie?.releaseDate ? new Date(movie.releaseDate).getFullYear() : new Date().getFullYear();
      let alreadySaved = false;
      await updateJson<{ movieId?: string }[]>(STORAGE_KEYS.watchlistMovies, [], (current) => {
        const watchlist = Array.isArray(current) ? current : [];
        if (watchlist.some((item) => item.movieId === movieId)) {
          alreadySaved = true;
          return watchlist;
        }
        return [
          ...watchlist,
          {
            id: `${movieId}-${Date.now()}`,
            movieId,
            title: movie?.title ?? '',
            posterPath: movie?.posterPath,
            year,
            status: 'planned',
            addedAt: new Date().toISOString(),
            notes: '',
          },
        ];
      });
      if (alreadySaved) {
        notify('Already saved', 'This film is already in your watchlist.');
        return;
      }
      notify('Added', 'Film added to your watchlist.');
    } catch {
      notify('Error', 'Could not add this film.');
    }
  };

  const handlePosterChange = async (uri: string) => {
    if (!movie) return;
    await updateFilmPoster(movie.id, movie.title, uri);
    setMovie({ ...movie, posterPath: uri });
  };

  const backButton = (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={[styles.back, { backgroundColor: colors.overlay, top: insets.top + SPACE.sm }]}
    >
      <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
    </Pressable>
  );

  if (!movie) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        {backButton}
        <Ionicons name="film-outline" size={34} color={colors.textDim} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {loaded ? 'This film is not in your catalog' : 'Loading film…'}
        </Text>
        {loaded ? (
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Choose it from Log or Watchlist to see its details here.
          </Text>
        ) : null}
      </View>
    );
  }

  const genres = movie.genres ?? [];
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {backButton}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACE.xxxl }}
      >
        <View style={styles.backdropWrap}>
          {movie.backdropPath ? (
            <Image source={{ uri: movie.backdropPath }} style={styles.backdrop} resizeMode="cover" />
          ) : (
            <View style={[styles.backdrop, { backgroundColor: colors.surfaceAlt }]} />
          )}
          <View style={[styles.backdropFade, { backgroundColor: colors.background }]} />
        </View>

        <View style={styles.hero}>
          <PosterPicker
            uri={movie.posterPath}
            title={movie.title}
            movieId={movie.id}
            width={116}
            onChange={handlePosterChange}
          />
          <View style={styles.heroInfo}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
              {movie.title}
            </Text>
            <View style={styles.metaRow}>
              {year ? <Text style={[styles.meta, { color: colors.textMuted }]}>{year}</Text> : null}
              {movie.runtime ? <Text style={[styles.meta, { color: colors.textMuted }]}>{movie.runtime} min</Text> : null}
              {typeof movie.voteAverage === 'number' && movie.voteAverage > 0 ? (
                <View style={styles.voteRow}>
                  <Ionicons name="star" size={12} color={colors.star} />
                  <Text style={[styles.meta, { color: colors.textMuted }]}>{movie.voteAverage.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.statusWrap}>
              <StatusPill status={status} />
            </View>
          </View>
        </View>

        {movie.tagline ? (
          <Text style={[styles.tagline, { color: colors.textMuted }]}>“{movie.tagline}”</Text>
        ) : null}

        {genres.length > 0 ? (
          <View style={styles.genreRow}>
            {genres.map((genre) => (
              <View key={genre} style={[styles.genreTag, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft }]}>
                <Text style={[styles.genreText, { color: colors.textMuted }]}>{genre}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {movie.overview ? (
          <Card style={styles.section}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Overview</Text>
            <Text style={[styles.overview, { color: colors.textMuted }]}>{movie.overview}</Text>
          </Card>
        ) : null}

        <Card style={styles.section}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your viewing</Text>

          <Text style={[styles.fieldLabel, { color: colors.textDim }]}>Watched on</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.textDim} />
            <TextInput
              value={watchedAt}
              onChangeText={setWatchedAt}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
              style={[styles.input, { color: colors.text }]}
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textDim }]}>Theatre</Text>
          <TheatrePicker
            value={theatre}
            theatreId={theatreId}
            theatres={library.theatres}
            onChange={(next) => {
              setTheatre(next.theatre);
              setTheatreId(next.theatreId);
            }}
          />

          <View style={styles.companionField}>
            <CompanionPicker
              value={companion}
              onChange={(value) => {
                setCompanion(value);
                setCompanionError(false);
              }}
              error={companionError && !companion ? 'Choose who you watched with.' : null}
              hint={
                unansweredOld && !companion
                  ? 'This viewing was saved before this question existed, so nothing is selected yet.'
                  : null
              }
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textDim }]}>Rating</Text>
          <RatingStars value={rating} size={28} onChange={setRating} />

          <Text style={[styles.fieldLabel, { color: colors.textDim }]}>Status</Text>
          <View style={styles.chips}>
            {STATUSES.map((value) => (
              <Chip
                key={value}
                label={value.charAt(0).toUpperCase() + value.slice(1)}
                active={status === value}
                onPress={() => setStatus(value)}
              />
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textDim }]}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="A memory, a scene, who you watched it with…"
            placeholderTextColor={colors.textDim}
            multiline
            textAlignVertical="top"
            style={[
              styles.notesInput,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
            ]}
          />
        </Card>

        <View style={styles.actions}>
          <ActionButton label="Save viewing" icon="checkmark" onPress={saveViewing} fullWidth />
          <ActionButton label="Add to watchlist" icon="bookmark-outline" variant="outline" onPress={addToWatchlist} fullWidth />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  companionField: {
    marginTop: SPACE.md,
  },
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    padding: SPACE.xl,
  },
  back: {
    position: 'absolute',
    left: SPACE.lg,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...TYPE.heading,
    textAlign: 'center',
  },
  emptyBody: {
    ...TYPE.small,
    textAlign: 'center',
  },
  backdropWrap: {
    height: 220,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    opacity: 0.85,
  },
  hero: {
    flexDirection: 'row',
    gap: SPACE.lg,
    paddingHorizontal: SPACE.lg,
    marginTop: -90,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: SPACE.xs,
  },
  title: {
    ...TYPE.title,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACE.md,
    marginTop: SPACE.sm,
  },
  meta: {
    ...TYPE.caption,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusWrap: {
    marginTop: SPACE.md,
  },
  tagline: {
    ...TYPE.small,
    fontStyle: 'italic',
    paddingHorizontal: SPACE.lg,
    marginTop: SPACE.lg,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    marginTop: SPACE.md,
  },
  genreTag: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  genreText: {
    ...TYPE.caption,
    fontWeight: '700',
  },
  section: {
    marginHorizontal: SPACE.lg,
    marginTop: SPACE.lg,
  },
  cardTitle: {
    ...TYPE.heading,
    fontSize: 15,
    marginBottom: SPACE.sm,
  },
  overview: {
    ...TYPE.small,
    lineHeight: 21,
  },
  fieldLabel: {
    ...TYPE.caption,
    fontWeight: '700',
    marginTop: SPACE.md,
    marginBottom: SPACE.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    ...TYPE.body,
    ...INPUT_RESET,
    flex: 1,
    padding: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  notesInput: {
    ...TYPE.body,
    ...INPUT_RESET,
    minHeight: 96,
    padding: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    paddingHorizontal: SPACE.lg,
    marginTop: SPACE.lg,
    gap: SPACE.sm,
  },
});
