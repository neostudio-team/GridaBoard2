import { NeoDot } from "./NeoDot";

import { IBrushType } from "../enums"
import { uuidv4 } from "../util";
import { TransformParameters } from "./MapDataTypes";

export enum StrokeStatus {
  NORMAL,
  ERASED,
}


export enum StrokePageAttr {
  SINGLEPAGE,
  MULTIPAGE,
}

export interface INeoStrokeProps {
  section: number,
  owner: number,
  book: number,
  page: number,

  startTime: number,
  mac: string,


  brushType: IBrushType,
  thickness: number,
  color: string,

  status: StrokeStatus,

  multiPage?: StrokePageAttr,

  h: TransformParameters,
  h_origin: TransformParameters,
}



export class NeoStroke implements INeoStrokeProps {
  // from INeoStrokeProps
  section: number;  // 3
  owner: number;  // 27
  book: number;  // 1089
  page: number;  // 1
  mac: string;// '9c:7b:d2:53:09:66'

  brushType: IBrushType;
  thickness: number;  // 0.20000000298023224
  color: string;

  status: StrokeStatus;


  // own properties
  key: string;
  dotCount: number;
  dotsEncoded: string;    //'AACNjAw/heuxQXsUB0JuZ5ILANLRUT9cj7JBj8IHQpNokgwA+/p6PylcsUGuRwhCnWeSCwD9/Hw/cT2uQXsUCUKiaJIMAAAAgD97FKpBXI8KQp9mkgsAAACAPwrXo0H2KAxCoHGSDAAAAIA/cT2eQQrXDUKaZpELAAAAgD97FJZB4XoOQqZ8kQwAAACAP3sUkEFSuA5CoGSQDAAAAIA/9iiKQexRDkKgWo8KAAAAgD8UroNB7FEMQp9XjwwAAACAP/YogEEzMwpCmFuOOwAAAIA/SOGAQY/C/UGfTY4LAAAAgD+F64VBmpn5QaJUjwwAAACAP83MjEEpXPdBnk+PCwAAAIA/CteTQWZm9kGgU48XAAAAgD+F651BSOH4QZpTkQwAAACAP/YooEHsUfxBnFKRIwAAAIA/cT2iQdejBUKbWJIKAAAAgD+amaFBPQoJQppbkQwAAACAP7gen0EK1wxCmFmRDAAAAIA/ZmaaQSlcEEKXZpEMAP38fD8fhZVBj8IUQpJlkAsAvLs7P7gej0FcjxlCjXCQDADR0NA+ZmaIQaRwHUJxc48LAIWEhD5mZoJBFK4eQmxxkAwAlZQUPoXreUGF6x1CaW+QEQDx8PA9H4VzQY/CG0JoZZA='
  penTipMode: number;   // 0: pen, 1: eraser
  strokeType: number;   // 1
  updated: number;  // 1597202355308

  startTime: number;  // 1597202355308
  endTime: number;  // 1597202355308
  duration: number;  // last dot's time;  //first dot's time, it should be increase by 1 to use properly

  max_force: number;  // 1
  min_force: number;  // 1
  avr_force: number;  // 1

  max_speed: number;  // 1
  min_speed: number;  // 1
  avr_speed: number;  // 1

  time_len: number;  // 1

  dotArray: NeoDot[];
  opened: boolean;

  h: TransformParameters;
  h_origin: TransformParameters;

  plateSection: number;
  plateOwner: number;
  plateBook: number;
  platePage: number;
  isPlate: boolean;
  isCommand: boolean;

  /**
   *
   * @param {string} [mac]
   */
  constructor(props: INeoStrokeProps) {
    const { section, owner, book, page, startTime, mac, thickness, brushType, color, status } = props;
    // from INeoStrokeProps
    Object.keys(props).forEach(key => {
      this[key] = props[key];
    });

    // this.mac = mac;

    // this.section = section;
    // this.owner = owner;
    // this.book = book;
    // this.page = page;

    // this.startTime = startTime;

    // this.thickness = thickness;
    // this.brushType = brushType;
    // this.color = color;
    // this.status = status;

    // own properties
    this.key = uuidv4();
    this.dotCount = 0;
    this.dotArray = new Array(0);
    this.opened = true;

    this.isPlate = false;
  }


  /**
   *
   * @param {NeoDot} dot
   */
  addDot(dot: NeoDot) {
    this.dotArray.push(dot);
    this.dotCount++;
  }

  close() {
    this.opened = false;
  }

  set = (properties: Object) => {
    Object.keys(properties).forEach(key => {
      this[key] = properties[key];
    });

  }
}
