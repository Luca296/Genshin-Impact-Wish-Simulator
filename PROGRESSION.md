# Character and weapon progression

Version 1.5.0 adds manual upgrades, individual weapon copies, equipment, and character menus based on Genshin's in-game layouts. The UI uses element-colored star fields, original constellation diagrams and icons, the existing character artwork, talent detail panels, weapon comparison cards, and material selection. It uses 2D artwork rather than interactive 3D character models.

## Saves and migration

Acquisition totals remain in `ownedItem[itemID].manual` and `.wish` for history and duplicate rewards. They no longer activate upgrades. Each record has `progressionVersion: 2`.

- Characters store `activated`. Unspent Stela Fortuna equals total acquisitions minus the first character minus activated ranks.
- Weapons store `copies`, each with a stable ID, refinement rank, and inventory lock. A consumed donor is removed and its ID retained in `consumed` so merging an older backup cannot resurrect it. A refined donor contributes its full refinement rank.
- Equipment stores both `weaponItemID` and `weaponCopyID`. Only the character's verified weapon class can be equipped. Equipping an existing copy on another character transfers it. Equipped and locked copies cannot be consumed.
- Build settings and activated ranks are included in ordinary and automatic backups.

Old displayed C6/R5 values did not represent spent materials. Migration creates C0 characters with all duplicate materials unspent and separate R1 weapon copies. Migration is idempotent. The original ownership table is retained in `inventoryMigration.legacyOwnedItem`.

Duplicate catalogue rows for Prune, Nicole and Angelos Heptades were removed. Disaster and Remorse used Angelos Heptades' ID `14523`; it now has the reserved local ID `90014523`. Its verified game ID is `13517`, which could not be used as the local ID because the upstream catalogue already assigns it to Whitelake Frostfeather. Named history records move attributable acquisitions to the repaired item. Unattributed shared-ID copies stay with Angelos Heptades. The migration records the ambiguity count and retains the original table.

Local simulator IDs remain distinct from canonical game IDs. The full mapping is in `src/lib/data/combat-coverage.json`; existing unrelated IDs are preserved.

## Game data

The pinned English data is `genshin-db-dist v5.2.14`. Its combat subset covers 245 of 252 unique catalogue entries: 117 characters and 128 weapons. The importer corrects three lookup spellings without renaming saved items or artwork. Exact source bundle hashes are in `combat-provenance.json` and the license is in `COMBAT-DATA-LICENSE.txt`.

Verified stats are unavailable for Vesna, Vodyanitsa, Beyond the Chrysalis, Hymn of the Maelstrom, New Bough, Winter's Heavy Heart and Breezeborne Refrain. Those entries still support collecting and manual upgrades. Their stats are explicitly unavailable rather than substituted from another character or weapon. Characters without a verified weapon class cannot equip arbitrary weapons.

All 1,375 additional menu assets are bundled under `static/progression`, with URLs and hashes in its manifest. 86 characters have a genuine constellation diagram. Others use a neutral six-star layout and their available original constellation icons. Builds and player runtime require no external requests.

Normal builds use the committed JSON and bundled images. `scripts/import-combat-data.cjs` regenerates combat data and coverage from the four preserved English data bundles under `../audit/combat-source/dist`. `../audit/download-progression-art.py` imports the public UI art. Neither is a player runtime dependency.

## Infinite ranks

- C0–C6 and R1–R5 retain the source values. C7+ repeats the six slots; each slot's strength is `1 + floor((C - slot) / 6)` once unlocked.
- Numeric constellation bonuses accumulate additively. Talent-level increases repeat. Mechanical unlocks occur once. Repeating a purely mechanical slot can therefore provide no additional numerical benefit.
- R6+ continues each passive value's R4-to-R5 increment. Probability values stop at 100%, and decreasing proc cooldowns stop at 0.1 seconds. Weapon base ATK and secondary stats depend on level, not refinement.
- Talent coefficients beyond the source table continue its final recorded increment. These overflow rules are simulator extensions, not official Genshin ranks.
- There is no gameplay rank cap. Saved counts use safe integers and reject operations that would lose numeric precision.

## Calculation scope

Attributes use real level and ascension curves, the exact equipped weapon copy's passive rank, and selected build modifiers. Talent descriptions and coefficient tables come from the source data, including alternate sprints and extra passives. Constellation talent-level bonuses apply only after activation.

Damage previews calculate individual recognized ATK-, HP-, DEF- or EM-scaling hits, multiple-hit sums and slash-separated variants, crit and average damage, enemy defense, defense reduction/ignore, and resistance. Selected numeric effect clauses affect matching stats or talent groups. Homa's HP conversion and applicable skill/burst ATK conversions are evaluated directly. Kokomi's innate crit/healing adjustment is permanent.

This is not a complete rotation/team/reaction simulator. Complex kit state, reaction damage, stack timing, team-only effects and unrecognized effect clauses require explicit build modifiers. The UI exposes applied conditional modifiers; it does not silently infer every effect from prose. Raw talent attributes remain available when a damage formula cannot be evaluated safely.

## Verification

`npm test` covers resource conservation, identity migration, C100, R100, copy removal and locks, exact-copy equipment, class rejection, equipment transfer, backup restore, consumed-copy merge protection, source stats, HP conversion and damage arithmetic. `npm run check` and `npm run build` validate the Svelte application.

`node tests/progression-desktop.cjs [optional-packaged-executable]` operates the actual Electron UI with an isolated profile. It checks legacy migration, manual C100 activation, stat/talent panels, weapon selection and incompatible classes, material consumption, responsive layouts, reload and backup restore. Evidence is written to `../outputs/progression-verification`.
