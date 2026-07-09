> **If the normal pipeline links at the bottom fail, use these backup downloads instead:**
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
* Breeder and Fertility settings
  * Added a **Fake breeder (infertile)** toggle under **X-Change Settings > Breeder Settings**.
    * When enabled, breeder pills give only the behavioural breeder effect, including cravings, creampie-focused pleasure, and stress relief.
    * Fake breeder pills do not make the player fertile and can no longer cause pregnancy.
  * Added a new **Fertility Settings** block.
    * Added an **Always fertile while X-Changed** toggle.
    * Added a **Fertility strength (%)** slider that controls how reliably Fertility and Hyper Fertility courses cause conception.
  * **Always fertile** and Hyper Fertility effects take priority over **Fake breeder**.
  * Clarified breeder tooltips so they now explain that the breeder effect only works while the player has a womb and vagina.
  * Replaced the old non-functional **Creampie-only orgasms** breeder toggle with a working **Orgasm without creampie** toggle.
    * When enabled, breeder and omega pills no longer prevent orgasm when there is no cum inside the player.
    * Creampie-specific pleasure and stress relief still require an actual creampie.
  * All new breeder and fertility options are included in Settings Export/Import.
* Added “Relentless Bailey” rent option
  * Added a new optional toggle under **Settings > Rebalance Settings > Bailey Triggers**.
  * This setting is disabled by default.
  * When enabled, Bailey never accepts “no” for rent and starts hunting the player from the beginning.
  * Weekly rent continues rising with no cap instead of stopping at the usual limit.
  * Rent-threshold and rent-cap settings are greyed out while this option is enabled.
* Added Avery confrontation scenes
  * Players can now confront Avery after the skyscraper car chase instead of being sent straight back to the mansion garage.
  * Added immediate and delayed confrontation variants depending on how the chase ends.
  * Avery’s response changes based on love and rage.
    * Avery may punish the player, blame them, brush them off, or offer manipulative comfort.
  * The scene now accounts for speech attitude, pregnancy, and existing Avery mansion punishment routes.
* Updated Avery’s “saved” route
  * Saved Avery now gains rage more slowly from failed housework.
  * Saved Avery now forgives missed cooking entirely.
  * Avery now focuses more on keeping the mansion clean.
  * Avery now hints that they enjoy tending the garden.
  * The mansion garden description now reflects Avery’s care.
  * When saved Avery would explode over housework, they now have a chance to stop their own selves instead.
* Updated Avery “adoption”
  * Avery can now adopt the player into the mansion if Avery is selected as the player’s love interest in the Social Menu.
* Updated Avery’s mansion greenhouse
  * Players can now ask Avery to update the mansion greenhouse while Avery is in the garden.
  * This becomes available one month after unlocking the greenhouse.
  * Players who already unlocked the greenhouse before this update can ask Avery immediately.
* Updated Avery dungeon choice
  * The free-choice menu in Avery’s dungeon now grants masochism points.
  * Other dungeon entry points do not grant masochism points because they do not offer a real choice for PC.
* Added prison meditation option
  * Added a meditation option in prison.
  * This uses the same mechanic as meditation at the lake.
* Added teleport option to cheat menu
  * Added a cheat menu teleport option for the park.
* Added Gender-Anxious to cheat menu
  * Added **Gender-Anxious** to the cheat menu.
  * Also fixed **Cock Addict** and **Hole Addict** entries in the same menu.
* Updated Insanity trait
  * The Insanity trait now includes dissociation.
  * Insane player characters are now completely numb.
  * Sensitivity changes are now fully blocked while insane, whether they would increase or decrease sensitivity.
  * This fixes reflected sensitivity loss caused by pills, purity, orgasms, anti-pill effects, and version-update migration changes.
  * Existing saves now repair clearly broken sensitivity values once on load.
  * Valid sensitivity values are left unchanged.
* Added foodstuff pruning
  * Added cleanup for unknown food items left behind by removed mods or inactive game setups.
  * These invalid food entries could crash shops, kitchens, stalls, or tending tasks.
  * The cleanup removes only missing outside-mod food entries.
  * Valid food data from the current setup is left untouched.
* Updated loitering
  * Loitering is now a proper action.
  * Players can now choose how long they want to loiter.
* Added new school hallway event
  * Added a school hallway event where other students can sense the player’s divine transformation.

## Rebalancing and Fixes:
* Broken save repairs
  * Added save repair for missing transformation part keys.
  * Added repair for non-finite numeric values.
* Pharmacy bulk-buy fixes
  * Basic X-Change pill packs can now be bought in bulk from the pharmacy.
    * 5 packs cost £500.
    * 10 packs cost £1000.
  * Basic packs no longer show misleading “cannot afford” messages when the player has enough money.
* Blackmail Gentleman’s Club quest fixes
  * Fixed pill-related quests failing after the player took the envelope contents when the free pill was blocked and never actually affected the character.
  * This mostly affected the arcade pill quest.
  * The issue could happen when non-consensual spiking was disabled, X-Change therapy was active, or the character was pregnant.
  * Quests now track whether the pill actually landed before allowing the “tested the pill” failure condition to trigger.
  * Older saves are repaired when possible.
  * Reloading before the in-game day ends should now clear the false failure and allow the quest to continue normally.
  * The intended failure still works if the pill really takes effect and the player tests it at the pharmacy machine.
* Omega X-Change pregnancy fixes
  * Omega can now actually get pregnant, including with the Hyper Fertility pill.
  * Omega can now conceive through the butt and carry a real human baby to term.
  * Omega pregnancies now show a visible growing belly instead of only ever resulting in slimes.
  * Omega characters who also have a vagina can now get pregnant in either hole.
    * Whichever hole receives the sperm is the one that takes.
    * Once one pregnancy sticks, the other is blocked.
    * Omega can only carry one pregnancy at a time.
  * The pregnancy/status screen now correctly shows vaginal pregnancy for Omega.
  * No-vagina characters no longer receive the odd “your period is late” message.
    * They notice pregnancy through their growing belly instead.
* Gray X-Change pill fixes
  * Gray X-Change Resistance, Continue, and Portal pills no longer vanish from the medicine drawer after being bought.
  * Owned gray pills now always remain visible in the medicine drawer.
  * Unavailable pills now explain why they cannot be used.
* Shady dealer suspicious pill fixes
  * The shady dealer now gives suspicious pills based on the player’s original body instead of their current X-Changed body.
* Cat transformation fixes
  * Cat children can now correctly inherit the cat trait from a full-cat parent.
  * Cat heterochromia is no longer rerolled every time the player crosses the cat transformation threshold.
  * The mirror option can still deliberately reroll cat eye colours.
* Robin crossdressing gender reference fixes
  * Fixed Robin’s crossdressing scenes using the wrong gender references after X-Change.
* Robin NPC generation cleanup
  * Fixed redundant Robin NPC generation when talking about the stand business.
  * Tidied up the related link.
* Silver Stranger settings fixes
  * The Silver Stranger is now hidden in settings where appropriate.
  * The Silver Stranger is now treated as infertile like other non-pregnancy NPCs.
  * Settings import/export now safely handles NPCs with missing pregnancy data.
  * The Silver Stranger’s hidden identity no longer leaks in settings exports, import previews, or bulk named-NPC gender presets.
* Skill display fatigue fixes
  * Fatigue was already lowering effective skills during checks, but some UI screens still showed the unpenalized grade.
  * Skill displays now include fatigue penalties wherever relevant.
  * This includes the Characteristics screen and seduction encounter checks.
  * Players can now see when fatigue is lowering their effective skill grade.
* Sage hat relock fix
  * Fixed a previous save migration accidentally unlocking the sage witch hat for some players.
  * Players who legitimately unlocked it through Gwylan’s ritual scene keep it.
  * Players who have not unlocked it yet can still earn it normally.
* Landry warning box fix
  * Fixed Landry’s red warning box.
  * Removed a leftover variable and tidied the related handling.
* Setting crash fix
  * Improved handling for import/export and named-NPC gender presets.
* Fixed a missing navigation link.
* Skullduggery HBSC Gala fix
  * Fixed an issue with Skullduggery appear impossible when infact it isn't during the HBSC Gala.
* Minigame money rebalance
  * Dungeon rewards should now better fit the scale of a small console game.

## Imagepack update
* Updated Goose image pack by Snowy
  * Added ankle strap sandals, ankle strap sneakers, ankle trainers, ballet pumps, butterfly heels, clogs, double strap sandals, flat sandals, floral rain boots, floral ribbon trainers, fuzzy bow boots, heeled trainers, high heel ankle boots, knee fur boots, knit cuff ankle boots, lace-up heels, long puff boots, mary jane heels, over-the-knee boots, platform ankle boots, platform clogs with fur, platform heel boots, polka dot train boots, puff boots, rose pumps, satin ribbon heels, shark slippers, snowball heels, soft slippers, suede pumps, t-strap heels, and wrinkled long boots by Rinnarunnn.
  * Added asymmetrical garter, asymmetrical loose socks, asymmetrical striped socks, fishnet ankle socks, fishnet knee highs, floral socks, lace over-the-knee socks, lace socks with bows, lace socks with ribbons, lace tights, and plain over-the-knee socks by Froggy.
  * Added lolita dress, lolita bonnet, rose platform heels, butterfly eyepatch, and rose eyepatch by Fox Familiar.
  * Added vintage suitcase, luggage, totebag, and one-shoulder crop top by Leni.
  * Added babydoll top by Yams.
  * Added strawberry slippers by Pudding.
  * Added familiar collar by Knepo.
  * Added checkered skirt by MY.
  * Added balloon, banana, bear, bee, beer, bomb, bone, boombox, butterfly, car, cloud, cupcake, doughnut, eggplant, flame, football, foxtail, goldfish, guitar, lion, nut, peach, penguin, rice ball, rocket, shooting star, sparkles, sun, sushi, thunderbolt, turtle, and watermelon graphic earrings by Sam Storeiz.
  * Cleaned up several image pack entries.
* Goose image pack fixes
  * Fixed an elegant socks naming error.
  * Slightly edited curls and curly side-up side sprites.
  * Added back sprites to curls, default, defined curl, dreads, half-up, half-up twintails, loose, and space buns side hairstyles.