import React, { CSSProperties } from "react";
import { Typography } from "@material-ui/core";
import { withResizeDetector } from 'react-resize-detector';

import NeoPdfPageView from "./pdfview/NeoPdfPageView";
import PenBasedRenderer from "./penview/PenBasedRenderer";

import { IAutoLoadDocDesc, IPageSOBP } from "nl-lib/common/structures";
import { NeoPdfDocument, NeoPdfManager } from "nl-lib/common/neopdf";
import { isSamePage, makeNPageIdStr } from "nl-lib/common/util";
import { MappingStorage } from "nl-lib/common/mapper";
import { getNPaperSize_pu } from "nl-lib/common/noteserver";
import { PLAYSTATE, ZoomFitEnum } from "nl-lib/common/enums";
import { INeoSmartpen } from "nl-lib/common/neopen";
import { setZoomStore } from "GridaBoard/store/reducers/zoomReducer";


export const ZINDEX_INK_LAYER = 3;
export const ZINDEX_PDF_LAYER = 2;

export const ZINDEX_DRAWER = 100;
export const ZINDEX_DRAWER_ICON = 11199;


const pdfContainer: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  // height: "100%",
  overflow: "visible",
  // width: "27vw",
  // height: "76vh"
}

const inkContainer: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  // height: "100%",
  overflow: "visible",
  zoom: 1,
  // width: "27vw",
  // height: "76vh"
}



export type IHandleFileLoadNeededEvent = { url: string, filename: string, fingerprint: string, pageInfo: IPageSOBP };

export interface MixedViewProps {

  pageInfo: IPageSOBP;

  basePageInfo: IPageSOBP;

  pdf?: NeoPdfDocument,

  pdfUrl: string;

  filename: string,

  pdfPageNo: number;



  /** pen의 움직임에 따라 view가 update되려면 pen의 배열을 지정한다 */
  pens?: INeoSmartpen[];

  /** ink storage에 stroke가 쌓일 때 view를 update하려면 storage를 지정한다 */
  fromStorage: boolean,

  playState?: PLAYSTATE;
  noInfo?: boolean;

  /** canvas view rotation, 0: portrait, 90: landscape */
  rotation: number;

  isMainView: boolean;

  /**
   * 현재 view가 가진 코드와 다른 코드가 들어왔을 때
   * 페이지를 자동으로 변경하는 스위치
   *
   * onFileLoadNeeded를 쓰려면 이 스위치가 true여야 한다
   */
  autoPageChange: boolean;
  /**
   * 현재 view가 가진 pdf와 다른 code map된 pdf가 감지되면 아래의 callback이 불려진다.
   * 불려진 콜백을 가진 component에서는 본 클래스의 property 중 pdfUrl 값을 변경해야 한다
   *
   * autoChangePage가 true 인 상태에서만 동작한다
   **/
  handleFileLoadNeeded?: (event: IHandleFileLoadNeededEvent) => void,

  parentName: string;
  activePageNo: number;

  viewFit?: ZoomFitEnum;
  zoom?: number;
  fitMargin?: number;

  fixed?: boolean;


  width?: number,
  height?: number,

  noMorePdfSignal?: boolean;
  renderCountNo: number;

}

interface State {
  forceToRenderCnt: number,
  status: string,

}

interface InternalState {

  pdfSize: { width: number, height: number };

  pdf: NeoPdfDocument,

  pdfUrl: string,
  pdfFilename: string,


  /** NOTE: pageNo라고 씌어 있는 것은, 항상 PDF의 페이지번호(1부터 시작)를 나타내기로 한다.  */
  pdfPageNo: number;
  viewPos: { offsetX: number, offsetY: number, zoom: number },

  // renderCount: number;

  // showFileOpenDlg: boolean;
  // showCancelConfirmDlg: boolean;

  /** property에 width가 주어졌으면 auto resize width를 방지하기 위해, 플래그를 세운다 */
  widthGiven: boolean;
  /** property에 height 주어졌으면 auto resize height를 방지하기 위해, 플래그를 세운다 */
  heightGiven: boolean;

  width: number;
  height: number;

  pageInfoGiven: boolean;
  pageInfo: IPageSOBP;

  noMorePdfSignal: boolean;

}

const defaultMixedPageViewProps: MixedViewProps = {
  // properties
  pageInfo: undefined,
  basePageInfo: undefined,

  pdf: undefined,
  pdfUrl: undefined,
  filename: undefined,

  pdfPageNo: undefined,
  pens: [],
  playState: PLAYSTATE.live,
  noInfo: false,
  rotation: 0,
  isMainView: true,
  parentName: "",
  viewFit: ZoomFitEnum.FULL,
  zoom: 1,
  fitMargin: 0,
  fixed: false,
  width: undefined,
  height: undefined,

  fromStorage: false,
  autoPageChange: true,

  handleFileLoadNeeded: undefined,

  noMorePdfSignal: false,

  activePageNo: 0,

  renderCountNo: 0
}


class MixedPageView_module extends React.Component<MixedViewProps, State>  {
  static defaultProps: MixedViewProps = defaultMixedPageViewProps;

  // pdf: NeoPdfDocument;
  rendererRef: React.RefObject<typeof PenBasedRenderer> = React.createRef();


  coupledDoc: IAutoLoadDocDesc;

  _fileToLoad: IAutoLoadDocDesc;

  _internal: InternalState;

  constructor(props: MixedViewProps) {
    super(props);

    this.state = {
      forceToRenderCnt: 0,
      status: "N/A",
    };

    const pdfPageNo = props.pdfPageNo !== undefined ? props.pdfPageNo : -1;
    let size;
    if (props.pdf) {
      size = props.pdf.getPageSize(pdfPageNo);
    }
    else {
      size = getNPaperSize_pu(props.pageInfo);
    }
    const pdfSize = { ...size };

    this._internal = {
      // 아래는 순수히 이 component의 state
      pdfSize: pdfSize,    // 초기 값이 없으면 zoom 비율을 따질 때 에러를 낸다. 당연히
      viewPos: { offsetX: 0, offsetY: 0, zoom: 1 },
      // renderCount: 0,

      noMorePdfSignal: props.noMorePdfSignal,

      // showFileOpenDlg: false,
      // showCancelConfirmDlg: false,

      widthGiven: props.width !== undefined ? true : false,
      heightGiven: props.height !== undefined ? true : false,
      pageInfoGiven: props.pageInfo !== undefined ? true : false,

      // 아래는 property에서 나온 것
      pdf: props.pdf,
      pdfUrl: props.pdfUrl,
      pdfFilename: props.filename,
      pdfPageNo: pdfPageNo,

      pageInfo: props.pageInfo,
      width: props.width !== undefined ? props.width : 0,
      height: props.height !== undefined ? props.height : 0,
    };

  }

  componentDidMount() {
    // this.setState({ pageInfo: { ...this.props.pageInfo } });
    if (this.props.pdf === undefined) {
      this.loadDocument(this.props.pdfUrl, this.props.filename);
    }
    else {
      this._internal.pdf = this.props.pdf;
    }

    const { pdf, pdfPageNo, filename: pdfFilename, pdfUrl, noMorePdfSignal } = this.props;

    if (isSamePage(this.props.pageInfo, { section: 256, owner: 27, book: 1068, page: 12 })) {
      console.log("target");
    }


    let size;
    if (this.props.pdf) size = this.props.pdf.getPageSize(this.props.pdfPageNo);
    else size = getNPaperSize_pu(this.props.pageInfo);

    // this.setState({ pdfSize: { ...size }, status: "loaded" });

    this._internal.pageInfo = { ...this.props.pageInfo };
    this._internal.pdf = pdf;
    this._internal.pdfPageNo = pdfPageNo;
    this._internal.pdfFilename = pdfFilename;
    this._internal.pdfUrl = pdfUrl;
    this._internal.noMorePdfSignal = noMorePdfSignal;
    this._internal.pdfSize = { ...size };
    console.log(`PDF SIZE: ${size.width}, ${size.height}`);

  }


  shouldComponentUpdate(nextProps: MixedViewProps, nextState: State) {
    // diffPropsAndState("GRIDA DOC", this.props, nextProps, this.state, nextState);
    let ret_val = false;

    let pageInfoChanged = false;
    if (!isSamePage(nextProps.pageInfo, this.props.pageInfo)) {
      // this.handlePageInfoChanged(nextProps.pageInfo);
      this._internal.pageInfo = { ...nextProps.pageInfo };
      pageInfoChanged = true;
      this.setState({ forceToRenderCnt: this.state.forceToRenderCnt + 1 });
    }


    let filenameChanged = false;
    if (nextProps.filename !== this._internal.pdfFilename) {
      this._internal.pdfFilename = nextProps.filename;
      filenameChanged = true;
    }

    if (nextProps.pdfUrl !== this._internal.pdfUrl) {
      this._internal.pdfUrl = nextProps.pdfUrl;

      // if (filenameChanged)
      //   this.loadDocument(nextProps.pdfUrl, nextProps.filename);
      // else
      //   this.loadDocument(nextProps.pdfUrl, this._internal.pdfFilename);
    }

    let pdfChanged = false;
    if (nextProps.pdf !== this._internal.pdf) {
      this._internal.pdf = nextProps.pdf;
      pdfChanged = true;
      this.setState({ forceToRenderCnt: this.state.forceToRenderCnt + 1 });
    }

    let pdfPageNoChanged = false;
    if (nextProps.pdfPageNo !== this._internal.pdfPageNo) {
      this._internal.pdfPageNo = nextProps.pdfPageNo;
      pdfPageNoChanged = true;
      this.setState({ forceToRenderCnt: this.state.forceToRenderCnt + 1 });
    }

    let sizeChanged = false;
    if (nextProps.width !== this.props.width || nextProps.height !== this.props.height) {
      this.onViewResized({ width: nextProps.width, height: nextProps.height });
      sizeChanged = true;
    }

    this._internal.noMorePdfSignal = nextProps.noMorePdfSignal;

    const pensChanged = nextProps.pens !== this.props.pens;
    const viewFitChanged = nextProps.viewFit !== this.props.viewFit;
    // const zoomChanged = nextProps.zoom !== this.props.zoom;
    const fixedChanged = nextProps.fixed !== this.props.fixed;
    const noInfo = nextProps.noInfo !== this.props.noInfo;
    const loaded = this.state.status === "loaded" && nextState.status !== this.state.status;
    const renderCntChanged = this.state.forceToRenderCnt !== nextState.forceToRenderCnt;

    // if (zoomChanged) {
    //   // this._internal.viewPos.zoom = nextProps.zoom;
    // }

    if (((pdfChanged || pdfPageNoChanged) && this._internal.pdfPageNo > 0) || pageInfoChanged) {
      let size;
      if (this._internal.pdf) {
        size = this._internal.pdf.getPageSize(this._internal.pdfPageNo);
        console.log(`PDF SIZE: from PDF ${size.width}, ${size.height}`);
      }
      else {
        size = getNPaperSize_pu(this._internal.pageInfo);

        if (nextProps.rotation === 90 || nextProps.rotation === 270) {
          const tmpWidth = size.width;
          size.width = size.height;
          size.height = tmpWidth;
        }
        console.log(`PDF SIZE: from NCODE ${size.width}, ${size.height}`);
      }

      this._internal.pdfSize = { ...size };
      ret_val = true;
    }

    if (this.props.rotation !== nextProps.rotation && this.props.activePageNo === nextProps.activePageNo) {
      ret_val = true;
    }

    ret_val = ret_val || sizeChanged || pensChanged || pageInfoChanged || viewFitChanged || fixedChanged || noInfo || loaded || renderCntChanged;

    if(this.props.renderCountNo !== nextProps.renderCountNo) {
      ret_val = true;
    }

    return ret_val;
  }

  componentWillUnmount() {
    if (this.props.pdf === undefined && this._internal.pdf) {
      const pdf = this._internal.pdf;
      pdf.destroy();
    }
  }

  loadDocument = async (url: string, filename: string) => {
    // const { documentZoom } = this.state;
    if (url === undefined) return;

    // kitty, 나중에는 분리할 것
    // showUIProgressBackdrop();
    console.log("*GRIDA DOC*, loadDocument START");
    const loadingTask = NeoPdfManager.getInstance().getDocument({ url, filename, purpose: "MAIN DOCUMENT: to be opend by NeoPdfViewer" });
    this.setState({ status: "loading" });

    const pdf = await loadingTask;
    console.log("*GRIDA DOC*, loadDocument COMPLETED")

    let pdfPageNo = this._internal.pdfPageNo;
    let size = pdf.getPageSize(pdfPageNo);
    if (!size) {
      pdfPageNo = 1;
      size = pdf.getPageSize(pdfPageNo);
    }

    this._internal.pdf = pdf;
    this.setState({ status: "loaded" });

    // hideUIProgressBackdrop();
    // console.log("pdf loaded");
  }


  handlePageInfoChanged = async (pageInfo: IPageSOBP) => {
    const msi = MappingStorage.getInstance();
    const found = msi.getNPageTransform(pageInfo);

    const { fingerprint, pdfPageNo } = found.pdf;

    switch (found.type) {
      case "pod": {
        if (this._internal.pdf && (pdfPageNo !== this._internal.pdfPageNo)) {
          const size = this._internal.pdf.getPageSize(pdfPageNo);
          this._internal.pdfSize = { ...size };
          console.log(`PDF SIZE: ${size.width}, ${size.height}`);

          this.setState({ forceToRenderCnt: this.state.forceToRenderCnt + 1 });
        }

        // 파일 로드를 요청
        if (this.props.autoPageChange && !this.props.noMorePdfSignal
          && (!this._internal.pdf || this._internal.pdf.fingerprint !== found.pdf.fingerprint)) {
          if (this.props.handleFileLoadNeeded) {
            // 요청 당한 쪽(parent component)에서는 반드시 다음과 같은 처리를 해야 한다
            //    1) props의 url을 본 파일의 url로 바꿔준다
            //    2) 받은 pageInfo를 props의 pageInfo로 다시 넣어 준다
            //    3) 아니면, no more change pdf prop을 true로 한다
            this.props.handleFileLoadNeeded({
              url: found.pdf.url,
              filename: found.pdf.filename,
              fingerprint: found.pdf.fingerprint,
              pageInfo,
            });
            // this.setState({ forceToRenderCnt: this.state.forceToRenderCnt + 1 });
          }
        }
        else {
          // handleFileLoadNeeded이 없다는 것은 load하지 않겠다는 소리
          this._internal.noMorePdfSignal = true;
        }

        break;
      }
      case "default":
      case "note":
      default: {
        const size = getNPaperSize_pu(pageInfo);
        this._internal.pdfSize = { ...size };
        console.log(`PDF SIZE: ${size.width}, ${size.height}`);

        this._internal.pdf = undefined;
        this._internal.pdfFilename = undefined;
        this.setState({ forceToRenderCnt: this.state.forceToRenderCnt + 1 });
        break;
      }
    }
  }




  onViewResized = ({ width, height }) => {
    if (!this._internal.widthGiven) this._internal.width = width;
    if (!this._internal.heightGiven) this._internal.height = height;
  }

  /**
   *
   * @param pageInfo
   * @param isFromEveryPgInfo - 매번 page info가 나올때마다 불려진 것인가? 아니면 페이지가 바뀔때 불려진 것인가?
   */
  onNcodePageChanged = async (pageInfo: IPageSOBP) => {
    const msi = MappingStorage.getInstance();
    const found = msi.getNPageTransform(pageInfo);

    if (this.props.autoPageChange && found) {
      const { fingerprint, pdfPageNo } = found.pdf;

      // 자동으로 페이지를 바꿔준다.
      this._internal.pageInfo = { ...pageInfo };

      switch (found.type) {
        case "pod": {
          if (this._internal.pdf && pdfPageNo !== this._internal.pdfPageNo) {
            const size = this._internal.pdf.getPageSize(pdfPageNo);
            this._internal.pdfSize = { ...size };
            console.log(`PDF SIZE: ${size.width}, ${size.height}`);

          }

          // 파일 로드를 요청
          if (!this.props.noMorePdfSignal &&
            (!this._internal.pdf || this._internal.pdf.fingerprint !== found.pdf.fingerprint)) {
            if (this.props.handleFileLoadNeeded) {
              // 요청 당한 쪽(parent component)에서는 반드시 다음과 같은 처리를 해야 한다
              //    1) props의 url을 본 파일의 url로 바꿔준다
              //    2) 받은 pageInfo를 props의 pageInfo로 다시 넣어 준다
              //
              //    3) 아니면, no more change pdf prop을 true로 한다
              this.props.handleFileLoadNeeded({
                url: found.pdf.url,
                filename: found.pdf.filename,
                fingerprint: found.pdf.fingerprint,
                pageInfo,
              });
            }
          }
          else {
            // handleFileLoadNeeded이 없다는 것은 load하지 않겠다는 소리
            this._internal.noMorePdfSignal = true;
          }

          break;
        }
        case "plate": {
          this._internal.pdf = undefined;
          this._internal.pdfFilename = undefined;
          break;
        }
        case "default":
        case "note":
        default: {
          const size = getNPaperSize_pu(pageInfo);
          if (this.props.rotation === 90 || this.props.rotation === 270) {
            const tmpWidth = size.width;
            size.width = size.height;
            size.height = tmpWidth;
          }

          this._internal.pdfSize = { ...size };
          console.log(`PDF SIZE: ${size.width}, ${size.height}`);

          this._internal.pdf = undefined;
          this._internal.pdfFilename = undefined;
          break;
        }
      }

      this.setState({ forceToRenderCnt: this.state.forceToRenderCnt + 1 });
    }

  }

  onCanvasPositionChanged = (arg: { offsetX: number, offsetY: number, zoom: number }) => {
    // console.log(arg);
    const beforeViewPos = this._internal.viewPos;
    this._internal.viewPos = { ...arg };
    let moveX = 0, moveY = 0;
    if(this._internal.viewPos.offsetX < 0){
      moveX = -1 * this._internal.viewPos.offsetX;
      this._internal.viewPos.offsetX = 0;
    }
    if(this._internal.viewPos.offsetY < 0){
      moveY = -1 * this._internal.viewPos.offsetY;
      this._internal.viewPos.offsetY = 0;
    }
    if (this.props.isMainView) {
      document.querySelector(`#main`).scroll(moveX, moveY);
    }
    
    if(beforeViewPos.offsetX !== this._internal.viewPos.offsetX || beforeViewPos.offsetY !== this._internal.viewPos.offsetY || beforeViewPos.zoom !== this._internal.viewPos.zoom){
      this.setState({ forceToRenderCnt: this.state.forceToRenderCnt + 1 });
    }
      
    if (this.props.isMainView) {
      setZoomStore(arg.zoom);
    }

    // const r = this._internal.renderCount;
    // this.setState({ renderCount: r + 1 });
  }

  render() {
    const { pdf } = this._internal;

    const zoom = this._internal.viewPos.zoom;
    // console.log(`${this.props.parentName} render ${this.props.pdfPageNo}, pdf=${pdf}`)


    const pdfCanvas: CSSProperties = {
      position: "absolute",
      zoom: zoom,
      left: this._internal.viewPos.offsetX / zoom,
      top: this._internal.viewPos.offsetY / zoom,
      background: "#fff",
    }

    // console.log(`MixedViewer: rendering, h=${JSON.stringify(this._internal.h)}`);
    // console.log(this._internal.viewPos);

    // console.log(`THUMB, mixed viewFit = ${this.props.viewFit}`);
    // console.log(`PDF PAGE, page number,  = ${this._internal.pdfPageNo}`);


    const shadowStyle: CSSProperties = {
      color: "#00f",
      textShadow: "-1px 0 2px #fff, 0 1px 2px #fff, 1px 0 2px #fff, 0 -1px 2px #fff",
    }

    let isBlankPage = false;
    if (this._internal.pdf === undefined) {
      isBlankPage = true;
    }

    // console.log(`VIEW SIZE${callstackDepth()} MixedPageView(component): ${this._internal.pdfSize?.width}, ${this._internal.pdfSize?.height}`);

    // const { position, pdfSize, pdfInfo, onNcodePageChanged, onCanvasPositionChanged, ...rest } = this.props;
    return (
      <div id={`${this.props.parentName}-mixed_view`} style={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        // bottom: 0,
        height: "100%",
        alignItems: "center",
        zIndex: 1,
        zoom: 1,
      }}>
        <div id={`${this.props.parentName}-pdf_layer`} style={pdfContainer} >
          <div id={`${this.props.parentName}-pdf_view`} style={pdfCanvas}>
            <NeoPdfPageView {...this.props}
              pdf={this._internal.pdf}
              pdfPageNo={this._internal.pdfPageNo}
              key={`document-page-${this.props.pdfPageNo}`}
              position={this._internal.viewPos}
            />
          </div>
        </div>
        <div id={`${this.props.parentName}-ink_layer`} style={inkContainer} >
          <PenBasedRenderer
            position={this._internal.viewPos}
            zoom={this.props.zoom}
            pdfSize={this._internal.pdfSize}
            pageInfo={this._internal.pageInfo}
            onNcodePageChanged={this.onNcodePageChanged}
            onCanvasPositionChanged={this.onCanvasPositionChanged}

            renderCountNo={this.props.renderCountNo}

            fixed={this.props.fixed}
            playState={this.props.playState}
            fitMargin={this.props.fitMargin}
            viewFit={this.props.viewFit}
            pens={this.props.pens}
            rotation={this.props.rotation}
            isMainView={this.props.isMainView}
            fromStorage={this.props.fromStorage}
            noInfo={this.props.noInfo}
            parentName={this.props.parentName}
            basePageInfo={this.props.basePageInfo}
            pdfPageNo={this._internal.pdfPageNo}
            pdfNumPages={this._internal.pdf !== undefined? this._internal.pdf.numPages : 0}
            viewSize={{ ...{ width: this._internal.width, height: this._internal.height } }}
            isBlankPage={isBlankPage}
          />
        </div>

        {!this.props.noInfo ?
          < div id={`${this.props.parentName}-info`} style={inkContainer} >
            <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;
          <br /> &nbsp; &nbsp;

          <Typography style={{ ...shadowStyle, fontSize: 16 }}>MixedViewer </Typography>

            <br /> &nbsp; &nbsp;
          <Typography style={{ ...shadowStyle, fontSize: 10 }}>Page(state):</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, }}> {makeNPageIdStr(this._internal.pageInfo)} </Typography>

            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>Page(property):</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, }}> {makeNPageIdStr(this.props.pageInfo)} </Typography>


            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>Base(property):</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {makeNPageIdStr(this.props.basePageInfo)} </Typography>

            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>pdfPageNo:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {this.props.pdfPageNo} </Typography>

            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>props.pdf:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {this.props.pdf ? this.props.pdf.filename : ""} </Typography>


            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>state.pdfPageNo:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {this._internal.pdfPageNo} </Typography>

            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>state.pdf:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {this._internal.pdf ? this._internal.pdf.filename : ""} </Typography>

          </div >
          : ""}
      </div>
    );
  }
}


const AdaptiveWithDetector = withResizeDetector(MixedPageView_module);

const MixedPageView = (props: MixedViewProps) => {
  return (
    <React.Fragment>
      <AdaptiveWithDetector {...props} />
    </React.Fragment>
  )
}

export default MixedPageView;