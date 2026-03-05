> **If the normal pipeline links above fail, use these backup downloads instead:**
> [Download DoLX Images](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=img) | [Download DoLX Audio](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=audio)

## Instructions:
  * Download DoLX_HTML.
  * Download DoLX_Images.
  * Download DoLX_Audio.
  * Extract all 3 downloaded packages into the same folder.
  * Run "Degrees of Lewdity VERSION.html".
  * Enjoy!

## Changelog
### Changes and Additions:
* Added a **Water Dragon** transformation.
* Added a new event: **Whitney Pub Flirt Intercept** — if you flirt with someone else while Whitney is in the pub on Sunday night, Whitney may intervene. This can only trigger after completing Whitney’s special orphanage visit (not the loft event).
* Added an **experimental “World Rewrite”** feature that can force NPC gender variables to **male-only** or **female-only**, including newborn outcomes. **Warning:** this cannot be reversed once applied.
* Added a **save repair / recovery** path for a failed **Fallen Angel** state. The repair detects a corrupted save signature (rather than the original event trigger): it checks that the temple vow is already broken, the angel state is still active (not temporary X-Change), and the player is not already fallen. If all conditions are met, the mirror can be used to complete the fall. Also updated the broken vow widget as an extra safeguard.
* Updated the **Premium Pill choice menu**.
* Updated the **credits list** and contributor section.
* Updated the internal **code dictionary** (tools only).

### Rebalancing and Fixes:
* Fixed an Avery’s Mansion **masturbation timer** bug.
* Fixed several events that could not be undone correctly using the **history** feature.
* Fixed **Purple Pill (basic)** incorrectly behaving as a **Breeder Pill**.
* Fixed a missing variable in the **sewer minimap**.
* Fixed a wrong gender reader in an **after-sex** sentence.
* Fixed the changing room not recognizing **Herm max fame**.
* Renamed **genderswap / piller fame** labels in the **[STATS]** tab for clarity.
* Improved stability for the **crossdressing trait** to reduce inconsistencies.
* Fixed broken **breeder math** / counting logic.
* Updated NPC body part sliders to remove an empty **base herm** entry.
* Tweaked **Cock Addict / Hole Addict** traits:
  * Cock Enthusiast no longer gets proper fulfillment from butt plugs.
  * Hole Enthusiast no longer gets proper fulfillment from strokers/penis toys.
  * Toys may still rarely brute-force an orgasm; when they do, it feels unpleasant rather than rewarding.
* Fixed **Daily Take Pills** not being consumed in some cases.
* Updated the Gentleman Club master word UI to avoid misleading visuals with the **Gwylan** font.
* Breeder Pill rebalance:
  * **Breeder + ear slime:** slime stops attempting after a while instead of softlocking the player.
  * **Breeder + strange flower/phallus plant:** nectar vaginal creampies now count toward progression.
* Fixed a possible **NaN** state in pregnancy testing.
* Fixed resistance pill stats not displaying numbers correctly.
* Fixed face mirror demeanor being reset incorrectly.
* Fixed many typos in Avery’s Mansion steal content (narration and code).
* Fixed transformation initialization failing to load in some cases.
* Added guards for **XTend pill initialization** failing in certain saves.
* Fixed typos in NPC sex speech.
* Pregnancy rework and hardening:
  * Core pregnancy JS fixes (counter integrity, `ensureBirthId`, birth flow stability).
  * Updated pregnancy helper / knows-about tracking logic.
  * Fixed parasite pregnancy cheat menu widget.
  * Updated statistics widget parasite pregnancy display.
  * Added minor repair UI plumbing (manual/visible; not auto-run).
* Reworked the core X-Change mod behavior:
  * Fixed Swell’s inconsistent branching.
  * Prevented load-time cache corruption.
  * Replaced silent rewrites with visible validation + notice + runtime fallback.
  * Removed duplicated/broken code while keeping the core X-Change structure intact.

### Credits for WaterDragon TF:
* Idea: **NovaCyber**
* Coded by: **Isari**
* Sprites: Taken from **Freedom Planet 2** by **GalaxyTrail**
* Fixed / Updated by: **Bec** and **D.N.A.**
* Integrated into the game by: **D.N.A.**
