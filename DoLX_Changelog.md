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
* Flipped **Smuggler Cave minimap** direction.
  * Adjusted the Smuggler Cave minimap position mapping so the visual route now matches the navigation links.
  * "Towards the sea" now points left, while "Deeper" points right.
  * Makes the cave map read more intuitively, with the entrance/sea side on the left and deeper cave progress moving to the right.
* Updated **bank heist street investigation** timing.
  * Changed the bank heist street investigator event from a daily event to a weekly event.
* Added **speech-action English compensation** for the Bimbo Pill.
  * The Bimbo Pill forces `$englishtrait` to `-1`, which previously zeroed out every `1 + $englishtrait` multiplier used by speech actions.
  * While the bimbo effect is active, speech actions now fall back to the player's pre-bimbo English level stored in `$xchange.english`.
  * The fallback has a floor of `0`, so affected speech actions are at worst as effective as a no-school baseline.
  * Applies to affected speech actions such as pleading, moaning, demanding, mocking/teasing, apologising, asking to choke, asking for rough treatment, and hypno-scream-to-askrough.
  * **Dumb Bitch** is intentionally NOT compensated, since its dumbness is permanent and earned per-orgasm, so reduced speech effectiveness remains intended.

## Rebalancing and Fixes:
* Fixed a missing `<<modupdate>>` call in `Start2`.
* Fixed missing **Poppy** checks.
  * Added missing Poppy handling where needed.
  * Fixed hard-coded "her" wording for Poppy in the soup kitchen.
* Fixed missing beast sex image handling.
  * Added/fixed missing sex image support for beast content.
* Fixed **GH empty-nest child handling**.
  * Filtered dismissed GH/tower children out of normal child visit and activity event selection.
  * Children marked as farewell/dismissed are no longer treated as present in the nest after their leaving scene.
  * Added a quiet empty-nest memory moment when all GH children have left.
  * The memory moment gives the player a small stress reduction while recollecting time spent with them.
  * Keeps child data intact and only adjusts visit/event lookup logic.