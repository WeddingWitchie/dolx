# Economic inflation

Prices rise as the player gets richer. This page covers the price system, Bailey's wealth-driven rent, the bank loan ("rent money"), the bank card, and the money cap. It also says what to keep intact when vanilla changes a shop, a price or the rent.

## Rule 1: vanilla wins

When vanilla changes a shop, a price or the rent system:

1. Port the vanilla change as written and understand it first.
2. Reapply only the smallest inflation adjustment still needed.
3. Do not replace a new vanilla pricing flow with an old X-Change copy.
4. Keep vanilla prices, shop logic and rent progression. Inflation is a multiplier on top. It never owns a base price.
5. If vanilla adds its own price helper, route inflation through it instead of duplicating it.

Base prices stay vanilla. Inflation only touches the moment money is charged and the moment a price is printed.

## Goals

- A rich player should not find the city trivially cheap.
- It is dynamic. Spend down and prices fall back through the tiers. Bailey's extra rent pressure clears when his visible-wealth trigger is no longer met.
- The printed price and the charged price always agree. One rounding function is the source of truth.
- Money in the bank still counts as wealth. Borrowed "rent money" does not, because the cash you get is cancelled by the principal you owe.
- Inflation applies to prices the player pays. Never to income, wages, gambling stakes, cheats or bank transfers.
- Bailey's rent reacts to wealth and debt, with caps and special demands at extreme wealth. Past the chosen stage he stops accepting refusals and hunts the player.

## Money units

All money is stored in pennies. Displayed pounds are `value / 100`. Every threshold here is a raw penny value: `100000` is £1,000, `1000000` is £10,000. Item prices are small (a common item is a few thousand pennies), so thresholds are kept in raw units.

## Saved state

General price inflation has no saved state. The multiplier is recomputed from current wealth on every read, so there is nothing to migrate.

Saved values that do exist:

- `$baileyRentInflationSteps`: Bailey's built-up rent pressure. It goes up one step after a successful rent payment while Bailey-visible wealth is at the trigger, and is cleared as soon as that wealth falls below it. Rent never jumps the moment the player gets rich, and old pressure does not linger after they get poor.
- `$hbsc.loan`:
  - `owed`: what is left to repay, with interest, in pennies.
  - `lastPaymentDay`: `Time.days` of the last borrow or repayment. Drives the overdue clock.
  - `autoRepay`: once true, Bailey collects a weekly surcharge through the rent.
  - `baileyAnnouncePending`: shows the one-time "the bank contacted me" line.
  - `action`: temporary UI selector for the loan passages.
- `$settings.inflation*`: the economy settings (see below).
- `$hbsc.card`: the bank card (see [Bank card](#bank-card)).

Three short-lived flags drive the street hunt: `$baileyStreetHuntPending`, `$baileyHuntReturn` and `$daily.baileyHuntBroke`.

## Two wealth figures

```
inflation wealth  (totalWealth)  = cash + savings + ALL fixed-term principal + prepaid Bailey deposit - loan principal
Bailey-visible    (baileyWealth) = cash + savings - loan principal
```

Inflation sees everything. Locking money in a fixed term, or prepaying Bailey's rent, still makes the player rich to the economy.

Bailey only sees liquid money. `baileyWealth()` leaves out anything in an active fixed term, so that money cannot raise his rent, bump his tier, or set off his "you've been hoarding" aggression. When a term matures, `setup.hbsc.processDay()` sweeps it into savings (overflow goes to cash if the savings cap is hit). From then on it counts for Bailey too.

Bailey can also only reach liquid money. Rent affordability and forced withdrawals use `setup.inflation.rentPayable()` (cash plus savings). An active fixed term shelters money from him. If cash is short at rent time he marches the player to the bank to withdraw from savings, but never from a locked term.

Borrowing changes neither figure, because the loan cash and the debt cancel.

|                  | Formula                                                                                | Drives                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `totalWealth()`  | cash + savings + active fixed-term principal + prepaid Bailey deposit - loan principal | `multiplier()`, `price()`, `percent()` (the journal economy block), the money cap                |
| `baileyWealth()` | cash + savings - loan principal                                                        | `rentDemand`, `rentDemandTier`, the crisis side of `baileyAggressionReason`, the hoarding notice |

## The API

Everything is in `game/overworld-town/loc-hbsc-bank-branch/inflation.js`, as `setup.inflation`. Values are pennies.

### Tiers

`setup.inflation.TIERS` holds the wealth thresholds. The highest tier the player qualifies for wins, and below the lowest there is no inflation. The thresholds are fixed in code. The percentage for each tier is a setting.

| Net wealth at least | Default increase (Current preset) | Multiplier | Name           |
| ------------------- | --------------------------------- | ---------- | -------------- |
| £500,000            | +11%                              | x1.11      | Onset          |
| £2,000,000          | +35%                              | x1.35      | Bad economy    |
| £5,000,000          | +75%                              | x1.75      | Crisis         |
| £15,000,000         | +150%                             | x2.5       | Extreme crisis |
| £100,000,000        | +1500%                            | x16        | Parody spiral  |

These are stages, not a rate that compounds. A 3,000 item costs 3,330 / 4,050 / 5,250 / 7,500 / 48,000 in those tiers. `setup.inflation.multiplier()` reads the setting-backed percentages.

### Settings and presets

The controls are in **Settings, Rebalance Settings**, in the **Economy Inflation** box.

- **Economy Rebalance Preset**: `Light`, `Mid`, `Current`, `Hard` or `Harsher`. `Current` is the default. `Light` keeps prices low, starts extra rent as late as possible and sets refusal and hunting to Parody. `Hard` and `Harsher` make wealth bite earlier. Each preset is written to `$settings` by `setup.inflation.applyPreset(name)` and can be tuned afterwards.
- **Inflation Percentages**: `inflationOnsetPct`, `inflationBadPct`, `inflationCrisisPct`, `inflationExtremePct`, `inflationParodyPct`.
- **Bailey Triggers**: the **Relentless Bailey** toggle (`inflationBaileyRelentless`), then `inflationBaileyRentPct` (extra rent starts) and `inflationBaileyCrisisTier` (refusal and hunting start; one of `onset`, `bad`, `crisis`, `extreme`, `parody`). Both threshold settings follow the wealth threshold of the tier, not its percentage slider. Relentless overrides them, so they grey out while it is on.
- **Bailey Rent Limits**: `inflationBaileyCapLow`, `inflationBaileyCapHigh`, `inflationBaileyDemandJump`, `inflationBaileyDemandInvestment`. Greyed out while Relentless is on.
- **Bailey Weekly Pressure**: `inflationBaileyStep` (weekly rent step, default £500) and `inflationLoanRentSurcharge` (overdue loan collection, default £1,500).
- `inflationBlackmailRewardPct`: scales Gentleman's Club quest rewards (100% in Light, Mid and Current, 75% in Hard, 50% in Harsher). `blackmailReward()` in `special-blackmail/quests.js` reads it. The reward is based on the base rent, not Bailey's extra pressure.

Inflation is always on. `$settings.inflationEnabled` is forced true and is only reserved for a future toggle. `setup.inflation.ensureSettings()` fills in and clamps every setting for old saves. The min, max and step of each setting are in `SETTING_RANGES`. The settings are also listed for export in `save.js` (see the settings export notes).

**Relentless Bailey** (`$settings.inflationBaileyRelentless`, off by default) makes Bailey bite from the start:

- `baileyAggressive()` is true. He never accepts a refusal and street hunts are live.
- `rentInflationActive()` is true. His weekly rent step climbs from £0 wealth.
- `rentCap()` returns `Infinity`. Rent rises one step every paid week with no ceiling.

Presets never change this toggle. When it is on but the player is not actually rich, `baileyAggressionReason()` returns `"relentless"` rather than `"inflation"`, so he does not claim the player is hoarding.

### Price functions

- `setup.inflation.multiplier(wealth?)`: the price multiplier (at least 1) for a wealth, or the current wealth. Capped at the top tier.
- `setup.inflation.price(base)`: `Math.round(base * multiplier())`. The single source of truth. The `money()` charge and `<<printprice>>` both use it, so label and charge always match.
- `setup.inflation.appliesToSpend(source)`: whether a spend with that source is inflated. False for the sources in `EXCLUDED_SOURCES`: `stolenMoney`, `bankCard`, `baileyRent`, `bankLoan`, `tailorDeposit`, `robinGift`, `estateBetting`, `colosseumBet`, `colosseumDebt`, `silverStrangerFavor`.
- `setup.inflation.spendPrice(base, source)`: the price with the exclusion rule applied. Use it when you need the real charge, for example to remember it for a refund.
- `setup.inflation.canAfford(base, source)`: true if the player's payment balance (cash, or savings when paying by card) covers `spendPrice`.
- `setup.inflation.affordableBase(base, source)`: the largest base amount up to `base` the player can afford at the inflated price.
- `setup.inflation.percent(wealth?)`: inflation as a whole percentage above base, for UI.
- `setup.inflation.isCrisis(wealth?)`: true once wealth reaches the tier picked by `inflationBaileyCrisisTier`.

**Affordability rule.** Any button whose label prints an inflated price must test the inflated price too: `setup.inflation.canAfford(base, source)`, or `$money gte (setup.inflation ? setup.inflation.spendPrice(base, source) : base)`. Testing the raw base lets the player click something they cannot pay for. Wagers that are paid back out of a pot at their raw value (the dice game, the estate ante) must skip the hook so stake and winnings use the same units.

### Rent functions

- `rentDemand(baseRent)`: Bailey's weekly demand, from Bailey-visible wealth. Also called `applyToRent(amount)`, which the `rentmod` widget uses.
- `rentDemandTier()`: `""` (normal), `"jump"` (Bailey-visible wealth at least £10M) or `"investment"` (at least £100M). Drives the special lines in `<<baileyRentFlavour>>`.
- `rentCap(wealth)`, `rentPressureSteps()`, `rentPressureStep()`, `advanceRentPressure()` and the other rent helpers handle the pressure counter and its cap.

Rent caps by Bailey-visible wealth (defaults from the Current preset):

| Bailey-visible wealth  | Rent capped at                                                      |
| ---------------------- | ------------------------------------------------------------------- |
| below the rent trigger | normal vanilla rent (with the rent setting and Robin's double rent) |
| below £1M              | £15,000 (`inflationBaileyCapLow`)                                   |
| £1M to £10M            | £35,000 (`inflationBaileyCapHigh`)                                  |
| £10M to £100M          | £75,000 (`inflationBaileyDemandJump`)                               |
| £100M and above        | £250,000 (`inflationBaileyDemandInvestment`)                        |

Rent does not multiply or leap from wealth. Once Bailey-visible wealth reaches `inflationBaileyRentPct` (default the Bad economy stage), or always while Relentless is on, each successful rent payment adds one step to `$baileyRentInflationSteps`. Each step adds `inflationBaileyStep` (scaled by Bailey's Rent setting and Robin's double-rent state) to next week's rent, up to the cap. If Bailey-visible wealth drops below the trigger, the counter clears and rent returns to normal: £2,000 at 100% rent, or £4,000 with Robin's share.

`setup.inflation.rentMultiplier()` (a smooth interpolation between tiers) exists but nothing calls it now. Rent is driven by the pressure steps above.

### Aggression

`baileyAggressionReason()` returns `""`, `"inflation"`, `"loan"`, `"relentless"` or `"both"`. `baileyAggressive()` is true for any non-empty reason. Bailey becomes aggressive (rent unavoidable, street hunting live) when Bailey-visible wealth reaches the crisis tier, or the player owes the bank, or Relentless is on. He calms down when none of those hold. The crisis check uses `baileyWealth()`, so money in an active fixed term never triggers it until it matures into savings.

## Where the multiplier is applied

Three places. Everything else is base vanilla.

### 1. The charge: `money()`

`game/base-system/stat-changes.js`. Every negative amount passed to `money()` or `<<money>>` goes through `setup.inflation.price()`, unless its source is excluded. The amount deducted is right game-wide, including shops nobody updated.

The surcharge cannot overdraw the player. If they can afford the base price but not the inflated one, they pay all their cash. If they cannot afford the base price, the amount is left alone so the normal affordability error still fires.

### 2. The rent: `rentmod`

`game/overworld-town/loc-home/rent.twee`. After the base rent is set, `rentmod` applies Bailey's pressure with `setup.inflation.applyToRent()`. The pressure counter advances only inside `<<rentpay>>` after a successful payment. Journal previews, deposit calculations, Poppy and Robin paths only read the demand. The same widget renders every path, so the shown rent equals the charged rent.

### 3. The label: `<<printprice>>`

`game/base-system/widgets.twee`. `<<printprice base [class]>>` is `<<printmoney>>` for prices. It prints `formatMoney(setup.inflation.price(base))`. `formatMoney` also sets `_printmoney`, so passages that build a link caption from `_printmoney` get the inflated value once their first price display uses `<<printprice>>`.

## Adding inflation to a priced action

Do all three so charge, guard and label agree:

```
/* 1. Charge: <<money>> with a source. The hook inflates it. */
<<money -5000 "myShop">>

/* 2. Label: <<printprice>>, not <<printmoney>>. */
<<printprice 5000>>

/* 3. Guard: test the inflated price. */
<<if setup.inflation.canAfford(5000, "myShop")>>
```

For a price in a variable, pass the variable: `<<printprice _cost>>` and `setup.inflation.canAfford(_cost, "myShop")`.

Do not use `<<printprice>>` inside a JavaScript template literal (a backtick link caption). Call the function there: `${formatMoney(setup.inflation ? setup.inflation.price(5000) : 5000)}`.

**Systems with their own price engine**, such as the hair dye shop (`game/special-xchange/DoLXAddition/hairDYE/`), work prices out in JavaScript. Keep the charge on `<<money ... "source">>` so the hook scales it, and use `dhmShop.displayPrice(amount)` (which returns `setup.inflation.price(amount)`) wherever a price is printed. Do not inflate twice: if you inflate at the charge, exclude that source. Beware shared sources. The hairdresser's gel and growth-formula purchases reuse `"hairdressers"`, so the dye table is fixed on the display side rather than by excluding the source.

### Never inflate

- Income and wages (`<<money 1200 "cafeWaiter">>`). Never switch an income `<<printmoney>>` to `<<printprice>>`.
- Refunds and reimbursements. Return the exact inflation-adjusted amount captured when the item was charged.
- The balance readout ("You have £X").
- Gambling stakes. Inflating a bet breaks the win and loss maths. These skip the hook with direct `$money` writes.
- Bank deposits, withdrawals and tier top-ups. They move money between cash and savings and write `$money` directly.
- Cheats.
- Rent and loan repayments. They use their own sources (`baileyRent`, `bankLoan`), which are excluded.

A paid action that writes `$money` directly (`<<set $money -= N>>`) skips the hook and will not inflate. Convert it to `<<money -N "source">>` unless it is one of the cases above.

## Bank card

The HBSC card (`$hbsc.card`, code in `bank.js`) lets the player pay from savings for everyday spending. It works by source: `setup.hbsc.cardSources` lists the spend sources it covers (shops, café, pub, clothes, pharmacy, hospital treatments, lessons and similar).

- `setup.hbsc.cardBalance(source)` is the savings balance if the source is a card source, the account is level 1 or higher, and the card is active and preferred. Otherwise 0.
- `setup.hbsc.paymentBalance(source)` is the larger of cash and `cardBalance(source)`. Affordability checks (`canAfford`, the `money()` surcharge clamp) use this.
- In `money()`, a spend the card can cover comes out of `$hbsc.account.deposit` instead of cash.
- A card can be stolen (`stealCard`, `processCardDay`), which drains a capped weekly amount from savings (source `stolenMoney`, record-only). It can be reported, then replaced for a fee (source `bankCard`, record-only). Both sources are excluded from inflation. The theft rules follow the `npcSteal*` settings.

## Bank loan ("rent money")

`game/overworld-town/loc-hbsc-bank-branch/bank.js` (`setup.hbsc.*`). Constants:

- `LOAN_CHUNK` 30,000,000 (£300,000): advanced per request.
- `LOAN_PRINCIPAL_MAX` 100,000,000 (£1,000,000): cap on outstanding borrowed principal.
- `LOAN_INTEREST` 0.5: repay 1.5x the principal.
- `LOAN_RENT_SURCHARGE` 150,000 (£1,500): fallback weekly amount Bailey collects on an overdue loan. Live saves read `$settings.inflationLoanRentSurcharge`.
- `LOAN_OVERDUE_DAYS` 25: days with no payment before collection passes to Bailey.

Borrow in chunks until principal reaches the cap. The last chunk is trimmed to the room left, and repaying frees room. No savings account is needed. `ensureLoanState` is called from `setup.hbsc.ensureState`, and `processLoanDay` from `processDay`. The UI is the `HBSC Bank Loan` and `HBSC Bank Loan Result` passages (`main.twee`) and the `hbscOptions` widget (`widget.twee`).

Loan cash uses the `bankLoan` source. Loan cash, repayments and the rent surcharge are all excluded from inflation.

## Aggressive Bailey

When `setup.inflation.baileyAggressive()` is true:

- The temple and Alex's farm (`temple_bailey_options`, `cottage_bailey_options`) drop the "Refuse" option. `<<baileyGripDemand>>` (`game/overworld-town/loc-home/DoLXAddition/misc.twee`) prints a line for the reason (he knows you are hoarding, or the bank sent him).
- **Street hunt.** `streeteffects` (`loc-street/widgets.twee`) sets `$eventforced` and `$baileyStreetHuntPending` when rent is overdue (`$renttime lte -2`, or `lte 0` during the day, hours 4 to 21) and rent is active. `eventsstreet` then renders `<<baileyStreetHunt>>` (`loc-street/DoLXAddition/events/bailey-hunt.twee`) in place of the normal street links. It fires on every town-street entry until the rent is paid, which resets `$renttime`. A player with no money only triggers it once a day (`$daily.baileyHuntBroke`) so travel cannot soft-lock.
- A one-time `<<rentInflationNotice>>` (the first time inflation is reached) and `<<loanRentNotice>>` show in the rent-due flow.

**Bank withdrawal.** Keeping money in savings does not dodge rent in town. Affordability uses `rentPayable()` (cash plus savings, not locked terms), so the "Pay" option appears when cash or savings can cover it. When cash is short, `rentpay` calls `<<baileyBankDraw>>`. Bailey marches the player to HBSC and forces a withdrawal of the shortfall from savings. This covers the home, street hunt and temple pay paths, and each returns the player to where Bailey interrupted.

**Farm exception.** Alex's farm is too far from the bank. The farm path needs enough cash on hand. If the player is short, Bailey takes the cash they carry as a down payment and threatens Alex's farm.

If cash plus savings still cannot cover the rent, the street hunt's broke branch drains both as a down payment. `<<baileyRentFlavour>>` (called from `rentdue`, `rentduerobin` and the hunt) prints the special demand line at the `"jump"` ("I want more") and `"investment"` ("my best investment") tiers.

## Player-facing indicators

- The `journal` widget (`game/base-system/overlays/journal.twee`) shows an Economy block above the world map: stable, the current `+X%`, or a crisis label, plus a warning when Bailey is aggressive. It reads `setup.inflation.percent()` and `baileyAggressionReason()` and owns no state.
- `hbscJournal` (`loc-hbsc-bank-branch/widget.twee`) shows an "Outstanding loan" line in the HBSC section when `$hbsc.loan.owed > 0`, with the overdue note.

## Money cap ("Meet the Dev")

A failsafe against runaway wealth (inflation plus compounding interest can produce absurd numbers). When the player navigates with net wealth above `setup.inflation.PARODY_WEALTH` (£3,000,000,000), a comedy event takes their money.

- **Trigger.** A wrapper around `Config.navigation.override`, installed in `:: StoryInit` (`game/04-Variables/variables-start.twee`). StoryInit reruns on every page open, so the wrapper sits on top of the live vanilla override instead of editing core config. It first defers to the original override (version-migration waiting rooms and passage remaps win), then asks `setup.inflation.moneyParodyDue(dest)`. That skips the parody's own passages (`PARODY_PASSAGES`) and refuses to fire in combat, in a scene, on frozen stats (flashbacks, replays, the Hopeless Cycle), during an event, or during an active bad end. When it fires, the interrupted destination is stored in `$moneyParodyReturnPassage`.
- **Event.** `game/special-xchange/DoLXAddition/money-parody.twee`: `Money Parody Intro`, `Money Parody Take`, `Money Parody Take 2`. `setup.inflation.takeAllMoney()` leaves `PARODY_LEFTOVER` (£1,000,000,000) in cash and wipes savings, fixed terms, the stale interest and maturity notices (`$hbsc.notices`) behind the journal's "recent changes" line, and the prepaid Bailey deposit (`$baileyDeposit`). The loan is left so it still shows in the bank journal. The last link returns to `$moneyParodyReturnPassage`, then falls back to the previous valid passage, then `Bedroom`.
- **Feat.** It awards the hidden feat "Meet the Dev". That feat is the only one allowed past the cheat, debug and soft-mode lockout in `earnFeat` (`game/04-Variables/feats.js`), because the parody only fires in an exploit state.
- **Self-gating.** There is no "seen" flag. Afterwards wealth is under the cap, and it only fires again if the player climbs back over. Every parody passage is in `PARODY_PASSAGES`, so it can never redirect into itself.

## Where things are

- `game/overworld-town/loc-hbsc-bank-branch/inflation.js`: the whole `setup.inflation` API, presets, setting ranges and tier thresholds.
- `game/base-system/stat-changes.js`: the `money()` hook (search for "X-Change inflation").
- `game/base-system/widgets.twee`: `<<printprice>>`, next to `<<printmoney>>`.
- `game/base-system/settings.twee`: the Economy Inflation settings box.
- `game/overworld-town/loc-home/rent.twee`: `rentmod` and `rentpay`.
- `game/overworld-town/loc-home/DoLXAddition/misc.twee`: `<<baileyGripDemand>>`, `<<baileyRentFlavour>>`, `<<baileyBankDraw>>`, `<<rentInflationNotice>>`, `<<loanRentNotice>>`.
- `game/overworld-town/loc-hbsc-bank-branch/bank.js`: loan and card engine.
- `game/overworld-town/loc-hbsc-bank-branch/main.twee` and `widget.twee`: loan and bank UI.
- `game/overworld-town/loc-street/widgets.twee`: `streeteffects` and the `eventsstreet` branch.
- `game/overworld-town/loc-street/DoLXAddition/events/bailey-hunt.twee`: the street hunt.
- `game/base-system/overlays/journal.twee`: the economy indicator.
- `game/04-Variables/variables-start.twee`: the `:: StoryInit` navigation wrapper.
- `game/special-xchange/DoLXAddition/money-parody.twee`: the parody passages.
- `game/04-Variables/feats.js`: "Meet the Dev" and its lockout exemption.
- `game/overworld-town/special-blackmail/quests.js`: `blackmailReward()`.

## Porting a vanilla change

1. Port the vanilla change first. Keep its base prices and shop logic.
2. A new paid action: charge with `<<money -N "source">>` (it inflates automatically), print with `<<printprice N>>`, guard with `setup.inflation.canAfford(N, "source")`.
3. Vanilla writes `$money` directly for a purchase: convert it to `<<money>>` unless it is income, a bet, a bank transfer or a cheat.
4. Inflate every `$money gte N` affordability guard for a purchase.
5. Never change an income or balance `<<printmoney>>` to `<<printprice>>`.
6. Vanilla reworks rent: make sure `rentmod` still runs after the base rent is set, and that `baileyRent` is still the deduction source.
7. Vanilla adds a new excluded transfer (another savings-like flow that writes `$money`): add its source to `EXCLUDED_SOURCES`.
8. Vanilla rebalances item prices: do nothing. Inflation tracks the new base.
9. A new everyday shop the bank card should cover: add its source to `setup.hbsc.cardSources`.
10. Compile and run the checks below.

## Checks

From the repository root:

```powershell
node --check game/overworld-town/loc-hbsc-bank-branch/inflation.js
node --check game/base-system/stat-changes.js
node --check game/overworld-town/loc-hbsc-bank-branch/bank.js
cmd /c compile.bat
git diff --check
```

Searches to review:

```powershell
# Purchases that skip the inflation hook by writing $money directly.
# Each hit must be income, a bet, a bank transfer or a cheat. Otherwise convert it to <<money>>.
rg -n '<<set \$money (-=|to \$money)' game

# Price labels still showing the base value. A price the player pays should use <<printprice>>.
rg -n '<<printmoney ' game

# Affordability guards that were not inflated.
rg -n '\$money (gte|>=) [0-9]' game

# <<printprice>> must never sit inside a backtick template literal (it will not render).
rg -n '`[^`]*<<printprice' game
```

The `<<printmoney>>` search will not return zero. Its remaining hits should be income, balances or narration.

## One question for every money reference

> Does the player pay this for something, or is it income, a balance, a bet or a transfer?

- Paid by the player: charge with `<<money>>`, label with `<<printprice>>`, guard with `setup.inflation.canAfford()`.
- Income, balance, stake, transfer or cheat: leave it on `<<printmoney>>` or a direct `$money` write, and do not inflate it.

## Design note: the fixed-term shelter

Using fixed-term deposits to hide money from Bailey is intentional for now.

Someone who understands the HBSC bank can keep money in active fixed terms as a temporary shelter from Bailey. Locked terms still count toward shop inflation, so the city reacts to the hidden wealth with higher prices, but Bailey only reacts to liquid money: cash and normal savings. That gap between "the economy knows the player is rich" and "Bailey can reach the money" is deliberate.

Current behaviour:

- Active fixed terms count for shop inflation.
- Active fixed terms do not count for Bailey's rent demand, rent tier, hoarding aggression or forced withdrawal.
- Matured fixed terms are swept into savings.
- Once in savings, the money is visible and reachable to Bailey.

Do not treat this as a bug unless it becomes the dominant or safest way around rent. If players abuse it, rebalance rather than remove it. Options, softest first:

1. Add higher inflation tiers at very high wealth, so hidden money still makes the world more expensive.
2. Sweep matured terms into savings before the rent and Bailey checks on the same day.
3. Block opening new fixed terms while rent is overdue, Bailey is hunting, or loan debt is overdue.
4. Add a cooldown after maturity before the same money can go into another term.
5. Add a suspicion fee or early-withdrawal penalty for repeated large fixed-term cycling.
6. Let Bailey notice repeated banking patterns, but only after abuse.
7. Last resort: count a percentage of locked terms in Bailey-visible wealth instead of none.

The loophole should reward planning and knowledge of the system. It should not become a permanent, risk-free shield against Bailey.
