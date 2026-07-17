/* globals SimpleAudio */
/* SugarCube's AudioList.destroy() (run by <<removeplaylist>>) deletes this.tracks and this.queue.
When autoplay is blocked (no user gesture yet), AudioList.playWhenAllowed() parks a one-shot "play on next gesture" handler on the document that still references the list.
If the gesture that finally arrives also navigates a passage, the passage's audio update can release/destroy that playlist before the handler fires, and the handler's play() call then crashes with `can't access property "length", this.queue is undefined`.

The AudioList class isn't exported by SugarCube, so the prototype is captured lazily from the first playlist created via <<init-playlist>> and patched once to ignore play() on destroyed lists. */
window.dolxGuardAudioListPrototype = function (listId) {
	const list = SimpleAudio.lists.get(listId);
	if (!list) return;
	const proto = Object.getPrototypeOf(list);
	if (!proto || proto.dolxDestroyGuarded) return;
	proto.dolxDestroyGuarded = true;
	const origPlay = proto.play;
	proto.play = function () {
		if (!this.tracks || !this.queue) return Promise.resolve();
		return origPlay.apply(this, arguments);
	};
};
