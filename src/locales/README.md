# Add a locale

1. Copy `en-US.json` in this directory to a file named for the new locale. Translate the values and keep the JSON keys and placeholders intact.
2. If character and weapon names need translation, copy `items/en-US.json` to the same locale name under `items` and translate those values.
3. Add the language name and flag to `src/lib/data/country.json`.
4. Add the locale to `supportedLocales` in `src/lib/helpers/i18n.js`. Add it to `itemLocales` there if you supplied item names.
5. Run `npm run check` and `npm run build`, then select the language in the app and check the translated screens. Journal and progression labels include English-only text.

The following official wish detail pages can be used as references. Replace `LANGUAGE` in the example URLs with a supported language code. Their content and availability may change.

1. [Beginners' Wish](https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha/index.html?lang=en&region=os_asia#/newbiegacha)
   ```
   https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha/index.html?lang=LANGUAGE&region=os_asia#/newbiegacha
   ```
2. [Standard Wish](https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha/index.html?gacha_id=fecafa7b6560db5f3182222395d88aaa6aaac1bc&lang=en&region=os_asia#/)
   ```
   https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha/index.html?gacha_id=fecafa7b6560db5f3182222395d88aaa6aaac1bc&lang=LANGUAGE&region=os_asia#/
   ```
3. [Character Event Wish](https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha/index.html?gacha_id=d7d9d26fd678245ee04bec46b4bab7a8f5359c90&lang=en&region=os_asia#/) (Yoimiya Banner)
   ```
   https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha/index.html?gacha_id=d7d9d26fd678245ee04bec46b4bab7a8f5359c90&lang=LANGUAGE&region=os_asia#/
   ```
4. [Weapon Wish](https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha/index.html?gacha_id=38aa9125d7f6a5c4cdaceff8ac720b22ad9236b3&lang=en&region=os_asia#/)

   ```
   https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha/index.html?gacha_id=38aa9125d7f6a5c4cdaceff8ac720b22ad9236b3&lang=LANGUAGE&region=os_asia#/
   ```

5. [Cronicled Wish](https://gs.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html?gacha_id=8b10b48c52dd6870f92d72e9963b44bb8968ed2f&lang=en&region=os_asia#/)
   ```
   https://gs.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html?gacha_id=8b10b48c52dd6870f92d72e9963b44bb8968ed2f&lang=LANGUAGE&region=os_asia#/
   ```


## Translation contributors

<table>
   <thead>
      <tr>
         <th> Language </th>
         <th> Contributor </th>
      </tr>
   <thead>
   <tbody>
      <tr>
         <td> Chinese (Simplified) </td>
         <td>
            <a href="https://github.com/SleepyAsh0191">
               <img width="20px" src="https://avatars.githubusercontent.com/u/64446140?s=20" />
               SleepyAsh0191
            </a>
         </td>
      </tr>
      <tr>
         <td> Chinese (Traditional) </td>
         <td>
            <a href="https://github.com/wibe01204 ">
               <img width="20px" src="https://avatars.githubusercontent.com/u/90883053?s=20" />
               wibe01204
            </a>
         </td>
      </tr>
      <tr>
         <td> Deutsch </td>
         <td>
            <a href="https://github.com/LA1211">
               <img width="20px" src="https://avatars.githubusercontent.com/u/70387228?s=20" />
               LA1211
            </a>,
            <a href="https://github.com/Alextocode">
               <img width="20px" src="https://avatars.githubusercontent.com/u/11820339?s=20" />
               Alexander Schüßler
            </a>
         </td>
      </tr>
      <tr>
         <td> Français </td>
         <td>
            <a href="https://github.com/Rapi-shiny">
               <img width="20px" src="https://avatars.githubusercontent.com/u/14368641?s=20" />
               Rapi-shiny
            </a>
         </td>
      </tr>
      <tr>
         <td> Italiano </td>
         <td>
            <a href="https://github.com/OCTIPI1">
               <img width="20px" src="https://avatars.githubusercontent.com/u/64631735?s=20" />
               OCTIPI1
            </a>,
            <a href="https://github.com/ScarletSeal">
               <img width="20px" src="https://avatars.githubusercontent.com/u/118117643?s=20" />
               ScarletSeal
            </a>
         </td>
      </tr>
      <tr>
         <td> Japanese </td>
         <td>
            <a href="https://github.com/Sunny-JP">
               <img width="20px" src="https://avatars.githubusercontent.com/u/122193933?s=20" />
               Sunny-JP
            </a>
         </td>
      </tr>
      <tr>
         <td> Korean </td>
         <td>
            <a href="https://github.com/jwdjk392">
               <img width="20px" src="https://avatars.githubusercontent.com/u/108386744?s=20" />
               jwdjk392
            </a>
         </td>
      </tr>
      <tr>
         <td> Portuguese </td>
         <td>
            <a href="https://github.com/natrodrigo">
               <img width="20px" src="https://avatars.githubusercontent.com/u/57020127?s=20" />
               Natã Pereira
            </a>
         </td>
      </tr>
      <tr>
         <td> Russian </td>
         <td>
            <a href="https://github.com/ArtMuxomor">
               <img width="20px" src="https://avatars.githubusercontent.com/u/27068331?s=20" />
               ArtMuxomor
            </a>
         </td>
      </tr>
      <tr>
         <td> Vietnamese </td>
         <td>
            <a href="https://github.com/bibi0019">
               <img width="20px" src="https://avatars.githubusercontent.com/u/49600231?s=20" />
               bibi0019
            </a>
         </td>
      </tr>
   </tbody>
</table>
