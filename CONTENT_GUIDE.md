# DoL:X-Change Edition Player Guide

Use this guide when you want to know what a system does, what choices it opens, and what can go wrong. It focuses on current player-facing behaviour: pills, identity, routes, danger, money, settings, and the mechanics that change how you play. **Updated based on vanilla 0.5.11.7, DoLP v0.757, RBE 0.5.3, DoLX 0.20.13a**

> **⚠️ Spoiler warning:** this guide explains mechanics, route triggers, event conditions, and some scene outcomes. Stop before a section if you would rather discover it naturally.

---

## Contents

1. [X-Change Pill Catalogue](#1-x-change-pill-catalogue)
   - 1.1 [Pink & Blue Variants](#11-pink--blue-variants)
   - 1.2 [Premium Pill](#12-premium-pill)
   - 1.3 [Single-Variant & Special Pills](#13-single-variant--special-pills)
   - 1.4 [NPC-Exclusive, Black-Market & Restricted Pills](#14-npc-exclusive-black-market--restricted-pills)
   - 1.5 [Pill Stacking, Spiking & Combat Pilling](#15-pill-stacking-spiking--combat-pilling)
   - 1.6 [Pill Permanence](#16-pill-permanence)
   - 1.7 [Pill Visibility, Timers & Settings](#17-pill-visibility-timers--settings)
   - 1.8 [Anti X-Change Therapy](#18-anti-x-change-therapy)
2. [Identity System](#2-identity-system)
   - 2.1 [Sex Swap vs. Identity vs. Presentation](#21-sex-swap-vs-identity-vs-presentation)
   - 2.2 [Transgender Trait](#22-transgender-trait)
   - 2.3 [Acceptance, Rejection & Dysphoria Traits](#23-acceptance-rejection--dysphoria-traits)
   - 2.4 [Other Sources of Dysphoria & Euphoria](#24-other-sources-of-dysphoria--euphoria)
   - 2.5 [Identity Meter](#25-identity-meter)
   - 2.6 [Non-Binary & Neutral Pronouns](#26-non-binary--neutral-pronouns)
   - 2.7 [Expanded Gender Identity Preferences](#27-expanded-gender-identity-preferences)
3. [Sensitivity, Arousal & Body Mechanics](#3-sensitivity-arousal--body-mechanics)
   - 3.1 [Sensitivity](#31-sensitivity)
   - 3.2 [Arousal & Pleasure](#32-arousal--pleasure)
   - 3.3 [Orgasm Behaviour](#33-orgasm-behaviour)
   - 3.4 [Cock Addict & Hole Addict Traits](#34-cock-addict--hole-addict-traits)
   - 3.5 [Bullet Vibe](#35-bullet-vibe)
   - 3.6 [Fingernails, Claws & Scratch](#36-fingernails-claws--scratch)
   - 3.7 [Fluids, Cleanup & Arousal Control](#37-fluids-cleanup--arousal-control)
   - 3.8 [Attitudes, Speech & Traits](#38-attitudes-speech--traits)
   - 3.9 [Penetration Pain & Substance Rebalance](#39-penetration-pain--substance-rebalance)
   - 3.10 [Tentacle & Beast Encounter Mechanics](#310-tentacle--beast-encounter-mechanics)
4. [Seduction, Beauty, Alcohol & Aphrodisiacs](#4-seduction-beauty-alcohol--aphrodisiacs)
   - 4.1 [Seduction & Beauty](#41-seduction--beauty)
   - 4.2 [VIP Beauty Spa, Makeup & Cosmetics](#42-vip-beauty-spa-makeup--cosmetics)
   - 4.3 [Alcohol](#43-alcohol)
   - 4.4 [Drunkenness Tolerance Trait](#44-drunkenness-tolerance-trait)
   - 4.5 [Aphrodisiacs](#45-aphrodisiacs)
5. [Audio System](#5-audio-system)
6. [Allure, Danger & Reputation](#6-allure-danger--reputation)
7. [Fame & Piller Identity](#7-fame--piller-identity)
8. [Willpower System](#8-willpower-system)
   - 8.1 [Core Terms](#81-core-terms)
   - 8.2 [How It Works](#82-how-it-works)
   - 8.3 [Actions That Spend Willpower](#83-actions-that-spend-willpower)
   - 8.4 [Actions That Restore Willpower](#84-actions-that-restore-willpower)
   - 8.5 [Willpower Modifiers](#85-willpower-modifiers)
   - 8.6 [Extra Combat & Progression Notes](#86-extra-combat--progression-notes)
   - 8.7 [Advanced Combat Rebalance](#87-advanced-combat-rebalance)
9. [The Gentleman's Club (Blackmail Quests)](#9-the-gentlemans-club-blackmail-quests)
   - 9.1 [How to Begin](#91-how-to-begin)
   - 9.2 [Journal, Payment & Diversion](#92-journal-payment--diversion)
   - 9.3 [Quest Tiers](#93-quest-tiers)
   - 9.4 [Low Tier Quests](#94-low-tier-quests)
   - 9.5 [Mid Tier Quests](#95-mid-tier-quests)
   - 9.6 [High Tier Quests](#96-high-tier-quests)
10. [Danger, Police & Prison](#10-danger-police--prison)
    - 10.1 [Danger Gradient](#101-danger-gradient)
    - 10.2 [Police Harassment](#102-police-harassment)
    - 10.3 [Mailbox Theft](#103-mailbox-theft)
11. [Economy: HBSC Bank & Bank Heist](#11-economy-hbsc-bank--bank-heist)
    - 11.1 [HBSC Accounts, Interest & Standing Orders](#111-hbsc-accounts-interest--standing-orders)
    - 11.2 [Bank Heist](#112-bank-heist)
    - 11.3 [Inflation, Bailey Pressure & Loans](#113-inflation-bailey-pressure--loans)
    - 11.4 [Harvest Street Factory](#114-harvest-street-factory)
12. [Gambling, Pub & Horse Racing](#12-gambling-pub--horse-racing)
    - 12.1 [Pub Gambling and Dice](#121-pub-gambling-and-dice)
    - 12.2 [Farm Racecourse and Horse Betting](#122-farm-racecourse-and-horse-betting)
13. [Named NPC & Route Content](#13-named-npc--route-content)
14. [Events, Locations & Farming](#14-events-locations--farming)
15. [Settings, Options & Cheat Menu](#15-settings-options--cheat-menu)
16. [Chastity Devices](#16-chastity-devices)
17. [Brothel, Strip Club & Dance Classes](#17-brothel-strip-club--dance-classes)
18. [Feat Boost Shop](#18-feat-boost-shop)

---

## 1. X-Change Pill Catalogue

X-Change pills change sex traits, genitals, fertility, arousal pressure, social routing, and sometimes body presentation. They do **not** decide your character's identity by themselves. Identity has its own system, and a character can still be a girl with a penis, a boy with a vagina, or a herm character with both genital sets if your settings allow it.

Most pills still come in **Pink** and **Blue** variants.

- **Pink** pushes the body toward female sex characteristics.
- **Blue** pushes the body toward male sex characteristics.

The important thing is not only the direction. Check the timer, pregnancy risk, orgasm rules, arousal pressure, and permanence conditions before you swallow anything. A short pill can still become dangerous if it stacks with pleasure, spiking, pregnancy, ear slime, or route content.

### 1.1 Pink & Blue Variants

#### X-Change™️ Basic

**A simple temporary sex change.** It lasts no more than a day per pill and is the cleanest way to try X-Change content without committing to a long route.

- No ordinary pregnancy risk.
- Good for short experiments, disguise-style play, or seeing how scenes react to a changed body.
- The main risk comes from what happens while changed: exposure, fame, encounters, or extra pills.
- The pharmacy now sells Basic pills in **bulk packs**: 5 packs for **£500**, or 10 for **£1,000**. Bulk buying no longer shows a misleading "cannot afford" message when you actually have enough money.

#### X-Change™️ NOW & Weekly

**Basic, but with a different timer.** NOW is the short burst version. Weekly is the longer version.

- Use **NOW** when you only want a brief window.
- Use **Weekly** when you want Basic-style effects to cover several days.
- Neither one is complicated by itself, but a longer timer gives the world more chances to notice you.

#### X-Change™️ Xtra Strength

**A 30-day transformation with pregnancy risk.** This is where temporary starts feeling like a whole route.

- The body stays changed for a month from one pill.
- Pregnancy can happen while the effect is active, though the chance is lower than normal.
- If pregnancy happens, the transformation may become permanent.
- Use it only when you are comfortable playing a long stretch in the changed body.

#### X-Change™️ Continue

**Starts at three days, then orgasms extend it.** Continue is dangerous because the timer can snowball.

- Each orgasm adds **16 hours** to the remaining duration.
- If the timer reaches **30 days**, the change becomes permanent.
- A few bad encounters can turn a medium timer into a long one.
- Best treated as a pleasure-management challenge, not just a three-day pill.
- An optional setting can cap how far Continue is allowed to stack, so the timer stops snowballing past a limit you choose instead of climbing indefinitely.
- Continue can now be safely stripped back out of a transformation that has already turned permanent (through pregnancy, the 30-day timer, or another permanence source) without undoing that permanence. This lets you remove the ongoing orgasm-tracking pressure while keeping the body state you already locked in.
- Continue and Resistance can both now be taken and topped up during **any** active X-Change session, not only from an untransformed body, making them usable as an ongoing safety net rather than a one-time starting choice.

#### X-Change™️ Resistance

**Short timer, rising permanence risk.** Resistance looks manageable until climax starts stacking consequences.

- Lasts no more than a day per pill at first.
- Each climax makes permanence more likely.
- The current orgasm count appears in the stats display while the effect is active.
- The whole point is resisting pleasure. Failing repeatedly is the danger.
- Resistance (and Continue) can now be used during any active X-Change session, so you can dose either one mid-transformation instead of only at the very start.

#### X-Change™️ Sissy / Butch

**A halfway transformation with presentation pressure.** It changes the body without doing a clean full swap.

- Gives traits associated with the opposite sex while stopping short of a full genital transition.
- Pushes the character toward opposite-sex clothing or presentation urges.
- Can bring fatigue, stress, and body-mismatch pressure.
- May change voiceover gender if posture remains neutral.
- Good for players who want identity and presentation friction, not a simple before/after swap.

#### X-Change™️ Antidote

**The emergency exit.** It cuts down the duration of an active pill, especially shorter ones, but it hurts.

- Expensive.
- Causes heavy pain and stress.
- Can leave temporary sensitivity, soreness, itching, or anti-pill side effects.
- New games start with one free Antidote in the cabinet, giving you a fallback for early trouble.

### 1.2 Premium Pill

**The controlled option.** The Premium Pill gives you a transformation menu instead of forcing one fixed result.

It can let you choose or adjust:

- genitals and sex characteristics
- gender presentation
- selected X-Change effects
- a herm body with both genital sets, if your settings allow herm outcomes
- whether the change flips sex/genitals, keeps them, or uses another available outcome

Use this when you want X-Change content without relying on random spike pools or fixed pharmacy pills.

**Known access points:**

- Briar can give you a free Premium Pill if you are not already X-Changed or pregnant.
- City danger content can also involve the Premium Pill.
- A free pill is not automatically consequence-free. Treat it as a tempting offer, not pure charity.

**Briar Premium Pill danger note:** Briar's free Premium Pill is tempting because it gives control over the transformation, but the route around it can become dangerous if you follow the wrong opportunity or let the situation escalate.

- The danger branch can lead to the player being kidnapped and forced into an enslaved/captive sequence.
- During that route, the problem is not just the pill. The player can lose freedom, be trapped in torment, and be kept under someone else's control until an unexpected rescuer eventually intervenes.
- Take the warning seriously if you want to avoid forced-captivity content, heavy danger, or long route consequences.
- Or, if you deliberately want to see what happens, treat Briar's offer as one of the clearer doors into that kind of event chain.
  > Be careful with “free” Premium access. It can be a shortcut to body control, but it can also be bait for a much worse situation.

### 1.3 Single-Variant & Special Pills

#### X-Change™️ Breeder

**Pink-only fertility danger.** Breeder is built around heat, creampies, pregnancy pressure, and long-term consequences.

- Changes the body for a full week.
- Sends the character into heat.
- Gives very high fertility, close to guaranteed pregnancy in the strongest documented cases.
- Enhances creampie orgasms.
- Gives stress resistance while semen is in the womb.
- Blocks orgasm unless there is semen in the vagina.
- Edging at maximum arousal causes worse stress hits until the character receives a creampie. This denial penalty is now spaced out into gentler, less frequently chained stress hits instead of repeatedly stacking penalties turn after turn, and the denial reduces pleasure rather than just adding stress.
- Raises minimum arousal over time and stacks with aphrodisiacs such as Passion.
- Permanent heat can also be enabled directly through settings if you want that state without relying on the pill.
- Strange flower / phallus plant nectar can count as vaginal creampie progress.
- The tooltip now spells out that the full breeder behaviour (heat, creampie pleasure, orgasm gating) only actually works while the player currently has both a womb and a vagina. Without those parts, some of the effect has nothing to attach to.

> Breeder is one of the worst choices if you want to avoid pregnancy, permanence, or route-locking consequences — unless you deliberately soften it with the Breeder and Fertility settings below.

#### Breeder & Fertility Settings

X-Change Settings now includes a dedicated **Breeder Settings** and **Fertility Settings** block that lets you decide how much of Breeder's danger you actually want.

- **Fake breeder (infertile)** — when enabled, Breeder pills still give the full behavioural effect (cravings, creampie-focused pleasure, stress relief from a full womb) but the pill can no longer make the player fertile or cause pregnancy by itself. Fake Breeder stays infertile without disabling Omega, so you can still keep Omega's anal-pregnancy path active while Breeder itself is defanged.
- **Always fertile while X-Changed** — a standing toggle that keeps the player fertile for the duration of any X-Change effect, independent of Fake Breeder.
- **Fertility strength (%)** — a slider controlling how reliably the Fertility and Hyper Fertility courses actually cause conception, letting you dial pregnancy odds up or down instead of only getting the fixed documented rates.
- **Priority order:** Always Fertile and Hyper Fertility effects take priority over Fake Breeder. In other words, Fake Breeder cannot quietly override a stronger fertility effect you deliberately turned on.
- **Orgasm without creampie** — replaces the old, non-functional "creampie-only orgasms" toggle. When enabled, Breeder and Omega pills no longer block orgasm just because there is no cum inside the player yet. Creampie-specific pleasure and stress relief still require an actual creampie; this setting only stops the orgasm-blocking side of the effect.
- All of these options, including the newer Alpha/Omega-adjacent fertility settings, are included in Settings Export/Import.

> Use this block if you like Breeder's cravings and creampie-focused pleasure but want to control how much pregnancy risk and orgasm-denial you actually sign up for.

#### X-Change™️ Bull

**Blue-only virility pressure.** Bull is the masculine counterpart to Breeder, focused on rut, arousal, and impregnation risk.

- Can appear through spikes and pharmacy access depending on setup.
- Raises minimum arousal over time.
- Stacks with aphrodisiacs and other minimum-arousal sources.
- Strengthens rut when rut is already active.
- Can interact with pilled pregnancy and impregnation settings.
- Permanent rut can be enabled directly through settings if you want it without waiting for a pill.
- Breeder and Bull can both appear in the spike pool while Herm is active, regardless of starting sex.

#### X-Change™️ Hyper Fertility

**An extreme fertility pill line.** Hyper Fertility is for players who want pregnancy and impregnation pressure turned up far beyond normal X-Change risk.

- **Pink Hyper Fertility** turns the player female and makes conception almost certain after unprotected insemination.
- **Blue Hyper Fertility** turns the player male and greatly increases the chance that insemination succeeds.
- It also heavily raises multiple-birth odds: **twins 80%**, **triplets 50%**, and **quadruplets 30%**.
- It can appear in pill spikes if you enable it in the spike pool.
- Settings include spike-pool support, a frequency slider, and cheat toggle support.
- New feats support multiple-birth outcomes, including **Life Comes in Pairs** for twins and **Fours** for quadruplets.

> Hyper Fertility is not a casual fertility boost. Use it when you want pregnancy outcomes to become much more likely and much harder to ignore.

#### X-Change™️ X-Tend

**A restraint challenge for male-born PCs.** X-Tend can increase penis size, but only if you play carefully.

- Growth can happen after being creampied by someone larger than your current projected size.
- Each valid creampie gives a random increase, roughly **0.5–1 cm**.
- If you orgasm during the effect, you can lose progress or even shrink instead.
- You receive an **X-Tend Cancel** pill when you first take it, letting you end the attempt early after a failed run.
- The Traits screen tracks cumulative X-Tend size changes.
- A setting can show exact measurements instead of vague size feedback.

> Good for players who want a risk/reward reason to seek specific partners while avoiding orgasm.

#### X-Change™️ Dumb Bitch

**A restricted decline effect.** This is not a normal safe pharmacy purchase.

- Drains grades first.
- Then drains skulduggery.
- Then drains willpower.
- Later increases sex stats and can apply hypnosis traits.
- Can add the same sore / itchy sensitivity layer as anti-pill effects.
- If disabled in settings, it stays out of random spike pools.

> Treat it as special-route or restricted content unless your build clearly presents it as something else.

#### X-Change™️ Herm

**Both-genitals support tied to the purple-pill line.** Herm content lets the changed body have both genital sets when your settings allow it.

- X-Change settings can allow herm outcomes for transformed bodies.
- The Premium Pill can choose a herm body directly if herm outcomes are enabled.
- Breeder and Bull can appear while Herm is active.
- Fertility, menstruation, fame, and explicit scene routing check the current body more carefully.
- Explicit herm-body scenes should require the character to currently have both genitals.
- Rumours and social mockery can still linger after the body changes back, so reputation may outlast the anatomy.
- Purple pills can now be used on NPCs in supported combat-pilling scenes, including some named-NPC support.
- Pilled NPCs keep their identity and presentation, but their body can gain the missing genital set while the effect lasts.
- Some older systems still treat herm support as a special case rather than a full base sex/gender.

#### X-Change™️ CumCure

**A risky cure-through-creampie effect.** CumCure reduces the remaining duration of your active X-Change transformation when cum is deposited inside you.

- Each valid internal cum deposit cuts down the current X-Change timer.
- It is not a clean Antidote replacement. You still have to deal with the danger, exposure, pregnancy risk, and encounter consequences involved.
- Works best as a high-risk escape route for players who want the transformation timer reduced through messy gameplay rather than medicine.
- The pill does not make the situation safe just because it helps shorten the effect.
- If you are already in dangerous content, CumCure can help with the timer while still leaving you vulnerable to everything else happening around you.

> Treat it as a dangerous cure route, not a free way out.

#### X-Change™️ Innocence

**A vulnerability pill that wipes sexual knowledge.** Innocence temporarily strips your character of their understanding of sex, making dangerous situations harder to recognise.

- Your character may not properly understand what is being implied, offered, or done to them.
- This can make risky scenes feel more confusing from the character's point of view.
- Can support Resistance whoring gates alongside alcohol and hallucinogens.
- The danger is not only the stat or route check. The real risk is that your character may fail to recognise sexual danger until it is already happening.
- Works well for players who want a helpless, unaware, or naïve temporary state without making it a permanent personality change.
- An innocent character can now panic specifically when losing their handholding virginity, a small but distinct reaction separate from the general "too naive to notice" behaviour.
- Wearing gloves now prevents losing handholding virginity at all, which matters if you are deliberately trying to preserve it while Innocence is active.

> Treat it as a danger-amplifying pill. It changes how prepared your character is, not just what options unlock.

#### X-Change™️ Swell

**A temporary body-exaggeration pill.** Swell pushes the body further in one of two directions, depending on which path the effect began on.

- The curves path pushes the body toward a fuller, curvier feminine shape.
- The penis path pushes the body toward a larger, more hung masculine shape.
- The pill remembers which version it started as, so later body feedback should match the correct route.

> Treat it as a short-term body emphasis pill. It is more focused than Basic, but less route-heavy than the stronger transformation pills.

#### X-Change™️ Bimbo

**A temporary dumb-and-lewd state with body swelling.** Bimbo lowers intelligence and raises lewdness while also applying a temporary Swell-like effect.

- Reduces intelligence while the effect is active.
- Increases lewdness, making the character feel more sexually suggestible.
- Comes with a temporary Swell-style body effect until the pill wears off.
- Similar in theme to Dumb Bitch, but Bimbo behaves more like a temporary pill state rather than a restricted decline route.
- Because the English penalty can be harsh, many speech actions use your stored pre-Bimbo English level instead.
- This prevents the temporary English drop from making every spoken action useless.
- Supported speech includes actions such as pleading, moaning, demanding, mocking, teasing, apologising, asking to be choked, asking for rough treatment, and similar encounter speech.

> Treat it as a temporary bimbo-state pill: lewder, dumber, more physically exaggerated, but not the same long-form decline as Dumb Bitch.

#### X-Change™️ Clone: Whitney

**A named-NPC clone pill.** It lets you play some content while pilled as _Whitney_.

- Adds variations to some school events.
- Lets you rob students in the canteen for lunch money while pilled as Whitney.
- Treat it as route-flavour content rather than a general transformation pill.

#### X-Change™️ Portal

**A pill tied to remote penetration.** Portal pairs the pill with a high-tech onahole.

- Can work as its own pill.
- Can attach to another active pill and hijack that transformation for the user's pleasure.
- Uses a separate timer from the pill it hijacks.
- Lets remote penetration bypass ordinary defence.
- Can be toggled in settings, and its frequency can be adjusted.
- A shady pockethole dealer in the industrial alleyways can offer related content at night.

#### X-Change™️ Passion

**A steady aphrodisiac pressure.** Passion makes arousal management harder for as long as it runs.

- Releases aphrodisiacs into the bloodstream over time.
- Raises pleasure and arousal pressure.
- Becomes dangerous when combined with low willpower, Continue, Resistance, Breeder, Bull, or repeated encounters.
- The aphrodisiac pulses come as larger random doses, roughly around an eight-hour rhythm.

#### X-Change™️ Choice

**An exclusive lock-in pill.** Choice acts permanent until you get the matching Choice Reversal.

- Has no special malus by itself.
- Stays active until the reversal pill is taken.

#### X-Change™️ Alpha & Omega

**Advanced effect pills for penetration and pregnancy mechanics.** Alpha and Omega can appear as gray effect-only pills, coloured body-swap pills, or combined purple/herm variants.

- **Omega** enables anal pregnancy compatibility while active. It also makes anal insemination more pleasurable and can reduce stress while sperm remains in the anus.
- Omega works on any current body. Pink Omega, Blue Omega, Purple Omega, and Purple Alpha-Omega apply the same core Omega agent through different body routes.
- **Omega pregnancy now actually works.** Omega can conceive through the anus and carry a real human baby to term, including with the Hyper Fertility pill, instead of the pregnancy only ever resolving into slimes. A visible growing belly now appears for Omega pregnancies, matching ordinary vaginal pregnancy presentation.
- **Omega characters who also have a vagina can conceive through either hole.** Whichever hole actually receives the sperm is the one that takes the pregnancy; once one pregnancy sticks, the other hole is blocked until it resolves. Omega can only carry one pregnancy at a time, and the status/pregnancy screen correctly shows vaginal pregnancy when that is the hole that took. No-vagina Omega characters no longer get the vanilla "your period is late" notice — they instead notice through their growing belly.
- **Alpha** gives the player a knotted penis in encounter views and makes orgasm demand that the cock be inside someone or something. The knot visibly swells as orgasm approaches, then stays locked in place for the rest of the encounter, with matching short close-in movement, reactions, orgasm text, and x-ray art during vaginal and anal sex.
- Alpha requires a penis. Blue Alpha, Purple Alpha, and Purple Alpha-Omega can provide the body/genitals needed for the effect, while gray Alpha requires the current body to have a penis.
- **Alpha combined with Breeder or Omega:** while the player's penis is still usable, Alpha's dominant "knot needs to be inside someone" urge now takes priority over Breeder/Omega's receptive pull. Forceful heat will no longer override you into a receptive role in this situation — you stay the one doing the penetrating until your own anatomy stops allowing it.
- Pregnancy can still make an active X-Change transformation permanent. This matters for Omega because anal pregnancy can now be the permanence trigger.
- Alpha and Omega have matching anti-pills and can also exist as gray pills for players who want the effect without a full colour swap.
- Omega has a body-style setting: it can use the full sex-flip route or a Sissy-style shrinking route for Pink Omega.
- NPCs do not randomly roll Alpha or Omega from NPC pilling pools. These are player-focused mechanics.
- Non-consensual Alpha/Omega spiking is controlled separately under **X-Change Settings > Spiking Preferences**. Both are disabled by default. Omega can roll on any body when enabled; Alpha only rolls when the player has a penis.
- Alpha/Omega spiking settings are included in Settings Export/Import.
- **Hyper Fertility and the Bull pill** now make it much more likely for the player to successfully impregnate partners whenever the player has a functional penis, correcting an old case where the boosted odds weren't actually being applied.

#### Gray X-Change Pills

**Effect-only colourless capsules.** Gray pills carry one X-Change effect while stripping out the usual forced pink or blue body swap.

- If you are already X-Changed, a gray pill can stack its effect onto the current session.
- If you are not already X-Changed, a gray pill normally affects your current body without changing your sex.
- A setting can make gray pills also flip your sex when taken from an untransformed state.
- Continue and Resistance gray pills are useful only when a gendered or herm X-Change body is involved, so they are treated as stack-focused pills.
- Anti X-Change therapy neutralises gray pills and prevents them from starting or stacking a new effect while the protection is active.
- Gray Resistance, Continue, and Portal pills no longer vanish from the medicine drawer after you buy them — owned gray pills always remain visible, and when your current body can't use one, the drawer greys it out and explains why instead of hiding it.

Gray pill sources:

- The hospital pharmacy sells gray pills for **£3,000** each.
- The hospital always carries **Resistance**, **Continue**, and **Weekly Extension**.
- Each week, the hospital also carries two random gray pills from **Breeder**, **Bull**, **Omega**, **Alpha**, **Hyper Fertility**, **Fertility**, and **X-Tend**.
- After the bank heist route exposes enough of the pill network, Landry can unlock a full gray-pill catalogue at the pub. The pub option appears about one week after reporting the heist to Landry.
- Landry charges **£6,000** per gray pill and sells only **one per day**, but his stock covers the full registered gray line. Portal remains gated behind Portal content.

### 1.4 NPC-Exclusive, Black-Market & Restricted Pills

Some pills are not regular pharmacy purchases. You can still run into them through spiking, black-market sellers, prison content, dice drinks, combat pilling, theft, or route events.

#### Unknown / Suspicious Pills

**Random pills with fewer guardrails.** The industrial alley seller can offer unknown pills, and suspicious pills can show up through encounter theft.

- They behave as if an NPC spiked you.
- They can roll restricted or NPC-style effects.
- Suspicious Pills ignore your ordinary randomness and spike settings when choosing their own X-Change effect.
- Portal is the exception: the Portal spike toggle still needs to be enabled before Portal can be selected.
- They can reduce skills as part of the risk.
- You may steal suspicious pills instead of cash from NPCs during encounters.
- The pockethole dealer has a daily rate, and Portal deals are tied to the industrial alley.
- Shady dealer rumours can now appear through school hallway gossip.
- Once heard, the rumour tells you where the shady dealers can be found that week, and the current weekly location is recorded in the journal.
- The Anti-Pill Dealer may appear each week. When present, stock changes daily.
- Anti-pill dealer access uses a flat **D-rank skulduggery** check.
- The shady remover dealer can sell SWP Anti-pills, which act like a normal Antidote for X-Change effects.
- The shady dealer now rolls suspicious pills based on the player's **original** body rather than their current X-Changed body, so being pilled no longer skews what the dealer is willing to sell you.
- The shady dealer's school hallway gossip about their location, and the separate X-Tend rumour, now only surface on a weekly cadence instead of constantly, so expect to hear about their current spot roughly once a week rather than every time the topic could come up.
- You can no longer approach or interact with the shady dealer while completely naked.

#### Mysterious Person / Silver Stranger

**A late X-Change merchant with a broad stock list.** This route appears after the player reaches certain X-Change milestones.

- The first meeting can happen while loitering in the park during the day.
- After the first meeting, the merchant waits near the docks instead.
- They may appear if Mickey's earpiece survives the bank-heist route, if the police seize it, or if the player reaches very high X-Change fame.
- Their appearance is chance-based and checked by day, so do not expect them to be present every time.
- They sell a full range at markup: normal X-Change pills, premium pills, antidotes, tests, suspicious unlabelled pills, and related stock.
- Stock is effectively unlimited compared with ordinary daily shop limits.
- On generous days, they may give a free pill, but this is limited and should be treated as a bonus rather than a route plan.
- After finishing the heist with Landry, they can answer one-time questions about Mickey, themselves, their interest, and their level of involvement. Answers can vary depending on route context such as the gala, premium pill, or blackmail branches.

The Silver Stranger is also registered as a proper NPC once their content brings them into view, but they remain deliberately hidden at first.

### 1.5 Pill Stacking, Spiking & Combat Pilling

**Pills can layer.** That is what makes spiking and combat pilling dangerous.

- Consecutive spikes can stack an extra effect on your current pill.
- Ordinary layering adds one extra effect at a time.
- Dice minigame drinks can layer multiple spike effects if you are already pilled.
- NPCs can attempt to pill you during encounters.
- Combat pilling does not require standing fights.
- NPCs can fail pill attempts, and settings can prevent combat pills while you are already pilled.
- School hallway spiking can happen once X-Change fame reaches **800**, and it is limited to once per week.
- NPC pill attempts may damage or destroy facegear.
- Being spiked can now increase X-Change fame, so repeated public pill incidents can feed back into fame-gated X-Change routes.
- You can pill NPCs during combat with supported pills: Basic-style pills, Continue, Resistance, and purple/herm variants where the scene allows them. Xtra Strength is excluded from the NPC-pilling pool because of its fertility effect, and Alpha/Omega are player-only effects.
- Whitney, Kylar, Robin, and Sydney have extra pilling support and conditions instead of behaving exactly like generic NPCs.
- Spike pool and frequency settings let you decide which effects appear and how often.
- Suspicious-pill side effects can be toggled. When enabled, random spike sources share the same side-effect layer instead of being clean effect-only spikes.
- The **Pilled NPCs also change gender** setting controls how far NPC pilling goes. When enabled, body and gender change together. When disabled, a pill can change an NPC's body, sex, or genitals while preserving their pronouns and described gender.
- Pilled crossdresser NPCs keep their presented gender.
- Named NPCs revert to their original identity when the pill ends, even if you change the setting while the pill is active.
- The Social tab can show an **X-Changed** tag for pilled Named NPCs. Hovering it shows their current body, whether their gender changed, and how long the pill has left.
- The Traits overlay can list the live X-Change status of pilled Named NPCs.

### 1.6 Pill Permanence

**Temporary does not always mean temporary.** Some effects become indefinite even if the original pill had a timer.

**Common causes:**

- **Pregnancy:** X-Change prevents the body from reverting while carrying a baby.
- **Ear slimes:** corruption can interfere with the pill's active component and suspend the body in its changed state.
- **Pill-specific routes:** Continue can become permanent by reaching 30 days, and Resistance can escalate through repeated climax.
- **Choice:** stays indefinite until Choice Reversal is taken.

Your character does not instantly know a timer failed. It can take **24 hours** before they fully realise they did not turn back. If pregnancy causes the indefinite state, the game gives a clearer notice. Once a pill becomes permanent, settings can decide whether fertility rates return to normal.

> **Tip:** Not every X-Change pill has to last forever. Some effects can be controlled in the game settings, where you can choose whether transformations are temporary or permanent. Some pills ignore that setting, so check the pill's own rules before taking it.

Temporary X-Change states have special handling for temple vow and angelic content:

- The temple vow can recognise whether you are in your original body, temporarily pilled, or permanently changed.
- If your X-Change effect is temporary, you may still be able to receive divine forgiveness.
- The vow can break or remain valid depending on your current state.
- The mirror may help recover some failed angelic states, but only if the character still meets the right conditions.

### 1.7 Pill Visibility, Timers & Settings

**Use the UI and settings.** X-Change has enough moving parts that guessing from narration alone can mislead you.

- Pill-generated bodies respect vanilla minimum and maximum body-part size settings.
- Pills remember last hairstyle and chosen body shape when transforming.
- The first pill sex flip can randomise hair, eyes, and skin if enabled.
- First-transformation face changes can be toggled.
- M2F effects may assign the gentle face demeanour on first transformation.
- Body size behaviour can be overridden for pill transformations, and you can choose a new body size when flipped.
- Miniature, tall, and giant body postures have stronger support.
- Known pill effects appear in Traits or stat overlays once your character is aware of them.
- Piller fame appears in extra stats.
- Character descriptions give clearer notices for cases like girl-to-girl or boy-to-boy changes where genitals changed but broad gender labels did not.
- The Resistance orgasm tracker appears in stats while active.
- You can take pills in bathrooms and toilets across the world map.
- Pilled appearance, pregnancy chance while pilled, spike frequency, and spike pool selection all have settings support.
- Owned X-Change pills remain visible in the medicine drawer even when your current body cannot use them.
- The drawer greys out pills your current body cannot take and explains why. Those pills are still useful to keep, sell, or feed to supported NPCs.
- Pill suitability checks use your actual current body and anatomy, not only gender identity. This matters for cuntboy, dickgirl, herm, Sissy, Butch, slow body-change, and pilled states.
- Coloured X-Change pills can be bought and managed from the updated medicine drawer.
- X-Change pill duration can be controlled from the cheat menu, with options for **1 day**, **3 days**, **1 week**, **1 month**, or **permanent** effects.
- X-Change fame appears in cheat/menu tools and can matter for routes such as Mickey tasks.
- Gray pills have a separate setting that decides whether they stay effect-only or also flip your sex when taken without an active X-Change body.
- Settings Export/Import covers more X-Change options, including the newer Alpha/Omega spiking preferences.
- **The X-Change Tester is more informative.** Testing an unidentified pill effect at the pharmacy machine now estimates the remaining pill time in hours, days, or weeks instead of a vaguer readout, and the Traits panel remembers and keeps updating that improved reading until the transformation actually ends.
- **Cycle stage visibility improved.** The menstrual/cycle stage now stays visible while X-Change pills are active as long as you have enough Science or Awareness, even if the pill's own effect is still unidentified. Pregnancy-related pauses read as normal until your character becomes aware they're pregnant; once discovered, the duration switches to "Indefinite" with an explanation instead of a confusing number. Choice-, permanent-, and slime-caused pauses keep their existing display behaviour.

### 1.8 Anti X-Change Therapy

After your character has consumed X-Change at least once, the hospital can unlock an Anti X-Change cleansing treatment route with Doctor Harper.

- First, ask Harper about resisting X-Change pills at the hospital.
- Harper refuses at first. About a week later, Harper can approach you in town and say the treatment has been allowed.
- After that, the hospital offers paid cleansing windows.

Treatment options:

- **1 day:** £10,000
- **1 week:** £50,000
- **1 month:** £150,000

What the treatment does:

- It blocks new X-Change pill effects while the clean window is active.
- Pills and spikes can still be consumed or administered, but the treatment neutralises them before they take hold.
- It prevents gray pills from stacking a new effect during the protected period.
- It does **not** remove an X-Change effect that was already active before the treatment.
- The Traits/status display can show roughly how long protection remains.

Use this if you want a costly but reliable anti-spiking window. Do not treat it as an Antidote replacement.

---

## 2. Identity System

The Identity system controls how your character feels about their body, presentation, pronouns, and sex-linked traits. It is separate from X-Change pills.

**A pill changes the body. Identity decides how your character reacts to that body.**

For example, an X-Change pill might give your character breasts, a penis, a vagina, pregnancy, lactation, or a different body shape. The Identity system then checks whether your character accepts, prefers, dislikes, or rejects those traits. The system can track things such as pronouns, clothing and presentation, genitals, breasts and body shape, pregnancy, lactation, sex-linked traits, and whether your character accepts or rejects those traits.

Identity only checks traits that currently matter or that you selected. Because gendered genitals are supported, the game does not assume body equals identity. Your character can be a girl with a penis, a boy with a vagina, or use herm outcomes if your X-Change settings allow it.

During character creation, you choose which traits your character accepts and does not accept. Once those choices are locked, they usually cannot be freely swapped. The **Transgender** trait gives more flexibility, allowing some identity preferences to be adjusted later.

The Characteristics menu shows your current Gender Identity state. It can include preference, acceptance, rejection, dysphoria, body state, and progress toward identity-based changes. New saves may briefly show a non-gendered or non-binary state before the first daily update. This is normal. The meter should correct itself after the game has properly read your Identity setup.

### 2.1 Sex Swap vs. Identity vs. Presentation

This guide separates **sex swap** from **identity** to avoid confusion.

- **Sex swap / sex flip** refers to the physical X-Change effect: genitals, fertility, sex characteristics, body options, appearance, and other biological traits changed by pills.
- **Identity** refers to how your character relates to traits they currently have, such as whether those traits are preferred, accepted, unaccepted, rejected, euphoric, or dysphoric.
- **Presentation** covers things like clothing style, posture, appearance, and similar social/body-language choices.
- **Gendered genitals** allow combinations such as a girl with a penis or a boy with a vagina. This means identity and current genitals should not be assumed to be the same thing.
- NPC address and some narration can read the **sex consider** and **nude gender appearance** settings, so scenes should not always judge the player by clothing or broad gender presentation alone.

### 2.2 Transgender Trait

The **Transgender** trait makes the Identity system more flexible for trans characters. It lets your character's preferences stay more adjustable than the normal locked-choice setup, while still keeping dysphoria, acceptance, rejection, pronouns, presentation, and body changes relevant.

This trait does not turn Identity off. It simply gives trans characters more room to react to their body and identity without the game treating every choice as fixed too early. Trans characters can still be affected by accepted and unaccepted traits, rejected traits, dysphoria and euphoria, pronouns, clothing and presentation, changing room discomfort, X-Change body changes, and identity-based body adjustment settings.

Permanent X-Change effects can also give trans characters a reflection prompt. This lets your character decide how they feel about the transformation instead of forcing one fixed reaction. These prompts are meant for permanent pill effects, not every short temporary transformation. Each response represents a different emotional reaction and may apply a different effect.

The trait also helps the game read trans characters more correctly during sex-flip content. For example, if a trans girl is physically changed by an X-Change pill, the game should understand the difference between her identity and the temporary body state. This avoids text that treats a sex/genital change as if it automatically changed her gender.

Trans PCs also have dedicated social dialogue now:

- Trans characters can explain their identity to students and to Robin, and can gain recognised access to their preferred changing room as a result.
- Robin, Avery, and school delinquents can each react differently once they've learned the player is trans.
- New pill-related interactions add supportive and dominant reactions around trans characters taking or being given X-Change pills, rather than only neutral/generic text.

Use this trait if you want a character whose relationship with pronouns, sexed traits, presentation, and X-Change changes stays more flexible than the default Identity setup.

### 2.3 Acceptance, Rejection & Dysphoria Traits

Identity traits are tracked separately. Think of each trait as having its own little container. For example, pronouns are not treated as one single identity value. Masculine pronouns, feminine pronouns, and neutral pronouns can each be tracked separately. The same idea can apply to other identity traits, such as genitals, breasts, pregnancy, lactation, clothing style, or body shape.

Each trait can have several states:

- **Preferred** means your character likes this trait and wants it.
- **Accepted** means your character is comfortable with this trait.
- **Unaccepted** means your character is not comfortable with it yet.
- **Rejected** means your character strongly does not want it.
- **Dysphoria** means the trait feels bad right now.
- **Tolerance** means your character is slowly getting used to the trait.

> Acceptance is not always fixed. A trait can become unaccepted again, and an unaccepted trait can later become accepted.

**Example:** if someone calls your character by feminine pronouns, the game checks your character's feminine pronoun state. If feminine pronouns are already accepted, your character is fine with it. If feminine pronouns are preferred, your character may feel better from it. If feminine pronouns are not accepted yet, your character can gain dysphoria. That means being called she/her feels uncomfortable right now. Over time, daily processing can turn that dysphoria into tolerance. If tolerance reaches its limit, the trait becomes accepted. In that case, feminine pronouns stop causing dysphoria because your character has become used to them.

Rejected traits work differently. If your character rejects a trait, they are not simply unused to it. They hate it or strongly resist it.

- Rejected traits increase stress.
- Rejected traits stop dysphoria from naturally fading.
- Rejected traits prevent tolerance from growing while they remain rejected.

This means a rejected trait will not slowly become accepted unless your character stops rejecting it first.

**Dysphoria** represents how much distress a characteristic is currently causing. **Tolerance** represents how much your character has adapted to that characteristic. Every day, half of your dysphoria decays, and your character gains some tolerance toward the relevant trait. **This does not happen if the trait is currently rejected.**

**Acceptance is no longer a slow flat grind.** How your day actually went now changes how fast tolerance builds:

- Calm, congruent days (low dysphoria, little conflict with your identity) build acceptance noticeably faster than before.
- Days full of dysphoria slow acceptance down instead of contributing at the same flat rate.
- The pace itself speeds up the longer you stay settled in a trait, rather than staying constant from day one.
- **Acceptance has memory.** If you return to a body or trait you had already made peace with in the past, you regain that old comfort far faster than a first-time character would, instead of grinding tolerance back up from zero. In practice, a trait you'd previously fully accepted gets a head-start toward acceptance again if it becomes relevant later (for example, reverting to a body type you were once comfortable in).
- Settings continue to describe **Begrudged** more clearly — it marks a trait your character tolerates without truly embracing, distinct from full Acceptance or Rejection.

### 2.4 Other Sources of Dysphoria & Euphoria

Passive hourly effects are not the only way identity can change your character's state. Some actions can also cause dysphoria or euphoria, such as using relevant body parts during encounters.

Other documented identity pressures include:

- Losing genital virginity can trigger a larger identity shift toward the body's current sex.
- Misgendering through pronouns is much harsher in current play, with dysphoria from pronoun misgendering multiplied significantly.
- UI notices can show which dysphoria source or aspect caused the change **inside the Hidden STATS menu**.
- Dysphoria can affect willpower loss and submissiveness gain.
- A breakdown caused by dysphoria can harshly reduce willpower capacity.

> More sources of dysphoria and euphoria may be added in future updates.

### 2.5 Identity Meter

The Identity Meter reflects the character's overall identity direction based on the Identity system. It averages active identity topics through preference, acceptance, rejection, and dysphoria, then drifts toward the current target over time. Topics can include:

- pronouns
- clothing style and appearance
- genitals
- penis and vagina preferences, including combined preference setups
- breast and ass size
- hair length
- pregnancy and lactation
- other identity-related categories

Each active topic pulls the meter in a direction.

- **Preferred** topics pull strongly toward that direction.
- **Accepted** topics pull more lightly.
- **Rejected** topics pull strongly against it.
- **Dysphoria** weakens support and may push the meter back.

Topics that are not active or meaningfully selected generally do not count.

#### Does the current body matter?

Yes, but mostly indirectly, because current traits affect dysphoria, acceptance, rejection, tolerance, and other identity-related gameplay effects. The meter is driven by the Identity system itself, so body and presentation matter through how they interact with that system.

#### When does the meter update?

The meter updates daily. It can change when identity preferences change, acceptance or rejection changes, dysphoria rises or falls, or gameplay shifts the character's identity-related state. The meter does not instantly snap to a new position. It drifts gradually toward the current identity target, reflecting a longer-term state rather than a one-minute mood swing.

#### Auto-Transformation

Auto-Transformation decides whether the Identity system can physically change your character's body.

The Identity meter can still move even when Auto-Transformation is turned off. In that case, the meter only shows where your character's identity is leaning. It does not change the body by itself.

- **Identity active / meter enabled:** the game tracks your character's identity direction.
- **Auto-Transformation off:** the meter is only a status display.
- **Auto-Transformation on:** the body can slowly shift toward the identity direction.

These changes are meant to be gradual. Identity-driven body changes usually take around **one to two in-game months**, not a few hours or days. Possible changes can include penis size shrinking over time, genitals changing or being created, menstruation and sex stats updating after genital changes, breasts or ass growing toward the preferred size, body size shifting through supported sizes (such as miniature, tall, or giant), and face or body presentation moving toward the identity direction.

Auto-Transformation is best treated as a slow background system. Turn it on if you want identity to eventually affect the body. Leave it off if you only want the meter to describe your character's identity state.

See [2.7 Expanded Gender Identity Preferences](#27-expanded-gender-identity-preferences) for the newer body topics Auto-Transformation can target.

#### Can the meter reverse?

Yes. The meter can move back if the character's identity state changes through different preferences, lower dysphoria, reduced rejection, increased acceptance, or gameplay-driven identity shifts. It is not permanently one-way unless your setup keeps pushing it in the same direction.

### 2.6 Non-Binary & Neutral Pronouns

DoLX now supports **neutral player pronouns** as a full pronoun option alongside the masculine and feminine sets.

- Pronoun preferences control how the game refers to the PC, including **he/him**, **she/her**, and **they/them**, with matching grammar and gendered terms throughout the text.
- A non-binary identity can draw on neutral, feminine, or masculine pronouns according to your configured preference, rather than being forced into a single fixed set.
- When you have accepted more than one pronoun set, the game chooses between them dynamically based on your configured mode, current presentation, body, clothing, or posture. Neutral pronouns act as the fallback whenever none of the more specific conditions clearly apply.
- Existing saves migrate their pronoun state safely; you do not need to manually reconfigure pronouns after updating.

> If you want a character who reads differently depending on presentation — for example, they/them by default but she/her while dressed and passing as female — this is the system that makes that possible instead of locking you to one pronoun set for the whole game.

### 2.7 Expanded Gender Identity Preferences

Beyond genitals, breasts, and body size, Auto-Transformation-driven identity preference now covers a wider set of body topics:

- **Height**, **hair length**, **chest**, **ass**, and **genitals** can all gradually move toward your preferred choices when the matching topic is enabled.
- Disabled body topics stay disabled — turning a topic off means Auto-Transformation leaves that part of the body alone, it does not just move slower.
- Existing saves migrate their per-topic preference settings safely, so upgrading does not silently reset choices you already made.
- **Stable dual genitals are now supported without requiring an active X-Change pill.** A character whose identity preference is set to a herm-style body can reach and hold both genital sets through ordinary Auto-Transformation, rather than needing a Premium or Herm pill kept perpetually active just to maintain that state.

> Treat this as the mechanism that lets a character's body drift to match who they are over time, independent of pills — pills are the fast, dramatic route; Auto-Transformation preference is the slow, permanent one.

**Tiny Penis identity option:** the smallest genital-size preference used to be "Small," so a character who was naturally micro/mini/tiny would gradually get grown all the way up to Small by gradual body-change settings, even if they were perfectly happy with their smaller size. **Tiny** now sits below Small as its own selectable preference, so gradual growth stops at Tiny instead of overshooting past it.

---

## 3. Sensitivity, Arousal & Body Mechanics

DoLX makes the body react more strongly to pills, arousal, drugs, orgasm, and physical state than vanilla DoL. Sensitivity is one of the main ways this happens.

### Body Size

Body size now affects more than physique while keeping the existing range from **miniature** to **giant**.

- Only the player, worn clothing, held props, and transformation layers in the sidebar change scale slightly with body size. Backgrounds, weather, followers, and other scene graphics remain fixed. The adjustment is deliberately restrained so custom graphics remain proportionate.
- Larger characters can build more physique and are more imposing when accosted, but are easier to spot while hiding. Giant bodies also suffer a larger dodge penalty in Advanced Combat.
- Smaller characters hide more easily. A small but sufficiently dominant character also gets an intimidation boost, so size is not the only way to make a stalker hesitate.
- Size-specific travel events include miniature, tiny, and small characters struggling against strong wind by the farm gate, and giant characters hitting low doorways in town. Smaller demons also climb through residential windows faster, while giant demons must use a door.
- A **Scale sidebar image to body size** option (under Rendering) keeps sidebar character sprites crisp instead of blurring them when scaled for body size. Body-size sprite scaling was tweaked further afterward and is now **disabled by default** — turn it on yourself if you want sidebar sprites to visibly reflect size, or leave it off to keep sidebar characters at a fixed size with the best rendering performance.

### 3.1 Sensitivity

**Sensitivity** means how strongly your character's body reacts to stimulation. Higher sensitivity means pleasure builds faster. Lower sensitivity means stimulation has less effect.

Known things that can affect sensitivity include:

- **Base sensitivity:** your character's normal starting sensitivity.
- **X-Change pills:** pill effects can change sensitivity while they are active. Pink pills usually increase sensitivity, while Blue pills usually lower it.
- **Purity:** lower purity makes the body more responsive to pleasure.
- **Aphrodisiacs:** drugs can increase how sensitive the body feels.
- **Lubrication:** poor lubrication can make penetration less pleasurable or more uncomfortable, while higher arousal helps vaginal wetness build faster.
- **Orgasm:** the body can become extra sensitive during orgasm.
- **Anti-pill and Dumb Bitch side effects:** these can add sore, itchy, or painful sensitivity for a while.

Sensitivity is one reason X-Change pills feel different from a simple visual transformation. They can change how your character reacts during encounters, not just how they look.

**Sensitivity medication.** The hospital pharmacy sells 14-packs of sensitivity suppressants and stimulants for players who want direct control over this stat instead of only managing it through pills and settings.

- Each dose lasts **16 hours**, and you are limited to **one dose per day**.
- Taking one medication replaces whatever the opposing effect was currently doing — you cannot stack a suppressant and a stimulant at once.
- **Suppressants** reduce effective sensitivity to **0.25**, useful before a scene you expect to be rough or unavoidable.
- **Stimulants** add **3 effective sensitivity**, letting a normally low-sensitivity character experience high-sensitivity effects and reactions.

**Passive rubbing from clothing** is more specific now:

- Pasties, tape, binders, form-fitting leotards, and swim shirts now prevent passive nipple rubbing.
- Skirt-only outfits, one-piece bottoms, and boxers worn by vagina-only characters no longer cause passive genital rubbing.
- Trousers and boxers that contain a penis can still cause rubbing, so a penis-having character isn't fully protected by the same items.

> If passive arousal from clothing has been annoying you, check what you're actually wearing — the above combinations are the ones the game recognises as non-stimulating.

### 3.2 Arousal & Pleasure

Current play split the old arousal behaviour into **arousal** and **pleasure**.

- **Pleasure** is the bar that fills during stimulation. When it fills, the character climaxes.
- **Arousal** affects how much pleasure is gained from stimulation.
- For your character, high arousal can restrict actions because those actions cost willpower to perform.
- Minimum arousal has more sources than before, so some effects can keep the character closer to a dangerous baseline even before active stimulation.

Other documented arousal notes:

- Female PCs get hornier as the day goes on during their most fertile time of the month.
- Breeder and Bull pills can raise minimum arousal over time by themselves.
- Breeder / Bull arousal pressure stacks with aphrodisiacs, such as Passion.
- Permanent heat / rut can now be toggled directly, letting players choose those states instead of only receiving them through pill effects.

**Heat now recognises every pregnancy-capable hole, not just the vagina.** Combat heat previously only checked vaginal penetration, which meant an Omega being bred anally could stay unsatisfied or get repeatedly redirected toward vaginal penetration instead. Now:

- Anal breeding supports the same heat behaviours as vaginal breeding, including leg-locking, condom removal, undressing, and guiding penetration.
- Omegas no longer ask partners to avoid anal sex while in heat, and Omega combat heat can activate even for characters without a vagina.
- Non-Omega Breeder heat still redirects penetration toward the vagina specifically.
- **Forceful heat** got the same anal-aware update: it recognises all pregnancy-capable holes (including Omega's anal route), and a character without a vagina is no longer steered toward vaginal-only actions. Being bred through either eligible hole satisfies the compulsion.
- Chastity belts no longer shut forceful heat off completely. If every eligible hole is locked, the player may instead try to remove concealing clothing, struggle against the device, or gradually damage it; normal forceful-heat behaviour resumes once the belt breaks. There is also specific handling for chastity parasites and for characters whose arms are restrained.
- External (non-internal) semen still cannot cause pregnancy through a locked belt — that is intentionally left out, since external semen isn't a valid conception method in general.

**Resist heat with willpower** is a setting under X-Change Settings: when enabled (the previous default behaviour), a character with enough willpower can resist losing control during heat. When disabled, heat ignores willpower checks entirely and takes control whenever its normal trigger conditions are met, for players who want heat to feel less resistible.

### 3.3 Orgasm Behaviour

DoLX changes how orgasm pressure can build during encounters.

- Aphrodisiacs can passively raise arousal up to a threshold.
- High arousal drains willpower over time.
- Orgasms spend willpower at once, but can restore willpower after an encounter ends.
- After initial climax, arousal can decrease in stages while the character is convulsing rather than dropping all at once.
- If stimulation continues faster than the body can calm down, your character may be pushed into repeated or nonstop orgasms.
- Male PCs need a short recovery period after orgasm before they can cum again.
- Ear slime orgasm denial now checks willpower before deciding the result. On success, the player pushes through and climaxes normally; on failure, or if the willpower system is disabled, the ruined-orgasm path proceeds.
- During orgasm, the PC's body can be extra sensitive.
- **Limit group encounters to one shared orgasm** is a setting that stops one multi-orgasmic NPC from making an entire group climax over and over in the same encounter, while still preserving multi-orgasms in solo and sequential beast encounters.
- A **moan and grunt** setting (on by default, under Fetish settings) lets being penetrated and penetrating make your character moan, grunt, or both during encounters.
- A **Show post-encounter summary** toggle (under Settings > Enemy Stats Display) adds a recap after an encounter ends: how many times the player and other participants orgasmed, where cum was received or given, and what clothing was destroyed or stolen. It supports human, beast, tentacle, and swarm encounters, but is excluded from dream encounters.

### 3.4 Cock Addict & Hole Addict Traits

DoLX adds two traits that control what your character needs to orgasm.

- **Cock addict:** your character needs to be penetrated to properly orgasm.
- **Hole addict:** your character needs to penetrate someone or something to properly orgasm.

These traits are mutually exclusive. Unlocking either one permanently locks the other for that character, including if trait acquisition is later switched off and back on. This exclusivity is now enforced properly — the two traits can no longer end up active at the same time through edge cases like trait re-rolling.

These traits can make encounters more difficult, especially when pills, aphrodisiacs, high arousal, or low willpower are involved. Toys may still trigger an orgasm in some cases, but they do not fully satisfy the trait. The result may feel forced or unpleasant instead of properly relieving. Insertable toys and strokers now reliably force this "hollow" orgasm outcome for addiction/X-Change purposes, instead of sometimes registering as a full, satisfying release.

**Hole Addict no longer blocks orgasm while the player has no penis.** Since there is nothing to insert, the craving now stays dormant until a penis is available again, rather than incorrectly preventing orgasm for a body that structurally can't satisfy the trait — including bodies created by gender-flipping X-Change pills. Trait descriptions explain this behaviour. The fix also covers a few encounters that were wrongly treating the player as unable to orgasm under this trait: the ear slime, the moor phallus plant, and the lake ruin wraith. These encounters (and the trait logic generally) now distinguish between a trait that is genuinely active versus one that is simply locked out by its counterpart.

> Breeder's creampie-only orgasm rule is separate from Cock addict and Hole addict.

Alpha adds a similar but separate release rule while active:

- If Alpha is active and you have a penis, your knot wants to be inside a partner or valid target before orgasm can satisfy the effect.
- This is part of the Alpha pill effect, not a permanent Cock/Hole Addict trait by itself.
- Alpha's knot can also change encounter visuals and NPC reactions when you penetrate someone.

### 3.5 Bullet Vibe

DoLX adds support for the **bullet vibe** as a wearable arousal-control and risk item.

- It can be worn with **three vibration levels**.
- It can be turned on or off from the **Character** tab.
- If the player orgasms from the bullet vibe while walking around town, special events can trigger.
- Whitney can catch the player wearing it in math class if Whitney is present.
- The library has a special orgasm event if the orgasm is caused by the bullet vibe.

### 3.6 Fingernails, Claws & Scratch

Fingernails are a mechanical body feature in DoLX.

- Fingernails grow over time through four stages: **Trimmed**, **Neat**, **Long**, and **Claw-like**.
- They reach full growth after roughly **14 in-game days**.
- Bathrooms include an option to trim fingernails.
- The Characteristics screen shows fingernail descriptions alongside hair descriptions.
- Long nails can provide an attractiveness boost, with a matching mirror breakdown entry.
- Long nails apply a hand-skill penalty, so the beauty/social benefit comes with a practical drawback.
- Cat transformation players are exempt from the ordinary long-nail attractiveness boost because their claws are hidden socially, and they also avoid the long-nail hand-skill penalty.

The **Scratch** combat action is a new defiant action that uses your fingernails or claws, can be used in consensual or non-consensual encounters, and is meant to hurt.

- Scratch damage scales with the effective nail or claw level.
- Longer or sharper nails make Scratch stronger.
- Nail-armour rings now interact with Scratch correctly.
- Cat, wolf, fox, bear, and Water Dragon transformations always have Scratch available because their claws are part of the transformation.
- **Scratch is a stronger alternative to punching for miniature, tiny, and small characters** in dangerous fights, while consensual scratches stay deliberately gentle. Scratch now correctly respects combat settings, dodges, counters, nail-armour rings, and ear-slime interference, and missing NPC reaction text for being scratched has been filled in.
- Smaller characters can deal more scratch/claw damage in dangerous fights, while larger and stronger characters still generally benefit more from punching. This keeps claws useful without replacing strength builds.
- If both hands have claws, Scratch can use both hands and inflict stronger wound damage.
- Consensual scenes keep Scratch/claw damage lower, so playful scratching does not end scenes too quickly.

Scratch also has social and NPC reaction support. Named NPCs can react differently to being scratched: Whitney may find it provocative, Sydney may lose trust, Kylar may treat it as a marking or obsession moment, Leighton may escalate punishment, and Bailey may frame it as damage or debt. Generic enemies vary by anger.

The VIP spa wing also offers a **Signature Manicure** treatment, tying the nail system into the newer beauty-spa content.

### 3.7 Fluids, Cleanup & Arousal Control

DoLX also adds or changes several small body-management options.

- You can scoop out fluids from both lower holes in bathrooms.
- Cold baths and showers at the orphanage and Alex's cottage can lower arousal.
- Clothing styling can be adjusted on the go through a submenu on the Characteristics overlay.
- Rain gradually washes lewd fluids off exposed skin while you are outside. Heavier rain cleans faster, while clothing protects covered body parts from being rinsed.
- Worn butt plugs and inserted dildos can retain internal fluids and shield them from washing or decay until removed.
- Small inserted dildos still retain fluids mechanically, but can visibly drip because they do not seal as tightly.
- Dildos can also be worn vaginally like plugs. You can remove them from the sex-toy inventory, and inserted toys may also be dislodged in combat.
- A carried breast pump can be used even by low-awareness characters when there is a practical reason, such as pregnancy, previous birth/baby-bottle handling, active lactation, or painful milk fullness.
- Low-awareness breast-pump access is narrow: it does not unlock the whole sex-toy list just because the pump is available.

### 3.8 Attitudes, Speech & Traits

DoLX also reworks the DoL Plus attitude system across many scenes.

- The reworked attitude system affects a large number of passages and continues to be expanded.
- **Fickle** is now a daily attitude rather than a constant randomiser.
- Each day, Fickle selects one mood for your character from **meek**, **shy**, **neutral**, **confident**, and **bratty**.
- Meek, Submissive, Bratty, and Defiant now have clearer trait descriptions.
- Prey animal traits can give a daily submissive buff.
- Predatory animal traits can give a daily defiance buff.
- Submissive and deviant action tuning has been rebalanced, especially during mid-combat.
- **Gradual masochism and submission conditioning:** sustained high pain now has a chance to gradually raise masochism and slightly raise submission, alongside the existing orgasm- and combat-based masochism gains. The chance scales with both pain intensity and how long the pain has lasted, up to roughly four hours of continuous pain. It's disabled in Soft Mode and during scenes where stat changes are frozen, and masochism is still capped at its normal maximum of 1,000.
- Some story choices no longer require submissiveness, and some defiant checks can use wolf-specific defiance requirements so wolf TF players with high submissiveness still have access to appropriate options.
- **Insanity** is a hard-mode mental trait available at character creation under Mental Attributes.
- Permanent Insanity is not beginner-friendly: it forces severe trauma symptoms to behave as constantly active, including Insomnia, Nightmares, severe Anxiety, Panic Attacks, and Hallucinations.
- It cuts many physical, combat, willpower, swimming, athletics, dancing, and academic gains, increases physique decay, and pulls the character harder toward crime and delinquency.
- Permanent Insanity forces all tempered talents active and locks the talent menu around that state.
- **Dissociation is now a core part of the trait.** Insane characters are completely numb: sensitivity changes are fully blocked while insane, in both directions (no gains **and** no losses), which fixes older cases where pills, purity shifts, orgasms, anti-pill effects, or version-migration changes could reflect sensitivity loss onto an insane character who shouldn't have been feeling any of it. Existing saves repair clearly broken sensitivity values once on load; already-valid values are left untouched.
- Insane characters also stop noticing passive rubbing from underwear or clothing altogether — related sensitivity messages and passive arousal gains are suppressed. They can still sleep or shower even when their arousal would normally be considered too high to allow it.
- **Insanity is now sticky.** It is gained once trauma has stayed at 65%+ for **5 straight days**, and it is only lost once trauma drops below **5%** of its maximum — i.e. nearly fully healed. A non-permanent Insanity state can still develop mid-game this way and fade once trauma has genuinely subsided, rather than flickering on and off with every trauma spike.
- **Insanity in combat** now paralyses the player for the first **two turns** of any encounter while permanent or temporary Insanity is active, representing the character dissociating under pressure.
  - Gaining focus while dissociated — such as by poking yourself or attempting to speak — removes an additional turn from the paralysis.
  - **Willpower counters this paralysis:** at **350+ willpower**, the paralysis shortens to one turn; at **700+ willpower**, it is prevented entirely.
  - A milder dissociation lingers for the rest of the encounter after the player surfaces from the initial paralysis.
  - Active permanent or temporary Insanity also adds a **13% lash-out roll per consensual encounter** — a small chance of an involuntary defiant outburst even in a scene you otherwise agreed to. Non-consensual encounters keep their original lash-out behaviour unchanged.
- **Fallen Angels with Iron Will** got a related buff: Iron Will is now retained after using a genome dump, boosts willpower gains by **35%** normally, and grants **45% more** willpower gain specifically while affected by temporary or permanent Insanity — useful if you're deliberately trying to push past the 350/700 combat-paralysis thresholds above.
- After unlocking **A Special Trait** with **20 Vrel Coins**, some feat-supported sexual or role traits can be taken in boosted forms at character creation. This is mainly useful for players building around traits such as Orgasm Addict, Asphyxiophilia, Cum Dump, Plaything, Fucktoy, Bitch, Prey, or Milk Addict from the start.

### 3.9 Penetration Pain & Substance Rebalance

Penetration pain has been rebalanced so wetness, size, repeated stimulation, and encounter type matter more clearly.

- Higher wetness can reduce vaginal and anal penetration pain over time.
- Being dry keeps penetration more painful, so arousal and lubrication matter more than before.
- Very large NPCs can still cause meaningful stretch pain even when the player is wet.
- Colossal NPCs remain especially difficult to handle.
- Large NPC penis sizes add extra stretch pain.
- Double penetration uses the largest active penetrator when calculating stretch pain.
- In consensual encounters, repeated orgasms can gradually reduce pain after the player climaxes three or more times in the same scene.
- In non-consensual encounters, capped pain can convert a small amount into trauma each turn instead of sitting harmlessly at the cap forever.

Substance rebalancing also makes intoxication less likely to completely break play.

- Alcohol, hallucinogens, and other drugs wear off about **25% faster** under the rebalance.
- Skill penalties from being drunk or high are gentler and capped.
- Heavy intoxication still slows the player down, but should not reduce checks all the way to useless zero-values.
- Botched-pill pain is lower under the Substance Rebalance option, making failed pill outcomes still painful but less extreme than before.

> Wetness, arousal, intoxication, and encounter tone now matter more. A scene can become easier or worse depending on how prepared, drugged, or overwhelmed the player is.

### 3.10 Tentacle & Beast Encounter Mechanics

Tentacle, abomination, and beast encounters have their own layered mechanics beyond ordinary human combat.

**Multi-tentacle penetration and choking:**

- Up to **three tentacles** can occupy the same hole at once. A second tentacle can force its way into an already-occupied vagina or ass, and a third can join to share that same hole.
- Tentacles wrapped around the neck can now properly strangle the player, including a suffocation/passout mechanic and an oxygen-loss loop specific to tentacle and abomination encounters.
- X-ray art scales with tentacle count, using a darker overlay layer for the extra penetrator(s) so double-penetration reads visually distinct from single penetration.

**Beast multi-orgasm fix:** actions that hold or stimulate a beast's penis no longer automatically fail while the beast is mid-ejaculation. Previously this could make the beast's penis abruptly vanish from wherever the player was holding or being penetrated by it (hand, mouth, feet, thighs, or elsewhere) mid-orgasm; a beast can now complete a full multi-orgasm turn without your grip or position being invalidated partway through.

**Player-initiated facesitting and rimming:** you no longer have to wait for an NPC to randomly start these — they now appear as regular consensual initiation options (human encounters only), each gated by the matching skill:

- **Move your mouth to their ass** — needs Analingus (Giving) and oral skill.
- **Pull their pussy onto your face** — needs facesitting and oral skill.
- **Guide their head to your ass** — needs Analingus (Receiving) and anal skill.
- All three can fail if your skill is too low, same as other skill-gated initiations.

**Plant person:** deliberately entering the plant person's snare now starts a fully consensual encounter (keeping the existing bound-leg and oral positioning), while stumbling into it by accident still plays out as non-consensual. This lets players who want the plant person content seek it out on purpose instead of only encountering it as an ambush.

---

## 4. Seduction, Beauty, Alcohol & Aphrodisiacs

### 4.1 Seduction & Beauty

X-Change pills are known in-universe for making their users unusually attractive. In gameplay, beauty affects more than how people react to your appearance. **Beauty is mostly chosen during character creation.** It does not slowly grow like an ordinary skill.

The UI now treats beauty more like a fixed starting trait, though some effects can still boost it temporarily.

X-Change transformations can give a large beauty boost, especially the first time your body changes. Some saves that were already close to maximum beauty may also be pushed to the cap. Beauty can affect:

- how attractive others find you
- how quickly school status can grow
- Avery assistant office wages
- Robin's horniness if your beauty is above the usual vanilla limit

You can also get temporary beauty boosts from grooming and makeup.

- Washing can improve beauty through cleanliness.
- Makeup can temporarily increase beauty.
- Makeup is removed when washed off.
- Cleanliness fades over the day.
- You can wash your face and hands in bathrooms, including at the orphanage and Alex's farm.

> Treat beauty as a mostly fixed appearance trait with temporary boosts layered on top. X-Change pills can push it higher, but ordinary grooming and makeup only last for a while.

### 4.2 VIP Beauty Spa, Makeup & Cosmetics

Beauty is not only affected by X-Change pills. You can also improve your appearance through makeup, grooming, tanning, and spa treatments. These boosts are usually more ordinary than pill transformations. They make your character look better, but they do not rewrite the body the way X-Change can.

**Makeup and outfits**
The Outfit Editor can save makeup as part of an outfit.

- Outfits can remember makeup, not just clothes.
- Each outfit can have its own makeup setup.
- Custom makeup has expanded controls compared with the old basic makeup flow. Treat it as a cosmetic system: it can change the look and outfit identity of a body, but it does not change sex, gender, transformation, or pill state.

**Spa and VIP beauty treatments**
The spa gives more ways to improve appearance through services and social content.

- Tanning can improve beauty.
- Spa beauty treatments can boost appearance.
- VIP members can unlock stronger beauty treatments.
- VIP spa service prices are lower than in older DoLX builds, so the VIP route is less punishing for players using it as regular beauty upkeep.
- Spa parties can increase social fame and may teach your character something.
- The VIP wing can offer a **Signature Manicure**, which connects beauty treatment with the fingernail and Scratch systems.

These systems sit beside X-Change pill beauty. Pills can cause dramatic body changes, while makeup, tanning, and spa treatments are more normal ways to improve appearance for a while.

### 4.3 Alcohol

To balance the slower natural beauty gain, DoLX gives the player a scaling flat bonus to seduction based on how tipsy they are.

- Light to moderate drunkenness can improve seduction.
- Getting too drunk turns the bonus into a malus.
- The current bonus can be checked in the characteristics menu, under sexual skills.
- Drinking at the pub can be useful, but it also creates more chances to be spiked.
- NPCs may approach the player at the pub if they consider the player attractive enough, though later tuning reduced how often this happens.

Alcohol also interacts with willpower:

- It makes pleasure-related checks harder.
- It can make pain-related checks easier during combat, because drunkenness numbs pain.
- The current system resolves an old conflict so DoLX's own alcohol modifier is the one used for seduction and willpower calculations.
- Under the newer substance rebalance, alcohol and other drugs wear off faster and their skill penalties are capped, so heavy intoxication is still dangerous without making every check impossible.

### 4.4 Drunkenness Tolerance Trait

Characters who get heavily drunk often can build **Drunkenness Tolerance** over time.

- Higher tolerance makes drunkenness less tiring.
- Alcohol leaves the body faster as tolerance rises, up to roughly **1.5×** speed.
- At maximum tolerance, drunkenness no longer forces extra tiredness.
- Tolerance decreases after staying sober. It takes about **30 in-game days** to fully reset.
- After long-term heavy drinking, suddenly going sober can cause withdrawal stress for the first **3 days**. The stronger the previous tolerance, the stronger the withdrawal stress.

### 4.5 Aphrodisiacs

Aphrodisiacs passively raise arousal up to a threshold based on how much of the drug is in the character's body.

- Small amounts can raise arousal up to roughly **1/5** of maximum arousal.
- Large amounts can raise arousal up to roughly **4/5** of maximum arousal.

Combined with the willpower system, aphrodisiacs make it harder to resist pleasure, harder to act defiantly, and more dangerous to ignore rising arousal.

---

## 5. Audio System

DoLX includes an audio system and adaptive background music.

- Audio can be enabled from the sidebar options menu, under the **Performance** tab.
- The system includes audio for combat encounters and player character arousal.
- Adaptive background music is included.
- Background music is assigned to locations and side-story areas, including Hopeless Cycle location tags in the BGM selector.
- Male and female voiceovers can be switched by changing the character's gender posture, regardless of current biological sex.
- Sissy / Butch pills may switch voiceover audio gender if posture is neutral.
- Herm bodies have their own voice handling instead of being forced through the male voice path. By default, herm player moans use the female Hentai voice.
- **Voice per body & identity** settings let you choose the player voice for Male, Female, Sissy, Butch, and Herm bodies, including muting your own voice.
- The same settings area can control which NPC voice types you hear. The Herm row appears once the player has actually become herm.
- The game can be muted automatically when its window is out of focus or hidden.
- An alternative female voice for your character is available.
- NPC moaning and orgasm voiceovers can be turned on or off separately, useful if you want combat/arousal audio without NPC voice playback.

> Because this feature may be more sensitive to performance, browser, package, or platform issues than ordinary gameplay systems.

---

## 6. Allure, Danger & Reputation

Allure affects how much unwanted attention your character attracts. Higher allure means the world is more likely to treat your character as tempting, vulnerable, or worth approaching.

DoLX keeps the basic idea from vanilla DoL, but changes what feeds into it. The biggest change is:

- **Arousal can increase allure.** The more aroused your character is, the more attention they may attract.

Reputation also matters:

- **Bad reputation** is the main source of danger.
- **Beauty** makes bad reputation more dangerous.
- **Good reputation** can reduce the danger, but it does not remove it completely.

This means beauty is not automatically dangerous by itself. A beautiful character with little or no bad reputation should not attract much extra trouble from beauty alone. But if the same character builds bad reputation, their beauty can make that reputation hit harder. A plain-looking character can get away with worse reputation more easily than a very beautiful character, because beauty mostly acts as a multiplier.

In simple terms:

- Low bad reputation = usually safer.
- High bad reputation = more danger.
- High beauty + high bad reputation = much more danger.
- Good reputation helps, but cannot fully erase bad reputation.
- High arousal can make the character more alluring in the moment.

<details>
<summary>More specific allure calculation notes</summary>

Only the highest bad reputation value is used as the main danger base. Beauty then multiplies that danger. It also adds a very small extra amount by itself. Good reputation reduces the final result. Each maxed good reputation halves the allure from the previous steps.

For example:

- one maxed good reputation: allure is reduced to 1/2
- two maxed good reputations: allure is reduced to 1/4
- three maxed good reputations: allure is reduced to 1/8

Good reputation helps a lot, but it reduces danger after bad reputation and beauty have already been counted.

</details>

---

## 7. Fame & Piller Identity

DoLX treats your original body and your X-Changed body as separate identities in many situations. People do not automatically know both bodies are the same person.

When you take a sex-flipping pill, your changed body can build its own reputation.

- Fame and crimes from your original body usually stay with that body.
- When you change back, your original body's fame and crimes return.
- Piller fame is only gained when the pill actually flips your sex.
- X-Change fame can unlock or affect some events, such as school hallway spiking at **800 fame** and Riley's alleyway rescue at **500+ fame**.
- X-Change fame can also matter for some tasks, cheat tools, and menu checks.
- Being spiked by X-Change can add X-Change fame, so forced or public pill incidents can push the player toward fame-gated X-Change content.
- Maxed or very high X-Change fame is one possible route into the mysterious person / Silver Stranger merchant content.
- A mask (or covered face) blocks fame gain/loss in a category while it's below 500, only halves it from 500-999, and stops concealing you at all at 1000+, since you're already too recognisable by then regardless of your face. This applies to every `fame*` widget and to X-Change fame. `forceChange` (the widget's 3rd argument) should only be used to bypass the gloryhole/private-companion exemption, not to force a gain through a masked identity - if content needs a mask to matter (e.g. a hidden camera catching the player unexpectedly), scale the amount by the same tier at the call site instead of relying on `forceChange` to skip the mask check.

Lewd stats can also be separate between bodies when **Enable lewd stat split** is turned on. One body may have low promiscuity, exhibitionism, or deviancy, while the other has much higher experience. A new body starts with its own values, switching back restores that body's values, and the split stats are not merged.

Virginity is also stored per body for the main X-Change roles.

- Your original body, a sex-flipped X-Change body, and a herm X-Change body can each keep separate vaginal, penile, anal, oral, handholding, and kiss virginity state.
- Brand-new X-Change and herm bodies start intact.
- Losing virginity in one body does not automatically take it from the other stored body.
- The Virgin trait checks the current and stored body state more carefully, so preserving one body's virginity can still matter after body swapping.

Herm content has its own routing checks. Some explicit herm scenes should only appear if your current body actually has both genital sets, though rumours and gossip may still linger after your body changes back.

**Shop and spa ban recognition now scales with X-Change fame** instead of being a flat yes/no ban check while pilled:

- Below **200** X-Change fame: you are not recognised at all, and entry is unaffected.
- **200–399** fame: staff are uncertain but still let you in.
- **400–599** fame: staff grow suspicious. You are still allowed in, but a small hidden trespassing increase is added once per day.
- **600+** fame: you are fully recognised, and any existing ban is enforced normally.
- Players who are not currently X-Changed continue to be recognised normally regardless of these tiers — this scale only softens recognition while you're wearing a changed body.

---

## 8. Willpower System

DoLX adds a willpower resource system that affects willpower checks across the game and counterbalances some of the power added by DoL Plus Combat Extended.

### 8.1 Core Terms

- **Willpower Resource:** the current spendable amount used during difficulty checks. It appears as a bar on the stats display.
- **Willpower Capacity:** the maximum amount of willpower resource the character can hold. This is based on the normal willpower value shown in the characteristics overlay.

### 8.2 How It Works

Willpower is a daily resource used for resisting pressure and passing willpower checks.

- **Willpower capacity** is the maximum amount you can have.
- **Current willpower** is how much you have left today.
- Willpower checks use your current willpower, not only your maximum.
- Spending too much willpower makes later checks harder.
- Current willpower cannot go above your capacity.
- Meditation, yoga, overwhelming pain, and orgasmic bliss can raise your capacity.
- After combat, recovery depends on your willpower cap.
- Submission and defiance can affect some non-combat choices too.

> Think of willpower as mental stamina. A strong character can still be worn down if they spend too much of it before the day is over.

### 8.3 Actions That Spend Willpower

Willpower can be spent by:

- succeeding or failing willpower checks
- spending time while highly aroused
- choosing bratty or defiant combat actions while arousal is high
- choosing bratty or defiant combat actions after a recent orgasm
- orgasming, which spends a chunk of willpower at once

Failing a check spends only a small amount compared to a success, but repeated failures can still matter.

### 8.4 Actions That Restore Willpower

Willpower can be restored by:

- **Sleeping:** the main recovery method. In general, sleep restores about **1/8** of capacity per hour, though trauma mechanics may affect the recovery rate.
- **Orgasm recovery after encounters:** after an encounter ends, the character restores willpower based on how many orgasms they had, up to three. Masturbation counts as an encounter. Orgasms outside encounters do not currently restore willpower.

Fatigue overflow is also tied into DoLX willpower behaviour in current play:

- If fatigue goes over the current cap, the excess can spend X-Change willpower when available.
- If there is not enough X-Change willpower to absorb the overflow, the excess can convert into stress or trauma.
- If sleep does not seem to lower fatigue, the game may explain why. For example, your fatigue may already be at 0, or another effect may have cancelled out the recovery.

### 8.5 Willpower Modifiers

Alcohol and aphrodisiacs also affect effective willpower.

- The drunker or more drugged the character is, the worse their effective willpower becomes for most difficulty checks.
- Being extremely drunk can apply up to a 100% penalty to remaining willpower during a check.
- Being heavily drugged can do the same.

There is one major exception:

- For pain checks in combat, drunkenness gives a scaling flat bonus instead of a malus.
- This can reach up to **500** willpower points for pain tolerance checks.

> In practice, being drunk can help the character endure pain in battle, but it becomes dangerous if arousal rises too high.

### 8.6 Extra Combat & Progression Notes

- You can pick a fight with delinquents at the school's rear courtyard.
- Some story encounters can start the player at a disadvantage instead of beginning like a normal on-guard encounter.
- Losing a fight after dealing at least two-fifths of the enemy's HP grants increased brawling growth compared to an ordinary loss.
- NPCs can attempt to pill the player during encounters.
- You can pill NPCs during combat with supported pills.
- Some encounter screens include a lose/skip encounter button, useful when you want the consequence without playing every turn out manually.
- **Offer your mouth instead** can redirect genital threats toward oral when your mouth is free. It appears through combat action menus and works with the newer X-Change heat/arousal behaviour.
- **Dodge** is weaker in group fights than against a single focused attacker. The active Dodge bonus is strongest when the same NPC or feet target attacks you; passive avoidance still works normally.
- Cat transformation players at level 2 or higher can use **Hiss**, a bratty beast-combat action similar to wolf Growl. It can make beasts flinch, and a flinching beast may hesitate before pouncing.
- Encounter theft payouts scale better with very high skulduggery past S rank, so theft builds keep improving after the visible S threshold.
- High heels stop imposing movement disadvantages once feet skill reaches **1800**. At that mastery level, you can run, walk, sneak, and travel in heels without the earlier heel movement penalties.

### 8.7 Advanced Combat Rebalance

Combat Extended (the deeper, skill-driven combat layer) received a broader rebalance pass aimed at keeping very high stats from trivialising fights, and giving players a direct dial over how hard enemies hit.

- **Dodge now has diminishing returns above 60%**, so stacking agility past that point no longer pushes the player toward being nearly untouchable.
- **Damage from Brawling, Striking, and Kicking scales more gradually**, avoiding sudden power spikes at specific skill breakpoints.
- **Standing Fights** now inflict slightly more pain on the player, tightening a gap where standing combat had become comparatively safe.
- Fixed enemy passive dodge not applying correctly, and fixed enemy blocking failing to reduce incoming damage due to an incorrect variable — enemy blocking is also now capped so it cannot accidentally heal the enemy.
- Fixed Physique and Masochism reducing combat pain **twice** — at high stat values this could make incoming attacks weaker than natural pain recovery. Pain reduction is now applied only once, so very tanky builds no longer become effectively unhittable.
- **Enemy Damage Multiplier** (Combat Extended > Enemy CE Actions) is a new slider from **25% to 300%** that scales enemy-inflicted pain, stress, and trauma directly, without touching enemy health. Presets: **Very Easy 75%**, **Easy 100%**, **Normal/Casual 125%**, **Hard 150%**, **Very Hard/Tryhard 175%**, **Impossible 250%**. Existing saves default to 100%; if you had already customised your difficulty before this setting existed, pick **150–175%** manually rather than reapplying a preset over your old tuning. The old hidden +25% pain modifier was removed, so this slider is now the _only_ source of enemy damage scaling.
- Negative or corrupted damage values can no longer heal the player, and extreme Blocking/Physique or edited stats can no longer produce negative damage — deliberate recovery effects (like specific combat actions that reduce pain) are unaffected by this guard.
- The Stat Nerf Multiplier setting now also reaches Combat Extended skills: Brawling, Striking, Kicking, and Footwork no longer ignore it, and Dodging, strike/kick accuracy, melee/tentacle damage, and stability all scale with it too. The Characteristics screen shows the exact reduction applied per skill. Skill gains, skill caps, and gym lessons are unaffected by the Nerf Multiplier.
- A combat soft-lock where enemy HP could disappear and make a fight unfinishable has been fixed: invalid damage values can no longer corrupt enemy HP, affected enemy HP is repaired mid-combat, and Stat Nerf Multiplier values are repaired automatically on load if they were corrupted. If you already have a save stuck in this state, attacking once after recompiling/reloading should restore the enemy's HP.

---

## 9. The Gentleman's Club (Blackmail Quests)

The Blackmail Quest chain was added to accompany the allure changes.

If the conditions are met, you may be contacted by **the Gentleman's Club**, a shadowy underworld organisation that produces blackmail material for its clients. The club pressures victims into increasingly scandalous acts under threat of exposure, while also paying them enough to make compliance tempting. Each quest can feed more compromising material back to the club, making it harder to walk away.

### 9.1 How to Begin

**Hint:**

- Gather bad attention. Lewd pictures may help.

### 9.2 Journal, Payment & Diversion

- Blackmail quest completion status is shown in the journal.
- Landry can be paid to divert the Gentleman's Club's attention away from the player.
- Blackmail letters show an estimate of reputational damage.
- Landry's pub introduction to the Gentleman's Club has been rewritten to better match his characterisation. His "top-notch material" line can now trigger specifically when the player has a good reputation and low allure, framing it as recognising your standing rather than writing him out of character.
- Two feats reward complying with requests at the Gentleman's Club, alongside the existing tier system below.
- Blackmail tasks that forbid certain clothing (tops, underwear, etc.) no longer incorrectly fail if you were force-dressed by passing out from heatstroke or hypothermia — that's now treated the same as ordinary exhaustion fainting, so it doesn't cost you the task or the reputation penalty. Tasks also no longer fail during scenes where time and stats are paused, such as character-book dreams/replays or the Hopeless Cycle sequence.

### 9.3 Quest Tiers

Blackmail quests are divided into three tiers:

- **Low tier:** for lower exhibitionism, roughly exhibitionism 1–2.
- **Mid tier:** for mid exhibitionism, roughly exhibitionism 3–4.
- **High tier:** for high exhibitionism, roughly exhibitionism 5+.

Quests from the tier immediately below the current tier can also appear in the current pool, giving higher-tier players more variety.

### 9.4 Low Tier Quests

Very early quests and prerequisites:

- **Wear no underwear** — Always available.
- **Drink and get wasted** — Always available.
- **Take a pill and wear a skirt** — Available if you are not pilled and your original sex is male.
- **Clean 5 chalets in uniform, no underwear** — Always available. You need to wear the uniform with no underwear; taking the envelope contents is not required for compliance.
- **Wear no shirt** — Available only if current sex is male.
- **Sell flowers on the market while pilled and wearing no lowerwear** — Available only if the blackmail letter is opened before 9 AM.
- **Go for a run in underwear at the park** — Always available.

### 9.5 Mid Tier Quests

Early-to-mid quests and prerequisites:

- **Take a pill and flirt with 3 strangers** — Available if you are not pilled when opening the letter.
- **Skinny dip in the school pool** — Available if today is a school day, the secret tunnel from the park is unlocked, or skulduggery is D rank or higher.
- **Avoid defiant acts for a day** — Available only if you are defiant, with submissiveness at or below 850.
- **Masturbate at least once while selling flowers pilled and wearing no lowerwear** — Available only if the blackmail letter is opened before 9 AM.
- **Go for a run naked at the park** — Always available.

### 9.6 High Tier Quests

Mid-to-late quests and prerequisites:

- **Masturbate in an empty classroom** — Available if today is a school day, the secret tunnel from the park is unlocked, or skulduggery is D rank or higher.
- **Go streaking naked at the park during daylight** — Always available.
- **Air hockey strip at the arcade** — A high-tier quest involving the arcade air hockey content.

> More quests are planned or reserved for future documentation.

---

## 10. Danger, Police & Prison

### 10.1 Danger Gradient

The town has a danger gradient.

- Some streets are more dangerous than others.
- More dangerous areas have a higher chance of molestation, assault encounters, and dangerous events.
- Allure still matters, but location now also affects the chance of danger.
- Alleys are generally more dangerous than the surrounding open streets.
- Attending the market stall has an increased danger chance.

> The Discord guide references map images for this system. Those images are not embedded here, so this page only documents the mechanic in text.

### 10.2 Police Harassment

Police coverage and harassment also vary by area.

- If the character has accrued crime, police harassment may be stronger in some locations and weaker in others.
- Police street harassment increases in proportion to crime.
- Police become more aggressive and competent as crime rises.
- Paying off police becomes harder in proportion to crime.
- Police can arrest the player if stolen goods are found during a search.
- Alleys are generally safer from police inspections than open streets.

> The Discord guide also references an approximate police coverage map, but the image is not embedded here.

### 10.3 Mailbox Theft

Some residential streets have mailboxes that can be stolen from.

- Mailbox theft exists around **Danube**, **Domus**, and **Barb Flats** across the canal.
- Each mailbox location has a daily limit, so you cannot farm the same spot indefinitely in one day.
- At night, you can target locked doors directly. During the day, you may need to knock first and find nobody home.
- Mailbox theft gives petty crime and money/stolen goods rather than being a clean job.
- High skulduggery can make the risk low, but it is still theft and can feed police pressure if things go badly.
- A 30-day streak of successful mailbox theft can award a feat.

---

## 11. Economy: HBSC Bank & Bank Heist

DoLX now integrates and expands the **HBSC Bank** feature into a fuller economy system. The bank is useful for more than storing spare money: it can manage savings, fixed-term deposits, route payments, and now recurring bills.

### 11.1 HBSC Accounts, Interest & Standing Orders

The HBSC bank can handle:

- opening an account
- account tier upgrades
- savings deposits and withdrawals
- fixed-term deposits
- early fixed-term withdrawal options
- journal and stats notices for interest
- clearer brochure and rate information
- automatic bill payments through standing orders

**Standing orders** let the player route recurring bills through HBSC savings. The covered bills currently include:

- orphanage rent, paid to Bailey
- farm tower guard wages
- gambling-ring upkeep, paid to Landry

When a standing order is active, the journal records that the bill is covered. If the bank cannot cover the full amount when payment is due, the standing order is cancelled and the journal shows a red alert. Treat this as convenience, not immunity: the system helps you avoid forgetting rent or wages, but it still depends on having enough money in savings.

Bailey rent standing orders can now apply from multiple living locations, including the farm cottage, Poppy's flat, the temple, and the orphanage. If savings are too low, the automatic payment fails and the player is told.

**Fixed-term deposits now use simple yearly interest language.** The bank uses pro-rata yearly rates rather than compounded AER wording.

- A **1-month £300,000** fixed-term deposit at **2.5% per year** pays **£625**.
- A **12-month** term pays the full headline yearly rate.
- Confirmation screens and result screens show both the interest earned and the term length.
- Active deposit details show the total if the deposit is held to maturity.

Avery can notice your **HBSC bank account**, which can unlock or change some Avery-related content. The bank also connects to the **Brown Fox** task, so it has uses beyond saving money.

### 11.2 Bank Heist

A bank heist event has been added as a more active crime/economy route.

- The heist includes skill checks and multiple outcomes.
- Journal progress tracks the heist route.
- Follow-up events can occur after the heist, including high-alert and trespassing scenarios.
- At high crime, you can encounter a post-heist bank alert event.
- After the heist is complete, being sent to prison can lower the bank alert level by 1 point.

> This guide avoids listing every exact check. If you want the safest or most profitable heist route, test it in-game or consult more spoiler-heavy notes.

### 11.3 Inflation, Bailey Pressure & Loans

DoLX now has a broader economy rebalance. Big cash piles make player spending more expensive, and Bailey reacts more aggressively to visible wealth and debt.

**Inflation is based on net wealth.** The game counts:

- cash on hand
- HBSC savings
- fixed-term deposit principal, even while locked
- prepaid Bailey rent deposits
- minus outstanding HBSC loan principal

Inflation applies to player spending such as shop purchases, lessons, paid route actions, upgrades, and many transaction labels. It does **not** apply to earnings, wages, gambling stakes, bank deposits or withdrawals, rent, loan repayments, or debug/cheat money movement.

Default/current inflation tiers:

- **£500,000+ net wealth:** prices rise by 10%.
- **£2,000,000+ net wealth:** prices rise by 35%.
- **£5,000,000+ net wealth:** prices rise by 75%.
- **£15,000,000+ net wealth:** prices rise by 150%.
- **£100,000,000+ net wealth:** the economy enters a parody spiral. On the current preset, this is a 1500% price increase.

Economy presets change these numbers.

- **Light** and **Mid** make price increases and Bailey pressure start more gently.
- **Current** is the intended balance and the default reference for this guide.
- **Hard** roughly restores the older harsher inflation feel, with 20%, 70%, 150%, 300%, and 3000% price tiers.
- **Harsher** makes the economy bite sooner and harder, especially through Bailey pressure.
- After applying a preset, you can still tune individual sliders for inflation percentages, Bailey rent pressure, rent caps, weekly rent growth, and overdue loan collection.

The system is dynamic. If you spend down your wealth, inflation can fall again. The journal includes an economy block so you can see the current price pressure and whether Bailey is becoming more dangerous.

**Bailey-visible wealth is different from shop-inflation wealth.**

- Bailey can see cash and HBSC savings, minus HBSC loan principal.
- Active fixed-term deposits are not Bailey-visible until they mature.
- Fixed terms still count for shop inflation because they are still your wealth.
- If you owe rent while in town, Bailey can force a withdrawal from HBSC savings.
- Fixed terms can shield money from Bailey's immediate rent reach, but they do not hide you from the broader economy.

Bailey rent pressure:

- On the current preset, extra rent pressure begins once Bailey-visible wealth reaches the **Bad economy** stage, then grows by a small weekly step while you keep paying.
- Below **£1,000,000** visible wealth, scaled rent is capped at **£15,000**.
- From **£1,000,000** to **£10,000,000**, scaled rent is capped at **£35,000**.
- From **£10,000,000** to **£100,000,000**, Bailey can demand **£75,000** per week.
- At **£100,000,000+**, Bailey can demand **£250,000** per week.
- The rent pressure resets once visible wealth falls below the active threshold.
- Debt or crisis-level visible wealth can make Bailey aggressive, removing some refusal/seduction escape options and enabling street pressure when rent is overdue.

HBSC loans exist for rent emergencies, but they are not free money.

- Loaned money is inflation-neutral while it is borrowed.
- Unpaid loan debt can make Bailey more aggressive after it becomes overdue.
- Repayment costs more than the borrowed principal, so loans can solve a rent crisis while creating a longer-term Bailey problem.

Very high exploit-level wealth can trigger a special cap event that wipes the runaway money state and awards a hidden feat. Treat the parody tier as a warning that you have broken past normal economy play, not as a recommended goal.

**"Relentless Bailey" rent option.** An optional toggle under Settings > Rebalance Settings > Bailey Triggers, disabled by default, removes Bailey's usual restraint around rent:

- Bailey never accepts "no" for rent and starts actively hunting the player from the very beginning of the game.
- Weekly rent keeps rising with **no cap**, instead of stopping at the normal ceiling.
- Rent-threshold and rent-cap settings grey out and stop applying while this option is enabled, since there is no longer a cap for them to control.

> Only turn this on if you specifically want Bailey rent pressure to be a permanent, escalating threat rather than a manageable weekly bill.

### 11.4 Harvest Street Factory

The Harvest Street factory sells stockpiled farm produce for players who do not want to manually move every crop through normal sales.

- The factory sells some of your produce each day at noon.
- You can collect factory earnings whenever you visit; you no longer need to wait for a large minimum payout.
- The collection button shows the exact amount currently owed.
- Business fame helps the factory sell stock faster.
- Large backlogs should clear in days rather than sitting forever, and the factory always sells at least a small portion of each pile.
- Factory upgrades can improve price and throughput. Quality Control and Packaging raise sale value, while Distribution and Marketing help move more stock.
- Factory sale stats can be viewed from the Jobs statistics foldout.

---

## 12. Gambling, Pub & Horse Racing

DoLX gambling is no longer only a pub side activity. The pub still has dice, drinking, and pill risk, while the farm can unlock a full horse-race betting minigame once the farm has been fully cleared.

### 12.1 Pub Gambling and Dice

A gambling ring can be set up at the pub.

- Speak to **Landry** and ask about setting up a gambling ring.
- The current documented gambling game is **shooting dice**.
- Wagers range from **£500** to **£3000**.
- Dice gambling can involve alcohol, pills, and alternative bets when the player runs out of money.
- You can gamble with dice multiple times in a single day.
- Dice minigame drinks may layer multiple spike effects on top of the current pill if you are already pilled.
- Gambling-ring upkeep can be covered by HBSC standing order if you have enough savings.

> This gives the pub another money route, but also places the character in a setting where drinking, risk, and spiking can overlap.

### 12.2 Farm Racecourse and Horse Betting

The farm can unlock a **horse race betting minigame** once the farm has been fully cleared. After that, the player can visit the racecourse, choose a horse to back, place a bet, and either watch the race unfold or skip straight to the result.

Race basics:

- Races use **3 to 5 random horses**.
- Each horse has betting odds, and winning bets pay out according to those odds.
- There are **2 race field types**.
- Track going is based on the current weather.
- Horses move around the track during the race display.
- Horses can trigger random skills during the race, and skill activations appear in the race log.
- Time passes while the horses are running, so racing is not a free pause in the day.
- The racecourse closes at **21:00** and is unavailable at night after closing.

Risk notes:

- Betting is not just a clean money button. Horse incidents can happen.
- Horses injured by incidents become unavailable until they recover.
- Too many injured horses can close betting until the weekly reset.
- The old hard betting cap is gone, so you can chase larger bets, but the risk is now handled through stress, trauma, injuries, and racecourse availability.
- Losing large or repeated bets can stress the player, and repeated same-day losses can become traumatic.
- The racecourse is safest when treated as a risky betting route rather than a guaranteed money printer.

> Watch the odds, weather, time, and injury state. A good bet can pay well, but an injured favourite cannot keep carrying you through the week.

---

## 13. Named NPC & Route Content

_This section does not list every NPC event. It only covers the most important route and NPC content players are likely to notice._

### Whitney

Whitney has several X-Change-specific interactions.

- Whitney can remember your sex.
- Whitney may discover the player as a piller if your naked body contradicts what Whitney expects.
- Whitney can force-feed the player a Continue pill, and threatening to report Whitney for drugs no longer makes them back down.
- You may have to fight to avoid being force-fed.
- Whitney has a special math-class event if you are caught wearing a bullet vibe while Whitney is present.
- Whitney can visit the player at the orphanage after the Loft event if relationship requirements are met.
  - The route needs Whitney lust 100 and either X-Change fame 250 with love 80%+, or completion of the Whitney Loft event.
  - If you are Choice-pilled, Whitney may offer a cure during the second orphanage visit.
- Rejecting Whitney during the orphanage visit can make Whitney dismissive at school. The make-up route involves apologising in the park, then finding Whitney around the alleyway.
- After the Loft event, Whitney's Social tab can permanently show that Whitney thinks you are their boyfriend or girlfriend, unless a later situation changes that.
- If the player stays at school after finishing the second special orphanage visit, Whitney may skip the usual after-school bully event and bring the player safely back to the orphanage instead.
- Whitney needs slightly more love to accept drinking together at the pub, and rejecting Whitney in the orphanage route can gate that content.
- If the player flirts with someone else while Whitney is in the pub on Sunday night, Whitney may intercept after the special orphanage visit route is complete. This is tied to the orphanage visit, not merely the Loft event.
- Whitney has multiple flat-chat reactions in current play, including special reactions.
- A newer outing event lets the player take Whitney out while Whitney is in the flat. It becomes available after either the special orphanage event or the Whitney Loft event.
- Whitney can react to Water Dragon transformation content.
- Whitney has additional pub/after-school content in current play, including cage or chastity-related scenes when the route state supports them.
- Whitney crossdressing rules are now clearer in the Journal, so check the Journal if you are trying to understand which Whitney route expectations are active.
- **Whitney's toilet-assignment rule is fixed:** the old 25% chance that Whitney assigned you to the toilets you'd already naturally use is gone. Whitney now always assigns the opposite toilets based on your current body, and this check correctly accounts for any active X-Change body effects.
- Whitney refers to their actual current genitals in dialogue now, instead of always defaulting to a specific line regardless of their transformed state.
- **Whitney can pill the player as part of school chastity enforcement.** When Whitney's chastity rule applies to a body without a penis, Whitney can fit a constantly-stimulating dildo chastity belt instead.
- Two new hallway interactions were added after the player rejects Whitney's special orphanage visit, plus a park interaction for when the player tries to apologise afterward.
- Whitney has new reactions to the player's X-Change use, but only after Whitney has actually discovered it — Whitney's maths-class dialogue no longer references your X-Change use before Whitney has learned about it.
- Added a math dildo event variant and a bullet-vibe classroom catch event (see [3.5 Bullet Vibe](#35-bullet-vibe)); Whitney can also react to Water Dragon transformation content.

### Bailey

Bailey may use pills as part of rent punishment if the player fails to pay, and Bailey can now be pilled directly as a full route rather than only threatening the player with pills.

**Bailey is now pillable.**

- Bailey can be targeted with transformation pills from an approved whitelist, the same way other supported Named NPCs can be.
- Immediately after being pilled, Bailey has a unique furious reaction — do not expect this to go over well in the moment.
- Bailey has dedicated combat dialogue both before and after the transformation actually takes hold.
- **Daily orphanage scenes** let Bailey examine and test the new body while the pill is active.
- **Daytime flats events** let a pilled Bailey use the transformation while collecting rent and confronting debtors — the body change actively feeds into how Bailey does the job, not just flavour text.
- All of this transformation-related content stops once the pill wears off; Bailey's speech and behaviour branches are checked above the pill's own effect, so ordinary Bailey interactions still work normally around it.

**Bailey street-stalk and rent enforcement:**

- Bailey's street shakedown (being cornered while out in town, behind on rent) now mirrors the home rent-due behaviour, including dragging Robin into the confrontation and being able to sell Robin off the same way home confrontations can — previously, staying out in town while owing Robin's debt let you dodge that outcome entirely.
- The street shakedown also counts bank savings toward payment and includes any bank-loan surcharge, matching the normal at-home rent screen.
- If [Relentless Bailey](#113-inflation-bailey-pressure--loans) is enabled, Bailey never accepts "no" and hunts the player from day one, with weekly rent growing uncapped.
- The **Activate Stockholm** cheat option no longer silently swaps out your neckwear for Bailey's Lotus collar and leaving it stuck once toggled off — the cheat now clearly describes what it does, preserves existing neckwear, and properly removes the collar when Stockholm is deactivated. If your save was already affected, it repairs automatically on load: with Stockholm inactive, the collar becomes a normal removable item back in your wardrobe.

### Avery

Avery has several money, mansion, and X-Change hooks.

- Avery may force pill use for dates under certain same-sex conditions.
- Avery can notice that you have a HBSC bank account and send money to the account for the correct cooking requests.
- The Choice Reversal pill can be found at Avery's Mansion.
- Avery reacts negatively if the player reverts their transformation while living with them.
- Avery's mansion-intro Choice Pill scene gives a clearer coloured notice, making it easier to tell when the pill choice matters.
- Office wage from working as Avery's assistant can be boosted by beauty.
- After Avery has been saved, the mansion garden can unlock a crop plot in a sheltered glass corner. It works like a greenhouse-style plot and can be used year-round.
- Saving Avery can also lead to a more conflicted follow-up scene at the mansion, even if you do not accept everything Avery offers.

**Post-chase confrontation.** Players can now confront Avery after the skyscraper car chase instead of always being sent straight back to the mansion garage.

- Immediate and delayed confrontation variants exist depending on how the chase itself ends.
- Avery's response changes based on love and rage: Avery may punish the player, blame them, brush the situation off, or offer manipulative comfort.
- The scene accounts for your current speech attitude, pregnancy, and any existing Avery mansion punishment routes already in progress.

**Saved Avery's housework and adoption:**

- Saved Avery now gains rage more slowly from failed housework, and forgives missed cooking entirely rather than holding a grudge over it.
- Saved Avery focuses more on keeping the mansion clean, and now hints that they enjoy gardening — the mansion garden description reflects that care.
- When saved Avery would previously explode over housework, they now sometimes catch and stop themselves instead.
- **Avery can adopt the player into the mansion** if Avery is selected as your love interest in the Social Menu.
- Avery can update the mansion greenhouse once you ask while Avery is in the garden. This becomes available one month after you unlock the greenhouse; if you had already unlocked it before this feature existed, you can ask immediately.

**Avery's dungeon and boutique:**

- The free-choice menu in Avery's dungeon now grants masochism points, since it's an actual choice for the PC. Other dungeon entry points do not grant masochism points, because they don't offer a real choice.
- The boutique jewellery event's first trip is now guaranteed once Avery has **80 love**, **20 dominance**, **rage 5 or below**, and you return before **22:00**. Repeat trips have a **1-in-20** chance under the same conditions.
- Avery's garden now offers separate **Steal oranges** and **Steal plums** options, alongside the general forest plum/peach encounter described in [Section 14](#14-events-locations--farming).

**Scheduling and fixes:**

- Morning school pickups now have only a 50% chance and can happen at most once per day; afternoon pickups are no longer guaranteed on Mondays (Mondays keep a higher chance, but it still has to pass its normal roll).
- Avery's Saturday street-date invitation now requires Avery to have been properly introduced — completing the science project alone no longer makes an unknown Avery act familiar with the player, though an unknown Avery can still correctly reach the day-20 introduction event.
- Redundant Avery NPC generation after the bank-card conversation, and after the car chase, has been cleaned up.
- Avery's consensual sex scene no longer spawns the broken "mysterious stat creature."
- Bank gala time progression and sudden time-jumps during Avery's party events have been fixed — the party now waits for the appropriate time instead of dragging you forward with the clock, and gala scheduling has an eight-party cooldown with a reduced 30% invitation chance (down from 33%).

### Robin

Robin has expanded relationship and X-Change content.

- You can break up with Robin.
- Robin can later become a sexfriend.
- If Robin's love and lust are high enough, Robin may be tempted into sex before becoming lovers or sexfriends if both bathe together.
- Robin's lust increases daily while sexfriends.
- Robin also becomes hornier each passing day that your beauty remains above vanilla limits.
- Robin's debt scene at the docks now has Robin pilled.
- X-Change has been loosely integrated into Robin's crossdressing event chain.
- Robin's kitchen loft event should now appear as a daily event around **7–8 a.m.**
- Some Robin scenes account more cleanly for sex-friend status in current play.
- If you own a console, Robin can interact with the virtual-pet system through arcade/date content.
- Robin can give booster packs for the virtual pet, with the weekly chance improving through the console route.
- Robin's Water Dragon reaction requires Robin to have console-related content unlocked.
- Robin can teach the player a drink recipe through a one-time orphanage kitchen event. The recipe is seasonal: lemonade in warmer seasons, hot cocoa/hot chocolate in winter.
- Robin's weekend stand now has a fuller progression loop. Lemonade and hot cocoa share a stand-upgrade system with **4 tiers** and **24 upgrades**.
- Stand income depends on tier, upgrades, Robin's serving skill, weather, and temperature.
- You can fund stand upgrades at the stand and train Robin's serving once per day.
- Once rent pressure is under control, Robin can save and buy stand upgrades independently.
- Helping at the stand, paying rent, and giving Robin a real money cushion can push Robin toward independence.
- Handouts solve immediate pressure but can hurt confidence. Earned progress and stand success build confidence.
- If the stand earns more than **£2,000** in a week while Robin is carrying debt, Robin can confront Bailey during rent and take the payments back. After that, rent returns to normal and Robin can share stand profits.
- You can give Robin money directly in their room once you know about their debt.
- Robin's debt can be learned earlier by overhearing orphans in the main hall if Robin's love is at least **40**, which can unlock taking on Robin's debt before the docks scene.
- Robin now has a dedicated reaction to the player's X-Change use, alongside Whitney's.
- Robin's crossdressing scenes now use the correct gender references after the player has X-Changed, fixing a mismatch that used to appear once your body no longer matched your starting sex.
- Redundant Robin NPC generation when discussing the stand business has been cleaned up, along with the related link.
- Bailey's street shakedown can now drag Robin in and sell him the same way a home confrontation can — see [Bailey](#bailey) above. Staying out in town no longer lets you dodge that outcome.

### Sydney

Sydney has dedicated X-Change pilling support in encounters.

- Sydney can be fed X-Change pills during supported encounter states.
- Sydney has reaction lines for drawing, taking, and being reshaped by pills.
- Devout and corrupted Sydney can react differently.
- Herm pill outcomes have special support.
- Because Sydney is a Named NPC route with purity/corruption states, pilling them can feel more route-specific than pilling a generic NPC.

### Kylar

Kylar's route timing, obsession behaviour, and X-Change interactions have been adjusted.

- Kylar requires more love before becoming stalkerish.
- Kylar no longer gets jealous when the player sits with someone else at the cafeteria unless Kylar loves the player.
- Early Kylar is less psychotic and requires actual player interaction and engagement before obsession develops.
- Late Kylar remains dangerous.
- Kylar will attempt to have sex with the player in their sleep rather than only masturbating on top of them.
- Kylar can take pills of their own volition during the abduction event, and sometimes when horny, if you are currently a different sex than Kylar.
- You may be able to let Kylar pill themselves, stop them, or do the pilling personally if circumstances allow.
- Stalking signs are clearer for observant or traumatised characters. Players with **Sharp Eyes** or **Dragon Eyes** can notice when Kylar is stalking them.
- Players with high awareness and high trauma can also notice the stalking, while other players may only hear footsteps.
- Kylar now correctly recognises the player's anatomy after undressing them, preventing pregnancy-related dialogue from appearing when it doesn't actually apply to your current body.

### Remy

Remy has additional Choice-pill and spiking content.

- Remy may attempt to spike-pill the player.
- Remy spike effects only apply if **Enable non-con pill spiking** is enabled.
- If that setting is disabled, the scene may still mention swallowing a pill, but no X-Change effect is applied.
- Remy will not spike the player into X-Change while pregnant unless you are already X-Changed.
- Remy may use Choice pills at the underground farm, which can require Wren's cooperation to acquire the Reversal pill.
- **Remy's Livestock Milking Obey scene was reworked.** The pill now gives the player a hermaphroditic body instead of simply reversing their sex, and Remy mixes in growth formula that immediately increases breast size by two stages (unless already maxed). The scene ends with Remy declaring the player "milkable at both ends."
- Remy now recognises and reacts to an Ivory Wraith brand on the player, where previously the branding went unacknowledged.

### Wren

- Wren can be paid to passively **sabotage Remy** for one attack. If the arrangement isn't renewed after that attack resolves, it lapses until paid again — renewal can also be covered automatically through an HBSC standing order if you have enough savings.
- Wren's Blackjack game can become riskier through X-Change pill consequences, so a losing streak there can carry pill risk on top of the usual stakes.

### Briar, Harper & Re-Virginity

Briar and Harper have more X-Change-adjacent route content in current play.

- Briar's Premium Pill route remains one of the clearest ways to access controlled X-Change outcomes, but it can lead into dangerous captivity content if you follow the wrong branch.
- If a virginity test catches the player out, Harper can offer a temporary restoration that leads into Briar's **Re-Virginity / Second Debut** show instead of a simple punishment.
- The show is built around five endurance trials. Each trial is safer if you keep orgasms under control.
- Completing all five trials can restore virginity and unlock the Second Debut outcome.
- Partial success can still pay out, while very poor performance can hand the player over to the crowd.
- The route is weekly-gated, so it is not something you can immediately repeat every day.
- A full successful Re-Virginity outcome now restores purity more completely. This can matter for angelic transformation routes that require purity to be genuinely restored, not only cosmetically repaired.

### Poppy

Poppy is a **modded Love Interest.** The route is still newer than the vanilla LI routes, so this guide keeps the notes focused on confirmed support, scheduling, display behaviour, and relationship-state handling instead of trying to list every scene outcome.

Current player-facing notes:

- Poppy has **Mod LI support**, but you need to turn them on in the settings before their love-interest content becomes available.
- Poppy has **adaptable display support**, allowing their image to change depending on the event.
- Poppy has a Christmas event that can trigger if the player celebrates Christmas with another orphan.
- Poppy can now be available during winter.
- Poppy has pregnancy-related content.
- Poppy's math study event can involve stimulant use in their flat.
- Poppy can let you temporarily stay at their flat, but this may require progressing Poppy as a love interest first.
- Poppy now visits Bailey from **7:00 AM** on weekends and school holidays, with each visit lasting a randomised **25–60 minutes**. Bailey's normal office interactions only become available after Poppy's visit ends, so expect a delay before you can approach Bailey directly on those mornings.
- **Poppy is now available during Realistic Childbirth content** and has additional pregnancy conversations beyond the original set.
- Poppy checks the baby's actual paternity before claiming to be the father — if another character or creature caused the pregnancy, the player can correctly explain the child isn't Poppy's, and Poppy responds supportively instead of wrongly claiming it.
- A save-migration bug that could reset Poppy's anger from 0% back up to 1% (blocking the switch over to Patience) has been fixed.

Poppy's stat decay:

- **Non-LI Poppy** no longer has stat decay.
- **LI Poppy** does not decay if the interaction check passes.
- **LI Poppy** loses 2 stats if the interaction check fails.

> For more information about Poppy, check the dedicated Poppy channel in the DoL Plus Discord server.

### Gwylan

Gwylan is the mystical/ritual-flavoured route tied to Realistic Childbirth, special clothing, and animal pet-naming flavour.

- **Realistic childbirth** was added to Gwylan's birth scene, with expanded speech throughout, and portal effects can no longer trigger sexual encounters while realistic childbirth is in progress.
- Gwylan's fluid-collection requests now give **two samples** if the same NPC orgasms twice in one encounter. A single orgasm still gives one sample, and further orgasms beyond the second do not increase the reward.
- Gwylan has added pet names specific to bunny, bear, and water dragon transformations, on top of the existing set.
- **Special Clothing rank 3** (bought through the Feat Boost shop, see [Section 18](#18-feat-boost-shop)) correctly unlocks the promised costume stories for Gwylan's dialogue progression — a prior bug could let this content stay locked even after purchase; existing saves repair themselves automatically once loaded.
- A prior save-migration bug that could accidentally unlock the sage witch hat has been fixed. Players who legitimately earned it through Gwylan's ritual scene keep it; players who haven't unlocked it yet still need to earn it normally.

### Riley & the MMA Gym

Riley and the MMA Gym have been reworked from their DoLP origin.

- MMA Gym interactions should feel more alive.
- Riley's stats appear in the NPC social menu alongside new interaction content.
- The MMA Gym now includes a changing room and shower area.
- Sparring scenes between regulars have been added, making the gym feel more active outside the player-only training loop.

### Wraith & Underwater Prison

The Ivory Wraith and underwater prison content can interact with X-Change systems, including body changes and special encounter logic.

- Wraith content has modded settings under NPC settings.
- The underwater prison route can remember compound and prison progress more cleanly in current play.
- Treat Wraith as a route with its own toggle and pacing rather than as a generic random encounter.

### Miscellaneous

- Jordan may react when spoken to at the temple if the player has a divine transformation, and now refuses to let a pregnant player enter the trial of fire.
- Whitney may gain love from being made to orgasm during reverse rape.
- Sirris class has an avoidance event that can let the player slip out of Leighton's inspection, though the first inspection remains unavoidable.

---

## 14. Events, Locations & Farming

DoLX adds or expands several event, farming, utility, and location hooks beyond the core pill systems.

### Beach Party, Landfill & Resistance Content

- Beach party events have additional flavour.
- A Resistance-focused whoring event exists, though it should not be served to pregnant PCs.
- Resistance whoring uses a promiscuity gate with possible bonuses from alcohol, hallucinogens, and Innocence.
- The landfill has new events where the player may be spiked with X-Change pills.
- More general sexual-event bypasses have been added for PCs who are too innocent or too drunk to meaningfully participate, so those states can shortcut past scenes your character genuinely wouldn't understand or handle.

### Bus & Public Encounter Notes

- Bus chikan molesters may leave before making the player orgasm if the bus reaches their stop.
- Street cat-call encounters now have more varied dialogue.
- The street money proposition event has had some RNG removed so that branch behaves more consistently.
- The well-dressed man on a bench street-seduction event now has a variant: he may be offering an honest, no-strings-attached encounter instead of always hiding a camera in the hotel room. His opening description subtly hints at which version you've been offered, and higher Skulduggery increases the chance of getting the honest version — so perceptive characters benefit from their awareness instead of being locked out of the safer outcome.

### Street & Utility Events

Small utility events can matter when you are routing daily play.

- Condom vending machines can be kicked. This takes a few minutes and may rarely give a worn-looking condom, but often gives nothing.
- The action is not a reliable condom source and should not be treated like a shop. It is also not treated as a crime.
- Some private or captive locations have more masturbation support, including the Asylum, Prison, and Great Hawk Tower. Tower access depends on the tower pool state.
- Demon players on the pirate ship can find a daily group-sex event.
- After Alex's woodland upgrades and the right farm conditions, pigs or pigpeople can show special attention. This sits alongside the horse/centaur style attention content and depends on the animals being available for the day.

**Loitering is now a proper timed action** instead of a single fixed wait.

- You choose how long you want to loiter instead of it always taking the same amount of time.
- You can be interrupted while loitering; when an interruption happens, the waiting period ends immediately rather than running out the full chosen duration.

**Prison** now has more to do besides waiting out a sentence.

- A **meditation** option has been added in prison, using the same mechanic as the lake meditation spot.
- A random **prison fight event** can occur, and its outcome can either raise or lower your prison respect.

### School, Soup Kitchen & Study

School and temple-adjacent town content now have more small progression hooks.

- The **soup kitchen** can be found on Wolf Street once discovered.
- On school days, it opens after school.
- On weekends and holidays, it opens from the morning.
- It closes at **21:00**.
- Helping River at the soup kitchen can grant **Grace** and housekeeping-related progress.
- Class study and socialising events can now give clearer subject rewards and status changes.
- Some Science, Maths, English, History, and Housekeeping class content can include X-Change-themed lessons or reactions, especially when the player is visibly X-Changed.
- A weekly temple charity event can appear in the orphanage main hall after the soup kitchen route is established. It has a **60%** weekly chance when the soup kitchen has been discovered, the River/temple loft kitchen is installed, and soft world corruption is below **30**.
- **Soup kitchen charity:** when world corruption is low, a stranger may come by to donate to the orphans — the player included.
- A new **school hallway event** lets other students sense the player's divine transformation, giving Angel/Fallen Angel players a school-specific reaction to their transformed state.

### Math Dildo Event

The infamous math dildo event was expanded and can interact with special character states, including demon PCs.

### Forest Finds & Hospital Lube

- A random forest encounter can now turn up wild **plum and peach trees**, adding another foraging option alongside existing forest finds.
- The hospital pharmacy sells a separate **three-use lube tube**, distinct from the five-use adult-shop lube bottle. Lube tubes are stored separately from bottled lube and cannot be used to refill the brothel vending machine. Combat now correctly consumes whichever lube type you're actually carrying and removes the right container once it's empty.
- Tomato gain is now colourable in the Flats job, matching how other job-colour flavour text works elsewhere.

### Water Dragon

A **Water Dragon** transformation has been added as a full animal transformation route.

How to build Water Dragon points:

- Buy **Lilac earrings** from the forest shop. They cost **£250** and are found with the forest-shop earrings.
- Wear the Lilac earrings to stop Water Dragon build from decaying.
- During the day, swim in the ocean and look for an island with something shiny on it.
- Investigating the island can reveal a blue necklace.
- **Drop it to the water** to gain **+5 Water Dragon build**.
- Taking the necklace gives stolen-value money but lowers Water Dragon build instead.
- Full Water Dragon needs **50 build**, so it normally takes ten successful necklace drops if you do not lose progress.
- There is no daily counter cap on the necklace event. You are limited by ocean RNG, daylight, and night ending ocean exploration for the day.

Transformation milestones:

- Early build unlocks the first draconic changes.
- Around level 2, Water Dragon gains fangs, Sharp Eyes, and Dragon Eyes support.
- Later levels unlock horns, ears, tail, and the Leviathan-style draconic trait setup.
- At full transformation, Water Dragon unlocks **Aquatic Lungs**, **Dragon's Grace**, and the permanent Water Dragon transformation state.

What Water Dragon does:

- **Dragon's Grace** increases athletics and swimming ability.
- **Aquatic Lungs** reduce underwater oxygen loss. Ordinary water actions spend more oxygen; Aquatic Lungs lowers the drain significantly.
- Water Dragon has the strongest cold tolerance among beast transformations, but becomes slightly worse in heat.
- Reaching the final Water Dragon manifestation, including through cheats, applies the original tan-based Lilac, Purple, or Blue/Cyan skin automatically. The mirror's **Water Dragon Skin** dropdown lets you keep your normal skin or lock in Lilac, Purple, Blue/Cyan, or Soft Pink. Lilac uses the original transformation's lightest shade.
- Water Dragon has its own claws and Scratch text, and uses the current Scratch rebalance.
- Water Dragon horns count properly as horns for horn-related checks and effects.
- Full Water Dragon, full effective Water Dragon, or active Aquatic Lungs can unlock a direct swim route to the island without needing pirates. The crossing is still a serious journey and takes about a week.
- Full/aquatic Water Dragon characters can receive Water Dragon-specific island events, including home, language, tidepool, spring, carving, and moon-related events.
- Water Dragon lore can also appear in island defeat and spear-related content.
- The island elder's Water Dragon lore has been expanded, and a previously missing Water Dragon travel link has been restored.

Dragon Eyes:

- Dragon Eyes are available at the mirror, including for old saves that gained Water Dragon before the trait was added.
- Dragon Eyes combine Sharp Eyes with the esoteric trait from special clothing.
- They grant **+5% skulduggery**.
- They make the player always see hallucination/esoteric content regardless of awareness, trauma, or hallucinogens.
- Sharp Eyes or Dragon Eyes can also help notice some stalking signs, such as Kylar following you.

Water Dragon chimeras:

- **Water Dragon + Demon** can unlock **Bakunawa**.
- **Water Dragon + Angel** can unlock **Ryuujin**.
- **Water Dragon + Angel + Harpy** can unlock **Melusine**.
- Chimera visuals are mirror-controlled hybrid appearances. They do not erase the base transformation points.
- The mirror can also pick unlocked transformation titles/descriptions for hybrid states, including special chimeras and generic celestial-animal combinations.

### Virtual Pet Console

The furniture shop sells a **console** for **£50**. It includes a virtual pet system that now has care, training, battles, evolution, elemental pet collection, dungeons, and blood moon risk.

Core loop:

- Feed, play, clean, rest, and cure your pet to keep it alive.
- Neglect can kill the pet.
- Training is daily. Every few training sessions, the pet can learn or improve skills.
- Weekly attacks start turn-based battles with Attack, Guard, Rest, and MP skills. Later enemies hit much harder against fully raised pets.
- Winning battles increases pet stats.

Starter pets:

- **Embit:** fire, evolves toward Blazilisk.
- **Pudduck:** water, evolves toward Pondswan.
- **Sprout:** grass, evolves toward Oakguard.
- **Voltpup:** electric, evolves toward Thundrover.

Progression and danger:

- Pets have stat caps: **HP 5000**, **MP 2500**, and **ATK/DEF/SPD 500**.
- Evolution greatly raises stats and opens harder content.
- After evolution, weekly attacks can include minibosses.
- Minibosses can drop dungeon keys.
- Dungeons are 15-tile runs with enemies, money, fruit, rare pills, and other rewards.
- A monthly blood moon boss can appear. If the boss is not defeated within the week, your pet can die.
- Once every living pet in your collection reaches the stat caps, you can adopt another pet from an uncollected element.
- Fully grown pets look after themselves: no more feeding, cleaning, or sickness. Weekly attacks and the blood moon boss still threaten them.
- You can eventually collect all four elements. In battle, one living benched pet can tag in if the active pet falls.
- Active pets can be switched more freely once you have a collection, and one benched pet can back you up during combat.
- Type matchups matter more in newer pet combat. Bosses and later enemies are stronger, and Rest is less useful as a way to stall forever.
- The blood-moon Mirror boss is especially dangerous: it copies attack skills, can heal twice, and can revive once.
- Robin may help care for your pet during the captive bad end if Robin's love is high enough. Pet-care time is slowed in that state, so captivity is less likely to erase the whole pet route instantly.
- Robin's pet-sitting also covers the island arc: pirate abduction, time on the island, and the water-dragon crossing.

Robin and boosters:

- If you own a console, Robin can interact with it during arcade/date content.
- Robin can give virtual-pet booster packs, with a weekly chance that improves through the console route.
- Booster rewards can include stat items, HP/MP recovery, rare skill options, and **Elixir**.
- Elixir can revive a dead active or benched pet once.
- Some skills, such as Revive, can also save a pet during battle.

### Bear Transformation and Honey

Bear-transformed players are naturally drawn to honey.

- Bear transformation increases the chance of finding honey in the forest.
- Bear-transformed players can find honey regardless of honey-related settings.
- Bear-transformed players can harvest honey more easily.

### Daydreaming

Daydreaming is more useful as a small recovery option.

- All daydream choices now reduce fatigue by a small amount: currently **15 fatigue** instead of the old oversized recovery.
- Some special daydream events can also reduce stress or apply other additional effects.

### Moor Harpy Tailwind

The moor's instant tower-flight event is more specific now.

- The random tailwind event that flies the player to the tower requires **Great Hawk syndrome** first.
- Full Harpy / Great Hawk travel still has strong moor movement flavour, but the tower shortcut should no longer appear for characters who do not meet that route condition.

### Maps & Search Helpers

- Hawk hunting has a minimap to help search for special items and events.
- The catacombs in the old churchyard have a minimap.
- The sewers have a minimap, including an Antique Weekly Reader detector.
- Tentacle Plain has a minimap with exit paths and a pepper spray detector.
- Forest, Moor, Smuggler Cave, and Sea minimaps have been added.
- Dock sneak now has a minimap.
- Full Harpy / Great Hawk routing can interact with Moor RNG travel, making tower travel more common once the relevant syndrome/route conditions are met, while preserving normal moor events.
- Some minimap clues are gated by **History B**. Basic geometry and the **YOU** marker still help navigation, but prize icons, antique-style detectors, special markers, and some helpful labels may stay hidden until you know enough history.
- This can affect places such as hawk hunts, sewers, room labels, Tentacle Plain spray/exit clues, beach cave markers, sea travel, dock routes, and island-related markers.

### Crop Progress, Clovers & Loft Cooking

Farming and orphanage food support have more tracking and interaction.

**Crop Progress** appears as a foldout under the Jobs statistics section. It lists currently planted crops by location, plot number, crop name, watering state, and days remaining until harvest. Exact harvest estimates are shown when blind stats are disabled, or when you have enough tending skill or the **Green Thumb** background.

Additional crop locations can appear through routes. After Avery is saved, the mansion garden can unlock a sheltered crop plot that behaves like a greenhouse-style growing space.

**Clover patches are now actual searchable objects.**

- Regular clover yield is affected by tending skill.
- Four-leaf clovers are rare finds and can award a feat.
- Regular clovers and four-leaf clovers are proper items with icons.
- Clovers can be sold.
- Gwylan may request clovers.
- Clover patches give players a natural reason to interact with them before discovering their Bunny transformation relevance.

**The kitchen loft can also unlock weekend cooking lessons with the orphans.**

- The feature becomes available after the kitchen loft has been unlocked.
- On weekends, you can teach the orphans how to cook through a minigame.
- Successful lessons let the orphans begin using the kitchen to provide their own food.
- You can donate food or ingredients.
- Donated food and ingredients may be eaten or used by the orphans for cooking.
- You can cook together with the orphans using donated ingredients.
- Cooking together can raise hope and rebelliousness weekly.

### Transformation Income Bonuses

Several animal and divine transformations now give a direct income bonus tied to their theme, stacking with each other and with other buffs:

| Transformation | Bonus                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| Water Dragon   | Can breathe underwater; +50% chance to find valuables at the lake               |
| Wolf           | +50% chance to find valuable items in the forest, moor, and elsewhere           |
| Bunny          | +100% income from dancing                                                       |
| Harpy          | +45% to office work earnings and chalet and pound wages                         |
| Bear           | +100% to docker shift and overtime wages                                        |
| Cow            | +50% harvest quantity from planting                                             |
| Fox            | -25% to crime gain and Skulduggery difficulty; +25% selling price for valuables |
| Cat            | +100% income from the cafe                                                      |

Divine transformations were also buffed: **Angels** earn 50% more from ordinary income, **Demons** earn 50% more from dancing and sex work, and **Fallen Angels** earn 20% more from all income. These stack with other bonuses, including stolen goods and fencing, though refunds and transferred funds never count as income.

Skilled and black-market income also got grade-based bonuses:

- Once the governing skill reaches grade **S**, several low/mid-level jobs receive an income bonus starting at **10%** and scaling up to **50%** at grade **SSS**. Income below grade S is unchanged.
- Higher Skulduggery increases black-market sale values, scaling up to double value at grade SSS. Journal estimates now match the actual sale value, and the optional maths-based haggling bonus still stacks with the Skulduggery bonus.

### Farming Yields & Tools

- **Tending** yield improvements: harvest yields increased by an additional **15%**, raising an average harvest from roughly 500 to roughly 575 crops — a 713-crop harvest should now produce around 820.
- **Rugged shoes** increase effective Tending based on Feet skill, and the final harvested quantity gets a further Feet-skill bonus: **+1%** at 100 Feet skill, **+5%** at 500, **+10%** at 1,000, and **+20%** at 2,000.
- The **Crop Yield penalty** setting's cap was raised from 500% to **650%**.
- Harvesting days were shortened across the board: plants taking over 20 days now take 20; 10–19 days now take 10; 5–9 days are reduced by 2; anything shorter is reduced by 1.
- **Tractor bonuses now apply properly to planting and harvesting**: tractor tiers reduce planting/harvesting time by 10%, 20%, or 30%, and seed drills/harvesters give the same additional reduction ploughs already provided.

### Eden Underground Farm Rescue

Eden can sometimes intervene during the underground farm route.

- You may get a chance to call for Eden during the rescue.
- If successful, Eden can arrive to help.
- This works because the underground farm is close enough to Eden's usual territory.

Eden also has form-specific affection support.

- Fully transformed players can show Eden affection in ways tied to their form.
- Cow, harpy, cat, fox, wolf, bunny, bear, and Water Dragon forms have special flavour.
- Lactating players can ask Eden to milk them, with Eden's response depending on relationship and dominance.

### Great Hawk Empty-Nest Memory

Great Hawk / tower child handling is adjusted so dismissed or farewell children are not treated as still present in ordinary nest visits. When all GH children have left, a quiet empty-nest memory moment can occur, giving the player a small stress reduction while remembering time spent with them.

### Bike Travel

Bike travel has been reworked into a more active system.

- Bikes now have proper events and narration.
- Weather, season, and durability can affect travel.
- Biking may be useful or risky depending on conditions.
- If you walk somewhere with a companion while owning a bike, the bike can move with you to the destination.
- Bike repairs at the depot cost **£350** before inflation, so repeated rough travel can become a real expense.
- Biking now gains **Thigh** skill instead of Dancing, and correctly awards its skill point every time. A cycling event intended for the morning no longer also fires at night.

### Smoking at the Loft

After learning to smoke from Whitney or unlocking the relevant loft state, the pub can sell cigarettes.

- A pack costs **£25** and contains **5 cigarettes**.
- Smoking is tied to the loft and can reduce stress.
- Weather, season, time, and blood moon state can change the flavour of the scene.
- Quick smoking options also exist in some other owned or route-safe places, including Eden's cabin, the wolf cave, Alex's farm, the school rear courtyard, and the park.
- Smoking too many times in a row can make the player woozy or worse.
- There is a daily limit before the habit becomes unsafe to keep pushing.
- Skipping cigarettes after building the habit can cause cravings.
- Staying clean long enough can end the craving.
- Smoking can award smoking-related feats and a smoker trait.
- Current smoking does not raise alcohol gain.
- You can no longer smoke while pregnant, though cigarettes can still be bought and stockpiled for after the pregnancy ends.

### Wardrobes & Handbag Inventory

When **isolated wardrobes** are enabled, wardrobes do not all share the same clothes.

- Each changing-room wardrobe is separate from your orphanage wardrobe.
- You can only wear outfits stored in the wardrobe you are using.
- Clothes in your handbag must be moved into that wardrobe before you can wear them.
- Wardrobes also let you tear clothing on purpose.
- Lake and swim outfits stay linked to your home/orphanage wardrobe.
- Wardrobes have a **Favorites** tab. Marking key outfits as favourites makes long wardrobes easier to manage, especially with isolated wardrobes enabled.

### Revived Bad-End & Cut Content

A few pieces of previously unfinished or stubbed-out content have been revived and made reachable:

- The **mines bad-end route** can now be reached through a cheap auction sale.
- A **Dance Job** at the docks has been added, alongside general dancing at the docks.
- Players can now choose to **kiss the Black Wolf** while watching the forest together, an option that previously wasn't wired up.

### Advanced Hair Dye

Advanced Hair Dye expands the hairdresser's dye options, giving you more control over your character's hair colour. It is based on the **Dye Harder** system, so it offers more flexible colour choices than the older basic dye behaviour.

- Gives more detailed hair colour customisation.
- Helps you make original and transformed appearances look distinct.
- Works as a cosmetic feature, not an X-Change pill effect.
- Does not change sex, identity, body shape, or transformation rules.

> Use it when you want more control over how your character looks, especially if you want different body states to have different visual identities.

---

## 15. Settings, Options & Cheat Menu

### Settings & Cheat Options

DoLX adds many new settings and cheat options so players can control how the mod behaves. It also adds more NNPC display options, including restored old display UI, vanilla follower-style display, and gender override support.

You can adjust things like pill frequency, spike pools, Alpha/Omega spiking, Hyper Fertility spike frequency, pregnancy chance while pilled, pilled appearance, Portal content, permanent heat or rut, Gender Identity body changes, combat pill safety, audio, NPC voiceovers, display options, economy rebalance settings, fatigue skill penalties, and pregnancy/childbirth presentation. The cheat menu also includes X-Change tools, including options for special pills, duration controls, and forcing the current pill effect to end.

Newer player-facing settings include:

- **Always show sidebar stat meters**, now enabled by default.
- **Enable lewd stat split**, which keeps Promiscuity, Exhibitionism, and Deviancy separate between bodies.
- **Gray pills also flip your sex**, which turns gray pills from effect-only pills into sex-flipping pills when taken without an active transformed body.
- **Pilled NPCs also change gender**, which decides whether NPC body changes also rewrite their described gender/pronouns.
- **Alpha/Omega spiking preferences**, disabled by default, with their own pool toggles and export/import support.
- **Economy Rebalance Preset**, which can be set to Light, Mid, Current, Hard, or Harsher before fine-tuning the economy sliders.
- **Fatigue skill penalty**, which can make skills lose practical power above 50% tiredness. The maximum loss slider controls how harsh this becomes.
- **Realistic Childbirth**, a pregnancy setting for players who want more detailed labour/delivery handling rather than lighter presentation.
- **Voice per body & identity**, which lets you set player voice rows for different X-Change/body states and mute your own voice if desired.
- Chastity-belt preservation rules for body swapping, so belts/cages adapt more cleanly when the body changes.
- Generic NPC and named-NPC multi-orgasm filters, with **Everyone**, **Women only**, and **Men only** options.
- Wraith/NPC mod settings under the NPC settings area.
- Settings Export/Import covers more DoLX-specific options than before, including Alpha/Omega spiking preferences.
- Some late-route cheats include Great Hawk Tower shortcuts, such as materials, valuables, or completed upgrades once the relevant tower content is available.
- Avery route cheat options are also broader than before, useful for testing or recovering route states without replaying the entire route.
- **Random game mode** now recursively randomises all registered toggles, sliders, and choices — currently covering **446 settings** across X-Change, combat, AMC, economy/inflation, rebalancing, fetishes, identity, UI options, and more. Use it if you want a genuinely unpredictable ruleset rather than hand-picking every option.
- A **Gender-Anxious** entry was added to the cheat menu, and the previously broken **Cock Addict** and **Hole Addict** cheat-menu entries were fixed.
- A cheat-menu **teleport to the park** option was added.
- A **minimum breast size to lactate** setting controls how large the player's chest needs to be before lactation content becomes available.
- A **Double Semen/Milk Production** toggle doubles the relevant fluid output for players who want that exaggerated.
- Settings include the **Show post-encounter summary**, **Limit group encounters to one shared orgasm**, and **Moan/grunt** toggles described in [Section 3.3](#33-orgasm-behaviour), plus the **Breeder and Fertility Settings** block described in [Section 1.3](#13-single-variant--special-pills) and the **Resist heat with willpower** and **Enemy Damage Multiplier** settings described in Sections [3.2](#32-arousal--pleasure) and [8.7](#87-advanced-combat-rebalance).

> Use cheats carefully, especially on saves with pregnancy, permanent transformations, identity changes, or active route content.

Check the settings and cheat menu if you want more control over how often X-Change content appears and how risky it becomes. Duration controls are especially powerful: a pill that normally feels like a short accident can be turned into a one-month or permanent route if you choose that style of play.

### Alternate Spritepack for X-Changed Bodies

The game can use an alternate spritepack for the X-Changed sex.

**Basic setup:**

1. Supply an `img2` folder for the alternate spriteset.
2. Install the desired alternate body/clothing spritepack into `img2` according to the pack's instructions.
3. In game, go to **Options > Performance**.
4. Enable **Use alternate spriteset when gender is:** and choose which option should use the alternate pack.

A newer option lets you **always use the alternative spriteset** where one is available, regardless of your current body — useful if you prefer the alternate pack's art style outright rather than only while X-Changed.

Current DoLX keeps some folders shared with the main image set. Images under `decorations`, `sex`, `ui`, and `misc` are read from the normal `img` path rather than being redirected to `img2`. In practice, `img2` is for the alternate spritepack, while those shared non-body folders stay in `img`.

> The option label may still use "gender" in-game, but the practical use is to swap spritepacks based on the current X-Changed body.

---

## 16. Chastity Devices

Chastity content has grown from a simple lock-the-genitals gag into a small system of its own, with sources, escalation, and dedicated reactions.

**What a device actually does:**

- Any chastity device — belt, cage, or trapped parasite — now **drastically slows arousal fade**, can **occasionally spike arousal** on its own, and **reduces the relief gained from orgasming while locked**. A chastity device is not just a genital lockout; it actively works against you the longer you wear it.
- Flat and small shrinking cages also **raise minimum arousal** while worn, on top of the fade/relief penalties above.
- A dedicated **dildo chastity belt for vaginas** provides constant internal stimulation and increased sensitivity while worn — this is separate from Whitney's dildo-belt punishment below, though it works the same way mechanically.

**Sources of chastity:**

- **Whitney** can fit a constantly-stimulating dildo chastity belt when Whitney's school chastity rule applies to a body that has no penis to lock up conventionally.
- Being caught by **the Pound** can result in a forced chastity device, with a higher chance if the player's current body doesn't match how they present (i.e. the Pound is more likely to lock you up if it thinks your presentation is misleading).
- **Swarm encounters** can leave a parasite trapped inside a chastity device. A chastity-trapped parasite raises minimum arousal, stimulates the player more often than an ordinary parasite, and can be properly cured at the hospital.

**Jordan and device removal:**

- Jordan will refuse to remove a monk or priest's chastity device if it belongs to someone else, if the player's personal standing is insufficient, or if their reputation in town is too poor.
- A new **"Pray for guidance"** option can improve standing and town reputation over time, giving you a path to eventually qualify for removal instead of being permanently locked out.

**Social and body reactions:**

- Changing-room taunts and general body comments now react to chastity more specifically, with distinct lines for belts, cages, and trapped parasites rather than one generic "you're locked up" reaction.
- Chastity devices adapt more cleanly when the player's body changes underneath them — belts and cages are preserved and resized across body swaps instead of desyncing or falling off.
- Chastity also interacts directly with heat and forceful-heat behaviour: see [3.2 Arousal & Pleasure](#32-arousal--pleasure) for how a locked character responds to heat, including removing concealing clothing, struggling against the device, or gradually damaging it once every eligible hole is locked.

> Chastity is no longer a simple binary "can't touch genitals" flag. Expect it to actively fight your arousal management the whole time it's on, with real routes both into it (Whitney, the Pound, swarm parasites) and out of it (the hospital, Jordan's removal, or breaking the device through forceful heat).

---

## 17. Brothel, Strip Club & Dance Classes

The brothel and strip club were reworked into two clearly separate venues, each with its own specialty, instead of overlapping general "sex work" locations.

### Brothel

The brothel now focuses on **approaching patrons, conversation, seduction, sexual skill, private services, and appointment auctions.**

- Ordinary brothel dancing is **no longer a repeatable source of income**. It now only appears as the preview stage for an auction.
- An **auction preview** must continue for at least **15 in-game minutes** and reach the required danger threshold before the auction can proceed.
- The auction itself includes a separate **Seduction-based negotiation attempt** to push for a higher bid.
- Only **one auction can be completed per day**.
- Fluids can now be collected through quick actions at the brothel.
- **Leighton and Briar remain exclusive to brothel dancing.** Robin can appear at either the brothel or the strip club, sharing one weekly lock between the two venues.
- Skipping or ending a paid sexual service early now angers the patron, cancels the payment, and applies the associated stress and pain — treat accepting a service as a commitment, not a scene you can freely bail from.

### Strip Club

The strip club is now the **main repeatable dancing venue.**

- Strip-club dance tips receive a **3x venue multiplier**. Dancing anywhere else — including the brothel's auction preview — only retains **25%** of its normal income.
- Reaching **100 audience excitement** and **100 audience arousal** gives each dance cycle a **45% chance** of ending the performance early, leading into the same security/guard ending as stopping voluntarily.
- **Strip-club bartending** pays **£15/hour**, gives better tips and English progression, and scales with both English skill and allure.
- Animal and Divine income bonuses (see [Section 14](#transformation-income-bonuses)) continue to stack with whichever venue multiplier applies.

### Dance Classes

Dance classes were reworked alongside the venue split, adding more structure to how dancing skill actually improves:

- Rebalanced with training choices, subscriptions, injuries, and mastery bonuses.
- An optional **skill upkeep** toggle lets dancing skill decay if it isn't practiced enough — turn it off if you don't want to maintain the skill actively.

> If you're chasing dancing income specifically, the strip club is now the venue to camp; the brothel auction is a once-daily high-value event, not a repeatable grind.

---

## 18. Feat Boost Shop

The Feat Boost shop (spend accumulated **VrelCoins** on permanent starting/character-wide perks) was reorganised and expanded with new purchasable options.

- Choices are now reordered and grouped by type: skill boosts, characteristic boosts, transformation boosts, and trait boosts each sit together instead of being mixed in one long list.
- Improved trait tooltips, purchase limits, refunds, and mobile layout.

**Notable additions:**

- **Sadist** and **Masochist** starting traits, **23 VrelCoins** each.
- **X-Change Purity**, **150 VrelCoins** — permanently neutralises X-Change pill effects on your character while still allowing pills to be administered and recognised by events. Useful if you want to experience pill-related content and reactions without ever actually being transformed by them.
- **Special Clothing rank 3**, at double the price of the earlier ranks, unlocking the matching Gwylan dialogue progression (see [Gwylan](#gwylan) in Section 13). Existing saves that had already unlocked the greenhouse-tier content before this fix are repaired automatically on load.
- **A Special Trait**, **20 Vrel Coins** — lets some feat-supported sexual/role traits be taken in boosted forms at character creation, useful for builds around traits such as Orgasm Addict, Asphyxiophilia, Cum Dump, Plaything, Fucktoy, Bitch, Prey, or Milk Addict from the very start.
- The **Hopeless Cycle "buy an ending"** option remains available here: spend VrelCoins to skip the sequence and read a bought ending from the painting for its prize instead of playing the full sequence out.

> Treat the Feat Boost shop as your character-creation-adjacent "build" tool — most purchases are permanent and meant to be decided once, not something you'll be reshuffling every session.
