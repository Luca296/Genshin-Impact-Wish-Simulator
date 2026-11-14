# Repository and deployed simulator comparison

Inspected on 2026-10-31.

Starting source: [Mantan21/Genshin-Impact-Wish-Simulator](https://github.com/Mantan21/Genshin-Impact-Wish-Simulator), master revision `d7d1870df7f2b168e37affdfadb43ba9da75857a`. The complete application code and public assets were fetched at this pinned revision into the dedicated project directory. The MIT notice and upstream README are retained.

The [landing site](https://genshin-wish-simulator.cc/) embeds [the actual game](https://game.genshin-wish-simulator.cc/). Its HTML includes advertising and tracking integrations and passes language, wish-amount and animation options to the iframe. The desktop uses the game interface, without the landing page.

The public deployed game's HTML and 179 reachable JavaScript/CSS dependency paths were captured in the accompanying audit directory. A direct browser visit remained on “Connecting” in this environment; full live-site gameplay was therefore not available for comparison. The public scripts and artwork were accessible through the system HTTPS client and were inspected directly. No account, member content or access-controlled endpoint was used.

| Area | Requested repository revision | Public deployed game | Desktop choice |
| --- | --- | --- | --- |
| Latest banner | 6.6 phase 2, storage marker 6.6.2 | 7.1 phase 2 | Deployed data through 7.1 phase 2 |
| Additional patches | Ends at 6.6 | Adds 6.7, 7.0 and 7.1 | All deployed patch definitions, both phases where available |
| 7.1 phase 2 | Absent | Skirk, Escoffier; Azurelight and Symphonist of Scents | Exact publicly delivered definitions and artwork |
| Item metadata and names | Older character/weapon tables | Extended and revised tables and item translations | Extracted deployed tables and available item translations |
| Banner text | Svelte draws text over artwork | Newer banners can set `bakedText` | Avoid duplicate text on these images |
| Rules | Custom upstream pity and guarantee implementation | Matching rate-table structure is visible in deployed scripts | Repository rule implementation retained, with deterministic boundary tests |
| Assets | Repository image tree and static media | Additional hashed artwork | Repository assets plus 85 additional publicly delivered image paths |
| Storage | localStorage plus IndexedDB | Same backup structure visible in deployed scripts | Stable desktop profile, compatible JSON import/export and bounded automatic backups |
| Publishing and online services | Sharing, memberships, ads, comments, donation feeds, cloud hooks | Online deployment integrations | Local backup export replaces publishing; online-only UI and initialization are removed |

The desktop is therefore a source-based offline edition extended with the site's public 7.1 content. It is not described as a byte-for-byte copy of the deployed application. It retains the repository's appearance, animation media, audio, local editor, inventory, currencies, history, settings and rule algorithms. Game-data labels describe this simulator's snapshot, not a promise about official game releases or future updates.

The deployment also contains duplicate character records. They were retained to avoid silently changing its item table or upstream probabilities. Membership validation is disabled without granting membership, and the free local-editor limit remains in place.

The audit includes `deployed.html`, `landing.html`, `deployed-files.json`, the public script snapshots, `deployed-image-manifest.json` and extraction/download scripts. `asset-provenance.json` records the bundled source asset paths and their SHA-256 hashes. Rebuilding uses the checked-in local data and assets, without querying the live site.
