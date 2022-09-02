import { EventDispatcher, EventCallbackType } from "nl-lib/common/event";
import PenManager from "./PenManager";
import PUIController from "GridaBoard/components/PUIController";
import { IBrushState, IPenEvent, NeoDot, NeoStroke, TransformParameters } from "nl-lib/common/structures";
import { IBrushType, PEN_STATE, PenEventName, PEN_THICKNESS, DeviceTypeEnum } from "nl-lib/common/enums";
import { InkStorage, IOpenStrokeArg } from "nl-lib/common/penstorage";
import { IPenToViewerEvent, INeoSmartpen } from "nl-lib/common/neopen/INeoSmartpen";
import { sprintf } from "sprintf-js";


interface IPenMovement {
  downEvent: IPenEvent,
  infoEvent: IPenEvent,
  moveEvents: IPenEvent[],
  upEvent: IPenEvent,
  numMovement: number,
  stroke: NeoStroke,
}

const NUM_HOVER_POINTERS = 6;

export default class VirtualPen implements INeoSmartpen {
  private currPenMovement: IPenMovement = {
    downEvent: null,
    infoEvent: null,
    moveEvents: [],
    upEvent: null,
    numMovement: 0,
    stroke: null,
  };

  /** 펜 종류 마다의 굵기와 색깔 */
  penState: IBrushState[] = new Array(Object.keys(IBrushType).length);

  /** 펜 종류 (렌더러 종류) */
  penRendererType: IBrushType = IBrushType.PEN;

  mac: string = null;
  id: string = null;
  name?: string = "VirtualPen";
  rotationIndep = true;

  lastState: PEN_STATE = PEN_STATE.NONE;

  storage: InkStorage = InkStorage.getInstance();
  manager: PenManager = PenManager.getInstance();
  dispatcher: EventDispatcher = new EventDispatcher();

  h: TransformParameters;
  h_origin: TransformParameters;
  penDownTime: number;
  
  deviceType : DeviceTypeEnum;
  
  hoverSOBP:{
    isHover : boolean,
    section : number,
    owner : number,
    book : number,
    page : number,
    time : number
  } = {
    isHover : false,
    section : -1,
    owner : -1,
    book : -1,
    page : -1,
    time : -1
  }
  /**
   *
   * @param customStorage
   */
  constructor(customStorage: InkStorage = null) {
    // this.surfaceInfo = g_paperType.definition[g_paperType.defaultKey];

    // this.appPen = appPenHandler;
    if (customStorage) {
      console.log("use custom Ink Storage");
      this.storage = customStorage;
    }
    else {
      console.log("use default Ink Storage");
      this.storage = InkStorage.getInstance();
    }

    const color = this.manager.color;
    for (let i = 0; i < this.penState.length; i++) {
      this.penState[i] = {
        thickness: PEN_THICKNESS.THICKNESS3,
        color: color,
      };
    }

    const date = Date.now();
    const hex = sprintf("%012x", date);

    this.mac = sprintf("%2s:%2s:%2s:%2s:%2s:%2s",
      hex.substr(0, 2),
      hex.substr(2, 2),
      hex.substr(4, 2),
      hex.substr(6, 2),
      hex.substr(8, 2),
      hex.substr(10, 2));

    this.id = this.mac;
    this.deviceType = DeviceTypeEnum.PEN;
  }

  /**
   *
   */
  getMac = (): string => {
    return this.mac;
  }

  getPenName = (): string => {
    return this.name;
  }

  /**
   *
   */
  getBtDevice = (): BluetoothDevice => {
    return undefined;
  }
  getThickness = (): number => {
    return this.penState[this.penRendererType].thickness;
  }

  /**
   *
   */
  connect(opt?:any): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disConnect():void { }

  /**
   *
   * @param device
   */
  async connectByWebBtDevice(device: BluetoothDevice) {
    return true;
  }


  /**
   *
   * @param mac
   */
  async connectByMacAddress(mac: string) {
    throw new Error(`connectByMacAddress() not implemented yet.`);
    return false;
  }

  /**
   *
   */
  resetPenStroke = () => {
    // let { currPenMovement} = this;
    const p = this.currPenMovement;

    p.downEvent = null;
    p.infoEvent = null;
    p.numMovement = 0;
    p.moveEvents = [];
    p.upEvent = null;
  }

  processPenDown = (event: IPenEvent) => {
    // event: { timeStamp: number, penTipMode: number }

    // pen down 처리
    const mac = this.mac;
    const time = event.timeStamp;
    const openStrokeArg: IOpenStrokeArg = {
      mac,
      time,
      penTipMode: event.penTipMode,
      brushType: this.penRendererType,
      thickness: this.penState[this.penRendererType].thickness,
      color: this.penState[this.penRendererType].color,
      h: this.h,
      h_origin: this.h_origin,
    }

    const stroke = this.storage.openStroke(openStrokeArg);
    const strokeKey = stroke.key;
    this.currPenMovement.stroke = stroke;

    return { strokeKey, mac, time, stroke };
  }

  /**
   *
   * @param event
   */
  onPenDown = (event: IPenEvent) => {
    this.resetPenStroke();
    this.currPenMovement.downEvent = event;
    this.lastState = PEN_STATE.PEN_DOWN;

    // storage에 저장
    if (!this.storage) {
      console.error("Ink Storage has not been initialized");
    }

    const penDownStrokeInfo = this.processPenDown(event);

    console.log(`NeoSmartpen dispatch event ON_PEN_DOWN`);
    this.dispatcher.dispatch(PenEventName.ON_PEN_DOWN, penDownStrokeInfo);

  }

  /**
   * 펜의 움직임
   *    1) down/up이 있는 경우: DOWN -> INFO -> MOVE -> MOVE -> ... -> UP -> INFO와 같이 나옴
   *    2) hove의 경우: (페이지가 바뀌면) INFO -> HOVER_MOVE -> HOVER_MOVE...
   *
   * pen down 된 후의 page info, 실질적으로 pen_down과 같음
   *
   * @param event
   * @param hover
   */
  onPageInfo = (event: IPenEvent, hover: boolean) => {
    // event: { section:number, owner:number, book:number, page:number, timeStamp:number }



    // // console.log(event);
    // this.lastInfoEvent = event;


    // // margin 값을 가져오기 위해서
    // const info = PaperInfo.getPaperInfo({ section: event.section, book: event.book, owner: event.owner, page: event.page });
    // if (info) this.surfaceInfo = info;

    // 이전에 펜 down이 있었으면
    if (this.lastState === PEN_STATE.PEN_DOWN) {
      this.currPenMovement.infoEvent = event;
      if (!this.storage) {
        console.error("Ink Storage has not been initialized");
      }
      else {
        const { section, owner, book, page, timeStamp } = event;
        const mac = this.mac;
        if (!mac) {
          throw new Error("mac address was not registered");
        }

        if (!hover) {
          // storage에 저장
          const stroke = this.currPenMovement.stroke;
          const strokeKey = stroke.key;
          this.storage.setStrokeInfo(strokeKey, section, owner, book, page, timeStamp);

          // hand pen page the event
          this.dispatcher.dispatch(PenEventName.ON_PEN_PAGEINFO, {
            strokeKey, mac, stroke, section, owner, book, page,
            time: event.timeStamp
          });
        }
        else {
          // hand hover page the event
          this.dispatcher.dispatch(PenEventName.ON_PEN_HOVER_PAGEINFO, {
            mac, section, owner, book, page, time: event.timeStamp
          });

        }
      }

      // let ph = this.appPen;
      // ph.onPageInfo(event);
    }



    if (hover) {
      const { section, owner, book, page, timeStamp } = event;
      const mac = this.mac;

      this.dispatcher.dispatch(PenEventName.ON_PEN_HOVER_PAGEINFO, {
        mac, section, owner, book, page, time: timeStamp, pen: this
      });
    }

    // event 전달
    // let ph = this.appPen;
    // if (hover) ph.onHoverPageInfo(event);

    return;
  }


  /**
   * pen down 상태에서 움직임
   * @param event
   */
  onPenMove = (event: IPenEvent) => {
    // event: {section, owner, book, page, timediff, timeStamp, force, x, y, isFirstDot}


    this.lastState = PEN_STATE.PEN_MOVE;

    // margin을 paperInfo의 Xmin, Ymin 값에 따라 조정
    // event = this.adjustPaperXminYmin(event);

    // 기존의 방식에서는 처리하지 않았던 것, redundant할 수 있다.
    if (this.currPenMovement.infoEvent) {
      event.section = this.currPenMovement.infoEvent.section;
      event.owner = this.currPenMovement.infoEvent.owner;
      event.book = this.currPenMovement.infoEvent.book;
      event.page = this.currPenMovement.infoEvent.page;
    } else {
      /**
       * 종이에 터치되지 않고 들어오는 호버 이벤트
       *
       */
      event.section = -1;
      event.owner = -1;
      event.book = -1;
      event.page = -1;
      // let srcLine = getFunctionName();
      // console.error(`Get PEN_MOVE without PEN_INFO ${srcLine}`);
      // throw new Error( `Get PEN_MOVE without PEN_INFO`);
    }

    this.currPenMovement.numMovement++;
    event.isFirstDot = (this.currPenMovement.numMovement === 1);

    // storage에 저장
    if (!this.storage) {
      console.error("Ink Storage has not been initialized");
    }

    const dot = new NeoDot({
      dotType: 2,   // moving
      deltaTime: event.timediff,
      time: event.timeStamp,
      f: event.force,
      x: event.x,
      y: event.y,
    });

    const stroke = this.currPenMovement.stroke;
    const strokeKey = stroke.key;
    this.storage.appendDot(strokeKey, dot);
    const pen = this;

    if (event.owner === 1013 && event.book === 1116 && event.page === 1) {
      console.log("asdfasdfasfa");
      console.log(event.isFirstDot);
      event.isFirstDot = true;
      if (event.isFirstDot) {
        console.log("===================================");
        // var puis = window._pui;
        const puis = window._pui
        console.log(puis);
        let i;
        for (i = 0; i < puis.length; i++) {
          const pui = puis[i];
          console.log(pui);
          const cmd = pui.getCommand(event.owner, event.book, event.page, dot.x, dot.y);
          console.log(cmd);

          if (cmd) {
            console.log(`PUI EXECUTE ==> ${cmd}`);

            PUIController.executeCommand(cmd);
            break;
          }
        }
      }
    }

    // hand the event
    this.dispatcher.dispatch(PenEventName.ON_PEN_MOVE, { strokeKey, mac: stroke.mac, stroke, dot, pen, event } as IPenToViewerEvent);

    // 이벤트 전달
    // console.log("    -> onPenMove" + event);
    // let ph = this.appPen;
    // ph.onPenMove(event);
  }

  /**
   * hover 상태에서 움직임
   * @param event
   */
  onHoverMove = (event: IPenEvent) => {
    this.lastState = PEN_STATE.HOVER_MOVE;

    // margin을 paperInfo의 Xmin, Ymin 값에 따라 조정
    // event = this.adjustPaperXminYmin(event);

    // console.log("    -> onHoverMove" + event);
    // let ph = this.appPen;
    // ph.onHoverMove(event);
    const mac = this.mac;
    if (!mac) {
      throw new Error("mac address was not registered");
    }
    this.dispatcher.dispatch(PenEventName.ON_HOVER_MOVE, { pen: this, mac, event } as IPenToViewerEvent);
  }

  /**
  * hover 상태에서 움직임
  * @param event
  */
  onHoverPageInfo = (event: IPenEvent) => {
    this.lastState = PEN_STATE.HOVER_MOVE;

    const mac = this.mac;
    if (!mac) {
      throw new Error("mac address was not registered");
    }

    this.dispatcher.dispatch(PenEventName.ON_PEN_HOVER_PAGEINFO, { pen: this, mac, event } as IPenToViewerEvent);
  }


  processPenUp = (event: IPenEvent) => {
    const stroke = this.currPenMovement.stroke;
    const strokeKey = stroke.key;
    this.storage.closeStroke(strokeKey, this.h, this.h_origin);

    return { strokeKey, stroke };
  }

  /**
   * pen up
   * @param event
   */
  onPenUp = (event: IPenEvent) => {
    this.lastState = PEN_STATE.PEN_UP;

    this.currPenMovement.upEvent = event;

    // storage에 저장
    if (!this.storage) {
      console.error("Ink Storage has not been initialized");
    }

    this.dispatcher.dispatch(PenEventName.ON_PEN_UP_FOR_HOMOGRAPHY, this);//pen에 h, h_rev가 세팅된다.

    const penUpStrokeInfo = this.processPenUp(event);
    const { mac, section, owner, book, page } = penUpStrokeInfo.stroke;
    this.dispatcher.dispatch(PenEventName.ON_PEN_UP, { ...penUpStrokeInfo, mac, pen: this, section, owner, book, page });

    this.resetPenStroke();
  }

  /**
   * ncode error
   * @param event
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onNcodeError = (event: IPenEvent) => { }


  /**
   *
   * @param event
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onPasscodeRequired = (event: IPenEvent) => { }


  /**
   *
   * @param event
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onConnected = (event: IPenEvent) => { }


  /**
   *
   * @param event
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onFirmwareUpgradeNeeded = (event: IPenEvent) => { }


  /**
   *
   * @param event
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onDisconnected = (event: IPenEvent) => { }

  setColor(color: string) {
    this.penState[this.penRendererType].color = color;
  }

  setThickness(thickness: number) {
    this.penState[this.penRendererType].thickness = thickness;
  }

  setPenRendererType(type) {
    this.penRendererType = type;
  }

  /**
   *
   * @param eventName
   * @param listener
   */
  public addEventListener(eventName: PenEventName, listener: EventCallbackType) {
    if (eventName === PenEventName.ON_PEN_DOWN) {
      console.log(`NeoSmartpen: addEventListener ${eventName}`);
    }

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
