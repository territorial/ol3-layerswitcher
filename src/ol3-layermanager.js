ol.control.LayerManager = function(opt_options) {

	var options = {
		base_type: 'selectbox',
		id: 'lm_id'
	};

	this.options = Object.assign({}, options, opt_options);

	this.mapListeners = [];

	this.panel = document.createElement('ul');
	this.panel.className = 'layer-manager';

	ol.control.Control.call(this, {
		element: this.panel,
		target: this.options.target
	});

};

ol.inherits(ol.control.LayerManager, ol.control.Control);

/**
 * Set the map instance the control is associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.LayerManager.prototype.setMap = function(map) {
	// Clean up listeners associated with the previous map
	for (var i = 0, key; i < this.mapListeners.length; i++) {
		this.getMap().unByKey(this.mapListeners[i]);
	}
	this.mapListeners.length = 0;

	ol.control.Control.prototype.setMap.call(this, map);

	if (map) {
		// listener for layers, that will added
		this.mapListeners.push(map.getLayers().on('add', this.renderPanel, this));
		this.mapListeners.push(map.getLayers().on('remove', this.renderPanel, this));

		// already added layers
		if (map.getLayers().getLength() > 0) {
			this.renderPanel();
		}
	}
};

/**
 * Re-draw the layer panel to represent the current state of the layers.
 */
ol.control.LayerManager.prototype.renderPanel = function() {
	//this.ensureTopVisibleBaseLayerShown_();
	while(this.panel.firstChild) {
		this.panel.removeChild(this.panel.firstChild);
	}
	if (this.options.base_type === 'selectbox') {
		this.renderBaseLayersSelectBox_(this.getMap(), this.panel);
	}
	this.renderLayers_(this.getMap(), this.panel);
};


ol.control.LayerManager.prototype.renderBaseLayersSelectBox_ = function(lyr, elm) {
	var this_ = this,
		lyrs = lyr.getLayers().getArray().slice().reverse(),
		li = document.createElement('li'),
		select = document.createElement('select');
	select.className = 'form-control';
	li.appendChild(select);
	elm.appendChild(li);

	for (var i = 0, l; i < lyrs.length; i++) {
		l = lyrs[i];
		if (l.get('type') === 'base' && l.get('title')) {
			select.appendChild(this.renderSelectLayer_(l, i));
		}
	}

	select.onchange = function(e) {
		var id = e.target.options[e.target.selectedIndex].value;
		this_.setVisible_(this_.getLayerById(id), true);
	};
};

/**
 * Render all layers that are children of a group.
 * @private
 * @param {ol.layer.Group} lyr Group layer whos children will be rendered.
 * @param {Element} elm DOM element that children will be appended to.
 */
ol.control.LayerManager.prototype.renderLayers_ = function(lyr, elm) {
	var this_ = this,
		lyrs = lyr.getLayers().getArray().slice().reverse();
	for (var i = 0, l; i < lyrs.length; i++) {
		l = lyrs[i];
		if (l.get('type') === 'combinedWMS') {
			//elm.appendChild(this.renderLayer_(l, i));
			var source = l.get('combinedSource');
			
			ol.control.LayerManager.forEachRecursiveArray(source, function (item, parent) {
				
				var label = document.createElement('label');
				label.innerHTML = item.title;
				
				var li = document.createElement('li');
				
				if (item.layers) {
					// group
					
					li.className = 'layer-group';
					li.id = 'group-' + item.id;
					
					li.appendChild(label);
					li.appendChild(document.createElement('ul'));
					
				} else {
					
					var input = document.createElement('input');
					input.type = 'checkbox';
					input.id = 'layer-' + item.name;
					var cl = l;
					input.onchange = function(e) {
						this_.setCombinedLayerVisible_(cl);
					};
					
					
					
					label.appendChild(input);
					label.insertBefore(input, label.childNodes[0]);
					li.appendChild(label);
					
				}
				
				if (parent && parent.id) {
					var parent_el = document.getElementById('group-' + parent.id);
					var ul = parent_el.getElementsByTagName("ul")[0];
					ul.appendChild(li);
				} else {
					elm.appendChild(li);
				}
				
			});
			
		}
	}
};

/**
 * Render all layers that are children of a group.
 * @private
 * @param {ol.layer.Base} lyr Layer to be rendered (should have a title property).
 * @param {Number} idx Position in parent group list.
 */
ol.control.LayerManager.prototype.renderLayer_ = function(lyr, idx) {

	var this_ = this;

	var li = document.createElement('li');

	var lyrTitle = lyr.get('title');
	var lyrId = this.uuid();

	var label = document.createElement('label');

	if (lyr.getLayers && !lyr.get('combine')) {

		li.className = 'group';
		label.innerHTML = lyrTitle;
		li.appendChild(label);
		var ul = document.createElement('ul');
		li.appendChild(ul);

		this.renderLayers_(lyr, ul);

	} else {

		li.className = 'layer';
		var input = document.createElement('input');
		if (lyr.get('type') === 'base') {
			input.type = 'radio';
			input.name = 'base';
		} else {
			input.type = 'checkbox';
		}
		input.id = lyrId;
		input.checked = lyr.get('visible');
		input.onchange = function(e) {
			this_.setVisible_(lyr, e.target.checked);
		};
		li.appendChild(input);

		label.htmlFor = lyrId;
		label.innerHTML = lyrTitle;
		li.appendChild(label);

	}

	return li;

};

/**
 * Render all layers that are children of a group.
 * @private
 * @param {ol.layer.Base} lyr Layer to be rendered (should have a title property).
 * @param {Number} idx Position in parent group list.
 */
ol.control.LayerManager.prototype.renderSelectLayer_ = function(lyr, idx) {

	var this_ = this,
		opt = document.createElement('option'),
		value = this_.uuid();
	// set id for layer
	lyr.set(this.options.id, value);
	opt.className = 'layer';
	opt.value = value;

	if (lyr.get('visible')) {
		opt.selected = 'selected';
	}

	opt.innerHTML = lyr.get('title');
	return opt;

};

/**
 * Toggle the visible state of a layer.
 * Takes care of hiding other layers in the same exclusive group if the layer
 * is toggle to visible.
 * @private
 * @param {ol.layer.Base} The layer whos visibility will be toggled.
 */
ol.control.LayerManager.prototype.setVisible_ = function(lyr, visible) {
	lyr.setVisible(visible);
	if (visible && lyr.get('type') === 'base') {
		// Hide all other base layers regardless of grouping
		this.forEachRecursive(this.getMap(), function(l, idx, a) {
			if (l != lyr && l.get('type') === 'base') {
				l.setVisible(false);
			}
		});
	}
};

ol.control.LayerManager.prototype.setCombinedLayerVisible_ = function(lyr) {
	var layernames = lyr.get('combinedLayers').filter(function(item) {
		return document.getElementById('layer-' + item).checked;
	});
	
	var params = lyr.getSource().updateParams({
		'LAYERS': layernames.join(',')
	});
	
	if (layernames.length > 0) {
		lyr.setVisible(true);
	} else {
		lyr.setVisible(false);
	}
};

/**
 * Generate a UUID
 * @returns {String} UUID
 *
 * Adapted from http://stackoverflow.com/a/2117523/526860
 */
ol.control.LayerManager.prototype.uuid = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
};

/**
 * **Static** Call the supplied function for each layer in the passed layer group
 * recursing nested groups.
 * @param {ol.layer.Group} lyr The layer group to start iterating from.
 * @param {Function} fn Callback which will be called for each `ol.layer.Base`
 * found under `lyr`. The signature for `fn` is the same as `ol.Collection#forEach`
 */
ol.control.LayerManager.prototype.forEachRecursive = function(lyr, fn) {
	lyr.getLayers().forEach(function(lyr, idx, a) {
		fn(lyr, idx, a);
		if (lyr.getLayers) {
			ol.control.LayerManager.forEachRecursive(lyr, fn);
		}
	});
};

ol.control.LayerManager.forEachRecursiveArray = function(lyr, fn, parent) {
	lyr.forEach(function(lyr) {
		fn(lyr, parent);
		if (lyr.layers) {
			ol.control.LayerManager.forEachRecursiveArray(lyr.layers, fn, lyr);
		}
	});
};

ol.control.LayerManager.prototype.getLayerById = function(id) {
	var this_ = this,
		layer = null;
	this.forEachRecursive(this.getMap(), function(lyr, idx, a) {
		if (lyr.get(this_.options.id) === id) {
			layer = lyr;
			return;
		}
	}, this);
	return layer;
};