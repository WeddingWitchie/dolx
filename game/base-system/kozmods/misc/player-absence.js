/*
 * Track how long the player has been absent from places townsfolk can see them.
 * Town-adjacent locations only reset absence when no bad end is active.
 */
const PlayerAbsence = (() => {
	"use strict";

	/**
	 * Returns the absence record, creating it on first use.
	 *
	 * @returns {object} The record: when the player was last seen, and the length and end of their last absence.
	 */
	function record() {
		if (!V.playerAbsence || typeof V.playerAbsence !== "object" || Array.isArray(V.playerAbsence)) {
			V.playerAbsence = { lastSeen: Time.date.timeStamp, lastAbsenceDays: 0, lastAbsenceEnd: 0 };
		}
		if (!Number.isFinite(V.playerAbsence.lastSeen)) V.playerAbsence.lastSeen = Time.date.timeStamp;
		if (!Number.isFinite(V.playerAbsence.lastAbsenceDays)) V.playerAbsence.lastAbsenceDays = 0;
		if (!Number.isFinite(V.playerAbsence.lastAbsenceEnd)) V.playerAbsence.lastAbsenceEnd = 0;
		return V.playerAbsence;
	}

	/**
	 * Whether the player's current location is one where they would be seen.
	 *
	 * @returns {boolean} True if the player is in sight of the town.
	 */
	function inSight() {
		if (!C.playerAbsence.seenLocations.includes(V.location)) return false;
		// Captivity somewhere town adjacent is still an absence.
		const badEnd = Array.isArray(V.badEndStats) ? V.badEndStats.last() : undefined;
		if (badEnd && badEnd.trackedEnd === undefined) return false;
		return true;
	}

	/**
	 * How many whole days the player has been out of sight for.
	 *
	 * @returns {number} Whole days since the player was last seen.
	 */
	function days() {
		const elapsed = Time.date.timeStamp - record().lastSeen;
		if (!(elapsed > 0)) return 0;
		return Math.floor(elapsed / TimeConstants.secondsPerDay);
	}

	/**
	 * Whether the player has been gone long enough for people to react to it.
	 *
	 * @returns {boolean} True if the player counts as missing.
	 */
	function isMissing() {
		return days() >= C.playerAbsence.daysToCountAsMissing;
	}

	/**
	 * The absence NPCs are reacting to, in whole days.
	 * Ongoing while away; the most recent absence after returning.
	 *
	 * @returns {number}
	 */
	function lastAbsenceDays() {
		const ongoing = days();
		return ongoing > 0 ? ongoing : record().lastAbsenceDays;
	}

	/**
	 * Stamps the player as seen and remembers the absence that just ended,
	 * but only if it was long enough to count as missing.
	 */
	function seen() {
		const data = record();
		const absence = days();
		if (absence >= C.playerAbsence.daysToCountAsMissing) {
			data.lastAbsenceDays = absence;
			data.lastAbsenceEnd = Time.date.timeStamp;
		}
		data.lastSeen = Time.date.timeStamp;
	}

	/**
	 * Updates the record for the passage being displayed.
	 * Replays and other historical scenes are skipped, as they are not the player moving around the world.
	 */
	function update() {
		if (typeof V === "undefined" || V.replayScene || V.statFreeze) return;
		record();
		if (inSight()) seen();
	}

	/**
	 * When the player's last absence ended, for one-off reactions that need to fire once per disappearance.
	 *
	 * @returns {number} A timestamp, or 0 if the player has never been away.
	 */
	function lastAbsenceEnd() {
		return record().lastAbsenceEnd;
	}

	if (typeof jQuery !== "undefined") {
		jQuery(document).on(":passagedisplay", update);
	}

	return { days, isMissing, lastAbsenceDays, lastAbsenceEnd, seen, update };
})();
window.PlayerAbsence = PlayerAbsence;

/**
 * Whether the player has been out of sight long enough that people react to their return.
 *
 * @returns {boolean} True if the player counts as missing.
 */
window.playerConsideredMissing = () => PlayerAbsence.isMissing();

/**
 * How many whole days the player has been, or just was, out of sight for.
 *
 * @returns {number} Whole days.
 */
window.playerMissingDays = () => PlayerAbsence.lastAbsenceDays();

/**
 * When the player's last absence ended. Zero while they have never been away.
 * Reactions that should play once per disappearance stamp this value and compare against it.
 *
 * @returns {number} A timestamp.
 */
window.playerAbsenceEnded = () => PlayerAbsence.lastAbsenceEnd();
