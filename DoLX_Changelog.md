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

- **Added feat for 50 days being enby**

  - Added a feat for remaining non-binary for 50 days.

- **Updated Gwylan labour help**

  - Added the returning-player dialogue option that appears only after a previous Gwylan-assisted birth.

- **Improved the Water Dragon lab**

  - Chastity devices are now removed safely during confinement and returned afterwards.
  - Added block reminders, waiting, lateness warnings, and orderly wake-ups.
  - Added a Skulduggery escape route and rebalanced the Athletics chase.
  - Harper now remembers previous Project Pelagos escapes.

- **Protected saves from being wiped on mobile**

  Android and mobile browsers can sometimes clear the game's stored saves automatically, especially when storage is low. Previously, this could make your save list suddenly appear empty with no explanation.

  The game now keeps a separate record of your saves and a backup of your most recent save. If the save database is cleared, the saves menu will warn you, show what was lost and when it was last seen, and let you restore the backup.

  The saves menu also shows whether persistent storage is enabled and lets you request it, which helps protect saves from being automatically cleared.

  Clearing all browser or site data will still remove both your saves and the backup. Exporting your save to a file remains the safest independent backup.

- **Added Autism Spectrum starting trait**

  A new background option is available during character creation.

  Your focus alternates between two phases:

  - **Gifted:** Lasts 25–30 days. School grades improve 25% faster, and all stat gains are increased by 5%.
  - **Burnout:** Lasts 14–18 days. These bonuses are disabled, and studying causes extra Stress.

  The length of each phase is randomised every time, so the cycle does not always change on the same day.

  Each day, you also gain a random **fixation** on something you can train. Gains for that activity are doubled, and practising it reduces Stress. Repeatedly practising other activities without taking a break gradually causes more Stress and makes it harder to focus. Resting for a few hours resets this.

  Practice includes lessons, studying, swimming, dancing, tending, housekeeping, and training at places such as the gym, pool, dance studio, school, and temple. Travelling around town does not count, and long events are not treated as hours of practice just because they happen to raise a stat.

  Fixations only choose activities currently available to you. Advanced combat skills require their related settings to be enabled, and swimming is less likely to be chosen during winter.

  The trait also affects social and sensory awareness. Relationship percentages may appear up to 5 points higher or lower than their real value, including the displayed bar, making it harder to know exactly where you stand. Heat and liquids touching your skin also cause discomfort more quickly.

  The trait can be enabled or disabled from the cheat menu. Existing saves will not use it unless you turn it on.

- **Added Dragon Tongue trait to Water Dragon**

## Tweaks and Rebalancing

- **Herm school rumours now fade if you lose the parts**

  The school rumour about "a student with both boy and girl parts" will now fade if your body no longer has both. How much of the rumour remains depends on your X-Change fame:

  - Under 100 X-Change fame: rumour is completely removed.
  - 101–200: loses 3 levels.
  - 201–300: loses 2 levels.
  - 301–499: loses 1 level.
  - 500+: no levels are lost.

  Changing from one herm body to another does not reduce the rumour, and regaining the missing parts restores it without penalty. The Effects panel will now tell you when the rumour fades. Existing saves keep their current rumour level until your body changes.

- **Lustful now increases Seduction gains by 15%**

- **Updated Elk Scar trait**

  - Now protects against decay for any animal transformation, similar to the Familiar Collar.

## Fixes and Improvements

- **Gwylan fixes**

  - Fixed a crash in the forest shop clothing menu caused by the kaiju costume icon.
  - Gwylan now only takes your ingredients after you finish handing them over, so leaving early will no longer make you lose them.

- **Fixed player pronouns**

  Strangers now judge your gender by your appearance instead of your pronouns. If an NPC does not know you, they will refer to you based on the body they see, including after being changed by X-Change pills.

  NPCs who know your identity or are close to you will still use your chosen pronouns, and narration is unchanged.

  Misgendering Stress has also been adjusted. Each remark now counts only once instead of adding Stress for every gendered word in the same sentence.

- **Fixed World Rewrite gender override**

  - World Rewrite now fully respects **Male Only** and **Female Only** modes for sidebar sprites, generated NPCs, couples, beasts, named NPCs, and gendered dialogue.
  - Existing beasts in older saves are also updated when the override is enabled.
  - Sidebar sprite customisations, such as slot, layer, and skin changes, are now kept after turning the override off.
  - Fixed the **Others** sidebar sprite not appearing.

- **Fixed the Clutching Bones quest**

  If you started Landry's deal through Skulduggery, left the pub before receiving the fake stones, or moved in with Avery, the game could lose track of the quest. This could remove the journal reminder and make Landry or the brown fox act as if you had not progressed.

  The quest now updates when you actually receive the fake stones, is no longer reset by moving in with Avery, and affected saves will repair themselves when loaded.

- **Fixed sensitivity messages**

  - Sensitivity messages now correctly check what you are currently wearing, so they no longer mention removed clothes or awkward lines such as "rubbing against your naked."
  - Nipple, penis, and clit sensitivity now use consistent **sensitive/tender** wording.
  - Sensitivity-increasing cream is properly removed from your save once its effect wears off.

- **Fixed Mate for Life feat** where the feat would not unlock when its requirements were met.

- **Fixed Avery bathing with full clothes**

- **Fixed bullet vibe turning on automatically**

  Vibrator changes are now copied to the save state immediately, so saving straight after changing the vibrator will keep the correct **On/Off** and power settings.

- **Fixed Robin appearing in the Dragon nest**

- **Fixed intentional-loss outcomes**

  Giving up now reliably leads to the appropriate defeat or punishment outcome and no longer causes encounters to loop or stall.

- **Fixed Insanity settings and daily recovery**

  Naturally gained Insanity now progresses and recovers through daily checks.

  Turning off permanent natural Insanity allows it and its Dissociation to fade once Trauma recovers, while Insanity chosen during character creation remains permanently active.

  Full Dissociation continues to work with both versions, and related descriptions now match the gameplay.

## Cleanup and Credits

- **Updated credits**

  - Changed **Mocha** to **DepressoMocha** in DECOMOD credits to avoid confusion with another Mocha (Mozumelody).
