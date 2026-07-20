> **If the normal pipeline links at the bottom fail, use these backup downloads instead:** [Images](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=img) | [Audio](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=audio)

> **To download the official X-Change APK, join the DoL Modding server and check the dedicated X-Change channel:** [X-Change Channel](https://discord.com/channels/675158131688603721/1512272787572785162)

## Instructions:

- Download DoLX_HTML.
- Download DoLX_Images.
- Download DoLX_Audio.
- Extract all 3 downloaded packages into the same folder.
- Run "Degrees of Lewdity VERSION.html".
- Enjoy!

## Changelog

## Changes and Additions

- Merged with vanilla version 0.5.11.6.
- Merged with RBE version 0.5.0.
- Fixed sidebar sprites and added a "Scale sidebar image to body size" option
  - Body-size scaling now keeps character sprites crisp instead of applying blur.
  - The option lives under Rendering, is enabled by default, and works correctly with existing saves.
  - Disabling it keeps sidebar characters at their original fixed size.
  - Default-sized characters retain the same rendering performance as before.
- Updated tentacle encounters
  - Tentacles wrapped around your neck can now properly strangle you.
  - During tentacle and abomination encounters, a second tentacle can now force its way into an already-occupied pussy or ass, and a third can join to share the same hole.
- Added player-initiated facesitting and rimming
  - You no longer have to wait for NPCs to randomly start these:
  - "Move your mouth to their ass" (needs Analingus: Giving, oral skill).
  - "Pull their pussy onto your face" (needs facesitting, oral skill).
  - "Guide their head to your ass" (needs Analingus: Receiving, anal skill).
  - All show up alongside the other consensual initiations and can fail if your skill is low. Human encounters only.
- Made tomato gain colourable in the Flats job.
- Added a new toggle: Double Semen/Milk Production.
- Updated smoking
  - You can no longer smoke while pregnant, though cigarettes can still be bought.
- Added Tiny Penis as an identity option
  - Previously the smallest selectable genital-size preference was "Small", so characters who were naturally micro/mini/tiny would get gradually grown all the way up to Small whenever body changes were enabled, even if they were happy with their current size. "Tiny" now sits below "Small" as its own option, so gradual growth stops at Tiny instead of overshooting to Small.

## Rebalancing

- Improved corp yield
  - Improved the full tending bonus description scale so each skill level reports the correct result.
  - Increased tending harvest yields by an additional 15%, raising the expected average harvest from roughly 500 crops to roughly 575. For example, a 713-crop harvest should now produce around 820 crops.
- Tweaked bike
  - Biking now gains Thigh skill instead of Dancing.
- Tweaked Avery
  - Morning school pickups now have a 50% chance to occur and can only happen once per day. Afternoon pickups are no longer guaranteed on Mondays. Mondays still receive an increased chance, but the event must pass its normal roll.
- Updated school hallway rumour
  - The shady dealer/X-Tend gossip rumour now only happens weekly.

## Fixes and Improvements

- Fixed blackmail tasks
  - Blackmail tasks will no longer incorrectly fail during scenes where normal time and stat changes are paused, including character-book dreams/replays and Hopeless Cycle.
- Fixed goosemasc.
- Fixed weird spacing and a broken link in the tomato tooltip and the Gwylan progress stat.
- Fixed redundant Bailey NPC generation in Bailey's office.
- Applied tractor bonuses to planting and harvesting
  - Planting and harvesting now correctly use tractor tier and attachment time reductions.
  - Tractor tiers now reduce planting and harvesting time by 10%, 20%, or 30%, while seed drills and harvesters provide the same additional reduction already used by ploughs.
- Fixed a missing link when intentionally losing an encounter.
- Fixed cabin kitchen theft
- Fixed Poppy's anger
  - When anger reached 0%, an old save-migration check could incorrectly restore it to 1%, preventing the status from switching over to Patience.
- Fixed feats UI on mobile.
- Fixed an underwater antique bug affecting the gold necklace and silver band.
- Fixed Demon TF
  - Fixed an issue where a leftover demonic transformation state could repeatedly trigger the "terrible light" stress and trauma penalty each day, even after Demonicness had dropped to zero. Transformation states now automatically resync during the daily update, allowing outdated demonic effects to clear correctly. Existing saves will repair themselves on the next in-game day.
- Fixed TF income bonus mismatches
  - Displayed payouts now account for the bonus up front and call it out with a line of flavour text when it applies, so a boosted payout reads as a deliberate "tip" rather than a bug.
- Prevented an unexplained X-Change spike
  - Fixed an issue where being sold to Eden for missed rent could cause an unexplained 30-day gender change.
- Fixed "Daydream before class"
  - The "Daydream before class" option in Science and History Study could incorrectly make the player more tired, especially with low Physique. It now properly reduces tiredness as intended.
- Fixed the farm tower guard
  - Fixed being unable to seduce or spar with them.
- Fixed deco
  - Foreground1 and foreground2 now also adapt to the player's body size in canvas rendering.
- Fixed sleep in Poppy's flat
  - Fixed an issue where sleeping in the Flats Poppy Bed could permanently remove worn clothing and transformation items, including the carrot pin and spirit mask.
- Fixed the Special Clothing rank 3 feat boost
  - Rank 3 Special Clothing now correctly unlocks the promised costume stories for Gwylan.
  - Existing saves are repaired automatically when loaded.
  - Fixed the rank selector so it appears as one connected button bar on desktop and mobile.
  - Updated feat tests to use the correct boost names without the "Trait" suffix.
- Fixed the wearable dildo
  - The vaginal dildo is now properly removed when vaginal penetration begins during combat, matching the existing behavior of the butt plug.
  - Prevented vaginal dildos from remaining equipped after transformations or gender changes remove the player's vagina. The toy is now returned to inventory, its worn flags are synchronized, and it cannot be re-equipped while the player has no vagina.
- Fixed a Tailor Shop crash caused by a worn vaginal dildo.
- Audited the RBE merge and fixed the bugs it introduced.
- Fixed Kylar's speech
  - Kylar now recognizes the player's anatomy after undressing them, preventing pregnancy-related dialogue from appearing when it does not apply.
- Fixed a combat soft lock
  - Fixed an issue where enemy HP could disappear and combat could become impossible to finish after certain damage calculations. The game now prevents invalid damage values from corrupting enemy HP, repairs affected enemy HP during combat, keeps enemy health data synchronized correctly, and repairs invalid Stat Nerf Multiplier values when loading a save.
  - Existing affected saves should recover after recompiling and reloading. If combat is already stuck, attacking once should also restore the enemy's HP state.
- Fixed missing clothes on the pub approach.
- Fixed Hyper Fertility
  - Hyper Fertility and the Bull Pill now make it much more likely for the player to impregnate partners when the player has a functional penis.
- Fixed the tear feature
  - Tearing clothing from the wardrobe now immediately updates its durability and condition display.
- Updated temple advancement
  - Jordan no longer allows you to enter the trial of fire while pregnant.
- Fixed shop
  - Items such as hoodies were sometimes incorrectly treated as full outfits. After viewing one and pressing "Back," the shop would open the Outfit tab instead of returning to the Upper tab. Upper-slot items are now only treated as outfits when they are actually paired with a lower clothing item.
- Updated X-Change body
  - Previously, transformed characters could keep using old cached eye or skin colours, even when a specific colour was selected in the settings. Custom colour choices are now correctly applied when changing into either body type, so if you set your X-Change body's eye colour, for example, the moment you switch back to your previous body and X-Change again, the body will adopt your newest setting.
