# Collector's Journal verification

This is a historical report for desktop 1.4.0. Its results describe the tested package, not a new test of the current checkout.
Verified on 2026-10-31 against the Windows 1.4.0 package.

## Delivered

- 239 achievements in Journey, Companions, Armory, Collections, Fortune, and Dreams.
- 37 collection sets, a searchable character and weapon album, featured-banner links, and six equipable journal titles.
- Existing inventory/history migration, permanent earned dates, incremental history recovery, and progress in standard backups.
- Genshin font and bundled artwork, parchment panels, gold progress bars, existing menu sounds and close controls.
- Journal entry on the wish screen and settings menu; J opens it, Escape closes it, with keyboard focus handling for entry/title dialogs.

## Automated verification

All 30 Node tests passed, including the existing wish, reveal audio, banner and native backup checks. New tests cover catalog deduplication, attainable collection thresholds, C6 and R5 boundaries, legacy-history limits, explicit ten-pull batches, custom/modified odds, persistent earned dates, title gating, replay protection, and interrupted-wish recovery.

Production Vite build passed. The existing codebase emits unused-property, accessibility, and CSS warnings during builds. Packaging used the already-installed Electron 39.8.3 distribution, without downloading a different runtime.

## Packaged application verification

The test launched outputs/desktop-1.4.0/win-unpacked/Genshin Wish Offline.exe with a separate test profile. The user's normal save was not opened or modified.

Eight end-to-end checks passed:

1. Empty journal has no fabricated progress.
2. Existing collection and 1,000 legacy history entries backfill correctly without awarding unverifiable luck.
3. Search, completed filters, and Escape while a search input is focused work.
4. Collections open a filtered album; missing-entry filters and featured-banner choices render correctly.
5. Earned titles equip and enter the normal backup snapshot.
6. An actual deterministic ten-pull advances the normal-odds journal once, awards double/triple five-star achievements, and shows its summary notification after the wish closes. Only the isolated test runtime overrides randomness.
7. Collection layouts fit at 1280x720, 800x600, 390x844, and 844x390. Album artwork had no broken images.
8. Reload and backup restore preserve achievement progress and equipped titles exactly.

No renderer page errors occurred. Screenshots were visually inspected for the achievement list, album, portrait collection page, and short landscape collection page. Evidence is under outputs/journal-verification.

## Limits

The new journal labels are English; album item names use the existing translations. A conflicting upstream weapon itemID follows the original inventory's first-match lookup, so it does not manufacture separate ownership for the two names. Older records cannot prove unmodified odds and therefore do not award Fortune achievements. The checks did not cover a long manual play session or gamepad support.
