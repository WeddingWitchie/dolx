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

- Merged with vanilla version 0.5.11.4.
- Added the Bailey Expansion
  - Integrated Reiyu’s Bailey Expansion.
  - Fixes and migration support by D.N.A.
  - Updated the credits and changelog with the appropriate mod-expansion attribution.
- Added sensitivity medication and expanded sensitivity mechanics
  - The hospital pharmacy now sells 14-packs of sensitivity suppressants and stimulants.
  - Each dose lasts 16 hours and is limited to one dose per day.
  - Taking one medication replaces the opposing effect.
  - Suppressants reduce effective sensitivity to 0.25.
  - Stimulants add 3 effective sensitivity, allowing normally sensitive characters to experience high-sensitivity effects.
  - Passive nipple rubbing is now prevented by pasties, tape, binders, form-fitting leotards, and swim shirts.
  - Genital rubbing no longer occurs with skirt-only outfits, one-piece bottoms, or boxers worn by vagina-only characters.
  - Trousers and boxers containing a penis can still cause rubbing.
- Added a post-encounter summary
  - Added a new **Show post-encounter summary** toggle under **Settings > Enemy Stats Display**.
  - The summary records how many times the player and other participants orgasmed.
  - It also records where cum was received or given, along with clothing that was destroyed or stolen.
  - Supports human, beast, tentacle, and swarm encounters.
  - Dream encounters are excluded.
- Added a new alternative-spriteset in option
  - Players can now always use the alternative spriteset where one is available, regardless of their current body.
- Expanded the Random game mode setting
  - Random game mode now recursively randomizes all registered toggles, sliders, and choices.
  - This currently covers 446 settings across X-Change, combat, AMC, economy and inflation, rebalancing, fetishes, identity, UI options, and more.
- Added a **Resist heat with willpower** setting
  - When enabled, characters with enough willpower can resist losing control during heat, matching the previous behaviour.
  - When disabled, heat ignores willpower checks and can take control whenever its normal trigger conditions are met.
- Added a random prison fight event
  - The outcome can increase or decrease the player’s prison respect.
- Expanded office temp-agency assignments
  - Players can now accept assignments while dressed provocatively.
  - Provocative clothing increases harassment and the chance of dangerous events on the upper floors.
  - The additional attention also results in larger tips.
  - Being fully exposed or gagged still prevents the player from accepting an assignment.
- Expanded Poppy’s content
  - Poppy is now available during realistic childbirth content.
  - Added additional pregnancy conversations with Poppy.
- Added Whitney and Robin X-Change reactions
- Added bathroom options for worn insertables
  - Players can now scoop out their vagina or anus while wearing a vaginal dildo or butt plug.
  - The item is temporarily removed, acknowledged with special text, and reinserted afterward.
- Improved transformation features
  - Players with multiple transformations can now choose which claws are active.
  - Custom demon colours now display correctly in the mirror.
  - Claws and long nails now help when escaping Eden’s leash.

## Rebalancing

- Updated Insanity and arousal interactions
  - Characters with temporary or permanent Insanity no longer notice passive rubbing from underwear or clothing.
  - Related sensitivity messages and passive arousal gains are prevented.
  - Insane characters can now sleep or shower even when their arousal would normally be too high.
- Buffed the Iron Will trait
  - The Fallen Angel Iron Will trait is now retained after using a genome dump.
  - Iron Will now increases willpower gains by 35%.
  - Fallen Angels with Iron Will gain 45% more willpower while affected by temporary or permanent Insanity.
- Rebalanced advanced combat
  - Dodge chance now has diminishing returns above 60%, preventing very high agility from making the player nearly untouchable.
  - Damage gained from Brawling, Striking, and Kicking now scales more gradually.
  - Standing Fights now inflict slightly more pain on the player.
  - Fixed enemy passive dodge not being applied correctly.
  - Fixed enemy blocking failing to reduce incoming damage because of an incorrect variable name.
  - Enemy blocking is now capped so that it cannot accidentally heal the enemy.
- Extended the Stat Nerf Multiplier
  - The Stat Nerf option now affects Combat Extended skills during fights.
  - Brawling, Striking, Kicking, and Footwork no longer ignore the selected multiplier.
  - Dodging, strike and kick accuracy, melee and tentacle damage, and stability now scale with the setting.
  - The character screen now displays the reduction applied to each affected skill.
  - Skill gains, skill caps, and gym lessons remain unaffected.
- Added gradual masochism and submission conditioning
  - Sustained high pain now has a chance to gradually increase masochism and slightly increase submission.
  - The chance increases with both pain intensity and duration, up to approximately four hours of continuous pain.
  - This works alongside existing orgasm and combat-based masochism gains.
  - The effect is disabled in Soft Mode and during scenes where stat changes are frozen.
  - Masochism remains capped at the normal maximum of 1,000.
- Buffed skilled income sources
  - Vanilla version 0.5.11 reduced income from several low and mid-level activities.
  - Income from affected activities now receives a bonus once the governing skill reaches grade S.
  - The bonus begins at 10% at grade S and scales up to 50% at grade SSS.
  - Income remains unchanged below grade S.
- Buffed black-market income
  - Higher Skulduggery now increases black-market sale values.
  - The bonus scales up to double value at grade SSS.
  - Journal estimates now match the actual sale value.
  - The optional maths-based haggling bonus continues to stack with the Skulduggery bonus.
- Rebalanced Ivory Wraith possession resistance
  - Adjusted resistance to Ivory Wraith possession.
  - Rebalanced Bailey love-interest control gains.
- Updated shop and spa ban recognition
  - X-Change fame below 200 is not recognized, allowing entry.
  - From 200 to 399 fame, staff are uncertain and still allow entry.
  - From 400 to 599 fame, staff become suspicious and allow entry while adding a small hidden trespassing increase once per day.
  - At 600 or more fame, the player is fully recognized and the ban is enforced normally.
  - Players who are not currently X-Changed continue to be recognized normally.

## Fixes and Improvements

- Fixed X-Change body save and load crashes
  - Saving or restoring an X-Change body no longer tries to use a function before it has loaded.
  - This also fixes crashes during pub spike events and other transformations that automatically save or restore the player’s body.
- Fixed runaway pleasure causing repeated orgasms
  - Some events could previously increase pleasure far beyond its intended maximum.
  - The excess could then cause repeated orgasms across later scenes while it slowly drained.
  - Pleasure gain is now capped slightly above the normal maximum, preserving orgasms during violent encounters without allowing extreme values to accumulate.
- Fixed Mickey’s pregnancy-fame recognition
  - Pregnancy fame is now recognized when the player is currently pregnant, including during their first pregnancy.
  - It is also recognized after the player has previously given birth.
  - Existing pregnancy fame continues to be recognized normally.
- Fixed Gwylan’s realistic childbirth content
  - Corrected issues affecting Gwylan’s realistic childbirth scene.
- Fixed Avery’s Saturday street-date invitation
  - The invitation now requires Avery to have been properly introduced.
  - Completing the science project alone no longer causes Avery to act familiar with the player.
  - An unknown Avery can now correctly reach the day-20 introduction event.
- Fixed redundant Avery NPC generation
  - Avery is no longer generated redundantly after the bank-card conversation.
- Clarified Robin’s forced X-Change pill scene at the docks
  - The scene now clearly states when Robin is forced to take an X-Change pill.
  - Robin no longer worries about the changed body after the pill’s effects have worn off.
- Fixed the heist investigator escape
  - The displayed Skulduggery and Athletics labels now match the rolls that are actually performed during investigator chases.
- Fixed the bank gala
  - Corrected cases where the bank gala could fail to run properly.
- Fixed the boutique cash-register theft
  - Added the missing continuation link after stealing from the cash register.
- Fixed strap-on and dildo underwear checks
  - Strap-ons and dildos no longer count as protective underwear.
  - Genuine underwear protection and clothing-tearing behaviour continue to work normally.
- Fixed the Whitney vending-machine event
  - Removed a duplicated choice link from the random MMA event.
- Fixed a duplicated class-event link
  - Class events no longer display the same choice link twice.
- Fixed UI issues
  - Corrected issues in the money cheat menu for mobile.
  - Corrected issues affecting **Default Combat Actions** in the attitude menu.
- Improved audio performance
  - Adjusted audio handling to reduce lag.
- Fixed assorted Whitney event typos.
