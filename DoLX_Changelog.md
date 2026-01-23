## Instructions:
  * Download DoLX_HTML.
  * Download DoLX_Images.
  * Download DoLX_Audio.
  * Extract all 3 downloaded packages into the same folder.
  * Run "Degrees of Lewdity VERSION.html".
  * Enjoy!

## Changelog
### Changes and Additions:
* Updated to be in parity with **DoLP 0.741**.
* Added a minimap to the catacombs (old churchyard).
* Added the "Xenos" title when the PC has 3+ transformations, matching newer DoLP behavior where you can wear more than one TF (name from Greek meaning "foreigner").
* Updated X-Change settings:
  * You can now choose new body size when flipped.
* Improved text/UI clarity:
  * Added more lines to flavor text generators.
  * Character description now more clearly indicates whether the PC gets "butchified" or "sissified".
  * Added UI notices for all dysphoria sources (shows which aspect caused it).
* Upgraded the waiting room to be more compatible with saves from other DoL game (*still broken for herm, since DoLX lacks a herm base sex/gender*).
* Restored Eden underground farm rescue:
  * PC has a chance to shout for Eden's help.
* Added a library orgasm special event if the orgasm is caused by wearing bullet vibe.

### Rebalancing and Bug fixes:
* Fixed a typo in `<<cheesy-pickup-line>>`.
* Fixed gender flip trait text:
  * Changed from "your body has flipped…" to "your genitals have been flipped…" as pills now target genitals.
* Fixed combat desync mid-sex when getting X-Changed.
* Fixed pronoun weirdness when talking about hookah glasses to Gwylan.
* Fixed typo in gender identity setting.
* Fixed time skip computation in the cheat menu.
* Fixed portal pill (industrial) not appearing:
  * Now appears as long as the player has spike portal pill enabled in settings.
* Tweaked audio (attempting to fix double orgasm sound + missing moan after orgasm).
* Fixed temple vow logic:
  * Should now behave correctly for perma-pilled and original body.
  * Temple vow can break appropriately.
  * With non-perma X-Change pill, player can receive divine forgiveness.
* Fixed masturbate in Avery's mansion feature.
* Removed gender icon in sidebar to avoid confusion (since gender and sex are now separate).
* Fixed Whitney bullet vibe math event check.
* Fixed underground farm lock regenerating after being broken.
* Fixed Cock Addict trait:
  * Can now cum when masturbating using a buttplug or bullet vibe.
* Added guard against broken NPC generation.
* Fixed handbag one-piece clothing appearing only half.
* Fixed "Book rent due" always firing even if the player didn't rent any library book.

### Dev note (D.N.A.):
*I brought back the Eden underground farm rescue on purpose.*
From a world/logic perspective, the forest and moor aren't that far apart as there's a known shortcut (bog), and Eden would realistically know it. Also, GreatHawk can mention about "the Hunter" despite being a moor-native, which implies the forest/moor connection isn't remote or inaccessible. On top of that, when the PC escapes the underground farm and gets rescued by horses/centaur, it consistently leads into the forest, reinforcing that the two regions are closely linked.
So if the rescue is removed entirely, I think it'd be better to rework the moor/forest relationship first, otherwise it risks feeling inconsistent and (in my opinion) slightly nerfs Eden's identity as "the hunter." Again, this is just my personal take so take with grain of salt.

Also, if you didn't notice, **all X-Change pills are now safe to consume**.
