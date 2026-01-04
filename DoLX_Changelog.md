## Instructions:
  * Download DoLX_HTML.
  * Download DoLX_Images.
  * Download DoLX_Audio.
  * Extract all 3 downloaded packages into the same folder.
  * Run "Degrees of Lewdity VERSION.html".
  * Enjoy!

## Changelog
### Changes and Additions:
* Updated to be in par with **Vanilla 0.5.7.9** and **DoLP v0.740**.
* Updated hallway spike skill check giving false outcome.

### Rebalancing and Bug fixes:
* Fixed stress and fatigue scaling fluctuation/inconsistency (again).
* Making a fallback for `<<widget "faceVariantOptions">>`
* Patched `updatePhysique()` with guards to prevent undefined/NaN values.
* Ensured `updatePhysique()` runs on startup (and after passage render/load) to avoid `[currentSkillValue]: skill 'physique' unknown` when other modules call physique early (e.g., Combat Expanded / height changes).