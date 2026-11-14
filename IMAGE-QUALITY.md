# Artwork restoration, desktop 1.3.0

This release keeps content through 7.1 phase 2, the 700 ms black emblem hold and the 1600 ms character entrance. Existing saves, pity, guarantees, inventory, currency and backups retain their formats and locations.

## What changed

553 artwork entries are tracked in artwork/manifest.json. The pass restores primary event banners, both Standard banner artworks, the Noelle introductory banner, custom-banner surfaces, character splashes, wish-card images and the main/elemental backgrounds. Standard and Noelle art are now 3200 pixels wide. Most event posters are 3200 pixels wide; three already large sources retain their original bytes. Small thumbnails used at thumbnail size and intentionally blurred gallery textures were not enlarged unnecessarily.

The offline Real-ESRGAN x4plus-anime model ran at 4x. Its output was downsampled to the delivery resolution and blended 60% with a conventional source resize. Original transparent edges were resized separately. This reduces visible compression and jagged edges while retaining some original texture; it cannot recover authentic detail absent from the source.

Nine characters received genuine public original wish-card images and original portrait assets from Enka's game-asset cache. Sandrone's card and portrait are documented crops of the existing splash. Source IDs and URLs were visually checked. The summary renderer now uses these full-height card assets where available, with the existing splash/offset fallback for other characters, outfits and custom art.

The 18 newer posters originally baked English headings and names into their pixels. Their headings, availability/event labels, names, titles and stars now use live text and the bundled Genshin fonts. Four newly added banner headings use verified English fallbacks because upstream supplied no translated keys. Other existing translations remain active. Promotional emblems and some UP markings remain in the artwork.

## Blended left panel

The original white fade is retained. No opaque white rectangle is placed over the banner. Old heading/subheading ink was selectively removed from preserved originals with OpenCV Telea inpainting before applying the restoration pass. The mask is limited to lettering regions and checked to leave every unmasked source pixel unchanged before upscaling. Per-poster heading and badge positions follow the original artwork. artwork/letter-cleanup.json records masks, thresholds, areas and output hashes.

The pixels directly behind erased lettering are interpolated, not authentic recovered artwork. This is confined to those small heading regions. Original artwork beyond the cleanup mask is retained before the documented global restoration step. The native labels remain crisp at different window sizes.

## Provenance and reproduction

- asset-provenance.json describes current delivered bytes.
- upstream-asset-provenance.json preserves the original downloaded-file manifest.
- artwork/originals.zip retains every original modified by the pass.
- artwork/native-sources.json records original public replacement images and crop operations.
- artwork/manifest.json records source/output hashes, sizes, model hash and settings.
- artwork/letter-cleanup.json records the selective heading cleanup.

Playing and rebuilding the application from the supplied processed assets require no AI software. Rebuilding follows DESKTOP.md. To regenerate the artwork, install the optional pinned Python dependencies from artwork/requirements.txt in a virtual environment, obtain the official Real-ESRGAN ncnn Vulkan executable and x4plus-anime model, and compare their hashes with artwork/manifest.json. Then run from the project directory:

```powershell
python scripts/prepare-artwork.py --upscaler C:/tools/realesrgan-ncnn-vulkan.exe --models C:/tools/models --cache ../audit/hd/cache
python scripts/clean-banner-lettering.py --upscaler C:/tools/realesrgan-ncnn-vulkan.exe --models C:/tools/models --cache ../audit/hd/clean
python tests/artwork-check.py
```

The scripts read preserved originals, so they do not compound previous upscales. Native downloaded/cropped sources are already bundled in artwork/native. GPU floating-point implementation differences can produce small pixel differences across other devices. Reverting an image uses its preserved original and requires a frontend rebuild to regenerate asset hashes.

Tool references: [official Real-ESRGAN anime model documentation](https://github.com/xinntao/Real-ESRGAN/blob/master/docs/anime_model.md), [official portable ncnn Vulkan releases](https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan/releases). Asset ownership remains with HoYoverse and the other original rightsholders. See THIRD-PARTY-NOTICES.md.

On a fresh clone, run `python artwork/restore-originals.py` to reconstruct `artwork/originals.zip` from the committed parts before running artwork checks or regenerating images.
