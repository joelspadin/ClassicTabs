module experimental {
	var LEFT = 37;
	var UP = 38;
	var RIGHT = 39;
	var DOWN = 40;
	var B = 66;
	var A = 65;
	
	var SEQUENCE = [UP, UP, DOWN, DOWN, LEFT, RIGHT, LEFT, RIGHT, B, A];
	var index = 0;

	document.addEventListener('keydown', (e) => {
		if (e.keyCode === SEQUENCE[index]) {
			index += 1;
			if (index >= SEQUENCE.length) {
				onCodeEntered();
				index = 0;
			} 
			
		} else {
			index = 0;
		}
	}, false);

	function onCodeEntered() {
		var hidden = document.querySelectorAll('section[hidden]');
		for (var i = 0; i < hidden.length; i++) {
			(<HTMLElement>hidden[i]).removeAttribute('hidden');
		}
	}
}

