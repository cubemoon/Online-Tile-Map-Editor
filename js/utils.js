function include(paths, callback) {
	var paths = typeof paths == "object" ? paths : [paths];
	var loadCount = 0;

	for (var i = 0, l = paths.length; i < l; i++) {
		var script = document.createElement("script");
		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", paths[i]);
		document.getElementsByTagName("head")[0].appendChild(script);

		script.onload = function() {
			loadCount++;
			if (loadCount == l) { callback(); }
		};
	}
}

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