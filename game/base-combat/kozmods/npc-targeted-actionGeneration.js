function listUniqueCarriedXchangePills() {
    /** 
     * TODO: Compile an array containing objects from setup.pills whose 'type' is 'xchange' and the owned amount is greater than zero.
     * NOTE: Limit the collection to only containing pills of subtypes 'pink basic' and 'blue basic' for experimental reasons.
     * @return {setup.pills[]}
    */

    let carriedPills = [];
    let xchangePills = setup.pills.filter(med => med.type === "xchange");

    xchangePills.forEach(pill => { // Temporarily limiting the list to only basic pill variants
        if (V.sexStats.pills.pills[pill.name].owned > 0 && ["pink basic", "blue basic"].includes(pill.subtype)) 
            carriedPills.push(pill);
    });

    return carriedPills;
}
window.listUniqueCarriedXchangePills = listUniqueCarriedXchangePills;