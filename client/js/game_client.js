var game_client = {};

window.onload = function() {
	game_client = new Game_Client();
};

window.onresize = function (event) {
	this.screen_width = window.innerWidth;
	this.screen_height = window.innerHeight;
	   
	this.game_client.renderer.view.style.width = this.screen_width + "px";    
	this.game_client.renderer.view.style.height = this.screen_height + "px";    
	
	this.game_client.renderer.resize(this.screen_width,this.screen_height);
}

var Game_Client = function() {
	// Renderer and viewport
	this.screen_width = window.innerWidth;
	this.screen_height = window.innerHeight;
	
	if (this.screen_width % 2 !== 0)
		this.screen_width += 1;
	if (this.screen_height % 2 !== 0)
		this.screen_height += 1;
	
	this.renderer = PIXI.autoDetectRenderer(this.screen_width, this.screen_height, {backgroundColor : 0x000000});
	this.viewport = this.renderer.view;
	this.viewport.id = 'main_canvas';
	document.body.appendChild(this.viewport);

	PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
	PIXI.settings.ROUND_PIXELS = true;
		
	// Server/Client details
	this.connected_to_main_server = false;		// Connection to main server
	this.server_role = 'client';				// host, client
	
	// Game Objects
	this.game_settings;
	this.player_list = {};
	this.my_player = new Game_Player();
	this.game_core = new Game_Core(this);
	this.game_ui = new Game_UI(this);
	this.game_keyboard = new Game_Keyboard(this);
	
	this.socket;				// Socket connection to main server
	
	this.connect_to_main_server();
	
	$('#main_canvas').on('mousedown',this.handleMouseDown);

	$('#main_canvas').on('mousemove',this.handleMouseMove);

	$('#main_canvas').on('mouseup',this.handleMouseUp);
	$('#main_canvas').on('mouseout',this.handleMouseUp);
};

// Establish a connection to the main server
Game_Client.prototype.connect_to_main_server = function() {
	this.socket = io.connect();
	
	// Main server message handlers
	this.socket.on('connected', this.on_main_server_connection.bind(this));
};

///////////////////////////////////////////////////////////////////////
//	GAME_CLIENT - EVENT HANDLERS
///////////////////////////////////////////////////////////////////////

Game_Client.prototype.handleMouseDown = function (event) {
	var m = game_client.game_core.game_map;
	
	// Left click
	if (event.buttons === 1) {	
		if (m.current_tool === 'selector') {
			// Update selector attributes
			m.selector_mouse_down = true;					
			m.selector_selected_area_check_hovering();		
			
			// Selector has started a drag
			if (m.selector_hovering_selected_area === true) {
				m.selector_dragging = true;
			}
			// Begin a new selector selection
			else if (m.selector_hovering_selected_area === false) {
				if (m.selector_type === 'standard') {
					m.selector_standard_start_point = {x : m.mouse_tile_position.x, y : m.mouse_tile_position.y};
					m.selector_lasso_mask = null;
					m.selector_start_box_outline();
				}
				else if (m.selector_type === 'lasso') {
					m.selector_lasso_initialize_mask();
					m.selector_start_lasso_outline();
				}
			}
		}
		else if (m.current_tool === 'tile_brush') {
			// Do a bucket fill
			if (event.altKey === true) {
				var cc_i = m.mouse_tile_position.x - m.current_canvas.relative_min.x;
				var cc_j = m.mouse_tile_position.y - m.current_canvas.relative_min.y;

				// Recursively replace contiguous real tiles with tile of currently selected tile set
				if (m.current_canvas.tile_at(cc_i,cc_j) === true)
					m.tile_brush_bucket_fill('replace',m.current_canvas.tiles[cc_i][cc_j].tile_set,m.mouse_tile_position.x,m.mouse_tile_position.y);
				else	// Recursively replace contiguous null tiles
					m.tile_brush_bucket_fill('fill',null,m.mouse_tile_position.x,m.mouse_tile_position.y);
				
				// Store as a tile brush drop
				m.tile_brush_drop(m.temp_tile_brush,m.current_canvas,true);
				m.stage.removeChild(m.temp_tile_brush.sprites);
				m.temp_tile_brush = null;
			}
			else {
				// Hide base_tile_brush
				m.base_tile_brush.sprites.visible = false;
				
				m.tile_brush_dragging = 1;
			
				if (event.shiftKey === true)
					m.tile_brush_dragging = 3;
			
				m.tile_brush_drag();
			}
		}
		else if (m.current_tool === 'entity_brush') {
			m.entity_brush_drop();
		}
	}
	
	// Middle click
	if (event.buttons === 4)	{	
		m.camera_prev_pan_pos = {x : m.mouse_raw_position.x, y : m.mouse_raw_position.y};
		
		// Hide tile_brush
		if (m.base_tile_brush !== null)
			m.base_tile_brush.sprites.visible = false;
	}
	
	// Right click
	if (event.buttons === 2) {
		// Do a bucket fill
		if (event.altKey === true) {
			var cc_i = m.mouse_tile_position.x - m.current_canvas.relative_min.x;
			var cc_j = m.mouse_tile_position.y - m.current_canvas.relative_min.y;

			// Recursively replace contiguous real tiles with null tiles
			if (m.current_canvas.tile_at(cc_i,cc_j) === true)
				m.tile_brush_bucket_fill('erase',m.current_canvas.tiles[cc_i][cc_j].tile_set,m.mouse_tile_position.x,m.mouse_tile_position.y);
			
			// Store as a tile brush drop
			m.tile_brush_drop(m.temp_tile_brush,m.current_canvas,true);
			m.stage.removeChild(m.temp_tile_brush.sprites);
			m.temp_tile_brush = null;
		}
		else {
			m.tile_brush_dragging = 2;
			
			if (event.shiftKey === true)
				m.tile_brush_dragging = 4;
		
			m.tile_brush_drag();
		}
	}
};

Game_Client.prototype.handleMouseMove = function (event) {
	var m = game_client.game_core.game_map;
	
	if (m.editor_mode === true) {
		m.update_mouse_position(event.clientX,event.clientY);

		document.getElementById('navigation_content').innerHTML = 
			'Tile : ' + m.mouse_tile_position.x + ', ' +  m.mouse_tile_position.y +
			'  Pixel : ' + m.mouse_adjusted_position.x.toFixed(0) + ', ' + m.mouse_adjusted_position.y.toFixed(0);
			
		if (m.selector_draw_outline === true) {
			if (m.selector_type === 'standard')
				m.selector_mutate_box_outline();
			else if (m.selector_type === 'lasso')
				m.selector_mutate_lasso_outline();
		}
		
		// Camera pan
		if (m.camera_prev_pan_pos !== null) {	  
			var x_diff = m.camera_prev_pan_pos.x - m.mouse_raw_position.x;
			var y_diff = m.camera_prev_pan_pos.y - m.mouse_raw_position.y;
			
			m.camera_pos.x -= x_diff;
			m.camera_pos.y -= y_diff;
			
			m.updateLayerSpritePositions();
			
			m.camera_prev_pan_pos = {x : m.mouse_raw_position.x, y : m.mouse_raw_position.y};
		}
	}
};

Game_Client.prototype.handleMouseUp = function (event) {
	if (game_client.game_core.editor_mode === true) {
		var m = game_client.game_core.game_map;
		
		if (event.type === 'mouseout' && event.buttons === 0)
			return;

		// Left click
		if (event.button === 0 || event.buttons === 1) {
			
			if (m.current_tool === 'selector') {

				// End selector hovering
				if (m.selector_draw_outline === true) {
					// Standard
					m.selector_box_outline_start_point = null;
					
					// Lasso
					m.selector_lasso_previous_point = null;
					
					m.selector_draw_outline = false;
					m.stage.removeChild(m.selector_graphics_object);
					m.selector_graphics_object = null;
				}
				
				// If not dragging ssa, finalize the new selector selection
				if (m.selector_dragging === false) {
					if (m.selector_type === 'standard') {
						var selector_standard_end_point = {x : m.mouse_tile_position.x, y : m.mouse_tile_position.y};
						m.selector_standard_select(m.selector_standard_start_point,selector_standard_end_point);
					}
					else if (m.selector_type === 'lasso') {
						m.selector_lasso_select();
					}
				}
				
				// Update selector attributes
				m.selector_mouse_down = false;
				m.selector_dragging = false;
			}
			else if (m.current_tool === 'tile_brush') {
				if (m.tile_brush_dragging > 0) {
					// Reload old tile_brush settings if rectangle fill drag
					if (m.tile_brush_dragging === 3) {
						var s = m.tile_brush_rect_settings;
						m.update_tile_brush(['brush_type','brush_size','tile_type'],[s.brush_type,s.brush_size,s.tile_type]);
					}
					
					// Reset flags
					m.tile_brush_dragging = 0;
					
					// Drop and Remove temp_tile_brush
					m.tile_brush_drop(m.temp_tile_brush,m.current_canvas,true,m.selected_brush_type);
					m.stage.removeChild(m.temp_tile_brush.sprites);
					m.temp_tile_brush = null;
					
					// Show base_tile_brush again
					m.base_tile_brush.sprites.visible = true;
				}
			}
		}
		
		// Middle click
		if (event.button === 1 || event.buttons === 4)	{
			// End canvas panning
			m.camera_prev_pan_pos = null;
			
			// Show tile_brush
			if (m.base_tile_brush !== null) {
				m.base_tile_brush.sprites.visible = true;
				m.base_tile_brush.apply_layer_attributes(true,true,true);
			}
		}
		
		// Right click
		if (event.button === 2 || event.buttons === 2) {
			if (m.current_tool === 'tile_brush') {
				if (m.tile_brush_dragging > 0) {
					// Reload old tile_brush settings if rectangle fill drag
					if (m.tile_brush_dragging === 4) {
						var s = m.tile_brush_rect_settings;
						m.update_tile_brush(['brush_type','brush_size','tile_type'],[s.brush_type,s.brush_size,s.tile_type]);
					}
					
					// Reset flags
					m.tile_brush_dragging = 0;
					
					// Drop and Remove temp_tile_brush
					m.tile_brush_drop(m.temp_tile_brush,m.current_canvas,true);
					m.stage.removeChild(m.temp_tile_brush.sprites);
					m.temp_tile_brush = null;
				}
			}
		}
	}
};

///////////////////////////////////////////////////////////////////////
//	GAME_CLIENT - SOCKET MESSAGE HANDLERS
///////////////////////////////////////////////////////////////////////

Game_Client.prototype.on_main_server_connection = function(socket_id) {
	this.connected_to_main_server = true;
	this.socket.id = socket_id;
	this.my_player.uid = socket_id;
};