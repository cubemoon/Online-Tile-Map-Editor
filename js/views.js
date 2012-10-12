var MenuBarView = Backbone.View.extend({

	initialize: function() {

		// Render the menu bar
		$.get(this.model.get("template") + "?t=" + new Date().getTime(), function(data) {
			$("body").prepend(data);
		});

		// Define event handlers
		$("body").on("click", "#menubar > li", this.toggleMenu);
		$("body").on("hover", "#menubar > li", this.toggleMenu);
		$("body").on("click", "#menubar > li li", { self: this }, this.menuAction);
		$("body").on("mousedown", function(e) {
			if (!$("#menubar").find(e.target).length) {
				$("#menubar > li").removeClass("open");
			}
		});

		$("body").on("keyup", "#dialog input", { self: this }, this.model.applyInputs);
	},

	toggleMenu: function(e) {
		if (e.type == "click" || $(e.target).siblings().hasClass("open")) {

			$(e.target).siblings().removeClass("open");
			$(e.target).hasClass("open") ? $(e.target).removeClass("open") : $(e.target).addClass("open");
		}
	},

	// Opens a dialog or toggles a checkbox value
	menuAction: function(e) {
		var self = e.data.self;

		if ($(e.target).hasClass("checkbox")) {
			$(e.target).hasClass("checked") ? $(e.target).removeClass("checked") : $(e.target).addClass("checked");

			var name = $(e.target).attr("data-setting");
			var value = $(e.target).hasClass("checked");

			self.model.get("settings").set(name, value);

		} else {
			var template = $(e.target).attr("data-template");
			$.get("templates/" + template + ".tpl" + "?t=" + new Date().getTime(), function(data) {

				$("#dialog").attr("title", $(e.target).html());
				$("#dialog").html(data);
				
				$("#dialog input").each(function(index, input) {
					if (["radio", "checkbox"].indexOf(input.type) != -1)
					{ $(input).attr("checked", self.model.get("settings").get(input.name) == input.value); }
					else
					{ $(input).val(self.model.get("settings").get(input.name)); }
				});

				$("#dialog").dialog({
					modal: true,
					width: 220,
					show: "drop",
					hide: "drop"
				});
			});
		}
	}
});

var LayerCollectionView = Backbone.View.extend({

	el: "ul#layer_list",

	initialize: function() {
		this.$el.sortable({ axis: "y" });
		this.$el.bind("sortchange", { self: this }, this.sortByIndex);

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
		"click li": "click"
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

	clearLayer: function(e) {
		var self = e.data.self;
		var target = window.contextTarget;
		var name = $(target).html();

		if (confirm("Remove all tiles from \"" + name + "\" ?")) {

			self.collection.models[$(target).index()].set("map", {});
			$("#layer_" + name).html("");
			$("body #contextmenu").remove();
		}
	},

	removeLayer: function(e) {
		var self = e.data.self;
		var target = window.contextTarget;
		var name = $(target).html();

		if (confirm("Remove \"" + name + "\" ?")) {

			if (self.collection.models.length == 1) {
				alert("Cannot remove last layer!");
				return;
			}

			self.collection.each(function(layer) {
				if (layer.get("name") == name) {
					self.collection.remove(layer);
					return false;
				}
			}, self);

			$(target).remove();
			$("body #contextmenu").remove();
			$("#layer_" + name).remove();

			self.sortByIndex();
			self.collection.models[0].set("active", true);
			self.$el.children(0).addClass("active");
		}
	},

	renameLayer: function(e) {
		var self = e.data.self;
		var target = window.contextTarget;
		var name = $(target).html();
		var new_name = prompt("Enter new name for \"" + name + "\":");

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


		$(target).html(new_name);

		var div = document.createElement("div");
		$(div).attr("class", "layer");
		$(div).attr("id", "layer_" + new_name);
		$(div).html($("#layer_" + name).html());
		$("#canvas_tiles").append(div);
		
		$("#layer_" + name).remove();
		$("body #contextmenu").remove();
	},

	render: function() {
		this.$el.html("");
		this.collection.each(function(layer) {
			var classNames = layer.get("active") ? " class='active'" : "";
			this.$el.append("<li" + classNames + ">" + layer.get("name") + "</li>");

			if (!$("#layer_" + layer.get("name")).length) {
				var div = document.createElement("div");
				$(div).attr("class", "layer");
				$(div).attr("id", "layer_" + layer.get("name"));
				$("#canvas_tiles").append(div);
			}
		}, this);
	},

	click: function(e) {
		var name = $(e.target).html();
		var layer = null;

		this.collection.each(function(module) {
			if (name == module.get("name"))
			{ layer = module; }
		}, this);

		var x = e.pageX - $(e.target).offset().left;
		var y = e.pageY - $(e.target).offset().top;

		// Toggle visibillity
		if (x >= 10 && x <= 26 && y >= 10 && y <= 26) {
			$(e.target).hasClass("hide") ? $(e.target).removeClass("hide") : $(e.target).addClass("hide");
			layer.set("visible", $(e.target).hasClass("hide") ? false : true);
			$("#layer_" + name).toggle();

		// Display layer settings
		} else if (x >= 195 && x <= 204 && y >= 7 && y <= 26 && !$("#contextmenu").length) {
			var self = this;

			$.get("templates/cm_layer.tpl", function(data) {

				$("body").append(data);
				$("body #contextmenu").css("left", e.pageX + "px");
				$("body #contextmenu").css("top", e.pageY + "px");

				window.contextTarget = e.target;

				$("#layer-clear").on("click", { self: self }, self.clearLayer);
				$("#layer-rename").on("click", { self: self }, self.renameLayer);
				$("#layer-remove").on("click", { self: self }, self.removeLayer);
			});

		// Set active
		} else {
			this.collection.each(function(module) { module.set("active", false); });
			layer.set("active", true);

			$("#layer_list > li").removeClass("active");
			$("#layer_list > li:contains(" + name + ")").addClass("active");
		}
	},

	// Sets each layers index properly according to li order
	sortByIndex: function(e, ui) {
		var self = e ? e.data.self : this;

		var list = $("#layer_list").clone();
		var drag_name = ui ? $(ui.item).children().val() : "";
		$(list).find(".ui-sortable-helper").remove();

		$(list).find("li").each(function(i) {
			var name = $(this).html();
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
		$("#dialog_tileset input[name=tileset_file]").on("change", this.cacheFile);
		$("#dialog_tileset input[name=tileset_file]").on("click", this.cacheFile);
		$("#dialog_tileset input[name=tileset_file_overlay]").on("click", this.cacheFile);
	},

	events: {
		"change select[name=tileset_select]": "changeTileset",
		"click #tileset_dialog_opener": "openDialog",
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

	// Creates a css class with the current tileset as the background-image
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

	// TODO let the model handle the actual "add" part
	addTileset: function(e) {
		var self = e.data.self;

		var tile_width = parseInt($("#dialog_tileset input[name=tile_width]").val(), 10);
		var tile_height = parseInt($("#dialog_tileset input[name=tile_height]").val(), 10);
		var tile_margin = parseInt($("#dialog_tileset input[name=tile_margin]").val(), 10);
		var tile_alpha = $("#dialog_tileset input[name=tile_alpha]").val();

		var hex;
		
		// HEX
		if (hex == tile_alpha.match(/^#?(([0-9a-fA-F]{3}){1,2})$/)) {

			hex = hex[1];

			if (hex.length == 3) {
				tile_alpha = [
					parseInt(hex[0]+hex[0], 16),
					parseInt(hex[1]+hex[1], 16),
					parseInt(hex[2]+hex[2], 16)
				];

			} else if (hex.length == 6) {
				tile_alpha = [
					parseInt(hex[0]+hex[1], 16),
					parseInt(hex[2]+hex[3], 16),
					parseInt(hex[5]+hex[6], 16)
				];
			}

		// RGB
		} else if (tile_alpha.match(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])(, ?|$)){3}$/)) {
			tile_alpha = _.map(tile_alpha.split(","), function(num) { return parseInt(num, 10); });

		} else { tile_alpha = null; }

		$("#loading").show();
		
		var name;
		var type;

		if (!window.FileReader) {
			var data = window.cachedFile.match(/.+\/(.+)\.(png|PNG)/);
			name = data[1];
			type = data[2].toLowerCase();

		} else {
			name = window.cachedFile.name;
			type = window.cachedFile.type.split("/")[1];
		}

		if (type != "png") {
			alert("Wrong file type in \"" + name + "\"\nSupported file types: *.png");
			$("#loading").hide();

		} else if (self.$el.find("select[name=tileset_select] option:contains(" + name + ")").length) {
			alert("File \"" + name + "\" does already exist.");
			$("#loading").hide();

		} else {
			function add(e) {
				var imgData = e ? e.target.result : window.cachedFile;
				var index = self.collection.models.length;
				
				self.collection.add([
					{ name: name, src: imgData, tile_size: [tile_width, tile_height], margin: tile_margin, alpha: tile_alpha }
				], { at: index });

				// Add to selectbox when the slicing operation is done
				self.collection.models[index].set("callback", [function() {
					this.$el.find("select[name=tileset_select]").append("<option>" + name + "</option>");
					this.$el.find("select[name=tileset_select]").val(name).change();
					$("#dialog_tileset").dialog("close");
					$("#loading").hide();
				}, self]);
			}

			if (window.FileReader) {
				var reader = new FileReader();
				 reader.readAsDataURL(window.cachedFile);
				 reader.onload = add;

			} else { add(); }
		}
	},

	// TODO let the model handle the actual "remove" part
	removeTileset: function() {
		var name = this.$el.find("select[name=tileset_select] option:selected").html();

		if (confirm("Remove \"" + name + "\" ?\nAll layers will lose the tiles selected from this tileset.")) {
			this.collection.each(function(tileset) {
				if (tileset.get("name") == name) {
					this.collection.remove(tileset);
					return false;
				}
			}, this);

			this.$el.find("select[name=tileset_select] option:selected").remove();
			this.changeTileset();
		}
	},

	changeTileset: function(e) {

		if (this.collection.models.length) {
			var id = !e ? this.collection.models.length-1 : $(e.target).find("option:selected").index();
			var tileset = this.collection.models[id];
			var w = tileset.get("tile_size")[0];
			var h = tileset.get("tile_size")[1];

			window.tileSize = [w, h];

			// Triggered by the add function to prevent
			// re-setting the global tileSize variable
			if (e.isTrigger) { this.addTilesetClass(); }

			$("#tileset_container").css("width", tileset.get("src").width + "px");
			$("#tileset_container").css("height", tileset.get("src").height + "px");
			$("#tileset_container").css("backgroundImage", "url('" + tileset.get("src").src + "')");
			$("select[name=tileset_select] option:eq(" + id + ")").attr("selected", true);

		} else { $("#tileset_container").css("backgroundImage", "none"); }

		$("#canvas_selection").css("backgroundImage", "none");
		this.$el.find("#tileset").jScrollPane();
	},

	select: function(e) {

		var x = Math.floor((e.pageX - $("#tileset_container").offset().left) / window.tileSize[0]) * window.tileSize[0];
		var y = Math.floor((e.pageY - $("#tileset_container").offset().top) / window.tileSize[1]) * window.tileSize[1];

		if (e.type == "mousedown") {

			if (!$("#selector").length)
			{ $("#tileset_container").append("<div id='selector'></div>"); }

			$("#selector").css("left", x + "px");
			$("#selector").css("top", y + "px");
			$("#selector").css("width", window.tileSize[0] + "px");
			$("#selector").css("height", window.tileSize[1] + "px");

			window.selection = [[x, y], []];

		} else if (e.type == "mousemove") {

			if (e.which == 1 && window.selection) {

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
			} else {
				if (!$("#selector").length)
				{ $("#tileset_container").append("<div id='selector'></div>"); }

				$("#selector").css("left", x + "px");
				$("#selector").css("top", y + "px");
				$("#selector").css("width", window.tileSize[0] + "px");
				$("#selector").css("height", window.tileSize[1] + "px");
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
			$("#canvas_selection").css("backgroundImage", $("#tileset_container").css("backgroundImage"));
			$("#canvas_selection").css("backgroundPosition", (-sx) + "px" + " " + (-sy) + "px");
		}
	},

	getActive: function() {
		var id = $("#tilesets select[name=tileset_select] option:selected").index();
		return this.collection.models[id];
	},

	openDialog: function() {
		$("#dialog_tileset").dialog({
			width: "200px",
			show: "drop",
			hide: "drop",
			modal: true
		});
	},

	cacheFile: function(e) {
		if (!window.FileReader) {
			e.preventDefault();
			window.cachedFile = prompt("Your browser doesn't support local file upload.\nPlease insert an image URL below:");
		
		} else if (e.type == "change") {
			$("#dialog_tileset #file_overlay").val(e.target.files[0].name);
			window.cachedFile = e.target.files[0];
		}
	}
});

var CanvasView = Backbone.View.extend({
	el: "#container",

	initialize: function() {
		this.$el.draggable({
			which: 3,

			start: function() {
				$("#container").css("cursor", "move");
				$("#container").css("cursor", "-webkit-grab");
				$("#container").css("cursor", "-moz-grab");
				$("#container").css("cursor", "-o-grab");
			},

			stop: function() {
				$("#container").css("cursor", "default");
			}
		});
		
		//$("#viewport").draggable({ disabled: true, which: 3 });

		// Recenters the canvas when resizing the browser window
		$(window).on("resize", { self: this }, function(e) {
			var self = e.data.self;
			var left = (window.innerWidth / 2) - 250;
			var top = (window.innerHeight / 2) - 300;
			self.$el.css("left", left + "px");
			self.$el.css("top", top + "px");
		});

		$("#tilesets select[name=tileset_select]").on("change", { self: this.model }, this.model.updateGrid);
	},

	events: {
		"mousedown": "updateCursor",
		"mousemove": "updateCursor",
		"mouseout": "toggleSelection",
		"mouseover": "toggleSelection",
		"mousewheel": "zoom",
		"dragstart *": "preventDrag"
	},

	updateCursor: function(e) {
		if (!this.model.get("tileset_view").collection.length) { return; }

		var x = Math.floor((e.pageX-$("#canvas").offset().left) / window.tileSize[0]);
		var y = Math.floor((e.pageY-$("#canvas").offset().top) / window.tileSize[1]);

		this.model.set("cursor", [x, y]);
		$("#canvas_selection").css("left", (x*window.tileSize[0]) + "px");
		$("#canvas_selection").css("top", (y*window.tileSize[1]) + "px");

		if ((e.type == "mousedown" && e.which == 1) || window.mousedown) {
			this.model.updateMap();
		}
	},

	toggleSelection: function(e) {
		var value = e.type == "mouseover" ? "1" : "0.5";
		$("#canvas_selection").css("opacity", value);
	},

	zoom: function(e, delta) {
		var zoom = window.zoom || 1;
		zoom += delta === 1 ? 0.3 : -0.3;

		if (zoom >= 0.1 && zoom <= 2) {
			$("#container").css("-moz-transform", "scale(" + zoom + ")");
			$("#container").css("-webkit-transform", "scale(" + zoom + ")");
			$("#container").css("-ms-transform", "scale(" + zoom + ")");
			$("#container").css("-o-transform", "scale(" + zoom + ")");
			window.zoom = zoom;
		}
	},

	preventDrag: function(e) { e.preventDefault(); }
});

var ExportView = Backbone.View.extend({
	el: "#"
});