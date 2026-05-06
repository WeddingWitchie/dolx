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
* Updated mod base to **vanilla version 0.5.9.8**.
* Added **Poppy** as a **modded Love Interest**.
  * Added adaptable Poppy display support, allowing their image to change depending on the event.
  * Added time fixes for Poppy.
  * Added music for **Poppy** and flats (Flats music the same like cafe. Poppy ModLI using same music like sea)
* Added a full **bike rework**.
  * Bikes now have proper events, narration, and mechanics.
  * Initial work by **Bec**.
  * Bug-fixed and expanded by **D.N.A.**
* Added **minimap** to **dock sneak**.
* Updated **earslime orgasm denial**.
  * The denial block now runs `<<willpowercheck>>` before deciding the result.
  * On success, the player resists the denial and the orgasm proceeds normally, with a green “you push through” message.
  * On failure, or if the willpower system is disabled, the original ruined-orgasm path runs unchanged.
* Added **temperature temperature tolerance** to **Water Dragon TF** (near-cold-immunity, slight heat vulnerability).
* Updated **Moor RNG tower travel** for full **Harpy TF**.
  * Flying to the tower is now more common: **1 in 9**, or **11.11%**.
  * Walking still has a rare chance: **1 in 18**, or **5.56%**.
  * Normal moor events should no longer be replaced too often.
* Updated **certain story choices** to remove submissive requirements.
  * Some defiant checks now use **defiant wolf** requirements instead, allowing wolf TF players with high submissiveness to choose those options.
* Updated **NPC calls to the PC** to respect the **sex consider** setting.
  * Some scenes that previously judged the player only by gender appearance now also read the `nudeGenderAppearance` setting.
* Updated **Transgender trait** logic further.
  * Fixed wrong character reading when the player is sex-flipped by an active X-Change pill.
  * Trans girls should now be read from the correct original body state instead of becoming mismatched when `$player.sex` changes.
  * Permanent pill reflection prompts should now only happen for permanent-pilled trans characters.
  * Identity notices, such as “you haven’t locked your choices”, should no longer appear for trans characters.
* Changed mirror **appearance factor** wording.
  * Replaced confusing **“Fame: X-Change Junkie”** wording with **“Sex flipped”**, since the factor comes from being X-Changed rather than fame.
* Updated **Portal Pill dealer**.
  * They can now recognise when the player is pregnant.
* Updated **tips widget**.
  * Changed all `$_tips` references to `_tips`, matching the temp-variable convention used by `printTipsList`.
  * Tightened the guard to `Array.isArray(_tips) and _tips.length gt 0`, preventing non-array truthy values from reaching `.random()`.
* Updated **stat exploit reader**.
  * Fatigue can now be manipulated more seamlessly in the cheat menu.
* Added missing **size 6 penis animation**.
* Added missing **die image**.
* Improved **Water Dragon event writing**, by **CitrusBurst**.
* Added / tidied cheat menu work for **Avery** and **Raul**, by **Sei / Karl Sendis**, with bug fixing by **D.N.A.**

## Rebalancing and Fixes:
* Fixed **Riley** and **Night Monster** titles being swapped.
* Fixed missing link in **Whitney chat**.
  * Added **7 Whitney reactions** when talking to Whitney in the flat.
  * 2 of these are special reactions.
* Fixed **X-Change suspicious pill**.
* Fixed **Lawyer lockpicking training**.
  * The training set no longer gets stuck treating **S grade** as the limit when the player can actually train skulduggery beyond it.
* Fixed typo / bad reference for **`thunderStrom`**.
* Fixed **mid-combat desync** where NPCs could target non-existent genitals after the player was pilled.
* Fixed missing link in **resistance prostitution event**.
* Fixed **no-handbag classroom events**.
  * Events previously only triggered if the player was holding something that was not a bookbag.
  * They can now trigger when the player is holding nothing, or when their handheld item is not a bookbag.
* Fixed **checkbox traits** in wardrobe.
* Fixed error in **Hairdressers**.
* Tidied up **bank math**.
* Fixed **bank heist sneaky movement** error.
* Fixed **temple work picking fruit** printing `[object Object]`.
* Fixed **lake clothes / swim outfit filtering**.
  * Lake has no wardrobe of its own, so it now anchors to the home/orphanage wardrobe.
  * This prevents separate-location wardrobes from filtering out all saved swim outfits after visiting another wardrobe location.
* Fixed **anti-pill notice** appearing during the dumbbitch effect.
* Fixed **reverse-rape double-slot desync**.
  * Fixed double-penetration state checks and target assignment.
  * Parenthesised reverse-rape skill bypass checks so they only replace the skill check, not required body-slot checks.
* Fixed **Hopeless Cycle**.
  * Sanity-checked the whole widget for malformed variables.
* Fixed **NPC slot desync and canvas filler pollution**.
  * Added slot guards to `effectsinsertions`.
  * Added slot guards to 7 stalk widgets.
  * Added slot guards to 4 NPC behaviour widgets, including `npcidlegenitals`.
  * Added `endnpc` loop guard.
  * Removed bogus `enemynomax -= 1`.
  * Cleaned up the `<<npc>>` widget.
  * Added `enemynomax` invariant bump.
  * Added `Math.max` protection for `$enemynomax`.
  * Made `checkEventNPC` pop orphan buffer entries.
  * Added null guard before `npc.type`.
  * Added `isLiveNPC()` validator predicate using `fullDescription`.
  * Fixed `canvasmodel.twee` so empty slots are no longer polluted with `type: "vine"`.
* Fixed **NNPC beast option**.
* Fixed **Hallways Rape** narration mismatch.
  * The event text should now correctly match the player-choice route.
* Fixed mid-sex typo causing:
  * `<<=>>: bad evaluation: SyntaxError: Unexpected identifier 'Your'`
* Fixed **lichen dual link**.
* Fixed missing hair in **Kylar** vanilla NNPC display.
* Fixed **“creambun” prop**.
* Fixed typos by **Sei / Karl Sendis**.
  * Whitney collar typo.
  * Gwylan park chase typo.
* Small cleaned up files and code.
* Continued graphic image renaming work (but new graphic file and mask are still needed).

