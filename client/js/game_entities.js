/*
Collider: 

Entity:

Prop: Sprite at given position
	-has position, rotation, scale properties
	
Triggers:
	-Time
	-Collide with collider obj

*/

var Entity = function(entity_container, pos) {
	this.entity_container = entity_container
	this.uid = Math.random();
	
	this.position = {x:pos.x,y:pos.y};
	this.width;
	this.height;
	this.extents;
	
	this.sprite = new PIXI.Container();
	this.entity_container.sprites.addChild(this.sprite);
	
	// Flags
	this.show_collider_sprite = true;
	
	this.load_default();
	
	if (this.show_collider_sprite === true) {
		this.load_collider_sprite();
		this.show_collider_sprite();
	}
};

Entity.prototype.load_default = function() {
	this.width = 24;
	this.height = 24;
	this.extents = this.get_extents();
};

Entity.prototype.load_flag = function() {
	this.width = 34;
	this.height = 44;
	this.extents = this.get_extents();

	// Add the flag texture sprite
};

Entity.prototype.get_extents = function() {
	var extents = {
		x : this.width / 2,
		y : this.height / 2
	};
	return extents;
};

Entity.prototype.load_collider_sprite = function() {
	this.sprite_collider = new PIXI.Graphics();
	this.sprite_collider.lineStyle(2,'0xFFFF00');
	this.sprite_collider.drawRect(0,0, this.width, this.height);
	this.sprite_collider.pivot.set(this.extents.x,this.extents.y);
	this.sprite_collider.position.set(this.position.x,this.position.y);
};

Entity.prototype.show_collider_sprite = function() {
	if (this.sprite_collider !== null)
		this.sprite.addChild(this.sprite_collider);
};


////////////////////////////////////////////////////////////////////////

var Collider = function(game_map) {
	this.game_map = game_map;
	
	this.position;
	this.extents;
	this.width;
	this.height;
	
	this.triggers;
	
	// Flags
	this.is_collidable;
	this.is_phasable;
	this.queue_draw;
};

Collider.prototype.load_test = function() {
	this.position = {x:0,y:0};
	this.extents = {x:16,y:16};
	this.width = 32;
	this.height = 32;
	
	this.gfx = new PIXI.Graphics();
	this.gfx.lineStyle(2,'0xFFFF00');
	this.gfx.drawRect(-16, -16, this.width, this.height);
	this.game_map.stage.addChild(this.gfx);
};

Collider.prototype.update_position = function(x,y) {
	this.position.x = x,
	this.position.y = y;
	
	this.gfx.position.x = this.position.x;
	this.gfx.position.y = this.position.y;
};

var Zone = function() {
	this.collider;
	
	// Flags
	this.is_active;
	this.queue_destroy;
};

if (typeof(global) != 'undefined') {
	module.exports = global.Entity = Entity;
	module.exports = global.Collider = Collider;
}