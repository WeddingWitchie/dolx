function getWardrobeItemCount(wardrobeId) {
    let wardrobe;
    if (wardrobeId === "wardrobe") {
        wardrobe = V.wardrobe;
    }
    else {
        wardrobe = V.wardrobes[wardrobeId];
    }

    let total = 0;
    Object.keys(V.worn).forEach(slot => {
        if (!["over_upper","over_lower","over_head","genitals"].includes(slot))
            total += wardrobe[slot]?.length ?? 0;
    });

    return total;
}
window.getWardrobeItemCount = getWardrobeItemCount;