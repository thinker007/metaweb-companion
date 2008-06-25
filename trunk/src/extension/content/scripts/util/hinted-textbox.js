/*==================================================
 *  HintedTextbox
 *==================================================
 */

Companion.HintedTextbox = function(elmt, hint, normalClass) {
    this._empty = (elmt.value.length == 0);
    this._elmt = elmt;
    this._hint = hint;
    this._normalClass = normalClass || "";
    
    this.registerEvents();
    this.refresh();
};

Companion.HintedTextbox.prototype.registerEvents = function() {
    var self = this;
    this._elmt.addEventListener('focus', function() { self._onfocus(); }, true);
    this._elmt.addEventListener('blur', function() { self._onblur(); }, true);
};

Companion.HintedTextbox.prototype.refresh = function() {
    if (this._empty) {
        this._elmt.value = this._hint;
    }
    this._setClass();
};

Companion.HintedTextbox.prototype.getValue = function() {
    return this._empty ? "" : this._elmt.value;
};

Companion.HintedTextbox.prototype.setValue = function(value) {
    if (value.length == 0) {
        this._empty = true;
        this._elmt.value = this._hint;
    } else {
        this._empty = false;
        this._elmt.value = value;
    }
    this._setClass();
};

Companion.HintedTextbox.prototype._onfocus = function() {
    if (this._empty) {
        this._elmt.value = "";
        this._empty = false;
    }
    this._elmt.className = this._normalClass;
};

Companion.HintedTextbox.prototype._onblur = function() {
    this._empty = this._elmt.value.length == 0;
    this.refresh();
};

Companion.HintedTextbox.prototype._setClass = function() {
    this._elmt.className = this._empty ? 
        (this._normalClass + " companion-hintedTextbox-empty") : 
        this._normalClass;
};
