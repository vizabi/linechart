import {
  BaseComponent,
  Icons,
  LegacyUtils as utils,
  Utils,
  collisionResolver,
  axisSmart
} from "VizabiSharedComponents";
import { runInAction, decorate, computed } from "mobx";

const {ICON_QUESTION} = Icons;
const PROFILE_CONSTANTS = {
  SMALL: {
    margin: {
      top: 30,
      right: 20,
      left: 40,
      bottom: 20
    },
    infoElHeight: 16,
    yAxisTitleBottomMargin: 6,
    tick_spacing: 60,
    text_padding: 12,
    lollipopRadius: 6,
    limitMaxTickNumberX: 5
  },
  MEDIUM: {
    margin: {
      top: 40,
      right: 60,
      left: 60,
      bottom: 25
    },
    infoElHeight: 20,
    yAxisTitleBottomMargin: 6,
    tick_spacing: 80,
    text_padding: 15,
    lollipopRadius: 7,
    limitMaxTickNumberX: 10
  },
  LARGE: {
    margin: {
      top: 50,
      right: 60,
      left: 75,
      bottom: 30
    },
    infoElHeight: 22,
    yAxisTitleBottomMargin: 6,
    tick_spacing: 100,
    text_padding: 20,
    lollipopRadius: 9,
    limitMaxTickNumberX: 0 // unlimited
  }
};

const PROFILE_CONSTANTS_FOR_PROJECTOR = {
  MEDIUM: {
    margin: {
      top: 70,
      bottom: 40,
      left: 70,
      right: 60
    },
    yAxisTitleBottomMargin: 20,
    xAxisTitleBottomMargin: 20,
    infoElHeight: 26,
    text_padding: 30
  },
  LARGE: {
    margin: {
      top: 70,
      bottom: 50,
      left: 70,
      right: 60
    },
    yAxisTitleBottomMargin: 20,
    xAxisTitleBottomMargin: 20,
    infoElHeight: 32,
    text_padding: 36,
    hideSTitle: true
  }
};

//
// LINE CHART COMPONENT
class _VizabiLineChart extends BaseComponent {

  constructor(config) {
    config.template = `
      <svg class="vzb-linechart-svg vzb-export">
          <g class="vzb-lc-graph">

              <svg class="vzb-lc-axis-x"><g></g></svg>
              <svg class="vzb-lc-axis-y"><g></g></svg>
              <text class="vzb-lc-axis-x-value"></text>
              <text class="vzb-lc-axis-y-value"></text>
              <svg class="vzb-lc-lines-crop">
                  <svg class="vzb-lc-lines"></svg>
                  <line class="vzb-lc-projection-x"></line>
                  <line class="vzb-lc-projection-y"></line>
              </svg>
              <svg class="vzb-lc-labels-crop">
                  <g class="vzb-lc-labels">
                      <line class="vzb-lc-vertical-now"></line>
                  </g>
              </svg>

              <g class="vzb-lc-axis-y-title">
                <text></text>
              </g>
              <g class="vzb-lc-axis-x-title">
                <text></text>
              </g>
              <g class="vzb-lc-axis-y-info"></g>

              <g class="no-data-message vzb-hidden">                  
                  <text></text>
              </g>

              <!--filter id="vzb-lc-filter-dropshadow"> 
                <feOffset result="offOut" in="SourceGraphic" dx="0" dy="2" />
                <feColorMatrix result = "matrixOut" in = "offOut" type = "matrix"
                              values = "0.3 .0 .0 .0 .0
                                        .0 .3 .0 .0 .0
                                        .0 .0 .3 .0 .0
                                        1.0 1.0 1.0 1.0 .0"/>
                <feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="0.8" />
                <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
              </filter-->

          </g>
          <rect class="vzb-lc-forecastoverlay vzb-hidden" x="0" y="0" width="100%" height="100%" fill="url(#vzb-lc-pattern-lines)" pointer-events='none'></rect>
          <g class="vzb-datawarning-button vzb-noexport"></g>
      </svg>
      <div class="vzb-tooltip vzb-hidden"></div>
      <svg>
        <defs>
            <pattern id="vzb-lc-pattern-lines" x="0" y="0" patternUnits="userSpaceOnUse" width="50" height="50" viewBox="0 0 10 10"> 
                <path d='M-1,1 l2,-2M0,10 l10,-10M9,11 l2,-2' stroke='black' stroke-width='3' opacity='0.08'/>
            </pattern> 
        </defs>
      </svg>
    `;
    super(config);
  }

  setup() {
    this.DOM = {
      element: this.element,
      graph: this.element.select(".vzb-lc-graph"),

      xAxisElContainer: this.element.select(".vzb-lc-axis-x"),
      yAxisElContainer: this.element.select(".vzb-lc-axis-y"),
  
      xTitle: this.element.select(".vzb-lc-axis-x-title"),
      yTitle: this.element.select(".vzb-lc-axis-y-title"),
      yInfo: this.element.select(".vzb-lc-axis-y-info"),
      linesContainerCrop: this.element.select(".vzb-lc-lines-crop"),
      linesContainer: this.element.select(".vzb-lc-lines"),
      labelsContainerCrop: this.element.select(".vzb-lc-labels-crop"),
      labelsContainer: this.element.select(".vzb-lc-labels"),
      noDataMessage: this.element.select(".no-data-message"),

      tooltip: this.element.select(".vzb-tooltip"),
      //filterDropshadowEl: this.element.select('#vzb-lc-filter-dropshadow'),
      projectionX: this.element.select(".vzb-lc-projection-x"),
      projectionY: this.element.select(".vzb-lc-projection-y"),
      forecastOverlay: this.element.select(".vzb-lc-forecastoverlay")
    };
    this.DOM.xAxisEl = this.DOM.xAxisElContainer.select("g");
    this.DOM.yAxisEl = this.DOM.yAxisElContainer.select("g");
    this.DOM.verticalNow = this.DOM.labelsContainer.select(".vzb-lc-vertical-now");
    this.DOM.entityLabels = this.DOM.labelsContainer.selectAll(".vzb-lc-entity");
    this.DOM.entityLines = this.DOM.linesContainer.selectAll(".vzb-lc-entity");
  
    this.totalLength_1 = {};

    this.KEY = Symbol.for("key");

    this.collisionResolver = collisionResolver()
      .selector(".vzb-lc-label")
      .value("valueY")
      .filter(function(d, time){
        return (d.valueX - time === 0 && !d.hidden);
      })
      .KEY(this.KEY);

    this._initInfoElements();

    this.xScale = null;
    this.yScale = null;

    this.rangeXRatio = 1;
    this.rangeXShift = 0;

    this.rangeYRatio = 1;
    this.rangeYShift = 0;
    this.lineWidthScale = d3.scaleLinear().domain([0, 20]).range([7, 1]).clamp(true);
    this.xAxis = axisSmart("bottom");
    this.yAxis = axisSmart("left");

    this.COLOR_BLACKISH = "#333";
    this.COLOR_WHITEISH = "#fdfdfd";
    this.COLOR_WHITEISH_SHADE = "#555";

    this.DOM.graph.on("click", () => {
      const {
        selected: { data: { filter: selectedFilter } },
        highlighted: { data: { filter: highlightedFilter} }
      } = this.MDL;
      if (highlightedFilter.any()) {
        selectedFilter.toggle(
          highlightedFilter.markers.keys().next().value
        );
      }
    });
    this.DOM.linesContainerCrop
      .on("mousemove", this._entityMousemove.bind(this))
      .on("mouseleave", this._entityMouseout.bind(this));

  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted,
      x: this.model.encoding[this.state.alias.x || "x"],
      y: this.model.encoding[this.state.alias.y || "y"],
      color: this.model.encoding.color,
      label: this.model.encoding.label,
      repeat: this.model.encoding.repeat
    };
  }


  get profileConstants() {
    this.services.layout.size;

    return this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
  }

  get height(){
    this.services.layout.size;

    return this.element.node().clientHeight || 0;
  }

  get width(){
    this.services.layout.size;

    return this.element.node().clientWidth || 0;
  }

  checkLayout() {
    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  draw() {
    this.localise = this.services.locale.auto();

    this.yAxis.tickFormat(this.localise);
    this.xAxis.tickFormat(this.localise);
    
    this.TIMEDIM = this.MDL.frame.data.concept;
        
    if (this.checkLayout()) return; //return if exists with error
    
    this.addReaction(this.drawForecastOverlay);
    this.addReaction(this.constructScales);
    this.addReaction(this.constructColorScale);
   
    this.addReaction(this.updateTime);
    this.addReaction(this.updateUIStrings);
    this.addReaction(this.updateShow);
    this.addReaction(this.updateColors);
    this.addReaction(this.updateSize);
    
    this.addReaction(this.redrawDataPoints);
    this.addReaction(this.highlightLines);
    this.addReaction(this.updateNoDataMessage);
  
  }

  constructScales() {
    this.services.layout.size;
    
    const zoomedX = this.MDL.x.scale.zoomed;
    const zoomedY = this.MDL.y.scale.zoomed;
    this.xScale = this.MDL.x.scale.d3Scale;
    this.xScale.domain(zoomedX);

    this.yScale = this.MDL.y.scale.d3Scale;
    this.yScale.domain(zoomedY);

    this.collisionResolver.scale(this.yScale);
  }

  constructColorScale() {
    this.cScale = this.MDL.color.scale.d3Scale;
  }

  drawForecastOverlay() {
    this.DOM.forecastOverlay.classed("vzb-hidden", 
      !this.ui.showForecast || 
      !this.ui.showForecastOverlay || 
      !this.ui.endBeforeForecast || 
        (this.MDL.frame.value <= this.MDL.frame.parseValue(this.ui.endBeforeForecast))
    );
  }

  _initInfoElements() {
    const _this = this;
    const dataNotesDialog = () => this.root.findChild({type: "DataNotes"});
    const timeSlider = () => this.root.findChild({type: "TimeSlider"});

    utils.setIcon(this.DOM.yInfo, ICON_QUESTION)
      .on("click", () => {
        dataNotesDialog().pin();
      })
      .on("mouseover", function() {
        if (timeSlider().ui.dragging) return;
        const rect = this.getBBox();
        const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
        const toolRect = _this.root.element.node().getBoundingClientRect();
        const chartRect = _this.element.node().getBoundingClientRect();
        dataNotesDialog()
          .setEncoding(_this.MDL.y)
          .show()
          .setPos(coord.x + chartRect.left - toolRect.left, coord.y);
      })
      .on("mouseout", () => {
        if (timeSlider().ui.dragging) return;
        dataNotesDialog().hide();
      });
  }

  _getLabelText(d) {
    if(d.values) d = d.values[0];

    if (typeof d.label == "object") 
      return Object.entries(d.label)
        .filter(entry => entry[0] != this.MDL.frame.data.concept)
        .map(entry => entry[1])
        .join(", ");
    if (d.label != null) return "" + d.label;
    return d[Symbol.for("key")];
  }

  updateUIStrings() {

    this.strings = {
      title: {
        Y: Utils.getConceptName(this.MDL.y, this.localise),
        X: Utils.getConceptName(this.MDL.x, this.localise),
        C: Utils.getConceptName(this.MDL.color, this.localise)
      },
      unit: {
        Y: Utils.getConceptUnit(this.MDL.y),
        X: Utils.getConceptUnit(this.MDL.x),
        C: Utils.getConceptUnit(this.MDL.color)
      }
    };

    const treemenu = this.root.findChild({type: "TreeMenu"});

    this.DOM.yTitle
      .classed("vzb-disabled", treemenu.state.ownReadiness !== Utils.STATUS.READY)
      .on("click", () => {
        treemenu
          .encoding(this._alias("y"))
          .alignX("left")
          .alignY("top")
          .updateView()
          .toggle();
      });

    this.DOM.xTitle
      .classed("vzb-disabled", treemenu.state.ownReadiness !== Utils.STATUS.READY)
      .on("click", () => {
        treemenu
          .encoding(this._alias("x"))
          .alignX("right")
          .alignY("bottom")
          .updateView()
          .toggle();
      });

    const conceptPropsY = this.MDL.y.data.conceptProps;
    this.DOM.yInfo
      .style("opacity", Number(Boolean(conceptPropsY.description || conceptPropsY.sourceLink)));
  }

  updateTime() {
    const { frame } = this.MDL;
    const time_1 = (this.time === null) ? frame.value : this.time;
    this.time = frame.value;
    this.duration = frame.playing && (this.time - time_1 > 0) ? frame.speed || 0 : 0;

    this.stepIndex = frame.stepScale(this.time);
  }

  updateColors() {
    const _this = this;
    const { color } = this.MDL; 
    const {
      entityLabels,
      entityLines
    } = this.DOM;

    color.scale.d3Scale;

    entityLabels.each(function(d) {
      const entity = d3.select(this);
      const {color, colorShadow} = _this._getColorsByValue(d.values[0].color);

      entity.select("circle").style("fill", color);
      entity.select(".vzb-lc-labelfill")
        .style("fill", colorShadow);
      entity.select(".vzb-lc-label-value")
        .style("fill", colorShadow);
    });

    entityLines.each(function(d) {
      const entity = d3.select(this);
      const {color, colorShadow} = _this._getColorsByValue(d.values[0].color);
      
      entity.select(".vzb-lc-line").style("stroke", color);
      entity.select(".vzb-lc-line-shadow").style("stroke", colorShadow);
    });
  }

  _getColorsByValue(colorValue) {
    return { 
      color: colorValue != null ? this.cScale(colorValue) : this.COLOR_WHITEISH,
      colorShadow: colorValue != null ? this.MDL.color.scale.palette.getColorShade({
        colorID: colorValue,
        shadeID: "shade"
      })
        : this.COLOR_WHITEISH_SHADE
    };
  }

  _processFramesData() {
    const KEY = this.KEY;
    const data = new Map();
    this.model.getTransformedDataMap("filterRequired").each(frame => frame.forEach((valuesObj, key) => {
      if (!data.has(key)) data.set(key, { [KEY]: key, values:[] });
      data.get(key).values.push(valuesObj);
    }));
    
    return [...data.values()].map(d => {
      d.shiftIndex = this.MDL.frame.stepScale(d.values[0][this.TIMEDIM]);
      return d;
    });
  }

  updateNoDataMessage(){
    this.services.layout.size;
    this.DOM.noDataMessage
      .classed("vzb-hidden", this._processFramesData().length);

    if (this._processFramesData().length) return;

    this.DOM.noDataMessage
      .attr("transform", `translate(${this.width/2 - this.profileConstants.margin.left}, ${this.height/2})`)
      .select("text")
      .text(this.localise("hints/no-data-available"));
  }

  _isFrameOnXaxis(){
    return this.MDL.frame.data.concept === this.MDL.x.data.concept;
  }

  /*
   * UPDATE SHOW:
   * Ideally should only update when show parameters change or data changes
   */
  updateShow() {
    this.MDL.x.scale.zoomed;

    const _this = this;
    const KEY = this.KEY;
    const {
      labelsContainer,
    } = this.DOM;
    let {
      entityLines,
      entityLabels
    } = this.DOM;
    
    this.cached = {};

    this.data = this._processFramesData();
    entityLines = entityLines.data(this.data, d => d[KEY]);
    entityLines.exit().remove();

    this.lineWidth = this.lineWidthScale(this.data.length);
    if (this.lineWidth >= 2) {
      this.shadowWidth = this.lineWidth * 1.3;
    } else {
      this.shadowWidth = null;
    }

    labelsContainer.classed("small", !this.shadowWidth);
    this.DOM.entityLines = entityLines = entityLines
      .enter().append("g")
      .attr("class", d => "vzb-lc-entity vzb-lc-entity-" + d[KEY])
      .each(function() {
        const entity = d3.select(this);
        entity.append("path")
          .attr("class", "vzb-lc-line");
      })
      .merge(entityLines);

    this.DOM.entityLines.selectAll(".vzb-lc-line-shadow")
      .remove();
    if (_this.shadowWidth) {
      this.DOM.entityLines.insert("path", ":first-child")
        .attr("class", "vzb-lc-line-shadow");
    }
      
    entityLabels = entityLabels.data(this.data, d => d[KEY]);
    entityLabels.exit().remove();
    this.DOM.entityLabels = entityLabels = entityLabels.enter().append("g")
      .attr("class", "vzb-lc-entity")
      .on("mouseover", d => {
        _this.MDL.highlighted.data.filter.set(d, JSON.stringify(d.values[d.values.length - 1]));
      })
      .on("mouseout", d => {
        _this.MDL.highlighted.data.filter.delete(d);
      })
      .each(function() {
        const entity = d3.select(this);

        entity.append("circle")
          .attr("class", "vzb-lc-circle")
          .attr("cx", 0);
        entity.append("title");

        const labelGroup = entity.append("g").attr("class", "vzb-lc-label");

        labelGroup.append("text")
          .attr("class", "vzb-lc-labelname vzb-lc-labelstroke")
          .attr("dy", ".35em");

        labelGroup.append("text")
          .attr("class", "vzb-lc-labelname vzb-lc-labelfill")
          .attr("dy", ".35em");

        labelGroup.append("text")
          .attr("class", "vzb-lc-label-value")
          .attr("dy", "1.6em");
      })
      .merge(entityLabels);

    this.addValueToLabel = this.data.length < this.ui.labels.min_number_of_entities_when_values_hide;

    entityLabels.each(function(d) {
      const entity = d3.select(this);

      const label = d.label = _this._getLabelText(d);
      d.name = label.length < 13 ? label : label.substring(0, 10) + "...";//"…";

      if (!_this.addValueToLabel) { 
        entity.selectAll(".vzb-lc-labelname")
          .text(d.name);
      }

      const titleText = _this.addValueToLabel ? label : label + " " + _this.yAxis.tickFormat()((d.values[_this.stepIndex] || {})[_this._alias("y")]);
      entity.select("title").text(titleText);
    });

    //line template
    this.line = d3.line()
    //see https://bl.ocks.org/mbostock/4342190
    //"monotone" can also work. "basis" would skip the points on the sharp turns. "linear" is ugly
      .curve(d3[(this._isFrameOnXaxis() && this.ui.curve) ? this.ui.curve : "curveLinear"])
      .x(d => this.xScale(d[0]))
      .y(d => this.yScale(d[1]));
  }

  /*
   * REDRAW DATA POINTS:
   * Here plotting happens
   */
  redrawDataPoints() {
    this.services.layout.size;
    this.MDL.x.scale.type;
    this.MDL.y.scale.type;
    this.MDL.x.scale.zoomed;
    this.MDL.y.scale.zoomed;

    if ([...this.xScale.domain(), ...this.yScale.domain()].some(s => s==null || isNaN(s))) 
      return utils.warn(`Line chart redrawDataPoints() short circuit because scale domain looks bad`, this.xScale.domain(), this.yScale.domain());

    const _this = this;
    const KEY = this.KEY;
    const {
      entityLines,
      entityLabels,
      verticalNow,
      xAxisEl
    } = this.DOM;
    const {
      frame
    } = this.MDL;

    entityLines
      .each(function(d) {
        const entity = d3.select(this);
          
        const xy = d.values.slice(0, (_this.stepIndex - d.shiftIndex) <= 0 ? 0 : _this.stepIndex - d.shiftIndex)
          .map(point => [point[_this._alias("x")], point[_this._alias("y")]])
          .filter(d => d[1] || d[1] === 0);

        // add last point
        let currentPoint = _this.model.dataMap.getByStr(d[KEY]) || {};
        currentPoint = {
          x: currentPoint[_this._alias("x")],
          y: currentPoint[_this._alias("y")]
        };
        if ((currentPoint.y || currentPoint.y === 0) && (currentPoint.x || currentPoint.x === 0)) {
          xy.push([currentPoint.x, currentPoint.y]);
        }

        if (xy.length > 0) {
          _this.cached[d[KEY]] = {
            valueX: xy[xy.length - 1][0],
            valueY: xy[xy.length - 1][1]
          };
        } else {
          delete _this.cached[d[KEY]];
        }

        // the following fixes the ugly line butts sticking out of the axis line
        //if(x[0]!=null && x[1]!=null) xy.splice(1, 0, [(+x[0]*0.99+x[1]*0.01), y[0]]);
        const path2 = entity.select(".vzb-lc-line");

        if (frame.playing && _this.totalLength_1[d[KEY]] === null) {
          _this.totalLength_1[d[KEY]] = path2.node().getTotalLength();
        }
        const line = _this.line(xy) || "";

        const path1 = entity.select(".vzb-lc-line-shadow")

          .style("stroke-width", _this.shadowWidth + "px")
          .attr("transform", "translate(0, " + (_this.shadowWidth - _this.lineWidth) + ")")
          .attr("d", line);
        path2
        //.style("filter", "none")
          .style("stroke-width", _this.lineWidth + "px")
          .attr("d", line);

        // this section ensures the smooth transition while playing and not needed otherwise
        if (frame.playing) {
          const totalLength = path2.node().getTotalLength();

          path1
            .interrupt()
            .attr("stroke-dasharray", totalLength)
            .attr("stroke-dashoffset", totalLength - _this.totalLength_1[d[KEY]])
            .transition()
            .delay(0)
            .duration(_this.duration)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
          path2
            .interrupt()
            .attr("stroke-dasharray", totalLength)
            .attr("stroke-dashoffset", totalLength - _this.totalLength_1[d[KEY]])
            .transition()
            .delay(0)
            .duration(_this.duration)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

          _this.totalLength_1[d[KEY]] = totalLength;
        } else {
          //reset saved line lengths
          _this.totalLength_1[d[KEY]] = null;

          path1
            .attr("stroke-dasharray", "none")
            .attr("stroke-dashoffset", "none");

          path2
            .attr("stroke-dasharray", "none")
            .attr("stroke-dashoffset", "none");
        }

      });

    entityLabels
      .each(function(d) {
        const entity = d3.select(this);
        if (_this.cached[d[KEY]]) {
          d.valueX = _this.xScale(_this.cached[d[KEY]]["valueX"]);
          d.valueY = _this.yScale(_this.cached[d[KEY]]["valueY"]);
          entity
            .classed("vzb-hidden", false)
            .transition()
            .duration(_this.duration)
            .ease(d3.easeLinear)
            .attr("transform", "translate(" + d.valueX + ",0)");

          entity.select(".vzb-lc-circle")
            .transition()
            .duration(_this.duration)
            .ease(d3.easeLinear)
            .attr("cy", d.valueY + 1);

          if (_this.addValueToLabel) {
            const value = _this.yAxis.tickFormat()(_this.cached[d[KEY]]["valueY"]);

            entity.selectAll(".vzb-lc-labelname")
              .text(d.name + " " + value);
          }

          entity.select(".vzb-lc-label")
            .transition()
            .duration(_this.duration)
            .ease(d3.easeLinear)
            .attr("transform", "translate(0," + d.valueY + ")");

        } else {
          entity
            .classed("vzb-hidden", true);
        }
      });

    if (this._isFrameOnXaxis()){
      verticalNow
        .transition()
        .duration(_this.duration)
        .ease(d3.easeLinear)
        .attr("transform", "translate(" + _this.xScale(_this.time) + ",0)");
    }

    if (this._isFrameOnXaxis() && !this.hoveringNow && this.time - frame.start !== 0) {
      if (!_this.ui.hideXAxisValue) xAxisEl.call(
        this.xAxis
          .highlightTransDuration(this.duration)
          .highlightValue(this.time)
      );
      verticalNow.style("opacity", 1);
    } else {
      if (!this.ui.hideXAxisValue) xAxisEl.call(
        this.xAxis
          .highlightValue("none")
      );
      verticalNow.style("opacity", 0);
    }

    // Call flush() after any zero-duration transitions to synchronously flush the timer queue
    // and thus make transition instantaneous. See https://github.com/mbostock/d3/issues/1951
    if (this.duration == 0) {
      d3.timerFlush();
    }

    // cancel previously queued simulation if we just ordered a new one
    // then order a new collision resolving
    clearTimeout(this.collisionTimeout);
    this.collisionTimeout = setTimeout(() => {
      entityLabels.call(this.collisionResolver.time(this.xScale(this.time)));
    }, this.duration * 1.5);

  }

  /*
   * RESIZE:
   * Executed whenever the container is resized
   * Ideally, it contains only operations related to size
   */
  updateSize() {
    this.services.layout.size;
    this.MDL.x.scale.zoomed;
    this.MDL.y.scale.zoomed;
    if (this.checkLayout()) return; //return if exists with error

    const {
      x,
      y
    } = this.MDL;
    
    const {
      graph,
      entityLabels,
      linesContainerCrop,
      labelsContainerCrop,
      xAxisElContainer,
      xAxisEl,
      yAxisElContainer,
      yAxisEl,
      xTitle,
      yTitle,
      yInfo,
      tooltip,
      verticalNow,
      projectionX,
      projectionY
    } = this.DOM;

    const {
      margin,
      text_padding,
      lollipopRadius,
      limitMaxTickNumberX,
      yAxisTitleBottomMargin,
      infoElHeight
    } = this.profileConstants;

    const isRTL = this.services.locale.isRTL();


    //adjust right this.margin according to biggest label

    let longestLabelWidth = 0;

    entityLabels.selectAll(".vzb-lc-labelname")
      .attr("dx", text_padding)
      .each(function() {
        const width = this.getComputedTextLength();
        if (width > longestLabelWidth) longestLabelWidth = width;
      });

    entityLabels.selectAll(".vzb-lc-circle")
      .attr("r", this.shadowWidth ? lollipopRadius : lollipopRadius * 0.8);

    const magicMargin = 20;
    const marginRightAdjusted = Math.max(margin.right, longestLabelWidth + text_padding + magicMargin);

    if(this.MDL.repeat.ncolumns == 1)
      this.services.layout.setHGrid([this.width - marginRightAdjusted]);

    //stage
    this.cropHeight = (this.height - margin.top - margin.bottom) || 0;
    this.cropWidth = (this.width - margin.left - marginRightAdjusted) || 0;

    //if (this.cropHeight <= 0 || this.cropWidth <= 0) return utils.warn("Line chart updateSize() abort: vizabi container is too little or has display:none");
    
    linesContainerCrop
      .attr("width", this.cropWidth)
      .attr("height", Math.max(0, this.cropHeight));

    labelsContainerCrop
      .attr("width", this.cropWidth + marginRightAdjusted)
      .attr("height", Math.max(0, this.cropHeight));

    this.collisionResolver.height(this.cropHeight);

    graph
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    this.yScale.range([this.cropHeight - lollipopRadius, lollipopRadius]);
    this.xScale.range([this.rangeXShift, this.cropWidth * this.rangeXRatio + this.rangeXShift]);


    this.yAxis.scale(this.yScale)
      .tickSizeInner(-this.cropWidth)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-this.cropWidth, 0)
      .labelerOptions({
        scaleType: y.scale.type,
        toolMargin: margin,
        limitMaxTickNumber: 6,
        viewportLength: this.cropHeight
      });

    this.xAxis.scale(this.xScale)
      .tickSizeInner(-this.cropHeight)
      .tickSizeOuter(0)
      .tickSizeMinor(-this.cropHeight, 0)
      .tickPadding(6)
      .labelerOptions({
        scaleType: x.scale.type,
        limitMaxTickNumber: limitMaxTickNumberX,
        toolMargin: margin,
        bump: text_padding * 2,
        //showOuter: true
      });

    xAxisElContainer
      .attr("width", this.cropWidth + text_padding * 2)
      .attr("height", margin.bottom + this.cropHeight)
      .attr("y", -1)
      .attr("x", -text_padding);

    xAxisEl
      .attr("transform", "translate(" + (text_padding - 1) + "," + (this.cropHeight + 1) + ")");

    yAxisElContainer
      .attr("width", margin.left + this.cropWidth)
      .attr("height", Math.max(0, this.cropHeight))
      .attr("x", -margin.left);
    yAxisEl
      .attr("transform", "translate(" + (margin.left - 1) + "," + 0 + ")");

    yAxisEl.call(this.yAxis);
    xAxisEl.call(this.xAxis);

    const xTitleText = xTitle.select("text").text(this.strings.title.X + this.strings.unit.X);

    xTitle
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" +
        (this.cropWidth + text_padding + yAxisTitleBottomMargin) + "," +
        (this.cropHeight + xTitleText.node().getBBox().height  * 0.72) + ")");

    if (xTitleText.node().getBBox().width > this.cropWidth - 100) xTitleText.text(this.strings.title.X);

    const yTitleText = yTitle.select("text").text(this.strings.title.Y + this.strings.unit.Y);
    if (yTitleText.node().getBBox().width > this.cropWidth) yTitleText.text(this.strings.title.Y);

    yTitle
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" + (10 - margin.left + (isRTL ? infoElHeight * 1.4 : 0 )) + ", -" + yAxisTitleBottomMargin + ")");

    const titleBBox = yTitle.node().getBBox();
    const t = utils.transform(yTitle.node());

    yInfo.attr("transform", "translate("
      + (isRTL ? 10 - margin.left : titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4) + ","
      + (t.translateY - infoElHeight * 0.8) + ")")
      .select("svg").attr("width", infoElHeight + "px").attr("height", infoElHeight + "px");

    // adjust the vertical dashed line
    verticalNow.attr("y1", this.yScale.range()[0]).attr("y2", this.yScale.range()[1])
      .attr("x1", 0).attr("x2", 0);
    projectionX.attr("y1", this.yScale.range()[0]);
    projectionY.attr("x2", this.xScale.range()[0]);

    if (utils.isTouchDevice()) {
      tooltip.classed("vzb-hidden", true);
      verticalNow.style("opacity", 1);
      projectionX.style("opacity", 0);
      projectionY.style("opacity", 0);
      xAxisEl.call(this.xAxis.highlightValue(this._isFrameOnXaxis() ? this.time : "none"));
      yAxisEl.call(this.yAxis.highlightValue("none"));
      graph.selectAll(".vzb-lc-entity").each(function() {
        d3.select(this).classed("vzb-dimmed", false).classed("vzb-hovered", false);
      });

      this.hoveringNow = null;
    }

    this.root.findChild({type: "_DataWarning"}).setOptions({
      width: this.width,
      height: this.height,
      vertical: "top", 
      horizontal: "right", 
      right: 30,
      top: margin.top + titleBBox.y,
      wLimit: this.width - titleBBox.width - infoElHeight * 2
    });
  }

  _entityMousemove() {
    const _this = this;
    const KEY = _this.KEY;
    const {
      frame,
      highlighted: { data: { filter: highlightedFilter } },
    } = this.MDL;


    const mouse = d3.mouse(_this.element.node()).map(d => parseInt(d));

    let resolvedTime = _this.xScale.invert(mouse[0] - _this.profileConstants.margin.left);
    if (_this.time - resolvedTime < 0) {
      resolvedTime = _this.time;
    } else if (resolvedTime < frame.scale.domain[0]) {
      resolvedTime = frame.scale.domain[0];
    }
    const mousePos = mouse[1] - _this.profileConstants.margin.top;

    //if (!utils.isDate(resolvedTime)) resolvedTime = this.time.parse(resolvedTime);

    const data = _this.model.getDataMapByFrameValue(resolvedTime);
    const nearestKey = _this._getNearestKey(mousePos, data, _this._alias("y"), _this.yScale.bind(_this));
    if (!data.hasByStr(nearestKey)) return;
    const resolvedValue = data.getByStr(nearestKey)[_this._alias("y")];
    const hoveringNow = {[KEY]: nearestKey};
    if (!highlightedFilter.has(hoveringNow)) {
      runInAction(() => {
        highlightedFilter.config.markers = {};
        highlightedFilter.set(hoveringNow);
      });
    }
    _this.hoveringNow = hoveringNow;

    if (utils.isNaN(resolvedValue)) return;

    const scaledTime = _this.xScale(resolvedTime);
    const scaledValue = _this.yScale(resolvedValue);
    const {
      tooltip,
      verticalNow,
      projectionX,
      projectionY,
      xAxisEl,
      yAxisEl
    } = this.DOM;

    if (_this.ui.whenHovering.showTooltip) {
      //position tooltip
      tooltip
      //.style("right", (_this.cropWidth - scaledTime + _this.marginRightAdjusted ) + "px")
        .style("left", (scaledTime + _this.margin.left) + "px")
        .style("bottom", (_this.cropHeight - scaledValue + _this.margin.bottom) + "px")
        .text(_this.yAxis.tickFormat()(resolvedValue))
        .classed("vzb-hidden", false);
    }

    // bring the projection lines to the hovering point
    if (_this.ui.whenHovering.hideVerticalNow) {
      verticalNow.style("opacity", 0);
    }

    if (_this.ui.whenHovering.showProjectionLineX) {
      projectionX
        .style("opacity", 1)
        .attr("y2", scaledValue)
        .attr("x1", scaledTime)
        .attr("x2", scaledTime);
    }
    if (_this.ui.whenHovering.showProjectionLineY) {
      projectionY
        .style("opacity", 1)
        .attr("y1", scaledValue)
        .attr("y2", scaledValue)
        .attr("x1", scaledTime);
    }

    if (_this.ui.whenHovering.higlightValueX) xAxisEl.call(
      _this.xAxis.highlightValue(this._isFrameOnXaxis() ? resolvedTime : "none").highlightTransDuration(0)
    );

    if (_this.ui.whenHovering.higlightValueY) yAxisEl.call(
      _this.yAxis.highlightValue(this._isFrameOnXaxis() ? resolvedValue : "none").highlightTransDuration(0)
    );

    clearTimeout(_this.unhoverTimeout);
  }

  _entityMouseout() {
    const _this = this;    
    if (d3.event.relatedTarget && d3.select(d3.event.relatedTarget).classed("vzb-tooltip")) return;

    // hide and show things like it was before hovering
    _this.unhoverTimeout = setTimeout(() => {
      const DOM = _this.DOM;

      DOM.tooltip.classed("vzb-hidden", true);
      DOM.verticalNow.style("opacity", 1);
      DOM.projectionX.style("opacity", 0);
      DOM.projectionY.style("opacity", 0);
      DOM.xAxisEl.call(_this.xAxis.highlightValue(this._isFrameOnXaxis() ? _this.time : "none"));
      DOM.yAxisEl.call(_this.yAxis.highlightValue("none"));

      if (_this.hoveringNow) _this.MDL.highlighted.data.filter.delete(_this.hoveringNow);

      _this.hoveringNow = null;
    }, 300);

  }

  /*
   * Highlights all hovered lines
   */
  highlightLines() {
    const _this = this;
    const KEY = this.KEY;
    const OPACITY_HIGHLT = 1.0;
    const OPACITY_HIGHLT_DIM = 0.3;
    const OPACITY_SELECT = 1.0;
    const OPACITY_REGULAR = this.ui.opacityRegular;
    const OPACITY_SELECT_DIM = this.ui.opacitySelectDim;
    const {
      entityLines,
      entityLabels
    } = this.DOM;
    const {
      selected: { data: { filter: selectedFilter } },
      highlighted: { data: { filter: highlightedFilter } },
    } = this.MDL;
    
    const someHighlighted = (highlightedFilter.any());
    this.someSelected = (selectedFilter.any());

    // when pointer events need update...

    this.nonSelectedOpacityZero = OPACITY_SELECT_DIM < 0.01;
    const selectedHash = {};
    selectedFilter.markers.forEach((v, k) => {
      selectedHash[k] = true;
    }
    );
    entityLines.style("opacity", (d) => {
      if (highlightedFilter.has(d)) return OPACITY_HIGHLT;
      if (_this.someSelected) {
        return selectedHash[d[KEY]] ? OPACITY_SELECT : OPACITY_SELECT_DIM;
      }
      if (someHighlighted) return OPACITY_HIGHLT_DIM;
      return OPACITY_REGULAR;
    });
    entityLabels.style("opacity", (d) => {
      if (highlightedFilter.has(d)) {
        d.sortValue = 1;
        return OPACITY_HIGHLT;
      } else {
        d.sortValue = 0;
      }
      if (_this.someSelected) {
        return selectedHash[d[KEY]] ? OPACITY_SELECT : OPACITY_SELECT_DIM;
      }
      if (someHighlighted) return OPACITY_HIGHLT_DIM;
      return OPACITY_REGULAR;
    }).attr("pointer-events", d => {
      if(!_this.someSelected || !_this.nonSelectedOpacityZero || selectedHash[d[KEY]]) {
        d.hidden = false;
        return "visible";   
      } else {
        d.hidden = true;
        return "none";
      }
    })
      .sort(function(a, b){
        return d3.ascending(a.sortValue, b.sortValue);
      });

  }

  _zoomToMaxMin() {
    if (
      this.model.marker.axis_x.getZoomedMin() != null &&
      this.model.marker.axis_x.getZoomedMax() != null) {
      this.xScale.domain([this.model.marker.axis_x.getZoomedMin(), this.model.marker.axis_x.getZoomedMax()]);
      this.xAxisEl.call(this.xAxis);
    }

    if (
      this.model.marker.axis_y.getZoomedMin() != null &&
      this.model.marker.axis_y.getZoomedMax() != null) {
      if ((this.model.marker.axis_y.getZoomedMin() <= 0 || this.model.marker.axis_y.getZoomedMax() <= 0)
        && this.model.marker.axis_y.scaleType == "log") {
        this.yScale = d3.scaleGenericlog()
          .domain([this.model.marker.axis_y.getZoomedMin(), this.model.marker.axis_y.getZoomedMax()])
          .range(this.yScale.range());
        this.model.marker.axis_y.scale = d3.scaleGenericlog()
          .domain([this.model.marker.axis_y.getZoomedMin(), this.model.marker.axis_y.getZoomedMax()])
          .range(this.yScale.range());
        this.yScale = this.model.marker.axis_y.scale;
      } else {
        this.yScale.domain([this.model.marker.axis_y.getZoomedMin(), this.model.marker.axis_y.getZoomedMax()]);
      }
      this.yAxisEl.call(this.yAxis);
    }
  }

  /**
   * Returns key from obj which value from values has the smallest difference with val
   */
  _getNearestKey(val, values, propName, fn) {
    const keys = (this.someSelected && this.nonSelectedOpacityZero) ?
      [...this.MDL.selected.data.filter.markers.keys()].filter(key => values.hasByStr(key))
      :
      [...values.keys()];

    let resKey = keys[0];
    for (let i = 1; i < keys.length; i++) {
      let key = keys[i];
      
      if (Math.abs((fn ? fn(values.getByStr(key)[propName]) : values.getByStr(key)[propName]) - val) < Math.abs((fn ? fn(values.getByStr(resKey)[propName]) : values.getByStr(resKey)[propName]) - val)) {
        resKey = key;
      }
    }
    return resKey;
  }

  _alias(enc) {
    return this.state.alias[enc] || enc;
  }

}

_VizabiLineChart.DEFAULT_UI = {
  showForecast: false,
  showForecastOverlay: true,
  pauseBeforeForecast: true,
  opacityHighlight: 1.0,
  opacitySelect: 1.0,
  opacityHighlightDim: 0.1,
  opacitySelectDim: 0.3,
  opacityRegular: 0.5,
  hideXAxisValue: false,
  curve: "curveMonotoneX",
  whenHovering: {
    showTooltip: false,
    hideVerticalNow: false,
    showProjectionLineX: false,
    showProjectionLineY: false,
    higlightValueX: false,
    higlightValueY: false
  },
  labels: {
    min_number_of_entities_when_values_hide: 3,
  }
};

export const VizabiLineChart = decorate(_VizabiLineChart, {
  "MDL": computed,
  "height": computed,
  "width": computed,
  "profileConstants": computed
});