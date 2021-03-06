
/**
 * https://stackoverflow.com/questions/44757411/what-is-pixel-width-and-length-for-jspdfs-default-a4-format

    function convertPointsToUnit(points, unit) {
      // Unit table from https://github.com/MrRio/jsPDF/blob/ddbfc0f0250ca908f8061a72fa057116b7613e78/jspdf.js#L791
      var multiplier;
      switch(unit) {
        case 'pt':  multiplier = 1;          break;
        case 'mm':  multiplier = 72 / 25.4;  break;
        case 'cm':  multiplier = 72 / 2.54;  break;
        case 'in':  multiplier = 72;         break;
        case 'px':  multiplier = 96 / 72;    break;
        case 'pc':  multiplier = 12;         break;
        case 'em':  multiplier = 12;         break;
        case 'ex':  multiplier = 6;
        default:
          throw ('Invalid unit: ' + unit);
      }
      return points * multiplier;
    }
 */

import { IPageSOBP } from "./Structures";


/**
 * in mm
 */
export type IPaperSize = {
  unit: "mm" | "inch" | "pu" | "nu" | "css" | "600dpi",     // pu = points, css = px
  name: string,
  width: number,
  height: number
};

export type INoteServerItem_forPOD = {
  id: string;                 // 3.27.964

  title?: string;              // "페가수스 수학1_3권"
  pdf_page_count?: number;     // 131
  nproj_file?: string;         // "note_964.nproj"
  pdf_name?: string;           // "math1_vol.3_print.pdf"
  ncode_end_page?: number;     // 131
  ncode_start_page?: number;   // 1

  pageInfo: IPageSOBP;
  /** Ncode Unit margin  */
  margin: {
    Xmin: number,
    Xmax?: number,

    Ymin: number,
    Ymax?: number,
  };

  /** n,u,l,d,r */
  glyphData: string;

  isDefault?: boolean;
}

export type INoteServerItem = {
  id?: string;                 // 3.27.964

  title?: string;              // "페가수스 수학1_3권"
  pdf_page_count?: number;     // 131
  nproj_file?: string;         // "note_964.nproj"
  pdf_name?: string;           // "math1_vol.3_print.pdf"
  ncode_end_page?: number;     // 131
  ncode_start_page?: number;   // 1

  section: number,
  owner: number,
  book: number,
  page?: number,

  /** Ncode Unit margin  */
  margin: {
    Xmin: number,
    Xmax?: number,

    Ymin: number,
    Ymax?: number,
  }

  Mag?: number,
}



export type IPaperTypeSet = {
  [key: string]: INoteServerItem
}
