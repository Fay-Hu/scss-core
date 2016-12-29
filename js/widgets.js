
(function(f, define){ define(['jquery', 'UCD'], f);})(function($, UCD){

/**
 * 基类组件
 *
 * @see UCD.registerWidget
 *
 * @class Widget
 * @memberof UCD
 *
 * @tutorial core-widget
 * @smartueExample 基本用法 widgets/widget/examples/basic
 *
 * @param {Object} container    组件容器
 * @param {Object} options      选项
 * @param {Object} [options.disabled=false]      是否禁用
 * @param {Function} [options.create=null] 创建后回调 fn(e, instance)
 */
UCD.Widget = function( /*element, options*/ ) {};

/** @lends UCD.Widget.prototype */
UCD.Widget.prototype = {
  widgetName: "widget",
  defaultElement: "<div>",

  options: {
    disabled: false,

    // callbacks
    create: null
  },

  _createWidget: function(element, options) {
    if ($.isPlainObject(element)) {
      options = element;
      element = null;
    }
    element = $(element || this.defaultElement)[0];
    this.element = $(element);
    this.uuid = UCD.uuid();
    this.eventNamespace = "." + this.widgetName + this.uuid;

    this.bindings = $();

    if (element !== this) {
      $.data(element, this.widgetName, this);
      this._on(true, this.element, {
        remove: function(event) {
          if (event.target === element) {
            this.destroy();
          }
        }
      });
      this.document = $(element.style ?
        // element within the document
        element.ownerDocument :
        // element is window or document
        element.document || element);
      this.window = $(this.document[0].defaultView || this.document[0].parentWindow);
    }

    this.options = UCD.extendObject({},
      this.options,
      this._getCreateOptions(),
      options);

    this._create();
    this._trigger("create", null, this._getCreateEventData());

    this._init();
  },

  /**
   * _create的时候新扩展的options参数
   *
   * @abstract
   * @private
   * @return {object}
   */
  _getCreateOptions: $.noop,

  /**
   * _create事件的数据
   *
   * @abstract
   * @private
   * @return {object} 默认返回this
   */
  _getCreateEventData: function() {
    return this;
  },

  /**
   * 组件创建逻辑，主要是初始化组件，必须由子类实现
   * 为了实现继承关系，子类必须先`SUPER._create.call(this)`
   *
   * @abstract
   * @private
   */
  _create: $.noop,

  /**
   * 组件create完成后回调，子类可以选择实现，主要用于初始化组件
   *
   * @abstract
   * @private
   */
  _init: $.noop,

  /**
   * 销毁，组件能够在DOM被remove的时候自动的调用，用户无需手动调用来销毁
   */
  destroy: function() {
    this._destroy();
    // we can probably remove the unbind calls in 2.0
    // all event bindings should go through this._on()
    this.element
      .unbind(this.eventNamespace)
      .removeData(this.widgetName);
    this.widget()
      .unbind(this.eventNamespace);

    // clean up events and states
    this.bindings.unbind(this.eventNamespace);
  },

  /**
   * 子类调用_destroy实现析构逻辑。一般是将组件恢复到创建前的状态
   *
   * @abstract
   * @private
   */
  _destroy: $.noop,

  /**
   * 组件容器
   * @return {jQuery} 组件容器
   */
  widget: function() {
    return this.element;
  },

  /**
   * 获取或者设置参数，支持对象参数
   *
   * @example
   * widget.option('value', 100);
   * widget.option({
   *  value: 100
   * });
   *
   * @param  {String} key   键
   * @param  {Object} value 值
   * @return {Object}       this或者key对应的值
   */
  option: function(key, value) {
    if ($.isPlainObject(key)) {
      this._setOptions(key);
    } else {
      if (value === undefined) {
        return this.options[key];
      }

      this._setOption(key, value);
    }

    return this;
  },

  _setOptions: function(options) {
    var key;

    for (key in options) {
      this._setOption(key, options[key]);
    }

    return this;
  },

  /**
   * 子类实现参数变化后的回调，一般是刷新组件
   *
   * @abstract
   * @private
   *
   * @param  {String} key   键
   * @param  {Object} value 值
   */
  _setOption: function(key, value) {
    this.options[key] = value;

    if (key === "disabled") {
      // TODO: ucd-disabled在容器节点上，这样重写样式的时候可能不是很方便
      this.widget().toggleClass('ucd-disabled', !!value);
    }

    return this;
  },

  /**
   * 是否禁用
   * @param  {Boolean} flag 为true表示禁用
   */
  disable: function(flag) {
    this.option('disabled', flag !== false);
  },

  /**
   * 事件绑定，默认绑定在容器节点上，可以通过声明式的方式绑定事件，默认采用代理绑定事件，
   * 这里会自动将事件处理函数的上下文绑定为组件实例this，也因此只能通过e.target获得当前事件的target。
   * 默认会给每个事件加上命名空间，便于解绑事件，也避免事件污染。
   * 事件处理函数可以是组件的成员方法名称，也可以是普通的事件处理函数。
   * 这里还全局处理了disabled状态，默认会根据options中的disabled来判断事件是否要处理。
   *
   * 组件所有的事件都应该使用_on来绑定，这样组件才能在销毁的时候自动的解绑事件。
   * 如果不是使用_on绑定的事件，必须在_destroy回调中自己解绑事件。
   *
   * @private
   *
   * @example
   * // 默认绑定在element上
   * this._on({
   *  'click .item': '_onItemClicked'
   * });
   *
   * // 还可以绑定在指定节点上
   * this._on($items, {
   *  'click .item': '_onItemClicked'
   * });
   *
   * @param  {boolean} [suppressDisabledCheck=false] 是否检查disabled状态
   * @param  {jquery} [element=this.element]               节点
   * @param  {object} handlers              声明式事件处理函数 { event: handler }
   */
  _on: function(suppressDisabledCheck, element, handlers) {
    var delegateElement,
      instance = this;

    // no suppressDisabledCheck flag, shuffle arguments
    if (typeof suppressDisabledCheck !== "boolean") {
      handlers = element;
      element = suppressDisabledCheck;
      suppressDisabledCheck = false;
    }

    // no element argument, shuffle and use this.element
    if (!handlers) {
      handlers = element;
      element = this.element;
      delegateElement = this.widget();
    } else {
      element = delegateElement = $(element);
      this.bindings = this.bindings.add(element);
    }

    $.each(handlers, function(event, handler) {
      function handlerProxy() {
        // allow widgets to customize the disabled handling
        // - disabled as an array instead of boolean
        // - disabled class as method for disabling individual parts
        if (!suppressDisabledCheck &&
          (instance.options.disabled === true ||
          $(this).hasClass("ucd-disabled"))) {
          return false;
        }
        return (typeof handler === "string" ? instance[handler] : handler)
          .apply(instance, arguments);
      }

      // copy the guid so direct unbinding works
      if (typeof handler !== "string") {
        handlerProxy.guid = handler.guid = handler.guid || handlerProxy.guid || $.guid++;
      }

      var match = event.match(/^([\w:-]*)\s*(.*)$/),
        eventName = match[1] + instance.eventNamespace,
        selector = match[2];
      if (selector) {
        delegateElement.delegate(selector, eventName, handlerProxy);
      } else {
        element.bind(eventName, handlerProxy);
      }
    });
  },

  /**
   * 解绑事件
   *
   * @private
   *
   * @param  {jquery} element   节点
   * @param  {string} eventName 事件名称，支持空格分离的多个事件
   */
  _off: function(element, eventName) {
    eventName = (eventName || "").split(" ").join(this.eventNamespace + " ") +
    this.eventNamespace;
    element.unbind(eventName).undelegate(eventName);

    // Clear the stack to avoid memory leaks (#10056)
    this.bindings = $(this.bindings.not(element).get());
  },

  /**
   * 延迟执行回调，会自动绑定上下文为组件实例
   *
   * @private
   *
   * @param  {string|function} handler 组件成员方法名称或者回调方法
   * @param  {number} delay   延时
   * @return {number}         定时器
   */
  _delay: function(handler, delay) {
    var instance = this;

    function handlerProxy() {
      return (typeof handler === "string" ? instance[handler] : handler)
        .apply(instance, arguments);
    }

    return setTimeout(handlerProxy, delay || 0);
  },

  /**
   * 触发事件
   *
   * 默认会根据事件名称执行options中的回调，会自动绑定上下文为容器节点。
   *
   * TODO: 有些表单控件，注意死循环触发情况。
   *
   * @private
   *
   * @param  {string} type  事件名称
   * @param  {object} event 原始事件名称，或者null
   * @param  {object} data  事件数据
   * @return {boolean}      透传回调的返回值，返回false会阻止事件冒泡
   */
  _trigger: function(type, event, data) {
    var prop,
      orig,
      callback = this.options[type];

    data = data === undefined ? {} : data;
    event = $.Event(event);
    event.type = (type).toLowerCase();
    // the original event may come from any element
    // so we need to reset the target on the new event
    event.target = this.element[0];

    // copy original event properties over to the new event
    orig = event.originalEvent;
    if (orig) {
      for (prop in orig) {
        if (!(prop in event)) {
          event[prop] = orig[prop];
        }
      }
    }

    this.element.trigger(event, data);
    return !($.isFunction(callback) &&
      callback.apply(this.element[0], [event].concat(data)) === false ||
      event.isDefaultPrevented());
  }
};

return UCD.Widget;

}, typeof define == 'function' && define.amd ? define : function(_, f){ f(jQuery, UCD); });
//**************************************************************************************************************