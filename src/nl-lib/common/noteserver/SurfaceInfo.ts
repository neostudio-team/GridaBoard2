import { g_paperType } from "./NcodeSurfaceDataJson";
import { INcodeSOBPxy, INoteServerItem_forPOD, IPageSOBP, IPaperSize, ISize } from "../structures";
import { FilmNcode_Landscape, FilmNcode_Portrait, INCH_TO_MM_SCALE, NCODE_TO_INCH_SCALE, PDF_DEFAULT_DPI, PlateNcode_2, PlateNcode_3, PlateNcode_4, UNIT_TO_DPI } from "../constants";
import { isSamePage } from "../util";


// kitty, Ncode SDK를 읽고 다음의 페이지수를 채워 넣을 것
// 2020/12/13
/**
 *
 * @param pageInfo
 */
export function isPlatePaper(pageInfo: IPageSOBP): boolean {
  const { owner, book } = pageInfo;
  if (owner === 1013 && book === 2) {
    return true;
  }

  return false;
}

export function isWhiteBoard(pageInfo: IPageSOBP): boolean {
  const {section, owner, book} = pageInfo;
  if (section === 14 && owner === 27 && book === 1) {
    return true;
  }
  
  return false;
}

/**
 *
 * @param coordInfo
 */
export function isPUI(pageInfo: IPageSOBP): boolean {
  const { owner, book, page, } = pageInfo;
  // console.log( `isPUI: ${owner}.${book}.${page}`);
  if (owner === 27 && book === 161 && page === 1) {
    return true;
  }

  if (owner === 1013 && (book === 1 || book === 1116)) {
    // page === 4, Smart plate
    // page === 1, Plate paper

    return true;
  }

  return false;
}



/**
 *
 * @param pageInfo
 * @return paper size in NU
 */
function getNPaperSize_nu(item: IPageSOBP | INoteServerItem_forPOD): ISize {
  let desc = item as INoteServerItem_forPOD;

  // IPageSOBP 이면 noteserver item을 가져 온다.
  if (!Object.prototype.hasOwnProperty.call(item, "margin")) {
    const pageInfo = item as IPageSOBP;
    desc = getNPaperInfo(pageInfo);
  }

  const margin = desc.margin;
  return {
    width: margin.Xmax - margin.Xmin,
    height: margin.Ymax - margin.Ymin
  };
}


function getNPaperSize_dpi(item: IPageSOBP | INoteServerItem_forPOD, dpi: number): ISize {
  // const { section, owner, book, page } = pageInfo;
  const size = getNPaperSize_nu(item);

  return {
    width: Math.round(size.width * NCODE_TO_INCH_SCALE * dpi),
    height: Math.round(size.height * NCODE_TO_INCH_SCALE * dpi),
  }
}

export function getNPaperSize_pu(item: IPageSOBP | INoteServerItem_forPOD): ISize {
  return getNPaperSize_dpi(item, PDF_DEFAULT_DPI);
}


export function getMediaSize_pu(mediaType: IPaperSize): ISize {
  const { width, height } = mediaType;

  return {
    width: width * INCH_TO_MM_SCALE * PDF_DEFAULT_DPI,
    height: height * INCH_TO_MM_SCALE * PDF_DEFAULT_DPI,
  }
}

/**
 * paper size를 해당 inch 단위로 돌려 준다.
 * @param pageInfo
 */
export function getNPaperInfo(pageInfo: IPageSOBP) {
  let section = -1, owner = -1, book = -1;
  if (pageInfo) {
    section = pageInfo.section;
    owner = pageInfo.owner;
    book = pageInfo.book;
  }

  let isDefault = false;
  let key = section.toString() + "." + owner.toString() + "." + book.toString();
  let found = g_paperType.definition[key];
  if ( !found) {
    key = g_paperType.defaultKey;
    found = g_paperType.definition[key];
    isDefault = true;
  }

  found = JSON.parse(JSON.stringify(found));
  const desc: INoteServerItem_forPOD = {
    ...found,
    id: key,
    pageInfo,
    glyphData: "",
    isDefault,
  };

  return desc;
}

export function adjustNoteItemMarginForFilm(noteItem: INoteServerItem_forPOD, pageInfo: IPageSOBP) {
  //3.1013.2에 대해 플레이트와 필름의 요구사항이 달라서 이렇게 처리한다
  if (isSamePage(pageInfo, FilmNcode_Portrait)){
    noteItem.margin.Xmin = 9; 
    noteItem.margin.Ymin = 9;
    noteItem.margin.Xmax = 91;
    noteItem.margin.Ymax = 128;
  }
  else if (isSamePage(pageInfo, FilmNcode_Landscape)) {
    noteItem.margin.Xmin = 9; 
    noteItem.margin.Ymin = 9;
    noteItem.margin.Xmax = 128;
    noteItem.margin.Ymax = 91;
  }
  else if(isSamePage(pageInfo, PlateNcode_2)){
    // 일단 임시로 이 위치
    noteItem.margin.Xmin = 0; 
    noteItem.margin.Ymin = 0;
    noteItem.margin.Xmax = 108;
    noteItem.margin.Ymax = 60;
  }
  else if(isSamePage(pageInfo, PlateNcode_3)){
    // 일단 임시로 이 위치
    noteItem.margin.Xmin = 0; 
    noteItem.margin.Ymin = 0;
    noteItem.margin.Xmax = 77;
    noteItem.margin.Ymax = 57;
  }
  else if(isSamePage(pageInfo, PlateNcode_4)){
    // 일단 임시로 이 위치
    noteItem.margin.Xmin = 10; 
    noteItem.margin.Ymin = 51;
    noteItem.margin.Xmax = 111;
    noteItem.margin.Ymax = 123;
  }
}

export function getSurfaceSize_dpi(size: IPaperSize, dpi: number, isLandscape, padding = 0) {

  /** numerator of converting to INCH */
  const numerator = UNIT_TO_DPI[size.unit];
  const mm_numerator = UNIT_TO_DPI["mm"];
  const ratio = 1.0;

  let width = size.width * ratio * dpi / numerator;
  let height = size.height * ratio * dpi / numerator;

  padding = padding * ratio * dpi / mm_numerator;
  width -= padding;
  height -= padding;

  width = Math.floor(width);
  height = Math.floor(height);

  if (isLandscape) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width: width,
    height: height,
  };
}


export function getSurfaceSize_px_600dpi(size: IPaperSize, isLandscape, padding = 0) {
  return getSurfaceSize_dpi(size, UNIT_TO_DPI["600dpi"], isLandscape, padding);
}

export function getSurfaceSize_inch(size: IPaperSize, isLandscape, padding = 0) {
  return getSurfaceSize_dpi(size, 1, isLandscape, padding);
}

export function getSurfaceSize_mm(size: IPaperSize, isLandscape, padding = 0) {
  return getSurfaceSize_dpi(size, UNIT_TO_DPI["mm"], isLandscape, padding);
}

export function getSurfaceSize_css(size: IPaperSize, isLandscape, padding = 0) {
  return getSurfaceSize_dpi(size, UNIT_TO_DPI["css"], isLandscape, padding);
}


export function getSurfaceSize_pu(size: IPaperSize, isLandscape, padding = 0) {
  return getSurfaceSize_dpi(size, UNIT_TO_DPI["pu"], isLandscape, padding);
}

export function isPortrait(size: ISize) {
  return size.width < size.height;
}

export function getCssDpi() {
  return UNIT_TO_DPI["css"];
}


