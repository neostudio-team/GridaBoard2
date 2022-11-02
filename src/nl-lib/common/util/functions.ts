import { PDFDocument } from "pdf-lib";
import { sprintf } from "sprintf-js";
import GridaDoc from "../../../GridaBoard/GridaDoc";
import { g_availablePagesInSection, UNIT_TO_DPI, PlateList } from "../constants";
import { IUnitString, IPageSOBP, IPointDpi, IPdfToNcodeMapItem } from "../structures";

export function compareObject(curr: Object, next: Object, header = "") {
  for (const [key, value] of Object.entries(next)) {
    if (curr[key] !== value) {
      console.log(`[${header}] state[${key}] was changed, from "${curr[key]} to "${value}"`);
    }
  }
}


export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    // let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}


export function makePdfId(fingerprint: string, pagesPerSheet: number) {
  return fingerprint + "/" + pagesPerSheet.toString();
}


export function makeNPageId(pageInfo: IPageSOBP) {
  const nPageId = (pageInfo.section << 48) + (pageInfo.owner << 32) + (pageInfo.book << 16) + pageInfo.page;
  return nPageId;
}

export function makeNPageIdStr(pageInfo: IPageSOBP) {
  if (pageInfo) {
    const { section, owner, book, page } = pageInfo;
    if (section === undefined) return "section undefined";
    return `${section}.${owner}.${book}.${page}`;
  }
  return "undefined";
}

export function makeNCodeIdStr(pageInfo: IPageSOBP) {
  if (pageInfo) {
    const { section, book, owner } = pageInfo;
    if (section === undefined) return "section undefined";
    return `${section}.${owner}.${book}`;
  }
  return "undefined";
}

export function cloneObj(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function isSameObject(a: any, b: any) {
  if (a === b) return true;
  for (const key in a) {
    if (typeof a[key] === "object") {
      if (!isSameObject(a[key], b[key])) return false;
    }
    else if (a[key] !== b[key]) {
      console.log(`[printOption diff] key=${key} values="${a[key]}", "${b[key]}`);
      return false;
    }
  }
  return true;
}


export function isSamePage(pg1: IPageSOBP, pg2: IPageSOBP): boolean {
  if (pg1 === undefined && pg2 === undefined) return true;
  if (pg1 && !pg2) return false;
  if (!pg1 && pg2) return false;

  if (pg1.page !== pg2.page || pg1.book !== pg2.book || pg1.owner !== pg2.owner || pg1.section !== pg2.section) {
    return false;
  }
  return true;
}


export const isPlatePage = (pageInfo:IPageSOBP)=>{
  // 플레이트 리스트에 있는 애랑 같으면 리턴 true
  for(let i = 0; i < PlateList.length; i++){
    if (isSamePage(PlateList[i], pageInfo)) return true;
  }
  // 같은애가 없으면 리턴 false
  return false;
}
export function isSameNcode(pg1: IPageSOBP, pg2: IPageSOBP): boolean {
  if (pg1 === undefined && pg2 === undefined) return true;
  if (pg1 && !pg2) return false;
  if (!pg1 && pg2) return false;

  if (pg1.book !== pg2.book || pg1.owner !== pg2.owner || pg1.section !== pg2.section) {
    return false;
  }
  return true;
}

export function isPageInRange(pg: IPageSOBP, arrStart: IPageSOBP, numPages: number): boolean {
  if (!pg) return false;
  // alert( `${arrStart}`)
  if (pg.book !== arrStart.book || pg.owner !== arrStart.owner || pg.section !== arrStart.section) {
    return false;
  }

  const arr: number[] = [];
  const availablePages = g_availablePagesInSection[arrStart.section];
  for (let i = 0; i < numPages; i++) {
    const page = (arrStart.page + i + availablePages) % availablePages;
    arr.push(page);
  }

  return arr.indexOf(pg.page) >= 0;
}

export function isPageInMapper(pg: IPageSOBP, m: IPdfToNcodeMapItem, numPages: number): boolean {
  if (!pg) return false;

  for (let i = 0; i < numPages; i++) {
    const tmpMapperPageInfo = m.params[i].pageInfo; 
    if (isSamePage(pg, tmpMapperPageInfo)) { 
      return true;
    }
  }

  return false;
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const result = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    result[key] = deepClone(obj[key])
  }

  return result;
}



export function getNowTimeStr() {
  const now = new Date();
  const timeStr = sprintf("%04d-%02d-%02d %02d:%02d:%02d.%03d",
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );

  return timeStr;
}




export function addZeros(num, digit) {
  // 자릿수 맞춰주기
  let zero = "";
  num = num.toString();
  if (num.length < digit) {
    for (let i = 0; i < digit - num.length; i++) {
      zero += "0";
    }
  }
  return zero + num;
}


export function getNextNcodePage(curr: IPageSOBP, delta = 1) {
  const { section, owner, book } = curr;
  const page = (curr.page + delta) % g_availablePagesInSection[section];
  const pi: IPageSOBP = {
    section, owner, book, page,
  }

  return pi;
}

/**
 * shouldComponentUpdated 등에서 쓰이는 상태 비교 디버거 메시지
 * @param prefix - prefix string of debug message
 * @param prevProps
 * @param nextProps
 * @param prevState
 * @param nextState
 */
export function dumpDiffPropsAndState(prefix, prevProps, nextProps, prevState = undefined, nextState = undefined) {

  let isChanged = false;
  for (const [key, value] of Object.entries(nextProps)) {
    // if (typeof value === "function" || typeof value === "object") continue;
    if (prevProps[key] !== value) {
      isChanged = true;
    }
  }

  if (prevState && nextState) {
    for (const [key, value] of Object.entries(nextState)) {
      // if (typeof value === "function" || typeof value === "object") continue;
      if (prevState[key] !== value) {
        isChanged = true;
      }
    }
  }
  console.log("");
  if (!isChanged) {
    console.log(`[${prefix}] =============== Properties & State NOT CHANGED`);
    return
  }

  console.log(`[${prefix}] =============== Properties & State ===========================================================================================`);
  for (const [key, value] of Object.entries(nextProps)) {
    // if (typeof value === "function" || typeof value === "object") continue;
    if (prevProps[key] !== value) {
      console.log(`[${prefix}] PROPERTY [${key}] was changed, "${prevProps[key]}" ==> "${value}"`);
    }
  }

  // console.log(`[${prefix}] State .......................................................................................................................`);
  if (prevState && nextState) {
    for (const [key, value] of Object.entries(nextState)) {
      // if (typeof value === "function" || typeof value === "object") continue;
      if (prevState[key] !== value) {
        console.log(`[${prefix}] STATE    [${key}] was changed, "${prevState[key]}" ==> "${value}"`);
      }
    }
  }

  // console.log(`[${prefix}]==============================================================================================================================`);
}


export function clearCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D = undefined, color = "rgb(255,255,255)") {
  if (!ctx) ctx = canvas.getContext("2d");

  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}


export function drawSingleCrossMark(ctx: CanvasRenderingContext2D, x: number, y: number, len: number) {
  const line_width = 4;
  const line_len = len;

  ctx.strokeStyle = "rgb(255, 0, 0)";
  ctx.save();

  ctx.beginPath();
  ctx.lineWidth = line_width;
  // 2020/08/31 kitty
  // canvas_context.arc(x, y, r, r, 0, Math.PI * 2, true); // Outer circle
  ctx.moveTo(x, y - line_len);
  ctx.lineTo(x, y + line_len);
  ctx.moveTo(x - line_len, y);
  ctx.lineTo(x + line_len, y);
  ctx.stroke();

  ctx.restore();
}

export function drawCrossMark(
  arg: {
    ctx: CanvasRenderingContext2D, drawMarkRatio: number, markPos: number,
    x: number, y: number, w: number, h: number
  }) {
  const ratio = arg.drawMarkRatio;
  const d = arg.w * ratio;
  const x = new Array(3) as number[];
  const y = new Array(3) as number[];

  x[0] = arg.x + d;
  y[0] = arg.y + d;

  x[1] = arg.x + arg.w - d;
  y[1] = arg.y + arg.h - d;

  x[2] = arg.x + arg.w / 2;
  y[2] = arg.y + arg.h / 2;

  const markPos = arg.markPos < 3 ? arg.markPos : 2;
  const len = arg.w * 0.04;
  drawSingleCrossMark(arg.ctx, x[markPos], y[markPos], len);

  return { x: x[markPos], y: y[markPos] };
}


function convertUnitToPt(unit: IUnitString, value: number) {
  let multiplier: number;

  switch (unit) {
    case 'pt': multiplier = 1; break;
    case 'mm': multiplier = 72 / 25.4; break;
    case 'cm': multiplier = 72 / 2.54; break;
    case 'in': multiplier = 72; break;
    case 'px': multiplier = 96 / 72; break;
    case 'css': multiplier = 72 / 96; break;
    case 'pc': multiplier = 12; break;
    case 'em': multiplier = 12; break;
    case 'ex': multiplier = 6; break;
    default:
      throw ('Invalid unit: ' + unit);
  }

  return value * multiplier;
}

export function convertUnit(fromUnit: IUnitString, value: number, toUnit: IUnitString) {
  const points = convertUnitToPt(fromUnit, value);

  let multiplier: number;
  switch (toUnit) {
    case 'pt': multiplier = 1; break;
    case 'mm': multiplier = 25.4 / 72; break;
    case 'cm': multiplier = 2.54 / 72; break;
    case 'in': multiplier = 1 / 72; break;
    case 'px': multiplier = 72 / 96; break;
    case 'css': multiplier = 96 / 72; break;
    case 'pc': multiplier = 1 / 12; break;
    case 'em': multiplier = 1 / 12; break;
    case 'ex': multiplier = 1 / 6; break;
    default:
      throw ('Invalid unit: ' + toUnit);
  }

  return points * multiplier;
}


export function getFilenameOnly(str: string) {
  const ext = getExtensionName(str);
  let name = str.split('/').pop().replace("." + ext, '');
  name = name.split('\\').pop().replace("." + ext, '');
  return name;
}

export function getExtensionName(str: string) {
  const re = /(?:\.([^.]+))?$/;

  const ext = re.exec(str)[1];   // "txt"
  return ext;
}


export function getNcodedPdfName(filename: string, pageInfo: IPageSOBP, pagesPerSheet: number) {
  const name = getFilenameOnly(filename);
  const { section, owner, book, page } = pageInfo;
  const fn = `${name}_${pagesPerSheet}(${section}_${owner}_${book}_${page})_ncoded.pdf`;

  return fn;
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



function rgb2Hex(rgb) {
  const splitted = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
  return (splitted && splitted.length === 4) ? "#" +
    ("0" + parseInt(splitted[1], 10).toString(16)).slice(-2) +
    ("0" + parseInt(splitted[2], 10).toString(16)).slice(-2) +
    ("0" + parseInt(splitted[3], 10).toString(16)).slice(-2) : '';
}

export function hex2ColorObject(hex) {
  if (hex.length !== 7 && hex.length !== 4) hex = rgb2Hex(hex);

  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }

    c = '0x' + c.join('');
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    return { r, g, b };
  }
  throw new Error('Bad Hex');
}



export function stringToDpiNum(unit: string) {
  let dpi = UNIT_TO_DPI[unit];

  if (!dpi) {
    const index = unit.indexOf("dpi");
    if (index > 0)
      dpi = parseInt(unit.substr(0, index));
    else
      dpi = parseInt(unit);
  }

  return dpi;
}

export function autoSetDpi(opt: any) {
  if (opt.unit && !opt.dpi) {
    opt.dpi = stringToDpiNum(opt.unit);
  }
  return opt;
}

export function scalePoint(pt: IPointDpi, scale: number) {
  pt.x = pt.x / scale;
  pt.y = pt.y / scale;
  return pt;
}

export function callstackDepth() {
  const callstack = new Error().stack.toString();
  const lines = callstack.split("\n");

  const re = /at\s(.+)\.(.+)\s\((.+)\)/

  let cnt = 0;
  let spc = "";
  let caller = sprintf("%20s", "");
  for (let i = 2, br = true; br; i++) {
    cnt++;
    spc += "  ";
    if (!lines[i]) {
      br = false;
    }
    else {
      const arg = lines[i].split(re);
      // console.log(`VIEW SIZE   ${arg.length}  ${lines[i]} `);

      if (arg.length !== 5) {
        br = false;
        const root = arg[0].split(/at\s(.+)\s\(/);
        caller = sprintf("%30s", root[1]);
        // console.log(arg);
      }

    }
  }

  return " " + caller + spc;
}

export function scrollToBottom(id: string) {
  const ele = document.querySelector("#" + id);
  (ele) ? ele.scrollIntoView({ behavior: "smooth", block: "end" }) : null;
  // (ele) ? ele.scrollTo(0, ele.scrollHeight) : null;
}

export function scrollToThumbnail(pageNo: Number, event?: KeyboardEvent){
  if(event){
    event.preventDefault();
  }
  const ele = document.getElementById("thumbnail - " + pageNo + " -mixed_view");
  (ele) ? ele.scrollIntoView({behavior: "smooth", block: "center"}) : null;
}


const stableRatios = [
  0,
  0.25,
  0.333333333,
  0.5,
  0.666666667,
  0.75,
  0.8,
  0.9,
  1.0,
  1.1,
  1.25,
  1.5,
  1.75,
  2.0,
  2.5,
  3.0,
  4.0,
  5.0,
  7.0,
  10.0
];


const fixZoomRatio = function (ratio: number) {

  for (let i = 1; i < stableRatios.length - 1; i++) {
    const left = (stableRatios[i - 1] + stableRatios[i]) / 2;
    const right = (stableRatios[i] + stableRatios[i + 1]) / 2;

    if (left < ratio && ratio < right) {
      return stableRatios[i];
    }
  }

  return ratio;
};


export function getBrowserZoomFactor() {

  // https://codepen.io/reinis/pen/RooGOE
  const ratio = Math.round((window.outerWidth / window.innerWidth) * 100) / 100;
  const BrowserZoom = fixZoomRatio(ratio);

  // console.log( "detected ratio:" + ratio + "    stable zoom level:" + BrowserZoom );
  return BrowserZoom;
}

export const makePdfUrl = async () => {
  const doc = GridaDoc.getInstance();
  const docPages = doc.pages;
  let isPdfEdited = false;

  let pdfUrl,
    pdfDoc = undefined;

  for (const page of docPages) {
    if (page.pdf === undefined) {
      //ncode page일 경우
      isPdfEdited = true; //여긴 무조건 pdf를 새로 만들어야 하는 상황
      if (pdfDoc === undefined) {
        pdfDoc = await PDFDocument.create();
      }
      const pageWidth = page.pageOverview.sizePu.width;
      const pageHeight = page.pageOverview.sizePu.height;
      const pdfPage = await pdfDoc.addPage([pageWidth, pageHeight]);
      if (page._rotation === 90 || page._rotation === 270) {
        const tmpWidth = pdfPage.getWidth();
        pdfPage.setWidth(pdfPage.getHeight());
        pdfPage.setHeight(tmpWidth);
      }
    } else {
      //pdf인 경우
      if (pdfUrl !== page.pdf.url) {
        pdfUrl = page.pdf.url;
        const existingPdfBytes = await fetch(page.pdf.url).then(res => res.arrayBuffer());
        const pdfDocSrc = await PDFDocument.load(existingPdfBytes);
        page.pdf.removedPage.forEach(el => {
          pdfDocSrc.removePage(el);
        });
        /******************* pdfDoc에서 remove를 할경우
         * pageCache에 값이 변하지 않아서 아래 getPages에서 기존의 개수가 그대로 나온다.
         * pageCache는 원래 직접접근 하면 안되는 privite 이지만, 강제로 value를 업데이트 해준다
         * 직접 접근 이외의 방법으로 업데이트가 가능하거나(현재 못찾음)
         * pdf-lib가 업데이트 되어 필요없다면 삭제 필요
         */
        (pdfDocSrc as any).pageCache.value = (pdfDocSrc as any).pageCache.populate();

        if (pdfDoc !== undefined) {
          //ncode 페이지가 미리 생성돼서 그 뒤에다 붙여야하는 경우
          isPdfEdited = true; //여기 들어오면 pdf가 여러개든지 pdf가 편집된 상황이다.

          const srcLen = pdfDocSrc.getPages().length;
          const totalPageArr = [];
          for (let i = 0; i < srcLen; i++) {
            totalPageArr.push(i);
          }

          const copiedPages = await pdfDoc.copyPages(pdfDocSrc, totalPageArr);

          for (const copiedPage of copiedPages) {
            await pdfDoc.addPage(copiedPage);
          }
        } else {
          pdfDoc = pdfDocSrc;
        }
      } else {
        continue;
      }
    }
  }

  if (!isPdfEdited) {
    //pdf가 편집되지 않았으면 새로운 createObjectURL 할 필요 없음
    return pdfUrl;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  const url = await URL.createObjectURL(blob);
  return url;
};