
/** @enum {string} */
export enum DeviceTypeEnum {
  PEN = "pen",
  ERASER = "eraser",
  PLAYER = "player",
  STYLUS = "stylus",
  FSIR = "fsir",
  NONE = "none",
}


export enum PenModelEnum {
  F121 = DeviceTypeEnum.PEN,
  F120 = DeviceTypeEnum.PEN,
  F51 = DeviceTypeEnum.PEN,
  F50 = DeviceTypeEnum.PEN,
  F30 = DeviceTypeEnum.PEN,

  E100 = DeviceTypeEnum.ERASER,
  E101 = DeviceTypeEnum.ERASER,

  X100 = DeviceTypeEnum.STYLUS,
}
