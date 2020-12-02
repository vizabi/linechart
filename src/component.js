import {
  BaseComponent,
  Icons,
  LegacyUtils as utils,
  Utils,
  collisionResolver,
  axisSmart
} from "VizabiSharedComponents";
import { runInAction } from "mobx";

const {ICON_WARN, ICON_QUESTION} = Icons;
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
export default class VizabiLineChart extends BaseComponent {

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

              <g class="vzb-data-warning vzb-noexport">
                  <svg></svg>
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
    this.state = {
      showForecastOverlay: false,
      opacityHighlightDim: 0.1,
      opacitySelectDim: 0.3,
      opacityRegular: 1,
      datawarning: {
        doubtDomain: [],
        doubtRange: []
      },
      "chart": {
        "curve": "curveMonotoneX",
        "labels": {
          "min_number_of_entities_when_values_hide": 2 //values hide when showing 2 entities or more
        },
        "whenHovering": {
          "hideVerticalNow": false,
          "showProjectionLineX": true,
          "showProjectionLineY": true,
          "higlightValueX": true,
          "higlightValueY": true,
          "showTooltip": false
        }
      }
    };

    this.DOM = {
      element: this.element,
      graph: this.element.select(".vzb-lc-graph"),

      xAxisElContainer: this.element.select(".vzb-lc-axis-x"),
      yAxisElContainer: this.element.select(".vzb-lc-axis-y"),
  
      xTitleEl: this.element.select(".vzb-lc-axis-x-title"),
      yTitleEl: this.element.select(".vzb-lc-axis-y-title"),
      yInfoEl: this.element.select(".vzb-lc-axis-y-info"),
      linesContainerCrop: this.element.select(".vzb-lc-lines-crop"),
      linesContainer: this.element.select(".vzb-lc-lines"),
      labelsContainerCrop: this.element.select(".vzb-lc-labels-crop"),
      labelsContainer: this.element.select(".vzb-lc-labels"),

      dataWarningEl: this.element.select(".vzb-data-warning"),

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

  draw() {
    this.MDL = {
      frame: this.model.encoding.get("frame"),
      selected: this.model.encoding.get("selected"),
      highlighted: this.model.encoding.get("highlighted"),
      x: this.model.encoding.get("x"),
      y: this.model.encoding.get("y"),
      color: this.model.encoding.get("color"),
      label: this.model.encoding.get("label")
    };
    this.localise = this.services.locale.auto();

    this.yAxis.tickFormat(this.localise);
    this.xAxis.tickFormat(this.localise);
    
    this.TIMEDIM = this.MDL.frame.data.concept;
        
    if (this.updateLayoutProfile()) return; //return if exists with error
    
    this.addReaction(this.drawForecastOverlay);
    this.addReaction(this.constructScales);
    this.addReaction(this.constructColorScale);

    this.addReaction(this.setupIcons);
    this.addReaction(this.setupEventHandlers);
    this.addReaction(this.setupDataWarningDoubtScale);
  
    this.addReaction(this.updateTime);
    this.addReaction(this.updateUIStrings);
    this.addReaction(this.updateShow);
    this.addReaction(this.updateColors);
    this.addReaction(this.updateSize);

    this.addReaction(this.redrawDataPoints);
    this.addReaction(this.highlightLines);
    this.addReaction(this.updateDoubtOpacity);
  
  }

  constructScales() {
    const zoomedX = this.MDL.x.scale.zoomed;
    const zoomedY = this.MDL.y.scale.zoomed;
    this.xScale = this.MDL.x.scale.d3Scale.copy();
    this.xScale.domain(zoomedX);
    this.MDL.frame.scale.config.domain = zoomedX;

    this.yScale = this.MDL.y.scale.d3Scale.copy();
    this.yScale.domain(zoomedY);

    this.collisionResolver.scale(this.yScale);
  }

  constructColorScale() {
    this.cScale = this.MDL.color.scale.d3Scale.copy();
  }

  drawForecastOverlay() {
    this.DOM.forecastOverlay.classed("vzb-hidden", 
      !this.MDL.frame.endBeforeForecast || 
      !this.state.showForecastOverlay || 
      (this.MDL.frame.value <= this.MDL.frame.endBeforeForecast)
    );
  }

  setupIcons() {
    const {
      yInfoEl,
      dataWarningEl
    } = this.DOM;

    utils.setIcon(yInfoEl, ICON_QUESTION).select("svg")
      .attr("width", "0px").attr("height", "0px");

    utils.setIcon(dataWarningEl, ICON_WARN).select("svg")
      .attr("width", "0px").attr("height", "0px");
    dataWarningEl.append("text")
      .attr("text-anchor", "end");
  }

  setupEventHandlers() {
    const {
      yTitleEl,
      yInfoEl,
      dataWarningEl
    } = this.DOM;
    const _this = this;

    yTitleEl
      .on("click", () => {
        this.root.findChild({type: "TreeMenu"})
          .encoding("y")
          .alignX("left")
          .alignY("top")
          .updateView()
          .toggle();
      });

    const dataNotes = this.root.findChild({type: "DataNotes"});

    yInfoEl
      .on("click", () => {
        dataNotes.pin();
      })
      .on("mouseover", function() {
        const rect = this.getBBox();
        const ctx = utils.makeAbsoluteContext(this, this.farthestViewportElement);
        const coord = ctx(rect.x - 10, rect.y + rect.height + 10);
        dataNotes
          .setEncoding(_this.MDL.y)
          .show()
          .setPos(coord.x, coord.y);
      })
      .on("mouseout", () => {
        dataNotes.hide();
      });
    
    dataWarningEl
      .on("click", () => {
        this.root.findChild({type: "DataWarning"}).toggle();
      })
      .on("mouseover", () => {
        this.updateDoubtOpacity(1);
      })
      .on("mouseout", () => {
        this.updateDoubtOpacity();
      });

  }

  setupDataWarningDoubtScale() {
    this.wScale = d3.scaleLinear()
      .domain(this.state.datawarning.doubtDomain)
      .range(this.state.datawarning.doubtRange);
  }

  _getLabelText(d) {
    const labelObj = d.values ? d.values[0].label : d.label;
    const dimensionsWithoutTime = this.model.data.space.filter(dim => dim !== this.TIMEDIM);
    return dimensionsWithoutTime.map(dim => labelObj[dim]).join(",");
  }

  updateUIStrings() {
    const conceptPropsY = Utils.getConceptProps(this.MDL.y, this.localise);
    const conceptPropsX = Utils.getConceptProps(this.MDL.x, this.localise);
    const conceptPropsColor = Utils.getConceptProps(this.MDL.color, this.localise);

    this.strings = {
      title: {
        Y: conceptPropsY.name,
        X: conceptPropsX.name,
        C: conceptPropsColor.name,
      },
      unit: {
        Y: conceptPropsY.unit || "",
        X: conceptPropsX.unit || "",
        C: conceptPropsColor.unit || ""
      }
    };

    this.DOM.yInfoEl
      .style("opacity", Number(Boolean(conceptPropsY.description || conceptPropsY.sourceLink)));

    // if (this.strings.unit.Y === "unit/" + this.model.marker.axis_y.which) this.strings.unit.Y = "";
    // if (this.strings.unit.X === "unit/" + this.model.marker.axis_x.which) this.strings.unit.X = "";
    // if (this.strings.unit.C === "unit/" + this.model.marker.color.which) this.strings.unit.C = "";

    // if (this.strings.unit.Y) this.strings.unit.Y = ", " + this.strings.unit.Y;
    // if (this.strings.unit.X) this.strings.unit.X = ", " + this.strings.unit.X;
    // if (this.strings.unit.C) this.strings.unit.C = ", " + this.strings.unit.C;
    
  }

  updateTime() {
    const { frame } = this.MDL;
    const time_1 = (this.time === null) ? frame.value : this.time;
    this.time = frame.value;
    this.duration = frame.playing && (this.time - time_1 > 0) ? frame.speed || 0 : 0;

    this.stepIndex = frame.stepScale.invert(this.time);
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
    return data;
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
    
    const {
      frame
    } = this.MDL;

    this.cached = {};

    const TIMEDIM = this.TIMEDIM;
    this.data = [...this._processFramesData().values()].map(d => {
      d.shiftIndex = frame.stepScale.invert(d.values[0][TIMEDIM]);
      return d;
    });
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

    this.addValueToLabel = this.data.length < this.state.chart.labels.min_number_of_entities_when_values_hide;

    entityLabels.each(function(d) {
      const entity = d3.select(this);

      const label = d.label = _this._getLabelText(d);
      d.name = label.length < 13 ? label : label.substring(0, 10) + "...";//"…";

      if (!_this.addValueToLabel) { 
        entity.selectAll(".vzb-lc-labelname")
          .text(d.name);
      }

      const titleText = _this.addValueToLabel ? label : label + " " + _this.yAxis.tickFormat()((d.values[_this.stepIndex] || {}).y);
      entity.select("title").text(titleText);
    });

    //line template
    this.line = d3.line()
    //see https://bl.ocks.org/mbostock/4342190
    //"monotone" can also work. "basis" would skip the points on the sharp turns. "linear" is ugly
      .curve(d3[this.state.chart.curve || "curveMonotoneX"])
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

    const _this = this;
    const KEY = this.KEY;
    const TIMEDIM = this.TIMEDIM;
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
          .map(point => [point[TIMEDIM], point.y])
          .filter(d => d[1] || d[1] === 0);

        // add last point
        const currentY = (_this.model.dataMap.getByObjOrStr(undefined, d[KEY]) || {}).y;
        if (currentY || currentY === 0) {
          xy.push([_this.time, currentY]);
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
    verticalNow
      .transition()
      .duration(_this.duration)
      .ease(d3.easeLinear)
      .attr("transform", "translate(" + _this.xScale(_this.time//d3.min([_this.model.marker.axis_x.getZoomedMax(), _this.time])
      ) + ",0)");


    if (!this.hoveringNow && this.time - frame.start !== 0) {
      if (!_this.state.chart.hideXAxisValue) xAxisEl.call(
        this.xAxis
          .highlightTransDuration(this.duration)
          .highlightValue(this.time)
      );
      verticalNow.style("opacity", 1);
    } else {
      if (!this.state.chart.hideXAxisValue) xAxisEl.call(
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

  updateLayoutProfile() {
    this.services.layout.size;

    this.profileConstants = this.services.layout.getProfileConstants(PROFILE_CONSTANTS, PROFILE_CONSTANTS_FOR_PROJECTOR);
    this.height = this.element.node().clientHeight || 0;
    this.width = this.element.node().clientWidth || 0;
    if (!this.height || !this.width) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
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
      xTitleEl,
      yTitleEl,
      yInfoEl,
      dataWarningEl,
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


    const warnBB = dataWarningEl.select("text").node().getBBox();
    dataWarningEl.select("svg")
      .attr("width", warnBB.height * 0.75)
      .attr("height", warnBB.height * 0.75)
      .attr("x", -warnBB.width - warnBB.height * 1.2)
      .attr("y", -warnBB.height * 0.65);

    dataWarningEl
      .attr("transform", "translate(" + (this.cropWidth + marginRightAdjusted * 0.85) +
        ",-" + yAxisTitleBottomMargin + ")")
      .select("text").text(this.localise("hints/dataWarning"));

    const xTitleText = xTitleEl.select("text").text(this.strings.title.X + this.strings.unit.X);

    xTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" +
        (this.cropWidth + text_padding + yAxisTitleBottomMargin) + "," +
        (this.cropHeight + xTitleText.node().getBBox().height  * 0.72) + ")");

    if (xTitleText.node().getBBox().width > this.cropWidth - 100) xTitleText.text(this.strings.title.X);

    const yTitleText = yTitleEl.select("text").text(this.strings.title.Y + this.strings.unit.Y);
    if (yTitleText.node().getBBox().width > this.cropWidth) yTitleText.text(this.strings.title.Y);

    yTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" + (10 - margin.left + (isRTL ? infoElHeight * 1.4 : 0 )) + ", -" + yAxisTitleBottomMargin + ")");

    const titleBBox = yTitleEl.node().getBBox();
    const t = utils.transform(yTitleEl.node());

    yInfoEl.attr("transform", "translate("
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
      xAxisEl.call(this.xAxis.highlightValue(this.time));
      yAxisEl.call(this.yAxis.highlightValue("none"));
      graph.selectAll(".vzb-lc-entity").each(function() {
        d3.select(this).classed("vzb-dimmed", false).classed("vzb-hovered", false);
      });

      this.hoveringNow = null;
    }

  }

  updateDoubtOpacity(opacity) {
    if (opacity == null) opacity = this.wScale(+this.time.getUTCFullYear().toString());
    if (this.someSelected) opacity = 1;
    this.DOM.dataWarningEl.style("opacity", opacity);
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
    const nearestKey = _this._getNearestKey(mousePos, data, "y", _this.yScale.bind(_this));
    if (!data.hasByObjOrStr(undefined, nearestKey)) return;
    const resolvedValue = data.getByObjOrStr(undefined, nearestKey)["y"];
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

    if (_this.state.chart.whenHovering.showTooltip) {
      //position tooltip
      tooltip
      //.style("right", (_this.cropWidth - scaledTime + _this.marginRightAdjusted ) + "px")
        .style("left", (scaledTime + _this.margin.left) + "px")
        .style("bottom", (_this.cropHeight - scaledValue + _this.margin.bottom) + "px")
        .text(_this.yAxis.tickFormat()(resolvedValue))
        .classed("vzb-hidden", false);
    }

    // bring the projection lines to the hovering point
    if (_this.state.chart.whenHovering.hideVerticalNow) {
      verticalNow.style("opacity", 0);
    }

    if (_this.state.chart.whenHovering.showProjectionLineX) {
      projectionX
        .style("opacity", 1)
        .attr("y2", scaledValue)
        .attr("x1", scaledTime)
        .attr("x2", scaledTime);
    }
    if (_this.state.chart.whenHovering.showProjectionLineY) {
      projectionY
        .style("opacity", 1)
        .attr("y1", scaledValue)
        .attr("y2", scaledValue)
        .attr("x1", scaledTime);
    }

    if (_this.state.chart.whenHovering.higlightValueX) xAxisEl.call(
      _this.xAxis.highlightValue(resolvedTime).highlightTransDuration(0)
    );

    if (_this.state.chart.whenHovering.higlightValueY) yAxisEl.call(
      _this.yAxis.highlightValue(resolvedValue).highlightTransDuration(0)
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
      DOM.xAxisEl.call(_this.xAxis.highlightValue(_this.time));
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
      .sort(function(x, y){
        return d3.ascending(x.sortValue, y.sortValue);
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
      [...this.MDL.selected.data.filter.markers.keys()].filter(key => values.hasByObjOrStr(undefined, key))
      :
      [...values.keys()];

    let resKey = keys[0];
    for (let i = 1; i < keys.length; i++) {
      let key = keys[i];
      
      if (Math.abs((fn ? fn(values.getByObjOrStr(undefined, key)[propName]) : values.getByObjOrStr(undefined, key)[propName]) - val) < Math.abs((fn ? fn(values.getByObjOrStr(undefined, resKey)[propName]) : values.getByObjOrStr(undefined, resKey)[propName]) - val)) {
        resKey = key;
      }
    }
    return resKey;
  }

}

VizabiLineChart.DEFAULT_UI = {
  opacityHighlightDim: 0.1,
  opacitySelectDim: 0.3,
  opacityRegular: 1,
  defaultTest: {
    test3: "test3"
  }
};