# Theme Update Report (Dark Techno)

## What changed

- Replaced the global color palette with a dark techno scheme using bright orange accents and black surfaces.
- Applied the new palette to navigation, tabs, recorder controls, waveform, home screen, library screen, and recording cards.
- Updated link styling to match the orange accent.

## Files updated

- app/\_layout.tsx — custom navigation theme and light status bar.
- app/(tabs)/\_layout.tsx — tab bar colors and background.
- constants/theme.ts — new palette tokens (accent, surfaces, borders, muted, danger).
- components/themed-text.tsx — link color updated to orange accent.
- src/screens/HomeScreen.tsx — all UI colors moved to the theme palette.
- src/screens/LibraryScreen.tsx — all UI colors moved to the theme palette.
- src/components/RecorderButton.tsx — button colors updated to orange/black theme.
- src/components/RecordingCard.tsx — card colors and icons updated to theme.
- src/components/Waveform.tsx — default waveform color updated to orange accent.

## API keys

- No API key placeholders were added or modified in this change set (UI-only update).
- There are no files in this update where you need to insert API keys.
