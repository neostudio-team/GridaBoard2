import { NeoPdfDocument, NeoPdfPage } from "nl-lib/common/neopdf";
import { IPageMapBase, IPageSOBP, IPageOverview } from "nl-lib/common/structures";
import { getNPaperSize_pu } from "nl-lib/common/noteserver";
import { isSamePage } from "nl-lib/common/util";

export default class GridaPage {
  _pageNo: number;

  _pdf: NeoPdfDocument;
  _pdfPageNo: number;

  _pdfPage: NeoPdfPage;

  // _pageInfo: IPageSOBP = { section: -1, owner: -1, book: -1, page: -1 };

  _pageToNcodeMaps: IPageMapBase[] = [];
  _rotation: number;

  constructor(pageNo: number, pageInfo: IPageSOBP, basePageInfo: IPageSOBP) {
    this._pageNo = pageNo;
    this._pageToNcodeMaps = [{ pageInfo, basePageInfo }];
    this._rotation = 0;
  }

  get fingerprint() {
    if (this.pdf) return this.pdf.fingerprint;
    return undefined;
  }

  /**
   * 이 함수는 NeoPdfPage의 _pageToNcodeMaps을 저장해 둔다
   * 혹시, NeoPdfPage._pageToNcodeMaps 값 자체가 바뀌게 되면 문제를 일으킬 수 있으니,
   * NeoPdfPage에서는  _pageToNcodeMaps 자체는 바꾸지 말도록 하자. 내용은 상관 없다.
   *
   * NeoPdfPage._pageToNcodeMapgs = new IPageMapItem[]; 이런식의 코드를 쓰지 말라는 얘기
   */
  setPdfPage = (pdf: NeoPdfDocument, pdfPageNo: number) => {
    this._pdf = pdf;
    this._pdfPageNo = pdfPageNo;
    this._pdfPage = pdf.getPage(pdfPageNo);

    if (this._pdf.pagesOverview[this._pdfPageNo - 1]) {
      this._rotation = this._pdf.pagesOverview[this._pdfPageNo - 1].rotation;
    }
    // this._pageToNcodeMap = this._pdfPage.pageToNcodeMap;
  }

  // // 여기서 부터는 mapping item에 대한 내용
  addPageToNcodeMaps = (pageMaps: IPageMapBase[]) => {
    // this._pageToNcodeMaps 자체가 바뀌는 것을 막자, GridaDoc에서 쓴다.
    //
    // 이걸, pointer로 복사하게 된다면,
    // GridaDoc와 GridaPage의 pageInfo 관련된 항목을 자동 업데이트 되게 수정해야 한다.
    const storedMaps = this._pageToNcodeMaps;
    pageMaps.forEach(pageMap => {
      const isIncluded =
        storedMaps.findIndex(storedMap => isSamePage(storedMap.pageInfo, pageMap.pageInfo)) >= 0;
      if (!isIncluded) storedMaps.unshift(pageMap);
    });
  }

  addPageInfo = (pageInfo: IPageSOBP, basePageInfo: IPageSOBP) => {
    if (!basePageInfo)
      basePageInfo = { ...this._pageToNcodeMaps[0].basePageInfo };
    this._pageToNcodeMaps.unshift({ pageInfo, basePageInfo });
  }

  get pageInfos() {
    const pageInfos: IPageSOBP[] = [];
    this._pageToNcodeMaps.forEach(pageMap => pageInfos.push(pageMap.pageInfo));
    return pageInfos;
  }

  set pageInfos(pageInfos: IPageSOBP[]) {
    let i = 0;
    this._pageToNcodeMaps.forEach(pageMap => {
      pageMap.pageInfo = pageInfos[i++];
    });
  }

  get basePageInfo() {
    return this._pageToNcodeMaps[0].basePageInfo;
  }

  set basePageInfo(basePageInfo: IPageSOBP) {
    this._pageToNcodeMaps[0].basePageInfo = basePageInfo; 
  }

  getPageInfoAt = (index: number) => {
    const map = this._pageToNcodeMaps[index];
    if (map) return map.pageInfo;
    return undefined;
  }
  // 여기까지

  get pageOverview() {
    if (this._pdf && this._pdf.pagesOverview[this._pdfPageNo - 1]) {
      this._pdf.pagesOverview[this._pdfPageNo - 1].rotation = this._rotation;
      return this._pdf.pagesOverview[this._pdfPageNo - 1];
    }

    const pageInfo = this.getPageInfoAt(0);
    // undefined인 경우도 있을 것 같긴하다. 아래의 getNPaperSize_pu에서 예외처리 하고 있다.
    const pageSize = getNPaperSize_pu(pageInfo);
    const landscape = pageSize.width > pageSize.height;

    //ncode 페이지는 NPaperSize_pu 안에서 회전 처리를 안하기 때문에 여기서 따로 바꿔준다
    if (this._rotation === 90 || this._rotation === 270) {
      const tmp = pageSize.width;
      pageSize.width = pageSize.height;
      pageSize.height = tmp;
    }
    
    const retVal: IPageOverview = {
      sizePu: pageSize,
      rotation: this._rotation,
      landscape
    };
    return retVal;
  }

  get filename() { return this._pdf ? this._pdf.filename : undefined; }
  get url() { return this._pdf ? this._pdf.url : undefined; }
  get pdf() { return this._pdf; }
  get pdfPageNo() { return this._pdfPageNo; }

  get pageNo() { return this._pageNo; }
}
