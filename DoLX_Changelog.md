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
* Updated mod base to **vanilla version 0.5.9.7**.
* **Merge audit** by Bec and D.N.A.
* Added **Moor RNG common event**, allowing players with full Harpy TF to instantly fly to the tower.
* Added **HBSC Gala** to **Brown Fox task**.
* Expanded **DoLP attitudes speech** across 20 files.
* Expanded the **Transgender trait** and clarified its description.
  * New feature: when under a permanent pill effect as a trans character, a prompt now asks how your character feels about the transformation.
  * Each response represents a different emotional reaction and applies an additional effect based on that choice.
* Updated **shady person portal pill** narration so they can recognize when the player is “far too gone”.
* Updated and bug-fixed the **world rewrite feature**.
* Updated **MMA gym** interaction so the gym cannot be used while the player’s hands are bound.
* Tweaked **island journey pirate ship** again.
* Rebalanced **submissive and deviant actions**, especially during mid-combat.

## Rebalancing and Fixes:
* Fixed **Time `<<pass>>`**.
* Fixed **weather fog timeline crash**.
  * `getFog` now extends the fog timeline when the target date is past the last keypoint instead of returning null.
  * `interpolateFog` now has a fallback to prevent crashes if the timeline somehow still has not been extended.
* Fixed **variable plant / foodstuff** issue.
* Fixed **Rings and Earrings path reader**, now following the vanilla path reader changes.
* Fixed **cheat menu** for Riley and added Quinn support.
* Fixed **Avery second initializing / meeting issue**, where the street rescue event never happened.
* Fixed **MMA training with no money**.
* Fixed wrong variable in **hopeless cycle** when sleeping.
* Fixed missing link in **library study**.
* Added temporary fix for **combat mapper**.
* Fixed **Hospital Keycard Distract** double `<<else>>`.
* Fixed **temple steal**.
* Fixed **stat freeze**.
* Fixed **cat island sex**.
* Fixed **condom image** in start game.
* Fixed **double flip character description** issue. The mechanic itself was unaffected.
* Fixed idle behavior in **beast action**, by CitrusBurst.
* Fixed **chastity not changing** when sex flip occurs.
* Fixed **menstrual behavior for herm pill effects**.
  * Previous versions force-disabled menstruation when the herm pill activated and never restored it.
  * Saves currently under herm or perma-herm effects with a vagina-bearing original body should no longer remain incorrectly infertile.
* Fixed **Robin NPC generation** after Robin breakup leading into becoming fuckroommates.
* Fixed **bank deposit slot selection**, where it always chose the latest slot instead of the selected one.
