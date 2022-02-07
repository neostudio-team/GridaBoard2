import * as cloud_util_func from "../../../cloud_util_func";

import { adjustNoteItemMarginForFilm, getNPaperInfo, getNPaperSize_pu } from "../noteserver";
import { EventDispatcher, EventCallbackType } from "../event";
import { cloneObj, convertNuToPu, getNextNcodePage, getNowTimeStr, isPageInRange, isPageInMapper, isSamePage, makePdfId, isSameNcode } from "../util";
import { DefaultPlateNcode, g_availablePagesInSection, g_defaultNcode, g_defaultTemporaryNcode, nullNcode } from "../constants";
import {
  IPageSOBP, TransformParameters, INoteServerItem_forPOD, IPrintOption, IPdfToNcodeMapItem,
  INcodeSOBPxy, IPageMapItem, IPdfPageDesc, IPolygonArea, IRectDpi, IAutoLoadDocDesc, IGetNPageTransformType, IMappingData
} from "../structures";

import PdfDocMapper from "./PdfDocMapper";
import { MappingItem } from "./MappingItem";
import CoordinateTanslater from "./CoordinateTanslater";
import { store } from "GridaBoard/client/pages/GridaBoard";

export const BASECODE_PAGES_PER_SHEET = 16384;

export enum MappingStorageEventName {
  ON_MAPINFO_REFRESHED = "on_map_refreshed",
  ON_MAPINFO_ADDED = "on_map_changed",
}


export type IMappingStorageEvent = {
  status: string,
  mapper?: PdfDocMapper,      // ON_MAP_INFO_CHANGED
}



const _debug = false;
let _ms_i: MappingStorage = null;
const LOCAL_STORAGE_ID = "GridaBoard_codeMappingInfo_v2";


/**
 *
 */
export class MappingStorage {

  /** 프로그램 실행이 끝나도 저장되어야 하는 mapping table */
  _data: IMappingData = {
    nextIssuable: { ...g_defaultNcode },
    arrDocMap: []
  };

  /** 프로그램이 실행되는 동안만 유지되는 mapping table */
  _temporary: IMappingData = {
    nextIssuable: { ...g_defaultTemporaryNcode },
    arrDocMap: []
  };

  _testStorage;

  dispatcher: EventDispatcher = new EventDispatcher();


  private constructor() {
    if (_ms_i) return _ms_i;

    this.initNextIssuable();
  }

  static getInstance() {
    if (_ms_i) return _ms_i;

    _ms_i = new MappingStorage();
    return _ms_i;
  }

  static makeAssignedNcodeArray = (startPage: IPageSOBP, numPages: number) => {
    const pages: IPageSOBP[] = [];
    for (let i = 0; i < numPages; i++) {
      const pi = getNextNcodePage(startPage, i);
      pages.push(pi);
    }

    return pages;
  }

  private initNextIssuable = () => {
    if (this._data.nextIssuable.section === -1) {
      this.nextIssuable = g_defaultNcode;
    }
  }

  public reset = () => {
    this._data = {
      nextIssuable: { ...g_defaultNcode },
      arrDocMap: [],
    };
  }

  public resetTemporary = () => {
    this._temporary = {
      nextIssuable: { ...g_defaultNcode },
      arrDocMap: [],
    };
  }

  get nextIssuable() {
    return this._data.nextIssuable;
  }

  set nextIssuable(pageInfo: IPageSOBP) {
    this._data.nextIssuable = { ...pageInfo };
  }


  /**
   * 이 함수를 dialog로 수정함으로써 프린터 옵션을 바꿀 수 있다.
   */
  public getAssociatedMappingInfo = (fingerprint: string, pagesPerSheet: number, docNumPages: number) => {
    const theSames = this.findAssociatedPrintNcode(fingerprint, pagesPerSheet);
    const theSame: IPdfToNcodeMapItem = theSames.length > 0 ? theSames[0] : undefined;

    return theSame;
  }

  /**
   *  이 함수가 불려지기 전에, printOption에는 다음과 같은 항목이 설정되어 있어야만 한다.
   * * url, filename, fingerprint, pagesperSheet, docNumPages
   *
   * 이 리턴 값은 printOption으로 바로 들어가서 대체될 수 있다.
   * * printOption = {...printOption, ...returnValue }
   * * 또는, for (const key in returnValue) printOption[key] = returnValue[key];
   */
  public getCodePrintInfo = (printOption: IPrintOption, forceToUpdateBaseCode: boolean) => {
    if (forceToUpdateBaseCode === undefined) forceToUpdateBaseCode = printOption.forceToUpdateBaseCode;

    const { fingerprint, pagesPerSheet, docNumPages } = printOption;
    let needToIssueBaseCode: boolean;
    let needToIssuePrintCode: boolean;

    let basePageInfo: IPageSOBP;
    let printPageInfo: IPageSOBP;

    let prevBasePageInfo = nullNcode();
    let prevPrintPageInfo = nullNcode();
    let baseCodeIssued = false;


    /** 코드 할당에 대한 기본 값을 써 주자 */
    const theBase = this.findAssociatedBaseNcode(fingerprint);
    const theSames = this.findAssociatedPrintNcode(fingerprint, pagesPerSheet);
    const theSame = theSames.length > 0 ? theSames[0] : undefined as IPdfToNcodeMapItem;

    let codeDelta = 0;

    // base 코드 재활용 또는 할당
    if (theBase) prevBasePageInfo = { ...theBase.basePageInfo };
    if (theBase && !forceToUpdateBaseCode) {
      // 재활용할 수 있는 경우
      needToIssueBaseCode = false;
      basePageInfo = { ...theBase.basePageInfo };
    }
    else {
      // 할당해야만 하는 경우
      if (!theBase) needToIssueBaseCode = true;
      codeDelta += docNumPages;
      const nextCode = getNextNcodePage(this.nextIssuable, codeDelta);
      basePageInfo = { ...nextCode };
      baseCodeIssued = true;
    }


    // 인쇄될 페이지의 코드 재활용 또는 할당

    if (theSame) prevPrintPageInfo = { ...theSame.printPageInfo };

    const reUsable = (!!theSame) && isSamePage(theSame.basePageInfo, theBase.basePageInfo);
    if (reUsable && !forceToUpdateBaseCode) {
      // 재활용할 수 있는 경우
      needToIssuePrintCode = false;
      printPageInfo = { ...theSames[0].printPageInfo };
    }
    else {
      // 할당해야만 하는 경우
      if (!(theSames.length > 0)) needToIssuePrintCode = true;
      const nextCode = getNextNcodePage(this.nextIssuable, codeDelta);
      printPageInfo = { ...nextCode };
      codeDelta += docNumPages;
    }

    return {
      prevBasePageInfo,
      needToIssueBaseCode,
      basePageInfo,
      baseCodeIssued,

      prevPrintPageInfo,
      needToIssuePrintCode,
      printPageInfo,

      numNcodeComsumed: codeDelta,
    }
  }


  public getNextIssuablePageInfo = (printOption: IPrintOption) => {
    const codeInfo = this.getCodePrintInfo(printOption, true);

    return [codeInfo.basePageInfo, codeInfo.printPageInfo];
  }

  private makeDummyParamsForBasePageInfo = (basePageInfo: IPageSOBP, url: string, filename: string, fingerprint: string, numPages: number, isPod = true) => {
    // const { docNumPages: numPages, fingerprint, url, filename } = printOption;

    // dummy
    const params: IPageMapItem[] = [];
    for (let i = 0; i < numPages; i++) {
      const pageNo = i + 1;
      const mapData = new MappingItem(pageNo);      // h의 기본값은 여기서 세팅된다.

      const pi: INoteServerItem_forPOD = getNPaperInfo(basePageInfo);
      const paperSize_pu = getNPaperSize_pu(basePageInfo);

      // dummy Ncode page info
      const { Xmin: x0, Xmax: x1, Ymin: y0, Ymax: y1 } = pi.margin;

      // 아래 부분은 고쳐야 한다. kitty, 2021/01/02
      const rect: IRectDpi = { unit: "nu", x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      const npageArea: IPolygonArea = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];

      let page = basePageInfo.page + i;
      if (isPod) {
        const maxPages = g_availablePagesInSection[basePageInfo.section];
        page = (page + maxPages) % maxPages;
      }

      const printPageInfo = { ...basePageInfo, page };
      const basePageInfo_for_page = { ...basePageInfo, page };
      mapData.setNcodeArea({ pageInfo: printPageInfo, basePageInfo: basePageInfo_for_page, rect, npageArea });

      // dummy PDF page info
      const pdfPageInfo: IPdfPageDesc = { url, filename, fingerprint, id: makePdfId(fingerprint, BASECODE_PAGES_PER_SHEET), numPages, pageNo };
      mapData.setPdfArea({ pdfPageInfo, rect: { unit: "pu", x: 0, y: 0, width: paperSize_pu.width, height: paperSize_pu.height } });

      params.push(mapData._params);
    }

    const basePdfToNcodeMap: IPdfToNcodeMapItem = {
      url,
      filename,
      fingerprint,
      pagesPerSheet: BASECODE_PAGES_PER_SHEET,
      id: makePdfId(fingerprint, BASECODE_PAGES_PER_SHEET),
      numPages,

      printPageInfo: { ...basePageInfo },
      basePageInfo: { ...basePageInfo },

      params,
      timeString: getNowTimeStr(),
    }
    return basePdfToNcodeMap;
  }


  public issueNcode = (printOption: IPrintOption) => {
    // 한번도 코드를 발행해 본적이 없는 경우의 default
    this.initNextIssuable();

    // 리턴 값을 준비
    const { docNumPages, pagesPerSheet, fingerprint, url, filename } = printOption;
    const codeNeeded = this.getCodePrintInfo(printOption, undefined);

    // Base map을 등록해야 한다면, 아래와 같이 더미의 base code map을 등록
    // 아래의 맵에서는 h가 정의되어 있지 않으므로, 직접 불러서 transform할 수 없다
    if (codeNeeded.baseCodeIssued) {
      const basePdfToNcodeMap = this.makeDummyParamsForBasePageInfo(codeNeeded.basePageInfo, url, filename, fingerprint, docNumPages);
      this._data.arrDocMap.push(basePdfToNcodeMap);
    }

    // 현재 인쇄 상태의 map의 코드 정보를 전달
    const pdfToNcodeMap: IPdfToNcodeMapItem = {
      url,
      filename,
      fingerprint,
      pagesPerSheet,
      id: makePdfId(fingerprint, pagesPerSheet as number),
      numPages: docNumPages,

      printPageInfo: { ...codeNeeded.printPageInfo },
      basePageInfo: { ...codeNeeded.basePageInfo },

      params: undefined,
      timeString: getNowTimeStr(),
    }
    this.nextIssuable = getNextNcodePage(this.nextIssuable, codeNeeded.numNcodeComsumed);

    return pdfToNcodeMap;
  }

  private calcHfromNote = (arg: { Xmin: number, Ymin: number, Xmax?: number, Ymax?: number, pageNo: number }) => {
    const { Xmin: x0, Ymin: y0, Xmax: x1, Ymax: y1, pageNo } = arg;
    if (x1 === undefined || y1 === undefined) {
      const h = new TransformParameters();
      return h;
    }
    const mapData = new MappingItem(pageNo);
    const w_nu = x1 - x0;
    const h_nu = y1 - y0;

    const w_pu = convertNuToPu(w_nu);
    const h_pu = convertNuToPu(h_nu);


    const srcPoints: IPolygonArea = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    const dstPoints: IPolygonArea = [{ x: 0, y: 0 }, { x: w_pu, y: 0 }, { x: w_pu, y: h_pu }, { x: 0, y: h_pu }];
    mapData.setSrc4Points_ncode(srcPoints);
    mapData.setDst4Points_pdf(dstPoints);

    const trans = new CoordinateTanslater();
    const h = trans.calc(mapData);
    return h;

  }

  public getNPageTransform = (pageInfo: IPageSOBP) => {
    let h: TransformParameters;
    const ret: IGetNPageTransformType = {
      type: undefined as "note" | "pod" | "default" | "plate",
      pageInfo: undefined as IPageSOBP,
      basePageInfo: undefined as IPageSOBP,
      h: undefined as TransformParameters,

      pdf: {
        url: undefined as string,
        filename: undefined as string,
        fingerprint: undefined as string,
        numPages: undefined as number,
        pdfParams: undefined as IPageMapItem[],

        pdfPageNo: undefined as number,
        pagesPerSheet: undefined as number,
      }
    };

    const ncodeXy: INcodeSOBPxy = {
      ...pageInfo, x: 10, y: 10
    }
    const tempFound = this._temporary.arrDocMap.find(m => isPageInMapper(ncodeXy, m, m.numPages));

    // 1) Ncode 페이지 맵에 있는지 확인한다.
    const noteItem = getNPaperInfo(pageInfo);
    adjustNoteItemMarginForFilm(noteItem, pageInfo);

    const isCalibrationMode = store.getState().calibration.calibrationMode;

    if (!noteItem.isDefault && !isCalibrationMode && !tempFound) {
      h = this.calcHfromNote({ ...noteItem.margin, pageNo: pageInfo.page });
      ret.h = h;

      ret.type = "note";
      if (isSameNcode(DefaultPlateNcode, pageInfo)) {
        ret.type = "plate";
      }
      ret.pageInfo = pageInfo;
      ret.basePageInfo = pageInfo;
      ret.pdf.filename = noteItem.pdf_name;

      return ret;
    }

    // 2) Mapping된 PDF 페이지인지 확인한다.
    const pdfItem = this.findPdfPage({ ...pageInfo, x: 10, y: 10 });
    if (pdfItem) {
      //pageMapping이 없으면 삭제된 페이지일것
      if(pdfItem.pageMapping !== undefined){
        const pageMap = pdfItem.pageMapping;
        ret.h = pageMap.h;
        ret.type = "pod";
        ret.pageInfo = pageMap.pageInfo;
        ret.basePageInfo = pageMap.basePageInfo;
  
        ret.pdf = {
          url: pdfItem.pdf.url,
          filename: pdfItem.pdf.filename,
          fingerprint: pdfItem.pdf.fingerprint,
          numPages: pdfItem.pdf.numPages,
          pdfParams: pdfItem.pdf.params,
  
          pdfPageNo: pageMap.pdfPageNo,
          pagesPerSheet: pdfItem.pdf.pagesPerSheet,
        }
        return ret;
      }
    }



    // 3) 아니면 그냥 A4를 리턴한다.
    const defaultItem = getNPaperInfo({ section: -1, owner: -1, book: -1, page: -1 });
    h = this.calcHfromNote({ ...defaultItem.margin, pageNo: pageInfo.page });
    ret.h = h;

    ret.type = "default";
    ret.pageInfo = pageInfo;
    ret.basePageInfo = pageInfo;

    return ret;
  }

  public makeTemporaryGridaMapItem = (option: {
    /** PDF로 추가되는 페이지의 경우 */
    pdf: { url: string, filename: string, fingerprint: string, numPages: number },
  }, pageInfos: IPageSOBP[], basePageInfos: IPageSOBP[]) => {
    const { pdf } = option;

    const nextCode = getNextNcodePage(this._temporary.nextIssuable, 0);
    let basePdfToNcodeMap: IPdfToNcodeMapItem;

    if (pdf) {
      // 매핑되지 않은 PDF를 추가
      this._temporary.nextIssuable = getNextNcodePage(this._temporary.nextIssuable, pdf.numPages);
      basePdfToNcodeMap = this.makeDummyParamsForBasePageInfo(nextCode, pdf.url, pdf.filename, pdf.fingerprint, pdf.numPages, true);

      for (let i = 0; i < basePdfToNcodeMap.params.length; i++ ) {
        basePdfToNcodeMap.params[i].pageInfo = pageInfos[i];
        basePdfToNcodeMap.params[i].basePageInfo = basePageInfos[i]; 
      }
    }

    this._temporary.arrDocMap.push(basePdfToNcodeMap);
    return basePdfToNcodeMap;

  }

  /**
   * mapping되지 않은 PDF나, ncode 공책들의 임시 mapping table을 생성하고 돌려주는 주고
   */
  public makeTemporaryAssociateMapItem = (option: {
    /** Ncode 로 추가되는 페이지의 경우 */
    n_paper: IPageSOBP,
    /** PDF로 추가되는 페이지의 경우 */
    pdf: { url: string, filename: string, fingerprint: string, numPages: number },
    /** Blank page의 경우 */
    numBlankPages: number,
  }) => {
    const { pdf, n_paper, numBlankPages } = option;

    if (!pdf && !n_paper && !numBlankPages) {
      console.error("n_paper neighter pdf has not been given to makeTemporaryAssociateMapItem ");
      return undefined;
    }

    const nextCode = getNextNcodePage(this._temporary.nextIssuable, 0);
    let basePdfToNcodeMap: IPdfToNcodeMapItem;
    if (pdf) {
      // 매핑되지 않은 PDF를 추가
      this._temporary.nextIssuable = getNextNcodePage(this._temporary.nextIssuable, pdf.numPages);
      basePdfToNcodeMap = this.makeDummyParamsForBasePageInfo(nextCode, pdf.url, pdf.filename, pdf.fingerprint, pdf.numPages, true);
    }
    else if (n_paper) {
      // Ncode가 들어와서 추가되는 페이지
      const pi: INoteServerItem_forPOD = getNPaperInfo(n_paper);
      const basePageInfo = { ...n_paper, page: pi.ncode_start_page };
      basePdfToNcodeMap = this.makeDummyParamsForBasePageInfo(basePageInfo, pi.pdf_name, pi.pdf_name, pi.pdf_name, pi.pdf_page_count + 1, false);
    }
    else {
      //
      const nextCode = getNextNcodePage(this._temporary.nextIssuable, 0);
      this._temporary.nextIssuable = getNextNcodePage(this._temporary.nextIssuable, numBlankPages);

      const piBlank: INoteServerItem_forPOD = getNPaperInfo(nullNcode());
      basePdfToNcodeMap = this.makeDummyParamsForBasePageInfo(nextCode, piBlank.pdf_name, piBlank.pdf_name, piBlank.pdf_name, numBlankPages, true);
    }

    this._temporary.arrDocMap.push(basePdfToNcodeMap);
    return basePdfToNcodeMap;
  }

  registerTemporary = (mapper: PdfDocMapper) => {
    mapper.makeSummaryForTemporary();

    const docMap: IPdfToNcodeMapItem = cloneObj(mapper.docMap);
    docMap.timeString = getNowTimeStr();

    this._temporary.arrDocMap.unshift(docMap);
    // 최신순으로 소팅
    // this._data.arrDocMap.sort((a, b) => (b.timeString > a.timeString ? 1 : (b.timeString === a.timeString ? 0 : -1)));

    //ON_MAPINFO_ADDED하면 render만 새로
    this.dispatcher.dispatch(MappingStorageEventName.ON_MAPINFO_ADDED, { status: "new map added", mapper });

    if (_debug) this.dump("mapping");
  }

  register = (mapper: PdfDocMapper) => {
    mapper.makeSummary();

    const docMap: IPdfToNcodeMapItem = cloneObj(mapper.docMap);
    docMap.timeString = getNowTimeStr();

    this._data.arrDocMap.unshift(docMap);
    // 최신순으로 소팅
    // this._data.arrDocMap.sort((a, b) => (b.timeString > a.timeString ? 1 : (b.timeString === a.timeString ? 0 : -1)));

    this.dispatcher.dispatch(MappingStorageEventName.ON_MAPINFO_ADDED, { status: "new map added", mapper });
    this.storeMappingInfo();
    if (_debug) this.dump("mapping");
  }
  public removeNcodeByPage = (fingerprint:string ,pageNo : number) => {
    const mapData = this._data.arrDocMap.filter(m => fingerprint === m.fingerprint);

    mapData.forEach(el=>{
        el.params.splice(pageNo,1);
        el.numPages -= 1;
    });

    const tmpMapData = this._temporary.arrDocMap.filter(m => fingerprint === m.fingerprint);

    tmpMapData.forEach(el => {
      el.params.splice(pageNo, 1);
      el.numPages -= 1;
    })

    //데이터 저장
    this.storeMappingInfo();
  }
  public getCloudData() {
    cloud_util_func.readMappingInfo();
  }
  public setTestStorage(obj) {
    this._testStorage = obj;

    console.log(this._testStorage);
  }
  public saveOnCloud = () => {

    const params = {
      "IPageMapItem": {
        timeString: "1111",
        pageInfo: { section: "1", book: "1", owner: "1", page: "1" },
      }
    }
    const params2 = {
      "IPageMapItem": {
        timeString: "1111",
        pageInfo: { section: "1", book: "1", owner: "1", page: "2" },
      }
    }
    const lastCode = { section: "1", book: "1", owner: "1", page: "2" };
    const nextCode = { section: "1", book: "1", owner: "1", page: "3" };

    const mappingInfoObj = {
      "code": {
        "last": lastCode,
        "next": nextCode,
      },
      "map": [params, params2]
    }

    cloud_util_func.uploadMappingInfo(mappingInfoObj);
  }

  findPrintedMapper = (ncodeXy: INcodeSOBPxy) => {
    const dataFound = this._data.arrDocMap.find(m => isPageInRange(ncodeXy, m.printPageInfo, m.numPages));

    if (dataFound) {
      /** 원래는 폴리곤에 속했는지 점검해야 하지만, 현재는 같은 페이지인지만 점검한다  2020/12/06 */
      const pageMap = dataFound.params.find(param => isSamePage(ncodeXy, param.pageInfo));
      return { pdf: dataFound, pageMapping: pageMap } as IAutoLoadDocDesc;
    }

    return undefined;
  }

  findCalibratedMapper = (ncodeXy: INcodeSOBPxy) => {
    const tempFound = this._temporary.arrDocMap.find(m => isPageInMapper(ncodeXy, m, m.numPages));

    if (tempFound) {
      const pageMap = tempFound.params.find(param => isSamePage(ncodeXy, param.pageInfo));
      return { pdf: tempFound, pageMapping: pageMap } as IAutoLoadDocDesc;
    }

    return undefined;
  }

  /**
   * pen down시에 새로운 SOBP라면, 관련된 PDF가 있는지 찾을 때 쓰인다
   */
  findPdfPage = (ncodeXy: INcodeSOBPxy) => {

    const mappingState = store.getState().appConfig.mappingState;

    switch (mappingState) {
      case "printed": {
        return this.findPrintedMapper(ncodeXy);
      }
      case "calibrated": {
        return this.findCalibratedMapper(ncodeXy);
      }
      default: {
        //state가 없는 경우 기존 로직대로
        const calibratedMapper = this.findCalibratedMapper(ncodeXy);
        if (calibratedMapper !== undefined) return calibratedMapper;

        const printedMapper = this.findPrintedMapper(ncodeXy);
        return printedMapper; //printedMapper도 없다면 undefined가 return

      }
    }
  }


  /**
   * Ncode가 발행된 적이 있는지를 점검하기 위해서 쓰인다.
   */
  findAssociatedNcode = (fingerprint: string, pagesPerSheet: number) => {
    const theBase = this.findAssociatedBaseNcode(fingerprint);
    const theSames = this.findAssociatedPrintNcode(fingerprint, pagesPerSheet);

    return { theBase, theSames }
  }

  findAssociatedPrintNcode = (fingerprint: string, pagesPerSheet: number) => {
    const id = makePdfId(fingerprint, pagesPerSheet as number);

    const theSames = this._data.arrDocMap.filter(m => id === m.id);
    // theSames.sort((a, b) => b.timeString > a.timeString ? 1 : (b.timeString === a.timeString ? 0 : -1));

    return theSames;
  }

  findAssociatedBaseNcode = (fingerprint: string) => {
    const baseId = makePdfId(fingerprint, BASECODE_PAGES_PER_SHEET);

    // const theBase = this._data.arrDocMap.find(m => baseId === m.id);
    const theBases = this._data.arrDocMap.filter(m => baseId === m.id);
    // theBases.sort((a, b) => b.timeString > a.timeString ? 1 : (b.timeString === a.timeString ? 0 : -1));
    const theBase = theBases.length > 0 ? theBases[0] : undefined;

    return theBase;
  }

  dump = (prefix: string) => {
    console.log(`[${prefix}]==============================================================================================================================`);
    this.dumpJson(prefix, this._data.nextIssuable);
    console.log(`[${prefix}]..............................................................................................................................`);

    for (let i = 0; i < this._data.arrDocMap.length; i++) {
      const item = this._data.arrDocMap[i];
      const clone = cloneObj(item);
      clone.params = null;
      this.dumpJson(prefix, clone);
      console.log(`[${prefix}]..............................................................................................................................`);
    }
    console.log(`[${prefix}]==============================================================================================================================`);
  }

  dumpJson = (prefix: string, obj) => {
    const str = JSON.stringify(obj, null, "  ");
    const arr = str.split("\n");

    // for (let i = 0; i < arr.length; i++) {
    //   console.log(`[${prefix}] ${arr[i]}`);
    // }
  }
  clear = () => {
    this.reset();
    this.storeMappingInfo();
    console.log("Mapping information cleared");
  }

  storeMappingInfo = () => {
    if (storageAvailable("localStorage")) {
      const key = LOCAL_STORAGE_ID;
      const value = JSON.stringify(this._data);
      // console.log(`Pdf Ncode Info Saved   ${key}: ${value}`);
      localStorage.setItem(key, value);

      return true;
    }

    return false;
  }
  public addEventListener(eventName: MappingStorageEventName, listener: EventCallbackType) {
    this.dispatcher.on(eventName, listener, null);
  }

  /**
   *
   * @param eventName
   * @param listener
   */
  public removeEventListener(eventName: MappingStorageEventName, listener: EventCallbackType) {
    this.dispatcher.off(eventName, listener);
  }


  /**
   * app이 기동되면 반드시 처음에 load하자
   *
   * @return {boolean}
   */
  loadMappingInfo = () => {
    if (storageAvailable("localStorage")) {
      const key = LOCAL_STORAGE_ID;
      const value = localStorage.getItem(key);

      if (value) {
        this._data = JSON.parse(value);

        // 최신순으로 소팅
        this._data.arrDocMap.sort((a, b) => b.timeString > a.timeString ? 1 : (b.timeString === a.timeString ? 0 : -1));

        // 개발중 코드, Data Structure가 바뀐 것이라면 reset kitty
        let validStoredData = true;
        const found = this._data.arrDocMap.forEach(m => { if (!m.printPageInfo || !m.numPages) validStoredData = false; });
        if (!validStoredData) {
          alert(`MappingStorage reset`);
          this.clear();
        }


        this.dump("loading");

        // const debug = JSON.stringify(this._arrMapped);
        // console.log(`Pdf Ncode Info Loaded   ${key}: ${debug}`);
        return true;
      }
    }

    return false;
  }
}


function storageAvailable(type) {
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // Firefox를 제외한 모든 브라우저
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // 코드가 존재하지 않을 수도 있기 떄문에 이름 필드도 확인합니다.
        // Firefox를 제외한 모든 브라우저
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // 이미 저장된 것이있는 경우에만 QuotaExceededError를 확인하십시오.
      storage &&
      storage.length !== 0
    );
  }
}


// https://www.bsidesoft.com/1426 , [js] localStorage 키별 용량 제약 처리
// 이것 참고해서 더 수정할 것

// (function () {
  // await new Promise(resolve => setTimeout(resolve, 10));
  // const msi = MappingStorage.getInstance();
  // msi.loadMappingInfo();

  // https://developer.chrome.com/docs/apps/offline_storage/#query ==> enter

  // https://stackoverflow.com/questions/26257183/detecting-available-storage-with-indexeddb/38905723#38905723 ==> right!
  // https://storage.spec.whatwg.org/#dom-storagemanager-estimate ==> this one, also.
  // navigator.storage.estimate().then((data) => {
  //   console.log(data);
  // }); // Object { quota: 2147483648, usage: 0 }

  // for (let i = 0; i < 4 * 1024; i++) {
  //   const key = `storage_test_${i}`;
  //   localStorage.removeItem(key);
  // }

  // let acc = 0;
  // for (let i = 0; i < 4 * 1024; i++) {

  //   const key = `storage_test_${i}`;
  //   const value = { key: Array.from({ length: 1024 * 65 }) };
  //   const json = JSON.stringify(value);
  //   const size = json.length;
  //   acc += size;
  //   localStorage.setItem(key, json);
  //   console.log( `acc = ${acc} ${size}`);

  //   const ret = localStorage.getItem(key);
  //   const confirmJson = JSON.parse(ret);
  //   const confirm = JSON.stringify(confirmJson);

  //   if (ret.length < 10) {
  //     console.log(`storing #${i} chunk FAILED`);
  //   }
  //   else {
  //     console.log(`storing #${i} chunk success`);

  //   }

  // }

  // navigator.webkitTemporaryStorage.queryUsageAndQuota(
  //   function (usedBytes, grantedBytes) {
  //     console.log('we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
  //   },
  //   function (e) { console.log('Error', e); }
  // );

// })();




