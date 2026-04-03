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
* Updated to **vanilla version 5.8.10**.
* Added the **"Water Dragon" trait**.
* Added **X-Change fame** to the **cheat menu** and **Mickey task**.
* Added an automatic **unlocked cabinet** at game start, along with **one free X-Change antidote**.
* Updated the **UI** to be compatible with **Breeze mod**, with a toggle to switch back to the **plain UI** from the **start menu** and **DECOMOD tab**.
* Added the **missing tails (error)** in the **Gwylan Hypno interaction**.
* Updated **Avery’s content** so Avery can now notice the player has a **HBSC bank account**, potentially trigger a **Gala** party in Sunday party. Avery can also send money to that account for the correct cooking requests.
* Updated the **Anti-Pill Dealer** so the Anti-pill dealer may or may not appear each week, and when present, their stock now changes daily with **2 item types** and **1 stock each**.
* Updated the **Gender Identity descriptions** to focus more on **identity** rather than **sex or expression**.
* Added a **beauty boost feature**. Washing and applying makeup now temporarily increase beauty, makeup beauty is removed when washed off, cleanliness decays over the day, and players can now wash their **face and hands** in the **bathroom** at the **orphanage** and **Alex’s farm**.

## Rebalancing and Fixes:
* Fixed the **side image layer system** to read layering more like **DoLP**, while keeping some rebalance changes.
* Fixed the **bracelet jewellery index issue**, which previously caused mismatches and incorrect wording because all entries were reading index **7**.
* Fixed a glitch in the **img2 dual image feature**.
* Fixed **Wren Heist** not being able to trigger again.
* Reworked and rebalanced the **MMA Gym**. Interactions now feel more alive, and **Riley’s stats** are now updated in the **NPC social menu** alongside their new interaction content.
* Reworked several **X-Change fame interactions**.
* Updated **school hallway spiking** so it can now happen when **X-Change fame** reaches **800**.
* Updated the **Whitney Special Orphanage visit** requirement so it now needs **Whitney lust 100** and either **X-Change fame 250** (with love 80%+) or the **Whitney loft event** to be completed.
* Updated **Riley’s alleyway rescue** so it can now happen when **X-Change fame** reaches **500+**.
* Rebalanced **X-Change fame gains** in several situations, increasing some gains from **1** to **2**.
* Fixed the **hypno whack action**.
* Fixed missing variables for **Alcohol** and **Docks** in the **history passage**.
* Reworked the **Gender Identity meter** again to better match its intended behavior. The meter is now universal in the **Characteristics** menu, body changes now take roughly **1 to 2 months**, and new saves begin as **non-gendered** before recalculating properly on the next day.
* Fixed **EventSystem.Validate()Failed** errors and reworked **beast NPC generation** more broadly.
* Fixed the **Innocence Pill** so it now stores **player awareness** properly instead of erasing it when the pill effect ends. This fix only applies to newly spiked players.
* Updated **Gender Identity pronoun preferences** so players can now mark **all pronouns as preferred**, allowing the **dynamic preferred pronoun** option to work more consistently.
* Rebalanced **stress gain and relief** for **Butchy/Sissy** and **HypnoCrossdress**.
* Updated player anatomy preferences so players can now choose **vagina + penis** preference combinations.

## Cleanup and Technical Changes:
* Fixed some code typos that were preventing widgets from **dereferencing a missing target**.
* Tweaked **NPC generation** further and fixed the **audio reader** for NPCs.
* Added a **definition YAML**, fixed **VSC conflicts**, cleaned up leftover merge content, and removed **unused icons**.
* Cleaned up the **old Gender Identity system** by removing outdated widgets, macros, and related variables such as **$daily.bathroomIdentity**.
* Marked `<<genderidentity (number)>>` as **suspicious/deprecated**, reducing its role to avoid future issues.
* Moved more initialization code to **version-update.twee** and cleaned up redundancy across the codebase.
* Reworked **DoLP New Attitude** again, with updates across **20 files**.