import React from "react";
import {connect} from "react-redux";
import {CSSProperties} from "@material-ui/core/styles/withStyles";
import {Typography} from "@material-ui/core";

import {IRenderWorkerOption} from "./RenderWorkerBase";
import PenBasedRenderWorker from "./PenBasedRenderWorker";

import {IBrushType, PageEventName, PenEventName, PLAYSTATE, ZoomFitEnum} from "nl-lib/common/enums";
import {IPageSOBP, ISize, NeoDot, NeoStroke} from "nl-lib/common/structures";
import {callstackDepth, isSameNcode, isSamePage, makeNPageIdStr, uuidv4} from "nl-lib/common/util";

import {INeoSmartpen, IPenToViewerEvent} from "nl-lib/common/neopen";
import {MappingStorage} from "nl-lib/common/mapper";
import {DefaultPlateNcode, DefaultPUINcode} from "nl-lib/common/constants";
import {InkStorage} from "nl-lib/common/penstorage";
import {isPlatePaper, isPUI} from "nl-lib/common/noteserver";

import {setCalibrationData} from 'GridaBoard/store/reducers/calibrationDataReducer';
import {store} from "GridaBoard/client/pages/GridaBoard";
import GridaDoc from "GridaBoard/GridaDoc";
import {setLongPressImpossible, setLongPressPen} from "../../../GridaBoard/store/reducers/longPressReducer";

import {incrementTapCount, initializeDiagonal, initializeTapCount, setFirstTap, setLeftDiagonal, setRightDiagonal} from "../../../GridaBoard/store/reducers/tapReducer";
import {PenManager} from "../../neosmartpen";
import { setActivePageNo } from "../../../GridaBoard/store/reducers/activePageReducer";
import { stroke } from "pdf-lib";

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
  setCalibrationData2: any,
  calibrationMode: boolean,

  isBlankPage: boolean,


  isLongPress: boolean;
  impossible: boolean;
  setLongPressPen2: any,
  setLongPressImpossible2: any;

  initializeTapCount2: any;
  tapCount: number;
  incrementTapCount2: any;
  firstDot: NeoDot;
  setFirstTap2: any;

  initializeDiagonal2: any;
  leftDiagonal: boolean;
  rightDiagonal: boolean;
  setLeftDiagonal2: any;
  setRightDiagonal2: any;

  activePageNo: number;  
  setActivePageNo2: any;
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
    this.subscribedPens.forEach(pen => {
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

    if ((this.props.rotation !== nextProps.rotation) && isSamePage(this.props.basePageInfo, nextProps.basePageInfo)) {
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
          return;
        }

        this.renderer._opt.rotation = nextProps.rotation;
        
        if (isSameNcode(nextProps.pageInfo, DefaultPlateNcode)){
          return;
        }
        const transform = MappingStorage.getInstance().getNPageTransform(pageInfo);
        this.renderer.setTransformParameters(transform.h, this.pdfSize);

        this.renderer.changePage(pageInfo, nextProps.pdfSize, false);

        this.renderer.onPageSizeChanged(nextProps.pdfSize);
        this.pdfSize = { ...nextProps.pdfSize, scale: this.pdfSize.scale };

        ret_val = true;

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
  }

  /**
   *
   * @param {{strokeKey:string, mac:string, time:number, stroke:NeoStroke}} event
   */
  onLivePenDown = (event: IPenToViewerEvent) => {
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
    if (isSamePage(prevPageInfo, event as IPageSOBP) && (!this.shouldSendPageInfo)) {
      return;
    }
    this.shouldSendPageInfo = false;

    if (this.props.calibrationMode) {
      return;
    }
    /** pdf pageNo를 바꿀 수 있게, container에게 전달한다. */
    if (this.props.onNcodePageChanged) {
      this.renderer.registerPageInfoForPlate(event);//hover page info를 거치지 않고 바로 page info로 들어오는 경우(빨리 찍으면 hover 안들어옴)
      this.props.onNcodePageChanged({ section, owner, book, page });
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

    // 불가능하지 않고(impossibility), long press 상태가 아니고, checkLongPress 로직을 만족하는지 체크
    if (!this.props.impossible && !this.props.isLongPress && this.checkLongPress(stroke)) {
      this.props.setLongPressPen2(true);
      const res = this.findDotPostionOnPlate(stroke.dotArray[0])
      if (res === 'left') {
        this.renderer.recoveryAllCanvasObject();
      } 
      else {
        PenManager.getInstance().setPenRendererType(IBrushType.MARKER);
      }
    }

    if (this.renderer) {
      this.renderer.pushLiveDot(event, this.props.rotation);
    }
  }

  /**
   * 해당 동작이 long press 인지 확인하기 위한 로직
   * -> 동작을 할때의 stroke의 길이가 짧고, 긴 시작동안 눌렀을때 long press 동작이라고 판단
   *
   */
  checkLongPress = (stroke: NeoStroke) => {
    const [first, last] = this.getFirstLastItems(stroke.dotArray);
    const timeDiff: number = this.getTimeDiff(first, last);
    const distance: number = this.getDistance(first, last);

    /** stroke 의 첫점과 끝점의 거리가 길면 애초에 long press 가 불가능한 경우로 파악 */
    if (distance >= 0.5) {
      this.props.setLongPressImpossible2(true);
      return false
    }

    /** 1000ms 기준으로 체크 -> 1s 와 첫 시작점과 현재 포지션의 차이가 0.5 미만 */
    return distance < 0.5 && timeDiff > 800 ? true : false
  }

  initLongPress = () => {
    this.props.setLongPressPen2(false);
    this.props.setLongPressImpossible2(false);
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

    // tap count 별로 PenManager를 통해 pen type을 바꿔준다.
    if (this.checkTap(stroke)) {
      if (this.props.tapCount === 2) {
        this.doubleTapProcess(stroke.isPlate, stroke.dotArray[0]);
      }
      else if (this.props.tapCount === 3) {
        // triple tap touch process
      }
    }

    this.crossLineTest(stroke);

    // if (stroke.isCommand)
    // {
    //   stroke.brushType = 3;
    //   this.renderer.redrawStrokes(this.props.pageInfo, this.props.isMainView);
    //   return
    // }

    // 기본적으로 up할때 longPress를 초기화 시켜줌
    this.initLongPress();

    if (this.props.calibrationMode) {
      this.onCalibrationUp(event);
    }
    else if (this.renderer) {
      this.renderer.closeLiveStroke(event);
    }
  }

  
  /** Touble tap process */
  doubleTapProcess = (isPlate: boolean, dot: NeoDot) => {
    // tap touch stroke를 지우게 하기 위해 만들어놓은 임시...
    const strokesAll = this.renderer.storage.completed;
    const targetStroke = strokesAll[strokesAll.length-2];
    if (targetStroke) targetStroke.brushType = IBrushType.ERASER;
    const target2 = strokesAll[strokesAll.length-1];
    if (target2) target2.brushType = IBrushType.ERASER;

    // plate에서 작업하는 중에 발생하는 double tap 처리를 영역별로 구분
    if (isPlate) {
      const res = this.findDotPostionOnPlate(dot);
      if (res === 'top') {
        this.prevChange();
      }
      else if (res === 'bottom') {
        this.nextChange();
      }
      else if (res === 'left') {
        // 필기 숨기기
        this.renderer.removeAllCanvasObject();
      }
      else if (res === 'right') {
        // 확대 - 축소 -> 임시로 지우개로 만들어놓음.
        // this.renderer.setCanvasZoomByButton(150);
        PenManager.getInstance().setPenRendererType(IBrushType.ERASER);
      }
    }

    this.props.initializeTapCount2();
  }

  /**
   * Paper에 X를 그렸을 때, stroke를 지우게 하기 위한 로직
   */ 
  crossLineTest = (stroke: NeoStroke) => {
    const width: number = this.props.pdfSize.width;
    const height: number = this.props.pdfSize.height;
    const [first, last] = this.getFirstLastItems(stroke.dotArray);
    
    // 임시, 플레이트 윗 파티션은 stroke 에 dotArray 가 들어오지 않으므로 예외처리 해놓음.
    if (!first?.point || !last?.point) return

    if (first.point.x < width*0.3 && first.point.y < height*0.3 && last.point.x > width*0.7 && last.point.y > height*0.7) {
      console.log('left to right cross line');
      this.props.setRightDiagonal2();
    }
    if (first.point.x > width*0.7 && first.point.y < height*0.3 && last.point.x < width*0.3 && last.point.y > height*0.7) {
      console.log('right to left cross line');
      this.props.setLeftDiagonal2();
    }

    if (this.props.leftDiagonal && this.props.rightDiagonal) {
      // 일단 임시.... storage에서는 삭제가 안되나? 
      this.renderer.removeAllCanvasObject();
      this.inkStorage.resetStrokes();
      this.renderer.redrawStrokes(this.props.pageInfo, this.props.isMainView);
      this.props.initializeDiagonal2();
    }
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
        this.props.setFirstTap2(first);
        return true
      }
      else {
        return this.isNotFirstTap(first);
      }
    }
    else {
      this.props.initializeTapCount2();
      return false
    }
  }

  /**
   * 해당 동작이 tap인지 아닌지 파악하는 로직
   * -> 짧은 시간동안 동작했고, 라인의 첫부분과 끝부분의 좌표값 차이가 매우 작을때 tap touch라고 판단한다.
   *
   */
  isTap = (timeDiff, distance) => {
    return timeDiff < 170 && distance < 0.8 ? true: false
  }

  /**
   * is not first tap case
   * -> 현재 탭동작이 첫번째 탭이 아닐경우 첫번째 탭과의 거리를 비교한다.
   * -> 거리가 가까우면 탭 카운트를 증가시켜주고, 멀면 현재탭은 첫번째 탭으로 설정해준다.
   *
   */
  isNotFirstTap = (first) => {
    if (this.getDistance(this.props.firstDot, first) < 3) {
      this.props.incrementTapCount2();
      return true
    }
    else {
      this.props.setFirstTap2(first);
      return false
    }
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
    const { setCalibrationData2 } = this.props;

    const cali = {
      section : section,
      owner: owner,
      book: book,
      page: page,
      nu: {x: clicked_point.nu.x, y: clicked_point.nu.y},
    };

    setCalibrationData2(cali);

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
    const activePageInfo = activePage.pageInfos[0];//plate에 쓰는 경우 plate의 pageInfo가 아닌 실제 pageInfo가 필요

    let isPlate = false;
    if (isSamePage(activePageInfo, this.props.pageInfo) && isSameNcode(DefaultPlateNcode, pageInfo)) {
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

  onLiveHoverPageInfo = (event: IPenToViewerEvent) => {
    if (this.renderer) {
      this.renderer.registerPageInfoForPlate(event);
    }
  }

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke:NeoStroke, dot:NeoDxot}} event
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

  /**
   *
   * Gesture 인식을 위한 dot 계산식
   */
  getFirstLastItems = (array: NeoDot[]) => {
    return [array[0], array[array.length-1]]
  }

  getDistance = (d1: NeoDot, d2: NeoDot) => {
    return d1 && d2 ? Math.sqrt(Math.pow(d1.x-d2.x, 2) + Math.pow(d1.y-d2.y, 2)) : null;
  }

  getTimeDiff = (d1: NeoDot, d2: NeoDot) => {
    return d1 && d2 ? Math.abs(d1.time - d2.time) : null;
  }

  
  /** 
   * Page Up, Down 처리
   * activePageNo -> 0부터 시작, numDocpages -> 1부터 시작 
   */

  // Page Up
  prevChange = () => {
    if (this.props.activePageNo <= 0) return
    setActivePageNo(this.props.activePageNo-1);    
  }

  // Page Down
  nextChange = () => {
    if (this.props.activePageNo === this.state.numDocPages-1) return
    setActivePageNo(this.props.activePageNo+1);
  }

  findDotPostionOnPlate = (dot: NeoDot) => {
    if (!dot) return
    
    /** 
     * Plate 의 width, height 
     * 따라서, dot.x 와 dot.y 는 raw data 의 좌표로 계산 
     * */
    const width: number = 107;
    const height: number = 57;
    
    if (width*0.3 < dot.x && dot.x < width*0.7 && dot.y < height*0.3) {
      return 'top'
    }
    else if (width*0.3 < dot.x && dot.x < width*0.7 && dot.y > height*0.7) {
      return 'bottom'
    }
    else if (dot.x < width*0.3 && height*0.3 < dot.y && dot.y < height*0.7) {
      return 'left'
    }
    else if (width*0.7 < dot.x && height*0.3 < dot.y && dot.y < height*0.7) {
      return 'right'
    }
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

    return (
      <div id="pen-based-renderer" ref={this.setMainDivRef} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* <Paper style={{ height: this.size.height, width: this.size.width }}> */}

        < div id={`${this.props.parentName}-fabric_container`} style={inkContainerDiv} >
          <canvas id={this.canvasId} style={inkCanvas} ref={this.setCanvasRef} />
        </div >

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
  isLongPress: state.longPress.isLongPress,
  impossible: state.longPress.impossible,
  tapCount: state.tap.count,
  firstDot: state.tap.firstDot,
  leftDiagonal: state.tap.leftDiagonal,
  rightDiagonal: state.tap.rightDiagonal,
  activePageNo: state.activePage.activePageNo
});

const mapDispatchToProps = (dispatch) => ({
  setCalibrationData2: cali => setCalibrationData(cali),
  setLongPressPen2: e => setLongPressPen(e),
  setLongPressImpossible2: e => setLongPressImpossible(e),
  incrementTapCount2: () => incrementTapCount(),
  initializeTapCount2: () => initializeTapCount(),
  setFirstTap2: dot => setFirstTap(dot),
  setLeftDiagonal2: () => setLeftDiagonal(),
  setRightDiagonal2: () => setRightDiagonal(),
  initializeDiagonal2: () => initializeDiagonal(),
  setActivePageNo2: no => setActivePageNo(no)
});

export default connect(mapStateToProps, mapDispatchToProps)(PenBasedRenderer);

// export default PenBasedRenderer;