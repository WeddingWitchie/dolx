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

- Updated to vanilla version 0.5.11.7
- Updated to DoLP version 0.757
- Merged RBE version 0.5.3
- Added neutral player pronouns
  - Player pronoun preferences now control how the game refers to the PC, including he/him, she/her, and they/them pronouns with matching grammar and gendered terms.
  - A non-binary identity can use neutral, feminine, or masculine pronouns according to the player's preference.
  - When multiple pronoun sets are accepted, the game can select between them based on the configured dynamic mode, current presentation, body, clothing, appearance, or posture. Neutral pronouns provide the fallback.
  - Existing saves are migrated safely.
- Added trans identity dialogue and pill interactions
  - Trans PCs can explain their identity to students and Robin and gain recognised access to their preferred changing room.
  - Robin, Avery, and school delinquents can react after learning that the PC is trans.
  - Added new supportive and dominant pill interactions.
- Expanded gender identity preferences
  - Height, hair, chest, ass, and genitals can now gradually move towards the player's preferred choices.
  - Stable dual genitals are supported without requiring an active X-Change pill.
  - Disabled body topics remain disabled, and existing saves migrate safely.
- Expanded chastity
  - Added more chastity-aware changing-room taunts and general body comments, with distinct reactions to belts, cages, and trapped parasites.
  - When Whitney's chastity rule applies to a penis-less body, Whitney can now fit a constantly stimulating dildo chastity belt.
  - Being caught by the Pound can now result in a forced chastity device, with a higher chance when the player's body does not match how they present.
  - Any chastity device now drastically slows arousal fade, can occasionally spike arousal, and reduces the relief gained from orgasming while locked.
  - Flat and small shrinking cages now also raise minimum arousal while worn.
  - Added a dildo chastity belt for vaginas, providing constant internal stimulation and increased sensitivity.
  - Chastity-trapped parasites from swarm encounters now raise minimum arousal, stimulate the player more often, and can be properly cured at the hospital.
  - Jordan now refuses to remove a monk or priest's chastity device when it belongs to someone else, the player's personal standing is insufficient, or their reputation in town is too poor. A new "Pray for guidance" option can improve the latter two over time.
- Added a variant to the street seduction event
  - The well-dressed man on a bench may now be offering an honest, no-strings-attached encounter instead of always hiding a camera in the hotel room.
  - His opening description subtly hints at which version was selected.
  - Higher Skulduggery increases the chance of the honest version, allowing perceptive characters to benefit from their awareness instead of being consistently locked out of the scene.
- Improved the X-Change Tester
  - X-Change Tests now estimate remaining pill time in hours, days, or weeks.
  - The Traits panel remembers and updates the improved reading until the transformation ends.
- Updated Gwylan's fluid samples
  - Gwylan's collection requests now provide two samples when the same NPC orgasms twice in one encounter.
  - One orgasm still provides one sample, and further orgasms do not increase the reward.
- Updated Gwylan's pet names
  - Added transformation-specific pet names for bunny, bear, and water dragon forms.
- Updated the brothel
  - Fluids can now be collected through quick actions.
- Added more sexual-event bypasses for PCs who are too innocent or drunk to participate.
- Added a new innocence reaction
  - Innocent PCs may panic when losing their handholding virginity.

## Rebalancing

- Tweaked body-size rendering
  - Sidebar rendering has been adjusted to look better across different body sizes.
  - "Scale sidebar image to body size" is now disabled by default and can still be enabled under Rendering.
- Tweaked fame changes while masked
  - A mask completely blocks fame gain and loss in a category below 500 fame.
  - From 500 to 999 fame, a mask only halves the change.
  - At 1000 fame or higher, the player is too recognisable for a mask to conceal them.
- Tweaked Fallen Angel during purging confession
  - Fallen Angels now lose Purity regardless of manifestation level, but the penalty is gentler than before.
- Improved Continue and Breeder pill behaviour
  - Added an optional cap that prevents Continue from stacking transformation time indefinitely.
  - Continue can be safely removed from permanent transformations without undoing their permanence.
  - Breeder and Omega orgasm denial now reduce pleasure and apply gentler, spaced-out Stress rather than repeatedly chaining penalties.
  - Fake Breeder remains infertile without disabling Omega.
  - Hyper Fertility now supports vaginal pregnancy, Omega anal pregnancy, and pregnancies sired by the player.
  - Related orgasm and pregnancy options are now grouped under the Breeder and Fertility settings.
- Updated gloves
  - Losing handholding virginity is prevented while the player is wearing gloves.
- Made "Begrudged" clearer in the Identity settings.

## Fixes and Improvements

- Fixed updated UI persistence
  - The selected theme now persists correctly across save loads, including saves created during an ongoing game.
  - Select Updated UI in Decomod, advance one passage, and save to store the chosen theme.
- Fixed combat scenes ending after the first turn
  - Fixed 36 encounters across multiple locations that could jump directly to their ending after the first action, regardless of the opponent's health or pleasure.
  - Affected combat scenes now continue until their proper ending conditions are met.
- Fixed Photo High Alley combat
  - Removed a redundant variable and added the missing combat cleanup.
- Fixed combat submission text using a stale NPC description during beast encounters.
- Fixed named NPC dodge chance corruption
  - All named NPCs now start with a valid dodge chance before modifiers are applied, preventing the issue from recurring.
  - Existing saves may show the warning once if an invalid value was already saved. Use "Reset Corrupted Variables" when prompted; regenerated NPC data will remain valid.
- Fixed save loading
  - The player's saved skin colour is now restored instead of a temporary colour used while cloning NPC data.
- Fixed the dancing UI button to match the masturbate UI.
- Gated orgasm moans behind the Moan/Grunt setting.
- Fixed rimming options appearing when the PC is in an impossible position.
- Fixed a gender mismatch during car pill-whoring scenes.
- Fixed biking skill gains
  - Biking now awards its skill point correctly.
- Fixed biking event times
  - A cycling event intended for the morning no longer also occurs at night.
- Fixed Whitney reacting to undiscovered X-Change use
  - Whitney's maths-class dialogue now references the player's X-Change use only after Whitney has discovered it.
- Fixed redundant NPC generation when the black wolf comments on their chub.
- Fixed Poppy's pregnancy reveal
  - Poppy now checks the baby's actual paternity before claiming to be the father.
  - If another character or creature caused the pregnancy, the player correctly explains that the child is not Poppy's, and Poppy responds supportively without claiming it.
- Fixed X-Change random hair colours
  - Dye Harder's temporary `tmp0` and `tmp1` colour-picker entries are excluded from random hair-colour selection.
  - Rerolls can no longer produce white hair labelled "color picker slot."
- Fixed adult shop payouts
  - The adult shop no longer sometimes pays £0 or an incorrect amount.
- Fixed cafe income
  - Cafe waiter shifts now consistently include the £12 hourly wage, whether or not a customer tips.
  - Shifts also advance the full amount of time correctly.
- Fixed mouth-to-ass actions
  - Moving the player's mouth to a female partner's ass no longer resets to "mouth is free" on the next turn or removes both pussy and ass options for the rest of the encounter.
- Fixed menu tab crashes
  - Switching tabs in overlay menus no longer throws an error or freezes the panel after opening a menu or changing a setting that refreshes the screen.
