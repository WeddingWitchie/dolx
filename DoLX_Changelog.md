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
* Update to **Vanilla ver 0.5.10.8**
* Added **Hyper Fertility X-Change pills**.
  * Added a new X-Change pill line focused on extreme fertility.
  * **X-Change Pink Hyper Fertility** turns the player female and makes conception almost certain after unprotected insemination.
  * **X-Change Blue Hyper Fertility** turns the player male and greatly increases insemination success.
  * Hyper Fertility also greatly increases the chance of multiple births:
    * Twins: 80%.
    * Triplets: 50%.
    * Quadruplets: 30%.
  * Added **SWP Anti-fertility Pill**, sold by the shady remover dealer.
    * Cancels the Hyper Fertility effect.
    * Returns pregnancy speed and multiple-birth odds to normal.
    * Does not end or prevent an existing pregnancy.
  * Integrated Hyper Fertility into the existing X-Change pill system.
    * Can appear in pill spikes if enabled.
    * Added spike-pool support and a frequency slider in X-Change settings.
    * Added cheat toggle support.
  * Added new feats:
    * **Life Comes in Pairs** for twins.
    * **Fours** for quadruplets.
* Updated **Poppy**.
  * Poppy can now be available during winter.
  * Updated Poppy's math study event, where stimulants can be used in their flat by **Sei/Karl Sendis**
  * Fixed Poppy's Christmas event by **Sargalis**.
  * Fixed Poppy Bailey payment money print.
* Updated **Mikili** by **Alexandrite**.
* Updated **Beessss** graphics.
  * Added credits by **Bec**.
* Updated **bear transformation**.
  * Bears are naturally drawn to honey, so bear-transformed players have an increased chance to find honey in the forest.
  * Bear-transformed players can find honey regardless of their settings.
  * Bear-transformed players can harvest honey more easily.
* Updated **water dragon transformation**.
  * Fixed Dragon Eyes not appearing in old saves.
  * Dragon Eyes are now available in the mirror.
  * Fixed water dragon stat display.
  * Water dragon horns now count properly as horns for horn-related checks and effects.
* Updated **horse racing**.
  * Horses can now be injured by incidents.
  * Injured horses will be unavailable until they recover.
  * If a horse is injured, it is better to wait until the next week before betting again.
* Updated **daydreaming**.
  * All daydream choices now reduce fatigue.
  * Some special daydream events can also reduce stress or apply other additional effects.
* Updated **moor harpy tailwind**.
  * The random event that instantly flies the player to the tower now requires the player to have Great Hawk syndrome first.
* Updated **school narration**.
  * Tidied school-related narration.
  * Fixed narration where Mason could be found at the lake before meeting the player at school.
  * Fixed a typo in one school hallway random event.
* Tidied **moor narration**.

## Rebalancing and Fixes:
* Changed **Whitney collar variables** by **Frostberg**.
* Fixed **broken cursed Whitney collar state**.
* Fixed **Whitney's toilet rule**.
  * Whitney now enforces the toilet they actually tell the player to use.
  * Previously, Whitney always pushed the player toward the opposite toilet of their current body.
  * This now works properly for male, female, and hermaphrodite characters.
  * Previously, hermaphrodite characters were always forced into the girls' toilets regardless of what Whitney said.
  * Existing saves keep working.
    * If the player is already under the rule, it locks to the long-standing "opposite of your body" toilet.
* Fixed **HBSC standing orders**.
  * Bailey now auto-pays rent from the player's bank savings at:
    * The farm cottage.
    * Poppy's flat.
    * The temple.
    * The orphanage.
  * Previously, the standing order only worked at the orphanage and was ignored everywhere else.
  * If the player's savings cannot cover rent at any of these locations, the standing order is cancelled and the player is told.
* Fixed **missing `setBabyIntro` function**.
  * Restored the missing block after it was accidentally removed.
* Fixed **ring redirect** by **Frostberg and D.N.A.**
* Fixed **jewellery rendering in encounters**.
  * Removed jewellery from being rendered during encounters, proper fix by **Frostberg**.
* Fixed **street slime crowd encounter crash**.
  * Fixed a crash that could happen during the Street Slime extreme crowd scene when the encounter reached its finishing sequence.
  * Fixed an audio issue where voice playback could try to stop a missing playlist, causing an error instead of continuing normally.
  * The scene should now continue properly without interrupting the player.
* Fixed **messed up NPC generation**.
  * Fixed NPC generation issues in the Police Station.
  * Fixed NPC generation issues in the Farmers Centre factory.
* Fixed **spa ban duration**.
  * Fixed an issue where the spa ban never decreased.
  * Lowered the penalty to a random 1 or 2 weeks.
* Fixed **broken renderer when naked**.
* Fixed **Poppy Bailey payment money print**.

## Migration:
* Updated orgasm event migration.
  * Changed event checks from arousal max to pleasure max for events that lead to orgasm.
  * This matches the mod's current orgasm logic, where orgasm happens when pleasure reaches max.
## Cleanup:
* Removed **water dragon vanilla graphics** from the game due to credit issues.
* Removed duplicated **black eyes**.
* Trimmed up **rings**.
  * Reduced file bloat by **Frostberg**.

