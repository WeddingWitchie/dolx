## Instructions:
  * Download DoLX_HTML.
  * Download DoLX_Images.
  * Download DoLX_Audio.
  * Extract all 3 downloaded packages into the same folder.
  * Run "Degrees of Lewdity VERSION.html".
  * Enjoy!

## Changelog
### Changes and Additions:
* Added **Premium Pill** feature.
  * Consuming the pill allows free customization of body changes (genitals/sex, gender presentation, and X-Change effects), with optional flipping (or no flip) for sex/genitals.
* Added a new event where the PC can receive a **Premium Pill** from **Briar** for free.
  * Note: consequences may occur in later patch.
* Added a new **avoidance event** to slip out of **Leighton’s inspection** in Sirris class.
  * The **first inspection remains unavoidable**.
* Added a **sewer minimap**, including an **Antique Weekly Reader detector**.
* Added an **auto save fixer** for pregnancy-related variables.
  * If you still see issues (missing fetus, failed labor, etc.) even after fixes, please report it, more auto-fixes may be needed.
* Rebuilt missing **“in heat”** variables for older saves.
* Added a **“Turn on all”** toggle in Rebalance Settings.
* Updated **Gender Identity** handling:
  * Characteristic menu now reads the overall Gender Identity setting (preference/acceptance/not accepting/rejecting).
  * As the identity bar drifts toward femininity/masculinity, the body changes accordingly.
  * Updated `<<physicaladjusments>>`.
  * Gender Identity Setting now reads new body sizes (miniature/tall/giant).
  * Added a toggle for the Gender Identity body section.
  * Separated Gender Identity logic into its **own file** instead of keeping it inside the X-Change file.
* Added a **large chain event**: Whitney can visit the PC in the orphanage.
  * If the PC is “choice pilled,” Whitney can offer a cure with a **20%** chance in second visit.
  * Rejecting Whitney during the orphanage visit locks a special interaction where Whitney becomes dismissive at school.
  * Requirements: completed Whitney Loft event + Whitney **Love ≥ 80%**, **Dominance ≥ 70%**, **Lust = 100%**.
  * Make-up route: apologize in the park and then find Whitney around the alleyway.
* Updated Whitney relationship UI:
  * Whitney Social tab now permanently shows “Whitney thinks you are his/her boyfriend/girlfriend” after finishing the Loft event (can still change if specific situations demand it).
* Reworked Whitney bullying flow:
  * Reordered Whitney bully: school hallways.
  * Reordered Whitney bully: alleyway.
  * If the PC stays at school and already finished second visit Whitney Special Oprhanage event, the PC won’t get the “after school” bully; instead, Whitney brings the PC home safely to the orphanage (note: school bully gate and after-school bully are different event).

### Rebalancing and Tweaks:
* Removed **passive defiant** for Wolf TF to match vanilla updates.
* Rebalanced Whitney pub requirements:
  * Needs slightly more “love” for Whitney to accept drinking together.
  * Added a gate if the PC rejected Whitney in the special orphanage visit.
* Adjusted X-Change appearance flip randomness:
  * Restored the chance to get **Ivory Wraith** appearance when appearance flip is set to random (**70%** chance).
* Substance rebalance for the **Gwylan ritual** so the PC can proceed the story.

### Fixes:
* Reworded the waiting room.
* Fixed missing comma typo in widget **chitchat**.
* Fixed bullet vibe reinserting when opening wardrobe.
* Fixed some dialogue where NPCs read PC gender incorrectly (swimming pool changing room, Hawk lurker eat scene).
* Fixed broken mismatch for X-Changed NPCs.
  * Note: this may not instantly heal existing saves, players need to pill the NPC again (e.g., Robin/Kylar) to fully correct it.
* Fixed double transformation in character description and added **“sex flip”** notice to make cases like “girl → girl” / “boy → boy” where sex/genitals flipped but gender label stayed the same clearer.
* Fixed NPC attempting to double-pill the PC in prison (narration).
* Fixed mirrored Hawk minimap.
* Fixed danger mechanic and high-allure event pool.
* Fixed Whitney alleyway RNG when high allure.
* Fixed Remy spiking when already X-Changed.
* Fixed bug where NPC tries to undress an already-naked PC.
* Fixed sensitivity clamp stuck at 3 while the game accept 4.
* Fixed Ivory Wraith being able to pill you while pregnant.
* Fixed cheat menu body size.
* Fixed “dumbbitch pill” still being included in random spike pool even when the setting is off.
* Fixed underground ear slime event ordering the PC to eat grass.
* Fixed pirate ship progression/stuck-on-boat issue.
* Fixed sex event with Zephyr.
* Updated face demeanor in cheat menu.
* Fixed `autotakepillcheck` for new saves / new game players.
* Fixed inconsistent tenses in bullet vibe event.

### Terminology / Consistency:
* Renamed wording **“Genderflip” → “Sexflip”** since X-Change now reads to genitals/sex.
