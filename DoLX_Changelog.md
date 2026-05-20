> **If the normal pipeline links above fail, use these backup downloads instead:**
> [Images](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=img) | [Audio](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=audio)

## Instructions:
  * Download DoLX_HTML.
  * Download DoLX_Images.
  * Download DoLX_Audio.
  * Extract all 3 downloaded packages into the same folder.
  * Run "Degrees of Lewdity VERSION.html".
  * Enjoy!

## Changelog
## Changes and Additions:
* Updated **Beesss imagepack assets**.
  * Added rename and masking fixes for the Beesss graphic mod by **DragonDust**.
* Added **configurable X-Change settings**.
  * Added new settings for X-Change spike and combat pilling behaviour.
  * Added **Suspicious pills have side effects**, enabled by default.
  * Gates side-effect calls inside `xchange-random-spike` so all spike sources share the same behaviour.
  * Allows players to restore the old effects-only spike behaviour by disabling the toggle.
  * Added combat settings for beasts carrying combat pills.
  * Added NPC pill-carry chance and per-turn pill draw chance settings.
  * Added a clean Pink/Blue pill ratio setting.
  * Prevents duplicate side-effect application by removing the extra combat-side call.
  * Ensures each NPC can only pull one pill per encounter.
  * Applies beast filtering to combat pilling.
  * Routes clean pills through `xchange-pink` and `xchange-blue`.
  * Keeps Suspicious pills as the fallback when clean pills cannot apply.
  * Updated combat pilling tooltips.
  * Added guarded default initialisers for existing saves.
  * Tidied mod init handling as a whole.
  * Updated the character tab UI when wearing the bullet vibe.
* Added **X-Change custom hex hair dye saving**.
  * X-Change body snapshots now preserve custom hex hair dyes from advanced hair dye at the hairdresser.
  * Custom dye data is now restored exactly when returning to a saved body.
  * Legacy body saves without custom dye data now clear `is_custom` so the restored vanilla hair colour displays correctly.
  * Re-runs `colorCache()` after restoration so renderer filter strings are available.
  * Prevents stale custom dye flags from overriding newly assigned vanilla hair colours.
  * Ensures custom dye state is safely snapshotted alongside vanilla hair variables.
* Added **tummy parasite fertility scaling**.
  * The tummy parasite now grants an automatic fertility bonus based on how long it has been latched.
  * The bonus starts after 14 in-game days.
  * The bonus scales up over time and reaches full strength after about 30 in-game days.
  * At full strength, the parasite can increase the chance of higher-order pregnancies, including forcing triplets and adding a smaller follow-up chance for quadruplets.
* Added **Colossal NPC penis size support and reactions**.
  * Added Colossal as a selectable NPC penis size in relevant game settings.
  * Added Colossal penis description pools for persistent and named NPC generation.
  * Added support for random NPCs to roll Colossal size through `npcColossalPenisChance`.
  * Updated NPC and beast generation logic so size 5 is no longer treated as only Huge.
  * Added Colossal-specific reactions in vaginal, anal, oral, double penetration, beast, portal panties, pillory, wall, gloryhole, plant, and standard ejaculation scenes.
  * Split shared `<<case 4 5>>` and `<<case 3 4 5>>` branches so Colossal has separate harsher reactions while Huge keeps its original text.
  * Fixed unsafe pain formulas that could divide by zero when `penissize` is 5.
  * Updated virginity and detail records to preserve size 5 and use strap-on-aware descriptions.
  * Replaced fragile `penisdesc.includes("strap-on")` checks with `npcHasStrapon(...)` where appropriate.
  * Added strap-on-aware display text so old descriptions like "monstrous cock" do not appear when an NPC is using a strap-on.
  * Fixed several small typos and grammar issues while patching.
  * Tidied init handling further.
* Updated **earrings positioning**.
  * Earrings can now be positioned behind hair, in front of hair, or behind fringe.
  * This option can be found at the mirror under **Change your hair style**.
* Updated **character description text**.
  * Characters are now described as enby instead of orphan when their identity is non-binary.
  * Character descriptions are now hidden during historical reenactment conditions, such as Hopeless Cycle or similar scenarios.
* Updated **text widgets**.
  * Made several text widgets aware of non-binary PCs, including friend, PC sex, fox, and bunny text.
* Updated **TF trait descriptions**.
  * Trait descriptions now better account for enby and transgender PCs.
* Updated **mid-sex speech**.
  * Added more variety for some named NPCs so they are no longer silent or repeating nearly identical lines.
* Updated **parasite barn limit**.
  * Increased the parasite barn maximum count to 50.

## Rebalancing and Fixes:
* Fixed **factory flower selling**.
  * Fixed an issue where flowers could not be sold at the factory.
* Fixed **brothel gloryhole crash**.
  * Fixed a crash that could occur during brothel gloryhole content.
* Fixed **waiting room crash for vanilla saves**.
  * Fixed a crash that could occur in the waiting room when loading vanilla saves.
* Fixed **reload page crash**.
  * Fixed a crash caused by refreshing or reloading the browser with F5.
  * `xchange-init` is now calculated correctly after page reloads.
* Fixed **persistent bike lake access**.
  * Previously, players could ride the bike to the lake from eligible locations even if `$town_projects.road` was below 4.
  * With persistent bike location enabled, this could leave the bike at the lake before the lake had proper return access through the bus stop route.
  * The lake bike link now only appears when either:
    * persistent bike location is disabled, preserving the old free-access behaviour
    * or `$town_projects.road gte 4`, meaning the lake bus stop route has been unlocked
  * Non-persistent bike behaviour is unchanged.
  * Persistent-bike saves can no longer strand the bike at the lake too early.
* Rebalanced **bike theft chances by security tier**.
  * Replaced the old bike theft protection multiplier with fixed daily theft chance tables by location and security tier.
  * New values are calibrated around a 75% weekly theft chance for an unsecured street bike.
  * Each security upgrade now provides a more meaningful reduction:
    * No gear: ~75% weekly street theft chance
    * Wheel Lock: ~50%
    * Standard Chain: ~30%
    * Heavy-Duty Chain: ~15%
    * U-Lock: ~7%
    * U-Lock + Alarm: ~2%
  * Lake and farm locations now use separate lower-risk tables.
  * Bailey's defeated-chain penalty now scales from the current street theft tier instead of adding a flat bonus.
  * Farm aggro now scales multiplicatively with the farm theft tier instead of adding a large flat bonus.
  * Clamps the security gear tier before table lookup to avoid invalid indexes.
* Fixed **consensual beast knockdown loop**.
  * Consensual dog and wolf encounters could endlessly repeat the Combat Extended standing-fight knockdown attempt on the Easy preset.
  * The approach branch ignored `$consensual`, used hostile text, and did not always progress stance when stability loss failed.
  * Added a consensual approach path.
  * Blocks hostile knockdown logic during consensual beast encounters.
* Fixed **X-Change special events**.
  * Fixed street flirt and pub flirt events not happening correctly during X-Change content.
* Fixed **Avery kitchen steal**.
  * Fixed an issue with Avery kitchen stealing content.
* Fixed **temple garden steal**.
  * Clears `$templeGardenFruit` when temple garden steal flows finish so repeated direct steals reroll fruit instead of reusing the previous value.
  * Replaced two stale `<<switch $phase>>` checks with `<<switch $templeGardenFruit>>` in wolf-related steal outcomes.
  * Fixed repeated Steal actions always giving the same fruit.
  * Fixed wolf-friendly night steals awarding no fruit.
  * Fixed wolf steal recovery awarding no salvaged fruit.
  * Fixed related typos.
* Fixed **missed pronoun**.
  * Fixed a missed pronoun in Elk Compound leave text.
* Fixed **Whitney hallway event phrasing**.
  * Reworded confusing phrasing in Whitney’s hallway event.
* Fixed **sleep notice wording**.
  * Reworded the notice shown when resting causes no fatigue change.
  * The message is now more general and less confusing when fatigue is already 0, the PC is too stressed, or another condition prevents fatigue recovery.
* Fixed **spacing and UI issues**.
  * Removed weird spacing during the swimming competition.
  * Removed weird spacing in the jewellery shop.
  * Made the Updated UI bar meter thinner.
* Wrapped **portal pill console warnings**.
  * Wrapped portal pill console warnings behind debugger checks to reduce normal console noise.
* Fixed by **CitrusBurst**.
  * Re-added `<<healthMultiplier>>` and `$enemyarousalmax` to init for `Monster Tower Rape` and `Monster Tower Sex`.
  * Updated `speech.twee` to remove the old `perceivedGender` gate.
  * Updated speech logic to use the newer strap-on/herm genital selection condition.
  * Cherry-picked merge audit changes from vanilla 0.5.8.10 to 0.5.9.8.
