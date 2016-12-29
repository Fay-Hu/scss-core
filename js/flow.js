/**
 * Created by hWX336970 on 2016/12/5.
 */
UCD.registerWidget('Flow', function(SUPER) {
  var NS_svg = "http://www.w3.org/2000/svg",
    NS_xlink = "http://www.w3.org/1999/xlink";

  var
    CLASSES = {
      stage: 'ds-stage',
      grid: 'ds-flow-grid',
      item: 'ds-flow-item',
      text: 'ds-text',
      lines: 'ds-lines',
      line: 'ds-line',
      icon: 'ds-icon',
      flowStep: 'ds-flow-step',
      preset: 'ds-flow-preset',
      dot: 'ds-dot'
    },
    ATTRS = {
      position: 'data-pos',
      img: 'data-img',
      flowType: 'data-type'
    },
    SELECTORS = {
      position: '[data-pos="${pos}"]',
      item: '.ds-flow-item',
      preset: '.ds-flow-preset'
    };

  var helper = {
    getUID: function(prefix) {
      do {
        prefix += ~~(Math.random() * 1000000)
      } while (document.getElementById(prefix));
      return prefix;
    },
    createNS: function(tagName, attrs, xlinKey, xlinkValue) {
      var $node = $(document.createElementNS(NS_svg, tagName));
      if (attrs) {
        $node.attr(attrs);
      }
      if (xlinKey) {
        $node[0].setAttributeNS(NS_xlink, xlinKey, xlinkValue);
      }
      return $node;
    }
  };

  return {
    options: {
      minSpace: 2,
      enablePolyline: true,
      cellSize: 110,
      gridWidth: 11000,
      gridHeight: 11000,
      minScale: 0.5,
      maxScale: 3,
      draggableSelector: '[data-dragtype="flow"]',
      dotPath: 'M 55,51 V 59 M 51,55 H 59 Z'
    },
    _create: function() {
      SUPER._create.call(this);

      var
        opts = this.options,
        eleHeight = this.element.height(),
        eleWidth = this.element.width(),
        $stage = this.$stage = helper.createNS('svg', {
          class: CLASSES.stage,
          height: eleHeight,
          width: eleWidth
        })
          .append(helper.createNS('defs')
            .append(helper.createNS('pattern', {
              id: 'grid',
              width: opts.cellSize / opts.gridWidth,
              height: opts.cellSize / opts.gridHeight
            })
              .append(helper.createNS('path', {
                d: opts.dotPath,
                class: "ds-grid-cell"
              }))));

      $stage[0].setAttribute('viewBox', [0, 0, eleWidth, eleHeight].join(' ')); //带大写字母的属性不能使用$.attr()
      $stage[0].setAttribute('preserveAspectRatio', 'xMinYMin slice');

      this.$grid = helper.createNS('rect', {
        width: opts.gridWidth,
        height: opts.gridHeight,
        x: -opts.gridWidth / 2,
        y: -opts.gridHeight / 2,
        fill: 'url(#grid)',
        class: CLASSES.grid
      })
        .appendTo($stage);

      this.$lines = helper.createNS('g', {
        class: CLASSES.lines
      }).appendTo($stage);
    },

    _init: function() {
      var opts = this.options;

      this.element.append(this.$stage);
      this._bindEvents();
      this._trigger('init', null)
    },
    _bindEvents: function() {
      var self = this;
      this.document.on('dragstart', this.options.draggableSelector, function(e) {

        var $this = $(e.target);

        if (!$this.attr('id')) $this.attr('id', helper.getUID('flow-item-'));

        e = e.originalEvent;
        e.dataTransfer.setData("Text", $this.attr('id'));
      });

      this._on(this.$stage, {
        'dragover': '_handleDragover',
        'drop': '_handleDrop',
        'dragleave .ds-flow-grid': '_handleDragleave',
        'mousewheel': '_handleScale',
        'DOMMouseScroll': '_handleScale',
        'dblclick .ds-line': '_handleLineDblClick',
        'click .ds-text': '_handleClickText'
      });

      this._bindGridDrag();
    },
    _handleClickText: function(e) {
      e.stopPropagation();
    },
    _bindGridDrag: function() {
      var
        self = this,
        isDrag = false,
        dragStartX = 0,
        dragStartY = 0;

      this.$grid.on('mousedown', function(e) {
        isDrag = true;
        dragStartX = e.pageX;
        dragStartY = e.pageY;
        e.preventDefault();
      })
        .on('mouseup mouseout', function(e) {
          isDrag = false;
        })
        .on('mousemove', function(e) {
          if (isDrag && $(e.target).is(self.$grid)) {
            var diffX = e.pageX - dragStartX,
              diffY = e.pageY - dragStartY;
            self.$stage[0].viewBox.baseVal.x -= (diffX / self._getScale());
            self.$stage[0].viewBox.baseVal.y -= (diffY / self._getScale());
          }

          dragStartX = e.pageX;
          dragStartY = e.pageY;
        });
    },
    _handleScale: function(e) {
      var
        opts = this.options,
        viewWidth = this.$stage[0].viewBox.baseVal.width + e.originalEvent.wheelDelta,
        scale = viewWidth / this.$stage.prop('width').baseVal.value;

      if (scale <= opts.maxScale && scale >= opts.minScale) {
        var realScale = viewWidth / this.$stage[0].viewBox.baseVal.width;
        this.$stage[0].viewBox.baseVal.width = viewWidth;
        this.$stage[0].viewBox.baseVal.height *= realScale;
      }
    },
    _handleDragleave: function() {
      this._clearPreset();
    },
    _handleDragover: function(e) {
      var originalE = e.originalEvent;
      e.preventDefault();
      this.enableDrop = false;

      var
        offset = this.$stage.offset(),
        cx = originalE.pageX - offset.left,
        cy = originalE.pageY - offset.top;

      var
        $closestItem = this.$closestItem = this._getClosestItem(cx, cy),
        $presetItem = this._createItem(cx, cy);

      //如果当前预放置节点不合法，保留上一个预节点，线重连
      if (!this._judgePreset($closestItem, $presetItem)) {
        if (this.$presetItem && this._judgePreset($closestItem, this.$presetItem)) {
          this.$presetLine.remove();
          this.$lines.append(this.$presetLine = this._line($closestItem, this.$presetItem, true));
          this.enableDrop = true;
        }
        return false;
      }
      this.cxCy = [cx, cy];

      if ($presetItem) {
        this.$presetItem && this._clearPreset();
        this.$stage.append(this.$presetItem = $presetItem);
        this.$lines.append(this.$presetLine = this._line($closestItem, this.$presetItem, true));
      }

      this.enableDrop = true;
    },
    _handleDrop: function(e) {
      var originalE = e.originalEvent;
      e.preventDefault();

      var
        $target = $(document.getElementById(e.originalEvent.dataTransfer.getData("Text"))),
        $closestItem = this.$closestItem;
      //防止其他结构意外拖入
      if (!$target.is(this.options.draggableSelector) || !this.enableDrop) {
        return false;
      }

      this._clearPreset();
      var $item = this._createItem(this.cxCy[0], this.cxCy[1], $target);
      this.$stage.append($item);
      this.$lines.append(this._line(this.$closestItem, $item));

      return this;
    },
    _handleLineDblClick: function(e) {
      $(e.target).remove();
    },
    _judgePreset: function($start, $end) {

      if (!$start || !$end) return true;

      //起点坐标
      var
        opts = this.options,
        sPos = [parseInt($start.attr(ATTRS.position).split(',')[0]), parseInt($start.attr(ATTRS.position).split(',')[1])],
        //终点点坐标
        tPos = [parseInt($end.attr(ATTRS.position).split(',')[0]), parseInt($end.attr(ATTRS.position).split(',')[1])];

      //至少间距2格
      if (opts.enablePolyline && Math.pow(sPos[0] - tPos[0], 2) + Math.pow(sPos[1] - tPos[1], 2) >= Math.pow(this.options.minSpace, 2)) {
        return true;
      }
      //至少间距2格且只能水平垂直延伸
      else if ((sPos[0] === tPos[0] && Math.abs(sPos[1] - tPos[1]) >= this.options.minSpace) || (sPos[1] === tPos[1] && Math.abs(sPos[0] - tPos[0]) >= this.options.minSpace)) {
        return true;
      }
      return false;
    },
    _clearPreset: function() {
      this.$presetItem && this.$presetItem.remove();
      this.$presetLine && this.$presetLine.remove();
      this.$presetItem = this.$presetLine = null;
    },
    _getScale: function() {
      return this.$stage.prop('width').baseVal.value / this.$stage[0].viewBox.baseVal.width;
    },
    _getStageCxCy: function(cx, cy) {
      var scale = this._getScale();
      return [cx / scale + this.$stage[0].viewBox.baseVal.x, cy / scale + this.$stage[0].viewBox.baseVal.y];
    },
    _cxToPos: function(cx, cy) {
      var cellSize = this.options.cellSize,
        cxCy = this._getStageCxCy(cx, cy);

      return [Math.floor(cxCy[0] / cellSize), Math.floor(cxCy[1] / cellSize)];
    },
    _getPutPosition: function(cx, cy) {
      var
        cellSize = this.options.cellSize,
        cxCy = this._getStageCxCy(cx, cy),
        cxSymbol = cxCy[0] >= 0 ? 1 : -1,
        cySymbol = cxCy[1] >= 0 ? 1 : -1;

      return [cxCy[0] - Math.floor(cxCy[0] % cellSize) + cellSize / 2 * cxSymbol, cxCy[1] - Math.floor(cxCy[1] % cellSize) + cellSize / 2 * cySymbol];
    },
    /**
     *
     * @param $start
     * @param $target
     * @param preset {Boolean}
     * @returns {*}
     * @private
     */
    _line: function($start, $target, preset) {
      if (!$start || !$target) return;
      var
        //起点坐标
        sPos = [parseInt($start.attr(ATTRS.position).split(',')[0]), parseInt($start.attr(ATTRS.position).split(',')[1])],
        //终点点坐标
        tPos = [parseInt($target.attr(ATTRS.position).split(',')[0]), parseInt($target.attr(ATTRS.position).split(',')[1])],
        sLinePoint = this._getLinePoint($start),
        tLinePoint = this._getLinePoint($target),
        $line = helper.createNS('polyline'),
        points = [];

      //连线分8种情况，上、下、左、右;左上、右上、左下、右下
      if (sPos[0] == tPos[0] && sPos[1] > tPos[1]) {
        points = [sLinePoint.top, tLinePoint.bottom];
      } else if (sPos[0] == tPos[0] && sPos[1] < tPos[1]) {
        points = [sLinePoint.bottom, tLinePoint.top];
      } else if (sPos[0] < tPos[0] && sPos[1] == tPos[1]) {
        points = [sLinePoint.right, tLinePoint.left];
      } else if (sPos[0] > tPos[0] && sPos[1] == tPos[1]) {
        points = [sLinePoint.left, tLinePoint.right];
      } else if (sPos[0] > tPos[0] && sPos[1] > tPos[1]) {
        points = [sLinePoint.top, this._getLinePoint([sPos[0], tPos[1]]), tLinePoint.right];
      } else if (sPos[0] < tPos[0] && sPos[1] > tPos[1]) {
        points = [sLinePoint.right, this._getLinePoint([tPos[0], sPos[1]]), tLinePoint.bottom];
      } else if (sPos[0] > tPos[0] && sPos[1] < tPos[1]) {
        points = [sLinePoint.left, this._getLinePoint([tPos[0], sPos[1]]), tLinePoint.top];
      } else {
        points = [sLinePoint.bottom, this._getLinePoint([sPos[0], tPos[1]]), tLinePoint.left];
      }

      $line.attr({
        points: points.join(' '),
        class: preset ? [CLASSES.line, CLASSES.preset].join(' ') : CLASSES.line
      });
      return $line;
    },
    /**
     * 根据节点或者节点坐标位置获取节点上四个方向的连线点
     * @param $item
     * @returns {*}
     * @private
     */
    _getLinePoint: function($item) {
      var
        cellSize = this.options.cellSize,
        opts = this.options,
        offsetX = opts.cellSize / 2,
        offsetY = opts.cellSize / 2;

      if ($item instanceof $) {
        var posX = parseInt($item.attr(ATTRS.position).split(',')[0]),
          posY = parseInt($item.attr(ATTRS.position).split(',')[1]);

        return {
          top: [posX * cellSize + offsetX, posY * cellSize].join(','),
          bottom: [posX * cellSize + offsetX, posY * cellSize + offsetY * 2].join(','),
          left: [posX * cellSize, posY * cellSize + offsetY].join(','),
          right: [posX * cellSize + offsetX * 2, posY * cellSize + offsetY].join(',')
        };
      } else if ($.isArray($item)) {
        return [$item[0] * cellSize + offsetX, $item[1] * cellSize + offsetY].join(',');
      }
    },
    /**
     *  创建节点
     * @param cx
     * @param cy
     * @param $from
     * @returns {*}
     * @private
     */
    _createItem: function(cx, cy, $from) {
      var opts = this.options,
        transPos = this._getPutPosition(cx, cy),
        cxCy = this._getStageCxCy(cx, cy),
        pos = Math.floor(cxCy[0] / opts.cellSize) + ',' + Math.floor(cxCy[1] / opts.cellSize);

      if (this.$stage.find('[data-pos="' + pos + '"]').length) return null;

      var flowType = ($from && $from.attr(ATTRS.flowType)) || 'process',
        $step;

      switch (flowType) {
        case 'process':
          $step = helper.createNS('circle', {
            class: CLASSES.flowStep,
            r: 40,
          });
          break;
        case 'decision':
          $step = helper.createNS('polygon', {
            class: CLASSES.flowStep,
            points: '-40,0 0,40 40,0 0,-40'
          });
          break;
        default:
          break;
      }

      return helper.createNS('g', {
        transform: 'translate(' + transPos[0] + ',' + transPos[1] + ')',
        class: $from ? CLASSES.item : [CLASSES.item, CLASSES.preset].join(' '),
        'data-pos': pos
      })
        .append($step)
        //TODO 具体位置参数暂时使用数字，待优化
        .append($from ? helper.createNS('rect', {
          fill: 'white',
          width: 40,
          height: 28,
          x: (flowType == 'decision' ? 10 : 12),
          y: (flowType == 'decision' ? -45 : -50)
        }) : '')
        .append(helper.createNS('text', {
          class: CLASSES.text,
          x: 15,
          y: flowType == 'decision' ? -18 : -25
        })
          .append(helper.createNS('tspan').text($from ? $from.children('p').text() : '')))
        .append($from ? helper.createNS('image', {
          class: CLASSES.icon,
          x: -20,
          y: -20
        }, 'xLink:href', $from.attr(ATTRS.img)) : '');
    },
    /**
     * 获取距拖放点最近的节点
     * @param posX
     * @param posY
     * @returns {*}
     * @private
     */
    _getClosestItem: function(cx, cy) {
      var
        minDis = Number.MAX_VALUE,
        $closestItem = null,
        cxCy = this._getStageCxCy(cx, cy);

      this.$stage.find(SELECTORS.item).each(function() {
        var $this = $(this),
          pos = $this.attr('transform').replace(/translate\((.*)\)/, '$1').split(','),
          dis = Math.pow(parseInt(pos[0]) - cxCy[0], 2) + Math.pow(parseInt(pos[1]) - cxCy[1], 2);

        if ($this.is(SELECTORS.preset)) return;

        if (minDis > dis) {
          $closestItem = $this;
          minDis = dis;
        }
      });
      return $closestItem;
    }
  }
});