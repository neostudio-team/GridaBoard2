import $ from "jquery";
import { EventDispatcher, EventCallbackType } from "nl-lib/common/event";
import { IBrushType, PenEventName, PEN_THICKNESS } from "nl-lib/common/enums";
import { IPenEvent } from "nl-lib/common/structures";
import ThemeManager from "GridaBoard/styles/ThemeManager"
import { INeoSmartpen, IPenToViewerEvent } from "nl-lib/common/neopen/INeoSmartpen";
import NeoSmartpen from "./NeoSmartpen";
import VirtualPen from "./VirtualPen";
import getText from "GridaBoard/language/language";
import { forceToRenderNav } from "../../GridaBoard/store/reducers/activePenReducer";

let _penmanager_instance = null as PenManager;
let _active_pen: INeoSmartpen = null;

export const DEFAULT_PEN_COLOR_NUM = 3;
export const DEFAULT_PEN_THICKNESS = PEN_THICKNESS.THICKNESS3;
export const DEFAULT_PEN_RENDERER_TYPE: IBrushType = IBrushType.PEN;

export default class PenManager {
  penArray: { id: string, mac: string, pen: INeoSmartpen, connected: boolean }[] = new Array(0);

  /** @type {Array.<StorageRenderer>} */
  // render = [];

  pen_colors: string[] = [
    "rgb(255,2,0)", // 10 RED #FFFF0200 #FF0000  rgb(255, 0, 0, 0)
    "rgb(229,229,229)", // 1 LIGHT_GRAY
    "rgb(151,151,151)", // 2 DARK_GARY #FFAAAAAA #A9A9A9
    "rgb(0,0,0)", // 3 BLACK #FF000000 #000000 

    "rgb(108,0,226)", // 4 NAVY #FF012EE2 #000080

    "rgb(1,46,226)", // 5 BLUE #FF00ABEB #0000FF 
    "rgb(0,171,235)", // 6 LIGHT_BLUE
    "rgb(60,221,0)", // 7 GREEN #FF3CDD00 #008000

    "rgb(255,208,1)", // 8 YELLOW #FFFFD001 #FFFF02
    "rgb(255,101,0)", // 9 ORANGE #FFFF6500 #FFA500 
    "rgb(255,2,0)" // 10 RED #FFFF0200 #FF0000  rgb(255, 0, 0, 0)
  ];

  marker_colors: string[] = [
    "rgb(222, 147, 159)", // 0
    "rgb(214, 215, 228)", // 1
    "rgb(191, 192, 205)", // 2
    "rgb(145, 146, 159)", // 3

    "rgb(178, 146, 227)", // 4

    "rgb(178, 192, 246)", // 5
    "rgb(145, 198, 230)", // 6
    "rgb(163, 213, 159)", // 7

    "rgb(222, 209, 159)", // 8
    "rgb(222, 176, 159)", // 9
    "rgb(222, 147, 159)" // 10
  ];

  color: string = this.pen_colors[DEFAULT_PEN_COLOR_NUM];
  thickness: number = DEFAULT_PEN_THICKNESS;
  penRendererType: IBrushType = DEFAULT_PEN_RENDERER_TYPE;


  dispatcher: EventDispatcher = new EventDispatcher();

  virtualPenSerial = 0;

  _virtualPen: INeoSmartpen;


  init = () => {
    this.setThickness(DEFAULT_PEN_THICKNESS);
    this.setPenRendererType(DEFAULT_PEN_RENDERER_TYPE);
    this.setColor(DEFAULT_PEN_COLOR_NUM);
  }

  getColorNum = (color: string) => {
    const index = this.pen_colors.findIndex((c) => c == color);
    return index;
  }

  constructor() {
    if (_penmanager_instance) return _penmanager_instance;


  }

  static getInstance() {
    if (_penmanager_instance) return _penmanager_instance;

    _penmanager_instance = new PenManager();
    return _penmanager_instance;
  }

  get virtualPen() {
    if (!this._virtualPen) {
      this._virtualPen = this.createVirtualPen();
    }

    return this._virtualPen;
  }

  /**
   *
   */
  public createPen = (): INeoSmartpen => {
    const pen = new NeoSmartpen();
    pen.addEventListener(PenEventName.ON_CONNECTED, this.onConnected);
    pen.addEventListener(PenEventName.ON_DISCONNECTED, this.onDisconnected);
    pen.addEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo);

    // kitty
    pen.addEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove);
    pen.addEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp);

    return pen;
  }

  
  // kitty
  onLivePenMove = (event: IPenToViewerEvent) => {
    this.dispatcher.dispatch(PenEventName.ON_PEN_MOVE, event);
  }

    // kitty
    onLivePenUp = (event: IPenToViewerEvent) => {
      this.dispatcher.dispatch(PenEventName.ON_PEN_UP, event);
    }
  
  public createVirtualPen = (): INeoSmartpen => {
    const pen = new VirtualPen();
    this.add(pen, { id: pen.id, name: pen.name });
    // this.setActivePen(pen.id);
    this.virtualPenSerial++;

    return pen;
  }


  onLivePenPageInfo = (event: IPenToViewerEvent) => {
    this.dispatcher.dispatch(PenEventName.ON_PEN_PAGEINFO, event);
  }

  /**
   *
   * @param pen
   * @param device
   */
  public add = (pen: INeoSmartpen, device: { id: string, name: string }) => {
    console.log(device);

    //test code
    if (pen.name === "NeoSmartPen" && device.name !== undefined) {
      const penNamePrefix = device.name.split('_', 1)
      if (penNamePrefix[0] === 'BLUE1' || penNamePrefix[0] === 'BLUE2') {
        this.setColor(5);
        this.setThickness(PEN_THICKNESS.THICKNESS5);
      }
      if (penNamePrefix[0] === 'RED1' || penNamePrefix[0] === 'RED2') {
        this.setColor(0);
        this.setThickness(PEN_THICKNESS.THICKNESS5);
      }
    }

    this.penArray.push({
      id: device.id,
      mac: pen.getMac(),
      pen,
      connected: false
    });

    console.log(`PenManager: pen added, mac=${pen.getMac()}`);
  }

  /**
   *
   * @param device
   */
  public isAlreadyConnected = (device: BluetoothDevice): boolean => {
    const index = this.penArray.findIndex(function(pen) {
      if (pen.id === device.id && pen.connected === true) {
        return true;
      }
    });
    if (index > -1) return true;

    return false;
  }

  /**
   *
   * @param pen
   */
  private removePen = (pen: INeoSmartpen) => {
    const btDeviceId = pen.getBtDevice().id;

    const index = this.penArray.findIndex(penInfo => penInfo.id === btDeviceId);
    if (index > -1) {
      this.penArray.splice(index, 1);
    }
  }

  setActivePen = async (penId: string) => {
    _active_pen = await this.penArray.find(penInfo => penInfo.pen.mac === penId).pen;
    
    const activePenColor = _active_pen.penState[_active_pen.penRendererType].color;
    const activePenThickness = _active_pen.penState[_active_pen.penRendererType].thickness;

    const color_num = this.pen_colors.indexOf(activePenColor);
    
    this.setColor(color_num);
    this.setPenRendererType(_active_pen.penRendererType);
    this.setThickness(activePenThickness)

    forceToRenderNav();
  }

  setColor(color_num: number) {
    this.color = this.pen_colors[color_num];

    if (_active_pen) {
      _active_pen.setColor(this.color);
    }
    this._virtualPen.setColor(this.color);
    this.dispatcher.dispatch(PenEventName.ON_COLOR_CHANGED, this);
  }

  toggleColorRadioButton(color_num: number) {
    const $elem = $(`.color_${color_num}`);
    this.toggleColorRadioButton_inner(undefined, $elem);
  }

  toggleColorRadioButton_inner(e, $elem) {
    if ($elem === undefined) {
      $elem = $(e.target);
    }
    if ($elem.hasClass("color_icon")) {
      $(".color_icon").each(function () {
        $(this).removeClass("pressed");
      });
      $elem.addClass("pressed");
    }
  }

  setPenRendererType(type: IBrushType) {
    this.penRendererType = type;

    if (_active_pen) {
      _active_pen.setPenRendererType(this.penRendererType);
      _active_pen.setColor(this.color);
    }

    this._virtualPen.setPenRendererType(this.penRendererType);
    this._virtualPen.setColor(this.color);

    //펜 타입이 변경 되었을 경우, thickness 데이터를 받아와 아이콘을 변경해준다    
    const thickness = this._virtualPen.getThickness() as PEN_THICKNESS;
    this.thickness = thickness;


    this.dispatcher.dispatch(PenEventName.ON_PEN_THICKNESS_CHANGE, this);
    this.dispatcher.dispatch(PenEventName.ON_PEN_TYPE_CHANGED, this);
  }

  setPenTypeStatus($elem, type) {
    if (type == IBrushType.MARKER) {
      $elem.removeClass("state_0");
      $elem.removeClass("state_2");

      $elem.addClass("state_1");
    } else if (type == IBrushType.ERASER) {
      $elem.removeClass("state_0");
      $elem.removeClass("state_1");

      $elem.addClass("state_2");
    } else if (type == IBrushType.PEN) {
      $elem.removeClass("state_1");
      $elem.removeClass("state_2");

      $elem.addClass("state_0");
    }
  }

  getThickness() {
    if (_active_pen) {
      return _active_pen.getThickness();
    } else {
      return this.thickness;
    }
  }

  setThickness(thickness: PEN_THICKNESS) {
    this.thickness = thickness;

    if (_active_pen) {
      _active_pen.setThickness(this.thickness);
    }
    this._virtualPen.setThickness(this.thickness);
    
    this.dispatcher.dispatch(PenEventName.ON_PEN_THICKNESS_CHANGE, this);
  }

  // registerRenderContainer = (renderContainer) => {
  //   this.render.push(renderContainer);
  // }

  // unregisterRenderContainer = (renderContainer) => {
  //   const sameRender = (item) => item === renderContainer;
  //   const index = this.penArray.findIndex(sameRender);

  //   if (index > -1) {
  //     this.render.splice(index, 1);
  //   }
  // }


  /**
   *
   * @param opt
   */
  public onConnected = (opt: { pen: INeoSmartpen, event: IPenEvent }) => {
    const { pen } = opt;
    const btDeviceId = pen.getBtDevice().id;

    const index = this.penArray.findIndex(penInfo => penInfo.id === btDeviceId);

    if (index > -1) {
      this.penArray[index].connected = true;
    }
    else {
      console.log("PenManager: something wrong, un-added pen connected");
      this.penArray.push({ id: pen.getBtDevice().id, mac: pen.getMac(), pen, connected: true });
    }

    const themeManager = ThemeManager.getInstance();
    themeManager.enablePenRelatedButtons(true);
  }

  /**
   *
   * @param opt
   */
  public onDisconnected = (opt: { pen: INeoSmartpen, event: IPenEvent }) => {
    const { pen } = opt;
    const btDeviceId = pen.getBtDevice().id;
    
    const index = this.penArray.findIndex(penInfo => penInfo.id === btDeviceId);
    
    if (index > -1) {
      alert(getText('pen_disconnected_alert'));
      this.penArray.splice(index, 1);
    }
    else {
      console.log("PenManager: something wrong, un-added pen disconnected");
    }

  }

  /**
   *
   * @param opt
   */
  public onNcodeError = (opt: { pen: INeoSmartpen, event: IPenEvent }) => {
    // const { pen, event } = opt;

  }

  /**
   *
   */
  getConnectedPens = (): INeoSmartpen[] => {
    /** @type {Array<NeoSmartpen>} */
    const ret = new Array(0);

    this.penArray.forEach(penInfo => {
      if (penInfo.connected) {
        ret.push(penInfo.pen);
      }
    });

    return ret;
  }



  public addEventListener(eventName: PenEventName, listener: EventCallbackType) {
    this.dispatcher.on(eventName, listener, null);
  }


  /**
   *
   * @param eventName
   * @param listener
   */
  public removeEventListener(eventName: PenEventName, listener: EventCallbackType) {
    this.dispatcher.off(eventName, listener);
  }

}