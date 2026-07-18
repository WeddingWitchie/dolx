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

- Merged with vanilla version 0.5.11.5.
- Reworked Brothel and Strip club
  - The brothel and strip club now have clearly separate roles.
  - The brothel focuses on approaching patrons, conversation, seduction, sexual skill, private services, and appointment auctions. Ordinary brothel dancing is no longer a repeatable source of income and now appears only as the preview for an auction.
  - An auction preview must continue for at least 15 in-game minutes and reach the required danger threshold before the auction can proceed. The auction then includes a separate Seduction-based attempt to negotiate a higher bid, and only one auction can be completed per day.
  - The strip club is now the main repeatable dancing venue and keeps the generic private-dance events removed from brothel dancing. Strip-club dance tips receive a 3x venue multiplier, while dancing anywhere else, including the brothel auction preview, retains only 25% of its normal income.
  - Animal and Divine income bonuses continue to stack with the relevant venue multiplier.
  - At the strip club, reaching 100 audience excitement and 100 audience arousal gives each dance cycle a 45% chance of ending the performance early, leading into the same security/guard ending as stopping voluntarily.
  - Strip-club bartending now pays £15 per hour, gives better tips and English progression, and scales with both English skill and allure.
  - Leighton and Briar remain exclusive to brothel dancing. Robin can appear at either venue, sharing one weekly lock between the two.
  - Skipping or ending a paid sexual service early now angers the patron, cancels the payment, and applies the associated stress and pain.
- Reworked dance classes
  - Rebalanced with training choices, subscriptions, injuries, mastery bonuses, and optional skill upkeep.
  - Added a toggle to let dancing skill decay if not practiced enough.
- Expanded and reorganised Feat Boost choices
  - Reordered and grouped related skill, characteristic, transformation, and trait boosts.
  - Added optional Sadist and Masochist starting traits for 23 VrelCoins each.
  - Added X-Change Purity for 150 VrelCoins, permanently neutralising X-Change pill effects while still allowing doses to be administered and recognised by events.
  - Added Special Clothing rank 3 with doubled prices and normal Gwylan dialogue progression.
  - Improved trait tooltips, purchase limits, refunds, and mobile layout.
- Made Bailey pillable
  - Bailey can now be targeted with transformation pills.
  - Added a unique furious reaction immediately after Bailey is pilled.
  - Added Bailey-specific combat dialogue before and after transformation.
  - Added daily orphanage scenes where Bailey examines and tests the new body.
  - Added daytime flats events where Bailey uses the transformation to collect rent and confront debtors.
  - Transformation-related events stop once the pill wears off.
- Updated Wren
  - Wren can now be paid to passively sabotage Remy for one attack. If not renewed after that attack resolves, the arrangement lapses until paid again. Renewal can also be covered automatically through the bank.
- Added soup kitchen charity
  - When world corruption is low, a stranger may come to donate to the orphans, player included.
- Expanded lactation and pregnancy handling
  - Added a setting for the minimum breast size required to lactate.
- Added a setting to limit group encounters to one shared orgasm
  - Prevents one multi-orgasmic NPC from making an entire group climax repeatedly, while preserving multi-orgasms in solo and sequential beast encounters.
- Added a moan and grunt setting
  - Being penetrated and penetrating can now let the player character moan, grunt, or both. On by default, under fetish settings.
- Updated body size
  - Adjusted hiding and intimidation based on body size.
  - Added a small-character wind event and a giant doorway random event.
  - Gave giant demons a door route into Domus houses.
  - Sidebar image render size now scales with the player's height.
- Updated Alpha effect
  - Alpha knots now swell as orgasm approaches, stay locked for the encounter, use short close movements, and show matching reactions, orgasm text, and x-ray art during vaginal and anal sex.
- Updated plant person sex
  - Purposefully entering the plant person's snare now starts consensual sex, while keeping the bound-leg and oral positioning. Accidental encounters remain non-consensual.
- Updated Remy's branding
  - Remy now recognises Ivory Wraith's brand and reacts to it.
- Expanded Gwylan's speech in realistic childbirth content.
- Tidied up
  - Revived the bad-end mines route, added the option to kiss Black Wolf while watching the forest together, and added dancing at the docks.

## Rebalancing

- Buffed animal transformation income
  - Water Dragon: can breathe underwater; +50% chance to find valuables at the lake.
  - Wolf: +50% chance to find valuable items in the forest, moor, and elsewhere.
  - Bunny: +100% income from dancing.
  - Harpy: +100% income from working at the office.
  - Bear: +100% income from chalets and the pound.
  - Cow: +50% harvest quantity from planting.
  - Fox: -25% to any crime gain and Skulduggery difficulty, +25% selling price for valuables.
  - Cat: +100% income from the cafe.
  - All bonuses stack with each other and with other buffs.
- Updated extended combat
  - Fixed Physique and Masochism reducing combat pain twice, which at high values could make incoming attacks weaker than natural pain recovery. Pain reduction is now applied only once.
  - Added an Enemy Damage Multiplier setting (Combat Extended > Enemy CE Actions), ranging from 25% to 300%, scaling enemy-inflicted pain, stress, and trauma without changing enemy health. Presets: Very Easy 75%, Easy 100%, Normal/Casual 125%, Hard 150%, Very Hard/Tryhard 175%, Impossible 250%. Existing saves default to 100%; players with customised saves should manually pick 150-175% rather than reapplying a preset.
  - Removed the hidden +25% pain modifier, so the visible slider is now the only source of enemy damage scaling.
  - Negative or corrupted damage values can no longer heal the player, and extreme Blocking, Physique, or edited stats can no longer produce negative damage. Intentional recovery effects such as `<<violence -3>>` are unaffected.
  - Supported by presets, new and existing saves, export/import, undo, feat warnings, and randomisation (Full Randomised Start and Encounters can roll enemy damage; Gameplay intentionally does not).
- Reworked gender identity acceptance
  - Accepting a characteristic is no longer a slow, flat grind. Calm, congruent days build acceptance faster, while days full of dysphoria slow it down, and progress speeds up as you settle in.
  - Acceptance now has memory: returning to a body you'd already made peace with regains comfort far faster than starting from scratch.
- Buffed divine transformations
  - Angels earn 50% more from ordinary income; demons earn 50% more from dancing and sex work; fallen angels earn 20% more from all income.
  - Rewards and bonuses stack, including stolen goods and fencing, while refunds and transferred funds don't count as income.
- Tweaked Insanity again
  - The trait is now sticky: gained at 65%+ trauma for 5 straight days, and only lost once trauma drops below 5% of its maximum (nearly fully healed).
- Buffed Alcohol tolerance trait
  - Now mitigates the penalty drunkenness applies to willpower and other skill checks.
- Buffed rugged shoes
  - Tending skill determines base harvest quantity. Rugged footwear increases effective Tending based on Feet skill, and the final harvested quantity gets a further Feet-skill-based bonus: 100 Feet skill +1%, 500 Feet skill +5%, 1,000 Feet skill +10%, 2,000 Feet skill +20%.
- Increased the Crop Yield penalty setting cap
  - Maximum penalty increased from 500% to 650%.
- Decreased harvesting days
  - Plants taking over 20 days now take 20. Plants taking 10-19 days now take 10. Plants taking 5-9 days are reduced by 2 days. Anything shorter is reduced by 1 day.
- Buffed scratch combat for small characters
  - Scratching is now a stronger alternative to punching for miniature, tiny, and small characters, while consensual scratches stay gentle.
  - Scratch attacks now correctly respect combat settings, dodges, counters, nail-armour rings, and ear-slime interference, and missing NPC reactions have been added.
- Tweaked Avery's boutique jewellery event
  - First trip is now guaranteed once Avery has 80 love, 20 dominance, rage 5 or below, and you return before 22:00.
  - Repeat trips have a 1-in-20 chance under the same conditions.

## Fixes and Improvements

- Prevented an occasional music error on first click
  - Browsers may block music until the player interacts with the page. In some cases the game changed music during that first interaction and removed the old playlist before it could play, causing an error popup.
  - The audio system now safely ignores playback requests for playlists that have already been removed. Save data and progress were never affected.
- Fixed NNPC sidebar using incorrect skin tones
  - Some named NPCs could appear with the wrong skin tone in the sidebar, especially after previewing or editing another NPC's display settings.
- Fixed a double setting for body size.
- Fixed a typo in the Insanity trait.
- Fixed a missing pronoun after birthing in the cottage.
- Fixed redundant Bailey NPC generation when using "pay up" and cafe speech.
- Fixed beast multi-orgasm
  - Actions that hold or stimulate a beast's penis will no longer fail automatically while it is ejaculating, preventing it from disappearing from the player's hand, mouth, feet, thighs, or other positions.
- Fixed a label that wasn't resetting for each NPC mid-combat.
- Fixed X-Change cycle stage visibility
  - The cycle stage now stays visible while X-Change pills are active if the player has enough Science or Awareness, even when the pill's effects are still unknown.
  - Pregnancy-related pauses appear normal until the character becomes aware of the pregnancy. Once discovered, the duration is shown as "Indefinite" with an explanation.
  - Existing pause visibility for choices, permanent effects, and slime is unchanged. Updated both the Traits overlay and the pill-testing display.
- Fixed "Enlarge sideview canvas"
  - Enlarging now leaves a gap for the location/weather render, and related icons are resized to match.
- Fixed the squeak action for the water dragon
  - It could previously be started without wearing any of its limbs, even though it requires a genome dump.
- Fixed market stall rollover
  - Prepaid market stall rentals didn't reset the daily stall lewdity value on day rollover, which could push the value to NaN and trigger the save-corruption warning.
  - Stall lewdity now resets when a prepaid stall renews, the lewdity macro can no longer propagate non-finite values, and affected values are automatically repaired on load.
- Fixed Robin not taking care of the pet minigame during the island bad end.
- Fixed Bailey Lotus collar
  - Using "Activate Stockholm" in the Bailey cheats menu could silently replace your neckwear with Bailey's Lotus collar, and turning Stockholm off afterward didn't remove or unlock it, leaving it permanently stuck.
  - The cheat options now clearly describe what they do, preserve existing neckwear, and properly remove the collar when Stockholm is deactivated.
  - Affected saves are repaired automatically on load: if Stockholm is inactive, the collar becomes a normal removable item and is returned to the wardrobe.
- Fixed Danube Garden loadNPC error popups
  - Garden danger events now correctly use the residents who hired the player as garden supervisor and coworker.
  - This fixes repeated "undefined NPC name" errors, clears outdated NPC data from previous houses, and ensures single-occupant homes still generate a valid second garden NPC.
- Fixed slime-forced masturbation
  - Male characters weren't being released after the intended 2-6 orgasms because the ending check never triggered correctly. The orgasm counter now initializes when the forced session begins, and the scene ends as soon as it reaches zero.
  - Affects all scenes using slime-forced masturbation, including the island, classroom, and moor. Female character behaviour is unchanged.
- Fixed blackmail task
  - Passing out from heatstroke or hypothermia could force clothes back onto the player, unfairly failing Gentleman's Club tasks that forbid tops, underwear, or similar clothing.
  - Temperature-related fainting is now treated like exhaustion fainting: forced clothing changes no longer fail the task or cause the related reputation penalty.
- Tweaked the X-Change permanent notice to only fire once per day.
- Tidied up Avery Garden, fixing assorted mismatches.
- Fixed Robin not being sold
  - Bailey's street shakedown now drags Robin in and can sell him once you're behind on rent, the same as being cornered at home. Previously, staying out in town while owing Robin's debt let you skip his fate entirely.
  - The street shakedown now also counts bank savings toward payment and includes any bank-loan surcharge, matching the normal rent screen.
- Fixed Give Up endings
  - Give Up no longer clears NPC pronouns during aftermath scenes, is hidden in unsupported encounters, and now correctly ends reverse combat.
