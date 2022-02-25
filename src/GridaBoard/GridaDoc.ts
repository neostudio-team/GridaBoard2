import GridaPage from "./GridaPage";
import { store } from "./client/pages/GridaBoard";
import { forceToRenderPanes, setActivePageNo, setActivePdf, setDocNumPages, setUrlAndFilename } from "./store/reducers/activePageReducer";
import { RootState } from "./store/rootReducer";

import { g_availablePagesInSection, nullNcode } from "nl-lib/common/constants";
import { NeoPdfDocument, IPdfOpenOption, NeoPdfManager, PdfManagerEventName, IPdfManagerEvent } from "nl-lib/common/neopdf";
import { IPdfToNcodeMapItem, IPageSOBP, IGetNPageTransformType } from "nl-lib/common/structures";
import { isPlatePage, isSamePage, makeNPageIdStr, scrollToThumbnail } from "nl-lib/common/util";


import { InkStorage } from "nl-lib/common/penstorage";
import { MappingStorageEventName, IMappingStorageEvent, MappingStorage } from "nl-lib/common/mapper";
import getText from "./language/language";


let _doc_instance = undefined as GridaDoc;

export default class GridaDoc {
  _pages: GridaPage[] = [];


  _pdfd: {
    pdf: NeoPdfDocument,

    fingerprint: string,
    pdfOpenInfo: IPdfOpenOption,
    promise: Promise<NeoPdfDocument>,
    startPageInDoc: number,       // starting from 0
    endPageInDoc: number,         // starting from 0

    pdfToNcodeMap: IPdfToNcodeMapItem,
  }[] = [];

  get numPages() {
    return this._pages.length;
  }

  constructor() {
    if (_doc_instance) return _doc_instance;

    const pdfManager = NeoPdfManager.getInstance();
    pdfManager.addEventListener(PdfManagerEventName.ON_PDF_LOADED, this.onPdfLoaded);

    const msi = MappingStorage.getInstance();
    msi.addEventListener(MappingStorageEventName.ON_MAPINFO_ADDED, this.handleMapInfoAdded);
    msi.addEventListener(MappingStorageEventName.ON_MAPINFO_REFRESHED, this.refreshNcodeMappingTable);
  }


  getPage = (pageNo: number) => {
    return this._pages[pageNo];
  }


  static getInstance() {
    if (_doc_instance) return _doc_instance;
    _doc_instance = new GridaDoc();

    return _doc_instance;
  }

  handleMapInfoAdded = (event: IMappingStorageEvent) => {
    // const docMap = event.mapper.docMap;
    // const pdfDescs = this._pdfd.filter(pdfDesc => pdfDesc.fingerprint === docMap.fingerprint);
    // pdfDescs.forEach(pdfDesc => pdfDesc.pdf.refreshNcodeMappingTable());
    const docMap = event.mapper.docMap;

    docMap.params.forEach(param => {
      this._pages.forEach(page => {
        // if (page.fingerprint === docMap.fingerprint && params.pdfDesc.pageNo === page.pdfPageNo) { 새로운 pdf를 만드는거니 fingerprint가 다를 수 밖에
        if (param.pdfDesc.pageNo === page.pageNo + 1) { //두번째로 추가된 pdf의 pdfPageNo는 자기자신 pdf만의 pageNo이니까 page의 pageNo으로 비교해야됨
          page.addPageToNcodeMaps([param]);
        }
      });
    })
    //param.pdfDesc.pageNo은 1부터 시작
    //page.pageNo은 0부터 시작
    forceToRenderPanes();
  }

  refreshNcodeMappingTable = (event: IMappingStorageEvent) => {
    // const docMap = event.mapper.docMap;
    // const pdfDescs = this._pdfd.filter(pdfDesc => pdfDesc.fingerprint === docMap.fingerprint);
    // pdfDescs.forEach(pdfDesc => pdfDesc.pdf.refreshNcodeMappingTable());

    forceToRenderPanes();
  }



  public handleSetNcodeMapping = (docMap: IPdfToNcodeMapItem) => {
    // 내장한 PDF들에 대해서 pageInfo를 등록
    const pdfDescs = this._pdfd.filter(pdfDesc => pdfDesc.fingerprint === docMap.fingerprint);
    // pdfDescs.forEach(pdfDesc => pdfDesc.pdf.refreshNcodeMappingTable());

    forceToRenderPanes();

    // GridaPage에 pageInfo를 등록
    docMap.params.forEach(params => {
      this._pages.forEach(page => {
        if (page.fingerprint === docMap.fingerprint && params.pdfDesc.pageNo === page.pdfPageNo) {
          // page.addPageToNcodeMaps([params]);
        }
      });
    })
  }

  /**
   *
   * @param option
   * @param basePageInfo - 이게 있는 경우에는 이미 mapping 테이블에 등록되어 있는 pdf
   */
  public openPdfFile = async (option: { url: string, filename: string },
    pageInfo: IPageSOBP = undefined, basePageInfo: IPageSOBP = undefined) => {

    const pdfDoc = await NeoPdfManager.getInstance().getDocument({ url: option.url, filename: option.filename, purpose: "open pdf by GridaDoc" });
    // setActivePdf(pdfDoc);
    console.log(pdfDoc);

    if (pdfDoc) {
      let activePageNo = await this.appendPdfDocument(pdfDoc, pageInfo, basePageInfo);

      if (activePageNo === -1) {
        const state = store.getState() as RootState;
        activePageNo = state.activePage.activePageNo;
      }
      this.setActivePageNo(activePageNo);
      scrollToThumbnail(activePageNo)
    }
  }

  public openGridaFile = async (option: { url: string, filename: string }
    , gridaRawData, neoStroke, pageInfos: IPageSOBP[], basePageInfos: IPageSOBP[]) => {
    const pdfDoc = await NeoPdfManager.getInstance().getGrida({ url: option.url, filename: option.filename, purpose: "open pdf by GridaDoc" }, gridaRawData, neoStroke);

    if (pdfDoc) {
      this._pages = [];

      let activePageNo = await this.appendPdfDocumentForGrida(pdfDoc, pageInfos, basePageInfos); //이 안에서 doc에 pages를 넣어줌
      
      if (activePageNo === -1) {
        const state = store.getState() as RootState;
        activePageNo = state.activePage.activePageNo;
        this.setActivePageNo(activePageNo);
        return;
      }

      
      this.setActivePageNo(activePageNo);
      scrollToThumbnail(activePageNo)

      const msi = MappingStorage.getInstance();
      msi.dispatcher.dispatch(MappingStorageEventName.ON_MAPINFO_REFRESHED, null);
    }
  }

  public removePages = async (page:number) => {
    //_page에서 삭제
    if(page >= this._pages.length) return ;
    const pages = this._pages.splice(page, 1)[0] as GridaPage;
    const changedPdf = pages._pdf;
    if(changedPdf !== undefined) await changedPdf.deletePage(pages.pdfPageNo - 1);
    
    for(let i = page; i < this._pages.length; i++){
      const nowPage = this._pages[i];
      //pageNo 와 pageInfo의 page 는 여기서 관리하는 순서와 같음
      nowPage._pageNo -= 1;
      // nowPage.pageInfos[0].page -= 1;
      if(pages.fingerprint !== undefined && pages.fingerprint === nowPage.fingerprint){
        //같은 pdf의 경우에만 pdfPageNo또한 변경해주어야 한다
        nowPage._pdfPageNo -= 1;
      }
    }

    //스트로크 데이터 삭제
    InkStorage.getInstance().removePage(pages.pageInfos[0]);
    //맴핑 데이터 삭제
    if(changedPdf !== undefined){
      const msi = MappingStorage.getInstance();
      msi.removeNcodeByPage(changedPdf.fingerprint, page);
    }


    //마지막 페이지를 보고 있을때 이전 페이지 보여주기    
    if(store.getState().activePage.activePageNo >= this._pages.length){
      setActivePageNo(this._pages.length-1);
    }

    setDocNumPages(this._pages.length);
  }
  private appendPdfDocumentForGrida = (pdfDoc: NeoPdfDocument, pageInfos: IPageSOBP[], basePageInfos: IPageSOBP[]) => {
    // const found = this._pdfd.find(item => item.fingerprint === pdfDoc.fingerprint);
    // if (found) {
    //   alert(getText("alert_regedPdf"));
    //   return -1;
    // }


    this._pdfd = [];

    // 2) PDF 배열에 정보를 추가하고
    this._pdfd.push({
      pdf: pdfDoc,
      fingerprint: pdfDoc.fingerprint,
      pdfOpenInfo: { url: pdfDoc.url, filename: pdfDoc.filename, purpose: "to be stored by GridaDoc", },
      promise: Promise.resolve(pdfDoc),
      startPageInDoc: this.numPages,
      endPageInDoc: this.numPages + pdfDoc.numPages - 1,
      pdfToNcodeMap: pdfDoc.pdfToNcodeMap,
    });

    // 3) 페이지를 넣어 주자
    const numPages = pdfDoc.numPages;
    const pageNoArr = [] as number[];

    const msi = MappingStorage.getInstance();
    let theBase = msi.findAssociatedBaseNcode(pdfDoc.fingerprint);
    if (!theBase) {
      const { url, filename, fingerprint, numPages } = pdfDoc;
      theBase = msi.makeTemporaryGridaMapItem({ pdf: { url, filename, fingerprint, numPages } }, pageInfos, basePageInfos);
    }

    for (let i = 0; i < numPages; i++) {
      const pageNo = this.addPdfPage(pdfDoc, i + 1, pageInfos[i], basePageInfos[i]);
      pageNoArr.push(pageNo);
    }

    setDocNumPages(this._pages.length);

    return pageNoArr[0];
  }

  private appendPdfDocument = (pdfDoc: NeoPdfDocument, pageInfo: IPageSOBP, basePageInfo: IPageSOBP) => {
    // 0) PDF가 있는지 찾아보고 있으면 return, (없으면 1, 2를 통해서 넣는다)
    const found = this._pdfd.find(item => item.fingerprint === pdfDoc.fingerprint);
    if (found) {
      alert(getText("alert_regedPdf"));
      return -1;
    }

    // 1) page와 maps(MappingStorage)에 있는 정보를 매핑해둔다.
    // pdfDoc.refreshNcodeMappingTable();

    // 2) PDF 배열에 정보를 추가하고
    this._pdfd.push({
      pdf: pdfDoc,
      fingerprint: pdfDoc.fingerprint,
      pdfOpenInfo: { url: pdfDoc.url, filename: pdfDoc.filename, purpose: "to be stored by GridaDoc", },
      promise: Promise.resolve(pdfDoc),
      startPageInDoc: this.numPages,
      endPageInDoc: this.numPages + pdfDoc.numPages - 1,
      pdfToNcodeMap: pdfDoc.pdfToNcodeMap,
    });

    // 3) 페이지를 넣어 주자
    const numPages = pdfDoc.numPages;
    const pageNoArr = [] as number[];

    if (!basePageInfo && !pageInfo) {
      const msi = MappingStorage.getInstance();
      let theBase = msi.findAssociatedBaseNcode(pdfDoc.fingerprint);
      if (!theBase) {
        const { url, filename, fingerprint, numPages } = pdfDoc;
        theBase = msi.makeTemporaryAssociateMapItem({ pdf: { url, filename, fingerprint, numPages }, n_paper: undefined, numBlankPages: undefined });
      }

      basePageInfo = theBase.basePageInfo;
      pageInfo = theBase.printPageInfo;
    } else if (!basePageInfo) {
      const msi = MappingStorage.getInstance();
      let theBase = msi.findAssociatedBaseNcode(pdfDoc.fingerprint);
      if (!theBase) {
        const { url, filename, fingerprint, numPages } = pdfDoc;
        theBase = msi.makeTemporaryAssociateMapItem({ pdf: { url, filename, fingerprint, numPages }, n_paper: undefined, numBlankPages: undefined });
      }
      basePageInfo = theBase.basePageInfo;
    }

    const m0 = g_availablePagesInSection[pageInfo.section];
    const m1 = g_availablePagesInSection[basePageInfo.section];

    for (let i = 0; i < numPages; i++) {
      const pi = { ...pageInfo, page: (pageInfo.page + i + m0) % m0 };
      const bpi = { ...basePageInfo, page: (basePageInfo.page + i + m1) % m1 };
      // const maps = pdfDoc.getPage(i + 1).pageToNcodeMaps;
      const pageNo = this.addPdfPage(pdfDoc, i + 1, pi, bpi);
      pageNoArr.push(pageNo);
    }

    setDocNumPages(this._pages.length);

    return pageNoArr[0];
  }

  private addPdfPage = (pdf: NeoPdfDocument, pdfPageNo: number, pageInfo: IPageSOBP, basePageInfo: IPageSOBP) => {
    // const page = this._pages.find(pg => isSamePage(pg.basePageInfo, newBasePageInfo));
    const page = new GridaPage(this.numPages, pageInfo, basePageInfo);
    page.setPdfPage(pdf, pdfPageNo)

    this._pages.push(page);

    return this._pages.length - 1;
  }


  /**
   * Message handlers
   * @param event
   */
  public onPdfLoaded = (event: IPdfManagerEvent) => {
    const pdf = event.pdf;
    console.log(`file ${pdf.filename} loaded`);
    console.log(`-GRIDA DOC-, onPdfLoaded ${pdf.filename},  purpose:${pdf.purpose} - ${pdf.url}`);
  }

  public setActivePageNo = (pageNo: number) => {
    setActivePageNo(pageNo);
  }


  public handleActivePageChanged = (pageInfo: IPageSOBP, found: IGetNPageTransformType) => {
    const newBasePageInfo = found.basePageInfo;
    const page = this._pages.find(pg => isSamePage(pg.basePageInfo, newBasePageInfo));

    const retVal = {
      needToLoadPdf: false,
      pageInfo: undefined as IPageSOBP,
      basePageInfo: undefined as IPageSOBP,
    };

    if (page) {
      // 페이지가 찾아졌으면
      const newPageNo = page.pageNo;

      const msi = MappingStorage.getInstance();
      const map = msi.getNPageTransform(pageInfo);
      page.addPageInfo(pageInfo, map.basePageInfo);

      const state = store.getState() as RootState;
      const currActivePage = state.activePage.activePageNo;
      if (newPageNo !== currActivePage) {
        setActivePageNo(newPageNo);
      }
    }
    else {
      // 페이지가 찾기지 않았으면
      switch (found.type) {
        case "pod": {
          // POD인 경우 file을 로드하라고 전달
          retVal.needToLoadPdf = true;

          const pageInfo = { ...found.pageInfo };
          const basePageInfo = { ...found.basePageInfo };
          const pdfParmas = found.pdf.pdfParams;
          // PDF의 시작 페이지
          const m0 = g_availablePagesInSection[pageInfo.section];
          pageInfo.page = (pageInfo.page - (found.pdf.pdfPageNo - 1) + m0) % m0;

          const m1 = g_availablePagesInSection[basePageInfo.section];
          basePageInfo.page = (basePageInfo.page - (found.pdf.pdfPageNo - 1) + m1) % m1;

          retVal.pageInfo = pageInfo;
          retVal.basePageInfo = basePageInfo;

          const firstPageNo = this.numPages;
          for (let i = 0; i < found.pdf.numPages; i++) {
            const bpi = pdfParmas[i].basePageInfo;
            const activePageNo = this.addNcodePage(bpi);
          }
          setDocNumPages(this._pages.length);
          setActivePageNo(firstPageNo);

          break;
        }

        case "note":
        case "default":
        default: {
          //
          const activePageNo = this.addNcodePage(pageInfo);
          setDocNumPages(this._pages.length);
          setActivePageNo(activePageNo);
          scrollToThumbnail(activePageNo)
          break;
        }
      }
    }

    return retVal;
  }

  public addBlankPage = () => {
    const msi = MappingStorage.getInstance();
    const theBase = msi.makeTemporaryAssociateMapItem({ n_paper: undefined, pdf: undefined, numBlankPages: 1 });

    const basePageInfo = theBase.basePageInfo;
    const newPageNo = this.addNcodePage(basePageInfo);
    setDocNumPages(this._pages.length);
    return newPageNo;
  }

  public addNcodePage = (pageInfo: IPageSOBP) => {
    console.log(` GRIDA DOC , ncode page added ${makeNPageIdStr(pageInfo)}`);
    const msi = MappingStorage.getInstance();
    const found = msi.getNPageTransform(pageInfo);

    const page = new GridaPage(this.numPages, pageInfo, pageInfo);
    this._pages.push(page);

    return this._pages.length - 1;
  }

  public removePdfDoc = (pdf: NeoPdfDocument) => {
    const targets = this._pdfd.filter(item => item.pdf.fingerprint === pdf.fingerprint);

    targets.forEach(target => {
      const len = target.endPageInDoc - target.startPageInDoc;
      this._pages = this._pages.splice(target.startPageInDoc, len);
    });

    this._pdfd = this._pdfd.filter(item => item.pdf.fingerprint !== pdf.fingerprint);
  }


  get pages() {
    return this._pages;
  }

  set pages(pages: GridaPage[]) {
    this._pages = pages;
  }

  getPdfUrlAt = (pageNo: number) => {
    if (pageNo < this.numPages) return this._pages[pageNo].url;
    return undefined;
  }

  getPdfFilenameAt = (pageNo: number) => {
    if (pageNo < this.numPages) return this._pages[pageNo].filename;
    return undefined;
  }

  getPdfFingerprintAt = (pageNo: number) => {
    if (pageNo < this.numPages) return this._pages[pageNo].fingerprint;
    return undefined;
  }

  getPageAt = (pageNo: number) => {
    if (pageNo < this.numPages) return this._pages[pageNo];
    return undefined;
  }

  getPdfPageNoAt = (pageNo: number) => {
    if (pageNo < this.numPages) return this._pages[pageNo].pdfPageNo;
    return undefined;
  }

  getPageInfosAt = (pageNo: number) => {
    if (pageNo < this.numPages) return this._pages[pageNo].pageInfos;
    return undefined;
  }

  getBasePageInfoAt = (pageNo: number) => {
    if (pageNo < this.numPages) return this._pages[pageNo].basePageInfo;
    return undefined;
  }
}

export const addBlankPage = async () => {
  const doc = GridaDoc.getInstance();
  const pageNo = await doc.addBlankPage();
  setActivePageNo(pageNo);

  return pageNo;
}
