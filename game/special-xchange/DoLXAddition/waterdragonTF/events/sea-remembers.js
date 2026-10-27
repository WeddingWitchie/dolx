setup.seaRemembers = {
	access: () => V.temple_spear_mission === 2,
	exclusive() {
		return this.access() && Transformations.isFullWaterDragon();
	},
	noteMarkings() {
		if (!this.access()) return;
		const q = this.init();
		if (!q.clues.includes(0)) q.clues.push(0);
		if (this.exclusive() && q.chapter === 0) {
			q.chapter = 1;
		}
	},
	init() {
		if (!V.seaRemembers)
			V.seaRemembers = {
				chapter: 0,
				clues: [],
				route: false,
				current: 0,
				stone: 0,
				echo: 0,
				reward: null,
				complete: false,
			};
		return V.seaRemembers;
	},
	isRestored() {
		const q = V.seaRemembers;
		return !!(q && (q.restored || q.complete || q.reward));
	},
	operate(action) {
		const q = V.seaRemembers;
		if (!this.exclusive() || !q?.route || q.current !== 5 || q.stone !== 3 || q.echo !== 3 || this.isRestored()) return false;
		if (action === "vent" && !q.mechanism) q.mechanism = "vented";
		else if (action === "brace" && q.mechanism === "vented") q.mechanism = "supported";
		else if (action === "open" && q.mechanism === "supported") {
			q.restored = true;
			delete q.mechanism;
		} else {
			delete q.mechanism;
			return false;
		}
		return true;
	},
	ready(skill) {
		const q = V.seaRemembers;
		const cap = skill === "physique" ? V.physiquesize : skill === "willpower" ? V.willpowermax : 1000;
		return (
			this.exclusive() &&
			!!q &&
			!q.reward &&
			this.isRestored() &&
			q.current === 5 &&
			q.stone === 3 &&
			q.echo === 3 &&
			["physique", "athletics", "willpower"].includes(skill) &&
			V.swimmingskill >= 1000 &&
			cap > 0 &&
			V[skill] >= cap &&
			!!V.AMCTraits
		);
	},
	claim(skill) {
		if (!this.ready(skill)) return false;
		V.AMCTraits[skill] = 2;
		if (V.AMCTraitsPreInsanity) V.AMCTraitsPreInsanity[skill] = 2;
		V.seaRemembers.reward = skill;
		delete V.seaRemembers.pending;
		V.seaRemembers.chapter = Math.max(6, V.seaRemembers.chapter);
		return true;
	},
	restoreReward() {
		const skill = V.seaRemembers?.reward;
		if (["physique", "athletics", "willpower"].includes(skill) && V.AMCTraits) {
			if (V.AMCTraits[skill] !== 2) V.AMCTraits[skill] = 2;
			if (V.AMCTraitsPreInsanity) V.AMCTraitsPreInsanity[skill] = 2;
		}
	},
	objective() {
		const q = V.seaRemembers;
		if (!q || !q.chapter) return "Explore the island's beach and forest.";
		if (q.complete || q.reward)
			return q.reward
				? `You restored the sea passage and earned Tempered ${q.reward[0].toUpperCase() + q.reward.slice(1)}.`
				: "You restored the sea passage. Speak to the Elder or the old islander, or return to the final chamber to attempt a Tempered breakthrough.";
		if (this.isRestored()) return "Return to the surface and check whether the dangerous water current in the bay has stopped.";
		if (q.echo === 3) return "Return to the damaged underwater gate. Use what you learned in the memory chamber to repair it.";
		if (q.stone === 3) return "Enter the memory chamber and complete the Trial of the Echo.";
		if (q.current === 5) return "Complete the Trial of the Stone by strengthening the damaged barrier.";
		if (q.route) return "Follow the underwater route you discovered and complete the Trial of the Current.";
		if (q.chapter >= 3)
			return "Use the old islander's map to find the bay. Examine the damaged underwater gate and investigate the dangerous water current before diving.";
		if (q.chapter >= 2) return "Find the old islander beneath the castle and ask about the warriors who lived here.";
		return "Tell the Elder about the damage and markings you discovered.";
	},
};
