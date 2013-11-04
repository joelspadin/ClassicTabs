/// <reference path="storage.d.ts" />

interface Element {
	dataset: any;
}

interface Window {
	optionsPage: OptionsPage;
}

declare var chrome: any;

class OptionsPage {

	/* Static Properties */

	/** elements to which storage code should be attached */
	static InputTags = ['input', 'select', 'textarea'];
	/** Input types which should be ignored */
	static SkipTypes = ['button', 'file', 'hidden', 'image', 'reset', 'submit'];
	/** Numeric input types */
	static NumericTypes = ['number', 'range'];
	/** Boolean input types */
	static CheckableTypes = ['checkbox', 'radio'];
	/** Radio button input types */
	static RadioTypes = ['radio'];
	/** Types with multiple possible selections */
	static MultiSelectTypes = ['select-multiple'];
	/** Transform function enum */
	static Transform = { Load: 'loadfunc', Save: 'savefunc' };

	/* Static Functions */

	/** Gets whether an element is an input field */
	static isInput(element: HTMLElement) {
		if (OptionsPage.InputTags.indexOf(element.tagName.toLowerCase()) >= 0) {
			return true;
		}
	}

	/** Gets whether an element should be ignored */
	static shouldSkip(element: HTMLElement) {
		if (element instanceof HTMLInputElement) {
			return (OptionsPage.SkipTypes.indexOf((<HTMLInputElement>element).type.toLowerCase()) >= 0);
		} else {
			return false;
		}
	}

	/** Gets whether an element is a numeric input */
	static isNumeric(element: HTMLElement) {
		if (element instanceof HTMLInputElement) {
			return (OptionsPage.NumericTypes.indexOf((<HTMLInputElement>element).type.toLowerCase()) >= 0);
		} else {
			return false;
		}
	}

	/** Gets whether an element is a boolean input */
	static isCheckable(element: HTMLElement) {
		if (element instanceof HTMLInputElement) {
			return (OptionsPage.CheckableTypes.indexOf((<HTMLInputElement>element).type.toLowerCase()) >= 0);
		} else {
			return false;
		}
	}

	/** Gets whether an element is a radio button */
	static isRadio(element: HTMLElement) {
		if (element instanceof HTMLInputElement) {
			return (OptionsPage.RadioTypes.indexOf((<HTMLInputElement>element).type.toLowerCase()) >= 0);
		} else {
			return false;
		}
	}

	/** Gets whether an element is a multi-select input */
	static isMultiSelect(element: HTMLElement) {
		if (element instanceof HTMLSelectElement) {
			return (OptionsPage.MultiSelectTypes.indexOf((<HTMLInputElement>element).type.toLowerCase()) >= 0);
		} else {
			return false;
		}
	}

	/** Gets the value of a set of radio buttons */
	static getRadioValue(element: HTMLElement): string {
		var inputs = element.ownerDocument.querySelectorAll('input[type=radio][name="' + element.getAttribute('name') + '"]');
		for (var i = 0; i < inputs.length; i++) {
			var input = <HTMLInputElement>inputs[i];
			if (input.checked) {
				return input.value;
			}
		}
		return null;
	}

	/**
	 * Coerces a number to the min/max values set on an input element
	 * @param element The input element
	 * @param value The value to check. If omitted, the element's current value is used.
	 */
	static coerceToLimits(element: HTMLInputElement, value?: number): number {
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
	}

	/**
	 * Gets the load/save transformation function for an element 
	 */
	private static getTransformFunction(element: HTMLElement, funcName: string): Function {
		var func = element.dataset[funcName];
		if (func) {
			return window[func] || null;
		} else {
			return null;
		}
	}

	/* Public Properties */

	/* Private Properties */

	private storage: SettingStorage;
	private document: Document;
	private initialized: boolean = false;
	private initQueue: { el: HTMLElement; reset: HTMLElement; }[] = [];

	/* Public Functions */

	/**
	 * @param storage The storage object to which the page should be synced
	 * @param document The document to sync. Omit to use the main document.
	 */
	constructor(storage: SettingStorage, document?: Document) {
		this.storage = storage;
		this.document = document || window.document;
		
		if (['interactive', 'complete'].indexOf(this.document.readyState) >= 0) {
			this._onDOMContentLoaded();
		} else {
			window.addEventListener('DOMContentLoaded', this._onDOMContentLoaded.bind(this));
		}
	}

	/** Updates the input with a given name to the value saved in storage. */
	public update(name: string);
	/** Updates an input to the value saved in storage. */
	public update(element: HTMLElement);
	/** Updates a set of inputs to their values saved in storage. */
	public update(elements: HTMLElement[]);
	/** Updates a set of inputs to their values saved in storage. */
	public update(elements: NodeList);
	public update(element: any) {
		this._resolveElement(element).forEach(this._update.bind(this));
	}

	/** Saves the value of the input with a given name to storage.*/
	public save(name: string);
	/** Saves the value of an input to storage.*/
	public save(element: HTMLElement);
	/** Saves the values of a set of input to storage.*/
	public save(elements: HTMLElement[]);
	/** Saves the values of a set of input to storage.*/
	public save(elements: NodeList);
	public save(element: any) {
		this._resolveElement(element).forEach(this._save.bind(this));
	}

	/**
	 * Changes the storage object used by the options page.
	 * This will update all elements on the page to the values in the new storage object.
	 */
	public setStorage(storage: SettingStorage) {
		this.storage = storage;

		var formElements = document.querySelectorAll(OptionsPage.InputTags.join(','));
		this._walkElements(formElements, this.update);
	}

	/**
	 * Configures an element to be synced with storage.
	 * @param element The element to sync
	 * @param resetButton An element which, when clicked, should reset the synced element to its default value
	 */
	public addInput(element: HTMLElement, resetButton?: HTMLElement) {
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
						this._addResetButton(<HTMLElement>resets[i], [element]);
					}
				}
			}
		}
	}
	
	/**
	 * Returns a DL element with the keys and raw values in storage
	 * @param sortfunction A function to sort settings by name
	 */
	public debugStorage(sortfunction?: (a: any, b: any) => number) {
		var keys = [];
		for (var key in this.storage.storage) {
			if (this.storage.storage.hasOwnProperty(key)) {
				keys.push(key);
			}
		}

		keys.sort(sortfunction);

		var list = document.createElement('dl');
		keys.forEach((key) => {
			var term = document.createElement('dt');
			var desc = document.createElement('dd');
			term.textContent = key;
			desc.textContent = this.storage.storage[key];
			list.appendChild(term);
			list.appendChild(desc);
		});

		return list;
	}

	/* Private Functions */

	private _onDOMContentLoaded() {
		var formElements = document.querySelectorAll(OptionsPage.InputTags.join(','));
		this._walkElements(formElements, this._setupElement);
		this._setupAllResetButtons();
		this.initialized = true;

		this.initQueue.forEach((item) => {
			this.addInput(item.el, item.reset);
		});
		this.initQueue = [];
	}

	private _walkElements(elements: NodeList, callback: (element: Element) => any) {
		for (var i = 0; i < elements.length; i++) {
			var element = <HTMLElement>elements[i];

			var name = element.getAttribute('name');
			if (!name || OptionsPage.shouldSkip(element) || element.hasAttribute('data-nosave')) {
				continue;
			}

			callback.bind(this)(element);
		}
	}

	private _setupElement(element: HTMLElement) {
		element.addEventListener('change', this._onElementChanged.bind(this), true);
		this._update(<HTMLElement>element);
	}

	private _onElementChanged(e: Event) {
		var element = <HTMLElement>e.currentTarget;
		this._save(element);
	}

	private _addResetButton(button: HTMLElement, elements: HTMLElement[]) {
		var self = this;
		button.addEventListener('click', (e: Event) => {
			if ((<HTMLElement>e.target).hasAttribute('data-confirm')) {
				
				var message = (elements.length > 1) ?
					'Are you sure you want to reset these settings to their default values?' :
					'Are you sure you want to reset this setting to its default value?';

				button.setAttribute('disabled', 'disabled');
				ModalDialog.confirm(
					'Reset to default', 
					message,
					(result) => {
						if (result) {
							self._onResetClick.bind(self)(elements);
						}
						button.removeAttribute('disabled');
					}
				);

			} else {
				self._onResetClick.bind(self)(elements);
			}
		});
	}

	private _onResetClick(elements: HTMLElement[]) {
		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			var name = element.getAttribute('name');
			var oldVal = this.storage.get(name);
			this.storage.reset(name);
			this._update(element);
			this._sendChangedEvent(name, oldVal, this.storage.get(name));
		}
	}

	private _findResetButtons(element: HTMLElement) {
		var name = element.getAttribute('name');
		try {
			return this.document.querySelectorAll('[data-reset~="' + name + '"]');
		} catch (e) {
			return null;
		}
	}

	private _setupAllResetButtons() {
		var resets = this.document.querySelectorAll('[data-reset]');
		for (var i = 0; i < resets.length; i++) {
			var elementNames = (<HTMLElement>resets[i]).dataset.reset.split(' ');
			var elements = [];
			elementNames.forEach((name) => {
				elements = elements.concat(Array.prototype.slice.call(document.getElementsByName(name)));
			});

			this._addResetButton(<HTMLElement>resets[i], Array.prototype.slice.call(elements));
		}
	}

	private _sendChangedEvent(key: string, oldValue: any, newValue: any) {
		var e = <CustomEvent>document.createEvent('CustomEvent');
		e.initCustomEvent('setting', true, true, {
			key: key,
			oldValue: oldValue,
			newValue: newValue,
		});
		this.document.dispatchEvent(e);
	}

	private _update(element: HTMLElement) {
		var inputEl = <HTMLInputElement>element;
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
			var select = <any>element;
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
	}

	private _save(element: HTMLElement) {
		var inputEl = <HTMLInputElement>element;
		var name = element.getAttribute('name');

		var value: any;
		if (OptionsPage.isCheckable(element)) {
			value = OptionsPage.isRadio(element) ? <any>OptionsPage.getRadioValue(element) : <any>inputEl.checked;
		} else if (OptionsPage.isNumeric(element)) {
			value = OptionsPage.coerceToLimits(inputEl, inputEl.valueAsNumber);
		} else if (OptionsPage.isMultiSelect(element)) {
			// collect selected option values as an array
			value = [];
			var options = (<any>element).selectedOptions;
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
	}

	private _resolveElement(name: string): HTMLElement[];
	private _resolveElement(element: HTMLElement): HTMLElement[];
	private _resolveElement(elements: HTMLElement[]): HTMLElement[];
	private _resolveElement(elements: NodeList): HTMLElement[];
	private _resolveElement(element: any): HTMLElement[] {
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
	}
}


/** Adapted from http://css-tricks.com/value-bubbles-for-range-inputs/ */
class RangeBubble {
	static HandleSize = 11;

	private _input: HTMLInputElement;
	private _output: HTMLElement;

	private _modifyOffset() {
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
	}

	private _showOutput() {
		this._output.style.display = 'block';
	}

	private _hideOutput() {
		if (window.getComputedStyle(this._output, null).getPropertyValue('opacity') === '0') {
			this._output.style.display = 'none';
		}
	}

	constructor (input: HTMLInputElement) {
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
}



interface ModalButton {
	text: string;
	action?: EventListener;
}

class ModalDialog {
	public overlay: HTMLElement;
	public dialog: HTMLElement;
	public onclose: Function;

	public static confirm(title: string, text: string, callback: (result: boolean) => any): ModalDialog {
		return new ModalDialog(title, text,
			{
				text: 'Cancel',
				action: (e) => callback(false),
			}, {
				text: 'OK',
				action: (e) => callback(true),
			});
	}

	public static message(title: string, text: string, onclose?: EventListener): ModalDialog {
		if (typeof onclose !== 'function') {
			onclose = (e) => undefined;
		}

		return new ModalDialog(title, text, onclose, {
			text: 'OK',
		});
	}

	constructor(title: string, text: string, ...buttons: ModalButton[]);
	constructor(title: string, text: string, onclose: Function, ...buttons: ModalButton[]);
	constructor(title: string, text: string, onclose: any) {
		var buttons: ModalButton[];
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
		body.innerHTML = '<p>' + text.replace('\n\n', '</p><p>').replace('\n', '<br>') + '</p>'
		
		buttons.forEach((info) => {
			var button = document.createElement('button');
			button.textContent = info.text;
			if (info.action) {
				button.addEventListener('click', info.action, false);
			}

			button.addEventListener('click', this._close.bind(this), false);
			footer.appendChild(button);
		});

		this.dialog.appendChild(header);
		this.dialog.appendChild(body);
		this.dialog.appendChild(footer);

		this.overlay.appendChild(this.dialog);
		document.body.appendChild(this.overlay);

		window.setTimeout(() => this.overlay.classList.remove('transparent'), 1);
	}

	private _cancelEvent(e: Event) {
		e.stopPropagation();
	}

	private _pulse(e) {
		this.dialog.classList.add('pulse');
	}

	private _endPulse(e) {
		this.dialog.classList.remove('pulse');
	}

	private _close(e) {
		if (this.onclose) {
			this.onclose();
		}

		this.overlay.classList.add('transparent');
		this.overlay.addEventListener('transitionend', (e) => {
			document.body.removeChild(this.overlay);
			this.overlay = null;
			this.dialog = null;
			this.onclose = null;
		})
	}
}


// Automatically intialize things on startup

window.optionsPage = null;
document.title = chrome.app.getDetails().name + ' Settings';

window.addEventListener('DOMContentLoaded', () => {

	// If there is a storage object with a common name, build the options page automatically
	var names = ['settings', 'storage'];
	for (var i = 0; i < names.length; i++) {

		if (typeof window[names[i]] !== 'undefined') {
			var settings = window[names[i]];
			if (settings instanceof SettingStorage) {
				window.optionsPage = new OptionsPage(settings);
				break;
			}
		}
	}

	// Find any range sliders and attach value displays to them
	var ranges = document.querySelectorAll('input[type=range]:not([data-no-bubble])');
	for (var i = 0; i < ranges.length; i++) {
		ranges[i]['_bubble'] = new RangeBubble(<HTMLInputElement>ranges[i]);
	}

	// Fill elements with data from the extension manifest
	var manifest = chrome.app.getDetails();

	var fields = document.querySelectorAll('[data-manifest]');
	for (var i = 0; i < fields.length; i++) {
		var properties = (<HTMLElement>fields[i]).dataset.manifest.split('.');
		var current = manifest;

		for (var k = 0; k < properties.length; k++) {
			current = current[properties[k]];
		}

		fields[i].textContent = current ? current.toString() : 'manifest: ' + properties.join('.');
	}
});