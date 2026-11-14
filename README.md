# Genshin Wish Offline

Genshin Wish Offline is a Windows desktop wish simulator based on the [upstream Genshin Impact Wish Simulator](https://github.com/Mantan21/Genshin-Impact-Wish-Simulator). This edition bundles its game data and artwork, including banners through version 7.1 phase 2, and runs without a network connection. It is a fan project and is not affiliated with HoYoverse.

Extract the complete Windows package and open `Genshin Wish Offline.exe`. Keep the executable alongside the files and folders in the package. The app is unsigned. F11 toggles fullscreen. See [DESKTOP.md](DESKTOP.md) for launch, backup, import and build instructions.

## What is included

- Beginner, standard, character, weapon and chronicled wishes, with pity and banner-specific guarantees.
- A local custom-banner editor, inventory, wish history, shop and adjustable settings.
- A Collector's Journal with achievements, collections and cosmetic titles.
- Character constellations, equipment and talents, plus individual weapon copies and refinement. See [PROGRESSION.md](PROGRESSION.md) for the rules and calculation limits.
- Local saves and JSON backups. Online publishing and membership services are not part of this desktop edition.

The simulator uses its own probability implementation, not HoYoverse's private algorithm. Rates and pity thresholds are defined in `src/lib/data/wish-setup.json`, and the increasing-rate calculation is in `src/lib/helpers/gacha/probabilities.js`. Settings can change rates. Results should not be treated as predictions for the official game.

## Development

Install Node.js 22 or newer and npm. From this directory on Windows, run:

```powershell
npm ci
npm test
npm run check
npm run build
npm run desktop
```

`npm run build` produces the static frontend. `npm run desktop` opens that build in Electron. `npm run package` rebuilds the frontend and creates the Windows x64 unpacked application under `../outputs/desktop-1.5.0/win-unpacked`. Dependency installation requires internet access; the packaged app does not. More test and packaging details are in [DESKTOP.md](DESKTOP.md).

## Documentation

- [Desktop guide](DESKTOP.md): saves, backups, migration and packaging.
- [Progression](PROGRESSION.md): inventory migration, combat data and calculation scope.
- [Artwork](IMAGE-QUALITY.md): source files, processing and reproduction.
- [Version audit](VERSION-AUDIT.md): the upstream and deployed snapshots used for this edition.
- [Third-party notices](THIRD-PARTY-NOTICES.md) and [license](LICENSE): credits and terms.
- [Test reports](TEST-REPORT.md): dated evidence for earlier desktop releases. The [journal](JOURNAL-TEST-REPORT.md) and [offline baseline](OFFLINE-BASELINE-TEST-REPORT.md) reports cover their respective releases.
- [Localization guide](src/locales/README.md): adding and registering translations.
