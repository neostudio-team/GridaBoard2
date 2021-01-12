import React, { CSSProperties } from "react";
import { Typography } from "@material-ui/core";
import { withResizeDetector } from 'react-resize-detector';

import NeoPdfPageView from "./pdfview/NeoPdfPageView";
import PenBasedRenderer from "./penview/PenBasedRenderer";


import { IAutoLoadDocDesc, IGetNPageTransformType, IPageSOBP } from "../common/structures";
import { NeoPdfDocument, NeoPdfManager } from "../common/neopdf";
import { isSamePage, makeNPageIdStr } from "../common/util";
import { MappingStorage } from "../common/mapper";
import { getNPaperSize_pu } from "../common/noteserver";
import { PLAYSTATE, ZoomFitEnum } from "../common/enums";
import { INeoSmartpen } from "../common/neopen";



export const ZINDEX_INK_LAYER = 3;
export const ZINDEX_PDF_LAYER = 2;

export const ZINDEX_DRAWER = 100;
export const ZINDEX_DRAWER_ICON = 11199;


const pdfContainer: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "100%",
  overflow: "visible",
}

const inkContainer: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "100%",
  overflow: "visible",
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
  onNcodePageChanged: (pageInfo: IPageSOBP, found: IGetNPageTransformType) => void;

  parentName: string;

  viewFit?: ZoomFitEnum;
  fitMargin?: number;

  fixed?: boolean;


  width?: number,
  height?: number,

  noMorePdfSignal?: boolean;
}


interface State {

  pdfSize: { width: number, height: number };

  pdf: NeoPdfDocument,

  pdfUrl: string,
  pdfFilename: string,

  status: string,

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
  parentName: "",
  viewFit: ZoomFitEnum.FULL,
  fitMargin: 100,
  fixed: false,
  width: undefined,
  height: undefined,

  fromStorage: false,
  autoPageChange: true,

  handleFileLoadNeeded: undefined,
  onNcodePageChanged: undefined,

  noMorePdfSignal: false,
}


class MixedPageView_module extends React.Component<MixedViewProps, State>  {
  static defaultProps: MixedViewProps = defaultMixedPageViewProps;

  // pdf: NeoPdfDocument;
  rendererRef: React.RefObject<typeof PenBasedRenderer> = React.createRef();


  coupledDoc: IAutoLoadDocDesc;

  _fileToLoad: IAutoLoadDocDesc;


  constructor(props: MixedViewProps) {
    super(props);

    this.state = {
      // 아래는 순수히 이 component의 state
      pdfSize: { width: 1, height: 1 },    // 초기 값이 없으면 zoom 비율을 따질 때 에러를 낸다. 당연히
      status: "N/A",
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
      pdfPageNo: props.pdfPageNo !== undefined ? props.pdfPageNo : -1,

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
      this.setState({ pdf: this.props.pdf });
    }

    const { pdf, pdfPageNo, filename: pdfFilename, pdfUrl, noMorePdfSignal } = this.props;

    if (isSamePage(this.props.pageInfo, { section: 256, owner: 27, book: 1068, page: 12 })) {
      console.log("target");
    }


    let size;
    if (this.props.pdf) size = this.props.pdf.getPageSize(this.props.pdfPageNo);
    else size = getNPaperSize_pu(this.props.pageInfo);

    // this.setState({ pdfSize: { ...size }, status: "loaded" });

    this.setState({
      pageInfo: { ...this.props.pageInfo },
      pdf,
      pdfPageNo,
      pdfFilename,
      pdfUrl,
      noMorePdfSignal,
      pdfSize: { ...size },
    });
  }


  shouldComponentUpdate(nextProps: MixedViewProps, nextState: State) {
    // diffPropsAndState("GRIDA DOC", this.props, nextProps, this.state, nextState);
    let ret_val = false;

    if (isSamePage(nextProps.pageInfo, { section: 256, owner: 27, book: 1068, page: 12 })) {
      console.log("target");
    }


    if (!isSamePage(nextProps.pageInfo, this.props.pageInfo)) {
      // this.handlePageInfoChanged(nextProps.pageInfo);
      this.setState({ pageInfo: { ...nextProps.pageInfo } });
    }

    if (nextProps.pdf !== this.state.pdf) {
      this.setState({ pdf: nextProps.pdf });
    }

    let filenameChanged = false;
    if (nextProps.filename !== this.state.pdfFilename) {
      this.setState({ pdfFilename: nextProps.filename });
      filenameChanged = true;
    }

    if (nextProps.pdfUrl !== this.state.pdfUrl) {
      this.setState({ pdfUrl: nextProps.pdfUrl });

      if (filenameChanged)
        this.loadDocument(nextProps.pdfUrl, nextProps.filename);
      else
        this.loadDocument(nextProps.pdfUrl, this.state.pdfFilename);
    }

    if (nextProps.pdfPageNo !== this.state.pdfPageNo) {
      this.setState({ pdfPageNo: nextProps.pdfPageNo });
      ret_val = true;
    }


    if (nextProps.width !== this.props.width || nextProps.height !== this.props.height) {
      this.onViewResized({ width: nextProps.width, height: nextProps.height });
      ret_val = true;
    }

    if (nextProps.noMorePdfSignal !== this.state.noMorePdfSignal) {
      this.setState({ noMorePdfSignal: nextProps.noMorePdfSignal });
      ret_val = true;
    }

    const viewPosChanged = (nextState.viewPos.offsetX !== this.state.viewPos.offsetX
      || nextState.viewPos.offsetY !== this.state.viewPos.offsetY
      || nextState.viewPos.zoom !== this.state.viewPos.zoom
    );
    const pageInfoChanged = !isSamePage(nextState.pageInfo, this.state.pageInfo);
    const pdfChanged = nextState.pdf !== this.state.pdf;
    const pdfPageNoChanged = nextState.pdfPageNo !== this.state.pdfPageNo;

    const pdfFilenameChanged = nextState.pdfFilename !== this.state.pdfFilename;
    const pdfUrlChanged = nextState.pdfUrl !== this.state.pdfUrl;
    const pdfSizeChanged = nextState.pdfSize !== this.state.pdfSize;

    const pensChanged = nextProps.pens !== this.props.pens;
    const viewFitChanged = nextProps.viewFit !== this.props.viewFit;
    const fixedChanged = nextProps.fixed !== this.props.fixed;
    const rotationchanged = nextProps.rotation !== this.props.rotation;
    const noInfo = nextProps.noInfo !== this.props.noInfo;
    const loaded = this.state.status === "loaded" && nextState.status !== this.state.status;


    if ((pdfChanged || pdfPageNoChanged) && nextState.pdfPageNo > 0) {
      let size;
      if (nextState.pdf) size = nextState.pdf.getPageSize(nextState.pdfPageNo);
      else size = getNPaperSize_pu(this.state.pageInfo);
      this.setState({ pdfSize: { ...size }, status: "loaded" });

      // if (pdfChanged && pdfPageNoChanged) {
      //   let size;
      //   if (nextState.pdf) size = nextState.pdf.getPageSize(nextState.pdfPageNo);
      //   else size = getNPaperSize_pu(this.state.pageInfo);

      //   this.setState({ pdfSize: { ...size }, status: "loaded" });
      // }
      // else if (pdfChanged) {
      //   let size;
      //   if (nextState.pdf) size = nextState.pdf.getPageSize(nextState.pdfPageNo);
      //   else size = getNPaperSize_pu(this.state.pageInfo);

      //   this.setState({ pdfSize: { ...size }, status: "loaded" });
      // }
      // else {
      //   let size;
      //   if (nextState.pdf) size = nextState.pdf.getPageSize(nextState.pdfPageNo);
      //   else size = getNPaperSize_pu(this.state.pageInfo);

      //   this.setState({ pdfSize: { ...size }, status: "loaded" });
      // }
    }

    ret_val = ret_val || viewPosChanged || pageInfoChanged || pdfChanged || pdfPageNoChanged || pdfSizeChanged
      || pensChanged || viewFitChanged || fixedChanged || rotationchanged || noInfo || loaded;
    return ret_val;
  }

  componentWillUnmount() {
    if (this.props.pdf === undefined && this.state.pdf) {
      const pdf = this.state.pdf;
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

    let pdfPageNo = this.state.pdfPageNo;
    let size = pdf.getPageSize(pdfPageNo);
    if (!size) {
      pdfPageNo = 1;
      size = pdf.getPageSize(pdfPageNo);
    }

    this.setState({ pdfSize: size, pdf, status: "loaded" });

    // hideUIProgressBackdrop();
    // console.log("pdf loaded");
  }


  handlePageInfoChanged = async (pageInfo: IPageSOBP) => {
    const msi = MappingStorage.getInstance();
    const found = msi.getNPageTransform(pageInfo);

    const { fingerprint, pdfPageNo } = found.pdf;

    switch (found.type) {
      case "pod": {
        if (this.state.pdf && (pdfPageNo !== this.state.pdfPageNo)) {
          const size = this.state.pdf.getPageSize(pdfPageNo);
          this.setState({ pdfSize: { ...size } });
        }

        // 파일 로드를 요청
        if (this.props.autoPageChange && !this.props.noMorePdfSignal
          && (!this.state.pdf || this.state.pdf.fingerprint !== found.pdf.fingerprint)) {
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
          }
        }
        else {
          // handleFileLoadNeeded이 없다는 것은 load하지 않겠다는 소리
          this.setState({ noMorePdfSignal: true });
        }

        break;
      }
      case "default":
      case "note":
      default: {
        const size = getNPaperSize_pu(pageInfo);
        this.setState({ pdfSize: { ...size } });
        this.setState({ pdf: undefined, pdfFilename: undefined });
        break;
      }
    }
  }




  onViewResized = ({ width, height }) => {
    if (!this.state.widthGiven && !this.state.heightGiven) this.setState({ width, height });
    else if (!this.state.widthGiven) this.setState({ width });
    else if (!this.state.heightGiven) this.setState({ height });
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
      this.setState({ pageInfo: { ...pageInfo } });

      switch (found.type) {
        case "pod": {
          if (this.state.pdf && pdfPageNo !== this.state.pdfPageNo) {
            const size = this.state.pdf.getPageSize(pdfPageNo);
            this.setState({ pdfSize: size });
          }

          // 파일 로드를 요청
          if (!this.props.noMorePdfSignal &&
            (!this.state.pdf || this.state.pdf.fingerprint !== found.pdf.fingerprint)) {
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
            this.setState({ noMorePdfSignal: true });
          }

          break;
        }
        case "default":
        case "note":
        default: {
          const size = getNPaperSize_pu(pageInfo);
          this.setState({ pdfSize: size });
          this.setState({ pdf: undefined, pdfFilename: undefined });
          break;
        }
      }

    }

    if (this.props.onNcodePageChanged) this.props.onNcodePageChanged(pageInfo, found);
  }


  onCanvasPositionChanged = (arg: { offsetX: number, offsetY: number, zoom: number }) => {
    // console.log(arg);
    this.setState({ viewPos: { ...arg } });

    // const r = this.state.renderCount;
    // this.setState({ renderCount: r + 1 });
  }


  // handleClose = () => {
  //   this.setState({ showFileOpenDlg: false });
  // };


  render() {
    const { pdf } = this.state;

    const zoom = this.state.viewPos.zoom;
    // console.log(`${this.props.parentName} render ${this.props.pdfPageNo}, pdf=${pdf}`)


    const pdfCanvas: CSSProperties = {
      position: "absolute",
      zoom: zoom,
      left: this.state.viewPos.offsetX / zoom,
      top: this.state.viewPos.offsetY / zoom,
      background: "#fff",
    }

    // console.log(`MixedViewer: rendering, h=${JSON.stringify(this.state.h)}`);
    // console.log(this.state.viewPos);

    // console.log(`THUMB, mixed viewFit = ${this.props.viewFit}`);
    // console.log(`PDF PAGE, page number,  = ${this.state.pdfPageNo}`);


    const shadowStyle: CSSProperties = {
      color: "#00f",
      textShadow: "-1px 0 2px #fff, 0 1px 2px #fff, 1px 0 2px #fff, 0 -1px 2px #fff",
    }

    console.log(`MixedPageView: pdfSize=${this.state.pdfSize?.width}, ${this.state.pdfSize?.height}`);

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
      }}>
        <div id={`${this.props.parentName}-pdf_layer`} style={pdfContainer} >
          <div id={`${this.props.parentName}-pdf_view`} style={pdfCanvas}>
            <NeoPdfPageView {...this.props}
              pdf={this.state.pdf}
              pdfPageNo={this.state.pdfPageNo}
              key={`document-page-${this.props.pdfPageNo}`}
              position={this.state.viewPos}
            />
          </div>
        </div>
        <div id={`${this.props.parentName}-ink_layer`} style={inkContainer} >
          <PenBasedRenderer {...this.props}
            position={this.state.viewPos}
            pdfSize={this.state.pdfSize}
            pageInfo={this.state.pageInfo}
            onNcodePageChanged={this.onNcodePageChanged}
            onCanvasPositionChanged={this.onCanvasPositionChanged}
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
            <Typography style={{ ...shadowStyle, fontSize: 14, }}> {makeNPageIdStr(this.state.pageInfo)} </Typography>

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
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {this.state.pdfPageNo} </Typography>

            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>state.pdf:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {this.state.pdf ? this.state.pdf.filename : ""} </Typography>

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
