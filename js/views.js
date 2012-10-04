var SettingsView = Backbone.View.extend({

	el: $("#settings"),

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

	// Sets each layers index properly according to li order
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

var TilesetCollectionView = Backbone.View.extend({

	el: $("#tilesets"),

	initialize: function() {
		this.init();
		this.$el.find("#tiles").jScrollPane();

		// Doesn't seem to work inside events: {}
		$("#dialog_tileset #tileset_add").on("click", { self: this }, this.addTileset);
		$("#dialog_tileset input[name=tileset_file]").on("change", this.cacheFiles);
	},

	events: {
		"change select[name=tileset_select]": "changeTileset",
		"click #tileset_add_dialog": "dialog_add",
		"click #tileset_remove": "removeTileset"
	},

	// Loads up default tilesets
	init: function() {
		this.collection.each(function(tileset, i) {
			var w = parseInt(tileset.get("src").width, 10);
			var tw = tileset.get("tile_size")[0];

			// Only display the first one
			if (i == 0) {
				for (var i = 0, l = tileset.get("tiles").length; i < l; i++) {
					$("#tiles_container").append(tileset.get("tiles")[i]);
					if (i % Math.floor(w / tw) == tw+3) { $("#tiles_container").append("<br>"); }
				}

				$("#tiles_container").css("width", (w + (Math.floor(w / tw)*2)) + "px");
			}

			$("select[name=tileset_select]").append("<option>" + tileset.get("name") + "</option>");
		}, this);

		$("#loading").hide();
	},

	changeTileset: function(e) {

		$("#tiles_container").html("");
		if (this.collection.models.length == 0) { return; }

		var id = !e ? this.collection.models.length-1 : $(e.target).find("option:selected").index();
		var w = parseInt(this.collection.models[id].get("src").width, 10);
		var h = parseInt(this.collection.models[id].get("src").height, 10);
		var tw = this.collection.models[id].get("tile_size")[id];

		for (var i = 0, l = this.collection.models[id].get("tiles").length; i < l; i++) {

			var img = this.collection.models[id].get("tiles")[i];
			$("#tiles_container").append(img);

			// TODO find out why +3 is neccessary :D
			if (i % Math.floor(w / tw) == tw+3) { $("#tiles_container").append("<br>"); }
		}

		$("#tiles_container").css("width", (w + (Math.floor(w / tw)*2)) + "px");
		this.$el.find("select[name=tileset_select] option:eq(" + id + ")").attr("selected", true);
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

			// Add to selectbox when the slicing operation is done
			self.collection.models[index].set("ready", [function() {
				this.$el.find("select[name=tileset_select]").append("<option>" + file.name + "</option>");
				this.$el.find("select[name=tileset_select]").val(file.name).change();
				this.changeTileset();
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

	getActive: function() {
		var id = $("#tilesets select[name=tileset_select] option:selected").index();
		return this.collection.models[id];
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
		"keyup": "handleKeyUp",
		"change #tilesets select[name=tileset_select]": "updateGrid",
		"click #tilesets #tiles img": "selectTile"
	},

	updateGrid: function() {
		this.model.update_grid();
	},

	selectTile: function(e) {
		this.model.set("selection", $(e.target).clone()[0]);
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

				var tileset = this.model.get("tileset_view").getActive();
				var layer = this.model.get("layer_view").getActive();
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

		var tileset = this.model.get("tileset_view").getActive();

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