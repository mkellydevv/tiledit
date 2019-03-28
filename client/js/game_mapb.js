var tile_width = 32;
var tile_height = 32;

var chunk_width = 42;
var chunk_height = 24;

var rad_45 = 45 * (Math.PI/180);
var rad_27 = 26.565 * (Math.PI/180);
var rad_63 = 63.435 * (Math.PI/180);

var tri_scale = Math.sqrt(Math.pow(tile_width,2) + Math.pow(tile_height,2)) / tile_width;
var hor_vert_tri_scale = Math.sqrt(Math.pow((tile_width*2),2) + Math.pow(tile_height,2)) / (tile_width*2);

// Debug
debug_log_tier_1 = false;

var Game_Map = function(game_core, editor_mode) {
	
	this.game_core = game_core;
	
	// Objects
	this.map_layers = [];
	
	if (this.game_core.game_client !== null) {
		this.stage = new PIXI.Container();
		this.stage_scale = 2;
		this.stage.scale.x = this.stage_scale;
		this.stage.scale.y = this.stage_scale;
		this.loader = new PIXI.loaders.Loader();
	}
	
	// Attributes
		
	// Flags
	this.editor_mode = editor_mode;	// true, false
	this.is_loaded = false;

	this.layers_visible = 0;
	this.layers_alpha = 0;
	this.layers_lock = 0;
	
	if (editor_mode === true) {
		// Currently selected
		this.current_layer = null;
		this.current_canvas = null;
		
		this.map_changes = [];
		this.map_changes_index = null;
		
		// Mouse position attributes
		this.mouse_raw_position;
		this.mouse_adjusted_position;
		this.mouse_tile_position = {x:0,y:0};
		this.mouse_previous_tile_position;
		this.mouse_chunk_position;
		
		// Camera
		this.camera_pos = {x : 0,y : 0};	// Camera position relative to the stage pivot
		this.camera_prev_pan_pos = null;	// The previous pan position of the camera
		
		//////////
		// Tools
		
		this.current_tool = 'tile_brush';			// selector, tile_brush, entity_brush, etc
		
		// Selector objects/attributes/flags
		this.selector_selected_area = null;
		this.selector_selected_area_copy = null;
		this.selector_lasso_mask = null;
		
		this.selector_type = 'standard';			// standard, lasso
		this.selector_blank_tile_mode = 'null';		// empty, null
		
		this.selector_mouse_down = false;
		this.selector_hovering_selected_area = false;
		this.selector_dragging = false;
		
		// SSA objects/attributes/flags
		this.ssa_src_full_skeleton = null;
		this.ssa_src_mask_skeleton = null;
		this.ssa_src_anti_mask_skeleton = null;
		
		this.ssa_original_type = null;
		this.ssa_original_blank_tile_mode = null;
		this.ssa_original_position = null;
		this.ssa_original_layer_uid = null;
		
		this.ssa_dragged = false;
		
		// Selector drawing objects/attributes/flags
		this.selector_graphics_object = null;
		
		this.selector_box_outline_start_point = null;
		this.selector_standard_start_point = null;
		this.selector_lasso_previous_point = null;
		
		this.selector_draw_outline = false;
		
		// Tile_Brush objects/attributes/flags
		this.base_tile_brush = null;					// Tile_Container for standard brush
		this.temp_tile_brush = null;					// Tile_Container for brush drags and brush pastes
		this.erase_tile_brush = null;
		
		this.selected_brush_type = 'square'; 	// square, smart, tri, long_tri
		this.selected_brush_size = 1;			// 1-5
		this.selected_tile_type = 0;
		this.selected_tile_set = 0;
		
		this.tile_brush_dragging = 0;	// 0 - Not dragging, 1 - Dragging, 2 - Erase Dragging
										// 3 - Rect Fill Dragging, 4 - Erase Rect Fill Draggin
		
		this.tile_brush_rect_fill_start = null;
		
	}
};

// For loading dustforce tilesets
Game_Map.prototype.load_textures = function() {
	var num_tile_sets = 10;
	
	this.tile_set_textures = {};

	// New Tilesets
	let num_tilesets = 5;
	for (let i = 0; i < num_tilesets; i++) {
		this.loader.add(`tile_${i}`,`/client/img/tileset/tile_${i}.png`);
	}
	
	this.loader.load(function() {

		this.parseNewTiles(num_tilesets);
		
		this.game_core.switch_map();
		this.game_core.game_client.game_ui.load_editor_ui();
	}.bind(this));
};

Game_Map.prototype.parseNewTiles = function(num_tilesets) {
	let tw = tile_width,
		th = tile_height;

	for (let j = 0; j < num_tilesets; j++) {
		let texture = this.loader.resources[`tile_${j}`].texture;
		let tile_set = {
			quads: [],
			tops: [],
			sides: [],
			bots: []
		}

		// Populate quads array
		for (let i = 0; i < 4; i++) {
			let y = i * th;
			tile_set.quads.push(new PIXI.Texture(texture, new PIXI.Rectangle(0,	y, 	tw, th)));
		}

		// Populate tops and bots arrays
		let offset_x = tw * 2.5;
		tile_set.tops.push(new PIXI.Texture(texture, new PIXI.Rectangle(tw*2,0,tw/2,th)));
		tile_set.bots.push(new PIXI.Texture(texture, new PIXI.Rectangle(tw*2,th,tw/2,th)));
		for (let i = 0; i < 2; i++) {
			let x = offset_x + (tw * i);
			tile_set.tops.push(new PIXI.Texture(texture, new PIXI.Rectangle(x,0,tw,th)));
			tile_set.bots.push(new PIXI.Texture(texture, new PIXI.Rectangle(x,th,tw,th)));
		}
		tile_set.tops.push(new PIXI.Texture(texture, new PIXI.Rectangle(tw*4.5,0,tw/2,th)));
		tile_set.bots.push(new PIXI.Texture(texture, new PIXI.Rectangle(tw*4.5,th,tw/2,th)));

		// Populate sides array
		tile_set.sides.push(new PIXI.Texture(texture, new PIXI.Rectangle(tw,0,tw,th/2)));
		for (let i = 0; i < 2; i++) {
			tile_set.sides.push(new PIXI.Texture(texture, new PIXI.Rectangle(tw,th*0.5 + i * th,tw,th)));
		}
		tile_set.sides.push(new PIXI.Texture(texture, new PIXI.Rectangle(tw,th*3.5,tw,th/2)));

		this.tile_set_textures[`tile_${j}`] = tile_set;
	}	
}

Game_Map.prototype.parse_tile_set_textures = function() {
	var num_tile_sets = 10;
	
	var tw = 48;//tile_width;
	var th = 48;//tile_height;
	var tw_dbl = tw * 2;
	var th_dbl = th * 2;
	
	for (var k = 0; k < num_tile_sets; k++) {
		var texture_name = 'tile_set_' + k;
		var tile_set_texture = this.loader.resources[texture_name].texture;
		
		var tile_set = {
			quads : [],	// Array of 15 tile_quad arrays. a tile_quad is an array 4 core tile textures
			tops : [],	// Array of 8 edge tile textures (2 tiles in height)
			sides : [],	// ..
			bots : []	// ..
		};
		
		// Populate quads array
		for (var i = 1; i < 6; i++) {
			for (var j = 1; j < 4; j++) {
				var quad_array = [];
				var qx = i * tw_dbl;
				var qy = j * th_dbl;
				quad_array.push(new PIXI.Texture(tile_set_texture, new PIXI.Rectangle(qx,	 qy,	tw,th)));
				quad_array.push(new PIXI.Texture(tile_set_texture, new PIXI.Rectangle(qx,	 qy+th,	tw,th)));
				quad_array.push(new PIXI.Texture(tile_set_texture, new PIXI.Rectangle(qx+tw, qy,	tw,th)));
				quad_array.push(new PIXI.Texture(tile_set_texture, new PIXI.Rectangle(qx+tw, qy+th,	tw,th)));
				tile_set.quads.push(quad_array);
			}
		}
		
		// Populate tops and bots arrays
		var y = th * 8;
		for (var i = 0; i < 8; i++) {
			var x = (tw * 3) + (tw * i);
			tile_set.tops.push(new PIXI.Texture(tile_set_texture, new PIXI.Rectangle(x,0,tw,th_dbl)));
			tile_set.bots.push(new PIXI.Texture(tile_set_texture, new PIXI.Rectangle(x,y,tw,th_dbl)));
		}
		
		// Populate sides array
		for (var j = 1; j < 9; j++) {
			tile_set.sides.push(new PIXI.Texture(tile_set_texture, new PIXI.Rectangle(0,j * th,tw_dbl,th)));
		}
		
		this.tile_set_textures[texture_name] = tile_set;
	}
};

Game_Map.prototype.new_map = function() {
	this.load_textures();
	
	var canvas = document.getElementById('main_canvas');

	this.stage.pivot.x -= (canvas.width / 2);
	this.stage.pivot.y -= (canvas.height / 2);

	this.stage.position.x = -canvas.width / this.stage_scale;
	this.stage.position.y = -canvas.height / this.stage_scale;

	this.is_loaded = true;
};


////////////////////////////////////////////////////////////////
// General Editor Functions

Game_Map.prototype.update_mouse_position = function(raw_x, raw_y) {
	this.mouse_previous_tile_position = this.mouse_tile_position;

	// event.clientX, event.clientY from canvas element event listener
	this.mouse_raw_position = {
		x : raw_x, 
		y : raw_y
	};
	
	// Raw Position adjusted by the stage's pivot and the current layer's position
	let $canvas = $('#main_canvas');
	this.mouse_adjusted_position = {
		x : raw_x + this.stage.pivot.x  - this.current_layer.position.x*this.stage_scale ,
		y : raw_y + this.stage.pivot.y  - this.current_layer.position.y*this.stage_scale 
	};
	
	this.mouse_tile_position = {
		x : parseInt(this.mouse_adjusted_position.x / (tile_width * this.current_layer.scale * this.stage_scale)),
		y : parseInt(this.mouse_adjusted_position.y / (tile_height * this.current_layer.scale * this.stage_scale))
	};
	
	if (this.mouse_adjusted_position.x < 0)
		this.mouse_tile_position.x -= 1;
	if (this.mouse_adjusted_position.y < 0)
		this.mouse_tile_position.y -= 1;
	
	// Determine if mouse has hovered over a different tile
	var directions = [];
	if (this.mouse_previous_tile_position.x < this.mouse_tile_position.x)
		directions.push('right');
	else if (this.mouse_previous_tile_position.x > this.mouse_tile_position.x)
		directions.push('left');
	if (this.mouse_previous_tile_position.y < this.mouse_tile_position.y)
		directions.push('down');
	else if (this.mouse_previous_tile_position.y > this.mouse_tile_position.y)
		directions.push('up');
	
	if (this.current_tool === 'selector') {
		if (directions.length > 0 && this.selector_mouse_down === true) {
			// Drag selector_selected_area
			if (this.selector_dragging === true) {
				this.selector_selected_area_move();
			}
			// If in lasso mode with mouse down and not dragging a ssa, a mask must be in the process of being created
			else if (this.selector_type === 'lasso') {
				this.selector_lasso_update_mask();
			}
		}
	}
	else if (this.current_tool === 'tile_brush') {
		if (directions.length > 0) {
			// Check if tile_brush needs to move, and move it if so
			var brush_moved = this.tile_brush_move(this.base_tile_brush, directions);
			
			if (brush_moved === true) {
				// Do a drag if necessary
				if (this.tile_brush_dragging > 0)
					this.tile_brush_drag();
			}
		}
	}
};

Game_Map.prototype.handle_input = function() {
	var kb = this.game_core.game_client.game_keyboard;
	
	if (kb.pressed_modifiers['ctrl'] === true) {
		if (kb.pressed('c') === true)
			this.copy_selected_area();
		else if (kb.pressed('v') === true)
			this.paste_selected_area();
		else if (kb.pressed('x') === true)
			this.cut_selected_area();

		else if (kb.pressed('z'))
			this.undo_map_change();
		else if (kb.pressed('y'))
			this.redo_map_change();
	}
	
	else if (kb.pressed_modifiers['shift'] === true) {
		if (kb.pressed('q') === true) {
			this.set_current_tool('selector');
			this.set_selector_type('standard');
		}
		else if (kb.pressed('w') === true) {
			this.set_current_tool('selector');
			this.set_selector_type('lasso');
		}
		else if (kb.pressed('e') === true) {
			this.load_base_tile_brush();
			this.set_current_tool('tile_brush');
		}
	}
	
	else if (kb.pressed('delete'))
		this.erase_selected_area();
};

Game_Map.prototype.set_current_tool = function(tool) {
	if (tool === this.current_tool)
		return;
	
	// Destroy old tool
	if (this.current_tool === 'selector') {
		if (this.selector_selected_area !== null)
			this.selector_selected_area_drop(true);
	}
	else if (this.current_tool === 'tile_brush') {
		this.stage.removeChild(this.base_tile_brush.sprites);
		this.stage.removeChild(this.erase_tile_brush.sprites);
		this.base_tile_brush = null;
		this.erase_tile_brush = null;
	}

	this.current_tool = tool;
};


////////////////////////////////////////////////////////////////
// Game_Map - Map Change Functions

Game_Map.prototype.undo_map_change = function() {
	// Cancel ssa 
	this.selector_selected_area_cancel();

	if (this.map_changes.length > 0) {
		if (this.map_changes_index === 0)
			return;
		
		if (this.map_changes_index === null)
			this.map_changes_index = this.map_changes.length - 1;
		else if (this.map_changes_index > 0)
			this.map_changes_index -= 1;
		
		var map_change = this.map_changes[this.map_changes_index];
		
		if (map_change.type === 'selector') {
			// Switch to layer the map change occurred in
			var this_layer_uid = this.current_layer.uid;
			this.set_current_layer('layer_uid',map_change.src_layer_uid);
			
			var dest_container = new Tile_Container(this);
			dest_container.load_from_skeleton(map_change.dest_skeleton);
			dest_container.move_to(map_change.dest_pos[0],map_change.dest_pos[1]);
			this.tile_brush_drop(dest_container,this.current_canvas,false,'square',false,false);
			
			var src_container = new Tile_Container(this);
			src_container.load_from_skeleton(map_change.src_full_skeleton);
			src_container.move_to(map_change.src_pos[0],map_change.src_pos[1]);
			this.tile_brush_drop(src_container,this.current_canvas,false,'square',false,false);
			
			// Return to the current layer
			this.set_current_layer('layer_uid',this_layer_uid);
		}
		else if (map_change.type === 'tile_brush') {
			// Switch to layer the map change occurred in
			var this_layer_uid = this.current_layer.uid;
			this.set_current_layer('layer_uid',map_change.map_layer);
			
			var tmp_tile_container = new Tile_Container(this);
			
			tmp_tile_container.load_from_skeleton(map_change.ah_skeleton);
			
			if (map_change.is_smart === true)
				tmp_tile_container.move_to(map_change.ah_pos[0],map_change.ah_pos[1]);
			else
				tmp_tile_container.move_to(map_change.brush_pos[0],map_change.brush_pos[1]);
			
			this.tile_brush_drop(tmp_tile_container,this.current_canvas,false,'square');
			
			// Return to the current layer
			this.set_current_layer('layer_uid',this_layer_uid);
		}
	}
};

Game_Map.prototype.redo_map_change = function() {
	// Cancel ssa 
	this.selector_selected_area_cancel();
	
	if (this.map_changes_index !== null && this.map_changes_index < this.map_changes.length) {
		var map_change = this.map_changes[this.map_changes_index];
		
		if (map_change.type === 'selector') {
			// Switch to layer the map change occurred in
			var this_layer_uid = this.current_layer.uid;
			this.set_current_layer('layer_uid',map_change.src_layer_uid);
			
			var src_container = new Tile_Container(this);
			var erase_container = new Tile_Container(this);
			
			if (map_change.src_type === 'standard') {
				src_container.load_from_skeleton(map_change.src_full_skeleton);
				erase_container.initialize_empty_matrix(src_container.width,src_container.height);
			}
			else if (map_change.src_type === 'lasso') {
				src_container.load_from_skeleton(map_change.src_mask_skeleton);
				erase_container.load_from_skeleton(map_change.src_anti_mask_skeleton);
			}
			
			src_container.move_to(map_change.dest_pos[0],map_change.dest_pos[1]);
			erase_container.move_to(map_change.src_pos[0],map_change.src_pos[1]);
			
			this.tile_brush_drop(erase_container,this.current_canvas,false,'square',true,false);
			this.tile_brush_drop(src_container,this.current_canvas,false,'square',false,false);
			
			// Return to the current layer
			this.set_current_layer('layer_uid',this_layer_uid);
		}
		else if (map_change.type === 'tile_brush') {
			// Switch to layer the map change occurred in
			var this_layer_uid = this.current_layer.uid;
			this.set_current_layer('layer_uid',map_change.map_layer);
			
			var tmp_tile_container = new Tile_Container(this);
			tmp_tile_container.load_from_skeleton(map_change.brush_skeleton);
			tmp_tile_container.move_to(map_change.brush_pos[0],map_change.brush_pos[1]);
			
			if (map_change.is_smart === true)
				this.tile_brush_drop(tmp_tile_container,this.current_canvas,false,'smart');
			else
				this.tile_brush_drop(tmp_tile_container,this.current_canvas,false,'square');
			
			// Return to the current layer
			this.set_current_layer('layer_uid',this_layer_uid);
		}
		
		this.map_changes_index += 1;
	}
};

Game_Map.prototype.cull_map_changes = function() {
	if (this.map_changes_index !== null) {
		this.map_changes = this.map_changes.slice(0,this.map_changes_index);
		this.map_changes_index = null;
	}
};

Game_Map.prototype.selector_store_map_change = function(src_type,src_layer_uid,src_pos,src_full_skeleton,src_mask_skeleton,src_anti_mask_skeleton,dest_pos,dest_skeleton) {
	var map_change = {
		type : 'selector',
		src_type : src_type, 	// standard, lasso
		src_pos : src_pos,
		src_layer_uid : src_layer_uid,
		src_full_skeleton : src_full_skeleton,
		src_mask_skeleton : src_mask_skeleton,
		src_anti_mask_skeleton : src_anti_mask_skeleton,
		dest_pos : dest_pos,
		dest_skeleton : dest_skeleton
	};
	
	this.map_changes.push(map_change);
};

Game_Map.prototype.tile_brush_store_map_change = function(map_layer,brush_pos,ah_pos,is_smart,brush_skeleton,ah_skeleton) {
	var map_change = {
		type : 'tile_brush',
		map_layer : map_layer,
		brush_pos : brush_pos,
		ah_pos : ah_pos,
		is_smart : is_smart,
		brush_skeleton : brush_skeleton,
		ah_skeleton : ah_skeleton
	};
	
	this.map_changes.push(map_change);
};


////////////////////////////////////////////////////////////////
// Game_Map - Layer Functions

Game_Map.prototype.add_new_layer = function() {
	var new_layer = new Map_Layer(this);
	
	// Layers in editor mode use one chunk per layer
	new_layer.editor_chunk = new Map_Chunk(this);
	
	new_layer.editor_chunk.static_tiles = new Tile_Container(this);
	new_layer.editor_chunk.static_tiles.initialize_null_matrix(1,1);
	//new_layer.editor_chunk.static_tiles.sprites.position.x = new_layer.position.x;
	//new_layer.editor_chunk.static_tiles.sprites.position.y = new_layer.position.y;
	
	new_layer.editor_chunk.entity_container = new Entity_Container(this);
	
	this.map_layers.push(new_layer);
	new_layer.z_index = this.map_layers.length - 1;
	
	// Add it to pixi stage
	new_layer.sprites = new PIXI.Container();
	new_layer.sprites.addChild(new_layer.editor_chunk.static_tiles.sprites);
	new_layer.sprites.addChild(new_layer.editor_chunk.entity_container.sprites);
	
	//this.stage.addChildAt(new_layer.editor_chunk.static_tiles.sprites,0);
	this.stage.addChildAt(new_layer.sprites,0);
	
	return new_layer.uid;
};

Game_Map.prototype.set_current_layer = function(type, identifier) {
	// type : 'layer_uid'|'element'
	
	// Drop ssa if necessary
	if (this.selector_selected_area !== null) {
		this.selector_selected_area_drop(true);
	}
	
	this.current_layer = null;
	this.current_canvas = null;
	
	if (type === 'layer_uid') {
		for (var i = 0; i < this.map_layers.length && this.current_layer === null; i++) {
			if (this.map_layers[i].uid === identifier) {
				this.current_layer = this.map_layers[i];
				this.current_canvas = this.current_layer.editor_chunk.static_tiles;
			}
		}
	}
	else if (type === 'element') {
		this.current_layer = this.map_layers[identifier];
		this.current_canvas = this.current_layer.editor_chunk.static_tiles;
	}
	
	// Apply layer attributes to current tool brush
	if (this.base_tile_brush !== null) {
		this.base_tile_brush.apply_layer_attributes(true,true,true);
	}
};

Game_Map.prototype.set_layer_scale = function(value) {
	this.current_layer.scale = Number(value);
	
	this.current_layer.editor_chunk.static_tiles.sprites.scale.x = this.current_layer.scale;
	this.current_layer.editor_chunk.static_tiles.sprites.scale.y = this.current_layer.scale;

	if (this.base_tile_brush !== null)
		this.base_tile_brush.apply_layer_attributes(true,true,true);
};

Game_Map.prototype.set_layer_offset = function(x,y) {
	if (x !== null)
		this.current_layer.offset.x = Number(x);
	if (y !== null) 
		this.current_layer.offset.y = Number(y);
	
	this.update_layer_camera_offset();

	if (this.base_tile_brush !== null)
		this.base_tile_brush.apply_layer_attributes(true,true,true);
};

Game_Map.prototype.set_layer_scroll_speed = function(x,y) {
	if (x !== null)
		this.current_layer.scroll_speed.x = Number(x);
	if (y !== null)
		this.current_layer.scroll_speed.y = Number(y);
	
	this.update_layer_camera_offset();
	if (this.base_tile_brush !== null)
		this.base_tile_brush.apply_layer_attributes(true,true,true);
};

Game_Map.prototype.set_layer_tint = function(value) {
	var color = value;
	color = color.replace(/^#/, "0x");
	color = color.replace(/f/g, "F");
	
	this.current_layer.tint = color;
	
	this.current_layer.editor_chunk.static_tiles.apply_layer_attributes(false,false,true);
	if (this.base_tile_brush !== null)
		this.base_tile_brush.apply_layer_attributes(false,false,true);
};

Game_Map.prototype.update_layer_camera_offset = function() {
	for (let i = 0; i < this.map_layers.length; i++) {
		this.map_layers[i].position.x = (this.camera_pos.x * this.map_layers[i].scroll_speed.x) + this.map_layers[i].offset.x;
		this.map_layers[i].position.y = (this.camera_pos.y * this.map_layers[i].scroll_speed.y) + this.map_layers[i].offset.y;
	
		this.map_layers[i].sprites.position.x = Math.round(this.map_layers[i].position.x);
		this.map_layers[i].sprites.position.y = Math.round(this.map_layers[i].position.y);
	}			
};

Game_Map.prototype.apply_editor_attribute_to_layers = function(attribute, do_cycle) {
	// 0 - All layers visible/1 Alpha/Not locked
	// 1 - Forward layers not visible/.4 alpha/locked
	// 2 - All but current layer not visible/.4 alpha/locked
	
	var attribute_state;
	
	if (do_cycle === true) {
		if (attribute === 'visible') {
			this.layers_visible += 1;
			if (this.layers_visible === 3)
				this.layers_visible = 0;
			attribute_state = this.layers_visible;
		}
		else if (attribute === 'alpha') {
			this.layers_alpha += 1;
			if (this.layers_alpha === 3)
				this.layers_alpha = 0;
			attribute_state = this.layers_alpha;
		}
		else if (attribute === 'lock') {
			this.layers_lock += 1;
			if (this.layers_lock === 3)
				this.layers_lock = 0;
			attribute_state = this.layers_lock;
		}
	}
	else {
		if (attribute === 'visible')
			attribute_state = this.layers_visible;
		else if (attribute === 'alpha')
			attribute_state = this.layers_alpha;
		else if (attribute === 'lock')
			attribute_state = this.layers_lock;
	}
	
	if (attribute_state === 0) {
		for (var i = 0; i < this.map_layers.length; i++) {
			this.map_layers[i].set_editor_attribute(attribute, 1);
		}
	}
	else {
		var found_current_layer = false;
		for (var i = 0; i < this.map_layers.length; i++) {
			if (found_current_layer === false) {
				// Current Layer
				if (this.map_layers[i] === this.current_layer) {	
					this.map_layers[i].set_editor_attribute(attribute, 1);
					found_current_layer = true;
				}
				// Layers in front of current layer
				else
					this.map_layers[i].set_editor_attribute(attribute, 0);
			}
			// Layers behind current layer
			else {
				if (attribute_state === 1)
					this.map_layers[i].set_editor_attribute(attribute, 1);
				else if (attribute_state === 2)
					this.map_layers[i].set_editor_attribute(attribute, 0);
			}
		}
	}
};

Game_Map.prototype.getLayersVisibility = function() {
	let arr_layer_vis = [];
	for (var i = 0; i < this.map_layers.length; i++) {
		arr_layer_vis.push({uid:this.map_layers[i].uid,
			visible:this.map_layers[i].editor_chunk.static_tiles.sprites.visible});
	}
	return arr_layer_vis;
};

Game_Map.prototype.setLayerVisibility = function(layer_uid,bool_val=null) {
	var found_current_layer = false;
	for (var i = 0; i < this.map_layers.length && found_current_layer === false; i++) {
		if (this.map_layers[i].uid === layer_uid) {
			if (bool_val === null)
				this.map_layers[i].editor_chunk.static_tiles.sprites.visible = !this.map_layers[i].editor_chunk.static_tiles.sprites.visible;
			else
				this.map_layers[i].editor_chunk.static_tiles.sprites.visible = bool_val;
		}
	}
};


////////////////////////////////////////////////////////////////
// Game_Map - Selector Functions

Game_Map.prototype.copy_selected_area = function() {
	if (this.selector_selected_area !== null)
		this.selector_selected_area_copy = this.selector_selected_area.get_deep_copy(false);
};

Game_Map.prototype.erase_selected_area = function() {
	if (this.selector_selected_area !== null) {
		this.cull_map_changes();
	
		var ssa = this.selector_selected_area;
		var eraser = ssa.get_empty_copy();
		if (this.selector_lasso_mask !== null) {
			eraser.apply_mask(this.selector_lasso_mask);
		}

		var brush_skeleton = eraser.get_skeleton_copy_between(false,ssa.relative_min.x,ssa.relative_min.y,ssa.relative_max.x,ssa.relative_max.y);
	
		var ah_skeleton = ssa.get_skeleton_copy_between(false,ssa.relative_min.x,ssa.relative_min.y,ssa.relative_max.x,ssa.relative_max.y);
		
		// Using tile_brush_drop works better
		this.tile_brush_store_map_change(this.current_layer.uid,[this.ssa_original_position.x,this.ssa_original_position.y],
			[this.ssa_original_position.x,this.ssa_original_position.y],false,brush_skeleton,ah_skeleton);
			
		this.stage.removeChild(this.selector_selected_area.sprites);
		this.selector_selected_area = null;
	}
};

Game_Map.prototype.cut_selected_area = function() {
	this.copy_selected_area();
	this.erase_selected_area();
};

Game_Map.prototype.paste_selected_area = function() {
	if (this.selector_selected_area === null) {
		this.selector_selected_area = this.selector_selected_area_copy;
		this.selector_selected_area.move_to(this.mouse_tile_position.x,this.mouse_tile_position.y);
		this.selector_selected_area_show();
	}
};

Game_Map.prototype.set_selector_type = function(type) {
	this.selector_type = type;
};

// SSA functions

Game_Map.prototype.selector_selected_area_show = function() {
	
	var ssa = this.selector_selected_area;
	ssa.sprite_seed = this.current_canvas.sprite_seed;
	if (ssa !== null) {
		// Load tile sprites into ssa.sprites
		ssa.tiles_function_between('load_sprite_core',ssa.relative_min.x,ssa.relative_min.y,ssa.relative_max.x,ssa.relative_max.y);	
		
		// Apply tint		
		ssa.apply_layer_attributes(false,false,true);
		
		// Add outline
		ssa.outline_type = 1;
		ssa.load_outline();
		
		// Apply scale and position	
		ssa.apply_layer_attributes(true,true,false);

		this.stage.addChild(ssa.sprites);
	}
};

Game_Map.prototype.selector_selected_area_drop = function(store_change) {
	if (debug_log_tier_1 === true)
		console.log('Calling Game_Map.selector_selected_area_drop()');
	
	var ssa = this.selector_selected_area;

	if (this.ssa_original_position !== null) {
		if (store_change === true) {
			var same_pos = false;
			if (this.ssa_original_position.x === ssa.relative_min.x && this.ssa_original_position.y === ssa.relative_min.y)
				same_pos = true;
			
			if (this.ssa_dragged === true && same_pos === false) {
				this.cull_map_changes();
			
				var dest_skeleton = this.current_canvas.get_skeleton_copy_between(true,ssa.relative_min.x,ssa.relative_min.y,ssa.relative_max.x,ssa.relative_max.y);
				
				this.selector_store_map_change(this.ssa_original_type,this.ssa_original_layer_uid,
												[this.ssa_original_position.x,this.ssa_original_position.y],
												this.ssa_src_full_skeleton,this.ssa_src_mask_skeleton,this.ssa_src_anti_mask_skeleton,
												[ssa.relative_min.x,ssa.relative_min.y],
												dest_skeleton);
			}
		}
		
		// Do the drop
		this.tile_brush_drop(ssa,this.current_canvas,false,'square',false,true);
	}
	// ssa attributes are null bc ssa was generated from a copy	
	else {
		// Do the drop
		this.tile_brush_drop(ssa,this.current_canvas,true,'square',false,true);
	}
	
	// Clear all ssa attributes
	this.selector_selected_area_clear();
};

Game_Map.prototype.selector_selected_area_move = function() {
	this.ssa_dragged = true;
	
	var x_diff = this.mouse_tile_position.x - this.mouse_previous_tile_position.x;
	var y_diff = this.mouse_tile_position.y - this.mouse_previous_tile_position.y;
	
	var x_pos = this.selector_selected_area.relative_min.x + x_diff;
	var y_pos = this.selector_selected_area.relative_min.y + y_diff;
	
	this.selector_selected_area.move_to(x_pos,y_pos);
};

Game_Map.prototype.selector_selected_area_check_hovering = function() {
	var ssa = this.selector_selected_area;
	
	if (ssa !== null) {
		if (this.mouse_tile_position.x >= ssa.relative_min.x && 
			this.mouse_tile_position.x <= ssa.relative_max.x &&
			this.mouse_tile_position.y >= ssa.relative_min.y && 
			this.mouse_tile_position.y <= ssa.relative_max.y) {
			
			var ssa_i = this.mouse_tile_position.x - ssa.relative_min.x;
			var ssa_j = this.mouse_tile_position.y - ssa.relative_min.y;
			
			if (ssa.tiles[ssa_i][ssa_j] === null)
				this.selector_hovering_selected_area = false;
			else
				this.selector_hovering_selected_area = true;
		}
		else
			this.selector_hovering_selected_area = false;
	}
	else
		this.selector_hovering_selected_area = false;
};

Game_Map.prototype.selector_selected_area_clear = function() {
	if (this.selector_selected_area !== null) {
		this.stage.removeChild(this.selector_selected_area.sprites);
		this.selector_selected_area = null;
	}
	
	this.ssa_src_full_skeleton = null;
	this.ssa_src_mask_skeleton = null;
	this.ssa_src_anti_mask_skeleton = null;
	
	this.ssa_original_type = null;
	this.ssa_original_blank_tile_mode = null;
	this.ssa_original_position = null;
	this.ssa_original_layer_uid = null;
	this.ssa_dragged = false;
};

Game_Map.prototype.selector_selected_area_cancel = function() {
	if (this.selector_selected_area !== null) {
		this.selector_selected_area.move_to(this.ssa_original_position.x,this.ssa_original_position.y);
		this.selector_selected_area_drop(false);
	}
}

// Standard selector functions

Game_Map.prototype.selector_standard_select = function(tile_pos_1,tile_pos_2) {
	if (debug_log_tier_1 === true)
		console.log('Calling Game_Map.selector_standard_select()');
	
	// Perform a tile_brush_drop of selector_selected_area if it was dragged and exists
	if (this.selector_selected_area !== null) {
		this.selector_selected_area_drop(true);
	}
	
	// Determine ssa dimensions
	var x_min = Math.min(tile_pos_1.x, tile_pos_2.x);
	var x_max = Math.max(tile_pos_1.x, tile_pos_2.x);
	var y_min = Math.min(tile_pos_1.y, tile_pos_2.y);
	var y_max = Math.max(tile_pos_1.y, tile_pos_2.y);
	var width = x_max - x_min + 1;
	var height = y_max - y_min + 1;
	
	// Create a new tile container for ssa and move it to appropriate position
	var ssa = new Tile_Container(this);
	if (this.selector_blank_tile_mode === 'empty')
		ssa.initialize_empty_matrix(width,height);
	else if (this.selector_blank_tile_mode === 'null')
		ssa.initialize_null_matrix(width,height);
	ssa.move_to(x_min,y_min);
	
	// Save details about the original ssa before it is dragged/dropped
	this.ssa_original_type = this.selector_type;
	this.ssa_original_blank_tile_mode = this.selector_blank_tile_mode;
	this.ssa_original_position = {x : x_min, y : y_min};
	this.ssa_original_layer_uid = this.current_layer.uid;
	
	// Create a tile container to erase the area hovered by ssa
	var erase_container = ssa.get_empty_copy();

	// Copy the tiles selected between x|y_min and x|y_max to ssa 
	if (this.selector_blank_tile_mode === 'empty') {
		this.tile_brush_copy_to(this.current_canvas,ssa,'square',true,true);
	}
	else if (this.selector_blank_tile_mode === 'null') {
		this.tile_brush_copy_to(this.current_canvas,ssa,'square',false,false);
		
		ssa.cull_null_edges();
		
		// Update the original position of ssa
		this.ssa_original_position = {x : ssa.relative_min.x, y : ssa.relative_min.y};
		
		// ssa is null if no tiles were selected 
		if (ssa.empty === true) {
			ssa = null;
			this.selector_selected_area_clear();
		}
	}
	
	// Set this.selector_selected_area to the finalized ssa
	this.selector_selected_area = ssa;
	
	if (ssa !== null && ssa.empty === false) {
		
		// Store ssa_src_full_skeleton
		this.ssa_src_full_skeleton = ssa.get_skeleton_copy_between(false,ssa.relative_min.x,ssa.relative_min.y,ssa.relative_max.x,ssa.relative_max.y);
		
		// tile_brush_drop erase_container at this.ssa_original_position
		this.tile_brush_drop(erase_container,this.current_canvas,false,'square',false,false);
		
		// Show ssa.sprites and border on this.stage
		this.selector_selected_area_show();
	}
};

// Lasso selector functions

Game_Map.prototype.selector_lasso_select = function() {
	if (debug_log_tier_1 === true)
		console.log('Calling Game_Map.selector_lasso_select()');
	
	// Perform a tile_brush_drop of selector_selected_area if it was dragged and exists
	if (this.selector_selected_area !== null) {
		this.selector_selected_area_drop(true);
	}

	// Put finishing touches on selector_lasso_mask
	this.selector_lasso_finalize_mask();
	
	// Derive an anti_mask from selector_lasso_mask
	this.selector_lasso_anti_mask = this.selector_lasso_get_anti_mask(this.selector_lasso_mask);
	
	var mask = this.selector_lasso_mask;
	var anti_mask = this.selector_lasso_anti_mask;
	
	var ssa;
	var anti_ssa;
	
	if (this.selector_blank_tile_mode === 'empty')
		ssa = this.selector_lasso_mask.get_empty_copy();
	else if (this.selector_blank_tile_mode === 'null')
		ssa = this.selector_lasso_mask.get_null_copy();
	
	// Save details about the original ssa before it is dragged/dropped
	this.ssa_original_type = this.selector_type;
	this.ssa_original_blank_tile_mode = this.selector_blank_tile_mode;
	this.ssa_original_position = {x : ssa.relative_min.x, y : ssa.relative_min.y};
	this.ssa_original_layer_uid = this.current_layer.uid;
	
	// Copy entire area hovered by ssa over this.current_canvas onto ssa
	if (this.selector_blank_tile_mode === 'empty') {
		this.tile_brush_copy_to(this.current_canvas,ssa,'square',true,true);
		anti_ssa = ssa.get_deep_copy(true);
	}
	else if (this.selector_blank_tile_mode === 'null') {
		this.tile_brush_copy_to(this.current_canvas,ssa,'square',false,false);
		
		var amount_to_cull = ssa.get_null_edges();
		
		ssa.cull_null_edges();
		
		// Cull masks to match ssa dimensions
		if (amount_to_cull !== null) {
			if (amount_to_cull.left > 0 || amount_to_cull.right > 0 || amount_to_cull.up > 0 || amount_to_cull.down > 0) {
				mask.cull_edges(amount_to_cull);
				anti_mask = this.selector_lasso_get_anti_mask(mask);
			}
		}
		
		// Update the original position of ssa
		this.ssa_original_position = {x : ssa.relative_min.x, y : ssa.relative_min.y};
		
		// ssa is null if no tiles were selected 
		if (ssa.empty === true) {
			ssa = null;
			this.selector_selected_area_clear();
		}
		else {
			anti_ssa = ssa.get_deep_copy(false);
		}
	}
	
	// Set this.selector_selected_area to the finalized ssa
	this.selector_selected_area = ssa;
	
	if (ssa !== null) {
		// Store ssa_src_full_skeleton before applying mask
		this.ssa_src_full_skeleton = ssa.get_skeleton_copy_between(false,ssa.relative_min.x,ssa.relative_min.y,ssa.relative_max.x,ssa.relative_max.y);
		
		// Apply masks to ssa and anti_ssa
		ssa.apply_mask(mask);
		anti_ssa.apply_mask(anti_mask);
		
		// Store ssa_src_mask_skeleton
		this.ssa_src_mask_skeleton = ssa.get_skeleton_copy_between(false,ssa.relative_min.x,ssa.relative_min.y,ssa.relative_max.x,ssa.relative_max.y);
		
		// Store ssa_src_anti_mask_skeleton
		this.ssa_src_anti_mask_skeleton = anti_ssa.get_skeleton_copy_between(false,anti_ssa.relative_min.x,anti_ssa.relative_min.y,
			anti_ssa.relative_max.x,anti_ssa.relative_max.y);

		// tile_brush_drop anti_ssa at this.ssa_original_position
		this.tile_brush_drop(anti_ssa,this.current_canvas,false,'square',true,true);
		
		// Show ssa.sprites and border on this.stage
		this.selector_selected_area_show();
	}
};

Game_Map.prototype.selector_lasso_initialize_mask = function() {
	if (debug_log_tier_1 === true)
		console.log('Calling Game_Map.selector_lasso_initialize_mask()');
	
	this.selector_lasso_mask = new Tile_Container(this);
	this.selector_lasso_mask.initialize_null_matrix(1,1);
	this.selector_lasso_mask.move_to(this.mouse_tile_position.x,this.mouse_tile_position.y);
	
	this.selector_lasso_mask.mask = true;
	
	this.selector_lasso_mask.tiles[0][0] = true;
	
	this.selector_lasso_start_tile = {x : this.mouse_tile_position.x, y : this.mouse_tile_position.y};
	this.selector_lasso_end_tile = {x : this.mouse_tile_position.x, y : this.mouse_tile_position.y};
};

Game_Map.prototype.selector_lasso_update_mask = function() {
	var prev_pos = this.mouse_previous_tile_position;
	var curr_pos = this.mouse_tile_position;
	
	var mask = this.selector_lasso_mask;
	
	var mask_i = curr_pos.x - mask.relative_min.x;
	var mask_j = curr_pos.y - mask.relative_min.y;
	
	// Expand if necessary
	if (curr_pos.x < prev_pos.x && mask_i < 0)
		mask.expand((prev_pos.x - curr_pos.x),'left');
	else if (curr_pos.x > prev_pos.x && mask_i > mask.x_max)
		mask.expand((curr_pos.x - prev_pos.x),'right');
	if (curr_pos.y < prev_pos.y && mask_j < 0)
		mask.expand((prev_pos.y - curr_pos.y),'up');
	else if (curr_pos.y > prev_pos.y && mask_j > mask.y_max)
		mask.expand((curr_pos.y - prev_pos.y),'down');
	
	mask_i = curr_pos.x - mask.relative_min.x;
	mask_j = curr_pos.y - mask.relative_min.y;

	mask.tiles[mask_i][mask_j] = true;

	// Fill in tiles skipped if necessary
	this.selector_lasso_fill_mask_between(prev_pos,curr_pos);
	
	// Set new end tile
	this.selector_lasso_end_tile = {x : this.mouse_tile_position.x, y : this.mouse_tile_position.y};
};

Game_Map.prototype.selector_lasso_fill_mask_between = function(prev_pos,curr_pos) {
	var x_diff = Math.abs(curr_pos.x - prev_pos.x);
	var y_diff = Math.abs(curr_pos.y - prev_pos.y);
	
	var discrete_x_intervals = x_diff - 1;
	var discrete_y_intervals = y_diff - 1;
	
	if (discrete_x_intervals > 0 || discrete_y_intervals > 0) {

	
		var mask = this.selector_lasso_mask;
		
		// x or y axis is used based on whichever axis has more discrete intervals
		var axis = 'x';
		if (discrete_x_intervals < discrete_y_intervals)
			axis = 'y';
		
		// x_sign and y_sign are +1 if prev_pos.x|y < curr_pos.x|y, -1 otherwise
		var x_sign = 1;	
		var y_sign = 1;	
		if (prev_pos.x > curr_pos.x)
				x_sign = -1;
		if (prev_pos.y > curr_pos.y)
				y_sign = -1;
		
		var step;
		var mask_i, mask_j;
		
		if (axis === 'x') {
			step = y_diff / x_diff;
			for (var i = 1; i <= discrete_x_intervals; i++) {
				mask_i = prev_pos.x + (i*x_sign) - mask.relative_min.x;
				mask_j = Math.round(prev_pos.y + (step * i * y_sign)) - mask.relative_min.y;
				mask.tiles[mask_i][mask_j] = true;
			}
		}
		else if (axis === 'y') {
			step = x_diff / y_diff;
			for (var j = 1; j <= discrete_y_intervals; j++) {
				mask_i = Math.round(prev_pos.x + (step * j * x_sign)) - mask.relative_min.x;
				mask_j = prev_pos.y + (j*y_sign) - mask.relative_min.y;
				mask.tiles[mask_i][mask_j] = true;
			}
		}
	}
};

Game_Map.prototype.selector_lasso_finalize_mask = function() {

	// Close the lasso loop
	this.selector_lasso_fill_mask_between(this.selector_lasso_start_tile,this.selector_lasso_end_tile);
	
	var mask = this.selector_lasso_mask;
	
	// Check for null tiles along outer bounds of mask.  Recursively search for neighboring null tiles from found null bound tiles.
	for (var i = 0; i < mask.width; i++) {
		if (mask.tiles[i][0] === null) // From top
			this.selector_lasso_set_mask_tile_false(mask,i,0);
		if (mask.tiles[i][mask.y_max] === null)// From bottom
			this.selector_lasso_set_mask_tile_false(mask,i,mask.y_max);
	}
	for (var j = 0; j < mask.height; j++) {
		if (mask.tiles[0][j] === null) // From left
			this.selector_lasso_set_mask_tile_false(mask,0,j);
		if (mask.tiles[mask.x_max][j] === null) // From right
			this.selector_lasso_set_mask_tile_false(mask,mask.x_max,j);
	}
	
	// Set all remaining null tiles in mask to true
	for (var i = 0; i < mask.width; i++) {
		for (var j = 0; j < mask.height; j++) {
			if (mask.tiles[i][j] === null)
				mask.tiles[i][j] = true;
		}
	}
};

// Recursively checks cardinal neighbors as well
Game_Map.prototype.selector_lasso_set_mask_tile_false = function(mask, i, j) {
	if (mask.tiles[i][j] === null) {
		mask.tiles[i][j] = false;

		if (i - 1 >= 0)
			this.selector_lasso_set_mask_tile_false(mask, i - 1, j);
		if (i + 1 <= mask.x_max)
			this.selector_lasso_set_mask_tile_false(mask, i + 1, j);
		if (j - 1 >= 0)
			this.selector_lasso_set_mask_tile_false(mask, i, j - 1);
		if (j + 1 <= mask.y_max)
			this.selector_lasso_set_mask_tile_false(mask, i , j + 1);
	}
};

Game_Map.prototype.selector_lasso_get_anti_mask = function(mask) {
	var anti_mask = mask.get_null_copy();
	anti_mask.mask = true;
	
	for (var i = 0; i < mask.width; i++) {
		for (var j = 0; j < mask.height; j++) {
			anti_mask.tiles[i][j] = !mask.tiles[i][j];
		}
	}
	
	return anti_mask;
};

// Selector outline/border functions

Game_Map.prototype.selector_start_box_outline = function() {
	this.selector_draw_outline = true;

	this.selector_box_outline_start_point = {
		x : (this.mouse_adjusted_position.x / this.stage_scale),
		y : (this.mouse_adjusted_position.y / this.stage_scale)
	};
};

Game_Map.prototype.selector_mutate_box_outline = function() {
	
	if (this.selector_draw_outline === false)
		return;
	
	// This function currently redraws the box on each call
	if (this.selector_graphics_object !== null)
		this.stage.removeChild(this.selector_graphics_object);

	var width = (this.mouse_adjusted_position.x / this.stage_scale) - this.selector_box_outline_start_point.x;
	var height = (this.mouse_adjusted_position.y / this.stage_scale) - this.selector_box_outline_start_point.y;
	
	if (width === 0 || height === 0)
		return;
	
	this.selector_graphics_object = new PIXI.Graphics();
	this.selector_graphics_object.lineStyle(2,'0x00FF00');
	this.selector_graphics_object.drawRect(this.selector_box_outline_start_point.x, this.selector_box_outline_start_point.y, width, height);
			
	// Apply layer position	
	this.selector_graphics_object.position.set(this.current_layer.position.x,this.current_layer.position.y);
			
	this.stage.addChild(this.selector_graphics_object);
};

Game_Map.prototype.selector_start_lasso_outline = function() {
	this.selector_draw_outline = true;
	
	this.selector_graphics_object = new PIXI.Graphics();
	this.selector_graphics_object.lineStyle(2,'0x00FF00');
	
	// Apply layer position	
	this.selector_graphics_object.position.set(this.current_layer.position.x,this.current_layer.position.y);
	
	this.stage.addChild(this.selector_graphics_object);
	
	this.selector_lasso_previous_point = {
		x : (this.mouse_adjusted_position.x / this.stage_scale),
		y : (this.mouse_adjusted_position.y / this.stage_scale)
	};
};

Game_Map.prototype.selector_mutate_lasso_outline = function() {
	if (this.selector_draw_outline === false)
		return;
	
	// Creates a more jittery effect
	var x_thresh = this.selector_lasso_previous_point.x - (this.mouse_adjusted_position.x / this.stage_scale);
	var y_thresh = this.selector_lasso_previous_point.y - (this.mouse_adjusted_position.y / this.stage_scale);
	if ((x_thresh > -9 && x_thresh < 9) && (y_thresh > -9 && y_thresh < 9))
		return;
	
	this.selector_graphics_object.moveTo(this.selector_lasso_previous_point.x,this.selector_lasso_previous_point.y);
	this.selector_graphics_object.lineTo(this.mouse_adjusted_position.x / this.stage_scale,this.mouse_adjusted_position.y / this.stage_scale);
	
	this.selector_lasso_previous_point = {
		x : (this.mouse_adjusted_position.x / this.stage_scale), 
		y : (this.mouse_adjusted_position.y / this.stage_scale)
	};
};


////////////////////////////////////////////////////////////////
// Game_Map - Tile Brush Functions

Game_Map.prototype.toggle_blank_tile_mode = function() {
	if (this.selector_blank_tile_mode === 'null')
		this.selector_blank_tile_mode = 'empty';
	else if (this.selector_blank_tile_mode === 'empty')
		this.selector_blank_tile_mode = 'null';
};

Game_Map.prototype.update_tile_brush = function(types, values) {
	var type = types.indexOf('brush_type');
	if (type !== -1)
		this.selected_brush_type = values[type];
	
	type = types.indexOf('brush_size');
	if (type !== -1)
		this.selected_brush_size = values[type];
	
	type = types.indexOf('tile_type');
	if (type !== -1)
		this.selected_tile_type = values[type];
	
	type = types.indexOf('tile_set');
	if (type !== -1)
		this.selected_tile_set = values[type];
	
	this.load_base_tile_brush();
};

Game_Map.prototype.load_base_tile_brush = function() {
	var prev_pos = null;
	
	// Remove base_tile_brush.sprites and store prev_pos if a base_tile_brush already exists
	if (this.base_tile_brush) {
		this.stage.removeChild(this.base_tile_brush.sprites);
		prev_pos = {
			x: this.base_tile_brush.relative_min.x, 
			y: this.base_tile_brush.relative_min.y
		};
	}
	
	this.base_tile_brush = new Tile_Container(this);
	this.base_tile_brush.load_brush();
	
	// Set position of this.base_tile_brush to the previous position
	if (prev_pos !== null)
		this.base_tile_brush.move_to(prev_pos.x,prev_pos.y);
	else
		this.base_tile_brush.move_to(this.mouse_tile_position.x,this.mouse_tile_position.y);
	
	this.erase_tile_brush = this.base_tile_brush.get_empty_copy();
		
	// Apply layer attributes to tile_brush
	this.base_tile_brush.apply_layer_attributes(true,true,true);
	
	this.stage.addChild(this.base_tile_brush.sprites);
};

// Move given brush along stage's 'tile grid' if no longer hovering brush.center
Game_Map.prototype.tile_brush_move = function(brush, directions) {
	var brush_moved = false;
	
	// Update brush.relative_min and brush.sprites relative position
	if (directions.indexOf('right') !== -1) {
		if (this.mouse_tile_position.x > (brush.relative_min.x + brush.center.x_max)) {
			brush.relative_min.x = this.mouse_tile_position.x - brush.center.x_max;
			brush.sprites.pivot.x = brush.relative_min.x * -tile_width;
			brush_moved = true;
		}
	}
	else if (directions.indexOf('left') !== -1) {
		if (this.mouse_tile_position.x < (brush.relative_min.x + brush.center.x_min)) {
			brush.relative_min.x = this.mouse_tile_position.x - brush.center.x_min;
			brush.sprites.pivot.x = brush.relative_min.x * -tile_width;
			brush_moved = true;
		}
	}
	if (directions.indexOf('down') !== -1) {
		if (this.mouse_tile_position.y > (brush.relative_min.y + brush.center.y_max)) {
			brush.relative_min.y = this.mouse_tile_position.y - brush.center.y_max;
			brush.sprites.pivot.y = brush.relative_min.y * -tile_height;
			brush_moved = true;
		}
	}
	else if (directions.indexOf('up') !== -1) {
		if (this.mouse_tile_position.y < (brush.relative_min.y + brush.center.y_min)) {
			brush.relative_min.y = this.mouse_tile_position.y - brush.center.y_min;
			brush.sprites.pivot.y = brush.relative_min.y * -tile_height;
			brush_moved = true;
		}
	}
	
	if (brush_moved === true) {
		brush.update_dimensions();
		this.erase_tile_brush.move_to(brush.relative_min.x,brush.relative_min.y);
	}
	
	return brush_moved;
};

// During a smart drop, dropping certain brush tiles onto certain canvas tiles will yield a different tile_type
Game_Map.prototype.tile_brush_convert_brush_tile = function(brush_tile_type,canvas_tile_type) {
	// Return -1 for no conversion
	// Return 0 for conversion to square tile_type
	// Return 1-4 for conversion to tri tile_types
	
	var convert_to = 0;
							
	if (brush_tile_type == 1) {
		var group_a = [1,5,13];
		var group_b = [9,17];
		if (group_a.indexOf(canvas_tile_type) > -1)
			convert_to = -1;
		else if (group_b.indexOf(canvas_tile_type) > -1)
			convert_to = 1;
	}	
	else if (brush_tile_type == 2) {
		var group_a = [2,6,14];
		var group_b = [10,18];
		if (group_a.indexOf(canvas_tile_type) > -1)
			convert_to = -1;
		else if (group_b.indexOf(canvas_tile_type) > -1)
			convert_to = 2;
	}	
	else if (brush_tile_type == 3) {
		var group_a = [3,7,15];
		var group_b = [11,19];
		if (group_a.indexOf(canvas_tile_type) > -1)
			convert_to = -1;
		else if (group_b.indexOf(canvas_tile_type) > -1)
			convert_to = 3;
	}	
	else if (brush_tile_type == 4) {
		var group_a = [4,8,16];
		var group_b = [12,20];
		if (group_a.indexOf(canvas_tile_type) > -1)
			convert_to = -1;
		else if (group_b.indexOf(canvas_tile_type) > -1)
			convert_to = 4;
	}
	
	return convert_to;
};

// Copies brush.tiles onto canvas.tiles.  Brush must be within canvas bounds
Game_Map.prototype.tile_brush_copy_to = function(brush,canvas,brush_type,null_as_empty,empty_as_empty) {
	var x_diff = canvas.relative_min.x - brush.relative_min.x;
	var y_diff = canvas.relative_min.y - brush.relative_min.y;
	
	var canvas_i = 0;
	var canvas_j = 0;
	for (var brush_i = brush.relative_min.x; brush_i <= brush.relative_max.x && canvas_i < canvas.width; brush_i++) {
		if (brush_i >= canvas.relative_min.x && brush_i <= canvas.relative_max.x) {
			for (var brush_j = brush.relative_min.y; brush_j <= brush.relative_max.y && canvas_j < canvas.height; brush_j++) {
				if (brush_j >= canvas.relative_min.y && brush_j <= canvas.relative_max.y) {
					var br_i = brush_i - brush.relative_min.x;
					var br_j = brush_j - brush.relative_min.y
					canvas_i = br_i - x_diff;
					canvas_j = br_j - y_diff;
					
					var brush_tile = brush.tiles[br_i][br_j];
					var canvas_tile = canvas.tiles[canvas_i][canvas_j];
					
					// If brush_tile is null, don't change canvas tile or set it to 'empty' tile
					if (brush_tile === null) {
						if (null_as_empty === true) {
							canvas.remove_tile_at(canvas_i,canvas_j);
							canvas.tiles[canvas_i][canvas_j] = new Tile(canvas,-1,null);
						}
					}
					// If brush_tile is 'empty', set canvas tile to null value or 'empty' tile
					else if (brush_tile.empty === true){
						// Set canvas tile to null value
						canvas.remove_tile_at(canvas_i,canvas_j);
						
						// Set canvas tile to 'empty' tile
						if (empty_as_empty === true)
							canvas.tiles[canvas_i][canvas_j] = new Tile(canvas,-1,null);
					}
					// Replace canvas tile with brush tile
					else {
						// Convert the tile if necessary
						if (brush_type === 'smart' && canvas.tile_at(canvas_i,canvas_j) === true) {
							var new_tile_type = this.tile_brush_convert_brush_tile(brush_tile.tile_type,canvas_tile.tile_type);
							if (new_tile_type > -1) {
								canvas.remove_tile_at(canvas_i,canvas_j);
								canvas.tiles[canvas_i][canvas_j] = new Tile(canvas,new_tile_type,brush_tile.tile_set);
							}
						}
						// Drop the tile as is
						else {
							canvas.remove_tile_at(canvas_i,canvas_j);
							canvas.tiles[canvas_i][canvas_j] = new Tile(canvas,brush.tiles[br_i][br_j].tile_type,brush.tiles[br_i][br_j].tile_set);
							
							brush_tile.set_edge_prescedence();
							canvas.tiles[canvas_i][canvas_j].import_prescedent_edges(brush_tile);
						}
					}
				}
			}
		}
	}
	
	if (canvas.check_if_null_matrix() === false)
		canvas.empty = false;
	else
		canvas.empty = true;
};

// Drops given tile brush onto given canvas
Game_Map.prototype.tile_brush_drop = function(brush,canvas,store_change,brush_type,null_as_empty,empty_as_empty) {
		
	// Expand canvas by brush overflow amount if necessary
	if (brush.relative_min.x < canvas.relative_min.x)
		canvas.expand(Math.abs(brush.relative_min.x - canvas.relative_min.x),'left');
	if (brush.relative_max.x > canvas.relative_max.x)
		canvas.expand((brush.relative_max.x - canvas.relative_max.x),'right');
	if (brush.relative_min.y < canvas.relative_min.y)
		canvas.expand(Math.abs(brush.relative_min.y - canvas.relative_min.y),'up');
	if (brush.relative_max.y > canvas.relative_max.y)
		canvas.expand((brush.relative_max.y - canvas.relative_max.y),'down');
	
	// Area hovered by brush plus a perimeter of 1
	var ahp1 = {
		x_min : brush.relative_min.x - 1,y_min : brush.relative_min.y - 1,
		x_max : brush.relative_max.x + 1,y_max : brush.relative_max.y + 1
	};
	
	// Creat brush and canvas area hovered skeletons to store as map changes
	if (store_change === true) {
		this.cull_map_changes();

		var brush_skeleton = brush.get_skeleton_copy_between(false,brush.relative_min.x,brush.relative_min.y,brush.relative_max.x,brush.relative_max.y);
		var ah_skeleton;
		
		if (brush_type === 'smart') {
			ah_skeleton = canvas.get_skeleton_copy_between(true,ahp1.x_min,ahp1.y_min,ahp1.x_max,ahp1.y_max);
			
			this.tile_brush_store_map_change(this.current_layer.uid,[brush.relative_min.x,brush.relative_min.y],[ahp1.x_min,ahp1.y_min],
				true,brush_skeleton,ah_skeleton);
		}
		else {
			ah_skeleton = canvas.get_skeleton_copy_between(true,brush.relative_min.x,brush.relative_min.y,brush.relative_max.x,brush.relative_max.y);
			
			this.tile_brush_store_map_change(this.current_layer.uid,[brush.relative_min.x,brush.relative_min.y],[brush.relative_min.x,brush.relative_min.y],
				false,brush_skeleton,ah_skeleton);
		}
	}
	
	// Copy brush tiles over canvas tiles
	this.tile_brush_copy_to(brush,canvas,brush_type,null_as_empty,empty_as_empty);
	
	// During a smart brush tile drop, tri tiles are converted to long tri tiles under proper conditions
	if (brush_type === 'smart')
		canvas.tiles_function_between('convert_tri_tile',brush.relative_min.x,brush.relative_min.y,brush.relative_max.x,brush.relative_max.y);
	
	// Set canvas.empty to false.  If it is still empty because of null values or 'empty' tiles, it will be caught elsewhere
	if (canvas.check_if_null_matrix() === false)
		canvas.empty = false;
	else
		canvas.empty = true;
	
	// Check if need to shrink canvas because of dropped 'empty' tiles
	if (canvas === this.current_canvas)
		canvas.cull_null_edges();
	
	// Reload the canvas ah tile sprites
	canvas.tiles_function_between('load_sprite_core',ahp1.x_min,ahp1.y_min,ahp1.x_max,ahp1.y_max);
};

Game_Map.prototype.tile_brush_drag = function() {
	if (this.temp_tile_brush === null) {
		this.temp_tile_brush = new Tile_Container(this);
		this.temp_tile_brush.sprite_seed = this.current_canvas.sprite_seed;
		this.temp_tile_brush.initialize_null_matrix(1,1);
		this.temp_tile_brush.move_to(this.mouse_tile_position.x,this.mouse_tile_position.y);
		this.temp_tile_brush.apply_layer_attributes(true,true,true);
		this.stage.addChild(this.temp_tile_brush.sprites);
		
		if (this.tile_brush_dragging === 3 || this.tile_brush_dragging === 4) {
			this.tile_brush_rect_start = {x : this.mouse_tile_position.x,y : this.mouse_tile_position.y};
			this.tile_brush_rect_min = {x : this.mouse_tile_position.x,y : this.mouse_tile_position.y};
			this.tile_brush_rect_max = {x : this.mouse_tile_position.x,y : this.mouse_tile_position.y};
			this.tile_brush_rect_settings = {
				brush_type : this.selected_brush_type,
				tile_type : this.selected_tile_type,
				brush_size : this.selected_brush_size
			};
			this.base_tile_brush.move_to(this.mouse_tile_position.x,this.mouse_tile_position.y);
			this.update_tile_brush(['brush_type','brush_size','tile_type'],['square',1,1]);
			this.base_tile_brush.sprites.visible = false;
			this.temp_tile_brush.outline_type = 2;
		}
	}
	
	if (this.tile_brush_dragging === 2) {	// Erase drag
		this.tile_brush_drop(this.erase_tile_brush, this.temp_tile_brush, false, this.selected_brush_type, null, true);
		this.current_canvas.tiles_function_between('remove_sprite',this.base_tile_brush.relative_min.x,this.base_tile_brush.relative_min.y,
			this.base_tile_brush.relative_max.x,this.base_tile_brush.relative_max.y);
	}
	else if (this.tile_brush_dragging === 3 || this.tile_brush_dragging === 4)	// Rectangle Fill Drag/ Erase Rectangle Fill
		this.tile_brush_rectangle_fill();
	else	// Normal tile_brush_drop drag
		this.tile_brush_drop(this.base_tile_brush, this.temp_tile_brush, false, this.selected_brush_type);
};

Game_Map.prototype.tile_brush_rectangle_fill = function() {
	// Drop tile at new extent to update dimensions of temp_tile_brush
	this.tile_brush_drop(this.base_tile_brush, this.temp_tile_brush, false, this.selected_brush_type);
	
	var ttb = this.temp_tile_brush;
	
	// Right Side
	if (this.mouse_tile_position.x >= this.tile_brush_rect_start.x) {
		// Expand right
		if (this.tile_brush_rect_max.x < this.mouse_tile_position.x) {
			var diff = this.mouse_tile_position.x - this.tile_brush_rect_max.x;
			var column_start = this.tile_brush_rect_max.x + 1 - this.tile_brush_rect_min.x;
			
			for (var i = 0; i < diff; i++) {
				if (this.tile_brush_dragging === 3)
					ttb.fill_column(column_start + i, 0, this.selected_tile_set);
				else
					ttb.fill_column(column_start + i, -1, null);
			}
			
			ttb.tiles_function_between('load_sprite_core',this.tile_brush_rect_max.x,ttb.relative_min.y,ttb.relative_max.x,ttb.relative_max.y);
		}
		// Shrink from right
		else if (this.tile_brush_rect_max.x > this.mouse_tile_position.x) {
			var cull_amount = this.tile_brush_rect_max.x - this.mouse_tile_position.x;
			var cull_wrapper = {right : cull_amount};
			
			ttb.cull_edges(cull_wrapper);
			
			ttb.tiles_function_between('initialize_edge_flags',ttb.relative_max.x-cull_amount,ttb.relative_min.y,ttb.relative_max.x,ttb.relative_max.y);
			ttb.tiles_function_between('load_sprite_core',ttb.relative_max.x-cull_amount-1,ttb.relative_min.y,ttb.relative_max.x,ttb.relative_max.y);
		}
		this.tile_brush_rect_max.x = this.mouse_tile_position.x;
	}
	// Left Side
	if (this.mouse_tile_position.x <= this.tile_brush_rect_start.x) {
		// Expand left
		if (this.tile_brush_rect_min.x > this.mouse_tile_position.x) {
			var diff = this.tile_brush_rect_min.x - this.mouse_tile_position.x;
		
			for (var i = 0; i < diff; i++) {
				if (this.tile_brush_dragging === 3)
					ttb.fill_column(i, 0, this.selected_tile_set);
				else
					ttb.fill_column(i, -1, null);
			}
			
			ttb.tiles_function_between('load_sprite_core',ttb.relative_min.x,ttb.relative_min.y,ttb.relative_min.x + diff,ttb.relative_max.y);
		}
		// Shrink from left
		else if (this.tile_brush_rect_min.x < this.mouse_tile_position.x) {
			var cull_amount = this.mouse_tile_position.x - this.tile_brush_rect_min.x;
			var cull_wrapper = {left : cull_amount};
			
			ttb.cull_edges(cull_wrapper);
			
			ttb.tiles_function_between('initialize_edge_flags',ttb.relative_min.x,ttb.relative_min.y,ttb.relative_min.x+cull_amount,ttb.relative_max.y);
			ttb.tiles_function_between('load_sprite_core',ttb.relative_min.x,ttb.relative_min.y,ttb.relative_min.x+cull_amount,ttb.relative_max.y);
		}
		this.tile_brush_rect_min.x = this.mouse_tile_position.x;
	}
	
	// Down Side
	if (this.mouse_tile_position.y >= this.tile_brush_rect_start.y) {
		// Expand down
		if (this.tile_brush_rect_max.y < this.mouse_tile_position.y) {
			var diff = this.mouse_tile_position.y - this.tile_brush_rect_max.y;
			var row_start = this.tile_brush_rect_max.y + 1 - this.tile_brush_rect_min.y;
			
			for (var j = 0; j < diff; j++) {
				if (this.tile_brush_dragging === 3)
					ttb.fill_row(row_start + j, 0, this.selected_tile_set);
				else
					ttb.fill_row(row_start + j, -1, null);
			}
			
			ttb.tiles_function_between('load_sprite_core',ttb.relative_min.x,this.tile_brush_rect_max.y,ttb.relative_max.x,ttb.relative_max.y);
		}
		// Shrink from down
		else if (this.tile_brush_rect_max.y > this.mouse_tile_position.y) {
			var diff = this.tile_brush_rect_max.y - this.mouse_tile_position.y;
			var cull_amount = this.tile_brush_rect_max.y - this.mouse_tile_position.y;
			var cull_wrapper = {down : cull_amount};
			
			ttb.cull_edges(cull_wrapper);
			
			ttb.tiles_function_between('initialize_edge_flags',ttb.relative_min.x,ttb.relative_max.y-cull_amount,ttb.relative_max.x,ttb.relative_max.y);
			ttb.tiles_function_between('load_sprite_core',ttb.relative_min.x,ttb.relative_max.y-cull_amount-1,ttb.relative_max.x,ttb.relative_max.y);
		}
		this.tile_brush_rect_max.y = this.mouse_tile_position.y;
	}
	// Up Side
	if (this.mouse_tile_position.y <= this.tile_brush_rect_start.y) {
		// Expand up
		if (this.tile_brush_rect_min.y > this.mouse_tile_position.y) {
			var diff = this.tile_brush_rect_min.y - this.mouse_tile_position.y;
			
			for (var j = 0; j < diff; j++) {
				if (this.tile_brush_dragging === 3)
					ttb.fill_row(j, 0, this.selected_tile_set);
				else
					ttb.fill_row(j, -1, null);
			}
			
			ttb.tiles_function_between('load_sprite_core',ttb.relative_min.x,ttb.relative_min.y,ttb.relative_max.x,ttb.relative_max.y + diff);
		}
		// Shrink from up
		else if (this.tile_brush_rect_min.y < this.mouse_tile_position.y) {
			var cull_amount = this.mouse_tile_position.y - this.tile_brush_rect_min.y;
			var cull_wrapper = {up : cull_amount};
			
			ttb.cull_edges(cull_wrapper);
			
			ttb.tiles_function_between('initialize_edge_flags',ttb.relative_min.x,ttb.relative_min.y,ttb.relative_max.x,ttb.relative_min.y+cull_amount);
			ttb.tiles_function_between('load_sprite_core',ttb.relative_min.x,ttb.relative_min.y,ttb.relative_max.x,ttb.relative_min.y+cull_amount);
		}
		this.tile_brush_rect_min.y = this.mouse_tile_position.y;
	}
	
	if (this.tile_brush_dragging === 4) {
		this.tile_brush_drop(this.erase_tile_brush, this.temp_tile_brush, false, this.selected_brush_type,false,true);
		this.temp_tile_brush.load_outline();
	}
};

Game_Map.prototype.tile_brush_bucket_fill = function(mode,original_tile_set,i,j) {
	if (this.temp_tile_brush === null) {
		this.temp_tile_brush = new Tile_Container(this);
		this.temp_tile_brush.sprite_seed = this.current_canvas.sprite_seed;
		this.temp_tile_brush.initialize_null_matrix(1,1);
		this.temp_tile_brush.move_to(this.base_tile_brush.relative_min.x,this.base_tile_brush.relative_min.y);
	}
	
	var cc = this.current_canvas;
	var cc_i = i - cc.relative_min.x;
	var cc_j = j - cc.relative_min.y;
	
	var ttb = this.temp_tile_brush;
	var ttb_i = i - ttb.relative_min.x;
	var ttb_j = j - ttb.relative_min.y;
	
	var do_recursion = false;
	
	// Check if ttb has already checked corresponding tile at this i,j position
	if (ttb_i < 0 || ttb_i > ttb.x_max || 
		ttb_j < 0 || ttb_j > ttb.y_max || 
		ttb.tiles[ttb_i][ttb_j] === null) {
		
		if (cc.tile_at(cc_i,cc_j) === true && cc.tiles[cc_i][cc_j].tile_set === original_tile_set) {
			var tmp_brush = new Tile_Container(this);
			if (mode === 'replace') {
				tmp_brush.initialize_null_matrix(1,1);
				tmp_brush.move_to(i,j);
				tmp_brush.tiles[0][0] = new Tile(tmp_brush,cc.tiles[cc_i][cc_j].tile_type,this.selected_tile_set);
				this.tile_brush_drop(tmp_brush,ttb,false);
				do_recursion = true;
			}
			else if (mode === 'erase') {
				tmp_brush.initialize_empty_matrix(1,1);
				tmp_brush.move_to(i,j);
				this.tile_brush_drop(tmp_brush,ttb,false,null,null,true);
				do_recursion = true;
			}
		}
		else if (cc.tile_at(cc_i,cc_j) === false) {
			if (mode === 'fill') {
				var tmp_brush = new Tile_Container(this);
				tmp_brush.initialize_null_matrix(1,1);
				tmp_brush.move_to(i,j);
				tmp_brush.tiles[0][0] = new Tile(tmp_brush,0,this.selected_tile_set);
				this.tile_brush_drop(tmp_brush,ttb,false);
				do_recursion = true;
			}
		}
	}
	
	// Recursively check all contiguous neighbors of same tile_set or contiguous null tiles
	if (do_recursion === true) {
		if (cc_i - 1 >= 0)
			this.tile_brush_bucket_fill(mode,original_tile_set,i-1,j);
		if (cc_i + 1 <= cc.x_max)
			this.tile_brush_bucket_fill(mode,original_tile_set,i+1,j);
		if (cc_j - 1 >= 0)
			this.tile_brush_bucket_fill(mode,original_tile_set,i,j-1);
		if (cc_j + 1 <= cc.y_max)
			this.tile_brush_bucket_fill(mode,original_tile_set,i,j+1);
	}
};

// Unused : Returns bool whether dropping a brush onto a canvas would change the canvas at all
Game_Map.prototype.tile_brush_check_for_drop_change = function(brush,canvas) {
	var brush_i, brush_j;	// i, j are relative to the 'tile grid'
	var canvas_i, canvas_j;	// this_i, this_j are relative to this Tile_Container
	
	var drop_change = false;
	for (brush_i = 0, canvas_i = brush.relative_min.x - canvas.relative_min.x; brush_i < brush.width; brush_i++, canvas_i++) {
		for (brush_j = 0, canvas_j = brush.relative_min.y - canvas.relative_min.y; brush_j < brush.height;  brush_j++, canvas_j++) {
			var brush_tile = brush.tiles[brush_i][brush_j];
			var canvas_tile = canvas.tiles[canvas_i][canvas_j];
			
			if (brush.tile_at(brush_i,brush_j) === true) { 
				if (canvas.tile_at(canvas_i,canvas_j) === true) {
					if (brush_tile.tile_type !== canvas_tile.tile_type || brush_tile.tile_set !== canvas_tile.tile_set)
						drop_change = true;
				}
				else
					drop_change = true;
			}
			else if (brush.tiles[brush_i][brush_j] !== null && brush.tiles[brush_i][brush_j].empty === true) {
				if (canvas.tile_at(canvas_i,canvas_j) === true)
					drop_change = true;
			}
		}
	}
	
	return drop_change;
};

Game_Map.prototype.updateLayerSpritePositions = function () {
	for (var i = 0; i < this.map_layers.length; i++) {
				
		this.map_layers[i].position.x = ((this.camera_pos.x * this.map_layers[i].scroll_speed.x) + this.map_layers[i].offset.x*this.stage_scale) / this.stage_scale;
		this.map_layers[i].position.y = ((this.camera_pos.y * this.map_layers[i].scroll_speed.y) + this.map_layers[i].offset.y*this.stage_scale) / this.stage_scale;
		
		this.map_layers[i].sprites.position.x = Math.round(this.map_layers[i].position.x);
		this.map_layers[i].sprites.position.y = Math.round(this.map_layers[i].position.y);
	}
	
	if (this.current_tool === 'selector') {
		if (this.selector_selected_area !== null) {
			this.selector_selected_area.sprites.position.x = this.current_layer.sprites.position.x;
			this.selector_selected_area.sprites.position.y = this.current_layer.sprites.position.y;
		}
	} else if (this.current_tool === 'tile_brush') {
		if (this.base_tile_brush !== null) {
			this.base_tile_brush.sprites.position.x = this.current_layer.sprites.position.x;
			this.base_tile_brush.sprites.position.y = this.current_layer.sprites.position.y;
		}
	}
}

////////////////////////////////////////////////////////////////
// Game_Map - Entity Brush Functions

Game_Map.prototype.entity_brush_drop = function() {
	
	var new_entity = new Entity(this.current_layer.editor_chunk.entity_container, this.mouse_adjusted_position);
	
	this.current_layer.editor_chunk.entity_container.entities[new_entity.uid] = new_entity;
};

////////////////////////////////////////////////////////////////
// Map_Layer

var Map_Layer = function(game_map) {
	this.game_map = game_map;
	
	this.uid = Math.random();
	
	this.map_chunks;
	
	// For editor mode
	this.editor_chunk;
	
	this.sprites;
	
	this.scale = 1;
	this.scroll_speed = {x : 1, y : 1};
	this.offset = {x : 0, y : 0};
	this.position = {x : this.game_map.camera_pos.x, y : this.game_map.camera_pos.y};
	this.tint = '0xFFFFFF';
	this.z_index = null;
		
	// Flags
	this.collidable = false;
	this.visible = true;
	this.alpha = 1;
	this.lock = false;
};

Map_Layer.prototype.set_editor_attribute = function(attribute, mode) {
	// Mode === 1 is the default mode
	var value;
	if (attribute === 'visible') {
		if (mode === 1)
			value = true;
		else
			value = false;
		this.editor_chunk.static_tiles.sprites.visible = value;
	}
	else if (attribute === 'alpha') {
		if (mode === 1)
			value = 1;
		else
			value = 0.4;
		this.editor_chunk.static_tiles.sprites.alpha = value;
	}
	else if (attribute === 'lock') {
		if (mode === 1)
			value = false;
		else
			value = true;
		this.lock = value;
	}
};


////////////////////////////////////////////////////////////////
// Map_Chunk

var Map_Chunk = function(game_map) {
	this.game_map = game_map;
	
	// Static tile_container
	this.static_tiles;
	
	this.entity_container;
};

////////////////////////////////////////////////////////////////
// Entity_Container

var Entity_Container = function(game_map) {
	this.game_map = game_map;
	
	this.entities = {};
	
	this.sprites = new PIXI.Container();
	
};

if (typeof(global) != 'undefined') {
	module.exports = global.Game_Map = Game_Map;
}