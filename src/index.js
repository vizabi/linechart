import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataNotes,
  LocaleService,
  LayoutService,
  TreeMenu,
  SteppedSlider,
  ButtonList 
} from "VizabiSharedComponents";
import VizabiLineChart from "./component.js";

const VERSION_INFO = { version: __VERSION, build: __BUILD };

export default class LineChart extends BaseComponent {

  constructor(config){
    config.subcomponents = [{
      type: VizabiLineChart,
      placeholder: ".vzb-linechart",
      //model: this.model
      name: "chart"
    },{
      type: TimeSlider,
      placeholder: ".vzb-timeslider",
      name: "time-slider"
      //model: this.model
    },{
      type: SteppedSlider,
      placeholder: ".vzb-speedslider",
      name: "speed-slider"
      //model: this.model
    },{
      type: TreeMenu,
      placeholder: ".vzb-treemenu",
      name: "tree-menu"
      //model: this.model
    },{
      type: DataNotes,
      placeholder: ".vzb-datanotes",
      //model: this.model
    },{
      type: ButtonList,
      placeholder: ".vzb-buttonlist",
      name: "buttons"
      //model: this.model
    }];

    config.template = `
      <div class="vzb-linechart"></div>
      <div class="vzb-animationcontrols">
        <div class="vzb-timeslider"></div>
        <div class="vzb-speedslider"></div>
      </div>
      <div class="vzb-sidebar">
        <div class="vzb-buttonlist"></div>
      </div>
      <div class="vzb-treemenu"></div>
      <div class="vzb-datanotes"></div>
    `;

    config.services = {
      locale: new LocaleService(),
      layout: new LayoutService(config)
    };

    //register locale service in the marker model
    config.model.config.data.locale = config.services.locale;

    super(config);
  }
}
  
LineChart.default_model = {
    "state": {
      "time": {
        "autoconfig": {
          "type": "time"
        }
      },
      "entities": {
        "autoconfig": {
          "type": "entity_domain",
          "excludeIDs": ["tag"]
        }
      },
      "entities_colorlegend": {
        "autoconfig": {
          "type": "entity_domain",
          "excludeIDs": ["tag"]
        }
      },
      "marker": {
        limit: 5000,
        "space": ["entities", "time"],
        "axis_x": {
          "use": "indicator",
          "allow": { scales: ["time"] },
          "autoconfig": {
            "index": 0,
            "type": "time"
          }
        },
        "axis_y": {
          "use": "indicator",
          "allow": { scales: ["linear", "log"] },
          "autoconfig": {
            "type": "measure"
          }
        },
        "label": {
          "use": "property",
          "autoconfig": {
            "includeOnlyIDs": ["name"],
            "type": "string"
          }
        },
        "color": {
          "syncModels": ["marker_colorlegend"],
          "autoconfig": {}
        }
      },
      "marker_colorlegend": {
        "space": ["entities_colorlegend"],
        "label": {
          "use": "property",
          "which": "name"
        },
        "hook_rank": {
          "use": "property",
          "which": "rank"
        },
        "hook_geoshape": {
          "use": "property",
          "which": "shape_lores_svg"
        }
      }
    },
    locale: { },
    "ui": {
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
      },
      datawarning: {
        doubtDomain: [],
        doubtRange: []
      },
      "buttons": ["colors", "find", "moreoptions", "presentation", "sidebarcollapse", "fullscreen"],
      "dialogs": {
        "popup": ["colors", "find", "moreoptions"],
        "sidebar": ["colors", "find"],
        "moreoptions": ["opacity", "speed", "axes", "colors", "presentation", "technical", "about"],
        "dialog": {"find": {"panelMode": "show"}}
      },
      "presentation": false
    }
  }

  LineChart.versionInfo = VERSION_INFO


