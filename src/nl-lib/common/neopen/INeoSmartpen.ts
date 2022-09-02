import { EventDispatcher, EventCallbackType } from "../event";
import { IBrushState,  IPenEvent, NeoDot, NeoStroke, TransformParameters } from "../structures";
import { IBrushType, PEN_STATE, PenEventName, DeviceTypeEnum } from "../enums";


export type IPenToViewerEvent = {
  pen: INeoSmartpen,

  mac: string,
  event: IPenEvent,

  /** ON_PEN_MOVE and ON_PEN_DOWN only */
  strokeKey?: string,
  /** ON_PEN_MOVE and ON_PEN_DOWN only */
  stroke?: NeoStroke,
  /** ON_PEN_MOVE only */
  dot?: NeoDot,

  /** PON_PEN_HOVER_PAGEINFO only */
  section?: number,
  /** PON_PEN_HOVER_PAGEINFO only */
  owner?: number,
  /** PON_PEN_HOVER_PAGEINFO only */
  book?: number,
  /** PON_PEN_HOVER_PAGEINFO only */
  page?: number,
  /** PON_PEN_HOVER_PAGEINFO only */
  time?: string,
}


export interface INeoSmartpen {

  /** 펜 종류 마다의 굵기와 색깔 */
  penState: IBrushState[];

  /** 펜 종류 (렌더러 종류) */
  penRendererType: IBrushType;

  mac: string;

  id: string;

  name?: string;

  rotationIndep: boolean;   // ture = force not to apply rotation

  lastState: PEN_STATE;

  dispatcher: EventDispatcher;

  calibrationPoint?: any;
  calibrationData?: any;

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
  }

  getMac(): string;
  getBtDevice(): BluetoothDevice;
  getPenName(): string;
  getThickness(): number;

  connect(opt?:any): boolean;
  disConnect(): void;
  connectByWebBtDevice(device: BluetoothDevice): Promise<boolean>;
  connectByMacAddress(mac: string): Promise<boolean>;


  resetPenStroke(): void;


  onPenDown(event: IPenEvent): void;
  onPageInfo(event: IPenEvent, hover: boolean): void;
  onPenMove(event: IPenEvent): void;
  onPenUp(event: IPenEvent): void;


  onHoverMove(event: IPenEvent): void;
  onHoverPageInfo(event: IPenEvent): void;


  onNcodeError(event: IPenEvent): void;
  onPasscodeRequired(event: IPenEvent): void;
  onFirmwareUpgradeNeeded(event: IPenEvent): void;


  onConnected(event: IPenEvent): void;
  onDisconnected(event: IPenEvent): void;


  setColor(color: string): void;
  setThickness(thickness: number): void;
  setPenRendererType(type): void;


  addEventListener(eventName: PenEventName, listener: EventCallbackType): void;
  removeEventListener(eventName: PenEventName, listener: EventCallbackType): void;
}
