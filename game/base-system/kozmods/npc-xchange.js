function paramError(functionName = "", param = "", value, expectedValues = "") {
	if (typeof value === "object") value = JSON.stringify(value);
	/* Included both types of error reporting, since this often will only occur in a link */
	Errors.report(
		`Unexpected value for the function "${functionName}" in the passage "${V.passage}". Param "${param}" had unexpected value of "${value}".${
			expectedValues ? ` ${expectedValues}` : ""
		}`
	);
	throw new Error(
		`Unexpected value for the function "${functionName}". Param "${param}" had unexpected value of "${value}".${
			expectedValues ? ` ${expectedValues}` : ""
		}`
	);
}

/**
 * @param {number/string} id
 */
function npcPillTimerPaused(id) {
    let vaginalPregnancy;
    if ((typeof id) === "number")
	    vaginalPregnancy = !!V.NPCName[id]?.pregnancy.type;
    else
        vaginalPregnancy = !!C.npc[id]?.pregnancy.type;

	return V.xchange.pillPermanence !== 1 && vaginalPregnancy;
}
window.npcPillTimerPaused = npcPillTimerPaused;

/**
 * @param {number/string} id
 */
function npcPillIsPermanent(id) {
    if ((typeof id) === "number")
        return (V.NPCName[id]?.xchange?.duration ?? 0) <= -1;
    else
        return (C.npc[id].xchange?.duration ?? 0) <= -1;
}
window.npcPillIsPermanent = npcPillIsPermanent;

/**
 * @param {number} npcno
 * @param {string} npcname
 * @param {string} sex - "f" or "m"
 */
function npcStartingSexIs(npcno, npcname, sex) {
    return (npcname !== undefined && C.npc[npcname]?.startingSex === sex) || (npcno !== undefined && V.NPCList[npcno].startingSex === sex);
}
window.npcStartingSexIs = npcStartingSexIs;

function npcIsXChanged(id) {
	if ((typeof id) === "number") {
		return !!V.NPCList[id]?.xchange;
	}
	else {
		return !!C.npc[id]?.xchange;
	}
}
window.npcIsXChanged = npcIsXChanged;

function npcXChangeHourlyCheck(hours = 1) {
    if (!V.statFreeze) {

        for (let n = 0; n < V.NPCName.length; n++) {
            const pill = V.NPCName[n].xchange;
            if (pill !== undefined) {
                // Tick the pill's duration down if the pill isn't permanent
                if (!npcPillIsPermanent(n)) pill.duration = Math.max(pill.duration - 1 * hours, 0);
        
                // Clamp the pill duration to only ever save up to 30 days (in particular for Continue pills)
                if (pill.continueEffect)
                    pill.duration = Math.min(pill.duration, 30*24);
                
                // If the pill has the continue effect, and a remaining duration of 30 days is accumulated
                // then, the change becomes permanent
                if (V.xchange.pillPermanence === 1 && !npcPillIsPermanent(n) && pill.continueEffect && pill.duration >= 30 * 24)
                    wikifier("npc-xchange-setpermanent", V.NPCName[n].nam);
        
                // If got impregnated in the vagina, then, the change becomes permanent 
                if (V.xchange.pillPermanence === 1 && !npcPillIsPermanent(n) && !!V.NPCName[n].pregnancy.type)
                    wikifier("npc-xchange-setpermanent", V.NPCName[n].nam);
        
                // Check if the pill should expire
                if (pill.duration == 0)
                {
                    pill.shouldHaveEnded = true;
        
        
                    if (!npcPillIsPermanent(n) && !npcPillTimerPaused(n) && pill.resistanceEffect && random(0,100) > pill.resistanceChance) {
                        if (V.xchange.pillPermanence === 1) wikifier("npc-xchange-setpermanent", V.NPCName[n].nam);
                        else {
                            pill.duration += Math.max(1, V.xchange.resistanceDaysPenalty) * 24;
                            pill.resistanceEffect = false;
                            pill.fertile = true;
                            pill.resistanceFakeout = true;
                        }
                    }
                    else if (!npcPillIsPermanent(n) && !npcPillTimerPaused(n)) {
                        wikifier("npc-xchange-restore", V.NPCName[n].nam);
                    }
                } 
                
                // Force the pill to expire if pill permanence is disabled, and no condition is preventing it from expiring
                else if (V.xchange.pillPermanence !== 1 && npcPillIsPermanent(n) && !V.xchange.pill.choiceEffect) {
                    pill.duration = 0;
                    if (!npcPillTimerPaused(n)) {
                        wikifier("npc-xchange-restore", V.NPCName[n].nam);
                    }
                }
        
                // // Progress the fakeout timer for as long as the "should have ended" flag stands, else reset it.
                // if (pill.shouldHaveEnded) 
                //     pill.countdown += 1 * hours;
                // else
                //     pill.countdown = 0;
        
                // // Reveal that you didn't turn back
                // if (pill.shouldHaveEnded && !wondersAboutPillEnd()) {
                //     V.xchangePermanenceMessage = 1;
                //     delete pill.shouldHaveEnded; 
                // }
        
                // // Drop the resistance facade when the uncertain period has expired
                // if (pill.resistanceFakeout === true && !wondersAboutPillEnd()) {
                //     delete pill.resistanceFakeout;
                //     delete pill.shouldHaveEnded;
                // }

            }

            // Apply hour-random passion effect
            for (let i = 0; i < hours; i++) {
                if (pill?.passionEffect && ((V.substanceRebalance == 1 && random(0,10) == 0) || random(0,8) == 0)) {
                    V.NPCName[n].lust = Math.clamp(V.NPCName[n].lust + 5, 0, 100);
                    // wikifier("drugs", V.substanceRebalance == 1? 120 : 200); 
                    // V.effectsmessage = 1;
                    // V.xchange_passion_message = 1;
                }
            }

            // Tick portal effect timer, and end the effect if timer lapses
            if (pill?.portalEffect && pill?.portalEffectTimer >= 0) {
                pill.portalEffectTimer = Math.max(pill.portalEffectTimer - 1 * hours, 0);
                if (pill.portalEffectTimer === 0) {
                    pill.portalEffect = false;
                }
            }
        }
	
		
	}
}
window.npcXChangeHourlyCheck = npcXChangeHourlyCheck;