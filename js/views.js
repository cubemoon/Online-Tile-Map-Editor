var SettingsView = Backbone.View.extend({

	el: "#settings",

	initialize: function() {

		// Sets all input elements with default values
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

		// Give red border on error

		if (!check)
		{ elem.style.borderColor = "#F00"; }
		else
		{ elem.style.borderColor = "#555"; }
	}
});

var LayerCollectionView = Backbone.View.extend({

	el: "ul#layer_list",

	initialize: function() {
		$("#layer_list").sortable({ axis: "y", cancel: "input:not([readonly])"});
		$("#layer_list").bind("sortchange", { self: this }, this.sortByIndex);

		$("body").on("mousedown", function(e) {
			if ($(e.target).parent().attr("id") != "contextmenu") {
				if ($("body #contextmenu").length)
				{ $("body #contextmenu").remove(); }
			}
		});

		$("#layer-add").on("click", { self: this }, this.addLayer);
		this.render();
	},

	events: {
		"click li, li > input": "click"
	},

	addLayer: function(e) {
		var self = e.data.self;
		var name = prompt("Enter layer name:");

		if (!name || !name.match(/^[a-zA-Z_-][a-zA-Z0-9_-]{2,}$/)) {
			if (name) { alert("Name invalid or too short!"); }
			return;
		}

		self.collection.add({ name: name, index: self.collection.models.length });
		self.render();
	},

	removeLayer: function(e) {
		var self = e.data.self;
		var target = window.contextTarget;
		var input = target.tagName.toLowerCase() == "input" ? target : $(target).children();
		var name = $(input).val();

		self.collection.each(function(layer) {
			if (layer.get("name") == name) {
				self.collection.remove(layer);
				return false;
			}
		}, self);

		$(input).parent().remove();
		$("body #contextmenu").remove();
		$("#layer_" + name).remove();

		self.sortByIndex();
	},

	renameLayer: function(e) {
		var self = e.data.self;
		var target = window.contextTarget;
		var input = target.tagName.toLowerCase() == "input" ? target : $(target).children();
		var name = $(input).val();
		var new_name = prompt("Enter new name (min 3 chars)");

		if (!new_name || new_name.length < 3) {
			if (new_name) { alert("Name too short!"); }
			return;
		}

		self.collection.each(function(layer) {
			if (layer.get("name") == name) {
				layer.set("name", new_name);
				return false;
			}
		}, self);

		$(input).val(new_name);
		$("body #contextmenu").remove();
	},

	render: function() {
		this.$el.html("");
		this.collection.each(function(layer) {
			var classNames = layer.get("active") ? " class='active'" : "";
			this.$el.append("<li" + classNames + "><input type='text' value='" + layer.get("name") + "' readonly></li>");

			if (!$("#layer_" + layer.get("name")).length) {
				var div = document.createElement("div");
				$(div).attr("class", "layer");
				$(div).attr("id", "layer_" + layer.get("name"));
				$("#canvas_tiles").append(div);
			}
		}, this);
	},

	click: function(e) {

		var li = e.target.tagName.toLowerCase() == "li" ? e.target : $(e.target).parent();
		var name = $(li).find("input").val();
		var layer = null;

		this.collection.each(function(module) {
			if (name == module.get("name"))
			{ layer = module; }
		}, this);

		var x = e.pageX - $(li).offset().left;
		var y = e.pageY - $(li).offset().top;

		// Toggle visibillity
		if (x >= 10 && x <= 26 && y >= 10 && y <= 26) {
			$(li).hasClass("hide") ? $(li).removeClass("hide") : $(li).addClass("hide");
			layer.set("visible", $(li).hasClass("hide") ? false : true);
			$("#layer_" + name).toggle();

		// Display layer settings
		} else if (x >= 195 && x <= 204 && y >= 7 && y <= 26 && !$("#contextmenu").length) {
			var template = _.template($("#cm_layer").html());

			$("body").append(template);
			$("body #contextmenu").css("left", e.pageX + "px");
			$("body #contextmenu").css("top", e.pageY + "px");

			window.contextTarget = e.target;

			$("#layer-remove").on("click", { self: this }, this.removeLayer);
			$("#layer-rename").on("click", { self: this }, this.renameLayer);

		// Set active
		} else {
			this.collection.each(function(module) { module.set("active", false); });
			layer.set("active", true);

			$("#layer_list > li").removeClass("active");
			$("#layer_list > li > input[value=" + name + "]").parent().addClass("active");
		}
	},

	// Sets each layers index properly according to li order
	sortByIndex: function(e, ui) {
		var self = e ? e.data.self : this;

		var list = $("#layer_list").clone();
		var drag_name = ui ? $(ui.item).children().val() : "";
		$(list).find(".ui-sortable-helper").remove();

		$(list).find("li").each(function(i) {
			var name = $(this).children().val();
			self.collection.each(function(layer) {
				if (layer.get("name") == drag_name) {
					layer.set("index", $(list).find(".ui-sortable-placeholder").index());
					$("#layer_" + layer.get("name")).css("zIndex", $(list).find(".ui-sortable-placeholder").index());
				} else if (layer.get("name") == name) {
					layer.set("index", i);
					$("#layer_" + layer.get("name")).css("zIndex", i);
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

var TilesetCollectionView = Backbone.View.extend({

	el: "#tilesets",

	initialize: function() {
		this.init();
		this.$el.find("#tileset").jScrollPane();

		// Doesn't seem to work inside events: {}
		$("#dialog_tileset #tileset_add").on("click", { self: this }, this.addTileset);
		$("#dialog_tileset input[name=tileset_file]").on("change", this.cacheFiles);
	},

	events: {
		"change select[name=tileset_select]": "changeTileset",
		"click #tileset_add_dialog": "dialog_add",
		"click #tileset_remove": "removeTileset",
		"mousedown #tileset_container": "select",
		"mouseup #tileset_container": "select",
		"mousemove #tileset_container": "select"
	},

	// Loads up default tilesets
	init: function() {
		var tileset = this.collection.models[0];
		var w = tileset.get("tile_size")[0];
		var h = tileset.get("tile_size")[1];
		window.tileSize = [w, h];

		$("#tileset_container").css("width", tileset.get("src").width + "px");
		$("#tileset_container").css("height", tileset.get("src").height + "px");
		$("#tileset_container").css("backgroundImage", "url('" + tileset.get("src").src + "')");
		$("select[name=tileset_select]").append("<option>" + tileset.get("name") + "</option>");
		this.addTilesetClass();
		$("#loading").hide();
	},

	addTilesetClass: function() {
		var id = this.collection.models.length-1;
		var style = document.createElement("style");
		$(style).attr("id", "tsc_" + id);

		var img = this.collection.models[id].get("src").src;
		var css = ".ts_" + id + " {\n";
		css += "width: " + window.tileSize[0] + "px;\n";
		css += "height: " + window.tileSize[1] + "px;\n";
		css += "background-image: url('" + img + "');\n";
		css += "}";
		$(style).append(css);
		$("head").append(style);
	},

	changeTileset: function(e) {

		if (this.collection.models.length) {
			var id = !e ? this.collection.models.length-1 : $(e.target).find("option:selected").index();
			var tileset = this.collection.models[id];
			var w = tileset.get("tile_size")[0];
			var h = tileset.get("tile_size")[1];

			window.tileSize = [w, h];
			if (e.isTrigger) { this.addTilesetClass(); }

			$("#tileset_container").css("width", tileset.get("src").width + "px");
			$("#tileset_container").css("height", tileset.get("src").height + "px");
			$("#tileset_container").css("backgroundImage", "url('" + tileset.get("src").src + "')");
			$("select[name=tileset_select] option:eq(" + id + ")").attr("selected", true);

		} else { $("#tileset_container").css("backgroundImage", "none"); }

		$("#canvas_selection").css("backgroundImage", "none");
		this.$el.find("#tileset").jScrollPane();
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

			// Add to selectbox when the slicing operation is done
			self.collection.models[index].set("ready", [function() {
				this.$el.find("select[name=tileset_select]").append("<option>" + file.name + "</option>");
				this.$el.find("select[name=tileset_select]").val(file.name).change();
				$("#dialog_tileset").dialog("close");
				$("#loading").hide();
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

	select: function(e) {

		var x = Math.floor((e.pageX - $(e.target).offset().left) / window.tileSize[0]) * window.tileSize[0];
		var y = Math.floor((e.pageY - $(e.target).offset().top) / window.tileSize[1]) * window.tileSize[1];

		if (e.type == "mousedown") {

			$("#tileset_container").append("<div id='selector'></div>"); 
			$("#selector").css("left", x + "px");
			$("#selector").css("top", y + "px");
			$("#selector").css("width", window.tileSize[0] + "px");
			$("#selector").css("height", window.tileSize[1] + "px");

			window.selection = [[x, y], []];

		} else if (e.type == "mousemove"&& window.selection) {

			var sx = window.selection[0][0];
			var sy = window.selection[0][1];

			var w = Math.abs((x-sx) + window.tileSize[0]);
			var h = Math.abs((y-sy) + window.tileSize[1]);

			if (sx <= x) {
				$("#selector").css("left", sx + "px");
				$("#selector").css("width", w + "px");
			} else {
				$("#selector").css("left", x + "px");
				$("#selector").css("width", (w + window.tileSize[0]*2)+ "px");
			}

			if (sy <= y) {
				$("#selector").css("top", sy + "px");
				$("#selector").css("height", h + "px");
			} else {
				$("#selector").css("top", y + "px");
				$("#selector").css("height", (h + window.tileSize[1]*2)+ "px");
			}

		} else if (e.type == "mouseup") {
			$("#tileset_container #selector").remove();

			var s = window.selection;

			s[1][0] = x;
			s[1][1] = y;

			var sx = s[0][0] < s[1][0] ? s[0][0] : s[1][0];
			var sy = s[0][1] < s[1][1] ? s[0][1] : s[1][1];
			var ex = s[0][0] > s[1][0] ? s[0][0] : s[1][0];
			var ey = s[0][1] > s[1][1] ? s[0][1] : s[1][1];

			window.selection = [[sx, sy], [ex, ey]];

			var w = (ex-sx) + window.tileSize[0];
			var h = (ey-sy) + window.tileSize[1];

			var id = $("select[name=tileset_select] option:selected").index();

			$("#canvas_selection").css("width", w + "px");
			$("#canvas_selection").css("height", h + "px");
			$("#canvas_selection").css("backgroundImage", $(e.target).css("backgroundImage"));
			$("#canvas_selection").css("backgroundPosition", (-sx) + "px" + " " + (-sy) + "px");
		}
	},

	getActive: function() {
		var id = $("#tilesets select[name=tileset_select] option:selected").index();
		return this.collection.models[id];
	},

	dialog_add: function() { $("#dialog_tileset").dialog({ width: "200px" }); },

	cacheFiles: function(e) {
		if (e.target.files[0])
		{ $("#dialog_tileset #file_overlay").val(e.target.files[0].name); }

		window.cachedFiles = e.target.files;
	}
});

var CanvasView = Backbone.View.extend({
	el: "body",

	initialize: function() {
		$("#container").draggable({ disabled: true });
		$("#viewport").draggable({ disabled: true });
	},

	events: {
		"mousedown #viewport": "updateMap",
		"mouseup": "mouseup",
		"mousemove #viewport": "updateCursor",
		"keydown": "keydown",
		"keyup": "keyup",
		"change #tilesets select[name=tileset_select]": "updateGrid"
	},

	updateMap: function(e) {
		if (e.which == 1 && !window.drag && this.model.get("layer_view").collection.length ) {
			window.mousedown = true;

			var cx = this.model.get("cursor")[0];
			var cy = this.model.get("cursor")[1];

			if (window.selection) {

				var sx = window.selection[0][0];
				var sy = window.selection[0][1];
				var ex = window.selection[1][0];
				var ey = window.selection[1][1];

				var tileset = this.model.get("tileset_view").getActive();
				var layer = this.model.get("layer_view").getActive();
				var map = $.extend({}, layer.get("map"));
				if (!map[tileset.get("name")]) { map[tileset.get("name")] = {}; }

				var base_x = sx/window.tileSize[0];
				var base_y = sy/window.tileSize[1];
				
				for (var y = base_y, ly = ey/window.tileSize[1]; y <= ly; y++) {
					for (var x = base_x, lx = ex/window.tileSize[0]; x <= lx; x++) {

						var pos_x = cx+(x-base_x);
						var pos_y = cy+(y-base_y);

						map[tileset.get("name")][pos_x+"_"+pos_y] = [x, y];
					}
				}

				layer.set("map", map);
			}

			this.model.draw();
		}
	},

	mouseup: function(e) { if (e.which == 1) { window.mousedown = false; } },

	updateCursor: function(e) {

		if (!this.model.get("tileset_view").collection.length) { return; }

		var x = Math.floor((e.pageX-$("#canvas").offset().left) / window.tileSize[0]);
		var y = Math.floor((e.pageY-$("#canvas").offset().top) / window.tileSize[1]);

		this.model.set("cursor", [x, y]);
		$("#canvas_selection").css("left", (x*window.tileSize[0]) + "px");
		$("#canvas_selection").css("top", (y*window.tileSize[1]) + "px");

		if (window.mousedown) { this.updateMap(e); }
	},

	keydown: function(e) {
		if (e.keyCode == 32 && !e.ctrlKey) {
			e.preventDefault();
			$("#container").css("cursor", "move");
			$("#container").css("cursor", "-webkit-grab");
			$("#container").css("cursor", "-moz-grab");
			$("#container").css("cursor", "-o-grab");
			$("#container").draggable("option", "disabled", false);
			window.drag = true;

		} else if (e.keyCode == 32 && e.ctrlKey) {
			e.preventDefault();
			$("#viewport").css("cursor", "move");
			$("#viewport").css("cursor", "-webkit-grab");
			$("#viewport").css("cursor", "-moz-grab");
			$("#viewport").css("cursor", "-o-grab");
			$("#viewport").draggable("option", "disabled", false);
			window.drag = true;
		}
	},

	keyup: function(e) {
		if (e.keyCode == 32) {
			window.drag = false;
			$("#container").css("cursor", "default");
			$("#container").draggable("option", "disabled", true);
			$("#viewport").draggable("option", "disabled", true);
		}
	},

	updateGrid: function() { this.model.update_grid(); }
});