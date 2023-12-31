export class PassageTracer {
    constructor(thisWin) {
        this.thisWin = thisWin;
        this.whenPassageComeCallback = [];
    }
    init() {
        this.thisWin.jQuery(this.thisWin.document).on(":passageend", () => {
            this.newPassageCome();
        });
    }
    addCallback(cb) {
        this.whenPassageComeCallback.push(cb);
    }
    newPassageCome() {
        const pe = Array.from(this.thisWin.document.getElementsByClassName('passage'));
        if (pe.length !== 1) {
            console.log('newPassageCome() (pe.length !== 0)', pe);
            return;
        }
        const p = pe[0];
        const dpName = p.getAttribute('data-passage');
        if (!dpName) {
            console.log('newPassageCome() (!dpName)', p);
            return;
        }
        console.log('newPassageCome() dpName', dpName);
        for (let i = 0; i < this.whenPassageComeCallback.length; i++) {
            const cb = this.whenPassageComeCallback[i];
            cb(dpName);
        }
    }
}
//# sourceMappingURL=PassageTracer.js.map