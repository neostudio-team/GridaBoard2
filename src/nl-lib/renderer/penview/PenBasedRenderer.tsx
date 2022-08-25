import React from "react";
import {connect} from "react-redux";
import {CSSProperties} from "@material-ui/core/styles/withStyles";
import {Typography} from "@material-ui/core";

import {IRenderWorkerOption} from "./RenderWorkerBase";
import PenBasedRenderWorker from "./PenBasedRenderWorker";

import {PageEventName, PenEventName, PLAYSTATE, ZoomFitEnum} from "nl-lib/common/enums";
import {IPageSOBP, ISize, NeoDot, NeoStroke} from "nl-lib/common/structures";
import {callstackDepth, isPlatePage, isSameNcode, isSamePage, makeNPageIdStr, scrollToThumbnail, uuidv4} from "nl-lib/common/util";

import {INeoSmartpen, IPenToViewerEvent} from "nl-lib/common/neopen";
import {MappingStorage} from "nl-lib/common/mapper";
import {DefaultPlateNcode, DefaultPUINcode, nullNcode} from "nl-lib/common/constants";
import {PlateNcode_3} from "nl-lib/common/constants/MapperConstants";
import {InkStorage} from "nl-lib/common/penstorage";
import {isPlatePaper, isPUI, getNPaperInfo, adjustNoteItemMarginForFilm} from "nl-lib/common/noteserver";

import {setCalibrationData} from 'GridaBoard/store/reducers/calibrationDataReducer';
import {store} from "GridaBoard/client/pages/GridaBoard";
import GridaDoc from "GridaBoard/GridaDoc";
import { initializeCrossLine, setLeftToRightDiagonal, setRightToLeftDiagonal, setHideCanvasMode, incrementTapCount, initializeTap, setFirstDot, setIsPageMode, setIsPenMode } from "GridaBoard/store/reducers/gestureReducer";
import { setActivePageNo } from "GridaBoard/store/reducers/activePageReducer";
import { onToggleRotate } from "GridaBoard/components/buttons/RotateButton";
import { hideToastMessage, showMessageToast } from "GridaBoard/store/reducers/ui";
import getText from "GridaBoard/language/language";
import { onClearPage } from "boardList/layout/component/dialog/detail/AlertDialog";
import AddCircle from "@material-ui/icons/AddCircle";
import { SvgIcon } from '@material-ui/core';
import { theme } from "GridaBoard/theme";
import { PenManager } from "../../neosmartpen";
import { firebaseAnalytics } from "GridaBoard/util/firebase_config";



/**
 * Properties
 */
interface Props { // extends MixedViewProps {
  baseScale?: number,

  pdfSize: { width: number, height: number };

  onNcodePageChanged: (arg: IPageSOBP) => void;

  onCanvasPositionChanged: (arg: { offsetX: number, offsetY: number, zoom: number }) => void;

  position: { offsetX: number, offsetY: number, zoom: number },

  zoom: number,

  viewSize: ISize;

  fixed?: boolean,

  playState?: PLAYSTATE,

  fitMargin?: number,

  viewFit?: ZoomFitEnum,

  pens: INeoSmartpen[],

  rotation: number,

  isMainView: boolean,

  pageInfo: IPageSOBP,

  fromStorage: boolean,

  noInfo: boolean,

  parentName: string,

  basePageInfo: IPageSOBP,
  pdfPageNo: number,
  pdfNumPages: number,
  renderCountNo: number,

  calibrationData: any,
  setCalibrationData: any,
  calibrationMode: boolean,

  isBlankPage: boolean,

  tapCount: number;
  firstDot: NeoDot;
  incrementTapCount: any;
  initializeTap: any;
  setFirstDot: any;

  initializeCrossLine: any;
  leftToRightDiagonal: boolean;
  rightToLeftDiagonal: boolean;
  setLeftToRightDiagonal: any;
  setRightToLeftDiagonal: any;

  activePageNo: number;  
  setActivePageNo: any;

  hideCanvasMode: boolean;
  setHideCanvasMode: any;

  gestureMode: boolean;

  notFirstPenDown: boolean;
  show: boolean;

  isPageMode: boolean;
  setIsPageMode: any;
}

/**
 * State
 */
interface State {
  sizeUpdate: number,
  penEventCount: number,
  strokeCount: number,
  liveDotCount: number,

  viewFit: ZoomFitEnum,
  pens: INeoSmartpen[],
  playState: PLAYSTATE,

  renderCount: number,

  numDocPages: number,
}

/**
 * TO DO: 2020/11/05
 *    1)  Pen에서 Event를 받아 실시간 rendering만 하는 component로 만들것
 *
 */
class PenBasedRenderer extends React.Component<Props, State> {
  state: State = {
    sizeUpdate: 0,
    penEventCount: 0,
    strokeCount: 0,
    liveDotCount: 0,

    viewFit: ZoomFitEnum.ACTUAL,

    /** @type {Array.<NeoSmartpen>} */
    pens: [],

    playState: PLAYSTATE.live,

    renderCount: 0,

    numDocPages: store.getState().activePage.numDocPages,
  };

  renderCount = 0;
  _renderer: PenBasedRenderWorker;
  // pageInfo = nullNcode();


  get renderer() {
    if (!this._renderer) {
      this._renderer = this.initRenderer(this.viewSize, this.pdfSize as ISize);
      const transform = MappingStorage.getInstance().getNPageTransform(this.props.pageInfo);
      const r = this._renderer;
      r.setTransformParameters(transform.h, this.pdfSize);
    }

    return this._renderer;
  }

  pdfSize: { scale: number, width: number, height: number } = { scale: 1, width: 1, height: 1 };
  viewSize: ISize = { width: 0, height: 0 };

  mainDiv: HTMLDivElement = null;
  canvasId = "";
  canvas: HTMLCanvasElement = null;

  inkStorage: InkStorage = null;

  fitMargin = 0;
  fixed = false;
  shouldSendPageInfo = false;

  symbolTimer: any;

  setMainDivRef = (div: HTMLDivElement) => {
    this.mainDiv = div;
  };

  setCanvasRef = (canvas: HTMLCanvasElement) => {
    this.canvas = canvas;
  }

  subscribedPens = [] as INeoSmartpen[];

  constructor(props: Props) {
    super(props);

    const { playState, fitMargin, viewSize, fixed, pdfSize, viewFit } = props;
    this.inkStorage = InkStorage.getInstance();

    this.canvasId = uuidv4();
    // this.canvasId = "fabric canvas";


    if (fixed !== undefined) this.fixed = fixed;
    if (fitMargin !== undefined) this.fitMargin = fitMargin;
    if (playState !== undefined) this.state.playState = playState;
    if (viewFit !== undefined) this.state.viewFit = viewFit;

    this.viewSize = { ...viewSize };
    this.pdfSize = { ...pdfSize, scale: 1 };
  }

  private subScriptStorageEvent = () => {
    const inkStorage = this.inkStorage;

    if (inkStorage) {
      const filter = { mac: null };
      inkStorage.addEventListener(PenEventName.ON_PEN_DOWN, this.onLivePenDown_byStorage, filter);
      inkStorage.addEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo_byStorage, filter);
      inkStorage.addEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove_byStorage, filter);
      inkStorage.addEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp_byStorage, filter);

    }
  }


  private unsubScriptStorageEvent = () => {
    const inkStorage = this.inkStorage;
    if (inkStorage) {
      inkStorage.removeEventListener(PenEventName.ON_PEN_DOWN, this.onLivePenDown_byStorage);
      inkStorage.removeEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo_byStorage);
      inkStorage.removeEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove_byStorage);
      inkStorage.removeEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp_byStorage);

    }
  }

  /**
   * @private
   * @param {NeoSmartpen} pen
   */
  private subscribePenEvent = (pen: INeoSmartpen) => {
    if (!this.subscribedPens.includes(pen)) {
      pen.addEventListener(PenEventName.ON_PEN_DOWN, this.onLivePenDown);
      pen.addEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo);
      pen.addEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove);
      pen.addEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp);
      pen.addEventListener(PenEventName.ON_HOVER_MOVE, this.onLiveHoverMove);
      pen.addEventListener(PenEventName.ON_PEN_HOVER_PAGEINFO, this.onLiveHoverPageInfo);
      pen.addEventListener(PenEventName.ON_PEN_UP_FOR_HOMOGRAPHY, this.setTransformParametersForPen);

      // virual pen down/up은, 펜 스트로크가 이어지고 있음에도 페이지가 바뀌는 경우에 발생한다
      pen.addEventListener(PenEventName.ON_PEN_DOWN_VIRTUAL, this.onLivePenDown);
      pen.addEventListener(PenEventName.ON_PEN_UP_VIRTUAL, this.onLivePenUp);

      this.subscribedPens.push(pen);

      if (this.renderer) {
        this.renderer.createHoverCursor(pen);
      }
    }
  }

  /**
   * @private
   * @param {NeoSmartpen} pen
   */
  private unsubscribePenEvent = (pen: INeoSmartpen) => {
    if (this.subscribedPens.includes(pen)) {
      pen.removeEventListener(PenEventName.ON_PEN_DOWN, this.onLivePenDown);
      pen.removeEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo);
      pen.removeEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove);
      pen.removeEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp);
      pen.removeEventListener(PenEventName.ON_HOVER_MOVE, this.onLiveHoverMove);
      pen.removeEventListener(PenEventName.ON_PEN_HOVER_PAGEINFO, this.onLiveHoverPageInfo);
      pen.removeEventListener(PenEventName.ON_PEN_UP_FOR_HOMOGRAPHY, this.setTransformParametersForPen);

      pen.removeEventListener(PenEventName.ON_PEN_DOWN_VIRTUAL, this.onLivePenDown);
      pen.removeEventListener(PenEventName.ON_PEN_UP_VIRTUAL, this.onLivePenUp);

      const index = this.subscribedPens.indexOf(pen);
      this.subscribedPens.splice(index, 1);

      if (this.renderer) {
        this.renderer.removeHoverCursor(pen);
      }
    }
  }

  private unsubscribeAllPensEvent = () => {
    this.subscribedPens.slice(0).forEach(pen => {
      this.unsubscribePenEvent(pen);
    });    
  }

  /** pen array를 제외하고는 event listening을 하지 않도록 */
  private makeUpPenEvents = (pens: INeoSmartpen[]) => {
    // 먼저 이벤트 리스닝을 해제할 것은 하고
    const needToUnsubscribe = this.subscribedPens.filter(pen => !pens.includes(pen));
    needToUnsubscribe.forEach(pen => {
      this.unsubscribePenEvent(pen);
    });

    const needToSubscribe = pens.filter(pen => !this.subscribedPens.includes(pen));
    needToSubscribe.forEach(pen => {
      this.subscribePenEvent(pen);
    });
  }


  /**
   * @override
   * @public
   */
  componentDidMount() {
    const { pens, pdfSize, baseScale } = this.props;
    // console.log(`PenBasedRenderer: size ${this.pdfSize.width}, ${this.pdfSize.height}`);
    // console.log("Renderer Inited");

    this.pdfSize = { scale: 1, ...pdfSize };
    // this.initRenderer(this.props.viewSize, this.pdfSize);

    this.makeUpPenEvents(pens);

    if (this.props.fromStorage) {
      // console.log(`Renderer(${this.props.parentName}): componentDidMount`);
      this.subScriptStorageEvent();
    }

    if (this.renderer && !this.props.calibrationMode) {
      this.inkStorage.addEventListener(PageEventName.PAGE_CLEAR, this.removeAllCanvasObjectOnActivePage, null);
      this.inkStorage.addEventListener(PenEventName.ON_ERASER_MOVE, this.renderer.redrawStrokes, null);
    }
  }


  /**
   * @override
   * @public
   */
  shouldComponentUpdate(nextProps: Props, nextState: State) {
    let ret_val = true;

    if (nextProps.pens !== this.props.pens) {
      // console.log(`PenBasedRenderer: shouldComponentUpdate, EventSubscribing`);
      this.makeUpPenEvents(nextProps.pens);
      ret_val = true;
    }

    if (this.props.isBlankPage !== nextProps.isBlankPage) {
      if (nextProps.isBlankPage) {
        this.renderer.canvasFb.setBackgroundColor('rgba(255,255,255,1)', null);
      } else {
        this.renderer.canvasFb.setBackgroundColor('rgba(255,255,255,0.1)', null);
      }
    }
    
    const storeNumDocPages = store.getState().activePage.numDocPages;
    if(storeNumDocPages !== this.state.numDocPages){
      //전체 페이지가 줄었을때(페이지가 삭제되었을때) 리드로우
      if(storeNumDocPages < this.state.numDocPages){
        this.renderer.redrawStrokes(nextProps.pageInfo);
      }
      if(storeNumDocPages < 1){
        this.renderer.pageInfo = undefined;
      }
      this.setState({ numDocPages: storeNumDocPages });
    }

    if ((this.props.rotation !== nextProps.rotation && isSamePage(this.props.basePageInfo, nextProps.basePageInfo)) || 
      (this.props.rotation !== nextProps.rotation && !this.props.isMainView && this.renderCount === 0)
    ) {
      //회전 버튼을 누를 경우만 들어와야 하는 로직, 회전된 pdf를 로드할 때는 들어오면 안됨
      //로드할 경우에는 this.props의 basePageInfo가 nullNCode로 세팅돼있기 때문에 들어오지 않음
      this.renderer.setRotation(nextProps.rotation, this.pdfSize);

      // const ctx = this.canvas.getContext('2d');
      // ctx.rotate(180 * Math.PI / 180);

      let pageInfo = nextProps.pageInfo
      const activePageNo = store.getState().activePage.activePageNo;
      const activePage = GridaDoc.getInstance().getPageAt(activePageNo);
      const activePageInfo = activePage.pageInfos[0];//plate에 쓰는 경우 plate의 pageInfo가 아닌 실제 pageInfo가 필요

      if (isPlatePaper(nextProps.pageInfo)) {
        pageInfo = activePageInfo
      }

      const isMainView = this.props.isMainView;
      if (isMainView) {
        this.renderer.rotate(pageInfo);
      }
      this.renderer.redrawStrokes(pageInfo, isMainView); //nextProps.pageInfo로 하면 paper -> plate 순으로 쓰고 난 후에 회전하면 paper에 쓴 stroke이 회전안함

      //이건 pen viewer의 실제 rotate 처리
      const tmp = nextProps.pdfSize.width;
      nextProps.pdfSize.width = nextProps.pdfSize.height;
      nextProps.pdfSize.height = tmp;

      this.renderer.onPageSizeChanged(nextProps.pdfSize);
      this.pdfSize = { ...nextProps.pdfSize, scale: this.pdfSize.scale };

      ret_val = true;
    }

    if (nextProps.viewSize.width !== this.props.viewSize.width || nextProps.viewSize.height !== this.props.viewSize.height) {
      this.viewSize = { ...nextProps.viewSize };
      console.log(`VIEW SIZE${callstackDepth()} WIDTH/HEIGHT:  ${this.viewSize.width}, ${this.viewSize.height}`);
      this.onViewResized(this.viewSize);
      ret_val = true;
    }

    if (this.props.viewFit !== nextProps.viewFit) {
      this.viewSize = { ...nextProps.viewSize };
      this.renderer._opt.viewFit = nextProps.viewFit;
      this.onViewResized(this.viewSize);
      ret_val = true;
    }

    if (!isSamePage(nextProps.pageInfo, this.props.pageInfo)) {
      const pageInfo = nextProps.pageInfo;

      console.log("`VIEW SIZE        PAGE CHANGE 0");

      if (this.renderer && !this.props.calibrationMode) {
        console.log(`VIEW SIZE PAGE CHANGE 1: ${makeNPageIdStr(pageInfo)}`);

        if (isSameNcode(nextProps.pageInfo, DefaultPUINcode) || isPUI(nextProps.pageInfo)) { 
          //1. PUI에 쓸 경우 페이지가 바뀌는 것을 막기 위함
          return false;
        }
 
        this.renderer._opt.rotation = nextProps.rotation;
        
        if (isSameNcode(nextProps.pageInfo, DefaultPlateNcode)){
          return false;
        }
        const transform = MappingStorage.getInstance().getNPageTransform(pageInfo);
        this.renderer.setTransformParameters(transform.h, nextProps.pdfSize);

        this.renderer.changePage(pageInfo, nextProps.pdfSize, false);

        this.renderer.onPageSizeChanged(nextProps.pdfSize);
        this.pdfSize = { ...nextProps.pdfSize, scale: this.pdfSize.scale };

        ret_val = true;

        /** 페이지 이동했을 때, Symbol을 비롯한 제스처 로직들의 초기화가 이루어져야 한다.
         *  & crossLine, doubleTap 관련 state의 초기화
         *  symbol(toast포함)의 display 상태 초기화(안보이도록 처리)
         * */ 
        this.props.initializeCrossLine();
        this.props.initializeTap();
        hideToastMessage();
      }

      if (this.props.calibrationMode) {
        const transform = MappingStorage.getInstance().getNPageTransform(pageInfo);
        this.renderer.setTransformParameters(transform.h, this.pdfSize);
        ret_val = true;
      }
    }

    const pageInfo = nextProps.pageInfo;

    if (this.props.pdfPageNo !== nextProps.pdfPageNo) { //빈 ncode page만 첫 load 할 때 worker에 pageInfo를 set해주기 위함
      this.renderer.pageInfo = { ...pageInfo };
    }

    if (pageInfo.section !== -1 && (nextProps.pdfSize.width !== this.props.pdfSize.width || nextProps.pdfSize.height !== this.props.pdfSize.height)) {
      console.error("`VIEW SIZE (comp) page size change");
      this.renderer.onPageSizeChanged(nextProps.pdfSize);
      this.pdfSize = { ...nextProps.pdfSize, scale: this.pdfSize.scale };
      ret_val = true;
    }

    if (this.props.zoom !== nextProps.zoom) {
      this.renderer.setCanvasZoomByButton(nextProps.zoom);
    }


    if (this.props.renderCountNo !== nextProps.renderCountNo) {
      if (this.renderer) {
        this.renderer.changePage(pageInfo, nextProps.pdfSize, false);
        this.renderer.onPageSizeChanged(nextProps.pdfSize);
        this.pdfSize = { ...nextProps.pdfSize, scale: this.pdfSize.scale };
        const transform = MappingStorage.getInstance().getNPageTransform(pageInfo);
        this.renderer.setTransformParameters(transform.h, this.pdfSize);
        ret_val = true;
      }
    }

    // hideCanvasMode 상태에 따른 로직 처리
    if (this.props.isMainView) { // 메인 뷰의 화면만 처리해준다. (thumbnail 제외)
      if (nextProps.hideCanvasMode) {
        this.renderer.removeAllCanvasObject(); // hideCanvasMode true 일 때, 계속 삭제해준다. -> 페이지 이동같은 event일때도 처리를 해줘야 하므로,
      } else if (this.props.hideCanvasMode !== nextProps.hideCanvasMode && !isSamePage(pageInfo, nullNcode())) { // false 이고 hideCanvasMode 상태가 바뀔 때, redraw 해준다.
        this.renderer.redrawStrokes(this.renderer.pageInfo);
      }
    }
  
    this.renderCount++;
    return ret_val;
  }


  initRenderer(viewSize: ISize, pageSize: ISize) {
    /** @type {{width:number, height:number}} */
    console.log(`VIEW SIZE${callstackDepth()} initRenderer:   view(${viewSize.width}, ${viewSize.height})  page(${pageSize.width}, ${pageSize.height})`);

    let bgColor = 'rgba(255,255,255,0.1)';
    if (this.props.isBlankPage) {
      bgColor = 'rgba(255,255,255,1)';
    }

    const options: IRenderWorkerOption = {
      canvasId: this.canvasId,
      canvas: this.canvas,
      // position: this.props.position,
      viewSize,
      pageSize,
      mouseAction: !this.fixed,
      viewFit: this.state.viewFit,
      fitMargin: this.fitMargin,
      onCanvasPositionChanged: this.props.onCanvasPositionChanged,
      rotation: this.props.rotation,
      autoFocus: true,
      shouldDisplayGrid: true,
      bgColor: bgColor,
    };

    const renderer = new PenBasedRenderWorker(options);
    return renderer;
  }

  onViewResized = ({ width, height }) => {
    if (this.renderer) {
      this.renderer.onViewSizeChanged({ width, height });
    }
  }


  /**
   * @override
   * @public
   */
  componentWillUnmount() {
    this.unsubscribeAllPensEvent();
    if (this.props.fromStorage) this.unsubScriptStorageEvent();

    if (this.renderer) {
      this.renderer.prepareUnmount();

      this.inkStorage.removeEventListener(PageEventName.PAGE_CLEAR, this.removeAllCanvasObjectOnActivePage);
      this.inkStorage.removeEventListener(PenEventName.ON_ERASER_MOVE, this.renderer.redrawStrokes);
    }
    this.props.initializeCrossLine();
    this.props.initializeTap();
  }

  /**
   *
   * @param {{strokeKey:string, mac:string, time:number, stroke:NeoStroke}} event
   */
  onLivePenDown = (event: IPenToViewerEvent) => {
    if (this.props.hideCanvasMode) {
      showMessageToast(getText('hide_canvas'));
    }
    if (this.renderer) {
      // const { section, owner, book, page } = event;
      // if (isSamePage(this.props.pageInfo, { section, owner, book, page }))
      this.renderer.createLiveStroke(event);
    }
  }

  onLivePenDown_byStorage = (event: IPenToViewerEvent) => {
    console.log(`Renderer(${makeNPageIdStr(this.props.pageInfo)}): onLivePenDown from InkStorage`);

    // if (this.renderer) {
    //   this.renderer.createLiveStroke_byStorage(event);
    // }
  }

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke:NeoStroke, section:number, owner:number, book:number, page:number}} event
   */
  onLivePenPageInfo = (event: IPenToViewerEvent) => {
    const { section, owner, book, page } = event;
    const prevPageInfo = this.props.pageInfo;
    let isRun = true;
    

    if (isSamePage(prevPageInfo, event as IPageSOBP) && (!this.shouldSendPageInfo)) {
      isRun = false;
    }
    this.shouldSendPageInfo = false;

    if (this.props.calibrationMode) {
      isRun = false;
    }
    if (isPUI(event as IPageSOBP)) {
      isRun = false;
    }
    if(!store.getState().gesture.isPenMode && event.mac !== PenManager.getInstance().virtualPen.mac){
      setIsPenMode(true);
    }else if(store.getState().gesture.isPenMode && event.mac === PenManager.getInstance().virtualPen.mac){
      setIsPenMode(false);
    }
    

    if(store.getState().gesture.isPenMode && !isPUI(event as IPageSOBP) && !this.props.calibrationMode){ // 가상펜이 아닐 경우
      const isPlate = isPlatePage(event as IPageSOBP);
      if(isPlate && this.props.isPageMode){
        this.props.setIsPageMode(false);
      }else if(!isPlate && !this.props.isPageMode){
        this.props.setIsPageMode(true);
      }
    }
    /** pdf pageNo를 바꿀 수 있게, container에게 전달한다. */
    if (isRun && this.props.onNcodePageChanged) {
      this.renderer.registerPageInfoForPlate(event);//hover page info를 거치지 않고 바로 page info로 들어오는 경우(빨리 찍으면 hover 안들어옴)
      this.props.onNcodePageChanged({ section, owner, book, page });
      //Plate <-> NcodePage 변화에서의 symbol(toast포함)의 display 상태 초기화(안보이도록 처리)
      hideToastMessage();
    }

  }

  onLivePenPageInfo_byStorage = (event: IPenToViewerEvent) => {
    // const { section, owner, book, page } = event;
    // const pageInfo = { section, owner, book, page } as IPageSOBP;

    // console.log(`Renderer(${makeNPageIdStr(this.props.pageInfo)}): PageInfo from InkStorage, pageInfo=${makeNPageIdStr(pageInfo)}`);
    // this.onLivePenPageInfo(event);
  }

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke:NeoStroke, dot:NeoDot}} event
   */


  onLivePenMove = (event: IPenToViewerEvent) => {
    const { stroke } = event;
    if (this.renderer) {
      if (this.props.hideCanvasMode) {
        if(event.dot !== undefined){
          event.dot.x *= -1;
          event.dot.y *= -1;
        }
      }
      this.renderer.pushLiveDot(event, this.props.rotation);
    }
  }

  /** Touble tap process */
  doubleTapProcess = (isPlate: boolean, dot: NeoDot) => {
    const pageInfo = this.renderer.pageInfo;
    // plate에서 작업하는 중에 발생하는 double tap 처리를 영역별로 구분
    if (isPlate) {
      switch(this.findDotPositionOnPlate(dot)) {
        case "top":
          this.topControlZone();
          break;
        case "bottom":
          this.bottomControlZone();
          break;
        case "left":
          this.leftControlZone();
          break;
        case "right":
          this.rightControlZone();
          break;
        case "top-left": 
        case "top-right":
        case "bottom-left":
        case "bottom-right":
          if (isSamePage(PlateNcode_3, this.props.pageInfo) && this.onPlusControlZone(dot)) {
            this.plusControlZone();
          }
          break;
        default:
          return
      }
      this.removeDoubleTapStrokeOnActivePage(pageInfo);
    }
    this.props.initializeTap();
  }

  /**
   * Tap count 하는 로직
   *
   * 1. 해당 동작이 Tap이 맞는지 아닌지 확인 -> dotArray의 맨 처음과 끝이 차이가 거의 없고, timeDiff 도 작은것만 tap으로 취급
   *    -> 이 맞다면 아래 실행
   * 2. firstDot이 null이면 해당 tap을 실행할때의 dotArray의 첫번째 값을 firstDot으로 설정해준다.
   * 3. firstDot이 존재한다면 거리를 비교해서 특정 값 범위 안에 들어와있을경우 tap count를 증가시켜준다.
   *
   */
  checkTap = (stroke: NeoStroke) => {
    const [first, last] = this.getFirstLastItems(stroke.dotArray);
    const timeDiff: number = this.getTimeDiff(first, last);
    const distance: number = this.getDistance(first, last);

    if (this.isTap(timeDiff, distance)) {
      if (!this.props.firstDot) {
        this.props.setFirstDot(first);
        return true
      }
      return this.isNotFirstTap(first);
    }
    this.props.initializeTap();
    return false
  }

  /**
   * 해당 동작이 tap인지 아닌지 파악하는 로직
   * -> 짧은 시간동안 동작했고, 라인의 첫부분과 끝부분의 좌표값 차이가 매우 작을때 tap touch라고 판단한다.
   */
  isTap = (timeDiff, distance) => {
    return timeDiff < 170 && distance < 0.8 ? true: false
  }

  /**
   * is not first tap case
   * -> 현재 탭동작이 첫번째 탭이 아닐경우 첫번째 탭과의 거리를 비교한다.
   * -> 거리가 가까우면 탭 카운트를 증가시켜주고, 멀면 현재탭은 첫번째 탭으로 설정해준다.
   */
  isNotFirstTap = (first) => {
    if (this.getDistance(this.props.firstDot, first) < 3) {
      this.props.incrementTapCount();
      return true
    }

    this.props.setFirstDot(first);
    return false
  }

  /** Top Control Zone - Page Up */
  topControlZone = () => {
    firebaseAnalytics.logEvent(`prev_page_gesture`, {
      event_name: `prev_page_gesture`
    });
    this.prevChange();
  }

  /** Bottom Control Zone - Page Down */
  bottomControlZone = () => {
    firebaseAnalytics.logEvent(`next_page_gesture`, {
      event_name: `next_page_gesture`
    });
    this.nextChange();
  }

  /** Left Control Zone - Rotate */
  leftControlZone = () => {
    firebaseAnalytics.logEvent(`rotate_page_gesture`, {
      event_name: `rotate_page_gesture`
    });
    onToggleRotate();
  }

  /** Right Control Zone - Hide Canvas */
  rightControlZone = () => {
    firebaseAnalytics.logEvent(`hide_gesture`, {
      event_name: `hide_gesture`
    });
    this.props.setHideCanvasMode(!this.props.hideCanvasMode);
  }

  /** Top Left Control Zone */
  plusControlZone = () => {
    firebaseAnalytics.logEvent(`new_page_gesture`, {
    event_name: `new_page_gesture`
    });
    // Add Blank Page
    this.addBlankPage();
    console.log("%cADD PAGE : plus button", "color:red;font-size:25px");
  }

  onLivePenMove_byStorage = (event: IPenToViewerEvent) => {
    // if (this.renderer) {
    //   this.renderer.pushLiveDot_byStorage(event);
    // }
  }

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke, section:number, owner:number, book:number, page:number}} event
   */
  onLivePenUp = (event: IPenToViewerEvent) => {
    const { stroke } = event;
    this.crossLineEraser(stroke);

    if (this.props.gestureMode && this.checkTap(stroke) && this.props.tapCount === 2) {
      this.doubleTapProcess(stroke.isPlate, stroke.dotArray[0]);
    }
      
    if (this.props.calibrationMode) {
      this.onCalibrationUp(event);
    }
    else if (this.renderer) {
      this.renderer.closeLiveStroke(event);
    }
  }

  /** Paper에 X를 그렸을 때, stroke를 지우게 하기 위한 로직 */ 
  crossLineEraser = (stroke: NeoStroke) => {
    // gestureMode가 아니거나 플레이트가 아니라면 종료
    if (!this.props.gestureMode || !stroke.isPlate) return

    const [first, last] = this.getFirstLastItems(stroke.dotArray);
    // 임시, 플레이트 윗 파티션은 stroke 에 dotArray 가 들어오지 않으므로 예외처리 해놓음.
    if (!first?.point || !last?.point) return

    if (this.checkLeftToRightDiagonal(first, last) && this.lineAccuracyTest(stroke)) {
      this.props.setLeftToRightDiagonal();
    }
    if (this.checkRightToLeftDiagonal(first, last) && this.lineAccuracyTest(stroke)) {
      this.props.setRightToLeftDiagonal();
    }
    
    if (this.props.leftToRightDiagonal && this.props.rightToLeftDiagonal) {
      onClearPage();
      firebaseAnalytics.logEvent(`delete_gesture`, {
        event_name: `delete_gesture`
      });
      this.props.initializeCrossLine();
    }
  }

  lineAccuracyTest = (stroke: NeoStroke) => {
    const [first, last] = this.getFirstLastItems(stroke.dotArray);
    /**
     * Ax + By + C = 0 과 dot 사이의 distance 계산
     * ~ y-y1 = (y2-y1)/(x2-x1) / (x-x1)
     * ~ d = | A*target.x + B*target.y + C | / square_root(A^2 + B^2)
     * stroke 안의 모든 dot을 검사하여 distance가 threshold 보다 클 경우 False를 반환
     */
    const A = first.point.y - last.point.y;
    const B = last.point.x - first.point.x;
    const C = (first.point.x-last.point.x)*first.point.y + (last.point.y-first.point.y)*first.point.x;
    const threshold = 50;
    for (const dot of stroke.dotArray) {
      const x = dot.point.x;
      const y = dot.point.y;                       
      const distance = Math.abs(A*x+B*y+C)/Math.sqrt(Math.pow(A, 2) + Math.pow(B, 2));
      if (distance > threshold) return false
    }
    return true
  }

  checkLeftToRightDiagonal = (first: NeoDot, last: NeoDot) => {
    return  this.findDotPositionOnPlate(first) === 'top-left' && 
            this.findDotPositionOnPlate(last) === 'bottom-right'
  }

  checkRightToLeftDiagonal = (first: NeoDot, last: NeoDot) => {
    return  this.findDotPositionOnPlate(first) === 'top-right' &&
            this.findDotPositionOnPlate(last) === 'bottom-left'
  }

  onCalibrationUp = (event: IPenToViewerEvent) => {
    let i;

    const penCalibrationPoint = event.pen.calibrationPoint;

    const pts = event.pen.calibrationData.points;
    const len = pts.length;

    // 점 수가 너무 적다
    if (len < 2) return;

    let x_min = 99999,
        y_min = 99999,
        x_max = -99999,
        y_max = -99999;

    for (i = 0; i < len; i++) {
      x_min = Math.min(x_min, pts[i].x);
      x_max = Math.max(x_max, pts[i].x);

      y_min = Math.min(y_min, pts[i].y);
      y_max = Math.max(y_max, pts[i].y);
    }

    const x_range = x_max - x_min;
    const y_range = y_max - y_min;

    // 점이 너무 넓게 들어왔다.
    if (x_range > 2 || y_range > 2) {
      event.pen.calibrationData = {
        section: -1,
        owner: -1,
        book: -1,
        page: -1,
        points: new Array(0),
      };
      return;
    }

    const nu = {x: (x_max + x_min) / 2, y: (y_max + y_min) / 2}

    const clicked_point = {
      section: penCalibrationPoint.section,
      owner: penCalibrationPoint.owner,
      book: penCalibrationPoint.book,
      page: penCalibrationPoint.page,
      nu: {x: nu.x, y: nu.y},
    };

    const { section, owner, book, page } = event;
    const pageInfo = { section, owner, book, page } as IPageSOBP;
    const { setCalibrationData } = this.props;

    const cali = {
      section : section,
      owner: owner,
      book: book,
      page: page,
      nu: {x: clicked_point.nu.x, y: clicked_point.nu.y},
    };

    setCalibrationData(cali);

    event.pen.calibrationData = {
      section: -1,
      owner: -1,
      book: -1,
      page: -1,
      points: new Array(0),
    };
  }

  onLivePenUp_byStorage = (event: IPenToViewerEvent) => {
    const { section, owner, book, page } = event;
    const pageInfo = { section, owner, book, page } as IPageSOBP;
    
    const activePageNo = store.getState().activePage.activePageNo;
    const activePage = GridaDoc.getInstance().getPageAt(activePageNo);
    if(activePageNo === -1) return ;
    
    const activePageInfo = activePage.pageInfos[0];//plate에 쓰는 경우 plate의 pageInfo가 아닌 실제 pageInfo가 필요

    let isPlate = false;
    if (isSamePage(activePageInfo, this.props.pageInfo) && isSameNcode(DefaultPlateNcode, pageInfo) || isPUI(pageInfo)) {
      isPlate = true;
    }

    if (this.renderer && (isSamePage(this.props.pageInfo, pageInfo) || isPlate)) {
      // console.log(`Renderer(${makeNPageIdStr(this.props.pageInfo)}): onLivePenUp, pageInfo=${makeNPageIdStr(pageInfo)}  ==> ADDED`);
      this.renderer.closeLiveStroke_byStorage(event, pageInfo);
    }
    // else {
    //   console.log(`Renderer(${makeNPageIdStr(this.props.pageInfo)}): onLivePenUp, pageInfo=${makeNPageIdStr(pageInfo)}  ==> DISCARDED`);
    // }

  }

  removeAllCanvasObjectOnActivePage = (pageInfo: IPageSOBP) => {
    const activePageNo = store.getState().activePage.activePageNo;
    const activePage = GridaDoc.getInstance().getPageAt(activePageNo);
    const activePageInfo = activePage.pageInfos[0];//plate에 쓰는 경우 plate의 pageInfo가 아닌 실제 pageInfo가 필요

    let isPlate = false;
    if (isSamePage(activePageInfo, pageInfo) && (isSameNcode(DefaultPlateNcode, this.props.pageInfo) || isPUI(this.props.pageInfo))) {
      isPlate = true;
    }

    if (this.renderer && (isSamePage(this.props.pageInfo, pageInfo) || isPlate)) {
      this.renderer.removeAllCanvasObject();
    }
  }


  /** 더블탭 stroke를 지우기 위한 로직 */
  removeDoubleTapStrokeOnActivePage = (pageInfo: IPageSOBP) => {
    const completed = this.renderer.storage.getPageStrokes(pageInfo);
    completed.splice(-2);

    // hideCanvas가 되어있을시 redraw 로직을 실행하면 다시 stroke가 생성되므로 로직이 실행되지 않도록 함수를 종료시켜준다. 
    if (this.props.hideCanvasMode) return
    
    // Thumbnail 영역 redraw 를 위한 dispath 추가
    this.renderer.storage.dispatcher.dispatch(PenEventName.ON_ERASER_MOVE, {
      section: pageInfo.section,
      owner: pageInfo.owner,
      book: pageInfo.book,
      page: pageInfo.page,
    });
  }

  onLiveHoverPageInfo = (event: IPenToViewerEvent) => {
    if (this.renderer) {
      this.renderer.registerPageInfoForPlate(event);
    }
  }

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke:NeoStroke, dot:NeoDot}} event
   */

  onLiveHoverMove = (event: IPenToViewerEvent) => {
    if (this.renderer) {
      this.renderer.moveHoverPoint(event);
    }
  }

  setTransformParametersForPen = (pen: INeoSmartpen) => {
    pen.h = this.renderer._opt.h;
    pen.h_origin = this.renderer.h;
  }

  /** Gesture 인식을 위한 dot 계산식 */
  getFirstLastItems = (array: NeoDot[]) => {
    return [array[0], array[array.length-1]]
  }

  getDistance = (d1: NeoDot, d2: NeoDot) => {
    return d1 && d2 ? Math.sqrt(Math.pow(d1.x-d2.x, 2) + Math.pow(d1.y-d2.y, 2)) : null;
  }

  getTimeDiff = (d1: NeoDot, d2: NeoDot) => {
    return d1 && d2 ? Math.abs(d1.time - d2.time) : null;
  }


  /** Page Up, Down 처리
   * activePageNo - 0부터 시작, numDocPages - 1부터 시작
  */
  prevChange = () => {  // Page Up
    if (this.props.activePageNo <= 0) {
      return showMessageToast(getText('no_more_page'));
    }
    setActivePageNo(this.props.activePageNo-1);    
    scrollToThumbnail(this.props.activePageNo-1);
  }
  nextChange = () => { // PageDown
    if (this.props.activePageNo === this.state.numDocPages-1) {
      return showMessageToast(getText('no_more_page'));
    }
    setActivePageNo(this.props.activePageNo+1);
    scrollToThumbnail(this.props.activePageNo+1);
  }


  /** 빈페이지를 추가하기 위한 로직 */
  addBlankPage = () => {
    const doc = GridaDoc.getInstance();
    const pageNo = doc.addBlankPage();
    /** 직전 작업 페이지의 mode(landscape/portrait)에 따라 페이지 각도를 설정하는 로직 (사용미정) */ 
    // if ([0, 180].includes(this.getRotationOnPageMode())) {
    //   doc._pages[pageNo]._rotation = 270;
    // }
    doc._pages[pageNo]._rotation = (270+this.getRotationOnPageMode())%360;
    setActivePageNo(pageNo);
    scrollToThumbnail(pageNo);
  }

  /** Plate 내에서의 dot position 파악 (상, 하, 좌, 우, 좌상단) */
  findDotPositionOnPlate = (dot: NeoDot) => {
    if (!dot) return
    /** 회전값을 반영하기위한 Shift Array 
     *  회전각에 따라 rotateDegree{0: 0, 90: 1, 180: 2, 270:3}를 plate gesture 영역에 반영하여 계산한다.
     *  4를 더하는 이유는 음수를 처리하기 위함.
    */
    const shiftArray = ['top', 'left', 'bottom', 'right'];
    const shiftEdgeArray = ['top-left', 'bottom-left', 'bottom-right', 'top-right'];
    // const rotateDegree = this.getRotationOnPageMode() / 90;
    const rotateDegree = 0;

    let {x,y} = dot;
    if(x < 0){
      x *= -1;
      y *= -1;
    }
    const {npaperWidth, npaperHeight, gestureArea} = this.getPaperSize();
    if (this.onTopControlZone(x, y, npaperWidth, npaperHeight, gestureArea)) {
      return shiftArray[(0-rotateDegree+4)%4];
    }
    else if (this.onLeftControlZone(x, y, npaperWidth, npaperHeight, gestureArea)) {
      return shiftArray[(1-rotateDegree+4)%4];
    }
    else if (this.onBottomControlZone(x, y, npaperWidth, npaperHeight, gestureArea)) {
      return shiftArray[(2-rotateDegree+4)%4];
    }
    else if (this.onRightControlZone(x, y, npaperWidth, npaperHeight, gestureArea)) {
      return shiftArray[(3-rotateDegree+4)%4];
    }
    else if (this.onTopLeftControlZone(x, y, npaperWidth, npaperHeight, gestureArea)) {
      return shiftEdgeArray[(0-rotateDegree+4)%4];
    }
    else if (this.onBottomLeftControlZone(x, y, npaperWidth, npaperHeight, gestureArea)) {
      return shiftEdgeArray[(1-rotateDegree+4)%4];
    }
    else if (this.onBottomRightControlZone(x, y, npaperWidth, npaperHeight, gestureArea)) {
      return shiftEdgeArray[(2-rotateDegree+4)%4];
    }
    else if (this.onTopRightControlZone(x, y, npaperWidth, npaperHeight, gestureArea)) {
      return shiftEdgeArray[(3-rotateDegree+4)%4];
    }
  }
  
  onTopControlZone = (x: number, y: number, width: number, height: number, gestureArea: number) => {
    return  x > (width-gestureArea)/2 && 
            x < width-(width-gestureArea)/2 && 
            y < gestureArea*(3/5)
  }
  onBottomControlZone = (x: number, y: number, width: number, height: number, gestureArea: number) => {
    return  x > (width-gestureArea)/2 && 
            x < width-(width-gestureArea)/2 && 
            y > height-(gestureArea*(3/5))
  }
  onLeftControlZone = (x: number, y: number, width: number, height: number, gestureArea: number) => {
    return  x < gestureArea*(3/5) && 
            y > (height-gestureArea)/2 && 
            y < height-(height-gestureArea)/2
  }
  onRightControlZone = (x: number, y: number, width: number, height: number, gestureArea: number) => {
    return  x > width-(gestureArea*(3/5)) && 
            y > (height-gestureArea)/2 && 
            y < height-(height-gestureArea)/2
  }
  /**
   * 모서리 부분의 control 영역은 plate의 짧은면 기준 26% ~ 흠 영역을 어떻게 하지
   * 즉, gestureArea(plate 짧은면 width의 1/3) * 0.8 -> (+) 영역을 쓸 경우 너무 작아 인식이 잘 되지 않음.
   */
  onTopLeftControlZone = (x: number, y: number, width: number, height: number, gestureArea: number) => {
    return x < gestureArea*0.8 && y < gestureArea*0.8
  }
  onTopRightControlZone = (x: number, y: number, width: number, height: number, gestureArea: number) => {
    return x > width-(gestureArea*0.8) && y < gestureArea*0.8
  }
  onBottomLeftControlZone = (x: number, y: number, width: number, height: number, gestureArea: number) => {
    return x < gestureArea*0.8 && y > height-(gestureArea*0.8)
  }
  onBottomRightControlZone = (x: number, y: number, width: number, height: number, gestureArea: number) => {
    return x > width-(gestureArea*0.8) && y > height-(gestureArea*0.8)
  }
  onPlusControlZone = (dot: NeoDot) => {
    const {gestureArea} = this.getPaperSize();
    const x = dot.x;
    const y = dot.y;
    return x < gestureArea*(3/7) && y < gestureArea*(3/7)
  }

  getPaperSize = () => {
    // plate일 때, 해당 plate의 info를 가져옴.
    const noteItem = getNPaperInfo(this.props.pageInfo);
    adjustNoteItemMarginForFilm(noteItem, this.props.pageInfo);
    const npaperWidth = noteItem.margin.Xmax - noteItem.margin.Xmin;
    const npaperHeight = noteItem.margin.Ymax - noteItem.margin.Ymin;

    // 짧은면을 기준으로 1/3 만큼을 gesture 가능범위로 설정
    const gestureArea = npaperWidth > npaperHeight ? npaperHeight/3 : npaperWidth/3

    return {npaperWidth, npaperHeight, gestureArea}
  }

  /** 페이지 mode(landscape/portrait)에 따른 회전값을 가져오기 위한 함수 
   * landscape: 현재 rotation 값을 그대로 가져옴
   * portrait: landscape에서 90도 회전된 상태의 값을 주어야 하므로 현재 rotation 값에 90을 더해준다.
  */
  getRotationOnPageMode = () => {
    const currentPage = GridaDoc.getInstance().getPage(store.getState().activePage.activePageNo);
    if (!currentPage) return
    
    let pageMode = "portrait";
    if (currentPage.pageOverview.landscape) {
      pageMode = "landscape";
    }
    
    return pageMode === "portrait" ? (this.props.rotation+90)%360 : this.props.rotation 
  }


  render() {
    let { zoom } = this.props.position;

    zoom = 1;

    const inkContainerDiv: CSSProperties = {
      position: "absolute",
      zoom: zoom,
      left: this.props.position.offsetX / zoom,
      top: this.props.position.offsetY / zoom,
      zIndex: 10,
      overflow: "hidden",
      visibility: this.state.numDocPages <= 0 ? "hidden" : "visible",
    }

    const inkCanvas: CSSProperties = {
      position: "absolute",
      zoom: zoom,
      left: 0,
      top: 0,
      zIndex: 10,
    }


    const shadowStyle: CSSProperties = {
      color: "#a20",
      textShadow: "-1px 0 2px #fff, 0 1px 2px #fff, 1px 0 2px #fff, 0 -1px 2px #fff",
    }
    
    const infoNoPageDiv: CSSProperties = {
      display: "flex",
      flexDirection: "column",
      width: "246px",
      height: this.viewSize.height,
      justifyContent: "center",
      alignItems: "center",
      margin: "auto",
      padding: "0px",
    }

    const infoNoPageIcon: CSSProperties = {
      position: "static",
      width: "80px",
      height: "80px",
      color: theme.custom.icon.mono[2],
      marginBottom: "20px"
    }

    const infoNoPageTitle: CSSProperties = {
      position: "static",
      width: "360px",
      
      fontFamily: "Noto Sans CJK KR",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "18px",
      lineHeight: "26px",
      letterSpacing: "0.25px",

      color: theme.palette.secondary.contrastText
    }

    return (
      <div id="pen-based-renderer" ref={this.setMainDivRef} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* <Paper style={{ height: this.size.height, width: this.size.width }}> */}

        <div id={`${this.props.parentName}-fabric_container`} style={inkContainerDiv} >
          <canvas id={this.canvasId} style={inkCanvas} ref={this.setCanvasRef} />
        </div >

        {this.state.numDocPages <= 0 ? 
          <div style={infoNoPageDiv}>
            <SvgIcon id="no_page_svg_icon" style={infoNoPageIcon}>
              <path fillRule="evenodd" clipRule="evenodd"
                d="M18 10v10H6V4h6v6h6zm2-2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2h8l6 6zm-6-3.172L17.172 8H14V4.828z"
              />
            </SvgIcon>
            <Typography style={infoNoPageTitle}>
            {getText('initial_page_guide')}
            </Typography>
          </div>
          : ""}

        {!this.props.noInfo ?
          < div id={`${this.props.parentName}-info`} style={inkContainerDiv} >
            <br /> &nbsp; &nbsp;

          <Typography style={{ ...shadowStyle, fontSize: 16 }}>PenRenderer </Typography>

            <br /> &nbsp; &nbsp;
          <Typography style={{ ...shadowStyle, fontSize: 10 }}>Page:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, }}> {makeNPageIdStr(this.props.pageInfo)} </Typography>

            <br /> &nbsp; &nbsp;
          <Typography style={{ ...shadowStyle, fontSize: 10 }}>Base:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {makeNPageIdStr(this.props.basePageInfo)} </Typography>

            <br /> &nbsp; &nbsp;
          <Typography style={{ ...shadowStyle, fontSize: 10 }}>pdfPageNo:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {this.props.pdfPageNo} </Typography>

          </div >
          : ""}
      </div >
    );
  }
}


// const activePageNo = useSelector((state: RootState) => state.activePage.activePageNo);

const mapStateToProps = (state) => ({
  calibrationData: state.calibrationDataReducer.calibrationData,
  calibrationMode: state.calibration.calibrationMode,
  tapCount: state.gesture.doubleTap.tapCount,
  firstDot: state.gesture.doubleTap.firstDot,
  leftToRightDiagonal: state.gesture.crossLine.leftToRightDiagonal,
  rightToLeftDiagonal: state.gesture.crossLine.rightToLeftDiagonal,
  notFirstPenDown: state.gesture.symbol.notFirstPenDown,
  show: state.gesture.symbol.show,
  hideCanvasMode: state.gesture.hideCanvasMode,
  gestureMode: state.gesture.gestureMode,
  isPageMode: state.gesture.isPageMode,
  activePageNo: state.activePage.activePageNo
});

const mapDispatchToProps = (dispatch) => ({
  setCalibrationData: cali => setCalibrationData(cali),
  incrementTapCount: () => incrementTapCount(),
  initializeTap: () => initializeTap(),
  setFirstDot: (dot) => setFirstDot(dot),
  setLeftToRightDiagonal: () => setLeftToRightDiagonal(),
  setRightToLeftDiagonal: () => setRightToLeftDiagonal(),
  initializeCrossLine: () => initializeCrossLine(),
  setIsPageMode: (bool) => setIsPageMode(bool),
  setHideCanvasMode: (bool) => setHideCanvasMode(bool),
  setActivePageNo: no => setActivePageNo(no)
});

export default connect(mapStateToProps, mapDispatchToProps)(PenBasedRenderer);

// export default PenBasedRenderer;