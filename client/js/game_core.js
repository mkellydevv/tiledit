
// Game updates 60 times per second 16.6 ms, 60 hz
var frame_rate = 1000.0 / 60;

(function () {
    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];

    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++ x) {
        window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
        window.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function ( callback, element ) {
            var currTime = new Date().getTime();
			var timeToCall = Math.max( 0, frame_rate - (currTime - lastTime));
            var id = window.setTimeout( function() { 
				callback(currTime + timeToCall); 
			}, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) { 
			clearTimeout(id); 
		};
    }
}());

var Game_Core = function(game_client=null) {
	
	// Game_Core exists within either a Game_Client in a browser or in a Game_Lobby on a dedicated server
	this.server_type = 'not_connected';			// p2p, dedicated, not_connected
	this.game_client = game_client;
	
	// Game Objects
	this.game_map = new Game_Map(this, false);
	this.next_map;
	this.editor_map_copy;
	
	// Flags
	this.editor_mode = false;

};

///////////////////////////////////////////////////////////////////////
//	GAME_CORE - OTHER FUNCTIONS
///////////////////////////////////////////////////////////////////////

Game_Core.prototype.load_next_map = function(file_name) {
	this.next_map = new Game_Map(this, file_name);
};

Game_Core.prototype.create_new_map = function() {
	this.editor_mode = true;
	this.next_map = new Game_Map(this, true);
	this.next_map.new_map();
};

Game_Core.prototype.switch_map = function() {
	if (this.next_map.is_loaded == true) {
		this.game_map = this.next_map;
		this.next_map = null;
		
		window.cancelAnimationFrame(this.request_id);
		
		this.start_editor_update();
	}
};

///////////////////////////////////////////////////////////////////////
//	GAME_CORE - UPDATE FUNCTIONS
///////////////////////////////////////////////////////////////////////

Game_Core.prototype.editor_update = function() {
	
	this.game_client.renderer.render(this.game_map.stage);
	
	var that = this;
	this.request_id = window.requestAnimationFrame(function() {that.editor_update();}, this.game_client.viewport);
};

Game_Core.prototype.start_editor_update = function() {
	
	if (this.game_map.is_loaded == true) 
		this.editor_update();

};

Game_Core.prototype.client_handle_user_editor_input = function() {
	var inputs = '';
	
	if (this.keyboard.pressed('space'))
		inputs += '5';
	
	if (this.keyboard.pressed('alt+q'))
		inputs += '6';
	if (this.keyboard.pressed('ctrl+c'))
		inputs += '7';
	if (this.keyboard.pressed('ctrl+v'))
		inputs += '8';
	
	if (inputs.length > 0) {
		var input_packet = [inputs,this.tick];
			
		// Store the input packet on the local client
		this.game_client.my_player.inputs.push(input_packet);
	}
};

Game_Core.prototype.process_editor_input = function(game_player) {
	if (game_player.inputs.length > 0) {
		var inputs = game_player.inputs[0][0].split('');

		for (var j = 0; j < inputs.length; j++) {
			if (inputs.indexOf('7') !== -1) {
				this.game_map.copy_selected_area();
			}
			else if (inputs.indexOf('8') !== -1) {
				this.game_map.paste_selected_area();
			}
		}

		game_player.inputs = [];
	}
};

var Game_Player = function() {
	this.leader = false;
	this.name;
	this.uid;
	
	this.inputs = [];
};

if (typeof(global) != 'undefined') {
	module.exports = global.Game_Core = Game_Core;
	module.exports = global.Game_Player = Game_Player;
}