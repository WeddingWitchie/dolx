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
* Updated the mod base to **vanilla version 0.5.10.10**.
* Updated **X-Change pill icons** to use artwork by **Akoz**.
* Added **Hyper Fertility** support to **purple pills**.
* Added a new pill type: **Gray Pills**.
  * Gray pills are colourless X-Change capsules that carry single effects such as **Breeder**, **Bull**, **Swell**, **Passion**, and more.
  * Gray pills do **not** force a gender swap.
  * They apply to the player’s current body and can stack with existing X-Change sessions.
* Added **Landry’s gray pill shop**, unlocked after the bank heist.
  * Unlocks through the **"Landry has news about the pill network"** pub option after completing the bank heist.
  * Sells all **15 gray pill effects**.
  * Each pill costs **£6,000**.
  * Limited to **1 pill per day** for operational security.
* Updated **hospital X-Change stock**.
  * Always available: **Resistance**, **Continue**, and **Weekly Extension** pills for **£3,000** each.
  * Weekly rotating stock now includes **2 random pills** from: **Breeder**, **Bull**, **Hyper Fertility**, **Fertility**, and **X-Tend**.
* Updated the **Water Dragon** transformation.
  * Added proper vanilla graphics by **RRds**.
  * Expanded Water Dragon content during **island travel** and **island exploration**.
* Added the **Event Info** tab and tidied related UI/code.
* Added **X-Change toxin chances** to island arrow volleys.
  * Drugged islander arrows now have a small chance to carry X-Change toxin when they hit.
  * The chance scales with the number of arrows that land.
  * Clean misses remain safe.
* Added an **X-Change toxin chance** to the catacombs dart trap.
  * The dart trap can now rarely carry X-Change toxin when it hits.
  * The effect uses a flat chance to match the single-dart encounter.
  * Successfully avoiding the trap remains safe.
* Added **gender filters** for NPC multi-orgasm settings.
  * NPC and named NPC multi-orgasm settings can now apply to **everyone**, **women only**, or **men only**.
  * Existing saves default to the previous behaviour.
  * The filter only applies when the matching multi-orgasm setting is enabled.

## Rebalancing and Fixes:
* Fixed an audio bug where looping background voice audio could continue playing after audio was turned off.
  * This also fixes voice loops continuing after loading another save.
  * Stuck loops from older versions should now be cleared properly.
* Rebalanced penetration pain.
  * Penetration pain is now halved at the source.
  * Trauma conversion now starts at **100 pain**.
  * Pain above 100 converts into trauma at a **1:1** rate.
* Buffed scratch damage based on the player’s **brawling skill**.
  * This bonus is only available for **tiny** and **miniature** body sizes.
* Updated **Dragon Eyes** behaviour.
  * Dragon Eyes can still cause hallucination effects.
  * Beast-related encounters now better respect the player’s beast content setting.
  * When beast content is disabled, affected encounters should keep safe monster-person presentation where needed without opening blocked lewd actions.
* Updated **feat boost** handling to better match **DoLP**.
  * After this update, it is recommended to click **"Import all feats"** in the feat menu to refresh the data.
* Fixed **Avery home rage** checks.
  * Avery’s home rage scene while the player is not pilled now only happens when the player has the same sex/genital setup as Avery’s gender while not under an X-Change condition.
  * If the player is X-Changed, they should generally be safe from this check.
* Fixed **Whitney pub** issues.
* Fixed **mirror transformation ears** and tidied the related code.
* Tidied up **housekeeping class** content.
* Fixed and tidied more **Poppy** content.
* Restored **demon NPC descriptions**.
  * Description pools now include both **brawny** entries from DoLX and **demon / lesser demon** entries from DoLP.
  * Updated matching **HP**, **breast**, **penis**, **level scaling**, **randomisation**, and **demon-disable** bounds to keep the parallel arrays aligned.
