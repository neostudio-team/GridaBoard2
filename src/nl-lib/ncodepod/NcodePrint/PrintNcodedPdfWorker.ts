import { PageSizes, PDFDict, PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import { saveAs } from "file-saver";
import printJS from "print-js";

import { showCalibrationDialog } from 'GridaBoard/store/reducers/calibrationReducer';
import { setMappingState } from "GridaBoard/store/reducers/appConfigReducer";
import { IPrintingEvent, IPrintingReport, IPrintOption, IUnitString, IProgressCallbackFunction, IPrintingSheetDesc, IPageMapItem } from "nl-lib/common/structures";

import { MappingItem, MappingStorage, PdfDocMapper } from "nl-lib/common/mapper";
import { SheetRendererManager } from "../NcodeSurface/SheetRendererManager";
import { cloneObj, convertUnit, getExtensionName, getFilenameOnly, getNcodedPdfName, makeNPageIdStr, makePdfId, sleep, uuidv4 } from "nl-lib/common/util";
import { _app_name, _lib_name, _version } from "../Version";
import { g_defaultPrintOption } from "../DefaultOption";
import { IPdfToNcodeMapItem } from "nl-lib/common/structures";
import { NcodePdfScaleMode } from "nl-lib/common/enums";
import { NeoPdfDocument, NeoPdfManager } from "nl-lib/common/neopdf";
import { g_nullNcode } from "nl-lib/common/constants";
import { firebaseAnalytics } from "../../../GridaBoard/util/firebase_config";


// https://stackoverflow.com/questions/9616426/javascript-print-iframe-contents-only/9616706
// ifame

type IPrintOptionCallbackType = (arg: IPrintOption) => Promise<IPrintOption>;

let g_printCancelFired = false;

interface Props {
  /** 인쇄될 문서의 url, printOption.url로 들어간다. */
  url: string,
  filename: string,

  /** 인쇄 준비 상태를 업데이트하는 콜백 함수 */
  /** 기본값의 IPrintOption을 받아서, dialog를 처리하고 다시 돌려주는 콜백 함수 */
}




/**
 * Class
 */
export default class PrintNcodedPdfWorker {
  private progressPercent = 0;
  private pdf = undefined as NeoPdfDocument;
  // pagesOverview = [] as IPageOverview[];
  private tempMapper = undefined as PdfDocMapper;
  // private printOption: IPrintOption;
  private status = "N/A";

  private numReports = 0;

  private printOption: IPrintOption;

  private url: string;
  private filename: string;

  /** 인쇄 준비 상태를 업데이트하는 콜백 함수 */
  private reportProgress?: (arg: IPrintingReport) => void;

  constructor(props: Props, reportProgress?: (arg: IPrintingReport) => void) {
    this.printOption = cloneObj(g_defaultPrintOption);
    this.setDefaultPrintOption(cloneObj(g_defaultPrintOption), undefined);

    this.url = props.url;
    this.filename = props.filename;
    this.reportProgress = reportProgress;
  }

  // private setDefaultPrintOption = (printOption: IPrintOption) => {
  //   printOption.pageInfo = { ...g_nullNcode };
  //   return printOption;
  // }

  private setStatus = (status: string) => {
    this.status = status;
  }

  private setProgressPercent = (percent: number) => {
    this.progressPercent = percent;
  }


  private loadPdf = async (url: string, filename: string, printOption: IPrintOption) => {
    if (url === undefined) return;

    // const loaded = await NeoPdfManager.getDocument({ url, filename, purpose: "to be printed by PrintNcodedPdfWorker", });
    const loaded = await NeoPdfManager.getInstance().getDocument({ url, filename, purpose: "to be printed by PrintNcodedPdfWorker", });
    if (loaded) {
      // console.log(`[yyy] setPageOverview called`);
      printOption.url = url;
      printOption.filename = filename;

      // 디버깅용 화면 디스플레이를 위해
      const docNumPages = loaded.numPages;
      printOption.direction = loaded.direction;

      console.log(`[NumPage] PDF page: ${url} - ${docNumPages}`)
      printOption.docNumPages = docNumPages;
      printOption.targetPages = Array.from({ length: docNumPages }, (_, i) => i + 1);

      this.pdf = loaded;
    }

    return loaded;
  }

  /**
   * @param printOption - in/out
   * @param pdf - in
   */
  private setDefaultPrintOption = (printOption: IPrintOption, pdf: NeoPdfDocument) => {
    let pdfToNcodeMap = undefined as IPdfToNcodeMapItem;

    if (pdf) {
      // 기본 값으로는 모든 페이지를 인쇄하도록
      printOption.fingerprint = pdf.fingerprint;
      printOption.docNumPages = pdf.numPages;
      printOption.targetPages = Array.from({ length: printOption.docNumPages }, (_, i) => i + 1);

      // 이전에 매핑되었던 값을 찾아서 기본값으로 설정해 둔다
      const msi = MappingStorage.getInstance();
      pdfToNcodeMap = msi.getAssociatedMappingInfo(printOption.fingerprint, printOption.pagesPerSheet, printOption.docNumPages);

      const partOption = msi.getCodePrintInfo(printOption, undefined);
      for (const key in partOption) printOption[key] = partOption[key];
    }
    else {
      printOption.needToIssuePrintCode = true;
      printOption.forceToUpdateBaseCode = true;
      printOption.printPageInfo = { ...g_nullNcode };
      printOption.basePageInfo = { ...g_nullNcode };
    }

    return pdfToNcodeMap;
  }

  public startPrint = async (url: string, filename: string, printOptionCallback: IPrintOptionCallbackType) => {
    this.setStatus("loading");
    let printOption = this.printOption;

    const pdf = await this.loadPdf(url, filename, printOption);
    if (!pdf) {
      this.setStatus("canceled. loading failed.");
      if (printOption.completedCallback) printOption.completedCallback();
      return;
    }

    this.setStatus("configuring");


    // 기본 값으로는 모든 페이지를 인쇄하도록
    let pdfToNcodeMap = this.setDefaultPrintOption(printOption, pdf);

    // 기본 인쇄 옵션 외의 옵션을 이용자로부터 받는다
    if (printOptionCallback) {
      const result = await printOptionCallback(printOption);
      if (result) {
        this.printOption = result;
        printOption = result;

        // pages per sheet가 바뀌었을 가능성이 있어서
        const msi = MappingStorage.getInstance();
        pdfToNcodeMap = msi.getAssociatedMappingInfo(printOption.fingerprint, printOption.pagesPerSheet, printOption.docNumPages);
        const partOption = msi.getCodePrintInfo(printOption, undefined);
        for (const key in partOption) printOption[key] = partOption[key];
      }
      else {
        // 옵션 설정에서 취소를 눌렀다.
        if (printOption.completedCallback) printOption.completedCallback();
        return;
      }
    }

    // 프로그레스 보고를 위한 초기화
    const progressCallback = this.progressCallback;

    g_printCancelFired = false;
    printOption.progressCallback = progressCallback;
    this.numReports = 0;


    // Ncode가 필요하면 코드를 받아 온다, 여기서 받아오는 ncode page 수는 전체 PDF의 페이지 수
    const msi = MappingStorage.getInstance();
    pdfToNcodeMap = msi.issueNcode(printOption);

    // 할당된 코드를 옵션에 세팅한다
    pdf.setNcodeAssigned(pdfToNcodeMap);
    printOption.pdfToNcodeMap = pdfToNcodeMap;
    printOption.printPageInfo = { ...pdfToNcodeMap.printPageInfo };
    printOption.basePageInfo = { ...pdfToNcodeMap.basePageInfo };
    printOption.printedNcodes = MappingStorage.makeAssignedNcodeArray(pdfToNcodeMap.printPageInfo, pdf.numPages);
    printOption.basedNcodes = MappingStorage.makeAssignedNcodeArray(pdfToNcodeMap.basePageInfo, pdf.numPages);
    this.printOption = printOption;


    // sheet에 해당하는 페이 번호들을 세팅하고
    this.setStatus("progress");
    const { targetPages, pagesPerSheet } = printOption;
    const pageNumsInSheets = this.genaratePageNumsInSheets(targetPages, pagesPerSheet);
    const tempMapping = this.resetPrintStatus(printOption);
    const numSheets = pageNumsInSheets.length;
    const sheets: IPrintingSheetDesc[] = new Array(numSheets);

    // 본격적으로 각 시트의 이미지를 만들어 놓는다
    this.setStatus("printing");

    const maxThread = printOption.numThreads;
    for (let s = 0; s < numSheets; s += maxThread) {
      const promises = [];
      for (let i = 0; i < maxThread && (s + i) < numSheets; i++) {
        const pr = this.prepareSheet(s + i, pageNumsInSheets[s + i]);

        promises.push(pr);
        pr.then(sheet => {
          // sheets.push(sheet.sheetDesc);
          sheets[sheet.sheetIndex] = sheet.sheetDesc;

          // 임시 매핑 정보를 추가해서 넣는다, afterPrint에서 쓰인다
          tempMapping.append(sheet.mappingItems);
        });
      }
      await Promise.all(promises);
      if (g_printCancelFired) {
        if (printOption.completedCallback) printOption.completedCallback();
        return;
      }
    }

    // 캔버스 오브젝트로 그려진 객체를 각각의 PDF 페이지로 만든다.
    const pdfDoc = await this.generateNcodePdf(printOption, sheets, printOption.progressCallback);
    if (pdfDoc === undefined) {
      if (printOption.completedCallback) printOption.completedCallback();
      return;
    }

    if (progressCallback) progressCallback();
    await sleep(10);

    await this.setMetaData(pdfDoc, pdf, printOption, tempMapping);
    await sleep(10);
    const pdfBytes = await pdfDoc.save()

    // 저장 가능한 바이너리 구조를 만들어서
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    // const base64DataUri = await pdfDoc.saveAsBase64({ dataUri: true })
    await sleep(10);
    if (g_printCancelFired) {
      if (printOption.completedCallback) printOption.completedCallback();
      return;
    }

    // 인쇄를 시작한다.
    const urlCreator = window.URL || window.webkitURL;
    const ncodedUrl = await new Promise(resolve => {
      const ret = urlCreator.createObjectURL(blob); resolve(ret);
    }) as string;
    this.printByPrintJs(ncodedUrl, printOption.hasToPutNcode, pdf.url);

    // 저장 옵션이 켜져 있으면 저장한다
    if (printOption.downloadNcodedPdf) {
      // 파일 이름을 변경하고
      const fn = getNcodedPdfName(filename, printOption.pdfToNcodeMap.printPageInfo, pagesPerSheet);
      saveAs(blob, fn);
    }

    const printPageInfo = printOption.pdfToNcodeMap.printPageInfo;
    firebaseAnalytics.logEvent('print', {
      event_name: 'print',
      item_id: `${printPageInfo.section}_${printPageInfo.owner}_${printPageInfo.book}`
    });

    // completed
    console.log("[PrintPdfMain] Print!!!");
    setMappingState("printed"); //미리 해줘야 render하면서 바뀌고 mapping storage에서 print mapper로 등록됨
    this.setStatus("completed");

    // tempMapper 정보를 등록
    if (printOption.needToIssuePrintCode && printOption.hasToPutNcode) {
      const msi = MappingStorage.getInstance();
      msi.register(tempMapping);
    }


    if (printOption.completedCallback) printOption.completedCallback();

    // default print option에 복사
    for (const key in printOption) g_defaultPrintOption[key] = printOption[key];
    return;
  }


  private generateNcodePdf = async (printOption: IPrintOption, sheets: IPrintingSheetDesc[], progressCallback: IProgressCallbackFunction) => {


    const pdfDoc = await PDFDocument.create();

    const numSheets = sheets.length;
    for (let i = 0; i < numSheets; i++) {
      if (g_printCancelFired) {
        return undefined;
      }

      const sheet = sheets[i];
      if (progressCallback) progressCallback();
      await sleep(10);
      await this.addSheetToPdfPage(pdfDoc, sheet, printOption);

      // console.log(`doc add image = ${i + 1}/${numSheets}`);
    }

    return pdfDoc;
  }

  // /**
  //  * 이 함수를 dialog로 수정함으로써 프린터 옵션을 바꿀 수 있다.
  //  */
  // private getAssociatedMappingInfo = (fingerprint: string, pagesPerSheet: number) => {
  //   let needToIssuePrintCode = true;
  //   let printPageInfo = nullNcode();

  //   let forceToUpdateBaseCode = true;
  //   let basePageInfo = nullNcode();

  //   /** 코드 할당에 대한 기본 값을 써 주자 */
  //   const msi = MappingStorage.getInstance();
  //   const mapItems = msi.findAssociatedNcode(fingerprint, pagesPerSheet);
  //   // const pdfToNcodeMapArr = maps.findAssociatedNcode(fingerprint, pagesPerSheet);
  //   const pdfToNcodeMap: IPdfToNcodeMapItem = mapItems.theSame.length > 0 ? mapItems.theSame[0] : undefined;
  //   const pdfMapBase = mapItems.theBase;

  //   /** 코드 할당에 대한 기본값 설정 */
  //   if (pdfToNcodeMap) {
  //     needToIssuePrintCode = false;
  //     printPageInfo = { ...pdfToNcodeMap.printPageInfo }
  //   }

  //   if (pdfMapBase) {
  //     forceToUpdateBaseCode = false;
  //     basePageInfo = { ...pdfMapBase.basePageInfo };
  //   }

  //   return {
  //     pdfToNcodeMap: pdfToNcodeMap,

  //     needToIssuePrintCode,
  //     printPageInfo,

  //     forceToUpdateBaseCode,
  //     basePageInfo,
  //   }
  // }

  private genaratePageNumsInSheets = (targetPages: number[], pagesPerSheet: number) => {
    const numPages = targetPages.length;
    const numSheets = Math.ceil(numPages / pagesPerSheet);

    const pageNumsInSheets: number[][] = new Array(numSheets);
    for (let i = 0; i < numSheets; i++) {
      pageNumsInSheets[i] = new Array(0);

      for (let j = 0; j < pagesPerSheet && (i * pagesPerSheet + j) < numPages; j++) {
        const pageNo = targetPages[i * pagesPerSheet + j];
        pageNumsInSheets[i].push(pageNo);
      }
      // pageNumsInSheets[i].push(numInSheet);
    }

    return pageNumsInSheets;
  }

  private getNewNcode = (printOption: IPrintOption) => {
    // const { pagesPerSheet, url, filename } = printOption;

    // const { pdf } = this;

    // const option: IPdfToNcodeMapItem = {
    //   url,
    //   filename,
    //   fingerprint: pdf.fingerprint,
    //   pagesPerSheet,
    //   id: makePdfId(pdf.fingerprint, pagesPerSheet as number),
    //   numPages: pdf.numPages,
    // }
    const msi = MappingStorage.getInstance();
    const pdfToNcodeMap = msi.issueNcode(printOption);
    return pdfToNcodeMap;
  }

  private addSheetToPdfPage = async (pdfDoc: PDFDocument, sheet, printOption: IPrintOption) => {

    const cssStringToNumber = (css: string) => {
      return parseInt(css.substr(0, css.indexOf("px")));
    }

    let w = convertUnit("css" as IUnitString, cssStringToNumber(sheet.canvasDesc.css.width), "pt");
    let h = convertUnit("css" as IUnitString, cssStringToNumber(sheet.canvasDesc.css.height), "pt");
    const isLandscape = w > h;

    let pw, ph;
    const media = printOption.mediaSize;
    const paperWidth_pt = convertUnit(media.unit as IUnitString, media.width, "pt");
    const paperHeight_pt = convertUnit(media.unit as IUnitString, media.height, "pt");

    if (isLandscape) { pw = paperHeight_pt; ph = paperWidth_pt; }
    else { pw = paperWidth_pt; ph = paperHeight_pt; }

    // kitty 2020/12/22 인쇄 영역 안에 들어가는 작은 사이즈 PDF를 만들기 위해
    const { drawImageOnPdfMode, hasToPutNcode } = printOption;

    if (drawImageOnPdfMode === NcodePdfScaleMode.PAGE_SIZE_DOWN_TO_IMAGE) {
      // A4 기준으로, Chrome에서 용지 맞춤, 인쇄 가능 영역에서 출력 잘 됨 (기본과 100%에서는 출력 안됨)
      pw = w; ph = h;
    }

    if (drawImageOnPdfMode === NcodePdfScaleMode.IMAGE_SIZE_UP_TO_PAGE_PADDING) {
      // A4 기준으로, Chrome, imagePadding만 10에서 모두 OK
      if (hasToPutNcode) { //ncode A4에 인쇄하는 경우 pageSize가 a4 size
        const padding_delta_pt = convertUnit("mm" as IUnitString, (printOption.imagePadding - printOption.pdfPagePadding), "pt");
  
        const scale = (w + padding_delta_pt) / w;
        w = w * scale;
        h = h * scale;
  
        pw = w; ph = h;
      }
    }


    // A4 기준으로, Chrome에서 용지에 맞춤만 출력됨 (100%, 인쇄 가능 영역, 기본 옵션으로 출력 안됨)
    // pw = pw - (pw - w) / 2;
    // ph = ph - (ph - h) / 2;

    const x = (pw - w) / 2;
    const y = (ph - h) / 2;

    const pngUrl = sheet.canvas.toDataURL();
    // const pngImageBytes = await fetch(pngUrl).then((res) => res.arrayBuffer());
    // const pngImage = await pdfDoc.embedPng(pngImageBytes);
    const pngImage = await pdfDoc.embedPng(pngUrl);

    // const page = pdfDoc.addPage(PageSizes.A7);
    const page = pdfDoc.addPage([pw, ph]);

    if (drawImageOnPdfMode === NcodePdfScaleMode.IMAGE_SIZE_UP_TO_PAGE) {
      page.drawImage(pngImage, {
        x: 0, y: 0, width: pw, height: ph,      // 2020
        opacity: 1,
      })
    }
    else if (drawImageOnPdfMode === NcodePdfScaleMode.PAGE_SIZE_DOWN_TO_IMAGE
      || drawImageOnPdfMode === NcodePdfScaleMode.NO_SCALE
      || drawImageOnPdfMode === NcodePdfScaleMode.IMAGE_SIZE_UP_TO_PAGE_PADDING) {
      page.drawImage(pngImage, {
        x, y, width: w, height: h,
        opacity: 1,
      })
    }
  }

  private setMetaData = async (pdfDoc: PDFDocument, pdf: NeoPdfDocument, printOption: IPrintOption, mappingInfo: PdfDocMapper) => {
    const { pagesPerSheet } = printOption;
    const meta = await pdf.getMetadata();
    console.log(meta);

    const filename = getFilenameOnly(printOption.filename) + "." + getExtensionName(printOption.filename);
    const ncodeStr = makeNPageIdStr(printOption.pdfToNcodeMap.printPageInfo);

    pdfDoc.setTitle(meta.info.title ? meta.info.title : filename);
    pdfDoc.setAuthor('Gridaboard');
    pdfDoc.setSubject(`ncoded: ${ncodeStr}`);
    pdfDoc.setProducer(`${_lib_name} v${_version}`);
    pdfDoc.setCreator(`${_lib_name} v${_version} https://www.neolab.net/`);
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    pdfDoc.setKeywords(['Gridaboard', 'Ncode', 'Neosmartpen', 'NeoLAB', "Smartpen",
      `${pagesPerSheet}_pagesPerSheet`,
      `${makeNPageIdStr(printOption.pdfToNcodeMap.printPageInfo)}`]);

    this.setMetaInfoValue(pdfDoc, "mappingID", `${makePdfId(pdf.fingerprint, pagesPerSheet as number)}`);
    this.setMetaInfoValue(pdfDoc, "pagesPerSheet", `${pagesPerSheet}`);
    this.setMetaInfoValue(pdfDoc, "Ncode issused", ncodeStr);

    this.setMetaData_homographyInfo(pdfDoc, mappingInfo);

    // addMetadataToDoc(pdfDoc, {
    //   author: _app_name,
    //   title: meta.info.title ? meta.info.title : filename,
    //   subject: `ncoded: ${ncodeStr}`,
    //   keywords: ['Gridaboard', 'Ncode', 'Neo smartpen', 'NeoLAB', `${pagesPerSheet} pages per sheet`, `${makeNPageIdStr(printOption.pdfToNcodeMap.printPageInfo)}`],
    //   producer: `${_lib_name} v${_version}`,
    //   creatorTool: `${_lib_name} v${_version} (https://www.neolab.net)`,
    //   documentCreationDate: new Date(),
    //   documentModificationDate: new Date(),
    //   metadataModificationDate: new Date(),
    //   ncodeStart: ncodeStr,
    //   pagesPerSheet: `${pagesPerSheet}`,
    //   mappingID: `${makePdfId(pdf.fingerprint, pagesPerSheet as number)}`,
    // });
  }

  /**
   * PDF custom meta data에 homography 관련된 정보를 넣는 부분
   * 2021/03/30 kitty 
   *
   * @private
   * @param {PDFDocument} pdfDoc
   * @param {PdfDocMapper} mappingInfo
   * @memberof PrintNcodedPdfWorker
   */
  private setMetaData_homographyInfo = async (pdfDoc: PDFDocument, mappingInfo: PdfDocMapper) => {
    // homography를 PDF property에 넣자
    if (mappingInfo.length > 0) {
      const m: IPageMapItem = mappingInfo.getAt(0);
      const x = m.h;

      let isSame = true;
      const isSame_arr = new Array(mappingInfo.length) as boolean[];
      isSame_arr[0] = true;
      for (let i = 1; i < mappingInfo.length; i++) {
        const mapItem: IPageMapItem = mappingInfo.getAt(i);
        const { a, b, c, d, e, f, g, h } = mapItem.h;
        if (a !== x.a || b !== x.b || c !== x.c || d !== x.d || e !== x.e || f !== x.f || g !== x.g || h !== x.h) {
          isSame = false;
          isSame_arr[i] = false;
        }
        else
          isSame_arr[i] = true;
      }

      const h_str = JSON.stringify(m.h);
      const h_rev_str = JSON.stringify(m.h_rev);
      this.setMetaInfoValue(pdfDoc, `homography`, h_str);
      this.setMetaInfoValue(pdfDoc, `rev_h`, h_rev_str);

      // 전체와 같이 않은 H는 따로 기록한다. pg_homography-pageNo이다
      for (let i = 1; i < mappingInfo.length; i++) {
        if (!isSame_arr[i]) {
          const mapItem: IPageMapItem = mappingInfo.getAt(0);
          const h_str = JSON.stringify(mapItem.h);
          const h_rev_str = JSON.stringify(mapItem.h_rev);
          const pageNo = mapItem.pdfPageNo;
          this.setMetaInfoValue(pdfDoc, `pg_homography-${pageNo}`, h_str);
          this.setMetaInfoValue(pdfDoc, `pg_rev_h-${pageNo}`, h_rev_str);
        }
      }
    }
  }


  private getInfoDict(pdfDoc: PDFDocument): PDFDict {
    const existingInfo = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info);
    if (existingInfo instanceof PDFDict) return existingInfo;

    const newInfo = pdfDoc.context.obj({});
    pdfDoc.context.trailerInfo.Info = pdfDoc.context.register(newInfo);

    return newInfo;
  }

  private setMetaInfoValue = (pdfDoc: PDFDocument, key: string, value: string) => {
    const pdfKey = PDFName.of(key);
    this.getInfoDict(pdfDoc).set(pdfKey, PDFHexString.fromText(value));
  }

  private printByPrintJs = (ncodedUrl: string, hasToPutNcode: boolean, originPdfUrl?:string) => {
    const printOption = this.printOption;
    const option = {
      url: ncodedUrl,
      show: true,
      targetPages: printOption.targetPages,
      progress: 0,
      calibrationMode: true,
    };

    printJS({
      printable: ncodedUrl,
      type: 'pdf',
      onError: function (error) {
        alert('Error found => ' + error.message)
      },
      showModal: false,
      onPrintDialogClose: function () {
        if (!hasToPutNcode) {
          option.url = originPdfUrl;
          showCalibrationDialog(option);
        }
      }
    });
  }

  private printByIFrame = (ncodedUrl: string) => {
    const uuid = uuidv4();
    const iframe = document.createElement("iframe");
    const name = `print_pdf_${uuid}`;
    iframe.name = name;
    iframe.setAttribute('style', 'height:0;width:0;border:0;border:none;visibility:hidden;');
    iframe.src = ncodedUrl;
    // iframe.height = "0";

    iframe.onload = () => {
      const wnd = iframe.contentWindow;

      if (wnd.matchMedia) {
        const mediaQueryList = wnd.matchMedia('print');
        mediaQueryList.addListener(function (mql) {
          if (mql.matches) {
            console.log("beforePrint();");
          } else {
            console.log("afterPrint();");
          }
        });
      }

      iframe.contentWindow.addEventListener('afterprint', (evt) => {
        document.body.removeChild(iframe)
      });
      window.frames[name].focus()
      window.frames[name].print()
    };

    document.body.appendChild(iframe);
  }

  private onFrameAfterPrint = (e) => {
    const ele = document.getElementsByName("print");
    const len = ele.length;
    const parentNode = ele[0].parentNode;
    for (let i = 0; i < len; i++) {
      parentNode.removeChild(ele[0]);
    }
  }

  private prepareSheet = async (sheetIndex: number, pageNums: number[]) => {
    const { pdf, printOption } = this;

    const rendererManager = SheetRendererManager.getInstance();
    const sheetDesc = await rendererManager.getPreparedSheet(pdf, pageNums, printOption, printOption.progressCallback);

    const ret: IPrintingEvent = { sheetIndex, pageNums, completion: 100, mappingItems: sheetDesc.mappingItems, sheetDesc }
    return ret;
  }


  resetPrintStatus = (printOption: IPrintOption) => {
    const { filename } = this;
    this.setProgressPercent(0);
    const tempMapping = new PdfDocMapper(filename, printOption.pagesPerSheet);
    this.tempMapper = tempMapping;

    return tempMapping;
  }

  progressCallback = (event?: { status: string }) => {
    /** Event 카운트를 증가 */
    this.numReports++;

    const { targetPages, pagesPerSheet } = this.printOption;
    const numPages = targetPages.length;
    const numSheets = Math.ceil(numPages / pagesPerSheet);

    let maxCount = 0;
    if (this.printOption.hasToPutNcode) {
      //일반 용지에 인쇄하는 경우
      maxCount = (numPages * 4) + (numSheets * 4) + numSheets + 1;
    } else {
      //ncode a4에 인쇄하는 경우
      maxCount = (numPages * 3) + (numSheets * 3) + numSheets + 1; //prepareSplittedNcodePlane에서 progressCallback이 빠짐
    }

    // const percent = (eventCount / maxCount) * 100;
    let percent = (this.numReports / maxCount) * 100;

    if (event && event.status === "completed") {
      console.log(`[COUNT] count=${this.numReports - 1}/${maxCount} numPages=${numPages} numSheets=${numSheets}`);
      percent = 100;
    }

    this.setProgressPercent(percent);
    if (!event || !event.status) {
      this.reportProgress({ status: "imtermidate", totalCompletion: percent });
    }
    else {
      this.reportProgress({ status: event.status, totalCompletion: percent });
    }
  }


  cancelPrint = () => {
    g_printCancelFired = true;
    console.log("cancel signaled");
  }
}


