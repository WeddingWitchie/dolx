# Ironman debugging

Ironman mode is meant to stop players from cheating, so it also makes exporting and debugging a save harder. This page is how a developer gets an ironman save out of a player, and how to load it back in.

## Getting the save from a player

In ironman, the only export a player has is the autosave. Developers need a secret route to the full save data:

1. Save the current game. You are sent to the main menu.
2. Open the save menu.
3. Find the save slot and hover over its silver coin icon.
4. Click the coin icon 3 times in a row. The counter resets if you click a different slot.
5. The export page opens with the data already filled in. Click **Copy Text Area**.
6. Paste the text to the developer.

The click handler is `IronMan.UI.exportHandler` (wired up in `game/base-system/overlays/saves.twee`). It calls `IronMan.exportDebug(slot)` in `game/03-JavaScript/ironman.js`.

## What the exported text contains

The text is base64 of an LZ-compressed JSON object with two parts:

- **data**: the full save object for that slot.
- **details**: the save details for that slot. Ironman stores its signature hashes there. Players can normally only see it by opening local storage, so the export bundles it in.

## Loading it back

Run one of these in the browser console:

- `IronMan.importDebug(text)` decodes the text and returns `{ data, details }`. It does not touch the running game.
- `IronMan.importAndLoadDebug(text)` decodes the text and loads the save as if the player had loaded it. It returns the load result merged with the decoded object. If the text does not decode to an object, it reports an error and returns `false`.
