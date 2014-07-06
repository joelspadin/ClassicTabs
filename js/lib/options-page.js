/// <reference path="storage.ts" />
/// <reference path="chrome.d.ts" />

var OptionsPage = (function () {
    /* Public Functions */
    /**
    * @param storage The storage object to which the page should be synced
    * @param document The document to sync. Omit to use the main document.
    */
    function OptionsPage(storage, document) {
        this.initialized = false;
        this.initQueue = [];
        this.storage = storage;
        this.document = document || window.document;

        if (['interactive', 'complete'].indexOf(this.document.readyState) >= 0) {
            this._onDOMContentLoaded();
        } else {
            window.addEventListener('DOMContentLoaded', this._onDOMContentLoaded.bind(this));
        }
    }
    /* Static Functions */
    /** Gets whether an element is an input field */
    OptionsPage.isInput = function (element) {
        if (OptionsPage.InputTags.indexOf(element.tagName.toLowerCase()) >= 0) {
            return true;
        }
    };

    /** Gets whether an element should be ignored */
    OptionsPage.shouldSkip = function (element) {
        if (element instanceof HTMLInputElement) {
            return (OptionsPage.SkipTypes.indexOf(element.type.toLowerCase()) >= 0);
        } else {
            return false;
        }
    };

    /** Gets whether an element is a numeric input */
    OptionsPage.isNumeric = function (element) {
        if (element instanceof HTMLInputElement) {
            return (OptionsPage.NumericTypes.indexOf(element.type.toLowerCase()) >= 0);
        } else {
            return false;
        }
    };

    /** Gets whether an element is a boolean input */
    OptionsPage.isCheckable = function (element) {
        if (element instanceof HTMLInputElement) {
            return (OptionsPage.CheckableTypes.indexOf(element.type.toLowerCase()) >= 0);
        } else {
            return false;
        }
    };

    /** Gets whether an element is a radio button */
    OptionsPage.isRadio = function (element) {
        if (element instanceof HTMLInputElement) {
            return (OptionsPage.RadioTypes.indexOf(element.type.toLowerCase()) >= 0);
        } else {
            return false;
        }
    };

    /** Gets whether an element is a multi-select input */
    OptionsPage.isMultiSelect = function (element) {
        if (element instanceof HTMLSelectElement) {
            return (OptionsPage.MultiSelectTypes.indexOf(element.type.toLowerCase()) >= 0);
        } else {
            return false;
        }
    };

    /** Gets the value of a set of radio buttons */
    OptionsPage.getRadioValue = function (element) {
        var inputs = element.ownerDocument.querySelectorAll('input[type=radio][name="' + element.getAttribute('name') + '"]');
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            if (input.checked) {
                return input.value;
            }
        }
        return null;
    };

    /**
    * Coerces a number to the min/max values set on an input element
    * @param element The input element
    * @param value The value to check. If omitted, the element's current value is used.
    */
    OptionsPage.coerceToLimits = function (element, value) {
        if (value === undefined) {
            value = element.valueAsNumber;
        }
        if (element.hasAttribute('min') && value < parseFloat(element.min)) {
            value = parseFloat(element.min);
        }
        if (element.hasAttribute('max') && value > parseFloat(element.max)) {
            value = parseFloat(element.max);
        }
        if (isNaN(value)) {
            value = 0;
        }

        return value;
    };

    /**
    * Gets the load/save transformation function for an element
    */
    OptionsPage.getTransformFunction = function (element, funcName) {
        var func = element.dataset[funcName];
        if (func) {
            return window[func] || null;
        } else {
            return null;
        }
    };

    OptionsPage.prototype.update = function (element) {
        this._resolveElement(element).forEach(this._update.bind(this));
    };

    OptionsPage.prototype.save = function (element) {
        this._resolveElement(element).forEach(this._save.bind(this));
    };

    /**
    * Changes the storage object used by the options page.
    * This will update all elements on the page to the values in the new storage object.
    */
    OptionsPage.prototype.setStorage = function (storage) {
        this.storage = storage;

        var formElements = document.querySelectorAll(OptionsPage.InputTags.join(','));
        this._walkElements(formElements, this.update);
    };

    /**
    * Configures an element to be synced with storage.
    * @param element The element to sync
    * @param resetButton An element which, when clicked, should reset the synced element to its default value
    */
    OptionsPage.prototype.addInput = function (element, resetButton) {
        if (!this.initialized) {
            // If page not initialized, wait until later to add input
            this.initQueue.push({ el: element, reset: resetButton });
        } else {
            // make sure this is an input first
            if (element.tagName && OptionsPage.isInput(element)) {
                this._setupElement(element);

                // if a reset button is given, add it
                if (resetButton !== undefined) {
                    this._addResetButton(resetButton, [element]);
                } else {
                    // if not, look for reset buttons on the page already
                    var resets = this._findResetButtons(element);
                    for (var i = 0; i < resets.length; i++) {
                        this._addResetButton(resets[i], [element]);
                    }
                }
            }
        }
    };

    /**
    * Returns a DL element with the keys and raw values in storage
    * @param sortfunction A function to sort settings by name
    */
    OptionsPage.prototype.debugStorage = function (sortfunction) {
        var _this = this;
        var keys = [];
        for (var key in this.storage.storage) {
            if (this.storage.storage.hasOwnProperty(key)) {
                keys.push(key);
            }
        }

        keys.sort(sortfunction);

        var list = document.createElement('dl');
        keys.forEach(function (key) {
            var term = document.createElement('dt');
            var desc = document.createElement('dd');
            term.textContent = key;
            desc.textContent = _this.storage.storage[key];
            list.appendChild(term);
            list.appendChild(desc);
        });

        return list;
    };

    /* Private Functions */
    OptionsPage.prototype._onDOMContentLoaded = function () {
        var _this = this;
        var formElements = document.querySelectorAll(OptionsPage.InputTags.join(','));
        this._walkElements(formElements, this._setupElement);
        this._setupAllResetButtons();
        this.initialized = true;

        this.initQueue.forEach(function (item) {
            _this.addInput(item.el, item.reset);
        });
        this.initQueue = [];
    };

    OptionsPage.prototype._walkElements = function (elements, callback) {
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];

            var name = element.getAttribute('name');
            if (!name || OptionsPage.shouldSkip(element) || element.hasAttribute('data-nosave')) {
                continue;
            }

            callback.bind(this)(element);
        }
    };

    OptionsPage.prototype._setupElement = function (element) {
        element.addEventListener('change', this._onElementChanged.bind(this), true);
        this._update(element);
    };

    OptionsPage.prototype._onElementChanged = function (e) {
        var element = e.currentTarget;
        this._save(element);
    };

    OptionsPage.prototype._addResetButton = function (button, elements) {
        var self = this;
        button.addEventListener('click', function (e) {
            if (e.target.hasAttribute('data-confirm')) {
                var message = (elements.length > 1) ? 'Are you sure you want to reset these settings to their default values?' : 'Are you sure you want to reset this setting to its default value?';

                button.setAttribute('disabled', 'disabled');
                ModalDialog.confirm('Reset to default', message, function (result) {
                    if (result) {
                        self._onResetClick.bind(self)(elements);
                    }
                    button.removeAttribute('disabled');
                });
            } else {
                self._onResetClick.bind(self)(elements);
            }
        });
    };

    OptionsPage.prototype._onResetClick = function (elements) {
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            var name = element.getAttribute('name');
            var oldVal = this.storage.get(name);
            this.storage.reset(name);
            this._update(element);
            this._sendChangedEvent(name, oldVal, this.storage.get(name));
        }
    };

    OptionsPage.prototype._findResetButtons = function (element) {
        var name = element.getAttribute('name');
        try  {
            return this.document.querySelectorAll('[data-reset~="' + name + '"]');
        } catch (e) {
            return null;
        }
    };

    OptionsPage.prototype._setupAllResetButtons = function () {
        var resets = this.document.querySelectorAll('[data-reset]');
        for (var i = 0; i < resets.length; i++) {
            var elementNames = resets[i].dataset['reset'].split(' ');
            var elements = [];
            elementNames.forEach(function (name) {
                elements = elements.concat(Array.prototype.slice.call(document.getElementsByName(name)));
            });

            this._addResetButton(resets[i], Array.prototype.slice.call(elements));
        }
    };

    OptionsPage.prototype._sendChangedEvent = function (key, oldValue, newValue) {
        var e = document.createEvent('CustomEvent');
        e.initCustomEvent('setting', true, true, {
            key: key,
            oldValue: oldValue,
            newValue: newValue
        });
        this.document.dispatchEvent(e);
    };

    OptionsPage.prototype._update = function (element) {
        var inputEl = element;
        var name = element.getAttribute('name');
        var value = this.storage.get(name);

        var filter = OptionsPage.getTransformFunction(element, OptionsPage.Transform.Load);
        if (filter) {
            value = filter.call(null, value);
        }

        if (OptionsPage.isCheckable(element)) {
            if (OptionsPage.isRadio(element)) {
                inputEl.checked = (inputEl.value == value);
            } else {
                inputEl.checked = !!value;
            }
        } else if (OptionsPage.isMultiSelect(element)) {
            // loop through <option> elements and select/unselect them
            var select = element;
            for (var i = 0; i < select.options.length; i++) {
                var option = select.options[i];
                option.selected = (value.indexOf(option.value) >= 0);
            }
        } else {
            inputEl.value = value;
            if (OptionsPage.isNumeric(element)) {
                var coerced = OptionsPage.coerceToLimits(inputEl, value);
                if (value != coerced) {
                    this._save(element);
                }
            }
        }
    };

    OptionsPage.prototype._save = function (element) {
        var inputEl = element;
        var name = element.getAttribute('name');

        var value;
        if (OptionsPage.isCheckable(element)) {
            value = OptionsPage.isRadio(element) ? OptionsPage.getRadioValue(element) : inputEl.checked;
        } else if (OptionsPage.isNumeric(element)) {
            value = OptionsPage.coerceToLimits(inputEl, inputEl.valueAsNumber);
        } else if (OptionsPage.isMultiSelect(element)) {
            // collect selected option values as an array
            value = [];
            var options = element.selectedOptions;
            for (var i = 0; i < options.length; i++) {
                value.push(options[i].value);
            }
        } else {
            value = inputEl.value;
        }

        var filter = OptionsPage.getTransformFunction(element, OptionsPage.Transform.Save);
        if (filter) {
            value = filter.call(null, value);
        }

        var oldValue = this.storage.get(name);
        this.storage.set(name, value);
        if (value != oldValue) {
            this._sendChangedEvent(name, oldValue, value);
        }
    };

    OptionsPage.prototype._resolveElement = function (element) {
        if (typeof element === 'string') {
            return Array.prototype.slice.call(this.document.getElementsByName(element));
        } else if (element instanceof NodeList) {
            return Array.prototype.slice.call(element);
        } else if (element instanceof HTMLElement) {
            return [element];
        } else if (element.length) {
            return element;
        } else {
            return [];
        }
    };
    OptionsPage.InputTags = ['input', 'select', 'textarea'];

    OptionsPage.SkipTypes = ['button', 'file', 'hidden', 'image', 'reset', 'submit'];

    OptionsPage.NumericTypes = ['number', 'range'];

    OptionsPage.CheckableTypes = ['checkbox', 'radio'];

    OptionsPage.RadioTypes = ['radio'];

    OptionsPage.MultiSelectTypes = ['select-multiple'];

    OptionsPage.Transform = { Load: 'loadfunc', Save: 'savefunc' };
    return OptionsPage;
})();

/** Adapted from http://css-tricks.com/value-bubbles-for-range-inputs/ */
var RangeBubble = (function () {
    function RangeBubble(input) {
        this._input = input;
        this._output = document.createElement('output');

        if (this._input.nextSibling) {
            this._input.parentNode.insertBefore(this._output, this._input.nextSibling);
        } else {
            this._input.parentNode.appendChild(this._output);
        }

        this._input.addEventListener('change', this._modifyOffset.bind(this));
        this._modifyOffset();

        // make sure the range disappears once it fades out so that it doesn't block other elements
        this._input.addEventListener('mouseover', this._showOutput.bind(this));
        this._input.addEventListener('focus', this._showOutput.bind(this));
        this._output.addEventListener('transitionend', this._hideOutput.bind(this));
    }
    RangeBubble.prototype._modifyOffset = function () {
        var input = this._input;
        var output = this._output;
        var vertical = input.classList.contains('vertical');
        var size = (vertical ? input.offsetHeight : input.offsetWidth) - RangeBubble.HandleSize;
        var min = input.hasAttribute('min') ? parseFloat(input.min) : 0;
        var max = input.hasAttribute('max') ? parseFloat(input.max) : 100;
        var newPoint = (input.valueAsNumber - min) / (max - min);
        var newPlace;

        if (vertical) {
            newPoint = 1 - newPoint;
        }

        if (newPoint < 0) {
            newPlace = 0;
        } else if (newPoint > 1) {
            newPlace = size;
        } else {
            newPlace = Math.round(size * newPoint);
        }

        output.innerText = input.value;

        if (vertical) {
            output.style.top = newPlace + input.offsetTop + 'px';
            output.style.left = input.offsetLeft + input.offsetWidth + 'px';
            output.style.marginTop = ((RangeBubble.HandleSize - output.offsetHeight) / 2) + 'px';
        } else {
            output.style.top = input.offsetTop - input.offsetHeight + 'px';
            output.style.left = newPlace + input.offsetLeft + 'px';
            output.style.marginLeft = ((RangeBubble.HandleSize - output.offsetWidth) / 2) + 'px';
        }
    };

    RangeBubble.prototype._showOutput = function () {
        this._output.style.display = 'block';
    };

    RangeBubble.prototype._hideOutput = function () {
        if (window.getComputedStyle(this._output, null).getPropertyValue('opacity') === '0') {
            this._output.style.display = 'none';
        }
    };
    RangeBubble.HandleSize = 11;
    return RangeBubble;
})();

var ModalDialog = (function () {
    function ModalDialog(title, text, onclose) {
        var _this = this;
        var buttons;
        if (typeof onclose === 'function') {
            buttons = Array.prototype.slice.call(arguments, [3]);
        } else {
            buttons = Array.prototype.slice.call(arguments, [2]);
            onclose = null;
        }

        this.onclose = onclose;

        this.overlay = document.createElement('div');
        this.overlay.className = 'overlay transparent';
        this.overlay.addEventListener('click', this._pulse.bind(this), false);
        this.overlay.addEventListener('animationend', this._endPulse.bind(this), false);
        this.overlay.addEventListener('webkitAnimationEnd', this._endPulse.bind(this), false);

        this.dialog = document.createElement('aside');
        this.dialog.addEventListener('click', this._cancelEvent, false);

        var header = document.createElement('h1');
        var body = document.createElement('div');
        var footer = document.createElement('footer');

        header.textContent = title;
        body.innerHTML = '<p>' + text.replace('\n\n', '</p><p>').replace('\n', '<br>') + '</p>';

        buttons.forEach(function (info) {
            var button = document.createElement('button');
            button.textContent = info.text;
            if (info.action) {
                button.addEventListener('click', info.action, false);
            }

            button.addEventListener('click', _this._close.bind(_this), false);
            footer.appendChild(button);
        });

        this.dialog.appendChild(header);
        this.dialog.appendChild(body);
        this.dialog.appendChild(footer);

        this.overlay.appendChild(this.dialog);
        document.body.appendChild(this.overlay);

        window.setTimeout(function () {
            return _this.overlay.classList.remove('transparent');
        }, 1);
    }
    ModalDialog.confirm = function (title, text, callback) {
        return new ModalDialog(title, text, {
            text: 'Cancel',
            action: function (e) {
                return callback(false);
            }
        }, {
            text: 'OK',
            action: function (e) {
                return callback(true);
            }
        });
    };

    ModalDialog.message = function (title, text, onclose) {
        if (typeof onclose !== 'function') {
            onclose = function (e) {
                return undefined;
            };
        }

        return new ModalDialog(title, text, onclose, {
            text: 'OK'
        });
    };

    ModalDialog.prototype._cancelEvent = function (e) {
        e.stopPropagation();
    };

    ModalDialog.prototype._pulse = function (e) {
        this.dialog.classList.add('pulse');
    };

    ModalDialog.prototype._endPulse = function (e) {
        this.dialog.classList.remove('pulse');
    };

    ModalDialog.prototype._close = function (e) {
        var _this = this;
        if (this.onclose) {
            this.onclose();
        }

        this.overlay.classList.add('transparent');
        this.overlay.addEventListener('transitionend', function (e) {
            document.body.removeChild(_this.overlay);
            _this.overlay = null;
            _this.dialog = null;
            _this.onclose = null;
        });
    };
    return ModalDialog;
})();

// Localization functions
function localize(message) {
    var substitutions = [];
    for (var _i = 0; _i < (arguments.length - 1); _i++) {
        substitutions[_i] = arguments[_i + 1];
    }
    return chrome.i18n.getMessage(message, substitutions);
}

var i18n;
(function (i18n) {
    function translate(elem, msg) {
        msg = msg || elem.dataset.msg;
        elem.textContent = chrome.i18n.getMessage(msg);
    }
    i18n.translate = translate;

    function localizePage() {
        var elems = document.querySelectorAll('[data-msg]');
        for (var i = 0; i < elems.length; i++) {
            i18n.translate(elems[i]);
        }

        localizeTitle();
    }
    i18n.localizePage = localizePage;

    function localizeTitle() {
        document.title = document.title.replace(/__MSG_(.+)__/g, function (match) {
            var groups = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                groups[_i] = arguments[_i + 1];
            }
            return chrome.i18n.getMessage(groups[0]);
        });
    }
    i18n.localizeTitle = localizeTitle;
})(i18n || (i18n = {}));

// Automatically intialize things on startup
window.optionsPage = null;

window.addEventListener('DOMContentLoaded', function () {
    // Localize the page
    i18n.localizePage();

    // If there is a storage object with a common name, build the options page automatically
    var names = ['settings', 'storage'];
    for (var i = 0; i < names.length; i++) {
        if (typeof window[names[i]] !== 'undefined') {
            var settings = window[names[i]];
            if (settings instanceof SettingStorageClass) {
                window.optionsPage = new OptionsPage(settings);
                break;
            }
        }
    }

    // Find any range sliders and attach value displays to them
    var ranges = document.querySelectorAll('input[type=range]:not([data-no-bubble])');
    for (var i = 0; i < ranges.length; i++) {
        ranges[i]['_bubble'] = new RangeBubble(ranges[i]);
    }

    // Fill elements with data from the extension manifest
    var manifest = chrome.runtime.getManifest();

    var fields = document.querySelectorAll('[data-manifest]');
    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        var format = field.dataset['format'] || '{0}';
        var values = [];

        field.dataset['manifest'].split(',').forEach(function (property) {
            var chunks = property.split('.');
            var current = manifest;

            try  {
                chunks.forEach(function (chunk) {
                    current = current[chunk];
                });
            } catch (e) {
                current = undefined;
            }

            values.push(current);
        });

        if (values.length === 0 || values[0] === undefined) {
            field.textContent = 'manifest: ' + field.dataset['manifest'];
        } else {
            field.textContent = format.replace(/{(\d+)}/g, function (match) {
                var groups = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    groups[_i] = arguments[_i + 1];
                }
                var index = groups[0];
                return (typeof values[index] != 'undefined') ? values[index].toString() : match.toString();
            });
        }
    }
});
