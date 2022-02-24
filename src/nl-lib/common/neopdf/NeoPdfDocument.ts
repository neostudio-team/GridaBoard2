import * as PdfJs from "pdfjs-dist";
import { IFileBrowserReturn, IPageOverview, IPageSOBP, IPdfToNcodeMapItem } from "../structures";
import { uuidv4 } from "../util";
import { MappingStorage } from "../mapper";
import { NeoPdfPage, PDF_VIEWPORT_DESC } from "./NeoPdfPage";
import { resolve } from "path";
import { setLoadingVisibility } from "GridaBoard/store/reducers/loadingCircle";
import getText from "GridaBoard/language/language";

// import PdfJsWorker from "../../../../public/pdf.worker.2.5.207.js/index.js";
console.log(`PDFjs version=${PdfJs.version}`);
console.log(`PDFjs version=${PdfJs}`);
// PdfJs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PdfJs.version}/pdf.worker.js`;
PdfJs.GlobalWorkerOptions.workerSrc = "./pdf.worker.2.5.207.js";



const CMAP_URL = "./cmaps/";
const CMAP_PACKED = true;

let _doc_fingerprint = "";

export type IPdfOpenOption = {
  url: string,
  filename: string,

  purpose: string,

  fingerprint?: string,
  cMapUrl?: string,
  cMapPacked?: boolean,
}

export class NeoPdfDocument {
  _pdfDoc: PdfJs.PDFDocumentProxy;

  // _ready: PdfJs.PDFLoadingTask<PdfJs.PDFDocumentProxy>;
  removedPage ?: number[] = [];

  _uuid: string;

  private _url: string;

  private _filename: string;

  private _purpose: string;

  private _fingerprint: string;

  private _id: string;

  private _title: string;

  private _numPages: number;

  public pdfToNcodeMap: IPdfToNcodeMapItem;

  get title() {
    return this._title;
  }

  private _pages: NeoPdfPage[];


  /** starting from 0 (page 1 ==> 0) */
  _pagesOverview: IPageOverview[];

  /** starting from 0 (page 1 ==> 0), for printing */
  _ncodeAssigned: IPageSOBP[];

  direction: "portrait" | "landscape";

  constructor() {
    this._uuid = uuidv4();

    console.log(`:GRIDA DOC:,     constructor()`);
  }

  load = async (options: IPdfOpenOption) => {
    console.log("~GRIDA DOC~,   load, step 1")
    const pdfDoc = await pdfJsOpenDocument(options);

    console.log("~GRIDA DOC~,   load, step 2")


    const { url, filename, cMapUrl, cMapPacked, purpose } = options;

    this._url = url;
    this._filename = filename;
    this._purpose = purpose;
    this._fingerprint = pdfDoc.fingerprint;
    this._numPages = pdfDoc.numPages;
    this._pdfDoc = pdfDoc;
    this.removedPage = [];
    _doc_fingerprint = pdfDoc.fingerprint;

    // page를 로드한다
    if (pdfDoc) {
      this._pages = [];
      for (let i = 0; i < this._pdfDoc.numPages; i++) {
        // const page = await pdf.getPageAsync(i + 1);
        const neoPage = new NeoPdfPage(this, i + 1);
        this._pages.push(neoPage);
      }

      await this.setPageOverview();
      return this;
    }

    return undefined;
  }
  deletePage = async (pageNo:number)=>{
    this._pages[pageNo].pageNo = -1;
    this._pages.splice(pageNo,1);
    this._pagesOverview.splice(pageNo,1);
    this._numPages -= 1;
    
    for(let i = pageNo; i < this._numPages; i++){
      this._pages[i].pageNo -= 1;
    }
    this.removedPage.push(pageNo);
  }

  gridaLoad = async (options: IPdfOpenOption, gridaStruct: any, neoStroke: any) => {
    console.log("~GRIDA DOC~,   load, step 1")
    const pdfDoc = await gridaJsOpenDocument(options, gridaStruct, neoStroke);
    console.log("~GRIDA DOC~,   load, step 2")

    const { url, filename, purpose } = options;

    this._url = url;
    this._filename = filename;
    this._purpose = purpose;
    this._fingerprint = pdfDoc.fingerprint;
    this._numPages = pdfDoc.numPages;
    this._pdfDoc = pdfDoc;
    _doc_fingerprint = pdfDoc.fingerprint;

    // page를 로드한다
    if (pdfDoc) {
      this._pages = [];
      for (let i = 0; i < this._pdfDoc.numPages; i++) {
        const neoPage = new NeoPdfPage(this, i + 1);
        this._pages.push(neoPage);
      }
      await this.setPageOverview();
      return this;
    }
    return undefined;
  }

  // /**
  //  * PDF에 할당된 ncode를 저장하는 루틴
  //  *
  //  * MappingStorage가 변하고 나면, 로드된 모든 PDF에 이 함수를 한번씩 불러줘야 한다
  //  */
  // public refreshNcodeMappingTable = () => {
  //   const msi = MappingStorage.getInstance();

  //   const mapItems = msi.findAssociatedNcode(this.fingerprint, BASECODE_PAGES_PER_SHEET);
  //   let theBase = mapItems.theBase;
  //   let theSame = mapItems.theSames.length > 0 ? mapItems.theSames[0] : undefined;
  //   this.pdfToNcodeMap = theBase;

  //   // unique하므로 배열이 아닌 하나 밖에 안나올텐데, 이렇게 써 둔다.
  //   if (!theBase) {
  //     // 코드에 등록되지 않은 신규 PDF를 load한 것이다. 이 때는 임시 코드와 매핑해두자
  //     const { url, filename, fingerprint, numPages } = this;
  //     theBase = msi.makeTemporaryAssociateMapItem({ pdf: { url, filename, fingerprint, numPages }, n_paper: undefined });

  //     if (!theSame) {
  //       theSame = theBase;
  //     }
  //   }
  //   this.addNcodeMapping(theSame, theBase);
  // }

  // public addNcodeMapping = (theSame: IPdfToNcodeMapItem, theBase: IPdfToNcodeMapItem) => {
  //   if (theSame.fingerprint !== this.fingerprint) {
  //     console.error("NeoPdfDocument: the fingerprint of the map item is not same");
  //     return;
  //   }

  //   for (let i = 0; i < this.numPages; i++) {
  //     const page = this._pages[i];
  //     const pageNo = i + 1;
  //     page.addPageToNcodeMaps([theSame.params[i]]);
  //   }
  // }

  destroy = () => {
    this._pages = [];
    this._pdfDoc.destroy();
  }

  get numPages() { return this._numPages; }

  get url() { return this._url; }

  get filename() { return this._filename; }

  get fingerprint() { return this._fingerprint; }

  get purpose() { return this._purpose }


  getPageAsync = async (pageNo: number) => {
    await this._pages[pageNo - 1]._ready;
    return this._pages[pageNo - 1];
  }

  /** page가 로드된 것이 확실할 때만 쓸 것! */
  getPage = (pageNo: number) => {
    if (pageNo > this.numPages) {
      console.error(`page range over ${pageNo}/${this.numPages}`);
      return undefined;
    }

    if (!this._pages[pageNo - 1]._loaded) {
      throw new Error(`PDF page ${pageNo} has not been loaded`);
    }

    return this._pages[pageNo - 1];
  }

  getMetadata = async () => {
    return this._pdfDoc.getMetadata();
  }

  public getPageThumbnailUrl = async (
    pageNo: number, width: number, height: number,
    bgColor = "rgba(255,255,255,0)", drawCalibrationMark = false, markPos = 2) => {
    if (pageNo < 1 || pageNo > this.numPages) {
      console.error(`getPageThumbnailUrl failed, page number is ${pageNo} of total pages(${this.numPages})`);
      return NeoPdfPage.getDummyThumbnail();
    }
    const neoPage = await this.getPageAsync(pageNo);
    return neoPage.getThumbnailUrl(width, height, bgColor, drawCalibrationMark, markPos);
  }

  public generatePageThumbnails = async (width: number, height: number, bgColor: string, drawCalibrationMark: boolean) => {
    const numPages = this.numPages;
    for (let i = 1; i <= (numPages > 1 ? 2 : 1); i++) {
      await this.getPageThumbnailUrl(i, width, height, bgColor, drawCalibrationMark);
    }
  }

  // public renderPages_dpi = async (pageNums: number[], dpi: number, printOption: IPrintOption, progressCallback: IProgressCallbackFunction)
  //   : Promise<IPdfPageCanvasDesc[]> => {
  //   const { colorMode, luminanceMaxRatio } = printOption;
  //   const pdfDpi = dpi;

  //   const promises: Promise<IPdfPageCanvasDesc>[] = [];
  //   for (let i = 0; i < pageNums.length; i++) {
  //     const pageNo = pageNums[i];
  //     const neoPage = await this.getPageAsync(pageNo);
  //     if (progressCallback) progressCallback();

  //     const pr = neoPage.render_dpi(i, pdfDpi).then(async (canvasDesc) => {
  //       const convertResult = await neoPage.convertColor(canvasDesc, colorMode, luminanceMaxRatio);
  //       if (progressCallback) progressCallback();

  //       return convertResult;
  //     })
  //     promises.push(pr);
  //   }
  //   const descs = await Promise.all(promises);

  //   const pageImageDescs: IPdfPageCanvasDesc[] = new Array(descs.length);
  //   descs.forEach(async (canvasDesc) => {
  //     const { index } = canvasDesc;
  //     pageImageDescs[index] = canvasDesc;
  //     // console.log(`[Multipage] page rendered ${canvasDesc.pdfPageInfo.pageNo}, index ${index}`);
  //   });

  //   // let converterPromises = [];
  //   // descs.forEach(async (canvasDesc) => {
  //   //   const { index } = canvasDesc;
  //   //   pageImageDescs[index] = canvasDesc;

  //   //   const pdfCanvas = canvasDesc.canvas;
  //   //   const converter = new CanvasColorConverter(pdfCanvas);
  //   //   const pr = converter.convert(colorConvertMode);
  //   //   converterPromises.push(pr);
  //   // });
  //   return pageImageDescs;
  // }


  // generateMappingItems = (pageImagesDesc: IPdfPageCanvasDesc[], ncodePlane: ICellsOnSheetDesc, needToIssuePrintCode: boolean) => {
  //   const array: CoordinateTanslater[] = [];

  //   for (let i = 0; i < ncodePlane.ncodeAreas.length; i++) {
  //     const desc = pageImagesDesc[i];
  //     const pdfRect = desc.drawnRect;
  //     const ncode = ncodePlane.ncodeAreas[i];

  //     const mapData = new MappingItem();

  //     /** canvas 좌표계 */
  //     const { x, y, unit, width, height } = pdfRect;
  //     const dpi = stringToDpiNum(unit);

  //     /** Ncode 좌표계 */
  //     const pt0_nu = getNcodeAtCanvasPixel({ x, y, dpi }, ncodePlane);
  //     const pt1_nu = getNcodeAtCanvasPixel({ x: x + width, y: y + height, dpi }, ncodePlane);

  //     const pdfRect_nu = getNcodeRectAtCanvasPixel({ dpi, x, y, width, height }, ncodePlane);

  //     /** 페이지에 해당하는 ncode가 인쇄된 영역 */
  //     const r_nu = ncode.rect;
  //     const polygon: IPolygonArea = [
  //       { x: r_nu.x, y: r_nu.y },
  //       { x: r_nu.x + r_nu.width, y: r_nu.y },
  //       { x: r_nu.x + r_nu.width, y: r_nu.y + r_nu.height },
  //       { x: r_nu.x, y: r_nu.y + r_nu.height },
  //     ];

  //     mapData.setNcodeArea({
  //       pageInfo: ncode.pageInfo,
  //       rect: { ...pdfRect_nu },
  //       npageArea: polygon,
  //     });


  //     /** PDF 좌표계 */
  //     mapData.setPdfArea({
  //       pdfPageInfo: { ...desc.pdfPageInfo },
  //       rect: {
  //         unit: "pu",
  //         x: 0, y: 0,
  //         width: desc.width_pu,
  //         height: desc.height_pu,
  //       }
  //     });

  //     const trans = new CoordinateTanslater();
  //     trans.calc(mapData);
  //     array.push(trans);

  //     // const pageNo = desc.pdfPageInfo.pageNo;
  //     // const page = this.getPage(pageNo);
  //     // page.setTranslater(trans);

  //     // if (needToIssuePrintCode) {
  //     //   const msi = MappingStorage.getInstance();
  //     //   msi.register(trans);
  //     // }
  //     // trans.dump(`[dump-${this._url}]-${i} `);
  //   }

  //   return array;

  // }

  // setDocumentId = (pagesPerSheet: number) => {
  //   this._id = Util.makePdfId(this._fingerprint, pagesPerSheet);
  // }

  get id() {
    return this._id;
  }

  getPageSize = (pageNo: number) => {
    if (pageNo > this.numPages) {
      return undefined;
    }
    // return {width:595, height:841};
    return this._pagesOverview[pageNo - 1].sizePu;
  }

  setPageOverview = async () => {
    this._pagesOverview = new Array(this.numPages);

    let numPortraitPages = 0;
    let numLandscapePages = 0;

    for (let i = 0; i < this.numPages; i++) {
      const page = await this._pdfDoc.getPage(i + 1);

      const vpt: PDF_VIEWPORT_DESC = page.getViewport({ scale: 1, rotation: page.rotate });
      
      const { width, height } = vpt;
      let _LandWidth = width, _LandHeight = height;
      if(page.rotate === 90 || page.rotate === 270 ){
        _LandWidth = height, _LandHeight = width;
      }
      
      const landscape = _LandWidth > _LandHeight;
      landscape ? numLandscapePages++ : numPortraitPages++;

      const pageOverview = {
        rotation: vpt.rotation,
        landscape,
        sizePu: { width, height },
      }
      this._pagesOverview[i] = pageOverview;
    }

    if (numPortraitPages >= numLandscapePages) {
      this.direction = "portrait";
    } else {
      this.direction = "landscape";
    }

    return this.direction;
  }

  setNcodeAssigned = (pdfToNcodeMap: IPdfToNcodeMapItem) => {
    this._ncodeAssigned = MappingStorage.makeAssignedNcodeArray(pdfToNcodeMap.printPageInfo, this.numPages);
  }

  getPageNcode = (pageNo: number) => {
    if (!pageNo || pageNo < 1 || pageNo > this.numPages) {
      throw "Page number range error";
    }

    return this._ncodeAssigned[pageNo - 1];
  }

  get pagesOverview() {
    return this._pagesOverview;
  }
}

const max_concurrent = 16;
let pdf_loader_idx = 0;
const pdf_fingerprint: string[] = new Array(16);

function gridaJsOpenDocument(options: IPdfOpenOption, _gridaRawData: any, _neoStroke: any): Promise<PdfJs.PDFDocumentProxy> {
  
  const { url, cMapUrl, cMapPacked } = options;

  pdf_loader_idx = (pdf_loader_idx + 1) % max_concurrent;
  pdf_fingerprint[pdf_loader_idx] = "";

  console.log(":GRIDA DOC:,     gridaJsOpenDocument, step 1")

  const docInitParams = { 
    data: _gridaRawData, 
    neostroke: _neoStroke,
    url: url,
    cMapUrl: cMapUrl ? cMapUrl : CMAP_URL,
    cMapPacked: cMapPacked ? cMapPacked : CMAP_PACKED,
  };

  return new Promise (resolve => {
    PdfJs.getDocument(docInitParams).promise.then(function (pdf) { 
      resolve(pdf);
      pdf_fingerprint[pdf_loader_idx] = pdf.fingerprint;
    })
  })
}


function pdfJsOpenDocument(options: IPdfOpenOption): Promise<PdfJs.PDFDocumentProxy> {
  const { url, filename, cMapUrl, cMapPacked, purpose } = options;

  pdf_loader_idx = (pdf_loader_idx + 1) % max_concurrent;
  pdf_fingerprint[pdf_loader_idx] = "";

  console.log(":GRIDA DOC:,     pdfJsOpenDocument, step 1")

  const openOption = {
    url: url,
    cMapUrl: cMapUrl ? cMapUrl : CMAP_URL,
    cMapPacked: cMapPacked ? cMapPacked : CMAP_PACKED,
  };

  
  console.log(`:GRIDA DOC:,     pdfJsOpenDocument, step 2  fingerprint=${pdf_fingerprint} `);
  const loadingTask: any = PdfJs.getDocument(openOption); 
  //onPassword가 typescript에서 compile이 안된다. :any를 추가함

  loadingTask.onPassword = function passwordNeeded(updateCallback, reason) {
    //when the document is encrypted, this function will be triggered
    if (reason === 1) {
      const password = prompt(getText("need_password"));
      if (password === null) {
        loadingTask.destroy();
      } else {
        updateCallback(password);
      }
    } else {
      updateCallback(null);
      confirm(getText("wrong_password"));
    }
  };

    /**
     * 왜, 아래의 부분의 await 다음이 두번 콜백 실행되지? callback에 등록이 희안하게 되는 모양인데 말이지.
     * 마치 thread가 나뉘어 진 것 같이 동작한다.
     * NeoPdfDocument도 객체가 두번 생긴다. 이건 버그가 아닌가 싶은데 말이지?
     *
     * 2020/12/27, kitty
     */
    // // eslint-disable-next-line no-constant-condition
    // if (1 === 0) {
    //   const pdfDoc = await loadingTask.promise;
    //   console.log(`:GRIDA DOC:,     pdfJsOpenDocument, step 3  fingerprint=${pdf_fingerprint} `);
    //   pdf_fingerprint = pdfDoc.fingerprint;
    //   return pdfDoc;
    // }


    /**
     * 아래는 임시 방편으로 하나만 리턴하도록 했다. 즉, 꼼수다.
     * 2020/12/27, kitty
     */
    return new Promise(resolve => {
      loadingTask.promise.then(pdf => {
        resolve(pdf);

        // if (pdf_fingerprint[pdf_loader_idx] === "" || pdf_fingerprint[pdf_loader_idx] !== pdf.fingerprint) {
        //   resolve(pdf); 
        // }
        // else {
        //   pdf.destroy();
        // }
        console.log(`:GRIDA DOC:,     pdfJsOpenDocument, step 3  fingerprint=${pdf_fingerprint} `);
        pdf_fingerprint[pdf_loader_idx] = pdf.fingerprint;
      }, function (e) {
        console.error('error code : ' + e)
        setLoadingVisibility(false);
      });
    })
  }


