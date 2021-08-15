var Game_Keyboard = function(game_client) {
	this.game_client = game_client;
	
	this.pressed_keys = {};
	this.pressed_modifiers = {};
	this.key_mappings = {};
	this.last_key_code = null;
	
	this.modifiers = ['shift', 'ctrl', 'alt'];
	this.alias = {
		'left'		: 37,
		'up'		: 38,
		'right'		: 39,
		'down'		: 40,
		'space'		: 32,
		'pageup'	: 33,
		'pagedown'	: 34,
		'tab'		: 9,
		'delete'	: 46,
		'-'			: 45,
		'='			: 61	
	};
	
	document.addEventListener("keydown", function() {
		this.on_keydown(event);
	}.bind(this));
	
	document.addEventListener("keyup",  function() {
		this.on_keyup(event);
	}.bind(this));
};

Game_Keyboard.prototype.on_keydown = function(event) {
	if (this.last_key_code !== event.keyCode) {
		this.on_keychange(event, true);
		this.game_client.game_core.game_map.handle_input();
	}
};

Game_Keyboard.prototype.on_keyup = function(event) {
	this.on_keychange(event, false);
	this.last_key_code = null;
};

Game_Keyboard.prototype.on_keychange = function(event, pressed) {
	this.pressed_keys[event.keyCode] = pressed;
	this.last_key_code = event.keyCode;
	
	this.pressed_modifiers['shift'] = event.shiftKey;
	this.pressed_modifiers['ctrl'] = event.ctrlKey;
	this.pressed_modifiers['alt'] = event.altKey;
};

Game_Keyboard.prototype.pressed = function(key_string) {
	var keys = key_string.split('+');
	
	for(var i = 0; i < keys.length; i++) {
		var key = keys[i];
		
		if (this.key_mappings[key])
			key = this.key_mappings[key];
		
		var pressed = false;
		if (this.modifiers.indexOf(key) !== -1) 
			pressed	= this.pressed_modifiers[key];
		else if (Object.keys(this.alias).indexOf(key) != -1)
			pressed	= this.pressed_keys[this.alias[key]];
		else
			pressed = this.pressed_keys[key.toUpperCase().charCodeAt(0)];
		
		if (!pressed)
			return false;
	}
	return true;
};

if (typeof(global) != 'undefined') {
	module.exports = global.Game_Keyboard = Game_Keyboard;
}