
var Game_UI = function(game_client) {
	this.game_client = game_client;
		
	this.game_client.game_core.create_new_map();

	this.layers_made_count = 0;
	this.layer_map = new Map();
	this.current_layer = null;
};

////////////////////////////////////////////////////////////////
// Map Editor UI

Game_UI.prototype.setLayerContainerHeight = function () {
	let top = $('#ul_layers')[0].getBoundingClientRect().top
	let bot = $(window).scrollTop() + $(window).height();
	$('#ul_layers').css('height', bot - top - 5);
}

Game_UI.prototype.selectLayer = function (element) {
	let uid = $(element).data('uid')
	let val = this.layer_map.get(uid);
	
	this.current_layer = uid;
	this.game_client.game_core.game_map.set_current_layer('layer_uid',uid);

	$('#inp_layer_name').val(val.name);
	$('#inp_layer_scale').val(val.scale);
	$('#inp_layer_offset_x').val(val.offset.x);
	$('#inp_layer_offset_y').val(val.offset.y);
	$('#inp_layer_parallax_x').val(val.parallax.x);
	$('#inp_layer_parallax_y').val(val.parallax.y);
	$('#inp_layer_tint').val(val.tint);
}

Game_UI.prototype.handleLayerClick = function (event) {
	$('.li-layer').removeClass('active');
	$(event.target).addClass('active');
	this.selectLayer(event.target);
	this.game_client.game_core.game_map.apply_editor_attribute_to_layers('visible',false);
	this.game_client.game_core.game_map.apply_editor_attribute_to_layers('alpha',false);
	this.setLayerVisButtons();
}

Game_UI.prototype.setLayerVisButtons = function() {
	let $btns = $('.btn-layer');
	let arr_layer_vis = this.game_client.game_core.game_map.getLayersVisibility()
	for (let i = 0; i < arr_layer_vis.length; i++) {
		let layer_data = this.layer_map.get(arr_layer_vis[i].uid);
		layer_data.visible = arr_layer_vis[i].visible;
		
		if (layer_data.visible === true)
			$btns[i].innerHTML = ('<i class="fas fa-eye"></i>');
		else
			$btns[i].innerHTML = ('<i class="fas fa-eye-slash"></i>');
	}
}

Game_UI.prototype.load_editor_ui = function() {

	// Prevents ctrl+z on the form inputs
	$(document).on('keydown',(event)=>{
		if (event.ctrlKey === true && event.key === 'z')
			event.preventDefault();
	});

	$('#main_canvas').on('wheel',(event)=>{
		let m = this.game_client.game_core.game_map;
		if (m.camera_prev_pan_pos !== null)
			return;

		let $canvas = $('#main_canvas');
		if(event.originalEvent.deltaY < 0){
			// Up Scroll
			if (m.stage_scale > 0.25)
				m.stage_scale -= 0.2;
		} else {
			// Down Scroll
			m.stage_scale += 0.2;
		}
		m.stage.scale = {x:m.stage_scale, y:m.stage_scale};
		m.stage.position.x = -$canvas.width()/2 * (m.stage_scale - 1);
		m.stage.position.y = -$canvas.height()/2 * (m.stage_scale - 1);

		// Updates layer sprites position
		m.updateLayerSpritePositions();
		
	});

	$('[data-toggle="popover"]').popover({ 
		trigger: "hover",
		delay: { "show": 400, "hide": 50 }
	});

	// Sidebar Utils

	for (let i = 0; i < 2; i++) {
		let side = (i === 0) ? 'left' : 'right';

		$(`#btn_lock_${side}`).on('click',()=>{
			let $btn = $(`#btn_lock_${side}`);
			if ($btn.hasClass('active') === true)
				$btn.html('<i class="fas fa-lock-open"></i>');
			else
				$btn.html('<i class="fas fa-lock"></i>');
			this.toggle_active_button($btn[0].id);
		});

		$(`#btn_alpha_${side}`).on('click',()=>{
			let $btn = $(`#btn_alpha_${side}`);
			if ($btn.hasClass('active') === true)
				$btn.html('<i class="fas fa-circle"></i>');
			else
				$btn.html('<i class="fas fa-adjust">');
			
			this.toggle_active_button($btn[0].id);
		});
	}

	// Editor sidebar left //

	$('#editor_sidebar_left').on('mouseenter',()=>{
		this.handleSidebarEnter('editor_sidebar_left');
	});
	$('#editor_sidebar_left').on('mouseleave',()=>{
		this.handleSidebarLeave('editor_sidebar_left');
	});

	// Tools 

	$('#btn_select_std').on('click',()=>{
		this.game_client.game_core.game_map.set_current_tool('selector');
		this.game_client.game_core.game_map.set_selector_type('standard');
	});

	$('#btn_select_lasso').on('click',()=>{
		this.game_client.game_core.game_map.set_current_tool('selector');
		this.game_client.game_core.game_map.set_selector_type('lasso');
	});

	$('#btn_select_empty').on('click',(event)=>{
		let $btn = $('#btn_select_empty')[0];
		if ($btn.innerHTML === '<i class="fas fa-object-group"></i>')
			$btn.innerHTML = '<i class="fas fa-object-ungroup"></i>';
		else
			$btn.innerHTML = '<i class="fas fa-object-group"></i>';

		this.game_client.game_core.game_map.toggle_blank_tile_mode();
	});
	
	$('#btn_undo').on('click',()=>{
		this.game_client.game_core.game_map.undo_map_change();
	});

	$('#btn_redo').on('click',()=>{
		this.game_client.game_core.game_map.redo_map_change();
	});

	$('#btn_copy').on('click',()=>{
		this.game_client.game_core.game_map.copy_selected_area();
	});

	$('#btn_paste').on('click',()=>{
		this.game_client.game_core.game_map.paste_selected_area();
	});

	$('#btn_cut').on('click',()=>{
		this.game_client.game_core.game_map.cut_selected_area();
	});

	$('#btn_delete').on('click',()=>{
		this.game_client.game_core.game_map.erase_selected_area();
	});

	// Tilesets

	for (let i = 0; i < 5; i++) {
		$(`#btn_tileset_${i}`).on('click',()=>{
			this.game_client.game_core.game_map.set_current_tool('tile_brush');
			this.game_client.game_core.game_map.update_tile_brush(['tile_set'],[i]);
			$('.btn-brush').css('background-image', `url(/client/img/GUI/tileset_${i}.png)`);
		});
	}

	$('#rng_brush_size').on('input',()=>{
		let value = parseInt($('#rng_brush_size').val());
		this.game_client.game_core.game_map.update_tile_brush(['brush_size'],[value]);
		this.game_client.game_core.game_map.set_current_tool('tile_brush');
	});

	$(`#btn_brush_square`).parent().on('click',()=>{
		this.game_client.game_core.game_map.set_current_tool('tile_brush');
		this.game_client.game_core.game_map.update_tile_brush(['brush_type'],['square']);
	});

	$(`#btn_brush_smart`).parent().on('click',()=>{
		this.game_client.game_core.game_map.set_current_tool('tile_brush');
		this.game_client.game_core.game_map.update_tile_brush(['brush_type'],['smart']);
	});

	for (let i = 1; i < 5; i++) {
		let i_tri = i;
		if (i === 3) i_tri = 4
		else if (i === 4) i_tri = 3;
		let i_htri = i_tri + 4;
		let i_vtri = i_tri + 12;

		$(`#btn_brush_tri_${i}`).parent().on('click',()=>{
			this.game_client.game_core.game_map.set_current_tool('tile_brush');
			this.game_client.game_core.game_map.update_tile_brush(['brush_type','tile_type'],['tri',i_tri]);
		});

		$(`#btn_brush_htri_${i}`).parent().on('click',()=>{
			this.game_client.game_core.game_map.set_current_tool('tile_brush');
			this.game_client.game_core.game_map.update_tile_brush(['brush_type','tile_type'],['long_tri',i_htri]);
		});

		$(`#btn_brush_vtri_${i}`).parent().on('click',()=>{
			this.game_client.game_core.game_map.set_current_tool('tile_brush');
			this.game_client.game_core.game_map.update_tile_brush(['brush_type','tile_type'],['long_tri',i_vtri]);
		});
	}

	// Editor sidebar right //

	$('#editor_sidebar_right').on('mouseenter',()=>{
		this.handleSidebarEnter('editor_sidebar_right');
	});
	$('#editor_sidebar_right').on('mouseleave',()=>{
		this.handleSidebarLeave('editor_sidebar_right');
	});

	// Properties

	$(`#inp_layer_name`).on('change',()=>{
		let val = $(`#inp_layer_name`).val();
		let layer_data = this.layer_map.get(this.current_layer);
		layer_data.name = val;
		$(`#${layer_data.id} > label`).html(val);
	});

	$(`#inp_layer_scale`).on('change',()=>{
		let val = $(`#inp_layer_scale`).val();
		let layer_data = this.layer_map.get(this.current_layer);
		if (isNaN(val) === true) {
			val = 1;
			$(`#inp_layer_scale`).val(val);
		} else if (val < 0.25) {
			val = 0.25;
			$(`#inp_layer_scale`).val(val);
		}
		layer_data.scale = val;
		this.game_client.game_core.game_map.set_layer_scale(val);
	});

	$(`#inp_layer_offset_x`).on('change',()=>{
		let val = $(`#inp_layer_offset_x`).val();
		let layer_data = this.layer_map.get(this.current_layer);
		if (isNaN(val) === true) {
			val = 0;
			$(`#inp_layer_offset_x`).val(val);
		}
		layer_data.offset.x = val;
		this.game_client.game_core.game_map.set_layer_offset(val,null);
		this.game_client.game_core.game_map.updateLayerSpritePositions();
	});

	$(`#inp_layer_offset_y`).on('change',()=>{
		let val = $(`#inp_layer_offset_y`).val();
		let layer_data = this.layer_map.get(this.current_layer);
		if (isNaN(val) === true) {
			val = 0;
			$(`#inp_layer_offset_y`).val(val);
		}
		layer_data.offset.y = val;
		this.game_client.game_core.game_map.set_layer_offset(null,val);
		this.game_client.game_core.game_map.updateLayerSpritePositions();
	});

	$(`#inp_layer_parallax_x`).on('change',()=>{
		let val = $(`#inp_layer_parallax_x`).val();
		let layer_data = this.layer_map.get(this.current_layer);
		if (isNaN(val) === true) {
			val = 1;
			$(`#inp_layer_parallax_x`).val(val);
		}
		layer_data.parallax.x = val;
		this.game_client.game_core.game_map.set_layer_scroll_speed(val,null);
		this.game_client.game_core.game_map.updateLayerSpritePositions();
		
	});

	$(`#inp_layer_parallax_y`).on('change',()=>{
		let val = $(`#inp_layer_parallax_y`).val();
		let layer_data = this.layer_map.get(this.current_layer);
		if (isNaN(val) === true) {
			val = 1;
			$(`#inp_layer_parallax_y`).val(val);
		}
		layer_data.parallax.y = val;
		this.game_client.game_core.game_map.set_layer_scroll_speed(null,val);
		this.game_client.game_core.game_map.updateLayerSpritePositions();
	});

	$(`#inp_layer_tint`).on('change',()=>{
		let val = $(`#inp_layer_tint`).val();
		let layer_data = this.layer_map.get(this.current_layer);
		layer_data.tint = val;
		this.game_client.game_core.game_map.set_layer_tint(val);
	});

	// Layers

	$(`#btn_layer_add`).on('click',()=>{
		let layer_uid = this.game_client.game_core.game_map.add_new_layer();
		
		let name = 'Layer ' + this.layers_made_count;
		let id = 'li_layer_' + this.layers_made_count;
		let butt_id = 'btn_layer' + this.layers_made_count + 'vis';

		this.current_layer = layer_uid;

		this.layer_map.set(layer_uid,{
			name:name,
			id:id,
			scale:1,
			offset:{x:0,y:0},
			parallax:{x:1,y:1},
			tint:'#FFFFFF',
			visible:true
		});
		
		$('#ul_layers').append(`
		<li id='${id}' class='list-group-item list-group-item-action li-layer' data-uid='${layer_uid}'>
			<label class="col-form-label">${name}</label>
			<button id='${butt_id}' class="btn btn-secondary btn-layer float-right" type="button" ><i class="fas fa-eye"></i></button>
		</li>`);
		$(`#ul_layers`).on('click',`#${id}`,this.handleLayerClick.bind(this));
		$(`#ul_layers`).on('click',`#${butt_id}`,(event)=>{
			event.stopPropagation();

			let layer_data = this.layer_map.get(layer_uid);
			let $btn = $(`#${butt_id}`);

			layer_data.visible = !layer_data.visible;

			if (layer_data.visible === true)
				$btn.html('<i class="fas fa-eye"></i>');
			else
				$btn.html('<i class="fas fa-eye-slash"></i>');

			this.game_client.game_core.game_map.setLayerVisibility(layer_uid,layer_data.visible);
		});
		$(`#${id}`).trigger('click');

		this.layers_made_count++;
		this.setLayerVisButtons();

		this.game_client.game_core.game_map.updateLayerSpritePositions();
	});

	$(`#btn_layer_delete`).on('click',()=>{

	});
	
	$(`#btn_layer_visible`).on('click',()=>{
		this.game_client.game_core.game_map.apply_editor_attribute_to_layers('visible',true);
		this.setLayerVisButtons();
	});

	$(`#btn_layer_alpha`).on('click',()=>{
		this.game_client.game_core.game_map.apply_editor_attribute_to_layers('alpha',true);
	});

	$(`#btn_layer_add`).click();
	this.setLayerContainerHeight();
	
	this.game_client.game_core.game_map.load_base_tile_brush();
};

////////////////////////////////////////////////////////////////
// General Functions

Game_UI.prototype.handleSidebarEnter = function(sidebar_id) {
	if (sidebar_id === 'editor_sidebar_left')
		$(`#${sidebar_id}`).css('left', '0px');
	else if (sidebar_id === 'editor_sidebar_right')
		$(`#${sidebar_id}`).css('right', '0px');
	
	$(`#${sidebar_id}`).css('opacity', '1');
};

Game_UI.prototype.handleSidebarLeave = function(sidebar_id) {	
	if (sidebar_id === 'editor_sidebar_left') {
		if ($('#btn_lock_left').hasClass('active') === false)
			$('#editor_sidebar_left').css('left', '-240px');
		if ($('#btn_alpha_left').hasClass('active') === true)
			$('#editor_sidebar_left').css('opacity', '0.75');
		
	} else if (sidebar_id === 'editor_sidebar_right') {
		if ($('#btn_lock_right').hasClass('active') === false)
			$('#editor_sidebar_right').css('right', '-240px');
		if ($('#btn_alpha_right').hasClass('active') === true)
			$('#editor_sidebar_right').css('opacity', '0.75');
	}
};

Game_UI.prototype.toggle_active_button = function(button_id) {
	var tmp_button = document.getElementById(button_id);
	tmp_button.classList.toggle('active');
};