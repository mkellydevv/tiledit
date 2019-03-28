var Tile = function(tile_container, tile_type, tile_set) {
	this.tile_container = tile_container;
	
	// Objects
	this.sprite = null;
	this.left_sprite = null;
	this.right_sprite = null;
	this.top_sprite = null;
	this.down_sprite = null;
	this.edges;
	
	// Attributes
	this.tile_type;
	this.tile_set;
	this.edge_type;
	this.seed_core = null;
	this.seed_overlays = null;
		
	// Flags
	this.empty;
	this.modified;	// If any of a tile's directional flags are modified, it needs to redetermine the edge_type
	this.up;
	this.right;
	this.down;
	this.left;	
	
	if (tile_type > -1) {
		this.tile_type = tile_type;
		this.tile_set = tile_set;
		this.empty = false;
		this.modified = null;
		this.initialize_edge_flags();
	}
	else
		this.empty = true;
};

// Initialize the tile edge flags as if it had no neighbors
Tile.prototype.initialize_edge_flags = function() {
	this.up = null;
	this.down = null;
	this.left = null;
	this.right = null;
	
	// Tile types that do not have the given side
	var no_up = [19,20];
	var no_down = [17,18];
	var no_right = [2,3,6,7,9,10,11,12,14,15,18,19];
	var no_left = [1,4,5,8,9,10,11,12,13,16,17,20];
	
	if (no_up.indexOf(this.tile_type) == -1)
		this.up = 1;
	if (no_down.indexOf(this.tile_type) == -1)
		this.down = 1;
	if (no_right.indexOf(this.tile_type) == -1)
		this.right = 1;
	if (no_left.indexOf(this.tile_type) == -1)
		this.left = 1;
	
	this.modified = true;
	this.remove_sprite();
};

Tile.prototype.get_position = function() {
	for (var i = 0; i < this.tile_container.width; i++) {
		for (var j = 0; j < this.tile_container.height; j++) {
			if (this.tile_container.tiles[i][j] === this)
				return [i,j];
		}
	}
};

// Determine if given neighbor_tile shares a flush edge with this tile and flags each tile accordingly
Tile.prototype.check_flush_edge = function(neighbor_tile, direction) {
	if (direction === 'left' || direction === 'right') {
		// Groups of tile_types that have a flat edge on a particular side
		var group_left =  [0,2,3,6,7,14,15,18,19];
		var group_right = [0,1,4,5,8,13,16,17,20];
		
		// Handle neighbor_tile when it's null or empty
		if (neighbor_tile === null || neighbor_tile.empty === true) {
			
			// Store for modified check
			var original_left = this.left;
			var original_right = this.right;
			
			if (group_left.indexOf(this.tile_type) !== -1 && direction === 'left')
				this.left = 1;
			else if (group_right.indexOf(this.tile_type) !== -1 && direction === 'right')
				this.right = 1;
			
			// Check if this.tile was modified
			if (this.left !== original_left || this.right !== original_right) {
				this.modified = true;
				this.remove_sprite();
			}
		}
		// Neighbor tile is a real tile
		else {
			// Arrange this.tile and neighbor_tile so it's always comparing left to right
			var left_tile = this;
			var right_tile = neighbor_tile;
			if (direction === 'left') {
				left_tile = neighbor_tile;
				right_tile = this;
			}
			
			// Store for modified check
			var left_tile_orig_left = left_tile.left;
			var left_tile_orig_right = left_tile.right;
			var right_tile_orig_left = right_tile.left;
			var right_tile_orig_right = right_tile.right;
			
			// Compare left_tile to right_tile
			if (group_right.indexOf(left_tile.tile_type) !== -1) {
				if (group_left.indexOf(right_tile.tile_type) !== -1) {
					// No edge exists between tiles
					if (left_tile.tile_set === right_tile.tile_set) {
						left_tile.right = 0;
						right_tile.left = 0;
					}
					// Visual edge exists between tiles
					else {						
						if (left_tile.right === 3) {
							left_tile.right = 3;
							right_tile.left = 0;
						}
						else if (right_tile.left === 3) {
							left_tile.right = 0;
							right_tile.left = 3;
						}
						
					}
				}
				else
					left_tile.right = 1;
			}
			else {
				if (group_left.indexOf(right_tile.tile_type) !== -1)
					right_tile.left = 1;
			}
			
			// Check if left_tile was modified
			if (left_tile.left !== left_tile_orig_left || left_tile.right !== left_tile_orig_right) {
				left_tile.modified = true;
				left_tile.remove_sprite();
			}
			// Check if right_tile was modified
			if (right_tile.left !== right_tile_orig_left || right_tile.right !== right_tile_orig_right) {
				right_tile.modified = true;
				right_tile.remove_sprite();
			}
		}
	}
	
	else if (direction == 'up' || direction == 'down') {
		// Groups of tile_types that have a flat edge on a particular side
		var group_up =    [0,3,4,7,8,11,12,15,16];
		var group_down =  [0,1,2,5,6, 9,10,13,14];
		
		// Handle neighbor_tile when it's null or empty
		if (neighbor_tile === null || neighbor_tile.empty === true) {
			// Store for modified check
			var original_up = this.up;
			var original_down = this.down;
			
			if (group_up.indexOf(this.tile_type) !== -1 && direction === 'up')
				this.up = 1;
			else if (group_down.indexOf(this.tile_type) !== -1 && direction === 'down')
				this.down = 1;
			
			// Check if this.tile was modified
			if (this.up !== original_up || this.down !== original_down) {
				this.modified = true;
				this.remove_sprite();
			}
		}
		// Neighbor tile is a real tile
		else {
			// Arrange this.tile and neighbor_tile so it's always comparing up to down
			var up_tile = this;
			var down_tile = neighbor_tile;
			if (direction === 'up') {
				up_tile = neighbor_tile;
				down_tile = this;
			}
			
			// Store for modified check
			var up_tile_orig_up = up_tile.up;
			var up_tile_orig_down = up_tile.down;
			var down_tile_orig_up = down_tile.up;
			var down_tile_orig_down = down_tile.down;
			
			// Compare up_tile to down_tile
			if (group_down.indexOf(up_tile.tile_type) !== -1) {
				if (group_up.indexOf(down_tile.tile_type) !== -1) {
					// No edge exists between tiles
					if (up_tile.tile_set === down_tile.tile_set) {
						up_tile.down = 0;
						down_tile.up = 0;
					}
					// Visual edge exists between tiles
					else {
						if (up_tile.down === 3 || down_tile.up === 3) {
							
						}
						if (up_tile.down === 3) {
							up_tile.down = 3;
							down_tile.up = 0;
						}
						else if (down_tile.up === 3) {
							up_tile.down = 0;
							down_tile.up = 3;
						}
					}
				}
				else
					up_tile.down = 1;
			}
			else {
				if (group_up.indexOf(down_tile.tile_type) !== -1)
					down_tile.up = 1;
			}
			
			// Check if up_tile was modified
			if (up_tile.up !== up_tile_orig_up || up_tile.down !== up_tile_orig_down) {
				up_tile.modified = true;
				up_tile.remove_sprite();
			}
			// Check if down_tile was modified
			if (down_tile.up !== down_tile_orig_up || down_tile.down !== down_tile_orig_down) {
				down_tile.modified = true;
				down_tile.remove_sprite();
			}
		}
	}
};

// Determine this tile's edge_type based on directional flags
Tile.prototype.determine_edge_type = function() {
	// 0 Edge is not visual or collidable
	// 1 Edge is visual and collidable
	// 2 Edge is visual but not collidable
	
	// Return if tile's directional flags havent been changed
	if (this.modified === false)
		return;
	
	// tile_types that share directional edge_types
	var group_udr_top = [1,5,13];
	var group_udl_top = [2,6,14];
	var group_udl_bot = [3,7,15];
	var group_udr_bot = [4,8,16];
	var group_ud = [9,10,11,12];
	var group_remainder = [17,18,19,20];
	
	// tile_type: 0
	if (this.tile_type === 0) {
		if (this.up >= 1) {
			if (this.right >= 1) {
				if (this.down >= 1) {
					if (this.left >= 1)
						this.edge_type = 15;
					else
						this.edge_type = 11;
				}
				else {
					if (this.left >= 1)
						this.edge_type = 14;
					else
						this.edge_type = 7;
				}
			}
			else {
				if (this.down >= 1) {
					if (this.left >= 1)
						this.edge_type = 13;
					else
						this.edge_type = 5;
				}
				else {
					if (this.left >= 1)
						this.edge_type = 10;
					else
						this.edge_type = 1;
				}
			}
		}
		else {
			if (this.right >= 1) {
				if (this.down >= 1) {
					if (this.left >= 1)
						this.edge_type = 12;
					else
						this.edge_type = 8;
				}
				else {
					if (this.left >= 1)
						this.edge_type = 6;
					else
						this.edge_type = 2;
				}
			}
			else {
				if (this.down >= 1) {
					if (this.left >= 1)
						this.edge_type = 9;
					else
						this.edge_type = 3;
				}
				else {
					if (this.left >= 1)
						this.edge_type = 4;
					else
						this.edge_type = 0;
				}
			}
		}
	}
	// group_udr_top: 1,5,13
	else if (group_udr_top.indexOf(this.tile_type) !== -1) {
		if (this.right >= 1) {
			if (this.down >= 1) 
				this.edge_type = 0;
			else
				this.edge_type = 1;
		}
		else {
			if (this.down >= 1) 
				this.edge_type = 2;
			else
				this.edge_type = 3;
		}
	}
	// group_udl_top: 2,6,14
	else if (group_udl_top.indexOf(this.tile_type) !== -1) {
		if (this.left >= 1) {
			if (this.down >= 1) 
				this.edge_type = 0;
			else
				this.edge_type = 1;
		}
		else {
			if (this.down >= 1) 
				this.edge_type = 2;
			else
				this.edge_type = 3;
		}
	}
	// group_udl_bot: 3,7,15
	else if (group_udl_bot.indexOf(this.tile_type) !== -1) {
		if (this.left >= 1) {
			if (this.up >= 1) 
				this.edge_type = 0;
			else
				this.edge_type = 1;
		}
		else {
			if (this.up >= 1) 
				this.edge_type = 2;
			else
				this.edge_type = 3;
		}
	}
	// group_udr_bot: 4,8,16
	else if (group_udr_bot.indexOf(this.tile_type) !== -1) {
		if (this.right >= 1) {
			if (this.up >= 1) 
				this.edge_type = 0;
			else
				this.edge_type = 1;
		}
		else {
			if (this.up >= 1) 
				this.edge_type = 2;
			else
				this.edge_type = 3;
		}
	}
	// group_ud: 9,10,11,12
	else if (group_ud.indexOf(this.tile_type) !== -1) {
		if (this.up >= 1 && this.down >= 1)
			this.edge_type = 0;
		else
			this.edge_type = 1;
	}
	// group_remainder: 17,18,19,20
	else if (group_remainder.indexOf(this.tile_type) !== -1) {
		if (this.left >= 1 || this.right >= 1)
			this.edge_type = 0;
		else
			this.edge_type = 1;
	}

	this.modified = false;
};

Tile.prototype.load_sprite = function(tile_pos_x, tile_pos_y) {
	// Return if a sprite is already loaded
	if (this.sprite !== null)
		return;
	
	// Determin quad_tile within quad
	var quad_tile;
	var x_seed = tile_pos_x + this.tile_container.relative_min.x;
	var y_seed = tile_pos_y + this.tile_container.relative_min.y;
	
	var x_even = true;
	if (Math.abs(x_seed % 2) === 1)
		x_even = false;
	var y_even = true;
	if (Math.abs(y_seed % 2) === 1)
		y_even = false;
	
	if (x_even === true) {
		if (y_even === true)
			quad_tile = 0;
		else {
			quad_tile = 1;
			y_seed -= 1;
		}
	}
	else {
		if (y_even === true)
			quad_tile = 2;
		else {
			quad_tile = 3;
			y_seed -= 1;
		}
		x_seed -= 1;
	}
	
	// Determine this tiles seed for its core sprite and overlays
	if (this.seed_core === null) {
		var tmp_seed = ((x_seed+16807) * this.tile_container.sprite_seed + (y_seed+12345)) % 2147483647;
		this.seed_core = tmp_seed % 4; // 15
		this.seed_overlays = tmp_seed % 2; // 3
	}
	
	// this.sprite holds the sprite_core and sprite_mask
	this.sprite = new PIXI.Container();
	this.sprite.x = tile_pos_x * tile_width;
	this.sprite.y = tile_pos_y * tile_height;
	let random_tile = Math.floor(Math.random() * 4);
	
	// Sprite Core
	var sprite_core = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].quads[random_tile]);
	this.sprite.addChild(sprite_core);
	
	// Sprite Mask
	var sprite_mask = this.get_mask();
	if (sprite_mask !== null) {
		sprite_core.mask = sprite_mask;
		this.sprite.addChild(sprite_mask);
	}
	
	var pixel_pos_x = tile_pos_x * tile_width;
	var pixel_pos_y = tile_pos_y * tile_height;
	
	// Sprite Overlays
	if (this.left >= 1)
		this.load_left_overlay(pixel_pos_x,pixel_pos_y,y_even);
	if (this.right >= 1)
		this.load_right_overlay(pixel_pos_x,pixel_pos_y,y_even);
	if (this.down >= 1)
		this.load_down_overlay(pixel_pos_x,pixel_pos_y,x_even);
	if (this.up >= 1)
		this.load_up_overlay(pixel_pos_x,pixel_pos_y,x_even);
	
	// Apply tint
	this.apply_tint();
	
	this.tile_container.sprites_core.addChild(this.sprite);
};

Tile.prototype.load_left_overlay = function(pixel_pos_x,pixel_pos_y,y_even) {
	let overlay_tile = Math.floor(Math.random() * 2) + 1;
	
	this.left_sprite = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].sides[overlay_tile]);
	this.left_sprite.position.x = pixel_pos_x - tile_width/2;
	this.left_sprite.position.y = pixel_pos_y;
	
	this.tile_container.sprites_left.addChild(this.left_sprite);
};

Tile.prototype.load_right_overlay = function(pixel_pos_x,pixel_pos_y,y_even) {
	let overlay_tile = Math.floor(Math.random() * 2) + 1;
	
	this.right_sprite = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].sides[overlay_tile]);
	this.right_sprite.position.x = pixel_pos_x + tile_width/2;
	this.right_sprite.position.y = pixel_pos_y;

	this.tile_container.sprites_right.addChild(this.right_sprite);
};

Tile.prototype.load_up_overlay = function(pixel_pos_x,pixel_pos_y,x_even) {	
	let overlay_tile = Math.floor(Math.random() * 2) + 1;

	var top_sprite = new PIXI.Container();
	top_sprite.position.x = pixel_pos_x;
	top_sprite.position.y = pixel_pos_y - tile_height/2;
	
	var top_sprite_core = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].tops[overlay_tile]);
	top_sprite.addChild(top_sprite_core);

	var angled_ups = [1,2,5,6,9,10,13,14,17,18];
	
	if (angled_ups.indexOf(this.tile_type) !== -1) {
				
		top_sprite.pivot = {x:tile_width/2, y:tile_height/2};

		if (this.tile_type === 1) {
			top_sprite.position.x += tile_width / 2;
			top_sprite.position.y += tile_height;
			top_sprite.scale.x = tri_scale;
			top_sprite.rotation = -rad_45;
		}
		else if (this.tile_type === 2) {
			top_sprite.position.x += tile_width / 2;
			top_sprite.position.y += tile_height;
			top_sprite.scale.x = tri_scale;
			top_sprite.rotation = rad_45;
		}
		else if (this.tile_type === 5 || this.tile_type === 9) {
			top_sprite.position.x += tile_width / 2;
			if (this.tile_type === 5)
				top_sprite.position.y += tile_height * 0.75;
			else if (this.tile_type === 9)
				top_sprite.position.y += tile_height * 1.25;
			top_sprite.scale.x = hor_vert_tri_scale;
			top_sprite.rotation = -rad_27;
		}
		else if (this.tile_type === 6 || this.tile_type === 10) {
			top_sprite.position.x += tile_width / 2;
			if (this.tile_type === 6)
				top_sprite.position.y += tile_height * 0.75;
			else if (this.tile_type === 10)
				top_sprite.position.y += tile_height * 1.25;
			top_sprite.scale.x = hor_vert_tri_scale;
			top_sprite.rotation = rad_27;
		}
		
		// CHANGE THIS SO THAT VERT TRIS ARE LEFT/RIGHT/DOWN INSTEAD OF UP/RIGHT/DOWN (relative to 13/17 vert tri)
		else if (this.tile_type === 13 || this.tile_type === 17) {
			top_sprite.position.y += tile_height;
			if (this.tile_type === 13)
				top_sprite.position.x += tile_width * 0.25;
			else if (this.tile_type === 17)
				top_sprite.position.x += tile_width * 0.75;
			top_sprite.scale.x = hor_vert_tri_scale;
			top_sprite.rotation = -rad_63;
		}
		else if (this.tile_type === 14 || this.tile_type === 18) {
			top_sprite.position.y += tile_height;
			if (this.tile_type === 14)
				top_sprite.position.x += tile_width * 0.75;
			else if (this.tile_type === 18)
				top_sprite.position.x += tile_width * 0.25;
			top_sprite.scale.x = hor_vert_tri_scale;
			top_sprite.rotation = rad_63;
		}
	}
	
	// Left corner
	var add_left_corner = false;
	var angled_left_corners = [1,4,9,12,13,16];
	if (this.left >= 1)
		add_left_corner = true;
	else if (this.left === null && angled_left_corners.indexOf(this.tile_type) !== -1)
		add_left_corner = true;
	else if (this.left === 0 || 
			(this.tile_type === 8 || this.tile_type === 11) ||
			(this.tile_type === 5 || this.tile_type === 10)) {
		var tile_pos_x = pixel_pos_x / tile_width;
		var tile_pos_y = pixel_pos_y / tile_height;
		var tmp_x = tile_pos_x - 1;
		
		// Add corner when left neighbor exists, but neighbor doesnt have an up overlay, is next to vert tris, or neighbor has a right overlay
		if (tmp_x >= 0 && this.tile_container.tile_at(tmp_x,tile_pos_y) === true) {
			if (this.tile_container.tiles[tmp_x][tile_pos_y].up === 0 ||
				(this.tile_container.tiles[tmp_x][tile_pos_y].tile_type === 13 || this.tile_container.tiles[tmp_x][tile_pos_y].tile_type === 20) ||
				(this.tile_container.tiles[tmp_x][tile_pos_y].right > 0))
				add_left_corner = true;
		}		
	}
	if (add_left_corner === true) {
		var corner = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].tops[0]);
		corner.position.set(-tile_width/2,0);
		top_sprite.addChild(corner);
	}
	
	// Right corner
	var add_right_corner = false;
	var angled_right_corners = [2,3,10,11,14,15];
	if (this.right >= 1)
		add_right_corner = true;
	else if (this.right === null && angled_right_corners.indexOf(this.tile_type) !== -1)
		add_right_corner = true;
	else if (this.right === 0 || 
			(this.tile_type === 7 || this.tile_type === 12) ||
			(this.tile_type === 6 || this.tile_type === 9)) {
		var tile_pos_x = pixel_pos_x / tile_width;
		var tile_pos_y = pixel_pos_y / tile_height;
		var tmp_x = tile_pos_x + 1;
		
		// Add corner when right neighbor exists, but neighbor doesnt have an up overlay, is next to vert tris, or neighbor has a left overlay
		if (tmp_x <= this.tile_container.x_max && this.tile_container.tile_at(tmp_x,tile_pos_y) === true) {
			if (this.tile_container.tiles[tmp_x][tile_pos_y].up === 0 || 
				(this.tile_container.tiles[tmp_x][tile_pos_y].tile_type === 14 || this.tile_container.tiles[tmp_x][tile_pos_y].tile_type === 19) ||
				(this.tile_container.tiles[tmp_x][tile_pos_y].left > 0))
				add_right_corner = true;
		}
	}
	if (add_right_corner === true) {
		var corner = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].tops[3]);
		corner.position.set(tile_width,0);
		top_sprite.addChild(corner);
	}
	
	this.top_sprite = top_sprite;
	this.tile_container.sprites_up.addChild(this.top_sprite);
};

Tile.prototype.load_down_overlay = function(pixel_pos_x,pixel_pos_y,x_even) {
	let overlay_tile = Math.floor(Math.random() * 2) + 1;
	
	var down_sprite = new PIXI.Container();
	down_sprite.position.x = pixel_pos_x;
	down_sprite.position.y = pixel_pos_y+tile_height/2;
	
	var down_sprite_core = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].bots[overlay_tile]);
	down_sprite.addChild(down_sprite_core);
	
	var angled_downs = [3,4,7,8,11,12,15,16,19,20];
	
	if (angled_downs.indexOf(this.tile_type) !== -1) {
			
		down_sprite.pivot = {x:tile_width/2, y:tile_height/2};

		if (this.tile_type === 3) {
			down_sprite.position.x += tile_width / 2;
			down_sprite.scale.x = tri_scale-0.2;
			down_sprite.rotation = -rad_45;
		}
		else if (this.tile_type === 4) {
			down_sprite.position.x += tile_width / 2;
			down_sprite.scale.x = tri_scale-0.2;
			down_sprite.rotation = rad_45;
		}
		else if (this.tile_type === 7 || this.tile_type === 11) {
			down_sprite.position.x += tile_width / 2;
			if (this.tile_type === 7)
				down_sprite.position.y += tile_height * 0.25;
			else if (this.tile_type === 11)
				down_sprite.position.y -= tile_height * 0.25;
			down_sprite.scale.x = hor_vert_tri_scale;
			down_sprite.rotation = -rad_27;
		}
		else if (this.tile_type === 8 || this.tile_type === 12) {
			down_sprite.position.x += tile_width / 2;
			if (this.tile_type === 8)
				down_sprite.position.y += tile_height * 0.25;
			else if (this.tile_type === 12)
				down_sprite.position.y -= tile_height * 0.25;
			down_sprite.scale.x = hor_vert_tri_scale;
			down_sprite.rotation = rad_27;
		}
		
		// CHANGE THIS SO THAT VERT TRIS ARE LEFT/RIGHT/DOWN INSTEAD OF UP/RIGHT/DOWN (relative to 13/17 vert tri)
		else if (this.tile_type === 15 || this.tile_type === 19) {
			if (this.tile_type === 15)
				down_sprite.position.x += tile_width * 0.75;
			else if (this.tile_type === 19)
				down_sprite.position.x += tile_width * 0.25;
			down_sprite.scale.x = hor_vert_tri_scale;
			down_sprite.rotation = -rad_63;
		}
		else if (this.tile_type === 16 || this.tile_type === 20) {
			if (this.tile_type === 16)
				down_sprite.position.x += tile_width * 0.25;
			else if (this.tile_type === 20)
				down_sprite.position.x += tile_width * 0.75;
			down_sprite.scale.x = hor_vert_tri_scale;
			down_sprite.rotation = rad_63;
		}
	}
	
	var add_left_corner = false;
	var angled_left_corners = [3,7,19];
	if (this.left >= 1)
		add_left_corner = true;
	else if (this.up === 0)
		add_left_corner = true;
	else if (this.left === 0 && angled_left_corners.indexOf(this.tile_type) !== -1) {
		var tile_pos_x = pixel_pos_x / tile_width;
		var tile_pos_y = pixel_pos_y / tile_height;
		var tmp_x = tile_pos_x - 1;
		
		if (tmp_x >= 0 && this.tile_container.tile_at(tmp_x,tile_pos_y) === true && this.tile_container.tiles[tmp_x][tile_pos_y].down > 0)
			add_left_corner = true;
	}
	if (add_left_corner === true) {
		var corner = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].bots[0]);
		corner.position.x = -tile_width/2;
		down_sprite.addChild(corner);
	}
	
	var add_right_corner = false;
	var angled_right_corners = [4,8,20];
	if (this.right >= 1)
		add_right_corner = true;
	else if (this.up === 0)
		add_right_corner = true;
	else if (this.right === 0 && angled_right_corners.indexOf(this.tile_type) !== -1) {
		var tile_pos_x = pixel_pos_x / tile_width;
		var tile_pos_y = pixel_pos_y / tile_height;
		var tmp_x = tile_pos_x + 1;
		
		if (tmp_x <= this.tile_container.x_max && this.tile_container.tile_at(tmp_x,tile_pos_y) === true && this.tile_container.tiles[tmp_x][tile_pos_y].down > 0)
			add_right_corner = true;
	}
	if (add_right_corner === true) {
		var corner = new PIXI.Sprite(this.tile_container.game_map.tile_set_textures['tile_' + this.tile_set].bots[3]);
		corner.position.x = tile_width;
		down_sprite.addChild(corner);
	}
	
	this.down_sprite = down_sprite;
	this.tile_container.sprites_down.addChild(this.down_sprite);
};

Tile.prototype.get_mask = function() {
	if (this.tile_type === 0)
		return null;
	
	var gfx = new PIXI.Graphics();
	
	gfx.lineStyle(0,0xFFFFFF,1);
	gfx.beginFill(0xFFFFFF,1);
	
	// Tris
	if (this.tile_type === 1)
		gfx.drawPolygon([tile_width,0, tile_width,tile_height, 0,tile_height]);
	else if (this.tile_type === 2)
		gfx.drawPolygon([0,0, tile_width,tile_height, 0,tile_height]);
	else if (this.tile_type === 3)
		gfx.drawPolygon([0,0, tile_width,0, 0,tile_height]);
	else if (this.tile_type === 4)
		gfx.drawPolygon([0,0, tile_width,0, tile_width,tile_height]);
	
	// Horizontal Tris
	else if (this.tile_type === 5)
		gfx.drawPolygon([0,(tile_height/2), tile_width,0, tile_width,tile_height, 0,tile_height]);
	else if (this.tile_type === 6)
		gfx.drawPolygon([0,0, tile_width,(tile_height/2), tile_width,tile_height, 0,tile_height]);
	else if (this.tile_type === 7)
		gfx.drawPolygon([0,0, tile_width,0, tile_width,(tile_height/2), 0,tile_height]);
	else if (this.tile_type === 8)
		gfx.drawPolygon([0,0, tile_width,0, tile_width,tile_height, 0,(tile_height/2)]);
	
	else if (this.tile_type === 9)
		gfx.drawPolygon([0,tile_height, tile_width,(tile_height/2), tile_width,tile_height]);
	else if (this.tile_type === 10)
		gfx.drawPolygon([0,(tile_height/2), tile_width,tile_height, 0,tile_height]);
	else if (this.tile_type === 11)
		gfx.drawPolygon([0,0, tile_width,0, 0,(tile_height/2)]);
	else if (this.tile_type === 12)
		gfx.drawPolygon([0,0, tile_width,0, tile_width,(tile_height/2)]);
	
	// Vertical Tris
	else if (this.tile_type === 13)
		gfx.drawPolygon([0,tile_height, (tile_width/2),0, tile_width,0, tile_width,tile_height]);
	else if (this.tile_type === 14)
		gfx.drawPolygon([0,0, (tile_width/2),0, tile_width,tile_height, 0,tile_height]);
	else if (this.tile_type === 15)
		gfx.drawPolygon([0,0, tile_width,0, (tile_width/2),tile_height, 0,tile_height]);
	else if (this.tile_type === 16)
		gfx.drawPolygon([0,0, tile_width,0, tile_width,tile_height, (tile_width/2),tile_height]);
	
	else if (this.tile_type === 17)
		gfx.drawPolygon([tile_width,0, tile_width,tile_height, (tile_width/2),tile_height]);
	else if (this.tile_type === 18)
		gfx.drawPolygon([0,0, (tile_width/2),tile_height, 0,tile_height]);
	else if (this.tile_type === 19)
		gfx.drawPolygon([0,0, (tile_width/2),0, 0,tile_height]);
	else if (this.tile_type === 20)
		gfx.drawPolygon([(tile_width/2),0, tile_width,0, tile_width,tile_height]);
	
	gfx.endFill();
	
	var sprite_mask = new PIXI.Sprite(gfx.generateTexture());
	
	if (this.tile_type === 9 || this.tile_type === 10)
		sprite_mask.position.y = tile_height / 2;
	else if (this.tile_type === 17 || this.tile_type === 20)
		sprite_mask.position.x = tile_width / 2;
	
	return sprite_mask;
};

// Remove the tile's sprite from PIXI container
Tile.prototype.remove_sprite = function() {
	if (this.sprite !== null) {
		this.tile_container.sprites_core.removeChild(this.sprite);
		this.tile_container.sprites_left.removeChild(this.left_sprite);
		this.tile_container.sprites_right.removeChild(this.right_sprite);
		this.tile_container.sprites_down.removeChild(this.down_sprite);
		this.tile_container.sprites_up.removeChild(this.top_sprite);
	
		this.sprite = null;
		this.left_sprite = null;
		this.right_sprite = null;
		this.top_sprite = null;
		this.down_sprite = null;
	}
};

Tile.prototype.shift_sprite = function(x_pixels,y_pixels) {


	this.sprite.position.x += x_pixels;
	this.sprite.position.y += y_pixels;
	
	if (this.left_sprite !== null) {
		this.left_sprite.position.x += x_pixels;
		this.left_sprite.position.y += y_pixels;
	}
	if (this.right_sprite !== null) {
		this.right_sprite.position.x += x_pixels;
		this.right_sprite.position.y += y_pixels;
	}
	if (this.top_sprite !== null) {
		this.top_sprite.position.x += x_pixels;
		this.top_sprite.position.y += y_pixels;
	}
	if (this.down_sprite !== null) {
		this.down_sprite.position.x += x_pixels;
		this.down_sprite.position.y += y_pixels;
	}

};

Tile.prototype.set_edge_prescedence = function() {
	if (this.left > 0)
		this.left = 3;
	if (this.right > 0)
		this.right = 3;
	if (this.up > 0)
		this.up = 3;
	if (this.down > 0)
		this.down = 3;
	
};

Tile.prototype.import_prescedent_edges = function(tile) {
	if (tile.left === 3)
		this.left = 3;
	if (tile.right === 3)
		this.right = 3;
	if (tile.up === 3)
		this.up = 3;
	if (tile.down === 3)
		this.down = 3;
};

Tile.prototype.apply_tint = function() {
	var tint = this.tile_container.game_map.current_layer.tint
	
	if (this.sprite !== null)
		this.sprite.children[0].tint = tint;
	
	if (this.left_sprite !== null)
		this.left_sprite.tint = tint;
	if (this.right_sprite !== null)
		this.right_sprite.tint = tint;
	
	if (this.down_sprite !== null) {
		for (var i = 0; i < this.down_sprite.children.length; i++) {
			this.down_sprite.children[i].tint = tint;
		}
	}
	if (this.top_sprite !== null) {
		for (var i = 0; i < this.top_sprite.children.length; i++) {
			this.top_sprite.children[i].tint = tint;
		}
	}
};