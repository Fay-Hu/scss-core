(function(f, define) {
	define(['jquery'], f);
})(function($) {
	/*!
	 * @PACKAGE_NAME_VERSION@ core.js
	 *
	 * Copyright 2016 Huawei Technology, UCD Center
	 * http://interface/smartue
	 */

	/**
	 * jQuery Library
	 *
	 * @external jQuery
	 * @alias $
	 * @see {@link https://jquery.com}
	 */

	/**
	 * @namespace UCD
	 */
	var oldUCD = window.UCD;
	var UCD = window.UCD = {};

	UCD.noConflict = function() {
		window.UCD = oldUCD;
		return UCD;
	};

	/**
	 * 常用键盘事件
	 *
	 * ["BACKSPACE", "COMMA", "DELETE", "DOWN", "END", "ENTER", "ESCAPE", "HOME", "LEFT", "PAGE_DOWN", "PAGE_UP", "PERIOD", "RIGHT", "SPACE", "TAB", "UP"]
	 *
	 * @memberOf UCD
	 */
	UCD.keyCodes = {
		BACKSPACE: 8,
		COMMA: 188,
		DELETE: 46,
		DOWN: 40,
		END: 35,
		ENTER: 13,
		ESCAPE: 27,
		HOME: 36,
		LEFT: 37,
		PAGE_DOWN: 34,
		PAGE_UP: 33,
		PERIOD: 190,
		RIGHT: 39,
		SPACE: 32,
		TAB: 9,
		UP: 38
	};

	/**
	 * 兼容Touch的事件名称 { DOWN, MOVE, UP, getEvent(e) }
	 *
	 * * `DOWN` 在PC上是mousedown，在Mobile上是touchstart
	 * * `MOVE` 在PC上是mousemove，在Mobile上是touchmove
	 * * `UP` 在PC上是mouseup，在Mobile上是touchend
	 * * `getEvent` 可以获取正确的event对象，供调用pageX, pageY
	 *
	 * __注意：这里没有考虑PC带有触摸屏的情况；如果出现这种情况，暂时只能选择一种，可以通过参数`UCD.forceMouse`强制使用PC事件。__
	 *
	 * @memberOf UCD
	 */
	var Events = UCD.Events = {
		isPad: "ontouchstart" in window,

		mouse: {
			DOWN: 'mousedown',
			MOVE: 'mousemove',
			UP: 'mouseup',
			getEvent: function(e) {
				return e;
			}
		},
		touch: {
			DOWN: 'touchstart',
			MOVE: 'touchmove',
			UP: 'touchend',
			getEvent: function(e) {
				var touches = e.originalEvent.touches;
				return touches.length ? touches[0] : e;
			}
		}
	};

	$.extend(Events, Events.isPad && !UCD.forceMouse ? Events.touch : Events.mouse);

	var doc = document,
		nativeSlice = Array.prototype.slice,
		hasOwn = Object.prototype.hasOwnProperty,
		toString = Object.prototype.toString,
		__uuid = 0;

	/**
	 * 唯一id生成
	 *
	 * 支持前缀，转换为number，不同组件之间的唯一（Line.js, Circle.js)唯一
	 */
	var uuid = UCD.uuid = function(prefix) {
		return(prefix || '') + (++__uuid);
	};

	function uaMatch(ua) {
		ua = ua.toLowerCase();

		var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
			/(webkit)[ \/]([\w.]+)/.exec(ua) ||
			/(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
			/(msie) ([\w.]+)/.exec(ua) ||
			ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || [];

		return {
			browser: match[1] || "",
			version: match[2] || "0"
		};
	}

	function checkBrowser(host) {
		var matched = uaMatch(navigator.userAgent),
			browser = {};

		if(matched.browser) {
			browser[matched.browser] = true;
			browser.version = matched.version;
		}

		// Chrome is Webkit, but Webkit is also Safari.
		if(browser.chrome) {
			browser.webkit = true;
		} else if(browser.webkit) {
			browser.safari = true;
		}

		host.browser = browser;
		host[matched.browser] = true;
		return browser;
	}

	UCD.NS_SVG = 'http://www.w3.org/2000/svg';
	UCD.NS_XLINK = 'http://www.w3.org/1999/xlink';

	UCD.support = {};
	UCD.support.SVG = !!doc.createElementNS && !!doc.createElementNS(UCD.NS_SVG, 'svg').createSVGRect;
	UCD.support.SMIL = !!doc.createElementNS && /SVGAnimate/.test(toString.call(doc.createElementNS(UCD.NS_SVG, 'animate')));
	UCD.support.VML = !UCD.support.SVG; // 优先使用SVG，如果实在是不支持SVG就使用VML代替
	checkBrowser(UCD.support);

	UCD.detectFeature = function(p) {
		var b = document.body || document.documentElement,
			s = b.style;

		if(typeof s[p] == 'string') {
			return true;
		}

		// Tests for vendor specific prop
		var v = ['Moz', 'webkit', 'Webkit', 'ms'];
		p = p.charAt(0).toUpperCase() + p.substr(1);

		for(var i = 0; i < v.length; i++) {
			if(typeof s[v[i] + p] == 'string') {
				return true;
			}
		}

		return false;
	};

	UCD.support.csstransition = UCD.detectFeature('transition');

	// Patch jQuery
	$.cleanData = (function(orig) {
		// 对于angular那样的库，已经对jQuery做了一个patch的情况下，我就不应该再次patch了
		if(/triggerHandler\("remove"\);/.test(orig)) {
			return orig;
		}

		// jquery-ui-1.11.4-master\ui\widget.js#28
		return function(elems) {
			var events,
				elem,
				i;
			for(i = 0;
				(elem = elems[i]) != null; i++) {
				try {

					// Only trigger remove when necessary to save time
					events = $._data(elem, "events");
					if(events && events.remove) {
						$(elem).triggerHandler("remove");
					}

					// http://bugs.jquery.com/ticket/8235
				} catch(e) {}
			}
			orig(elems);
		};
	})($.cleanData);

	// TODO: 实现简化extend版本
	function extendObject(target) {
		var input = nativeSlice.call(arguments, 1),
			i = 0,
			len = input.length,
			key,
			value;
		for(; i < len; i++) {
			for(key in input[i]) {
				value = input[i][key];
				if(input[i].hasOwnProperty(key) && value !== undefined) {
					// Clone objects
					if($.isPlainObject(value)) {
						target[key] = $.isPlainObject(target[key]) ?
							extendObject({}, target[key], value) :
							// Don't extend strings, arrays, etc. with objects
							extendObject({}, value);
						// Copy everything else by reference
					} else {
						target[key] = value;
					}
				}
			}
		}
		return target;
	}

	function extendClass(child, parent) {
		for(var key in parent) {
			if(hasOwn.call(parent, key)) {
				child[key] = parent[key];
			}
		}

		function ctor() {
			this.constructor = child;
		}
		ctor.prototype = parent.prototype;
		child.prototype = new ctor(); // jshint ignore:line
		child.__super = parent.prototype;
		return child;
	}

	/**
	 * 获取定义的模块或者组件
	 *
	 * @memberof UCD
	 *
	 * @param  {string} name 模块或者组件名称
	 * @param  {boolean} loose 松依赖
	 * @return {object}      类或者方法
	 */
	UCD.require = function(name, loose) {
		var mod = UCD[name];

		if(!loose && mod == null) {
			throw new Error('module ' + name + ' not found');
		}

		return mod;
	};

	UCD.define = function(name, factory) {
		if(UCD[name] !== undefined) {
			throw new Error('module ' + name + ' is already exists');
		}

		UCD[name] = typeof factory === 'function' ? factory() : factory;

		return UCD[name];
	};

	UCD.define('jquery', function() {
		return $;
	});

	function Initializable() {}
	Initializable.prototype._init = $.noop;

	/**
	 * Define Class (support inherits)
	 *
	 * inspired by https://github.com/jneen/pjs
	 *
	 * @example
	 * ```
	    var Control = UCD.defineClass('Control', function(SUPER, SuperClass) {
	        return {
	          init: function() {
	            SUPER.init.call(this);
	            console.log('Control init');
	          }
	        };
	    });

	    var Input = UCD.defineClass('Input', Control, function(SUPER, SuperClass) {
	        return {
	          init: function() {
	            SUPER.init.call(this);
	            console.log('Input init');
	          }
	        };
	    });

	    var input = new Input();

	 * ```
	 *
	 * @param  {String} name      名称
	 * @param  {Object} [SuperClass = Object] Super class nor null, default is Object
	 * @param  {Function|Object} protoFn   Factory or prototype definitions
	 * @return {Object}            Class
	 */
	UCD.defineClass = function(name, SuperClass, protoFn) {
		if(protoFn === undefined) {
			protoFn = SuperClass;
			SuperClass = Initializable;
		}

		function Ctor() {
			if(!(this instanceof Ctor)) {
				throw new Error('Class instantiation must use new');
			}

			if(this._init) {
				this._init.apply(this, arguments);
			}
		}

		if(typeof SuperClass === 'string') {
			SuperClass = UCD.require(SuperClass);
		}

		var proto = $.isFunction(protoFn) ? protoFn(SuperClass.prototype, SuperClass, Ctor) : protoFn;

		extendClass(Ctor, SuperClass);
		$.extend(Ctor.prototype, proto);
		Ctor.prototype.options = extendObject({}, SuperClass.prototype.options, proto.options);

		UCD[name] = Ctor;

		return Ctor;
	};

	UCD.defineChart = function(name, SuperClass, protoFn) {
		if(protoFn === undefined) {
			protoFn = SuperClass;
			SuperClass = Initializable;
		}

		function Ctor(chart, serieOption, plotOptions, gSeries) {
			if(!(this instanceof Ctor)) {
				throw new Error('Class instantiation must use new');
			}

			this.chart = chart;
			this.options = $.extend({}, Ctor.prototype.options, plotOptions);

			this.serieOption = $.isArray(serieOption) ? serieOption : [serieOption];
			this.gSeries = gSeries;

			this._init();
		}

		var proto = $.isFunction(protoFn) ? protoFn(SuperClass.prototype, SuperClass, Ctor) : protoFn;

		extendClass(Ctor, SuperClass);
		$.extend(Ctor.prototype, proto);
		Ctor.prototype.options = extendObject({}, SuperClass.prototype.options, proto.options);

		UCD.Chart.types[name] = Ctor;

		return Ctor;
	};
	UCD.define('utils', function() {
		var $ = UCD.require('jquery');
		var hasOwn = Object.prototype.hasOwnProperty;
		var RE_FORMAT = /\${(\w+)}/g;

		// When customizing `templateSettings`, if you don't want to define an
		// interpolation, evaluation or escaping regex, we need one that is
		// guaranteed not to match.
		var noMatch = /(.)^/;

		// Certain characters need to be escaped so that they can be put into a
		// string literal.
		var escapes = {
			"'": "'",
			'\\': '\\',
			'\r': 'r',
			'\n': 'n',
			'\u2028': 'u2028',
			'\u2029': 'u2029'
		};

		var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

		var escapeChar = function(match) {
			return '\\' + escapes[match];
		};

		// List of HTML entities for escaping.
		var escapeMap = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#x27;',
			'`': '&#x60;'
		};
		var unescapeMap = {
			'&amp;': '&',
			'&lt;': '<',
			'&gt;': '>',
			'&quot;': '"',
			'&#x27;': "'",
			'&#x60;': '`'
		};

		/**
		 * @namespace UCD.utils
		 */
		var utils = {
			/**
			 * 变量是否已定义
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {object} v 变量
			 * @return {boolean}  true表示已定义
			 */
			defined: function(v) {
				return typeof v !== 'undefined';
			},

			/**
			 * 升序排列
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {number} a 值
			 * @param  {number} b 值
			 * @return {number}   a-b差值
			 */
			ascend: function(a, b) {
				return a - b;
			},

			/**
			 * 降排列
			 *
			 * @memberof UCD.utils
			 * @param  {number} a 值
			 * @param  {number} b 值
			 * @return {number}   b-a差值
			 */
			descend: function(a, b) {
				return b - a;
			},

			/**
			 * 获取对象的keys，类似于Object.keys
			 *
			 *
			 * @memberof UCD.utils
			 * @param  {object} o 对象
			 * @return {string[]} keys
			 */
			keys: function(o) {
				var ret = [];
				for(var key in o) {
					if(hasOwn.call(o, key)) {
						ret.push(key);
					}
				}
				return ret;
			},

			/**
			 * 转换为数组，支持ArrayLike数组
			 *
			 * @memberof UCD.utils
			 * @param  {array}   o  [description]
			 * @param  {Function} cb 转换函数fn(val, key, arr)
			 * @return {array}      [description]
			 */
			toArray: function(o, cb) {
				var ret = [];
				for(var key in o) {
					if(hasOwn.call(o, key)) {
						ret.push(cb(o[key], key, o));
					}
				}
				return ret;
			},

			/**
			 * 透传函数，常用于函数式编程
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {object} v
			 * @return {object}
			 */
			identity: function(v) {
				return v;
			},

			/**
			 * 获取对象某个属性
			 *
			 * @memberof UCD.utils
			 * @param  {string} key 属性名称
			 * @return {function}     [description]
			 */
			property: function(key) {
				return function(obj) {
					return obj[key];
				};
			},

			/**
			 * 格式化模板 ${0},${1},${name} etc.
			 * 不支持嵌套
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {String} fmt   format string
			 * @param  {Object|Array} args arguments
			 * @return {String}       formatted string
			 */
			format: function(fmt, args) {
				return fmt.replace(RE_FORMAT, function($0, $1) {
					var val = args[$1];
					return val === undefined ? $0 : val;
				});
			},

			// By default, Underscore uses ERB-style template delimiters, change the
			// following template settings to use alternative delimiters.
			templateSettings: {
				evaluate: /<%([\s\S]+?)%>/g,
				interpolate: /<%=([\s\S]+?)%>/g,
				escape: /<%-([\s\S]+?)%>/g
			},

			/**
			 * 模板方法，基于underscore的模板实现
			 *
			 * @memberof UCD.utils
			 *
			 * @smartueExample 基本用法 core/examples/utils/basic
			 * @smartueExample settings core/examples/utils/settings
			 * @smartueExample template core/examples/utils/template
			 * @smartueExample template-table core/examples/utils/template-table
			 * @smartueExample template-simple core/examples/utils/template-simple
			 *
			 * @example <caption>使用组件</caption>
			 * // 模板代码
			 * <script type="text/x-tpl" id="tpl-select">
			 *  <select>
			 *    <% for(var i = 0, len = data ? data.length : 0; i < len; i++) { %>
			 *      <option value="<%= data[i].value %>"><%= data[i].label || data[i].value %></option>
			 *    <% } %>
			 *  </select>
			 * </script>
			 * var tplItem = utils.template( $('#tpl-select').html() );
			 * // 使用代码
			 * $('#demoResults').html( tplItem({
			 *  data: [{
			 *    value: 'Apple'
			 *  }, {
			 *    value: 'Google'
			 *  }, {
			 *    value: 'Huawei'
			 *  }]
			 * }) );
			 *
			 * @param  {string} text     模板
			 * @param  {object} settings 模板设置
			 * @return {function}        返回一个render方法，可以生成字符串
			 */
			template: function(text, settings) {
				settings = $.extend({}, utils.templateSettings, settings);

				// Combine delimiters into one regular expression via alternation.
				var matcher = new RegExp([
					(settings.escape || noMatch).source,
					(settings.interpolate || noMatch).source,
					(settings.evaluate || noMatch).source
				].join('|') + '|$', 'g');

				// Compile the template source, escaping string literals appropriately.
				var index = 0;
				var source = "__p+='";
				text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
					source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
					index = offset + match.length;

					if(escape) {
						source += "'+\n((__t=(" + escape + "))==null?'':utils.escape(__t))+\n'";
					} else if(interpolate) {
						source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
					} else if(evaluate) {
						source += "';\n" + evaluate + "\n__p+='";
					}

					// Adobe VMs need the match returned to produce the correct offset.
					return match;
				});
				source += "';\n";

				// If a variable is not specified, place data values in local scope.
				if(!settings.variable) {
					source = 'with(obj||{}){\n' + source + '}\n';
				}

				source = "var __t,__p='',__j=Array.prototype.join," +
					"print=function(){__p+=__j.call(arguments,'');};\n" +
					source + 'return __p;\n';

				var render;
				try {
					/* jshint evil: true */
					render = new Function(settings.variable || 'obj', '_', source);
				} catch(e) {
					e.source = source;
					throw e;
				}

				var template = function(data) {
					return render.call(this, data, utils);
				};

				// Provide the compiled source as a convenience for precompilation.
				var argument = settings.variable || 'obj';
				template.source = 'function(' + argument + '){\n' + source + '}';

				return template;
			},

			/**
			 * 根据范围生成数组
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {Number}   min  最小值
			 * @param  {Number}   max  最大值（不包含）
			 * @param  {Number}   step 步长
			 * @param  {Function} cb   回调 cb(i, min, max, step)
			 * @return {Number[]}      结果
			 */
			range: function(min, max, step, cb) {
				step = step || 1;
				var ret = [],
					val;

				for(var i = min; i < max; i += step) {
					val = cb ? cb(i, min, max, step) : i;
					ret.push(val);
				}

				return ret;
			},

			/**
			 * 索引
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {Array}   a   数组，或者Array-Like数组
			 * @param  {Function} cb  回调 cb(v, i, a)
			 * @param  {Object}   ctx 上下文
			 */
			indexOf: function(a, cb, ctx) {
				ctx = ctx || a;

				for(var i = 0, len = a ? a.length : 0; i < len; i++) {
					if(cb.call(ctx, a[i], i, a)) {
						return i;
					}
				}

				return -1;
			},

			/**
			 * 遍历
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {Array}   a   数组，或者Array-Like数组
			 * @param  {Function} cb  回调 cb(v, i, a)，返回false终止遍历
			 * @param  {Object}   ctx 上下文
			 */
			each: function(a, cb, ctx) {
				ctx = ctx || a;

				for(var i = 0, len = a ? a.length : 0; i < len; i++) {
					if(cb.call(ctx, a[i], i, a) === false) {
						break;
					}
				}

				return a;
			},

			/**
			 * 过滤
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {Array}   a   数组，或者Array-Like数组
			 * @param  {Function} cb  回调 cb(v, i, a)
			 * @param  {Object}   ctx 上下文
			 */
			filter: function(a, cb, ctx) {
				ctx = ctx || a;
				var ret = [];

				for(var i = 0, len = a ? a.length : 0; i < len; i++) {
					if(cb.call(ctx, a[i], i, a)) {
						ret.push(a[i]);
					}
				}

				return ret;
			},

			/**
			 * 映射
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {Array}   a   数组，或者Array-Like数组
			 * @param  {Function} cb  回调 cb(v, i, a)
			 * @param  {Object}   ctx 上下文
			 */
			map: function(a, cb, ctx) {
				ctx = ctx || a;
				var ret = [];

				for(var i = 0, len = a ? a.length : 0; i < len; i++) {
					ret.push(cb.call(ctx, a[i], i, a));
				}

				return ret;
			},

			/**
			 * 生成器
			 *
			 * @memberof UCD.utils
			 *
			 * @param  {Number}   n   数值
			 * @param  {Function} cb  回调 cb(i, n)
			 * @param  {Object}   ctx 上下文
			 */
			generate: function(n, cb, ctx) {
				var ret = [];

				for(var i = 0; i < n; i++) {
					ret.push(cb.call(ctx, i, n));
				}

				return ret;
			}
		};

		// Functions for escaping and unescaping strings to/from HTML interpolation.
		function createEscaper(map) {
			var escaper = function(match) {
				return map[match];
			};
			// Regexes for identifying a key that needs to be escaped
			var source = '(?:' + utils.keys(map).join('|') + ')';
			var testRegexp = new RegExp(source);
			var replaceRegexp = new RegExp(source, 'g');
			return function(string) {
				string = string === null ? '' : '' + string;
				return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
			};
		}

		/**
		 * HTML转义
		 *
		 * @memberof UCD.utils
		 * @param {string} match 字符串
		 */
		utils.escape = createEscaper(escapeMap);

		/**
		 * HTML逆转义
		 *
		 * @memberof UCD.utils
		 * @param {string} match 字符串
		 */
		utils.unescape = createEscaper(unescapeMap);

		return utils;
	});

	/**
	 * 组件工厂，定义组件，类会挂在UCD下面；通过UCD.require('name')获取定义的组件
	 *
	 * @tutorial core-widget
	 * @see UCD.Widget
	 *
	 * @memberof UCD
	 *
	 * @example <caption>定义组件</caption>
	 * UCD.registerWidget('HelloWidget', function(SUPER) {
	 *  var TEMPLATE = '<p><input class="ucd-hellowidget-value" type="text"></p>' +
	 *    '<p>Hello, <span class="ucd-hellowidget-label"></span></p>';
	 *
	 *  return {
	 *    options: {
	 *      value: null,
	 *      placeholder: 'Please input your name',
	 *      change: null
	 *    },
	 *
	 *    _create: function() {
	 *      SUPER._create.call(this);
	 *
	 *      var $el = this.element, opts = this.options;
	 *
	 *      $el.addClass('ucd-hellowidget').html(TEMPLATE);
	 *
	 *      this.$value = $el.find('.ucd-hellowidget-value');
	 *      this.$label = $el.find('.ucd-hellowidget-label');
	 *
	 *      if (opts.placeholder) {
	 *        this.$value.attr('placeholder', opts.placeholder);
	 *      }
	 *
	 *      if (opts.value) {
	 *        this._setValue(opts.value);
	 *      }
	 *
	 *      this._on({
	 *        'input .ucd-hellowidget-value': '_onChange'
	 *      });
	 *    },
	 *
	 *    _destroy: function() {
	 *      this.element.removeClass('ucd-hellowidget').empty();
	 *
	 *      SUPER._destroy.call(this);
	 *    },
	 *
	 *    _onChange: function(e) {
	 *      var val = this.$value.val();
	 *
	 *      this._setValue( val, true );
	 *
	 *      this._trigger('change', e, val);
	 *    },
	 *
	 *    _setValue: function(val, fromUI) {
	 *      this.$label.text( val );
	 *
	 *      if (fromUI !== true) {
	 *        this.$value.val(val);
	 *      }
	 *    },
	 *
	 *    _setOption: function(key, val) {
	 *      SUPER._setOption.call(this, key, val);
	 *
	 *      if (key === 'disabled') {
	 *        this.$value.prop('disabled', val);
	 *      }
	 *    },
	 *
	 *    / **
	 *     * 设置值
	 *     * @param {string} val
	 *     * /
	 *    setValue: function(val) {
	 *      if (val !== undefined && val !== null) {
	 *        this._setValue(val);
	 *      }
	 *    }
	 *  };
	 * });
	 *
	 * @example <caption>自定义基类</caption>
	 * UCD.registerWidget('TitledHelloWidget', 'HelloWidget', function(SUPER) {
	 *  return {
	 *    options: {
	 *      title: null // use value by default
	 *    },
	 *
	 *    _create: function() {
	 *      SUPER._create.call(this);
	 *
	 *      this.$value.attr('title', this.options.title || this.options.value);
	 *    }
	 *  };
	 * });
	 *
	 * @example <caption>演示用法</caption>
	 * var widget = new UCD.HelloWidget('.demo', {
	 *  value: 'UCD',
	 *  change: function(e, val) {
	 *    console.log('change', val);
	 *  }
	 * });
	 *
	 * widget.setValue('UCD Center');
	 *
	 * @example <caption>通过DOM节点获取组件示例</caption>
	 * $('.demo').data('HelloWidget').disable()
	 *
	 * @param  {String} name      名称
	 * @param  {string} [baseName='Widget']      基类，可以在UCD[baseName]取到的类
	 * @param  {function} protoFn 原型定义工厂方法 fn(SUPER, ParentClass, name): prototype
	 * @return {Object}           组件
	 */
	UCD.registerWidget = function(name, baseName, protoFn) {
		if(!protoFn) {
			protoFn = baseName;
			baseName = 'Widget';
		}

		function Ctor(element, options) {
			if(arguments.length) {
				this._createWidget(element, options);
			}
		}

		var WidgetBase = UCD.require(baseName),
			proto = $.isFunction(protoFn) ? protoFn(WidgetBase.prototype, WidgetBase, Ctor) : protoFn;

		extendClass(Ctor, WidgetBase);
		Ctor.version = proto.version;

		$.extend(Ctor.prototype, proto);
		Ctor.prototype.options = UCD.extendObject({}, WidgetBase.prototype.options, proto.options);
		Ctor.prototype.widgetName = name;

		UCD[name] = Ctor;

		return Ctor;
	};

	/**
	 * 类方法打补丁
	 * @param  {Object}   Klass   类
	 * @param  {String} fn      函数名
	 * @param  {Function}   [before]  前置方法
	 * @param  {Function|Boolean}   [after]   后置方法，如果为boolean型表示replace参数
	 * @param  {Boolean}   [replace = false] 是否替换原来的方法
	 */
	UCD.patchFn = function(Klass, fn, before, after, replace) {
		var proto = Klass['prototype'],
			func = proto[fn];

		if(!$.isFunction(after)) {
			replace = after;
			after = null;
		}

		proto[fn] = function() {
			var ret;

			if(before) {
				ret = before.apply(this, arguments);
			}

			if(!replace) {
				ret = func.apply(this, arguments);
			}

			if(after) {
				ret = after.apply(this, arguments);
			}

			return ret;
		};
	};

	// handle multiple browsers for requestAnimationFrame()
	// http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
	// https://github.com/gnarf/jquery-requestAnimationFrame
	UCD.rAF = (function() {
		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			// if all else fails, use setTimeout
			function(callback) {
				return window.setTimeout(callback, 13); // 13 = 1000 / 60; shoot for 60 fps
			};
	})();

	// handle multiple browsers for cancelAnimationFrame()
	UCD.cancelAF = (function() {
		return window.cancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			function(id) {
				window.clearTimeout(id);
			};
	})();

	UCD.uuid = uuid;
	UCD.extendObject = extendObject;

	return UCD;

}, typeof define == 'function' && define.amd ? define : function(_, f) {
	f(jQuery);
});