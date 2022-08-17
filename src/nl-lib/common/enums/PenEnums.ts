/** @enum {string} */
export enum DeviceTypeEnum {
  PEN = "pen",
  ERASER = "eraser",
  PLAYER = "player",
  STYLUS = "stylus",
  FSIR = "fsir",
  NONE = "none",
  LASSO = "lasso",
}



/** @enum {number} */
export enum PEN_STATE {
  NONE = 0,
  PEN_DOWN = 1,
  PEN_MOVE = 2,
  PEN_UP = 9,

  HOVER_MOVE = 101,
}

export enum PEN_THICKNESS {
  THICKNESS1 = 0.04,
  THICKNESS2 = 0.08,
  THICKNESS3 = 0.12,
  THICKNESS4 = 0.16,
  THICKNESS5 = 0.2,
}

/** @enum {string} */
export enum PenEventName {
  ON_PEN_DOWN = "pendown",
  ON_PEN_THICKNESS_CHANGE = "thicknessChange",

  ON_PEN_PAGEINFO = "penpageinfo",
  ON_PEN_HOVER_PAGEINFO = "hoverpageinfo",
  ON_PEN_MOVE = "penmove",
  ON_PEN_UP = "penup",
  ON_PEN_UP_FOR_HOMOGRAPHY = "pendownforhomography",

  ON_HOVER_MOVE = "hovermove",

  ON_NCODE_ERROR = "error",
  ON_PW_REQUIRED = "pw_req",
  ON_CONNECTED = "connected",
  ON_DISCONNECTED = "disconnected",

  ON_ERASER_MOVE = "erasermove",
  
  ON_UPGRADE_NEEDED = "fw_up",


  ON_START_TO_CONNECT = "start_to_connect",


  /**
   * pen move 도중 페이지가 바뀜에 따라 생성하는 virtual event
   *
   * virual pen down/up은, 펜 스트로크가 이어지고 있음에도 페이지가 바뀌는 경우에 발생한다
   * 잉크 스토리지에는 각각의 페이지에 새로운 스트로크로 등록되도록 설계되어 있다
   *
   * 이 이벤트를 분리하는 이유는, post it 등, 아래의 종이와 겹쳐진 상태에서, 그 위치를 파악하기 위함이다
   */
  ON_PEN_DOWN_VIRTUAL = "pendown_virtual",

  /** pen move 도중 페이지가 바뀜에 따라 생성하는 virtual event */
  ON_PEN_UP_VIRTUAL = "penup_virtual",

  ON_COLOR_CHANGED = "colorchanged",
  ON_PEN_TYPE_CHANGED = "pentypechanged"


}





export enum IBrushType {
  PEN = 0,
  MARKER = 1,
  PENCIL = 2,
  ERASER = 3,
  BRUSH = 4,
  FOUNTAINPEN = 5,
  LASSO = 6, 
}

