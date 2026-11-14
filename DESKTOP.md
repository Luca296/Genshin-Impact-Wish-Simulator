# Genshin Wish Offline

This Windows x64 edition includes the deployed simulator's banners through 7.1 phase 2, including Skirk and Escoffier. Electron 39.8.3 runs the bundled game files. Players do not need Node.js or a development server.

## Character and weapon progression

Version 1.5.0 adds character Attributes, Weapons, Constellation and Talents screens modeled on the in-game menu, plus weapon Details and Refine screens. Characters receive unspent Stela Fortuna from duplicates; constellation activation is manual. Weapons remain individual copies until a selected duplicate is consumed for refinement. Each character equips a specific compatible weapon copy. Locks and equipped status protect material copies. Ranks continue beyond C6 and R5 using documented custom rules.

The menu bundles original constellation diagrams and talent icons for offline use. Real stat and talent data covers 245 of 252 catalogue entries. Seven entries without verified source data show unavailable stats. Damage previews cover individual recognized hits and selected modifiers; complex kit state and reactions are not a full combat simulation. See `PROGRESSION.md` for migration, data coverage, calculations and verification.

## Corner watermark

Version 1.4.1 removes the persistent WishSimulator.App label from the corner of the game interface.

## Collector's Journal

Version 1.4.0 adds a Collector's Journal from the wish screen, the settings menu, or the J shortcut. The journal uses the existing Genshin font and artwork, with parchment rows, gold progress bars, collection cards, and a portrait album.

There are 239 achievements, 37 collection sets, and six unlockable journal titles. Achievements cover wish totals, banner history, unique characters and weapons, constellations, refinement, collection milestones, and recorded luck. Collection sets include regions, elements, weapon types, rarity groups, and themed companies. Select a set to browse its album, then select an entry to see owned copies and jump to an included featured banner. New C1/C6/R5 milestones use activated or refined ranks. Previously earned journal entries are retained.

Progress and equipped titles live inside the normal save and are included in automatic and exported backups. Existing inventory and saved history are credited when the journal first opens or before the next wish. Untagged historical records cannot prove whether odds were modified, so they credit journey totals but cannot award luck achievements. New history records identify the actual wish batch and whether the odds were normal. Custom banners and altered odds count toward Dreams achievements and general wish totals, while collection sets count all owned catalog items. Unlimited currency by itself does not change odds.

Earned achievements retain their dates and points even if their supporting history is later cleared. A full game reset clears journal progress along with the inventory. Pending history records recover progress after an interrupted wish. Backfilled progress is credited quietly; new achievements appear in one summary notification after the wish reveal closes. Titles are cosmetic and equip within the journal. No pull rates or wish balances are changed by rewards.

The collection catalog uses repaired unique local identities. Duplicate upstream rows are removed, and the conflicting weapon identity is migrated using named history evidence. Unattributed shared-ID copies are preserved with a recovery record. Existing English names and translations are reused for album items; new journal and progression labels are currently English.

## Five-star elemental reveal

Desktop version 1.3.0 adds a layered gold buildup with mist and embers, an illuminated elemental symbol after 0.7 seconds, a textured burst, and the character reveal at 1.6 seconds. The final backdrop uses the bundled elemental artwork with drifting light and particles. Original wish ambience overlaps the meteor tail and continues quietly through the reveal. Fast-forward keeps an already-playing cue rather than restarting it; closing or advancing fades the outgoing playback.

Click or press Enter/Space to finish the current introduction. Skip goes to the multi-wish summary. Skipping the meteor, enabling Auto Skip Splash Art, or a system reduced-motion preference bypasses the introduction. Weapons and lower-rarity items retain their original reveal. Existing desktop saves remain compatible. Hardware media transport keys do not control the wish movies.

## Responsive banners

Banners fit the available window width and height, with space reserved for the header and wish controls. Epitomized Path is inside the weapon banner above Details, including banners with baked text. Versions before the path system was introduced hide it. The 1.3.0 artwork restoration includes Standard and Noelle banners, higher-resolution event art and native wish cards. The original blended white fade is retained. IMAGE-QUALITY.md documents the processing, preserved originals and remaining limits.

## Launch

Extract the entire Windows ZIP, then open `Genshin Wish Offline.exe`. Keep the executable beside its `resources`, `locales`, DLLs and other included files. The application is unsigned. Press F11 or use View to toggle fullscreen.

## Saves and backups

Normal saves live in `%APPDATA%\GenshinWishOffline`, independently of the application folder. Chromium stores localStorage, IndexedDB and cookies there. Replacing or moving the application folder preserves progress. This desktop profile does not read the user's web-browser profile.

Game → Open save folder opens this directory. Game → Export backup and Import backup provide native file dialogs. The same operations are available under Settings → Backup & Restore. These backups contain settings, inventory, currencies, pity, guarantee flags, histories and local custom-banner data and embedded artwork. Currency-display cookies follow the persistent profile rather than the JSON backup.

Automatic JSON backups are written to the profile's `backups` directory after changes settle for 2.5 seconds, every minute while open, and on a normal close. Identical snapshots are skipped. The newest 20 are retained. Use Settings → Backup & Restore to select and restore a snapshot. Import and restore first save the current state. Abrupt termination can lose the most recent unsettled changes; the normal profile and earlier backups remain separate.

For a clean testing profile, the optional command-line argument `--profile=C:\path\to\isolated-profile` selects a different data directory. This is not needed for normal use.

## Existing website backups

The desktop importer accepts the upstream JSON backup format, including `.bin`, `.json` and `.txt` files containing `settings.data`, `histories` and `banners`. Histories and custom banners must have numeric `itemID` values. Very old name-only backups are rejected without replacing existing data. Open and export those from the original simulator first if possible.

Membership keys are not restored as entitlements. Custom banners with embedded `data:` artwork work offline. A cloud-only banner or remote image URL cannot be recovered without that artwork; export or recreate the banner locally in the original simulator first. Settings tied to an older banner-storage version can select the desktop's default 7.1 banner on import, while retaining inventory, history, currency, pity and guarantees.

Online publishing is replaced by a local backup export from the editor. This exports the complete save, including its banners. Importing replaces the destination save; it does not merge two inventories. The editor retains the original limit of three locally created custom banners. No premium access or protected content is enabled.

## Rebuild

Build prerequisites are Windows x64, Node.js 22 or newer, npm, Git and internet access for dependency installation. Artwork, translations and game data are already included in the source archive.

From this project directory in PowerShell:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm ci
npm test
node tests/assets.mjs
npm run package
```

The result is `../outputs/desktop-1.5.0/win-unpacked/Genshin Wish Offline.exe`. `npm run desktop` opens the already built frontend with the local Electron runtime. `npm run build` creates the static frontend only. `package-lock.json` pins the dependency graph. No deployment or asset-download step is needed after installing dependencies.

The upstream Svelte 3 application uses SvelteKit 1.30.4 and Vite 4.5.14 here. The incompatible legacy Markdown plugin is replaced with a small build-only plugin using Marked. Image imports resolve to bundled URLs without image processing. The static adapter replaces Vercel and the PWA service worker is removed. Frontend dependencies are build-time dependencies because the packaged renderer contains compiled code.

Optional packaged interaction tests use Playwright and isolated profiles:

```powershell
node tests/packaged-gameplay.cjs
node tests/packaged-custom.cjs
```

The optional system-loopback sound test also needs Python and `PyAudioWPatch`: `node tests/packaged-audio.cjs`. It records 12 seconds from the current default output and does not record a microphone. Its loopback capture can contain sound from other applications.

## Versions and credits

See `VERSION-AUDIT.md`, `THIRD-PARTY-NOTICES.md` and the retained upstream `LICENSE`. Help → Credits and licenses displays the asset and source credits in the app. The project overview is in `README.md`. The upstream source revision is identified in `VERSION-AUDIT.md`.

## Reveal quality checks

After packaging, run `node tests/packaged-elemental.cjs`, `node tests/packaged-gameplay.cjs`, `node tests/packaged-custom.cjs`, then `node tests/packaged-reveal-extra.cjs`. These use isolated profiles. The optional `node tests/packaged-reveal-quality.cjs` records the actual app with Python and PyAudioWPatch WASAPI loopback. Keep other sound-producing apps quiet during that check, then run `python tests/reveal-quality-audio.py` to reject silent gaps of 150 ms or longer below -55 dBFS. That optional recording dependency is only for testing, never for playing.

## High-resolution release verification

Run packaged UI checks sequentially so separate native windows do not compete for input: `node tests/packaged-layout.cjs`, `node tests/packaged-hd-labels.cjs`, `node tests/packaged-hd-assets.cjs`, `node tests/packaged-gameplay.cjs`, `node tests/packaged-custom.cjs`, `node tests/packaged-reveal-extra.cjs`, `node tests/packaged-elemental.cjs`, and `node tests/packaged-media-save.cjs`. `python tests/artwork-check.py` verifies delivered image hashes, dimensions, preserved originals and sample transparency. Optional artwork regeneration is documented in IMAGE-QUALITY.md.
