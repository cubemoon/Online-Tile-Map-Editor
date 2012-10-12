var MenuBarModel = Backbone.Model.extend({
	defaults: {
		template: "templates/menubar.tpl"
	},

	applyInputs: function(e) {
		var self = e.data.self.model;
		
		$("#dialog input").each(function(index, input) {
			
			var val = "";

			switch(input.type) {
				case "text": val = input.value; break;
				case "textarea": val = input.innerHTML; break;
				case "select": val = input.value; break;
				case "radio": val = input.value; break;
				case "checkbox": val = input.checked; break;
			}

			var check = self.get("settings").set(input.name, val);

			// Sets red border on error
			if (!check)
			{ input.style.borderColor = "#F00"; }
			else
			{ input.style.borderColor = "#999"; }
		});
	}
});

var SettingsModel = Backbone.Model.extend({
	initialize: function() {

		$("#viewport").css("width", this.tileRelative(this.get("viewport_width")) + "px");
		$("#viewport").css("height", this.tileRelative(this.get("viewport_height")) + "px");
		$("#viewport").css("display", this.get("viewport_toggle") ? "block" : "none");

		$("#canvas").css("width", this.tileRelative(this.get("canvas_width")) + "px");
		$("#canvas").css("height", this.tileRelative(this.get("canvas_height")) + "px");

		$("#grid").css("width", $("#canvas").css("width"));
		$("#grid").css("height", $("#canvas").css("height"));

		$("#canvas_tiles").css("width", $("#canvas").css("width"));
		$("#canvas_tiles").css("height", $("#canvas").css("height"));

		$("#canvas").css("backgroundColor", this.get("canvas_bgcolor"));
		$("#grid").css("display", this.get("grid_toggle") ? "block" : "none");

		// Applies form changes after validation
		this.on("change:viewport_width", function(model, value) { $("#viewport").css("width", this.tileRelative(value) + "px"); });
		this.on("change:viewport_height", function(model, value) { $("#viewport").css("height", this.tileRelative(value) + "px"); });
		this.on("change:viewport_toggle", function(model, value) { $("#viewport").css("display", value ? "block" : "none"); });

		this.on("change:canvas_width", function(model, value) {
			$("#canvas").css("width", this.tileRelative(value) + "px");
			$("#grid").css("width", $("#canvas").css("width"));
		});

		this.on("change:canvas_height", function(model, value) {
			$("#canvas").css("height", this.tileRelative(value) + "px");
			$("#grid").css("height", $("#canvas").css("height"));
		});

		this.on("change:canvas_bgcolor", function(model, value) { $("#canvas").css("backgroundColor", value); });
		this.on("change:grid_toggle", function(model, value) { $("#grid").css("display", value ? "block" : "none"); });

		this.change("*");
	},

	// Automaticly called when changing Settings' attributes through "set()"
	validate: function(attrs) {
		var errors = {};

		for (var i in attrs) {
			if (i == "measurement" || i == "tileset_view") {

				// don't validate..
				
			} else if (i.indexOf("color") != -1) {
				if (!attrs[i].match(/^#?(([a-fA-F0-9]){3}){1,2}$/)) {
					errors[i] = attrs[i];
				}
			} else if (i.indexOf("toggle") != -1) {
				if (typeof attrs[i] != "boolean") {
					errors[i] = attrs[i];
				}
			} else if (i.indexOf("width") != -1 || i.indexOf("height") != -1) {
				if (!attrs[i].match(/^[1-9]([0-9]+)?$/)) {
					errors[i] = attrs[i];
				}
			} else {
				if (!attrs[i].match(/^[0-9]+$/)) {
					errors[i] = attrs[i];
				}
			}
		}

		if (!_.isEmpty(errors)) { return errors; }
	},

	defaults: {
		"measurement": "pixels",
		"viewport_width": "800",
		"viewport_height": "600",
		"viewport_left": "0",
		"viewport_top": "0",
		"viewport_toggle": true,

		"canvas_width": "800",
		"canvas_height": "600",
		"canvas_bgcolor": "#666",

		"grid_toggle": true
	},

	// Calculates values relative to the current tile size
	tileRelative: function(val) {

		if (this.has("tileset_view") && $("#dialog").find("input[name=measurement][value=tiles]").length) {
			var tile_relative = $("#dialog").find("input[name=measurement][value=tiles]")[0].checked ? true : false;
			var tileset_active = this.get("tileset_view").getActive();

			var tw = tileset_active.get("tile_size")[0];
			var th = tileset_active.get("tile_size")[1];
			
			var mod = val.indexOf("width") != -1 ? tw : th;
			return tile_relative ? parseInt(val, 10) * mod : val;
		} else {
			return val;
		}
	}
});

var LayerModel = Backbone.Model.extend({
	defaults: {
		active: false,
		visible: true,
		map: {}
	}
});

var TilesetModel = Backbone.Model.extend({

	// Waits for the source image to be loaded and applies the given settings
	initialize: function() {
		var img = new Image();
		img.src = this.get("src");

		if (!this.has("name"))
		{ this.set("name", img.src.match(/.+\/(.+)/)[1]); }

		var self = this;
		img.onload = function() {
			self.set("src", this);
			if (self.get("alpha") != null) { self.setAlpha(); }
			else { self.ready(); }
		};
	},

	defaults: {
		margin: 0,
		alpha: null,
		ready: false
	},

	// Filters specified color and makes it transparent
	setAlpha: function() {
		var img = this.get("src");
		var w = parseInt(img.width, 10);
		var h = parseInt(img.height, 10);
		var alpha = this.get("alpha");

		var buffer = document.createElement("canvas");
		buffer.width = w;
		buffer.height = h;

		var bfr = buffer.getContext("2d");
		bfr.drawImage(img, 0, 0);

		var imgData = bfr.getImageData(0, 0, w, h);
		var tolerance = 10;

		for (var i = 0, l = imgData.data.length; i < l; i++) {
			var red = i%4 == 0 ? true : false;

			if (red) {
				if (
					imgData.data[i] >= alpha[0]-tolerance && imgData.data[i] <= alpha[0]+tolerance &&
					imgData.data[i+1] >= alpha[1]-tolerance && imgData.data[i+1] <= alpha[1]+tolerance &&
					imgData.data[i+2] >= alpha[2]-tolerance && imgData.data[i+2] <= alpha[2]+tolerance

				) {
					imgData.data[i+3] = 0;
				}
			}
		}

		bfr.clearRect(0, 0, w, h);
		bfr.putImageData(imgData, 0, 0);
		img.src = buffer.toDataURL();

		var self = this;
		img.onload = function() { self.ready(); }
	},

	// Slices the tileset according to tile size and margin
	slice: function() {
		var img = this.get("src");
		var w = parseInt(img.width, 10);
		var h = parseInt(img.height, 10);
		var tw = this.get("tile_size")[0];
		var th = this.get("tile_size")[1];
		var m = this.get("margin");
		var alpha = this.get("alpha");
		var tiles = [];

		var buffer = document.createElement("canvas");
		buffer.width = tw;
		buffer.height = th;

		var bfr = buffer.getContext("2d");

		for (var iy = 0, y = Math.floor(h / th); iy < y; iy++) {
			for (var ix = 0, x = Math.floor(w / tw); ix < x; ix++) {
				
				bfr.clearRect(0, 0, tw, th);

				bfr.drawImage(
					img,
					ix * tw, iy * tw,
					tw, th,
					0, 0,
					tw, th
				);

				var tile = new Image();
				tile.src = buffer.toDataURL();
				tiles.push(tile);
			}
		}

		this.set("tiles", tiles);
	},

	ready: function() {
		this.set("ready", true);

		if (this.has("callback")) {
			var fn = this.get("callback")[0];
			var self = this.get("callback")[1] || this;
			fn.call(self);
		}
	}
});

var CanvasModel = Backbone.Model.extend({

	initialize: function() {
		this.updateGrid();
	},

	defaults: {
		cursor: [0, 0]
	},

	// Updates the tile information of the current layer
	// based on the selection made in LayerCollectionView
	updateMap: function() {
		var cx = this.get("cursor")[0];
		var cy = this.get("cursor")[1];

		if (window.selection) {
			var sx = window.selection[0][0];
			var sy = window.selection[0][1];
			var ex = window.selection[1][0];
			var ey = window.selection[1][1];

			var tileset = this.get("tileset_view").getActive();
			var layer = this.get("layer_view").getActive();
			var map = JSON.parse(JSON.stringify(layer.get("map")));
			if (!map[tileset.get("name")]) { map[tileset.get("name")] = {}; }

			var base_x = sx/window.tileSize[0];
			var base_y = sy/window.tileSize[1];

			var base_width = $("input[name=measurement]").checked ? parseInt($("#canvas").css("width"), 10) : parseInt($("#canvas").css("width"), 10) / window.tileSize[0];
			var base_height = $("input[name=measurement]").checked ? parseInt($("#canvas").css("height"), 10) : parseInt($("#canvas").css("height"), 10) / window.tileSize[1];

			for (var y = base_y, ly = ey/window.tileSize[1]; y <= ly; y++) {
				for (var x = base_x, lx = ex/window.tileSize[0]; x <= lx; x++) {

					var pos_x = cx+(x-base_x);
					var pos_y = cy+(y-base_y);

					if (pos_x < base_width && pos_y < base_height)
					{ map[tileset.get("name")][pos_x+"_"+pos_y] = [x, y]; }
				}
			}

			layer.set("map", map);
		}

		this.draw();
	},

	draw: function() {
		var layer = this.get("layer_view").getActive();
		var map = layer.get("map");

		for (var tileset in map) {

			var cx = this.get("cursor")[0];
			var cy = this.get("cursor")[1];
			
			var sx = window.selection[0][0];
			var sx = window.selection[0][0];
			var sy = window.selection[0][1];
			var ex = window.selection[1][0];
			var ey = window.selection[1][1];

			var base_x = sx/window.tileSize[0];
			var base_y = sy/window.tileSize[1];
			
			for (var y = base_y, ly = ey/window.tileSize[1]; y <= ly; y++) {
				for (var x = base_x, lx = ex/window.tileSize[0]; x <= lx; x++) {

					var pos_x = cx+(x-base_x);
					var pos_y = cy+(y-base_y);

					var coords = pos_x + "_" + pos_y;
					
					if (!map[tileset][coords]) { continue; }

					var xy = map[tileset][coords];
					
					if (!$("#layer_" + layer.get("name") + " ." + coords).length) {
						var div = document.createElement("div");
						$(div).attr("class", coords + " ts_" + $("#tilesets select[name=tileset_select] option:selected").index());
						$(div).css("position", "absolute");
						$(div).css("left", (pos_x * window.tileSize[0]) + "px");
						$(div).css("top", (pos_y * window.tileSize[1]) + "px");
						$(div).css("backgroundPosition", (-(xy[0]*window.tileSize[0])) + "px" + " " + (-(xy[1]*window.tileSize[1])) + "px");
						$("#layer_" + layer.get("name")).append(div);
					} else {
						var old_class = $("#layer_" + layer.get("name") + " ." + coords).attr("class").match(/^ts_[0-9]+$/);
						$("#layer_" + layer.get("name") + " ." + coords).removeClass(old_class)
						$("#layer_" + layer.get("name") + " ." + coords).addClass("ts_" + $("#tilesets select[name=tileset_select] option:selected").index());
						$("#layer_" + layer.get("name") + " ." + coords).css("backgroundPosition", (-(xy[0]*window.tileSize[0])) + "px" + " " + (-(xy[1]*window.tileSize[1])) + "px");
					}
				}
			}
		}
	},

	updateGrid: function(e) {
		var self = e && e.data ? e.data.self : this;
		var buffer = document.createElement("canvas");
		var bfr = buffer.getContext("2d");

		var tileset = self.get("tileset_view").getActive();

		var tw = tileset.get("tile_size")[0];
		var th = tileset.get("tile_size")[1];

		buffer.width = tw;
		buffer.height = th;

		bfr.fillStyle = "rgba(255, 255, 255, 0.2)";
		bfr.fillRect(0, th-1, tw, 1);
		bfr.fillRect(tw-1, 0, 1, th);

		$("#grid").css("backgroundImage", "url(" + buffer.toDataURL() + ")");
		$("#canvas_selection").css("width", tw + "px");
		$("#canvas_selection").css("height", th + "px");
	}
});

var ExportModel = Backbone.Model.extend({

});