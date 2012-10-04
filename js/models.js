var Settings = Backbone.Model.extend({
	initialize: function() {
		this.on("change", function(e) {

			$("#viewport").css("width", this.tileRelative("viewport_width") + "px");
			$("#viewport").css("height", this.tileRelative("viewport_height") + "px");
			$("#viewport").css("display", this.get("viewport_toggle") ? "block" : "none");

			$("#canvas").css("width", this.tileRelative("canvas_width"), "px");
			$("#canvas").css("height", this.tileRelative("canvas_height"), "px");

			$("#grid").css("width", $("#canvas").css("width"));
			$("#grid").css("height", $("#canvas").css("height"));

			$("#tiles").css("width", $("#canvas").css("width"));
			$("#tiles").css("height", $("#canvas").css("height"));

			$("#canvas").css("backgroundColor", this.get("canvas_bgcolor"));
			$("#grid").css("display", this.get("grid_toggle") ? "block" : "none");
		});

		this.trigger("change");
	},

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

	tileRelative: function(val) {

		if (this.has("tileset_view")) {
			var tile_relative = this.get("measurement") == "tiles" ? true : false;
			var tileset_active = this.get("tileset_view").getActive();

			var tw = tileset_active.get("tile_size")[0];
			var th = tileset_active.get("tile_size")[1];
			
			var mod = val.indexOf("width") != -1 ? tw : th;
			return tile_relative ? parseInt(this.get(val), 10) * mod : this.get(val);
		} else {
			return this.get(val);
		}
	}
});

var Layer = Backbone.Model.extend({
	initialize: function() {
		this.bind("change", function() {
			//view update
		});
	},

	defaults: {
		active: false,
		visible: true,
		map: {}
	}
});

var Tileset = Backbone.Model.extend({

	initialize: function() {
		var img = new Image();
		img.src = this.get("src");

		if (!this.has("name"))
		{ this.set("name", img.src.match(/.+\/(.+)/)[1]); }

		var self = this;
		img.onload = function() {
			self.set("src", img);
			if (self.get("alpha") != null) { self.setAlpha(); }
			else { self.ready(); }
		};
	},

	validate: function() {

	},

	defaults: {
		margin: 0,
		alpha: null
	},

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

	ready: function(callback, bind) {
		this.slice();

		if (this.has("ready")) {
			var data = this.get("ready");
			data[0].call(data[1]);
		}
	}
});

var Canvas = Backbone.Model.extend({
	initialize: function() {
		$("#canvas").append("<div id='selection'></div>");
		$("#canvas").append("<div id='tiles'></div>");

		$("#selection").css("position", "absolute");
		$("#selection").css("zIndex", "99");
		$("#tiles").css("position", "absolute");

		$("#tiles").css("width", $("#canvas").css("width"));
		$("#tiles").css("height", $("#canvas").css("height"));

		this.update_grid();
	},

	defaults: {
		cursor: [0, 0]
	},

	draw: function() {
		var tileset_active = this.get("tileset_view").getActive();

		var tw = tileset_active.get("tile_size")[0];
		var th = tileset_active.get("tile_size")[1];

		$("#selection").css("left", (tw*this.get("cursor")[0]) + "px");
		$("#selection").css("top", (th*this.get("cursor")[1]) + "px");

		this.get("layer_view").collection.each(function(layer) {
			var map = layer.get("map");

			if (!$("#tiles > #" + layer.get("name")).length) {
				var div = document.createElement("div");
				$(div).css("position", "absolute");
				$(div).css("width", "100%");
				$(div).css("height", "100%");
				$(div).attr("id", layer.get("name"));
				$("#tiles").append(div);
			}

			for (var tileset in map) {
				
				var coords = this.get("cursor")[0] + "_" + this.get("cursor")[1];
				var x = this.get("cursor")[0] * tw;
				var y = this.get("cursor")[1] * th;

				if (!$("#tiles > #" + layer.get("name") + " ." + coords).length) {
					var img = map[tileset][coords];
					$(img).addClass(coords);
					$(img).css("position", "absolute");
					$(img).css("left", x + "px");
					$(img).css("top", y + "px");

					$("#tiles #" + layer.get("name")).append(img);
				} else {
					$($("#tiles > #" + layer.get("name") + " ." + coords)[0]).attr("src", $(map[tileset][coords]).attr("src"));
				}
			}
		}, this);

		if (this.has("selection")) {
			$("#selection").css("backgroundColor", "transparent");
			$("#selection").html(this.get("selection"));
		} else {
			$("#selection").html("");
			$("#selection").css("backgroundColor", "rgba(255, 255, 255, 0.2)");
		}
	},

	update_grid: function() {
		var buffer = document.createElement("canvas");
		var bfr = buffer.getContext("2d");

		var tileset = this.get("tileset_view").getActive();

		var tw = tileset.get("tile_size")[0];
		var th = tileset.get("tile_size")[1];

		buffer.width = tw;
		buffer.height = th;

		bfr.fillStyle = "rgba(255, 255, 255, 0.2)";
		bfr.fillRect(0, th-1, tw, 1);
		bfr.fillRect(tw-1, 0, 1, th);

		$("#grid").css("backgroundImage", "url(" + buffer.toDataURL() + ")");
		$("#selection").css("width", tw + "px");
		$("#selection").css("height", th + "px");
	}
});