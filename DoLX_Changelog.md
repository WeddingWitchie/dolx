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
* Updated the mod base to **vanilla version 0.5.10.12**.
* Implemented the **Wraith Addition Mod**.
  * Added **Wraith Addition Mod v1.5.4**, made by **Sasa** from the Modding server.
  * Huge thanks to Sasa for allowing us to merge it.
  * The mod settings can be found in **Modded Settings**, under **NPC Settings**.
* Updated the game settings display.
  * Game settings in all locations should now show the setting banner properly.
* Tweaked the dual image pack path.
  * The dual image setting **“Use alternative spriteset when gender”** now uses the `decorations`, `sex`, `ui`, and `misc` folders from `img`.
  * This replaces the previous standalone `img2` path structure.
  * This change should help reduce image file redundancy.
* Updated the cheat menu and mirror settings.
  * Added clearer warnings around cheat and mirror-related options.
* Updated **X-Change virginity handling**.
  * X-Change bodies now keep their own separate virginity state instead of sharing the base body’s virginity.
  * Losing virginity while transformed will no longer automatically affect the original body, and vice versa.
  * The **Virgin** trait now applies if either the current body or the stored alternate body still qualifies as a virgin.
  * Added save migration support for older X-Change saves.
  * Existing transformed body records should now be repaired and preserved instead of resetting virginity when swapping bodies.
* Added a water dragon graphic for **Beeesss**.
  * Graphic by **RRds**.
* Updated the **MMA Gym Event**.
  * There is now a chance to meet **Avery**, **Whitney**, or both of them at the same time.
* Updated feats.
  * Added a feat for finishing **Tenyclus** all the way to the end.
  * Herm feats should now work properly for X-Changed herm bodies.

## Rebalancing and Fixes:
* Fixed combat **“yourself”** text and a Wraith loop issue.
* Fixed missing undress actions and handholding interactions.
* Fixed the TF ears renderer.
* Fixed a broken interaction in police collar removal.
* Fixed bike repair.
  * Bike repair should now correctly cost money.
  * Increased the repair price to **£350**.
* Fixed Whitney collar handling.
  * Also tidied up neckwear indexing.
* Fixed a typo in the cheesy pick-up line.
  * Corrected a missing quotation mark.
* Fixed Kylar’s nightmare scene.
  * A dream should no longer take the player’s virginity.
* Fixed the **Gentleman’s Club** underwear demand.
  * The **“wear no underwear”** demand now avoids schooldays unless the player’s exhibitionism is high enough to swim naked.
  * This prevents players from being trapped between failing the demand by wearing swimwear and being unable to join swimming class naked.
* Fixed the pirate journey island event.
  * Day passing should now decrease properly.
* Fixed combat skill difficulty.