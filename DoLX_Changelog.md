> **If the normal pipeline links at the bottom fail, use these backup downloads instead:**
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
* Expanded the **virtual pet console**.
  * Added a new date with **Robin**.
    * Robin can now be invited to the game centre from the **“go for a walk”** menu.
    * Playing together gives Robin a **35% chance** to give the PC a virtual pet booster pack.
  * Added **virtual pet booster packs**.
    * Booster packs contain one of the following:
      * A new skill.
      * **+100 max HP**.
      * **+50 max MP**.
      * An **Elixir**.
  * Added **Elixirs**.
    * Elixirs revive your pet once after it dies, either in battle or from neglect.
    * This prevents the player from having to start over immediately.
  * Added new virtual pet skills.
    * Added a powerful move for each element:
      * **Inferno**.
      * **Tsunami**.
      * **Solar Beam**.
      * **Volt Crash**.
    * Added three non-elemental skills:
      * **Meteor Strike**.
      * **Rejuvenate**, a strong healing skill.
      * **Revive**, a passive skill that lets your pet automatically get back up once per battle if it falls.
  * Winning battles now permanently boosts your pet’s stats.
    * Stat gains increase with each win: **+10, +20, +30**, and so on.
    * This helps pets keep pace with tougher enemies.
  * Fixed the console shop price to its proper value.
  * Removed an unused variable.
* Tidied the **furniture shop**.
  * Merged the **Radio** and **Console** shelves into one **Electronic** shelf.
  * Folded **Special** plushes into **Decorations**.
  * Moved **Shelving Units** into **Miscellaneous**.
  * Existing owned items are unaffected.
  * The **moon**, **snowman**, and **axolotl** plushes now display their own icons.
* Updated the **forest shop**.
  * Added a dedicated **earrings** shelf.
  * The **Lilac earrings** can now be browsed directly instead of only appearing through search.
* Updated the **Premium Pill** body options.
  * Added **“Make body herm (both genitals)”** to the **Body Options** screen.
* Added **Hopeless Cycle ending unlocks** to the **Feat Boosters** screen.
  * Players can now spend **VrelCoins** to buy any of the seven Hopeless Cycle endings, from **F** through **S**.
  * On the next game, after bringing the snake painting to the museum, bought endings can be read straight to their conclusion when Winter tells the story.
  * Reading a bought ending claims its rewards without requiring the whole sequence to be replayed.
  * This includes the **Chain Tunic** outfit from ending **S**.
  * Players may buy all endings, some endings, or none.
  * Harder endings cost more VrelCoins.
    * Ending **F** costs **1 VrelCoin**.
    * Ending **S** costs **40 VrelCoins**.
* Added smoking at the **orphanage loft**.
  * Once the PC has learned to smoke from Whitney and unlocked the loft, cigarette packs can be bought at the pub.
    * A pack costs **£100** and contains **7 cigarettes**.
  * Cigarettes can be smoked at the loft window.
    * Each cigarette reduces stress and a small amount of tiredness.
  * Added idle smoking moments that react to:
    * Time of day.
    * Weather.
    * Season.
    * Blood moons.
  * Added smoking limits and drawbacks.
    * Smoking two cigarettes back-to-back leaves the PC woozy and on edge instead of relaxed.
    * Smoking a third in a row makes the PC pass out.
    * The PC will not smoke more than five cigarettes in a day.
  * Added cigarette cravings.
    * Once the habit has been picked up, going a full day without smoking causes cravings.
    * Cravings last until the PC smokes again or stays clean for a week.
  * Added a Whitney loft smoking event.
    * On non-school days, Whitney may catch the PC smoking and pebble the window to be let up.
    * The scene can include sharing a cigarette, showing off smoke rings, shotgun kisses, and more.
  * Held cigarettes now appear in the journal.

## Rebalancing and Fixes:
* Fixed a character creation bug.
  * Beauty was not being set correctly.
* Fixed **Vanilla** named-NPC sprites.
  * In the **“Vanilla”** Named NPC display style, a character’s body, hair, and clothes could be read from different sources, causing them to disagree with each other.
  * Female-presenting characters now display correctly.
    * This includes a female Kylar, NPCs changed by an X-Change pill, and NPCs affected by the futa or cuntboy settings.
    * Body, hair, and clothes now all follow how the character actually presents, keeping sprites in sync.
  * Fixed female-presenting NPCs showing the wrong body or male hair sprite while wearing female clothes.
  * Fixed Sydney’s hair sometimes showing the wrong or garbled colour when an unsupported colour or style was set.
    * Sydney’s hair now falls back to their natural strawberry-blonde instead of rendering a broken sprite.
  * This does not affect the **DOLP** display style or other features.
* Rebalanced **X-Change** arousal and dysphoria.
  * Sensitive nipples and genitals now build arousal much faster when rubbing against clothing.
    * Increased from **4** to **10** per minute.
  * Overwhelming dysphoria no longer goes to waste.
    * Once a trait is maxed out, excess dysphoria now bleeds into tolerance.
    * Repeatedly overloading the PC’s new body, such as through arousal or pleasure, gradually builds acceptance.
    * This makes growing fond of the new body less unreasonably difficult.
* Lowered special clothing costs.
  * Reduced the **Chain Tunic** VrelCoin cost from **50** to **30**.
  * Reduced **Antiques** special-clothing costs from **50** to **30**.
* Fixed an alcohol withdrawal reminder.
  * The reminder previously repeated every passage.
  * It now appears at most once per hour.
* Fixed a broken init.