ol.control.LayerManager = function (settings) {

    //ol.control.LayerSwitcher.call(this, settings);

    var options = {
        base_type: 'selectbox',
        id: 'lm_id'
    };

    this.options = Object.assign({}, options, settings);

    this.mapListeners = [];

    this.panel = document.createElement('div');
    this.panel.className = 'ol-unselectable ol-control layer-switcher layer-manager';

    ol.control.Control.call(this, {
        element: this.panel,
        target: this.options.target
    });
}

ol.inherits(ol.control.LayerManager, ol.control.LayerSwitcher);

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
		this.mapListeners.push(map.getLayers().on('add', function() {
			this.renderPanel();
		}, this));

		// already added layers
		if (map.getLayers().getLength() > 0) {
			this.renderPanel();
		}
	}
};