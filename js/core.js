(function() {
	var left = (window.innerWidth / 2) - 250;
	var top = (window.innerHeight / 2) - 300;

	// Center canvas before initializing
	$("<style>#container { top: " + top + "px; left: " + left + "px; }</style>").appendTo("head");
})();

window.onload = function() {

	$(':not(input,select,textarea,#container)').disableSelection();
	$("#toolbar section > h2").collapsible({
		// custom scrollbars fail if closed
		defaultOpen: 'section1,section2,section3',
		cssClose: 'collapsed',
		cssOpen: '',
		speed: 200,
		animateOpen: function(elem, opts) { elem.next().slideUp(opts.speed, function() { $("#toolbar").jScrollPane(); }); },
		animateClose: function(elem, opts) { elem.next().slideDown(opts.speed, function() { $("#toolbar").jScrollPane(); }); }
	});

	$(window).on("resize", function() { $("#toolbar").jScrollPane(); });
	$("#toolbar").jScrollPane();

	$(document).on("mousedown", function(e) {
		if (e.which == 1)
		{ window.mousedown = true; }
	}).on("mouseup", function(e) {
		if (e.which == 1)
		{ window.mousedown = false; }
	});

	init();
}

function init() {

	var settings = new SettingsModel;

	var menubar = new MenuBarModel({ settings: settings });
	var menubar_view = new MenuBarView({ model: menubar });

	var layer_collection = new LayerCollection([
		{ name: "background", active: true, index: 0 },
		{ name: "world", index: 1 }
	]);

	var layer_view = new LayerCollectionView({ collection: layer_collection });

	var tileset_collection = new TilesetCollection([
		//{ src: "img/tilesets/forest_tiles.png", tile_size: [16, 16], alpha: [255, 0, 255] },
		{ src: "img/tilesets/mage_city.png", tile_size: [32, 32] }
	]);

	var tileset_view, canvas, canvas_view;

	// Wait for default tileset to be sliced
	var preload = window.setInterval(function() {
		var ready = false;

		tileset_collection.each(function(tileset) {
			if (!tileset.get("ready")) {
				ready = false;
				return false;
			} else { ready = true; }
		}, tileset_collection);

		if (ready) {

			tileset_view = new TilesetCollectionView({ collection: tileset_collection });

			// Needed to update tile relative
			settings.set("tileset_view", tileset_view);

			canvas = new CanvasModel({ tileset_view: tileset_view, layer_view: layer_view });
			canvas_view = new CanvasView({ model: canvas });

			window.clearInterval(preload);
		}
	}, 1000);
}