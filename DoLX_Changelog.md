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
* Added **proper update notice for pill permanence**.
  * If a body change becomes indefinite due to pregnancy, the game now gives a proper notice.
* Added **missing clothing and image assets**.
  * Added missing images for:
    * Evening Gown 2
    * Oversized Button-down 2
    * Tuxedo Jacket 2
    * Peacoat 2
    * Gothic Jacket 2
    * Single-Breasted Jacket 2
    * Double-Breasted Jacket 2
    * Shirt and Blazer 2
    * Button-Down 2
    * Tailored Shadbelly Coat
    * School Skirt 3
    * Cardigan Skirt
    * Christmas Dress Fancy
    * Cow Chaps
    * Swim Shirt
    * Leather Leggings
    * Slime Chastity Cage
    * Tube Top masking
* Updated **graphic mod imagepack** files especially for **goosefem**(only for DoLMods website).
  * Added cow transformation fix for mysterious graphics by **Gothy (Gothic Chaos)**.
  * Cleaned vanilla/default imagepack face file positioning.
  * Updated clothes and body folders to match the new formatting.
  * Updated goose dice sprites to match the new formatting.
  * Updated aviator glasses to be recolorable.
  * Fixed tube top rendering.
  * Fixed hat, shoes, and umbrella masks.
  * Reworked body masks again.
  * Added barber chair by **Mozumelody**.
  * Added feather cap and tam o’ shanter by **AliceAray**.
  * Added racing helmet by **funkabunk**.
  * Added Bootyjorts 2 by **Pudding**.
  * Added free-use collars by **Lilym4ido**.
  * Added apron by **hayanwp**.
  * Added fox butt plug by **Sugarpawzi**.
  * Added black cow tail by **Froggy**.
  * Added frog edit and demon imp wings edit by **Could be a dog**.
  * Added edited released breast sprites by **Puppycat**.
    * Original sprites by **Kc** and **Drunken Owly**.
  * Rename and packing by **snowy** and **Drow**.
* Added **makeup support to the Outfit Editor**.
  * Outfits can now save and apply makeup as part of a clothing set.
  * Added options to edit a custom makeup set for each outfit.
* Added **beauty treatment to the spa**.
  * Tanning now gives a beauty boost.
  * Eligible players can now use VIP beauty treatment.
  * Becoming a member can unlock a VIP beauty treatment with a large beauty boost.
  * Added spa party availability.
    * Spa parties can increase social fame and may teach the player something.
* Reworked **Poppy**.
  * Poppy’s stat decay has been adjusted:
    * Non-LI Poppy no longer has stat decay.
    * LI Poppy does not decay if the interaction check passes.
    * LI Poppy loses 2 stats if the interaction check fails.
  * Holiday events can now trigger during school holidays.
  * Cleaned up redundant checks, since `poppySchedule` already calls `poppyStatusCheck`.
* Reworked **traits**.
  * **Meek**, **Submissive**, **Bratty**, and **Defiant** now have proper descriptions.
  * **Prey animal** trait now gives a submissive buff each day.
  * **Predatory animal** trait now gives a defiance buff each day.
* Tweaked **MMA Gym**.
  * Removed RNG chance from unlocking the conditioning lesson.
  * Tidied up MMA Gym code.
* Migrated **enemy arousal to pleasure**.
  * Enemy ejaculation now uses DoLX-style pleasure handling.

## Rebalancing and Fixes:
* Fixed **Bailey’s room crash**.
  * Fixed a crash if Poppy LI was enabled on the first day of a very new game.
* Fixed **Street Fame rape scene**.
  * Fixed a broken sex scene.
* Fixed assorted narration issues.
  * Fixed spacing in certain narration.
  * Fixed wrong gender text when referring to someone as a busy man/woman.
  * Fixed assorted typos and awkward lines.
* Fixed **giving food to Poppy**.
* Cleaned up **redundant NPC generation** for Poppy.
* Fixed **render-time fatigue mutation**.
  * Fixed fatigue fluctuation caused by render-time clamps using stale `C.tiredness.max`.
  * Saves with fatigue above the base cap but within the scaled cap should no longer lose fatigue after F5/history render.
  * Added `updateDynamicStatCaps()` to recalculate dynamic tiredness/stress caps before clamps.
  * Moved DoLX fatigue overflow behaviour out of the fatigue caption/statbar widget.
  * Made the fatigue caption render-only by using `_displayTiredness` instead of mutating `$tiredness`.
  * Preserved DoLX overflow behaviour inside `statChange.tiredness()`.
    * Excess fatigue spends X-Change willpower if available.
    * Otherwise, overflow converts into stress/trauma.
    * Fatigue is then clamped to `C.tiredness.max`.
  * Replaced direct X-Change tiredness writes with the tiredness macro where appropriate.
  * Added a sleep notice for cases where fatigue does not visibly decrease because recovery is offset by overnight effects.
  * Set stat exploit debug logging to silent by default while keeping the protection active.
  * This does not remove the DoLX fatigue overflow mechanic; it only prevents UI redraws from mutating real stats.
* Added **TF fixes by Sargalis (Lis)**.
  * Fixed skill stats not respecting the TF rebalance setting.
  * Fixed genome dump and hybrid divine TF bodypart misbehaviour.
* Fixed **NPC multi-orgasm state corrupting `NPCList`**.
  * Moved NPC multi-orgasm runtime counters out of `$NPCList`.
  * Added separate transient `$npcOrgasmState` storage.
  * Prevented non-canonical fields such as `orgasms` and `maxOrgasms` from triggering the corrupted-variable detector.
* Fixed **Gwylan ritual ear error**.
  * Modded TF ears are now included correctly.
* Fixed **Gentleman’s Club quest**.
  * Fixed feather duster incorrectly becoming a balloon.
* Fixed **farm issues**.
  * Fixed winter probability bug.
  * Fixed incorrect insecurity check.
* Fixed **Landry pronoun issue**.
  * Corrected wrong pronoun usage during the bank heist.
* Fixed **Science Lesson**.
  * Fixed the player suddenly wearing a towel due to an incorrect `towelup` macro.
  * Fixed redundant NPC generation.
* Added **fixes by CitrusBurst**.
  * Added `getTimeString()` null check to handle undefined values.
  * Fixed typo from `rightFree` to `rightfree` in action generation.
  * Fixed image filename typo from `tf-bun_acc.png` to `tf-bun-acc.png`.
  * Fixed livestock winter trigger logic in `time.js`.
  * Adopted upstream NNPC name/gender init refactor.
  * Updated `presets.twee` indentation to align with upstream style.
* Fixed **history re-render crash in combat**.
  * Guarded `otheranus`, `othermouth`, and `otherpenis` loops.
  * Guarded breastfeeding NPC mouth checks.
  * Changed chest disengage write from `$NPCList[$_i].mouth` to `_orgasmNpc.mouth`.
  * Guarded the Ivory Wraith easter egg check.
  * Kept the existing `othervagina` guard and reference comment.
  * Updated `ui.js` so `updateOptions()` skips `State.restore(true)` and `State.show()` while viewing rewound/history states.
  * `updateOptions()` now uses `State.size > State.length`.
  * `V.options = optionsData` is still applied.
  * Added console warning with passage/state information.
* Fixed **history lesson Winter issue**.
  * Fixed waterdragon horns being hidden but still counted.
* Updated **migration for vanilla saves**.
  * Repairs missing worn clothing slots before clothing UI render.
* Fixed **speech and gendered text issues**.
  * Added gender-aware insult helpers:
    * `<<slut>>` resolves to “pervert” for male-presenting PCs and “slut” otherwise.
    * Added plural/adjective helper variants.
  * Replaced hard-coded slut/sluts/slutty lines where they should respect perceived gender.
  * Expanded several talk arrays to reduce repeated enemy dialogue.
  * Confirmed enemy pleasure checks now use DoLX-style `$enemypleasure` / `$enemypleasuremax`.
* Fixed **herm fame event routing**.
  * Herm fame events no longer trigger when the PC no longer currently has both genitals.
  * Added `$player.penisExist` and `$player.vaginaExist` checks to explicit herm-body encounter gates.
  * Patched the overheard herm claim event.
  * Patched the courtyard herm group confrontation route.
  * Generic hallway gossip/mockery events are unchanged so lingering rumours can still appear after body changes.
  * Pregnant or otherwise non-herm-bodied PCs with high herm reputation should no longer be routed into Courtyard Herm Show/Flaunt/Resist/Call scenes.


