var Tile_Container = function(game_map) {
	this.game_map = game_map;
	
	// Objects
	this.tiles;
	
	// Pixi Containers
	this.sprites = new PIXI.Container();
	this.sprites.addChild(this.sprites_core = new PIXI.Container());
	this.sprites.addChild(this.sprites_left = new PIXI.Container());
	this.sprites.addChild(this.sprites_right = new PIXI.Container());
	this.sprites.addChild(this.sprites_down = new PIXI.Container());
	this.sprites.addChild(this.sprites_up = new PIXI.Container());
	
	this.outline = null;
	this.outline_type = 0;
	
	// Attributes
	this.width;		// width of this.tiles
	this.height;	// height of this.tiles
	this.x_max;		// x_max of this.tiles
	this.y_max;		// y_max of this.tiles
	
	// Flags
	this.empty = true;
	this.mask = false;
	
	// Random seed for tile sprites
	this.sprite_seed = Math.floor(Math.random() * (50 + 1));
	
	// If this is a brush
	if (this.game_map.editor_mode == true) {
		this.relative_min = {x:0,y:0};		// Tile_Container's position relative to the 'tile grid'
		this.relative_max = {};				// Tile_Container's max attributes relative to the 'tile grid'
		this.center;						// Tile_Container's center tile/tiles stored as obj:{x_min,y_min,x_max,y_max}
	}
};

////////////////////////////////////////////////////////////////
// Tile_Container - Core Functions (for this.tiles)

Tile_Container.prototype.tiles_function_between = function(func,x_min,y_min,x_max,y_max) {

	var i, j;			// i, j are relative to the 'tile grid'
	var this_i, this_j;	// this_i, this_j are relative to this Tile_Container
	
	var tiles_func;
	if (func === 'load_sprite_core')
		tiles_func = function() {this.tiles_load_sprite(this_i,this_j);}.bind(this);
	else if (func === 'remove_sprite')
		tiles_func = function() {this.tiles_remove_sprite(this_i,this_j);}.bind(this);
	else if (func === 'set_empty')
		tiles_func = function() {this.tiles_set_empty(this_i,this_j);}.bind(this);
	else if (func === 'set_null')
		tiles_func = function() {this.tiles_set_null(this_i,this_j);}.bind(this);
	else if (func === 'convert_null_to_empty')
		tiles_func = function() {this.tiles_convert_null_to_empty(this_i,this_j);}.bind(this);
	else if (func === 'convert_empty_to_null')
		tiles_func = function() {this.tiles_convert_empty_to_null(this_i,this_j);}.bind(this);
	else if (func === 'convert_tri_tile')
		tiles_func = function() {this.tiles_convert_tri_tile(this_i,this_j);}.bind(this);
	else if (func === 'initialize_edge_flags')
		tiles_func = function() {this.tiles_initialize_edge_flags(this_i,this_j);}.bind(this);

	for (i = x_min, this_i = x_min - this.relative_min.x; i <= x_max; i++, this_i++) {
		// Check that this_i is within bounds of this Tile_Container
		if (this_i >= 0 && this_i <= this.x_max) {
			for (j = y_min, this_j = y_min - this.relative_min.y; j <= y_max; j++, this_j++) {
				// Check that this_j is within bounds of this Tile_Container
				if (this_j >= 0 && this_j <= this.y_max) {
					tiles_func();
				}
			}
		}
	}
};

Tile_Container.prototype.tiles_load_sprite = function(i,j) {
	if (this.tile_at(i,j) === true) {
		// Check right and down neighbors for flush edges
		if (i < this.x_max)	// Right neighbor
			this.tiles[i][j].check_flush_edge(this.tiles[i+1][j], 'right');
		if (j < this.y_max) // Down neighbor
			this.tiles[i][j].check_flush_edge(this.tiles[i][j+1], 'down');
		
		// Make sure tiles on boundries have real edges (1)
		if (i === 0)
			this.tiles[i][j].check_flush_edge(null, 'left');
		else if (i === this.x_max)
			this.tiles[i][j].check_flush_edge(null, 'right');
		if (j === 0)
			this.tiles[i][j].check_flush_edge(null, 'up');
		else if (j === this.y_max)
			this.tiles[i][j].check_flush_edge(null, 'down');
		
		// Determine the edge_type based on flush edges
		this.tiles[i][j].determine_edge_type();
		
		// Load the sprite based on edge_type
		this.tiles[i][j].load_sprite(i,j);
	}
	else {
		// Right neighbor checks null to its left
		if (i < this.x_max && this.tile_at(i+1,j) === true)
			this.tiles[i+1][j].check_flush_edge(null, 'left');
		// Down neighbor checks null to its up
		if (j < this.y_max && this.tile_at(i,j+1) === true)
			this.tiles[i][j+1].check_flush_edge(null, 'up');
	}
};

Tile_Container.prototype.tiles_remove_sprite = function(i,j) {
	if (this.tile_at(i,j) === true)
		this.tiles[i][j].remove_sprite();
};

Tile_Container.prototype.tiles_set_empty = function(i,j) {
	this.tiles_remove_sprite(i,j);
	this.tiles[i][j] = new Tile(this,-1,null);
};

Tile_Container.prototype.tiles_set_null = function(i,j) {
	this.tiles_remove_sprite(i,j);
	this.tiles[i][j] = null;
};

Tile_Container.prototype.tiles_convert_null_to_empty = function(i,j) {
	if (this.tiles[i][j] === null)
		this.tiles[i][j] = new Tile(this,-1,null);
};

Tile_Container.prototype.tiles_convert_empty_to_null = function(i,j) {
	if (this.tiles[i][j] !== null && this.tiles[i][j].empty === true)
		this.tiles[i][j] = null;
};

Tile_Container.prototype.tiles_convert_tri_tile = function(i,j) {
	if (this.tile_at(i,j) === true) {
		var tile = this.tiles[i][j];
		
		// tile_types : 1-4
		if (tile.tile_type >= 1 && tile.tile_type <= 4) {
			var do_convert = 0;
			
			// tile_type : 1
			if (tile.tile_type === 1) {
				// Check right
				if (i < this.x_max && j > 0 && 
					this.tile_at(i,j-1) === false && this.tile_at(i+1,j) === true && this.tile_at(i+1,j-1) === true &&
					this.tiles[i+1][j].tile_type === 0 && this.tiles[i+1][j-1].tile_type === 0) {
					do_convert += 1;
				}	
				// Check down
				if (i > 0 && j < this.y_max && 
					this.tile_at(i-1,j) === false && this.tile_at(i-1,j+1) === true && this.tile_at(i,j+1) === true &&
					this.tiles[i-1][j+1].tile_type === 0 && this.tiles[i][j+1].tile_type === 0) {
					do_convert += 2;
				}
				
				if (do_convert === 1) { 
					tile.tile_type = 13;
					tile.initialize_edge_flags();
					tile.down = 0;
					this.tiles[i][j-1] = new Tile(this,17,tile.tile_set);
				}
				else if (do_convert === 2) {
					tile.tile_type = 5;
					tile.initialize_edge_flags();
					tile.right = 0;
					this.tiles[i-1][j] = new Tile(this,9,tile.tile_set);
				}
			}
			// tile_type : 2
			else if (tile.tile_type === 2) {
				// Check left
				if (i > 0 && j > 0 && 
					this.tile_at(i,j-1) === false && this.tile_at(i-1,j) === true && this.tile_at(i-1,j-1) === true &&
					this.tiles[i-1][j].tile_type === 0 && this.tiles[i-1][j-1].tile_type === 0) {
					do_convert += 1;
				}
				// Check down
				if (i < this.x_max && j < this.y_max && 
					this.tile_at(i+1,j) === false && this.tile_at(i,j+1) === true && this.tile_at(i+1,j+1) === true &&
					this.tiles[i][j+1].tile_type === 0 && this.tiles[i+1][j+1].tile_type === 0) {
					do_convert += 2;
				}
				
				if (do_convert === 1) { 
					tile.tile_type = 14;
					tile.initialize_edge_flags();
					tile.down = 0;
					this.tiles[i][j-1] = new Tile(this,18,tile.tile_set);
				}
				else if (do_convert === 2) {
					tile.tile_type = 6;
					tile.initialize_edge_flags();
					tile.left = 0;
					this.tiles[i+1][j] = new Tile(this,10,tile.tile_set);
				}
			}
			// tile_type : 3
			else if (tile.tile_type === 3) {
				// Check up
				if (i < this.x_max && j > 0 && 
					this.tile_at(i+1,j) === false && this.tile_at(i,j-1) === true && this.tile_at(i+1,j-1) === true &&
					this.tiles[i][j-1].tile_type === 0 && this.tiles[i+1][j-1].tile_type === 0) {
					do_convert += 1;
				}
				// Check left
				if (i > 0 && j < this.y_max && 
					this.tile_at(i,j+1) === false && this.tile_at(i-1,j) === true && this.tile_at(i-1,j+1) === true &&
					this.tiles[i-1][j].tile_type === 0 && this.tiles[i-1][j+1].tile_type === 0) {
					do_convert += 2;
				}
				
				if (do_convert === 1) { 
					tile.tile_type = 7;
					tile.initialize_edge_flags();
					tile.left = 0;
					this.tiles[i+1][j] = new Tile(this,11,tile.tile_set);
				}
				else if (do_convert === 2) {
					tile.tile_type = 15;
					tile.initialize_edge_flags();
					tile.up = 0;
					this.tiles[i][j+1] = new Tile(this,19,tile.tile_set);
				}
			}
			// tile_type : 4
			else if (tile.tile_type === 4) {
				// Check up
				if (i > 0 && j > 0 && 
					this.tile_at(i-1,j) === false && this.tile_at(i,j-1) === true && this.tile_at(i-1,j-1) === true &&
					this.tiles[i][j-1].tile_type === 0 && this.tiles[i-1][j-1].tile_type === 0) {
					do_convert += 1;
				}
				// Check right
				if (i < this.x_max && j < this.y_max && 
					this.tile_at(i,j+1) === false && this.tile_at(i+1,j) === true && this.tile_at(i+1,j+1) === true &&
					this.tiles[i+1][j].tile_type === 0 && this.tiles[i+1][j+1].tile_type === 0) {
					do_convert += 2;
				}
				
				if (do_convert === 1) { 
					tile.tile_type = 8;
					tile.initialize_edge_flags();
					tile.right = 0;
					this.tiles[i-1][j] = new Tile(this,12,tile.tile_set);
				}
				else if (do_convert === 2) {
					tile.tile_type = 16;
					tile.initialize_edge_flags();
					tile.up = 0;
					this.tiles[i][j+1] = new Tile(this,20,tile.tile_set);
				}
			}
		}
		
		// tile_types : 9-12
		if (tile.tile_type >= 9 && tile.tile_type <= 12) {
			if (tile.tile_type === 9 && i < this.x_max && this.tile_at(i+1,j) === true && this.tiles[i+1][j].tile_type !== 5) {
				tile.tile_type = 1;
				tile.initialize_edge_flags();
			}
			else if (tile.tile_type === 10 && i > 0 && this.tile_at(i-1,j) === true && this.tiles[i-1][j].tile_type !== 6) {
				tile.tile_type = 2;
				tile.initialize_edge_flags();
			}
			else if (tile.tile_type === 11 && i > 0 && this.tile_at(i-1,j) === true && this.tiles[i-1][j].tile_type !== 7) {
				tile.tile_type = 3;
				tile.initialize_edge_flags();
			}
			else if (tile.tile_type === 12 && i < this.x_max && this.tile_at(i+1,j) === true && this.tiles[i+1][j].tile_type !== 8) {
				tile.tile_type = 4;
				tile.initialize_edge_flags();
			}
		}
	
		// tile_types : 17-20
		if (tile.tile_type >= 17 && tile.tile_type <= 20) {
			if (tile.tile_type === 17 && j < this.y_max && this.tile_at(i,j+1) === true && this.tiles[i][j+1].tile_type !== 13) {
				tile.tile_type = 1;
				tile.initialize_edge_flags();
			}
			else if (tile.tile_type === 18 && j < this.y_max && this.tile_at(i,j+1) === true && this.tiles[i][j+1].tile_type !== 14) {
				tile.tile_type = 2;
				tile.initialize_edge_flags();
			}
			else if (tile.tile_type === 19 && j > 0 && this.tile_at(i,j-1) === true && this.tiles[i][j-1].tile_type !== 15) {
				tile.tile_type = 3;
				tile.initialize_edge_flags();
			}
			else if (tile.tile_type === 20 && j > 0 && this.tile_at(i,j-1) === true && this.tiles[i][j-1].tile_type !== 16) {
				tile.tile_type = 4;
				tile.initialize_edge_flags();
			}
		}
	}
};

Tile_Container.prototype.tiles_initialize_edge_flags = function(i,j) {
	if (this.tile_at(i,j) === true)
		this.tiles[i][j].initialize_edge_flags();
};

////////////////////////////////////////////////////////////////
// Tile_Container - this.tiles Loader Functions

// Initializes this.tiles to a matrix of null values
Tile_Container.prototype.initialize_null_matrix = function(width, height) {
	this.tiles = new Array(width);
	
	for (var i = 0; i < width; i++) {
		this.tiles[i] = new Array(height);
		this.tiles[i].fill(null);
	}
	
	this.update_dimensions();
	this.empty = true;
};

// Initializes this.tiles to a matrix of 'empty' tiles
Tile_Container.prototype.initialize_empty_matrix = function(width, height) {
	this.tiles = new Array(width);
	
	for (var i = 0; i < width; i++) {
		this.tiles[i] = new Array(height);
		this.tiles[i].fill(new Tile(this,-1,null));
	}
	
	this.update_dimensions();
	this.empty = true;
};

Tile_Container.prototype.load_from_skeleton = function(skeleton) {
	var width = skeleton.length;
	var height = skeleton[0].length;
	
	this.initialize_null_matrix(width,height);
	
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if (skeleton[i][j] === 'empty') {
				this.tiles[i][j] = new Tile(this,-1,null);
			}
			else if (skeleton[i][j] !== null)  {
				this.tiles[i][j] = new Tile(this,skeleton[i][j].tt,skeleton[i][j].ts);
			}
		}
	}
};

// Load brush based on tile_type/brush_type, brush_size, and tile_set
Tile_Container.prototype.load_brush = function() {
	var brush_type = this.game_map.selected_brush_type;
	
	if (brush_type === 'square')
		this.load_brush_square();
	else if (brush_type === 'smart')
		this.load_brush_smart();
	else if (brush_type === 'tri')
		this.load_brush_tri();
	else if (brush_type === 'long_tri')
		this.load_brush_long_tri();
	
	this.tiles_function_between('load_sprite_core',this.relative_min.x,this.relative_min.y,this.relative_max.x,this.relative_max.y);
};

// Brush type: square loader
Tile_Container.prototype.load_brush_square = function() {
	var brush_size = this.game_map.selected_brush_size;
	var tile_set = this.game_map.selected_tile_set;
	
	this.initialize_null_matrix(brush_size,brush_size);
	
	for (var i = 0; i < this.width; i++) {
		for (var j = 0; j < this.height; j++) {
			this.tiles[i][j] = new Tile(this,0,tile_set);
		}
	}
};

// Brush type: smart loader
Tile_Container.prototype.load_brush_smart = function() {
	var brush_size = this.game_map.selected_brush_size;
	var tile_set = this.game_map.selected_tile_set;
	
	// Smart brush can't have a brush_size of 1
	if (brush_size == 1)
		brush_size = 2;
	
	this.initialize_null_matrix(brush_size,brush_size);
	
	if (brush_size == 2) {
		this.tiles[0][0] = new Tile(this,1,tile_set);
		this.tiles[1][0] = new Tile(this,2,tile_set);
		this.tiles[1][1] = new Tile(this,3,tile_set);
		this.tiles[0][1] = new Tile(this,4,tile_set);
	}
	else {
		for (var i = 0; i < this.width; i++) {
			for (var j = 0; j < this.height; j++) {
				this.tiles[i][j] = new Tile(this,0,tile_set);
			}
		}
		
		if (brush_size == 3 || brush_size == 4) {
			var max = this.x_max;
			
			this.tiles[0][0] = new Tile(this,1,tile_set);
			this.tiles[max][0] = new Tile(this,2,tile_set);
			this.tiles[max][max] = new Tile(this,3,tile_set);
			this.tiles[0][max] = new Tile(this,4,tile_set);
		}
		else if (brush_size == 5) {
			this.tiles[0][0] = null;
			this.tiles[0][1] = new Tile(this,1,tile_set);
			this.tiles[0][3] = new Tile(this,4,tile_set);
			this.tiles[0][4] = null;
			
			this.tiles[1][0] = new Tile(this,1,tile_set);
			this.tiles[1][4] = new Tile(this,4,tile_set);
			
			this.tiles[3][0] = new Tile(this,2,tile_set);
			this.tiles[3][4] = new Tile(this,3,tile_set);
			
			this.tiles[4][0] = null;
			this.tiles[4][1] = new Tile(this,2,tile_set);
			this.tiles[4][3] = new Tile(this,3,tile_set);
			this.tiles[4][4] = null;
		}
	}
};

// Brush type: tri loader
Tile_Container.prototype.load_brush_tri = function() {
	var brush_size = this.game_map.selected_brush_size;
	var tile_set = this.game_map.selected_tile_set;
	var tile_type = this.game_map.selected_tile_type;
	
	this.initialize_null_matrix(brush_size,brush_size);
	
	var max = this.x_max;
	
	// Fill half the matrix with tile_type: 0
	for (var i = 0; i < this.width; i++) {
		for (var j = 0; j < (max - i) ; j++) {
			this.tiles[i][j] = new Tile(this,0,tile_set);
		}
	}
	
	// Rotate matrix based on tile_type and fill slope
	if (tile_type == 1) {
		this.tiles = this.get_rotation_matrix('right');
		this.tiles = this.get_rotation_matrix('right');
		
		for (var i = 0; i < this.width; i++) {
			this.tiles[i][max - i] = new Tile(this,1,tile_set);
		}
	}
	else if (tile_type == 2) {
		this.tiles = this.get_rotation_matrix('right');
		
		for (var i = 0; i < this.width; i++) {
			this.tiles[i][i] = new Tile(this,2,tile_set);
		}
	}
	else if (tile_type == 3) {
		for (var i = 0; i < this.width; i++) {
			this.tiles[i][max - i] = new Tile(this,3,tile_set);
		}
	}
	else if (tile_type == 4) {
		this.tiles = this.get_rotation_matrix('left');
		
		for (var i = 0; i < this.width; i++) {
			this.tiles[i][i] = new Tile(this,4,tile_set);
		}
	}
};

// Brush type: long_tri loader
Tile_Container.prototype.load_brush_long_tri = function() {
	var brush_size = this.game_map.selected_brush_size;
	var tile_set = this.game_map.selected_tile_set;
	var tile_type = this.game_map.selected_tile_type;
	
	this.initialize_null_matrix(brush_size * 2,brush_size);
	
	var rotate_group_a = [5,7,14,16];
	var rotate_group_b = [6,8,13,15];
	
	// Fill half the matrix with tile_type: 0
	if (rotate_group_a.indexOf(tile_type) !== -1) {
		for (var i = 0; i < this.width; i += 2) {
			var half_i = i / 2;
			for (var j = 0; j < (this.y_max - half_i); j++) {
				this.tiles[i][j] = new Tile(this,0,tile_set);
				this.tiles[i+1][j] = new Tile(this,0,tile_set);
			}
		}
	}
	else if (rotate_group_b.indexOf(tile_type) !== -1) {
		for (var i = 0; i < this.width; i += 2) {
			var half_i = i / 2;
			for (var j = 0; j < (this.y_max - half_i); j++) {
				this.tiles[i][this.y_max - j] = new Tile(this,0,tile_set);
				this.tiles[i+1][this.y_max - j] = new Tile(this,0,tile_set);
			}
		}
	}
	
	// Rotate matrix based on tile_type and fill slope
	if (rotate_group_a.indexOf(tile_type) !== -1) {
		if (tile_type == 5) {
			this.tiles = this.get_rotation_matrix('right');
			this.update_dimensions();
			this.tiles = this.get_rotation_matrix('right');
			this.update_dimensions();
			
			for (var i = 0; i < this.width; i += 2) {
				var half_i = i / 2;
				this.tiles[i][this.y_max - half_i] = new Tile(this,9,tile_set);
				this.tiles[i+1][this.y_max - half_i] = new Tile(this,5,tile_set);
			}
		}
		else if (tile_type == 14) {
			this.tiles = this.get_rotation_matrix('right');
			this.update_dimensions();
			
			for (var i = 0; i < this.width; i++) {
				var double_i = i * 2;
				this.tiles[i][double_i] = new Tile(this,18,tile_set);
				this.tiles[i][double_i + 1] = new Tile(this,14,tile_set);
			}
		}
		else if (tile_type == 7) {
			for (var i = 0; i < this.width; i += 2) {
				var half_i = i / 2;
				this.tiles[i][this.y_max - half_i] = new Tile(this,7,tile_set);
				this.tiles[i+1][this.y_max - half_i] = new Tile(this,11,tile_set);
			}
		}
		else if (tile_type == 16) {
			this.tiles = this.get_rotation_matrix('left');
			this.update_dimensions();
			
			for (var i = 0; i < this.width; i++) {
				var double_i = i * 2;
				this.tiles[i][double_i] = new Tile(this,16,tile_set);
				this.tiles[i][double_i + 1] = new Tile(this,20,tile_set);
			}
		}
	}
	else if (rotate_group_b.indexOf(tile_type) !== -1) {
		if (tile_type == 8) {
			this.tiles = this.get_rotation_matrix('right');
			this.update_dimensions();
			this.tiles = this.get_rotation_matrix('right');
			this.update_dimensions();
			
			for (var i = 0; i < this.width; i += 2) {
				var half_i = i / 2;
				this.tiles[i][half_i] = new Tile(this,12,tile_set);
				this.tiles[i+1][half_i] = new Tile(this,8,tile_set);
			}
		}
		else if (tile_type == 13) {
			this.tiles = this.get_rotation_matrix('right');
			this.update_dimensions();
			
			for (var i = 0; i < this.width; i++) {
				var double_i = i * 2;
				this.tiles[i][this.y_max - double_i] = new Tile(this,13,tile_set);
				this.tiles[i][this.y_max - double_i - 1] = new Tile(this,17,tile_set);
			}
		}
		else if (tile_type == 6) {
			for (var i = 0; i < this.width; i += 2) {
				var half_i = i / 2;
				this.tiles[i][half_i] = new Tile(this,6,tile_set);
				this.tiles[i+1][half_i] = new Tile(this,10,tile_set);
			}
		}
		else if (tile_type == 15) {
			this.tiles = this.get_rotation_matrix('left');
			this.update_dimensions();
			
			for (var i = 0; i < this.width; i++) {
				var double_i = i * 2;
				this.tiles[i][this.y_max - double_i] = new Tile(this,19,tile_set);
				this.tiles[i][this.y_max - double_i - 1] = new Tile(this,15,tile_set);
			}
		}
	}
};

Tile_Container.prototype.load_outline = function() {
	if (this.outline !== null || this.outline_type === 0) {
		this.sprites.removeChild(this.outline);
		this.outline = null;
		
		if (this.outline_type === 0)
			return;
	}
	
	this.outline = new PIXI.Graphics();
	this.outline.lineStyle(2,'0x00FF00');
	this.outline.position.set(0,0);

	// Create a wrap outline
	if (this.outline_type === 1) {
		var x_min, y_min;
		var x_max, y_max;
		
		for (var i = 0; i < this.width; i++) {
			for (var j = 0; j < this.height; j++) {
				if (this.tiles[i][j] !== null) {
					x_min = i * tile_width;
					y_min = j * tile_height;
					x_max = x_min + tile_width;
					y_max = y_min + tile_height;
					
					// Left edges
					if ((i > 0 && this.tiles[i-1][j] === null) || i === 0) {
						this.outline.moveTo(x_min, y_min);
						this.outline.lineTo(x_min, y_max);
					}
					// Right edges
					if ((i < this.x_max && this.tiles[i+1][j] === null) || i === this.x_max) {
						this.outline.moveTo(x_max, y_min);
						this.outline.lineTo(x_max, y_max);
					}
					// Up edges
					if ((j > 0 && this.tiles[i][j-1] === null) || j === 0) {
						this.outline.moveTo(x_min, y_min);
						this.outline.lineTo(x_max, y_min);
					}
					// Down edges
					if ((j < this.y_max && this.tiles[i][j+1] === null) || j === this.y_max) {
						this.outline.moveTo(x_min, y_max);
						this.outline.lineTo(x_max, y_max);
					}
				}
			}
		}
	}
	// Create a rectangular outline
	else if (this.outline_type === 2)
		this.outline.drawRect(0, 0, this.width * tile_width, this.height * tile_height);
	
	this.sprites.addChild(this.outline);
};

////////////////////////////////////////////////////////////////
// Tile_Container - Copy/Transformation Functions

Tile_Container.prototype.get_deep_copy = function(null_as_empty=false) {
	var tmp_deep_copy = new Tile_Container(this.game_map);
	if (null_as_empty === true)
		tmp_deep_copy.initialize_empty_matrix(this.width,this.height);
	else
		tmp_deep_copy.initialize_null_matrix(this.width,this.height);
	tmp_deep_copy.move_to(this.relative_min.x,this.relative_min.y);
	
	for (var i = 0; i < this.width; i++) {
		for (var j = 0; j < this.height; j++) {
			var tile = this.tiles[i][j];
			
			if (tile !== null) {
				if (tile.empty === true)
					tmp_deep_copy.tiles[i][j] = new Tile(tmp_deep_copy,-1,null);
				else
					tmp_deep_copy.tiles[i][j] = new Tile(tmp_deep_copy,tile.tile_type,tile.tile_set);
			}
		}
	}
	
	tmp_deep_copy.empty = this.empty;
	
	return tmp_deep_copy;
};

Tile_Container.prototype.get_null_copy = function() {
	var null_copy = new Tile_Container(this.game_map);
	null_copy.initialize_null_matrix(this.width,this.height);
	null_copy.move_to(this.relative_min.x,this.relative_min.y);
	return null_copy;
};

Tile_Container.prototype.get_empty_copy = function() {
	var empty_copy = new Tile_Container(this.game_map);
	empty_copy.initialize_empty_matrix(this.width,this.height);
	empty_copy.move_to(this.relative_min.x,this.relative_min.y);
	return empty_copy;
};

// Return a left or right rotation of this.tiles
Tile_Container.prototype.get_rotation_matrix = function(direction) {
	var new_matrix;
	
	if (direction == 'right') {
		var reverse_row_matrix = this.tiles.reverse();
		new_matrix = this.get_transposition_matrix(reverse_row_matrix);
	}
	else if (direction == 'left') {
		var transposition_matrix = this.get_transposition_matrix(this.tiles);
		new_matrix = transposition_matrix.reverse();
	}
	
	return new_matrix;
};

// Return the transposition of this.tiles
Tile_Container.prototype.get_transposition_matrix = function() {
	var new_matrix = new Array(this.height);
	
	for (var i = 0; i < this.height; i++) {
		new_matrix[i] = new Array(this.width);
		for (var j = this.x_max; j > -1; j--) {
			new_matrix[i][j] = this.tiles[j][i];
		}
	}
	
	return new_matrix;
};

Tile_Container.prototype.get_skeleton_copy_between = function(null_as_empty,x_min,y_min,x_max,y_max) {
	var width = x_max - x_min + 1;
	var height = y_max - y_min + 1;
	
	var skeleton_copy = new Array(width);
	for (var i = 0; i < width; i++) {
		skeleton_copy[i] = new Array(height);
		skeleton_copy[i].fill(null);
	}
	
	var i, j;			// i, j are relative to skeleton_copy
	var this_i, this_j;	// this_i, this_j are relative to this Tile_Container
	
	for (i = 0, this_i = x_min - this.relative_min.x; i < width; i++, this_i++) {
		// Check that this_i is within x bounds of this Tile_Container
		if (this_i >= 0 && this_i <= this.x_max) {
			for (j = 0, this_j = y_min - this.relative_min.y; j < height; j++, this_j++) {
				// Check that this_j is within y bounds of this Tile_Container
				if (this_j >= 0 && this_j <= this.y_max) {
					if (this.tiles[this_i][this_j] === null) {
						if (null_as_empty === true) 
							skeleton_copy[i][j] = 'empty';
					}
					else if (this.tiles[this_i][this_j].empty === true) {
						skeleton_copy[i][j] = 'empty';
					}
					else {
						skeleton_copy[i][j] = { 
							tt : this.tiles[this_i][this_j].tile_type,
							ts : this.tiles[this_i][this_j].tile_set
						};
					}
				}
				// Out of this Tile_Container's y bounds
				else {	
					if (null_as_empty === true)
						skeleton_copy[i][j] = 'empty';
				}
			}
		}
		// Out of this Tile_Container's x bounds
		else {	
			if (null_as_empty === true)
				skeleton_copy[i].fill('empty');
		}
	}
	
	return skeleton_copy;
};


////////////////////////////////////////////////////////////////
// Tile_Container - Helper Functions

Tile_Container.prototype.apply_layer_attributes = function(scale, position, tint) {
	if (scale === true) {
		this.sprites.scale.x = this.game_map.current_layer.scale;
		this.sprites.scale.y = this.game_map.current_layer.scale;
	}
	
	if (position === true) {
		this.sprites.position.x = Math.round(this.game_map.current_layer.position.x) ;
		this.sprites.position.y = Math.round(this.game_map.current_layer.position.y) ;
	}
	
	if (tint === true) {
		this.apply_layer_tint(this.sprites);
	}
};

Tile_Container.prototype.apply_layer_tint = function(pixi_container) {
	for (var i = 0; i < pixi_container.children.length; i++) {
		pixi_container.children[i].tint = this.game_map.current_layer.tint;
		this.apply_layer_tint(pixi_container.children[i]);
	}
};

// Returns bool for whether or not a real tile exists at this.tiles[i][j]
Tile_Container.prototype.tile_at = function(i,j) {
	if (this.tiles[i][j] === null || this.tiles[i][j].empty === true)
		return false;
	
	return true;
};

// Remove tile and its sprite from the the Tile_Container
Tile_Container.prototype.remove_tile_at = function(i,j) {
	if (this.tile_at(i,j) === true) {
		this.tiles[i][j].remove_sprite();
	}
	this.tiles[i][j] = null;
};

Tile_Container.prototype.move_to = function(x_pos,y_pos) {
	this.relative_min.x = x_pos;
	this.relative_min.y = y_pos;
	
	this.sprites.pivot.x = x_pos * -tile_width;
	this.sprites.pivot.y = y_pos * -tile_height;
	
	this.update_dimensions();
};

// Updates the width, height, max, relative_max, and center attributes based on relative_min
Tile_Container.prototype.update_dimensions = function() {
	this.width = this.tiles.length;
	this.height = this.tiles[0].length;
	this.x_max = this.width - 1;
	this.y_max = this.height - 1;
	this.relative_max.x = this.relative_min.x + this.x_max;
	this.relative_max.y = this.relative_min.y + this.y_max;
	this.determine_center();
};

// Determines center of Tile_Container as x_min,y_min,x_max,y_max
Tile_Container.prototype.determine_center = function() {
	var x_min, y_min, x_max, y_max;
	
	if (this.width % 2 == 1) {
		x_min = Math.floor(this.width / 2);
		x_max = x_min;
	}
	else {
		x_max = this.width / 2;
		x_min = x_max - 1;
	}
	if (this.height % 2 == 1) {
		y_min = Math.floor(this.height / 2);
		y_max = y_min;
	}
	else {
		y_max = this.height / 2;
		y_min = y_max - 1;
	}
	
	this.center = {x_min : x_min, y_min : y_min, x_max : x_max, y_max : y_max};
};

// Expand this.tiles by amount in direction
Tile_Container.prototype.expand = function(amount,direction) {
	// Add amount of rows or columns to given direction
	if (direction == 'left' || direction == 'right') {
		for (var i = 0; i < amount; i++) {
			var tmp = new Array(this.height);
			tmp.fill(null);
			if (direction == 'left') {
				this.tiles.unshift(tmp);
				
			}
			else if (direction == 'right')
				this.tiles.push(tmp);
		}
		if (direction == 'left')
			this.relative_min.x -= amount;
		this.update_dimensions();
	}
	else if (direction == 'up' || direction == 'down') {
		for (var i = 0; i < this.width; i++) {
			for (var j = 0; j < amount; j++) {
				if (direction == 'up') {
					this.tiles[i].unshift(null);
					
				}
				if (direction == 'down')
					this.tiles[i].push(null);
			}
			
		}
		if (direction == 'up')
				this.relative_min.y -= amount;
		this.update_dimensions();
	}
	
	// Shift stage and tile sprites if expanded left or up
	if (direction == 'left' || direction == 'up') {
		var x_px = amount * tile_width;
		var y_px = amount * tile_height;
		
		// Shift this tile_containers pixi.container
		if (direction == 'left')
			this.sprites.pivot.x += x_px;
		else if (direction == 'up')
			this.sprites.pivot.y += y_px;
		
		// Shift sprites within pixi.container
		for (var i = 0; i < this.width; i++) {
			for (var j = 0; j < this.height; j++) {
				// this.tiles[i][j] === true is a check when selector_lasso_update_mask is called
				if (this.tile_at(i,j) === false || this.tiles[i][j].sprite === null || this.tiles[i][j] === true)
					continue;
				else {
					if (direction === 'left') {
						this.tiles[i][j].shift_sprite(x_px,0);
					}
					else if (direction === 'up') {
						this.tiles[i][j].shift_sprite(0,y_px);
					}
				}
			}
		}
	}
};

Tile_Container.prototype.check_if_null_matrix = function() {
	for (var i = 0; i < this.width; i++) {
		for (var j = 0; j < this.height; j++) {
			if (this.tiles[i][j] !== null)
				return false;
		}
	}
	return true;
};

// Return null if this.tiles is completely null
Tile_Container.prototype.get_null_edges = function() {
	
	var null_edges = {	
		left : 0,
		right : 0,
		up : 0,
		down : 0
	};
	
	// Left Edges
	var tile_found = false;
	for (var i = 0; i <= this.x_max && tile_found === false; i++) {
		for (var j = 0; j <= this.y_max && tile_found === false; j++) {
			if (this.tiles[i][j] !== null) {
				tile_found = true;
				null_edges.left = i;
			}
			
			// Every tile in this.tiles is null
			else if (i == this.x_max && j == this.y_max) {
				return null;
			}
		}
	}
	// Right Edges
	tile_found = false;
	for (var i = this.x_max; i >= 0 && tile_found === false; i--) {
		for (var j = 0; j <= this.y_max && tile_found === false; j++) {
			if (this.tiles[i][j] !== null) {
				tile_found = true;
				null_edges.right = this.x_max - i;
			}
		}
	}
	// Up Edges
	tile_found = false;
	for (var j = 0; j <= this.y_max && tile_found === false; j++) {
		for (var i = 0; i <= this.x_max && tile_found === false; i++) {
			if (this.tiles[i][j] !== null) {
				tile_found = true;
				null_edges.up = j;
			}
		}
	}
	// Down Edges
	tile_found = false;
	for (var j = this.y_max; j >= 0 && tile_found === false; j--) {
		for (var i = 0; i <= this.x_max && tile_found === false; i++) {
			if (this.tiles[i][j] !== null) {
				tile_found = true;
				null_edges.down = this.y_max - j;
			}
		}
	}
	
	return null_edges;
};

Tile_Container.prototype.cull_edges = function(cull_amount) {
	// Left edges
	if (cull_amount.left > 0) {
		if (this.mask === false)
			this.tiles_function_between('remove_sprite',this.relative_min.x,this.relative_min.y,this.relative_min.x+cull_amount.left-1,this.relative_max.y);

		for (var i = 0; i < cull_amount.left; i++) {	
			this.tiles.shift();
		}
		this.relative_min.x += cull_amount.left;
	}
	
	// Right edges
	if (cull_amount.right > 0) {
		if (this.mask === false)
			this.tiles_function_between('remove_sprite',this.relative_max.x - cull_amount.right + 1,this.relative_min.y,this.relative_max.x,this.relative_max.y);
		
		for (var i = 0; i < cull_amount.right; i++) {	
			this.tiles.pop();
		}
	}
	
	this.update_dimensions();
	
	// Up edges
	if (cull_amount.up > 0) {
		if (this.mask === false)
			this.tiles_function_between('remove_sprite',this.relative_min.x,this.relative_min.y,this.relative_max.x,this.relative_min.y+cull_amount.up-1);
		
		for (var i = 0; i <= this.x_max; i++) {
			for (var j = 0; j < cull_amount.up; j++) {
				this.tiles[i].shift();
			}
		}
		this.relative_min.y += cull_amount.up;
	}
	
	// Down edges
	if (cull_amount.down > 0) {
		if (this.mask === false)
			this.tiles_function_between('remove_sprite',this.relative_min.x,this.relative_max.y - cull_amount.down+1,this.relative_max.x,this.relative_max.y);
		
		for (var i = 0; i <= this.x_max; i++) {
			for (var j = 0; j < cull_amount.down; j++) {
				this.tiles[i].pop();
			}
		}
	}
	
	this.update_dimensions();
	
	// Shift stage and tile sprites if expanded left or up
	if ((cull_amount.left > 0 || cull_amount.up > 0) && this.mask === false) {
		var left_shift_pixels = cull_amount.left * tile_width;
		var up_shift_pixels = cull_amount.up * tile_height;
		
		// Shift stage
		if (cull_amount.left > 0)
			this.sprites.pivot.x -= left_shift_pixels;
		if (cull_amount.up > 0)
			this.sprites.pivot.y -= up_shift_pixels;
		
		// Shift sprites
		for (var i = 0; i < this.width; i++) {
			for (var j = 0; j < this.height; j++) {
				if (this.tile_at(i,j) === false || this.tiles[i][j].sprite === null)
					continue;
				else {
					if (cull_amount.left > 0)
						this.tiles[i][j].shift_sprite(-left_shift_pixels,0);
					if (cull_amount.up > 0)
						this.tiles[i][j].shift_sprite(0,-up_shift_pixels);
				}
			}
		}
	}
};

Tile_Container.prototype.cull_null_edges = function() {
	
	var cull_amount = this.get_null_edges();
	
	if (cull_amount === null)
		this.initialize_null_matrix(1,1);
		
	// Do the culling
	if (this.empty === false)
		this.cull_edges(cull_amount);
};

// Tile_Container and Mask must be same dimensions
Tile_Container.prototype.apply_mask = function(mask) {
	for (var i = 0; i < this.width; i++) {
		for (var j = 0; j < this.height; j++) {
			if (mask.tiles[i][j] === false)
				this.tiles[i][j] = null;
		}
	}
};

// Converts edges that are type 1 or 2 to type 3
Tile_Container.prototype.tiles_set_edge_prescedence = function() {
	for (var i = 0; i < this.width; i++) {
		for (var j = 0; j < this.height; j++) {
			if (this.tile_at(i,j) === true)
				this.tiles[i][j].set_edge_prescedence();
		}
	}
}

Tile_Container.prototype.fill_row = function(row_index, tile_type, tile_set) {
	for (var i = 0; i < this.width; i++) {
		if (this.tile_at(i,row_index))
			this.remove_tile_at(i,row_index);
		
		if (tile_type !== null)
			this.tiles[i][row_index] = new Tile(this,tile_type,tile_set);
	}
};

Tile_Container.prototype.fill_column = function(col_index, tile_type, tile_set) {
	for (var j = 0; j < this.height; j++) {
		if (this.tile_at(col_index,j) === true)
			this.remove_tile_at(col_index,j);
		
		if (tile_type !== null)
			this.tiles[col_index][j] = new Tile(this,tile_type,tile_set);
	}
};