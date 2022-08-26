import PenComm, { deviceSelectDlg } from "./pencomm/pencomm";
import PenManager, {DEFAULT_PEN_THICKNESS} from "./PenManager";
import { EventDispatcher, EventCallbackType } from "nl-lib/common/event";
import { IBrushState, IPenEvent, NeoDot, NeoStroke, StrokePageAttr, TransformParameters } from "nl-lib/common/structures";
import { IBrushType, PEN_STATE, PenEventName } from "nl-lib/common/enums";
import { InkStorage, IOpenStrokeArg } from "nl-lib/common/penstorage";
import { IPenToViewerEvent, INeoSmartpen } from "nl-lib/common/neopen/INeoSmartpen";
import { DefaultPUINcode } from "nl-lib/common/constants";
import { isSameNcode } from "nl-lib/common/util";
import { isPUI } from "nl-lib/common/noteserver";

import getText from "GridaBoard/language/language";
import PUIController from "GridaBoard/components/PUIController";
import { store } from "GridaBoard/client/pages/GridaBoard";

interface IPenMovement {
  downEvent: IPenEvent,
  infoEvent: IPenEvent,
  moveEvents: IPenEvent[],
  upEvent: IPenEvent,
  numMovement: number,
  stroke: NeoStroke,
}

const NUM_HOVER_POINTERS = 6;

export default class NeoSmartpen implements INeoSmartpen {
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

  // lastInfoEvent: IPenEvent = null;

  protocolHandler: PenComm = new PenComm(this);

  mac: string = null;

  id: string = null;

  rotationIndep = false;

  name?: string = "NeoSmartPen";

  lastState: PEN_STATE = PEN_STATE.NONE;

  calibrationPoint: any = { section: 0, owner: 0, book: 0, page: 0, x: 0, y: 0 };

  calibrationData: any = {
    section: 0, owner: 0, book: 0, page: 0, points: new Array(0),
  };

  storage: InkStorage = InkStorage.getInstance();
  manager: PenManager = PenManager.getInstance();
  dispatcher: EventDispatcher = new EventDispatcher();

  h: TransformParameters;
  h_origin: TransformParameters;
  
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
        thickness: DEFAULT_PEN_THICKNESS,
        color: color,
      };
    }


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
    return this.protocolHandler.getBtDevice();
  }
  getThickness = (): number => {
    return this.penState[this.penRendererType].thickness;
  }


  /**
   *
   */
  async connect(): Promise<boolean> {
    let device = null;
    try {
      device = await deviceSelectDlg();
    }
    catch (e) {
      console.log(e);
      return false;
    }

    if (this.manager.isAlreadyConnected(device)) {
      console.error(`bluetooth device(id:${device.id}) already connectged or connecting process is being processed`);
      return false;
    }

    if (device) {
      this.protocolHandler.connect(device);
      this.manager.add(this, device);
    }
    else {
      console.error("Device NULL");
      return false;
    }

    return true;
  }


  /**
   *
   * @param device
   */
  async connectByWebBtDevice(device: BluetoothDevice) {
    return this.protocolHandler.connect(device);
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

    this.manager.setActivePen(event.penId);

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
    else if (this.lastState === PEN_STATE.PEN_MOVE) {
      // 펜 move 중 페이지가 바뀌는 경우

      // 이것, 2.19에서는 버리는 듯, 2020/12/27 kitty
      // pen up 다음의 page info도 안나온다

      // 1) pen up 처리
      {
        const stroke = this.currPenMovement.stroke;
        stroke.set({ multiPage: StrokePageAttr.MULTIPAGE });

        const penUpStrokeInfo = this.processPenUp(event);
        const { mac, section, owner, book, page } = penUpStrokeInfo.stroke;

        console.log(`NeoSmartpen dispatch event VIRTUAL ON_PEN_UP`);
        this.dispatcher.dispatch(PenEventName.ON_PEN_UP_VIRTUAL, { ...penUpStrokeInfo, mac, pen: this, section, owner, book, page });
        this.resetPenStroke();

      }

      // 2) pen down처리
      {
        const penDownStrokeInfo = this.processPenDown(event);
        const stroke = penDownStrokeInfo.stroke;
        stroke.set({ multiPage: StrokePageAttr.MULTIPAGE });

        console.log(`NeoSmartpen dispatch event VIRTUAL ON_PEN_DOWN`);
        this.dispatcher.dispatch(PenEventName.ON_PEN_DOWN_VIRTUAL, penDownStrokeInfo);
      }

      // 3) page Info 처리
      const { section, owner, book, page, timeStamp } = event;
      const mac = this.mac;

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


    if (hover) {

      const { section, owner, book, page, timeStamp } = event;
      const mac = this.mac;
      if (store.getState().calibration.calibrationMode) {
        return;
      }
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

    if (store.getState().calibration.calibrationMode) {
      this.calibrationData.points.push({
        x: event.x,
        y: event.y,
        f: event.force,
      })
      return;
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
    
    const pageInfo = {
      section: event.section, owner: event.owner, book: event.book, page: event.page
    }
     
    if (isPUI(pageInfo)) {
      if (event.isFirstDot) {
        console.log("===================================");
        // let puis = window._pui;
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
      return;
    }

    const stroke = this.currPenMovement.stroke;
    const strokeKey = stroke.key;
    const pen = this;

    // hand the event
    this.storage.appendDot(strokeKey, dot);
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
    if (store.getState().calibration.calibrationMode) {
      return;
    }

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
    if (store.getState().calibration.calibrationMode) {
      return;
    }

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

    const pageInfo = {
      section: event.section, owner: event.owner, book: event.book, page: event.page
    }
    if (isSameNcode(pageInfo, DefaultPUINcode) || isPUI(pageInfo)) {
      return;
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
  onNcodeError = (event: IPenEvent) => {
    // console.log(event);

    // let ph = this.appPen;
    // ph.onNcodeError(event);
    const mac = this.mac;
    if (!mac) {
      throw new Error("mac address was not registered");
    }

    this.manager.onNcodeError({ pen: this, event });
    this.dispatcher.dispatch(PenEventName.ON_NCODE_ERROR, { pen: this, mac, event });
  }



  /**
   *
   * @param event
   */
  onPasscodeRequired = (event: IPenEvent) => {
    console.log("onPasscodeRequired" + event);
    const retryCount = event.retryCount === undefined ? 0 : event.retryCount;
    let guide = "";
    if(retryCount >= 10) {
      alert(getText('reset_penData'));
      return ;
    }

    if (retryCount > 0) {
      guide = "\n" + getText("bluetooth_needPw_wrong").replace("%d", retryCount.toString());
    }
    const passcode = prompt(getText("bluetooth_needPw") + guide);
    if (passcode === null) return;
    
    if (passcode.length !== 4) {
      alert(getText("pw_is_four_digits"))
    }

    this.protocolHandler.sendPasscode(passcode);

    const mac = this.protocolHandler.getMac();
    if (!mac) {
      throw new Error("mac address was not registered");
    }
    this.dispatcher.dispatch(PenEventName.ON_PW_REQUIRED, { pen: this, mac, event });
    // throw new Error("Not implemented: onPasscodeRequired");
  }



  /**
   *
   * @param event
   */
  onConnected = (event: IPenEvent) => {
    // let ph = this.appPen;
    // ph.onConnected(event);

    console.log("CONNECTED");
    const mac = this.protocolHandler.getMac();
    this.mac = mac;
    console.log(`Connected: ${mac}`);

    this.setThickness(this.manager.thickness);
    this.setPenRendererType(this.manager.penRendererType);
    this.setColor(this.manager.color);

    // this.manager.onConnected({ pen: this, event });
    this.dispatcher.dispatch(PenEventName.ON_CONNECTED, { pen: this, mac, event });
  }


  /**
   *
   * @param event
   */
  onFirmwareUpgradeNeeded = (event: IPenEvent) => {
    // let ph = this.appPen;
    // ph.onFirmwareUpgradeNeeded(event);

    const mac = this.mac;
    if (!mac) {
      throw new Error("mac address was not registered");
    }
    this.dispatcher.dispatch(PenEventName.ON_UPGRADE_NEEDED, { pen: this, mac, event });
  }


  /**
   *
   * @param event
   */
  onDisconnected = (event: IPenEvent) => {
    // let event = makePenEvent(DeviceTypeEnum.PEN, PenEventEnum.ON_DISCONNECTED);
    // let ph = this.appPen;
    // ph.onDisconnected(event);
    const mac = this.mac;
    if (!mac) {
      console.error(`mac address was not registered`);
      console.error(event);
    }
    else {
      // this.manager.onDisconnected({ pen: this, event });
      this.dispatcher.dispatch(PenEventName.ON_DISCONNECTED, { pen: this, mac, event });
    }
  }

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

