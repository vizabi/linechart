import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataWarning,
  DataNotes,
  ErrorMessage,
  LocaleService,
  LayoutService,
  TreeMenu,
  SteppedSlider,
  Dialogs,
  ButtonList,
  CapitalVizabiService,
  Repeater,
  versionInfo
} from "@vizabi/shared-components";
import { VizabiLineChart } from "./linechart-cmp.js";
export default class LineChart extends BaseComponent {

  constructor(config){

    const marker = config.model.markers?.line;
    const markerLegend = config.model.markers?.legend;
    config.Vizabi.utils.applyDefaults(marker?.config || {}, LineChart.DEFAULT_MODEL.line);   
    config.Vizabi.utils.applyDefaults(markerLegend?.config || {}, LineChart.DEFAULT_MODEL.legend);  

    config.name = "linechart";

    config.subcomponents = [{
      type: Repeater,
      placeholder: ".vzb-repeater",
      model: marker,
      options: {
        repeatedComponent: VizabiLineChart,
        repeatedComponentCssClass: "vzb-linechart"
      },
      name: "chart"
    },{
      type: TimeSlider,
      placeholder: ".vzb-timeslider",
      model: marker,
      name: "time-slider"
    },{
      type: SteppedSlider,
      placeholder: ".vzb-speedslider",
      model: marker,
      name: "speed-slider"
    },{
      type: TreeMenu,
      placeholder: ".vzb-treemenu",
      model: marker,
      name: "tree-menu"
    },{
      type: DataWarning,
      placeholder: ".vzb-datawarning",
      options: {appendButtonHere: ".vzb-repeater"},
      model: marker,
      name: "data-warning"
    },{
      type: DataNotes,
      placeholder: ".vzb-datanotes",
      model: marker
    },{
      type: Dialogs,
      placeholder: ".vzb-dialogs",
      model: marker,
      name: "dialogs"
    },{
      type: ButtonList,
      placeholder: ".vzb-buttonlist",
      model: marker,
      name: "buttons"
    },{
      type: ErrorMessage,
      placeholder: ".vzb-errormessage",
      model: marker,
      name: "error-message"
    }];

    config.template = `
      <div class="vzb-repeater"></div>
      <div class="vzb-animationcontrols">
        <div class="vzb-timeslider"></div>
        <div class="vzb-speedslider"></div>
      </div>
      <div class="vzb-sidebar">
        <div class="vzb-dialogs"></div>
        <div class="vzb-buttonlist"></div>
      </div>
      <div class="vzb-treemenu"></div>
      <div class="vzb-datawarning"></div>
      <div class="vzb-datanotes"></div>
      <div class="vzb-errormessage"></div>
    `;

    config.locale.Vizabi = config.Vizabi;
    config.layout.Vizabi = config.Vizabi;
    config.services = {
      Vizabi: new CapitalVizabiService({Vizabi: config.Vizabi}),
      locale: new LocaleService(config.locale),
      layout: new LayoutService(config.layout)
    };

    super(config);
  }
}

LineChart.DEFAULT_UI = {
  "locale": { "id": "en", "shortNumberFormat": true },
  "layout": { "projector": false },

  "buttons": {
    "buttons": ["markercontrols", "colors", "moreoptions", "presentation", "sidebarcollapse", "fullscreen"]
  },
  "dialogs": {
    "dialogs": {
      "popup": ["colors", "markercontrols", "moreoptions"],
      "sidebar": ["colors", "markercontrols"],
      "moreoptions": ["opacity", "speed", "colors", "axes", "technical", "repeat", "presentation", "about"]
    },
    "markercontrols": {
      "disableSlice": true,
      "disableSwitch": false,
      "disableAddRemoveGroups": true,
      "primaryDim": null,
      "drilldown": null,
      "shortcutForSwitch": false,
      "shortcutForSwitch_allow": null
    }
  },
  "marker-contextmenu": {
    "primaryDim": null,
    "drilldown": null,
  },
  "time-slider": {
    "show_value": false
  },
  "chart": {
    "showForecast": false,
    "showForecastOverlay": true,
    "pauseBeforeForecast": true,
    "endBeforeForecast": null, //value like "2022", auto-resolved to current time minus one frame step
    "opacityHighlight": 1.0,
    "opacitySelect": 1.0,
    "opacityHighlightDim": 0.1,
    "opacitySelectDim": 0.3,
    "opacityRegular": 0.8,
    "hideXAxisValue": false,
    "curve": "curveMonotoneX", //curveBasis curveLinear curveMonotoneX curveCatmullRom curveNatural
    "whenHovering": {
      "showTooltip": false,
      "hideVerticalNow": false,
      "showProjectionLineX": true,
      "showProjectionLineY": true,
      "higlightValueX": true,
      "higlightValueY": true
    },
    "labels": {
      "min_number_of_entities_when_values_hide": 3
    }
  },
  "data-warning": {
    "enable": false,
    "margin": {
      "LARGE": { "bottom": 90 },
      "MEDIUM": { "bottom": 70 },
      "SMALL": { "bottom": 50 }
    }
  },
  "tree-menu": {
    "showDataSources": false,
    "folderStrategyByDataset": {}
  }
};


LineChart.DEFAULT_MODEL = {
  "line": {
    "requiredEncodings": ["x", "y"],
    "encoding": {
      "show": { "modelType": "selection" },
      "selected": { "modelType": "selection" },
      "highlighted": { "modelType": "selection" },
      "x": {
        "data": {
          "concept": { "ref": `markers.line.encoding.frame.data.concept` }
        },
        "scale": {
          "allowedTypes": ["time"]
        }
      },
      "y": {
        "data": { },
        "scale": {
          "allowedTypes": ["linear", "log", "genericLog", "pow"]
        }
      },
      "color": {
        "data": { 
          "constant": "_default",
          "concept": { "filter": { "concept_type": { "$in": ["entity_set", "entity_domain"]} } },
          "allow": { "space": { "filter": { "concept_type": { "$ne": "time" } } } }
        },
        "scale": {
          "modelType": "color"
        }
      },
      "label": { "data": { "modelType": "entityPropertyDataConfig" } },
      "frame": { "modelType": "frame", "speed": 200, "splash": true },
      "repeat": {
        "modelType": "repeat",
        "allowEnc": ["y", "x"]
      }
    }
  },
  "legend": {
    "data": {
      "ref": {
        "transform": "entityConceptSkipFilter",
        "path": "markers.line.encoding.color"
      }
    },
    "encoding": {
      "color": {
        "data": {
          "concept": { "ref": "markers.line.encoding.color.data.concept" },
          "constant": { "ref": "markers.line.encoding.color.data.constant" }
        },
        "scale": {
          "modelType": "color",
          "palette": { "ref": "markers.line.encoding.color.scale.palette" },
          "domain": null,
          "range": null,
          "type": null,
          "zoomed": null,
          "zeroBaseline": false,
          "clamp": false,
          "allowedTypes": null
        }
        //"scale": { "ref": "markers.line.encoding.color.scale" }
      },
      "name": { 
        "data": {
          "concept": {"filter": { "concept": { "$in": ["name"]} } }
        }
      },
      "order": {
        "modelType": "order",
        "direction": "asc",
        "data": {
          "concept": {"filter": { "concept": { "$in": ["rank"]} } }
        }
      },
      "map": { 
        "data": {
          "concept": {"filter": { "concept": { "$in": ["shape_lores_svg", "shape", "svg"]} } }
        }
      }
    }
  }
};

LineChart.versionInfo = { version: __VERSION, build: __BUILD, package: __PACKAGE_JSON_FIELDS, sharedComponents: versionInfo};