(function($){
$.fn.ctrl = function(key, callback) {
    if(typeof key != 'object') key = [key];
    callback = callback || function(){ return false; }
    return $(this).keydown(function(e) {
        var ret = true;
        $.each(key,function(i,k){
            if(e.keyCode == k.toUpperCase().charCodeAt(0) && e.ctrlKey) {
                ret = callback(e);
            }
        });
        return ret;
    });
};

$.fn.disableSelection = function() {
    $(window).ctrl(['a','s','c']);
    return this.each(function() {           
        $(this).attr('unselectable', 'on')
               .css({'-moz-user-select':'none',
                    '-o-user-select':'none',
                    '-khtml-user-select':'none',
                    '-webkit-user-select':'none',
                    '-ms-user-select':'none',
                    'user-select':'none'})
               .each(function() {
                    $(this).attr('unselectable','on')
                    .bind('selectstart',function(){ return false; });
               });
    });
};
})(jQuery);

$(':not(input,select,textarea)').disableSelection();

$(document).ready(function() {

	if (!window.FileReader) {
		alert("Sorry, your browser doesn't support the HTML5 FileReader API.\nPlease use the latest version of Chrome, Firefox or Opera.");
	}

	$("#grid").css("width", $("#canvas").css("width"));
	$("#grid").css("height", $("#canvas").css("height"));

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

				if (this.hasChanged("tiles_width") || this.hasChanged("tiles_height")) {
					// reslice the tileset
				}
			});

			this.trigger("change");
		},

		validate: function(attrs) {
			var errors = {};

			for (var i in attrs) {
				if (i == "measurement") {

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

			"tiles_width": "25",
			"tiles_height": "25",
			"tiles_margin": "0",
			"grid_toggle": true
		},

		tileRelative: function(val) {
			var tile_relative = this.get("measurement") == "tiles" ? true : false;
			var mod = val.indexOf("width") != -1 ? "tiles_width" : "tiles_height";
			return tile_relative ? parseInt(this.get(val), 10) * parseInt(this.get(mod), 10) : this.get(val);
		}
	});

	var SettingsView = Backbone.View.extend({

		el: $("#settings"),

		initialize: function() {
			for (var i in this.model.defaults) {
				if ($("input[name=" + i + "]").attr("type") == "checkbox")
				{ $("input[name=" + i + "]").attr("checked", this.model.defaults[i]); }
				else if ($("input[name=" + i + "]").attr("type") == "radio")
				{ $("input[name=" + i + "][value=" + this.model.defaults[i] + "]").attr("checked", true); }
				else
				{ $("input[name=" + i + "]").val(this.model.defaults[i]); }
			}
		},

		events: {
			"keyup input": "handleInput",
			"keyup textarea": "handleInput",
			"change input": "handleInput",
			"change select": "handleInput"
		},

		handleInput: function(e) {
			var elem = e.target;
			var val = "";

			switch(elem.type) {
				case "text": val = elem.value; break;
				case "textarea": val = elem.innerHTML; break;
				case "select": val = elem.value; break;
				case "radio": val = elem.value; break;
				case "checkbox": val = elem.checked; break;
			}

			var check = this.model.set(elem.name, val);

			if (!check) {
				//elem.value = this.model.get(elem.name);
				elem.style.borderColor = "#F00";
			} else {
				elem.style.borderColor = "#555";
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

	var LayerCollection = Backbone.Collection.extend({
		model: Layer
	});

	var LayerCollectionView = Backbone.View.extend({

		el: $("ul#layer_list"),

		initialize: function() {
			this.render();

			$("#layer_list").sortable({ axis: "y", cancel: "input:not([readonly])"});
			$("#layer_list").bind("sortchange", { self: this }, this.sortByIndex);
		},

		events: {
			"click li, li > input": "handleClick"
		},

		render: function() {
			this.collection.each(function(layer) {
				var classNames = layer.get("active") ? "layer active" : "layer";
				// templating is unnecessary
				this.$el.append("<li class='" + classNames + "'><input type='text' value='" + layer.get("name") + "' readonly></li>");
			}, this);
		},

		handleClick: function(e) {

			var li = e.target.tagName.toLowerCase() == "li" ? e.target : $(e.target).parent();
			var name = $(li).find("input").val();
			var layer = null;

			this.collection.each(function(module) {
				if (name == module.get("name"))
				{ layer = module; }
			}, this);

			var x = e.pageX - li.offsetLeft;
			var y = e.pageY - li.offsetTop;

			// Toggle visibillity
			if (x >= 10 && x <= 26 && y >= 10 && y <= 26) {
				$(li).hasClass("hide") ? $(li).removeClass("hide") : $(li).addClass("hide");
				layer.set("visible", $(li).hasClass("hide") ? false : true);
				$("#" + name).toggle();
				
			// Set active
			} else {
				this.collection.each(function(module) { module.set("active", false); });
				layer.set("active", true);

				$("#layer_list > li").removeClass("active");
				$("#layer_list > li > input[value=" + name + "]").parent().addClass("active");
			}
		},

		sortByIndex: function(e, ui) {
			var self = e.data.self;

			var list = $("#layer_list").clone();
			var drag_name = ui ? $(ui.item).children().val() : "";
			$(list).find(".ui-sortable-helper").remove();

			$(list).find("li").each(function(i) {
				var name = $(this).children().val();
				self.collection.each(function(layer) {
					if (layer.get("name") == drag_name) {
						layer.set("index", $(list).find(".ui-sortable-placeholder").index());
						$("#" + layer.get("name")).css("zIndex", $(list).find(".ui-sortable-placeholder").index());
					} else if (layer.get("name") == name) {
						layer.set("index", i);
						$("#" + layer.get("name")).css("zIndex", i);
					}

				}, self);
			});

			self.collection.models.sort(function(a, b) { return a.get("index") - b.get("index"); });
		},

		getActive: function() {
			var active_layer;

			this.collection.each(function(layer) {
				if (layer.get("active") == true) {
					active_layer = layer;
					return false;
				}
			}, this);

			return active_layer;
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

	var TilesetCollection = Backbone.Collection.extend({
		model: Tileset
	});

	var TilesetCollectionView = Backbone.View.extend({

		el: $("#tilesets"),

		initialize: function() {
			this.init();

			// Doesn't seem to work inside events: {}
			$("#dialog_tileset #tileset_add").on("click", { self: this }, this.addTileset);
			$("#dialog_tileset input[name=tileset_file]").on("change", this.cacheFiles);
		},

		events: {
			"change select[name=tileset_select]": "changeTileset",
			"click div > div > img": "selectTile",
			"click #tileset_add_dialog": "dialog_add",
			"click #tileset_remove": "removeTileset"
		},

		init: function() {
			this.collection.each(function(tileset, i) {
				var w = parseInt(tileset.get("src").width, 10);
				var tw = tileset.get("tile_size")[0];

				// Only display the first one
				if (i == 0) {
					for (var i = 0, l = tileset.get("tiles").length; i < l; i++) {
						$("#tilesets > div > div").append(tileset.get("tiles")[i]);
						if (i % Math.floor(w / tw) == tw+3) { $("#tilesets > div > div").append("<br>"); }
					}

					$("#tilesets > div > div").css("width", (w + (Math.floor(w / tw)*2)) + "px");
				}

				$("select[name=tileset_select]").append("<option>" + tileset.get("name") + "</option>");
			}, this);
		},

		changeTileset: function(e) {

			$("#tilesets > div > div").html("");
			if (this.collection.models.length == 0) { return; }

			var id = !e ? this.collection.models.length-1 : $(e.target).find("option:selected").index();
			var w = parseInt(this.collection.models[id].get("src").width, 10);
			var h = parseInt(this.collection.models[id].get("src").height, 10);
			var tw = this.collection.models[id].get("tile_size")[id];

			for (var i = 0, l = this.collection.models[id].get("tiles").length; i < l; i++) {

				var img = this.collection.models[id].get("tiles")[i];
				$("#tilesets > div > div").append(img);

				// TODO find out why +3 is neccessary :D
				if (i % Math.floor(w / tw) == tw+3) { $("#tilesets > div > div").append("<br>"); }
			}

			$("#tilesets > div > div").css("width", (w + (Math.floor(w / tw)*2)) + "px");
			this.$el.find("select[name=tileset_select] option:eq(" + id + ")").attr("selected", true);

			canvas.update_grid();
		},

		selectTile: function(e) {
			canvas.set("selection", $(e.target).clone()[0]);
			$(e.target).siblings().removeClass("selected");
			$(e.target).addClass("selected");
		},

		dialog_add: function() {
			$("#dialog_tileset").dialog();
		},

		cacheFiles: function(e) {
			window.cachedFiles = e.target.files;
		},

		addTileset: function(e) {
			var self = e.data.self;

			var tile_width = parseInt($("#dialog_tileset input[name=tile_width]").val(), 10);
			var tile_height = parseInt($("#dialog_tileset input[name=tile_height]").val(), 10);
			var tile_margin = parseInt($("#dialog_tileset input[name=tile_margin]").val(), 10);
			var tile_alpha = $("#dialog_tileset input[name=tile_alpha]").val();
			tile_alpha = _.map(tile_alpha.split(","), function(num) { return parseInt(num, 10); });

			var file = window.cachedFiles[0];
			var reader = new FileReader();

			reader.onload = function(e) {
				var imgData = e.target.result;
				var index = self.collection.models.length;
				
				self.collection.add([
					{ name: file.name, src: imgData, tile_size: [tile_width, tile_height], margin: tile_margin, alpha: tile_alpha }
				], { at: index });

				self.collection.models[index].set("ready", [function() {
					this.$el.find("select[name=tileset_select]").append("<option>" + file.name + "</option>");
					this.changeTileset();
					$("#dialog_tileset").dialog("close");
				}, self]);
			};

			$("#loading").show();

			if (!file.type.match('image.(png|PNG)')) {
				alert("Wrong file type in \"" + file.name + "\"\nSupported file types: *.png");
				$("#loading").hide();

			} else if (self.$el.find("select[name=tileset_select] option:contains(" + file.name + ")").length >= 1) {
				alert("File \"" + file.name + "\" does already exist.");
				$("#loading").hide();
				
			} else { reader.readAsDataURL(file); }

			$("#dialog_tileset input[name=tileset_file]").val("");
		},

		removeTileset: function() {
			var name = this.$el.find("select[name=tileset_select] option:selected").html();

			this.collection.each(function(tileset) {
				if (tileset.get("name") == name) {
					this.collection.remove(tileset);
					return false;
				}
			}, this);

			this.$el.find("select[name=tileset_select] option:selected").remove();
			this.changeTileset();
		},

		getActive: function() {
			var id = $("#tilesets select[name=tileset_select] option:selected").index();
			return this.collection.models[id];
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
			var tileset_active = tileset_view.getActive();

			var tw = tileset_active.get("tile_size")[0];
			var th = tileset_active.get("tile_size")[1];

			$("#selection").css("left", (tw*this.get("cursor")[0]) + "px");
			$("#selection").css("top", (th*this.get("cursor")[1]) + "px");

			layer_collection.each(function(layer) {
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

			var tileset = tileset_view.getActive();

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

	var CanvasView = Backbone.View.extend({
		el: $("body"),

		initialize: function() {

			$("#container").draggable({ disabled: true });
			$("#viewport").draggable({
				disabled: true,
				//grid: [tilesets.tile.width, tilesets.tile.height],
				drag: this.updateBorderWidth
			});
		},

		events: {
			"mousedown": "handleMouseDown",
			"mouseup": "handleMouseUp",
			"mousemove": "handleMovement",
			"keydown": "handleKeyDown",
			"keyup": "handleKeyUp"
		},

		updateBorderWidth: function() {
			var vw = parseInt($("#mask").css("width"), 10);
			var vh = parseInt($("#mask").css("height"), 10);
			var cw = parseInt($("#canvas").attr("width"), 10);
			var ch = parseInt($("#canvas").attr("height"), 10);
			var ol = parseInt($("#viewport").css("left"), 10);
			var ot = parseInt($("#viewport").css("top"), 10);

			var bl = (ol > 0 ? ol : 0) + "px ";
			var br = (cw - vw - ol) + "px ";
			var bt = (ot > 0 ? ot : 0) + "px ";
			var bb = (ch - vh - ot) + "px ";

			$("#mask").css("borderWidth", bt + br + bb + bl);
		},

		handleMouseDown: function(e) {
			if (e === true || (e && e.which == 1)) {
				window.mousedown = true;

				var x = this.model.get("cursor")[0];
				var y = this.model.get("cursor")[1];

				if (this.model.has("selection")) {

					var tileset = tileset_view.getActive();
					var layer = layer_view.getActive();
					var map = $.extend({}, layer.get("map"));

					if (!map[tileset.get("name")]) { map[tileset.get("name")] = {}; }
					var img = $(this.model.get("selection")).clone()[0];

					// TODO save tiles as css class to prevent copying
					map[tileset.get("name")][x + "_" + y] = img;
					layer.set("map", map);
				}
			}
		},

		handleMouseUp: function(e) {
			if (e.which == 1) {
				window.mousedown = false;
			}
		},

		handleMovement: function(e) {

			var x = e.pageX;
			var y = e.pageY;

			var tileset = tileset_view.getActive();

			// TODO cache tile width/height
			var tw = tileset.get("tile_size")[0];
			var th = tileset.get("tile_size")[1];

			var sx = Math.floor((x-$("#canvas").offset().left) / tw);
			var sy = Math.floor((y-$("#canvas").offset().top) / th);

			this.model.set("cursor", [sx, sy]);

			if (window.mousedown) { this.handleMouseDown(true); }

			this.model.draw();
		},

		handleKeyDown: function(e) {
			if (e.keyCode == 32 && !e.ctrlKey) {
				e.preventDefault();
				$("#container").css("cursor", "move");
				$("#container").css("cursor", "-webkit-grab");
				$("#container").css("cursor", "-moz-grab");
				$("#container").css("cursor", "-o-grab");
				$("#container").draggable("option", "disabled", false);

			} else if (e.keyCode == 32 && e.ctrlKey) {
				e.preventDefault();
				$("#viewport").css("cursor", "move");
				$("#viewport").css("cursor", "-webkit-grab");
				$("#viewport").css("cursor", "-moz-grab");
				$("#viewport").css("cursor", "-o-grab");
				$("#viewport").draggable("option", "disabled", false);
			}
		},

		handleKeyUp: function(e) {
			if (e.keyCode == 32 || e.ctrlKey) {
				$("#container").css("cursor", "default");
				$("#container").draggable("option", "disabled", true);
				$("#viewport").draggable("option", "disabled", true);
			}
		}
	});

	var settings = new Settings;
	var settings_view = new SettingsView({ model: settings });
	//settings.on("error", function(model, error) { console.log(error); });

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

	var preload = window.setInterval(function() {
		var ready = false;

		tileset_collection.each(function(tileset) {
			if (!tileset.has("tiles")) {
				ready = false;
				return false;
			} else {
				ready = true;
			}
		}, tileset_collection);

		if (ready) {
			tileset_view = new TilesetCollectionView({ collection: tileset_collection });

			canvas = new Canvas;
			canvas_view = new CanvasView({ model: canvas });

			window.clearInterval(preload);
		}
	}, 1000);
});	

// Position viewport/canvas
(function() {
	var left = (window.innerWidth / 2) - 250;
	var top = (window.innerHeight / 2) - 300;

	$("<style>#container { top: " + top + "px; left: " + left + "px; }</style>").appendTo("head");
})();