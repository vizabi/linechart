import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataWarning,
  DataNotes,
  LocaleService,
  LayoutService,
  TreeMenu,
  SteppedSlider,
  Dialogs,
  ButtonList 
} from "VizabiSharedComponents";
import VizabiLineChart from "./component.js";
import { observable } from "mobx";

const VERSION_INFO = { version: __VERSION, build: __BUILD };

export default class LineChart extends BaseComponent {

  constructor(config){
    const marker = config.model.stores.markers.get("line");

    config.name = "linechart";

    config.subcomponents = [{
      type: VizabiLineChart,
      placeholder: ".vzb-linechart",
      model: marker,
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
      model: marker
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
    }];

    config.template = `
      <div class="vzb-linechart"></div>
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
    `;

    config.services = {
      locale: new LocaleService(config.locale),
      layout: new LayoutService({placeholder: config.placeholder})
    };

    //register locale service in the marker model
    config.model.config.markers.line.data.locale = observable({
      get id() { return config.services.locale.id; }
    });
    //config.model.config.markers.line.data.locale = config.services.locale;

    super(config);
  }
}

LineChart.DEFAULT_UI = {
  chart: {
  },
};

LineChart.versionInfo = VERSION_INFO;


