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
### Changes and Additions:
* Added a **dragon skin option** to the **mirror**.
* Added a missing **double penetration image for beast** (thanks to **LetMeSmoke** from the *mysterious submission* thread on the modding server).
* Added a **color hint** when **Kylar pills themselves**.
* Expanded spacing in **Gwylan’s bloated narration** for better readability.
* Updated **sex image animations**, adding missing files based on vanilla assets.
* Updated animation work by **JollySpill** and added the related **credits**.
* Updated the **Fallen Angel recovery path in the mirror**; the recovery now also requires the player to **no longer qualify for the Virgin trait** or temple vow being broken, while still being angelic, not temporarily X-Changed, and not already fallen.

### Rebalancing and Fixes:
* Fixed **Fallen Angel backup recovery** in the mirror incorrectly treating **non-vow** the same as **broken vow** characters.
* Fixed several issues related to the **Water Dragon transformation**.
* Fixed **Beast gangbang** interaction where **licking could cancel double penetration**.
* Re-tweaked the **XTend pill** logic:
  * Prevents `xchangeXtendGrowth()` from creating or preserving **Xtend state** when Xtend is not active.
  * Still avoids the **undefined tracker crash**.
* Fixed a bug where **stress reset to 0 every hour** due to the identity widget applying `<<stress -5>>` incorrectly, which could multiply and remove stress.
* Fixed **(fake) Breeder Pill** not affecting **beast characters**, ensuring the breeder gate works correctly with the patched gangbang flow.
* Fixed **missing icons** and a **redundant NPC generator for Landry**.
* Fixed missing **farm milking icons**.
* Fixed **Landry** missing their icon in the selection menu.
* Changed the **jewellery shop icon** to a proper **jewel icon**.
* Fixed a **double link** in **Gwylan Pub**.
* Stopped **false reports** from the beast train reload reporter.
* Fixed combat logic in the `<<effectsman>>` widget to ensure a **clear intro for each spawned NPC**.
* Fixed the **breeder check** to ensure a **target NPC actually exists** before assuming a penis-bearing NPC.
* Refined **hypnocrossdress / sissification logic**.
* Fixed the **Fallen Angel natural fall widget** (additional correction).
