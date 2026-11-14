# Third-party notices

Genshin Wish Offline is based on Mantan21/Genshin-Impact-Wish-Simulator, revision d7d1870df7f2b168e37affdfadb43ba9da75857a. Source code copyright AguzzTN54 and contributors, MIT license, reproduced in LICENSE.

Genshin Impact artwork, character and weapon images, icons, fonts, music, sound effects and game recordings belong to HoYoverse and their respective rightsholders. Upstream credits Hoyo Wiki, Genshin Fandom Wiki, Honey Impact, and recordings from the game with modifications. The original media originate from that repository and the public deployment; desktop artwork transformations are recorded below. The MIT code license does not establish an MIT license for HoYoverse assets. This fan application is not affiliated with HoYoverse.

Dependency notices are retained by Electron packaging in resources and LICENSES.chromium.html. No membership key or premium entitlement is bundled or granted.

Character levels, talent coefficients, constellation text, weapon levels and refinement values use the English combat data from theBowja/genshin-db-dist v5.2.14, imported for offline use. Exact source bundle SHA-256 hashes are in combat-provenance.json. The upstream code/data package MIT notice is reproduced in COMBAT-DATA-LICENSE.txt; Genshin Impact game content remains the property of its respective rightsholders. Ranks beyond C6/R5 and talent coefficients beyond the source tables are custom simulator extensions.

The character menu also bundles 1,375 public game images: constellation screenshots from genshindev/api and talent/constellation icons from Enka.Network. Exact URLs and SHA-256 hashes are retained in static/progression/manifest.json and the packaged progression/manifest.json. These images remain HoYoverse game content. 86 characters have an original constellation diagram; the remaining characters use a neutral six-star layout with their original available icons.

The desktop data extension through version 7.1 phase 2, new character and weapon metadata, item translations, and 85 additional image paths were obtained from the public JavaScript and image responses of https://game.genshin-wish-simulator.cc/ on 2026-10-31. See audit/deployed-image-manifest.json and audit/deployed-files.json in the delivered source workspace for exact URLs. Newer banners originally contained baked lettering; desktop 1.3.0 overlays localized live headings and nameplates. No protected or membership-only content was downloaded.

Desktop 1.2.0 reuses the upstream splash and seven element-background images as animated layers, and the original wish-backsound.ogg as a separately mixed reveal ambience. These media files are unchanged; no generated or newly downloaded media assets were added.

Desktop 1.3.0 restores primary banner, splash, card, custom-banner and background artwork using the offline Real-ESRGAN x4plus-anime model, downsampled and blended with the source. Real-ESRGAN code is BSD-3-Clause: https://github.com/xinntao/Real-ESRGAN . The processor and model are not runtime dependencies and are not shipped in the player build. These restorations do not change ownership of HoYoverse artwork.

Additional native wish cards and portraits were downloaded from the public https://enka.network/ui/ asset cache. Source identifiers, exact URLs, hashes, dimensions, crop operations and restoration settings are recorded in artwork/native-sources.json and artwork/manifest.json in the source release. Sandrone's card and portrait use documented crops from the already bundled splash. The preserved originals can be reconstructed as `artwork/originals.zip` from its committed parts. No membership-only or protected media were accessed.

For the 18 newer event posters, old heading ink was selectively inpainted before restoration so native text can sit on the original blended background without an opaque cover. OpenCV is an optional build-time tool only; it is not part of the player runtime. Recorded masks and hashes are in artwork/letter-cleanup.json.
