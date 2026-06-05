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
* Added **automatic bill payments** to the HBSC bank.
  * Players can now route recurring bills through their HBSC savings.
  * Bills are paid automatically when they fall due, as long as the account balance can cover the full amount.
  * Three bills can currently be covered:
    * Orphanage rent, paid to Bailey.
    * Farm tower guard wages.
    * Gambling-ring upkeep, paid to Landry.
  * The journal now shows which bills are covered by a standing order.
  * If a standing order is auto-cancelled, the journal now displays a red alert.
* Updated the **HBSC bank**.
  * Interest now uses simple pro-rata yearly rates instead of compounded AER.
  * A 1-month £300,000 fixed-term deposit at 2.5% now pays exactly £625.
  * A 12-month term now pays the full headline yearly rate.
  * "% AER" has been relabelled to "% per year" to avoid implying compounding.
  * Fixed-term confirmation and result screens now show both the interest earned and the term length.
  * Bank brochures now explain that rates are yearly, with monthly terms paying roughly 1/12 of the yearly rate.
  * Active deposit details now show the total if held to maturity.
* Updated the **horse race minigame**.
  * Time now passes while the horses are running.
  * The racecourse now closes at 21:00.
  * The racecourse is unavailable at night after closing.
* Tidied Alex’s sleep passage.
* Added a missing plaid skirt.
* Added the **Dragon Eyes** trait for Water Dragon.
  * Combines sharp eyes with the esoteric trait from special clothing.
  * Grants +5% skulduggery.
  * Causes the player to always hallucinate, regardless of awareness, trauma, or hallucinogens.
* Updated **Kylar stalking**.
  * Players with Sharp Eyes or Dragon Eyes can now notice when they are being stalked.
  * Players with high awareness + high trauma can also notice the stalking.
  * Other players will only hear footsteps.
  * The stalking text has been made more natural.
* Updated the **mansion intro X-Change scene**.
  * Avery’s choice pill scene now gives the player a coloured notice.
* Applied **Snowy’s mysterious graphic fix**.

## Rebalancing and Fixes:
* Fixed **horse race betting**.
  * The race now correctly uses the horse chosen by the player.
* Fixed **named NPC X-Change body sync**.
  * Fixed an issue where named NPCs affected by blue pills could display broken genital text during sex scenes.
  * This could cause text such as "none" to appear instead of the correct body part.
  * Transformed NPC body data is now kept synced properly across scenes.
  * Existing broken text already printed on screen will not update, but future X-Change scenes and normal pill update or restore sequences should use the corrected body state.
* Fixed **corrupted X-Change body data**.
  * Taking certain X-Change swap pills could load a broken cached body and corrupt the player’s appearance.
  * This could affect character descriptions, face, body shape, breast size, bottom size, or related appearance options.
  * The game now validates saved transformed-body data before using it.
  * Invalid cached swap bodies are now discarded and regenerated safely instead of being loaded into the player.
* Fixed **farm shower clothing wetness**.
  * Bathing naked at the farm shower should no longer make the player’s clothes wet.
* Fixed **Poppy** more.
  * Restored a missing pregnancy link.
  * Poppy can now only be given food once per day.
* Fixed **broken stall selling**.
* Fixed **transformation issues**.
  * Fixed non-demon chimera transformations rendering during demon and animal transformations.
  * Fixed aquatic lungs being completely wiped after a genome dump.
* Fixed **transformation description titles**.
  * Transformation titles in the characteristics menu should no longer display incorrectly.
* Fixed **Soft body shape clothing render**.
  * Fixed Lower and Under-Lower clothing layers appearing darker than intended on the Soft body shape.
  * The soft-body shading was being applied even when there was no shadow area, tinting the whole garment.
  * The fix limits the shading to the intended shaded region.
  * Other body shapes are unaffected.
* Fixed **Avery cheat menu**.
  * Fix by Sei / Karl Sendis.