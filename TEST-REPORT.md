# Artwork and blended banner update, desktop 1.3.0

Windows x64 verification on 2026-10-31. Simulator content remains 7.1 phase 2, including Skirk and Escoffier. Wish odds, pity, guarantees, inventory, currency, history and save formats were not changed.

## Delivered changes

- 553 artwork entries tracked with source/output hashes. 508 use the conservative local restoration directly, 18 additionally have old heading lettering cleaned before restoration, 21 use public native originals, three are documented crops from existing originals, and three already large images retain their original bytes.
- Standard and Noelle introductory artwork are explicitly included at 3200 px width, alongside primary event art, character splashes, wish cards, custom-banner surfaces and main/elemental backgrounds.
- Original blended white fades are retained. There is no opaque white panel over the event artwork. Selective heading cleanup preserves every unmasked pixel before the restoration pass; its masks and output hashes are recorded.
- All 18 newer poster headings, availability/event labels and nameplates use live Genshin-font text, with source-specific positions. Four new headings have English fallbacks where upstream had supplied only baked English text. UI labels were checked in all 13 bundled interface languages.
- Wish summaries use the native full-height cards where available. Existing splash-offset fallback remains for other characters, custom art and outfits. No tiny square wish-card placeholder remains in the supplied asset set.
- The earlier responsive layout, path placement, media-key fix, 700 ms emblem hold and 1600 ms character entrance remain in place.

## Verification

24 automated tests passed, covering actual game pity/guarantees, backups and retention, reveal/audio lifecycle, caption bounds and language keys. The asset audit resolves 295 event definitions, 121 characters, 134 weapons and 1322 images with no missing references.

The artwork check verifies all 553 output hashes, preserved-original hashes, image dimensions, selected alpha-channel comparisons and all 18 selective cleanup masks. Both Standard images and the introductory image are asserted to be 3200 px wide; every wish card is at least 900 px high.

Actual packaged interaction passed for Noelle's introductory banner and guaranteed ten-pull, current and earliest Standard artwork, and a real ten-pull showing native 320x1024 Skirk cards. These checks use fresh isolated desktop profiles. All displayed artwork decoded without missing files or external requests.

All 18 rebuilt banners and all 13 bundled interface languages were exercised in the packaged UI. Native text fits without clipped or missing translation keys. The opaque cover is explicitly absent. Actual packaged Skirk, Noelle, Standard and other poster screenshots were visually inspected; screenshots and source comparisons are distinct from gameplay checks.

The 14 packaged elemental checks passed for all seven elements, natural meteor playback, skipping, consecutive five-stars, multi-wish summary, auto-skip, reduced motion, and original lower-rarity/weapon presentation. All 12 gameplay/save/backup checks passed, including wishes, inventory, currency/history/pity changes, early/late banner types, backup export/import, automatic restore and reopen persistence. Six custom-banner/editor/persistence/backup checks passed. Three additional custom-element, small-window and muted-playback checks passed. The five-size layout/path test also passed on the corrected build. Windows native media commands still leave the meteor playing; the measured reveal was approximately 703 ms until color and 1607 ms until full artwork, with saves intact after reopening.

No uncaught errors, missing local images or attempted external renderer requests occurred in the passing checks. Expected canceled video range requests from seeking/resetting are retained in raw logs. Tests were rerun after correcting test timing and the native-card renderer; only the final passing results support this report.

## Evidence and limitations

See artwork-test-results.json, asset-test-results.json, unit-test-results.txt, hd-asset-ui-results.json, hd-label-test-results.json, reveal-test-results.json, packaged-test-results.json, custom-test-results.json, media-save-test-results.json and layout-test-results.json. PNGs are actual packaged-window captures. All test profiles are separate from the user's normal app profile and browser saves.

The restoration improves apparent resolution and compression artifacts; it does not recover authentic lost detail. Small areas behind removed lettering are interpolated. Some promotional UP markings and element emblems remain raster artwork. Four newer banner titles retain an English fallback. IMAGE-QUALITY.md documents processing, originals and reproducibility.

Playback telemetry confirms the game emits audio, and mute behavior was checked. No new human headphone or physical-speaker listening acceptance was performed. Native Windows media commands were automated; the user's physical keyboard was not manually operated. Independent administrator-level Windows Firewall isolation remains unverified; renderer and main-process network restrictions passed the packaged API checks. Native backup file-path selection is stubbed in automation, while actual IPC file operations and restoration run.

Existing saves remain in %APPDATA%\GenshinWishOffline. Normal close flushes storage and automatic backups retain the latest 20 distinct snapshots. See README.md / DESKTOP.md for launch and rebuild instructions.
