import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataWarning,
  DataNotes,
  ErrorMessage,
  SpaceConfig,
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

    const markerName = config.options?.markerNames?.line || "line";
    config.Vizabi.utils.applyDefaults(config.model.markers[markerName].config, LineChart.DEFAULT_CORE(markerName));  

    const marker = config.model.markers[markerName];

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
      options: {button: ".vzb-datawarning-button"},
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
      type: SpaceConfig,
      placeholder: ".vzb-spaceconfig",
      options: {button: ".vzb-spaceconfig-button"},
      model: marker,
      name: "space-config"
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
      <div class="vzb-spaceconfig"></div>
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
  chart: {
  },
};
LineChart.DEFAULT_CORE = (markerName) => ({
  requiredEncodings: ["x", "y"],
  encoding: {
    "selected": {
      modelType: "selection"
    },
    "highlighted": {
      modelType: "selection"
    },
    "y": {
      scale: {
        allowedTypes: ["linear", "log", "genericLog", "pow"]
      }
    },
    "x": {
      data: {
        concept: { 
          ref: `markers.${markerName}.encoding.frame.data.concept`
        }
      },
      scale: {
        allowedTypes: ["linear", "log", "genericLog", "pow", "time"]
      }
    },
    "color": {
      data: {
        concept: { filter: { concept_type: { $in: ["entity_set", "entity_domain"]} } },
        
        allow: {
          space: {
            filter: {
              concept_type: { $ne: "time" }
            }
          }
        }
      },
      scale: {
        modelType: "color"
      }
    },
    "label": {
      data: {
        modelType: "entityPropertyDataConfig",
      }
    },
    "repeat": {
      modelType: "repeat",
      allowEnc: ["y", "x"]
    },
    frame: {
      modelType: "frame"
    }
  }
});

LineChart.versionInfo = { version: __VERSION, build: __BUILD, package: __PACKAGE_JSON_FIELDS, sharedComponents: versionInfo};