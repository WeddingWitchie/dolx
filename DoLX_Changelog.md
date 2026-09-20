> **If the normal pipeline links at the bottom fail, use these backup downloads instead:** [Images](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=img) | [Audio](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=audio)

> **To download the official X-Change APK, join the DoL Modding server and check the dedicated X-Change channel:** [X-Change Channel](https://discord.com/channels/675158131688603721/1512272787572785162)

## Instructions:

- Download DoLX_HTML.
- Download DoLX_Images.
- Download DoLX_Audio.
- Extract all 3 downloaded packages into the same folder.
- Run "Degrees of Lewdity VERSION.html".
- Enjoy!

## Changelog

## Changes and Additions

- **Updated RBE to v0.6.1.2**

- **Bags now have their own slot**

  - Purses, messenger bags, gym bags, tote bags, luggage, the vintage suitcase, and backpacks now use a dedicated **Bag** slot instead of the Handheld slot.
  - Bags can now be worn while also holding umbrellas, parasols, canes, fishing rods, or other Handheld items.
  - Shops now have a **Bag** tab and wardrobes have a **Bag** row.
  - Scenes that temporarily remove carried items now take and return both Bag and Handheld items correctly.
  - The POCKET bag tab still follows the equipped bag.
  - The foraging basket remains a Handheld item.
  - Bag artwork is unchanged.

- **Scarves now have their own slot**

  - Scarves, fur boas, holy stoles, and neck cushions now use a dedicated **Scarf** slot instead of the Neck slot.
  - Scarves can now be worn together with collars or necklaces.
  - Shops now have a **Scarf** tab and wardrobes have a **Scarf** row.
  - Existing scarves automatically move to the new slot when loading a save, including worn, carried, stored, dropped, Bailey-confiscated, and outfit-saved items.
  - Scenes that remove or return neckwear still handle scarves correctly.
  - Scarf artwork is unchanged and draws over collars.

- **Added the Magical Menagerie**

  - Added buyable pets by **Grimace** and **Zerolefox**.
  - Pets can live in the player's room, get hungry or bored, build Bond, leave if neglected, and be found again later.
  - Added **Snakes**, bought from the pet shop and requiring a terrarium and suitable food.
  - Added **Slimes**, which are harder and more expensive to obtain and require discovering the cabin by the lake first.
  - Slimes feed on suitable things produced by the player's body instead of normal food.
  - Feeding and playing with pets raises Bond.
  - Pets can be carried outside: snakes ride on the neck and slimes sit on the head, with both appearing on the player sprite (vanilla only atm).
  - Pets only accept appropriate food and may refuse or become sick from the wrong food.
  - High-Bond pets can defend the player during encounters.
  - Snakes strike enemies, while slimes slap enemies and absorb some Pain.
  - Pet attacks become stronger with Bond and do not count as attacks made by the player.
  - Low-Bond pets may run away instead.
  - Pets may interfere even during consensual encounters, with NPC reactions to their involvement.
  - Lost pets can later be found in the forest, at the lake, or in Garter's back room depending on how they disappeared.
  - Bond slowly falls while a pet is away, but the pet still remembers the player.

- **X-Change Fame now has reputation titles**

  - Added X-Change Fame titles ranging from **Pill Popper** to **The Many-Faced**.
  - X-Change Fame can combine with other Fame types for mixed titles such as **Kindly Stranger**, **Two-Faced Dealer**, **Social Chameleon**, and **Dual Cover Star**.
  - Higher Fame levels unlock stronger title variants.
  - Maxing all relevant Fame can unlock **The One and Only, Twice Over**.
  - Mixed titles now check actual Fame thresholds correctly.
  - If no mixed title qualifies, the strongest normal reputation is shown instead.
  - The X-Change Fame meter in the Social menu now uses the correct scale.
  - Fixed Mickey saying “Hello again, (title)” during the first meeting.

- **Expanded recipes**

  - Gwylan can teach **Wolfbrew** and **Ghostbrew** through a 15-minute shop interaction after relationship stage 1.
  - Both brews can also be learned from the cookbook after easier recipes.
  - Wolfshrooms and Ghostshrooms can replace normal mushrooms using the existing ingredient controls.
  - Added substitutions for fish, cloudberries, mushrooms, and Water Dragon eggs.
  - Wolfbrew and Ghostbrew cannot be given as NPC gifts or donated to the soup kitchen.

- **Updated audio**
  - Added unique music for Poppy instead of using the Sea background track.
  - Added ambient weather audio for rain, thunder, and similar conditions.
  - Ambient audio is muffled indoors.
  - Setting the ambience volume to 0 disables it.

## Tweaks and Rebalancing

- **Improved clothing-slot migration**

  - Clothes moved between slots are now converted on every type of load before other clothing systems run.
  - Coats and bags are found wherever they are stored: worn, carried, in any wardrobe, left somewhere, confiscated by Bailey, or saved in an outfit.
  - This fixes the previous jacket/vest conversion only checking the orphanage wardrobe.
  - Existing coats or bags already lost in an older version cannot be recovered; use a save from before the affected update if available.
  - Bags can once again be destroyed by scenes.
  - Bags no longer create tan lines.

- **Updated Bailey rent collection**

  - Bailey now uses the player's **rent deposit first**, then **savings**, then **cash** when collecting rent in person.
  - This applies at the orphanage, temple, farm cottage, Poppy's flat, and on the street.
  - If the deposit fully covers rent, Bailey takes it and leaves without showing a payment prompt.
  - Offering yourself as payment also uses the rent deposit first.
  - Payment checks now include the brat tax when determining affordability.

- **Updated Avery's saved pill route**

  - Avery no longer automatically becomes angry simply because the player returns home unpilled.
  - After saving Avery, returning unpilled now follows Avery's normal Rage instead.
  - At low Rage, Avery gives a warning and gains only a small amount of Rage.
  - Repeatedly returning unpilled can still eventually trigger the chase once Rage is high enough.

- **Updated Premium X-Change pills**

  - Added **Beta (second womb)** to the Premium side-effect list beside Alpha.
  - Beta can now be selected directly instead of being limited to random spikes or cheats.
  - Choosing Beta alongside **Make body female** or **Make body herm** now correctly grants Beta when starting from a male body.
  - Premium pills now allow effect-only choices during pregnancy or parasite broods while body swaps remain blocked.
  - Effect-only Gray pills remain usable.
  - Gray pills with the optional sex-swap setting still obey pregnancy restrictions.
  - Effect-only sessions grant +340 Beauty without stacking, including Premium pills.

- **Updated Autism stimming**

  - Removed misplaced Stim links from Gameplay Settings passages.
  - Affected areas include Asylum, Eden Cabin, Wolf Cave, Livestock, Pirate, Prison, Temple, Water Dragon Lab, and Nest.
  - Added Stim spots to the **Meadow** and **Coast**.
  - Meadow and Coast count as quiet/private places, so stimming there gives full Load relief.
  - If another NPC is actually present, the reduced social version is used instead.

- **Updated skill-status tooltips**

  - Skill-status tooltips have been revised to make their meaning clearer.

- **Added advanced blusher option**
  - Added **Skip desaturate filter** to the advanced blusher colour-picker panel under **Waterproof**.
  - Reverted the previous blusher layering tweak.

## Fixes and Improvements

- **Fixed Kylar pronouns**

- **Fixed ear-slime orgasm handling**

  - Breeder/Omega denial no longer accidentally triggers the Ear Slime orgasm reward.
  - Ear Slime now has its own marker.
  - Only an actual Ear Slime ruined orgasm gives the Ear Slime text, -1 Trauma, and +1 Corruption.

- **Fixed escape digging**

  - Digging out of the farm, wolf cave, and underground cell no longer becomes excessively slow when injured or exhausted.
  - Poor condition can reduce digging speed only to half speed at worst.
  - Miniature bodies can correctly squeeze out of the farm barn and underground cell.
  - Farm field and barn scenes now recognise completed escape tunnels.
  - The wolf cave no longer announces the exit before the tunnel is actually finished.
  - The underground cell no longer allows escape before enough digging has been completed.

- **Fixed Whitney's park-public-sex ending**

  - The untie line now appears only when the player's arms are actually bound.

- **Fixed hair dye**

  - Hairdresser dye colours no longer all display as the same red swatch.
  - Dye selection no longer assigns invalid hair colours that can cause `canvasfilter` errors in the mirror.
  - Saves with broken hair colours are repaired on load.

- **Fixed Sirris's parasite chastity removal**

- **Fixed Robin's drink stand**

- **Fixed class hallway events always appearing late**

- **Fixed baby descriptions**

  - Corrected parentage flags.
  - Fixed Great Hawk paternity checks.
  - Generated NPC descriptions are now preserved after birth.
  - Existing children recover parentage information from saved records when viewed.
  - If an old save already lost the mother's description, it now displays **A stranger** instead of `pregnancy_#`.

- **Fixed BGM recovery**

  - BGM no longer remains permanently silent after interrupted or failed playback.
  - Audio retries on the next update without restarting music that is already playing.

- **Renamed Refrigenerator to Refrigerator**

- **Fixed Ivory Wraith possession**

  - Wraith possession now initialises Resistance correctly.
  - Affected saves are repaired on load.

- **Fixed Gwylan's clothing requests**

  - Gwylan now avoids clothing blocked by hypnosis settings.
  - Existing impossible requests can be exchanged for ingredients.
  - Hypnotic Crossdressing now follows the current setting correctly.
  - Fixed related wardrobe and shop checks.

- **Fixed Tentacle encounters**

  - Wraith marks can now correctly reduce encounters to one tentacle.
  - Sea Vore checks whether the right arm is available before restraining it and updates narration accordingly.

- **Fixed prison jumpsuit initialisation**
  - The prison jumpsuit now initialises correctly when entering prison.

## Art and Graphics

- **Added vanilla Modded Face 11** by **snowy**.

- **Added vanilla Modded Face 12** by **noufi**.
