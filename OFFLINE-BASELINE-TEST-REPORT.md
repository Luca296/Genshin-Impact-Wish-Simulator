# Test report

This is a historical report for desktop 1.0.0. Its results describe the tested package, not a new test of the current checkout.
Tested on Windows x64 on 2026-10-31. Desktop version 1.0.0, Electron 39.8.3, simulator content through **7.1 phase 2**.

## Passed

| Verification | Evidence |
| --- | --- |
| Fresh packaged launch | New isolated `--profile` directories, empty history, version `7.1-2`, all game files loaded from `wish://game/` and the packaged ASAR. No browser profile or cached website data was used. |
| Single wish and full animation | Real interface click; 1920×1080 video decoded and advanced, unmuted at volume 1; history, inventory, currency and pity changed. |
| Multiple wishes and skipping | Ten results recorded, ten Intertwined Fates deducted; manual meteor skip and reward dismissal exercised. Auto Skip Splash Art was also tested separately and still recorded a result. |
| Banner selection | Beginner, both character-event tabs, weapon, standard and chronicled interfaces exercised. Version 1.0 and 7.1 selected through the picker; chronicled checked in 4.5. |
| Beginner mechanics | Ten wishes used eight Acquaint Fates, produced Noelle, and retained the ten-roll counter. |
| Complete banner/data audit | 295 character/weapon banner definitions, all event phases, referenced items and thumbnails checked. Real game modules resolved every available wish type and rarity in every phase. No missing references. |
| Asset integrity | 1,368 bundled source assets catalogued with SHA-256 hashes, including 1,322 source images. All PNG/WebP/JPEG integrity checks passed. Fonts, sounds and all seven animation/background videos are bundled. |
| Local custom banners | Created through the original editor, uploaded local Skirk art, selected rate-ups, generated a thumbnail, finished the banner and made a wish. Artwork and banner survived restart. |
| Settings and progress | Multi-pull changed to seven through Settings. Exact save contents survived close/reopen. The same data loaded after replacing the app with the extracted ZIP copy. |
| Backup import/export | JSON backup exported through the real Backup & Restore buttons and native IPC. Native path-selection dialogs were stubbed to isolated test files. Backup restoration matched saved data. Separate checks changed progress before restoring the prior backup. |
| Automatic backups | Actual profile backup files created, read and restored; current state saved before import. A focused filesystem test wrote 25 snapshots and confirmed bounded retention of 20, valid JSON, duplicate suppression and no leftover temporary files. |
| Rules and backup unit tests | 12 tests passed, including soft/hard pity, simultaneous four/five-star pity, featured Skirk guarantee, weapon hard pity, cross-version pity/guarantees, all banner phases, upstream JSON backup compatibility and malformed-backup rejection. |
| Main-process network blocking | Actual packaged main process rejected Node fetch, Electron fetch, Node HTTP and raw TCP connection attempts with the offline-lock error. |
| Ordinary gameplay network/errors | No external HTTP(S) requests, uncaught renderer errors or missing local image requests during final gameplay/custom/standalone runs. Expected `ERR_ABORTED` video requests from Skip/reset are recorded separately in the raw results. |
| Sound output | Electron reported the game itself as audible during an unmuted wish, with decoded video frames. Synchronized 11.989-second WASAPI output recording was non-silent. Earshot measured -20.2 LUFS, -6.8 dBTP and zero clipped samples; model-assisted analysis detected music and whoosh/effect events. |
| ZIP independence | Extracted the delivered Windows ZIP, temporarily renamed the original source directory, and launched the extracted executable from its own folder. Its app path was the extracted `resources/app.asar`; no development server was running. Gameplay, existing saves, chronicled selection, beginner wishes and auto-skip passed. The source directory was restored afterward. |

Final results: 12/12 packaged gameplay steps, 6/6 custom-banner steps, 6/6 extracted-app steps, the audio check and all 12 rule/backup tests passed. Screenshots were visually inspected, including Skirk's 7.1 banner and the original game layout.

## Failures corrected

The first packaged attempt exposed a conflict between Electron's file-fetch helper and the main-process network lock. The final handler reads bundled files directly and supports media byte ranges. A promotional image in the old welcome news was removed. Redundant startup blob copying was removed. Final packaged runs passed after these fixes. Test selector, initial-currency and reward-overlay assumptions were also corrected; they were not game-rule changes.

## Limits and migration notes

- Network isolation was enforced and tested **inside the application**, using Chromium request blocking, CSP, disabled background networking/DNS resolution, a dead-end proxy, and disabled main-process network APIs. The session lacked Windows administrator rights, so an independent Windows Firewall block or OS packet-capture test for every Electron utility process was **not performed**. The stricter OS-level isolation verification remains unverified.
- The live hosted game's browser visit remained on "Connecting" here. Its publicly delivered HTML, scripts, data and artwork were inspected, but full live-site gameplay comparison was unavailable. `VERSION-AUDIT.md` identifies exactly what the desktop uses.
- Very old name-only backups without numeric item IDs are rejected. Membership entitlements are not imported. Cloud-only artwork cannot be reconstructed offline. Import replaces rather than merges progress. The free three-banner creation limit remains.
- Audio evidence is machine playback telemetry, system-loopback capture and model-assisted analysis, not human listening or a physical-speaker test. System loopback can include other applications; the game's own audible state was checked independently.
- Backup file-selection dialogs were stubbed during automated UI tests. The actual IPC file-writing/reading and restore logic ran; manual browsing of those native dialogs was not separately exercised.
- This is an unsigned x64 folder-based application. Keep the extracted files together. It was tested on this Windows machine; a separate clean Windows installation was not available.

Raw results and screenshots are in `outputs/`: `packaged-test-results.json`, `custom-test-results.json`, `standalone-test-results.json`, `audio-test-results.json`, `unit-test-results.txt`, `asset-audit.json`, `image-validation.json`, `packaged-skirk-7.1.png`, `packaged-custom-banner.png`, `packaged-chronicled.png` and `packaged-wish-animation.png`.
