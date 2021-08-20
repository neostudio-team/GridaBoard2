import $ from 'jquery';
import { fabric } from 'fabric';

import RenderWorkerBase, { IRenderWorkerOption } from './RenderWorkerBase';

import { callstackDepth, drawPath, drawPath_arr, makeNPageIdStr, isSamePage, uuidv4, drawPath_chiselNip, isSameNcode } from 'nl-lib/common/util';
import { IBrushType, PenEventName } from 'nl-lib/common/enums';
import { IPoint, NeoStroke, NeoDot, IPageSOBP, INeoStrokeProps, StrokeStatus, ISize } from 'nl-lib/common/structures';
import { INeoSmartpen, IPenToViewerEvent } from 'nl-lib/common/neopen';
import { InkStorage } from 'nl-lib/common/penstorage';
import { PenManager } from 'nl-lib/neosmartpen';
import { adjustNoteItemMarginForFilm, getNPaperInfo, isPUI } from "nl-lib/common/noteserver";
import { MappingStorage } from 'nl-lib/common/mapper/MappingStorage';
import { calcRevH } from 'nl-lib/common/mapper/CoordinateTanslater';
import { applyTransform } from 'nl-lib/common/math/echelon/SolveTransform';
import { nullNcode, PlateNcode_1, PlateNcode_2 } from 'nl-lib/common/constants';

import GridaDoc from 'GridaBoard/GridaDoc';
import { setActivePageNo } from 'GridaBoard/store/reducers/activePageReducer';
import { store } from "GridaBoard/client/pages/GridaBoard";

const NUM_HOVER_POINTERS = 6;
const DFAULT_BRUSH_SIZE = 10;
const REMOVE_HOVER_POINTS_INTERVAL = 50; // 50ms
const REMOVE_HOVER_POINTS_WAIT = 20; // 20 * 50ms = 1sec

const STROKE_OBJECT_ID = 'ns';
// const GRID_OBJECT_ID = "g";

interface IPenHoverCursors {
  visibleHoverPoints: number;
  intervalHandle: number;
  waitCount: number;
  eraserLastPoint: IPoint;

  penTracker: fabric.Circle;
  hoverPoints: fabric.Circle[];
}

type IExtendedPathType = fabric.Path & {
  key?: string;
  color?;
};

export default class PenBasedRenderWorker extends RenderWorkerBase {
  localPathArray: IExtendedPathType[] = [];

  livePaths: { [key: string]: { stroke: NeoStroke; pathObj: IExtendedPathType } } = {};

  storage = InkStorage.getInstance();

  visibleHoverPoints: number = NUM_HOVER_POINTERS;

  // pathHoverPoints: fabric.Circle[] = [];
  penCursors: { [key: string]: IPenHoverCursors } = {};

  _vpPenDownTime = 0;
  brushSize = DFAULT_BRUSH_SIZE;
  currentPageInfo: IPageSOBP; //hover point에서만 임시로 씀
  /**
   *
   * @param options
   */
  constructor(options: IRenderWorkerOption) {
    super(options);

    this.name = 'PenBasedRenderWorker';

    const { storage } = options;
    if (storage !== undefined) {
      if (!(storage instanceof InkStorage)) {
        throw new Error('storage is not an instance of InkStorage');
      }
      this.storage = storage;
    }

    this.changeDrawCursor();

    const penManager = PenManager.getInstance();
    penManager.addEventListener(PenEventName.ON_COLOR_CHANGED, this.changeDrawCursor);
    penManager.addEventListener(PenEventName.ON_PEN_TYPE_CHANGED, this.changeDrawCursor);

    this.changePage(this.pageInfo, options.pageSize, true);
    console.log(`PAGE CHANGE (worker constructor):                             ${makeNPageIdStr(this.pageInfo as IPageSOBP)}`);

    // this.resize({ width: options.width, height: options.height });
  }

  prepareUnmount = () => {
    const penManager = PenManager.getInstance();
    penManager.removeEventListener(PenEventName.ON_COLOR_CHANGED, this.changeDrawCursor);
    penManager.removeEventListener(PenEventName.ON_PEN_TYPE_CHANGED, this.changeDrawCursor);
  };

  /**
   * Pen Down이 들어왔다. 그러나 아직 page 정보가 들어오지 않아서,
   * 이 페이지에 붙여야 할 것인가 아니면, 새로운 페이지에 붙여야 할 것인가를 모른다.
   *
   * 렌더러 처리 순서
   * 1) Pen Down: live stroke의 path를 생성
   * 2) Page Info: 페이지를 전환하고, 잉크 스토리지에 있는 이전의 스트로크를 path로 등록한다.
   *      2-1) 이 클래스를 new 하는 container에서 setPageStrokePath(strokes)를 불러줘야 한다.
   * 3) Pen Move:
   *      3-1) live stroke path의 처음 나오는 점이면, path를 canvas에 등록한다.
   *      3-2) 두번째 점부터는 path에 append 한다.
   * 4) Pen Up: Live stroke path는 없애고, 잉크스토리지에 2) 이후의 stroke를 받아 path에 추가 등록한다.
   *
   *
   * 조심해야 할 것은, 위의 2의 처리를 container가 담당하고 있는데, 2에 앞서서 3이 처리되면
   * 이전의 페이지에 획이 추가되고, 2-1에 의해 clear되어 버린다. 순서에 유의할 것
   *
   * @public
   * @param {{strokeKey:string, mac:string, time:number, stroke:NeoStroke}} event
   */

  changeDrawCursor = () => {
    this.canvasFb.hoverCursor = `url(${this.getDrawCursor()}) ${this.brushSize / 2} ${this.brushSize / 2}, crosshair`;
  };
  getDrawCursor = () => {
    const penManager = PenManager.getInstance();

    const color = penManager.color;
    const pen_colors = penManager.pen_colors;
    const foundIdx = pen_colors.findIndex(ele => ele === color);
    const penType = penManager.penRendererType;
    
    let cursor = "";

    switch (penType) {
      case IBrushType.PEN: {
        const brushColor = penManager.pen_colors[foundIdx]
        cursor = `
          <svg
            height="${this.brushSize}"
            fill="${brushColor}"
            viewBox="0 0 ${this.brushSize * 2} ${this.brushSize * 2}"
            width="${this.brushSize}"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="50%"
              cy="50%"
              r="${this.brushSize}"
            />
          </svg>
        `;
        break;
      }
      case IBrushType.MARKER: {
        const brushColor = penManager.marker_colors[foundIdx]
        cursor = `
          <svg
            height="${this.brushSize}"
            fill="${brushColor}"
            viewBox="0 0 ${this.brushSize * 2} ${this.brushSize * 2}"
            width="${this.brushSize}"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="50%"
              cy="50%"
              r="${this.brushSize}"
            />
          </svg>
        `;
        break;
      }
      case IBrushType.ERASER: {
        cursor = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" width="1.3em" height="1.3em" style="-ms-transform: rotate(90deg); -webkit-transform: rotate(90deg); transform: rotate(90deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 20 20"><g fill="none"><path d="M11.197 2.44a1.5 1.5 0 0 1 2.121 0l4.243 4.242a1.5 1.5 0 0 1 0 2.121L9.364 17H14.5a.5.5 0 0 1 0 1H7.82a1.496 1.496 0 0 1-1.14-.437L2.437 13.32a1.5 1.5 0 0 1 0-2.121l8.76-8.76zm1.414.706a.5.5 0 0 0-.707 0L5.538 9.512l4.95 4.95l6.366-6.366a.5.5 0 0 0 0-.707L12.61 3.146zM9.781 15.17l-4.95-4.95l-1.687 1.687a.5.5 0 0 0 0 .707l4.243 4.243a.5.5 0 0 0 .707 0l1.687-1.687z" fill="#626262"/></g><rect x="0" y="0" width="100" height="100" fill="rgba(0, 0, 0, 0)" /></svg>`
        //https://iconify.design/icon-sets/?query=eraser
        break;
      }
      default: break;
    } 

    return `data:image/svg+xml;base64,${window.btoa(cursor)}`;
  };

  createLiveStroke = (event: IPenToViewerEvent) => {
    // console.log(`Stroke created = ${event.strokeKey}`);
    this.livePaths[event.strokeKey] = {
      stroke: event.stroke,
      pathObj: null,
    };
  };

  registerPageInfoForPlate = (event: IPenToViewerEvent) => {
    const pageInfo = {section: event.section, owner: event.owner, book: event.book, page: event.page};
    this.currentPageInfo = pageInfo; 
  }

  createLiveStroke_byStorage = (event: IPenToViewerEvent) => {
    this.createLiveStroke(event);
  };

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke:NeoStroke, dot:NeoDot}} event
   */
  pushLiveDot = (event: IPenToViewerEvent, rotation: number) => {
    const activePageNo = store.getState().activePage.activePageNo; 
    if (activePageNo === -1) { //페이지가 생성 안된 시점에 필름에 펜을 쓸 경우를 위함. 기획 논의 필요
      return;
    }

    const {section, owner, book, page} = event.event;
    const pageInfo = {section, owner, book, page};

    //pen tracker rendering
    this.movePenTracker(event, pageInfo);

    let live = this.livePaths[event.strokeKey];
    if (!live) {
      console.error('왜 live stroke가 등록 안된게 나오지?');

      live = {
        stroke: event.stroke,
        pathObj: null,
      };
      this.livePaths[event.strokeKey] = live;
    }

    let isPlate = false;
    if (isSamePage(PlateNcode_1, pageInfo) || isSamePage(PlateNcode_2, pageInfo)) {
      isPlate = true;
    }

    const dot = event.dot;


    let pt;
    if (!isPlate && !isSamePage(pageInfo, nullNcode())) {
        pt = this.ncodeToPdfXy(dot);
    } else if (isPlate) { //플레이트일 경우
        pt = this.ncodeToPdfXy_plate(dot, pageInfo);
    }
    dot.point = pt;

    //지우개 구현
    const pen = event.pen;

    const cursor = this.penCursors[event.mac];
    if (pen && pen.penRendererType === IBrushType.ERASER) {
      if (cursor.eraserLastPoint !== undefined) {
        this.eraseOnLine(cursor.eraserLastPoint.x, cursor.eraserLastPoint.y, dot.point.x, dot.point.y, live.stroke, isPlate);
      }
      cursor.eraserLastPoint = { x: dot.point.x, y: dot.point.y };
    } else {
      if (!live.pathObj) {
        const new_pathObj = this.createFabricPath(live.stroke, false, pageInfo);
        live.pathObj = new_pathObj as IExtendedPathType;
        this.canvasFb.add(new_pathObj);
      } else {
        const pathData = this.createPathData_arr(live.stroke, pageInfo);
        const pathObj = live.pathObj as fabric.Path;
        pathObj.path = pathData as any;
      }
      this.focusToDot(dot);
    }
  };

  // pushLiveDot_byStorage = (event: IPenToViewerEvent) => {
  //   let live = this.livePaths[event.strokeKey];
  //   if (!live) {
  //     console.error('왜 live stroke가 등록 안된게 나오지?');

  //     live = {
  //       stroke: event.stroke,
  //       pathObj: null,
  //     };
  //     this.livePaths[event.strokeKey] = live;
  //   }
  //   const dot = event.dot;

  //   //지우개 구현
  //   const canvas_xy = this.ncodeToPdfXy(dot);
  //   if (!live.pathObj) {
  //     const new_pathObj = this.createFabricPath(live.stroke, false);
  //     live.pathObj = new_pathObj as IExtendedPathType;
  //     this.canvasFb.add(new_pathObj);
  //   } else {
  //     const pathData = this.createPathData_arr(live.stroke);
  //     const pathObj = live.pathObj as fabric.Path;
  //     pathObj.path = pathData as any;
  //   }

  //   this.focusToDot(dot);
  // };

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke, section:number, owner:number, book:number, page:number}} event
   */
  closeLiveStroke = (event: IPenToViewerEvent) => {
    const cursor = this.penCursors[event.mac];
    cursor.eraserLastPoint = undefined;

    const obj = cursor.penTracker;
    obj.visible = false;

    obj.set({ left: -100, top: -100 });
    obj.setCoords();
    this.canvasFb.renderAll();

    const live = this.livePaths[event.strokeKey];

    if (!live || live.pathObj === undefined) {
      console.log(`undefined path`);
    }

    const pathObj = live.pathObj;

    if (pathObj) {
      this.localPathArray.push(pathObj);
    }

    delete this.livePaths[event.strokeKey];
  };

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke, section:number, owner:number, book:number, page:number}} event
   */
  closeLiveStroke_byStorage = (event: IPenToViewerEvent, pageInfo: IPageSOBP) => {
    const new_pathObj = this.createFabricPath(event.stroke, false, pageInfo) as IExtendedPathType;

    this.canvasFb.add(new_pathObj);
    this.localPathArray.push(new_pathObj);
  };

  eraseOnLine(pdf_x0, pdf_y0, pdf_x1, pdf_y1, stroke, isPlate) {
    const { section, owner, book, page } = stroke;
    let pageInfo = {
      section: section,
      book: book,
      owner: owner,
      page: page,
    };

    const eraserLine = {
      x0_pu: pdf_x0,
      y0_pu: pdf_y0,
      x1_pu: pdf_x1,
      y1_pu: pdf_y1,
    };

    for (let i = 0; i < this.localPathArray.length; i++) {
      const fabricPath = this.localPathArray[i];
      const pathDataStr = fabricPath.path.join();

      let needThumbnailRedraw = false;

      if (this.storage.collisionTest(pathDataStr, eraserLine)) {
        this.canvasFb.remove(fabricPath);
        needThumbnailRedraw = true;

        const activePageNo = store.getState().activePage.activePageNo;
        const docPageInfo = GridaDoc.getInstance().getPage(activePageNo).pageInfos[0];
        if (isPlate) {
          pageInfo = docPageInfo;
        }

        const pageId = InkStorage.makeNPageIdStr(pageInfo);
        const completed = this.storage.completedOnPage.get(pageId);
        const idx = completed.findIndex(ns => ns.key === fabricPath.key);
        completed.splice(idx, 1);

        if (needThumbnailRedraw) {
          this.storage.dispatcher.dispatch(PenEventName.ON_ERASER_MOVE, {
            section: pageInfo.section,
            owner: pageInfo.owner,
            book: pageInfo.book,
            page: pageInfo.page,
          });
        }
      }
    }
  }

  createHoverCursor = (pen: INeoSmartpen) => {
    const mac = pen.mac;

    if (!Object.prototype.hasOwnProperty.call(this.penCursors, mac)) {
      for (let i = 0; i < NUM_HOVER_POINTERS; i++) {
        const hoverPoint = new fabric.Circle({
          radius: NUM_HOVER_POINTERS/2 - i/2,
          fill: '#ff2222',
          stroke: '#ff2222',
          opacity: (NUM_HOVER_POINTERS - i) / NUM_HOVER_POINTERS / 3,
          left: -30,
          top: -30,
          hasControls: false,
          dirty: true,
          name: 'hoverPoint',
          data: 'hps',
        });

        this.canvasFb.add(hoverPoint);
      }

      const penTracker = new fabric.Circle({
        left: -30,
        top: -30,
        radius: 5,
        opacity: 0.3,
        fill: '#7a7aff',
        stroke: '#7a7aff',
        dirty: true,
        name: 'penTracker',
        data: 'pt',
      });

      this.canvasFb.add(penTracker);
      const objects = this.canvasFb.getObjects();
      const hoverPointsObj = objects.filter(obj => obj.data === 'hps');
      const penTrackerObj = objects.filter(obj => obj.data === 'pt');

      this.penCursors[mac] = {
        visibleHoverPoints: NUM_HOVER_POINTERS,
        intervalHandle: 0,
        waitCount: 0,
        eraserLastPoint: undefined,
        penTracker: penTrackerObj[penTrackerObj.length-1] as fabric.Circle,
        hoverPoints: hoverPointsObj as fabric.Circle[],
      };
    }
  };

  removeHoverCursor = (pen: INeoSmartpen) => {
    const mac = pen.mac;

    if (Object.prototype.hasOwnProperty.call(this.penCursors, mac)) {
      const cursors = this.penCursors[mac];
      this.canvasFb.remove(cursors.penTracker);

      for (let i = 0; i < cursors.hoverPoints.length; i++) {
        const path = cursors.hoverPoints[i];
        this.canvasFb.remove(path);
        cursors.hoverPoints[i] = undefined;
      }
      delete this.penCursors[mac];
    }
  };

  
  ncodeToPdfXy_plate = (dot: {x, y, f?}, pageInfo: IPageSOBP) => {
    const noteItem = getNPaperInfo(pageInfo); //plate의 item
    adjustNoteItemMarginForFilm(noteItem, pageInfo);

    const currentPage = GridaDoc.getInstance().getPage(store.getState().activePage.activePageNo);

    const npaperWidth = noteItem.margin.Xmax - noteItem.margin.Xmin;
    const npaperHeight = noteItem.margin.Ymax - noteItem.margin.Ymin;

    const pageWidth = currentPage.pageOverview.sizePu.width;
    const pageHeight =currentPage.pageOverview.sizePu.height;

    const wRatio = pageWidth / npaperWidth;
    const hRatio = pageHeight / npaperHeight;
    let platePdfRatio = wRatio
    if (hRatio > wRatio) platePdfRatio = hRatio

    const pdf_x = dot.x * platePdfRatio;
    const pdf_y = dot.y * platePdfRatio;

    return {x: pdf_x, y: pdf_y, f: dot.f};
  }

  movePenTracker = (event: IPenToViewerEvent, pageInfo: IPageSOBP) => {
    const cursor = this.penCursors[event.mac];
    if (!cursor) {
      console.log(`ERROR: pen cursor has not been initiated`);
      return;
    }

    let isPlate = false;
    if (isSamePage(PlateNcode_1, pageInfo) || isSamePage(PlateNcode_2, pageInfo)) {
      isPlate = true;
    }

    const dot = event.dot;

    if (isPUI(pageInfo) || isSamePage(pageInfo, nullNcode())) {
      return;
    }
    
    let pdf_xy;
    if (!isPlate) {
      pdf_xy = this.funcNcodeToPdfXy(dot);
    } else if (isPlate) { //플레이트일 경우
      pdf_xy = this.ncodeToPdfXy_plate(dot, pageInfo);
    }

    const obj = cursor.penTracker;
    obj.visible = true;

    const radius = obj.radius;
    obj.set({ left: pdf_xy.x - radius, top: pdf_xy.y - radius });
    obj.setCoords();

    const hps = cursor.hoverPoints;
    for (let i = 0; i < cursor.visibleHoverPoints; i++) {
      const r = hps[i].radius;
      hps[i].set({ left: pdf_xy.x - r, top: pdf_xy.y - r });
      hps[i].visible = false;
    }
    this.canvasFb.requestRenderAll();

    if (cursor.intervalHandle) {
      clearInterval(cursor.intervalHandle);
      cursor.intervalHandle = 0;
    }
  };

  moveHoverPoint = (e: IPenToViewerEvent) => {
    const activePageNo = store.getState().activePage.activePageNo; 
    if (activePageNo === -1) { //페이지가 생성 안된 시점에 필름에 펜을 쓸 경우를 위함. 기획 논의 필요
      return;
    }
    const cursor = this.penCursors[e.mac];
    if (!cursor) {
      console.log(`ERROR: pen cursor has not been initiated`);
      return;
    }

    const hps = cursor.hoverPoints;
    const isPointerVisible = $('#btn_tracepoint').find('.c2').hasClass('checked');

    const dot = { x: e.event.x, y: e.event.y };

    let isPlate = false;
    if (isSamePage(PlateNcode_1, this.currentPageInfo) || isSamePage(PlateNcode_2, this.currentPageInfo)) {
      isPlate = true;
    }

    if (this.currentPageInfo !== undefined && (isPUI(this.currentPageInfo) || isSamePage(this.pageInfo, nullNcode()))) {
      return;
    } 

    let pdf_xy;
    if (!isPlate) {
      pdf_xy = this.funcNcodeToPdfXy(dot);
    } else {
      pdf_xy = this.ncodeToPdfXy_plate(dot, this.currentPageInfo);
    }

    // hover point를 쉬프트해서 옮겨 놓는다
    for (let i = NUM_HOVER_POINTERS - 1; i > 0; i--) {
      hps[i].set({ left: hps[i - 1].left, top: hps[i - 1].top });
      hps[i].setCoords();
    }

    const r = hps[0].radius;
    hps[0].set({ left: pdf_xy.x - r, top: pdf_xy.y - r });
    hps[0].setCoords();

    cursor.visibleHoverPoints = NUM_HOVER_POINTERS;
    for (let i = 0; i < cursor.visibleHoverPoints; i++) {
      hps[i].visible = isPointerVisible;
    }
    this.canvasFb.requestRenderAll();

    if (cursor.intervalHandle) {
      clearInterval(cursor.intervalHandle);
      cursor.intervalHandle = 0;
    }
    cursor.waitCount = 0;
    const self = this;

    cursor.intervalHandle = window.setInterval(() => {
      const cursor = this.penCursors[e.mac];
      if (!cursor) {
        console.log(`ERROR: pen cursor has not been initiated`);
        clearInterval(cursor.intervalHandle);
        return;
      }
      const hps = cursor.hoverPoints;

      cursor.waitCount++;
      // 1초 뒤
      if (cursor.waitCount > 20) {
        for (let i = NUM_HOVER_POINTERS - 1; i > 0; i--) {
          hps[i].left = hps[i - 1].left;
          hps[i].top = hps[i - 1].top;
        }
        hps[0].left = -30;
        hps[0].top = -30;

        cursor.visibleHoverPoints--;
        if (cursor.visibleHoverPoints >= 0) {
          hps[cursor.visibleHoverPoints].visible = false;
          self.canvasFb.requestRenderAll();
        } else {
          clearInterval(cursor.intervalHandle);
        }
      }
    }, REMOVE_HOVER_POINTS_INTERVAL);
  };

  redrawStrokes = (pageInfo) => {
    if (isSamePage(this.pageInfo, pageInfo) || this.pageInfo === undefined) {
      this.removeAllCanvasObject();
      this.resetLocalPathArray();
      this.resetPageDependentData();

      const strokesAll = this.storage.getPageStrokes(pageInfo);
      const strokes = strokesAll.filter(stroke => stroke.brushType !== IBrushType.ERASER);

      this.addStrokePaths(strokes);
    }
  };

  rotate = (pageInfo) => {
    const ins = InkStorage.getInstance();
    const pageId = InkStorage.makeNPageIdStr(pageInfo);
    const strokeArr = ins.completedOnPage.get(pageId);
    if (strokeArr === undefined) return;
    strokeArr.forEach(stroke => { 
      stroke.h = this._opt.h;
    })
  };

  changePage = (pageInfo: IPageSOBP, pageSize: ISize, forceToRefresh: boolean): boolean => {
    if (!pageInfo) return;

    this.pageInfo = { ...pageInfo };

    const pdfSize = {
      width: Math.round(pageSize.width),
      height: Math.round(pageSize.height),
    };

    if (pdfSize.width === 0 || pdfSize.height === 0) return;

    console.log(`VIEW SIZE`);
    console.log(
      `VIEW SIZE${callstackDepth()} changePage (worker):   ${pdfSize?.width}, ${pdfSize?.height}        ${makeNPageIdStr(pageInfo)}`
    );

    const transform = MappingStorage.getInstance().getNPageTransform(pageInfo);
    const h_rev = calcRevH(transform.h);
    const leftTop_nu = applyTransform({ x: 0, y: 0 }, h_rev);
    this.paperBase = { Xmin: leftTop_nu.x, Ymin: leftTop_nu.y };

    // 현재 모든 stroke를 지운다.
    this.removeAllCanvasObject();
    this.resetLocalPathArray();
    this.resetPageDependentData();

    // grid를 그려준다
    this.onPageSizeChanged(pdfSize);
    // this.drawPageLayout();

    // page에 있는 stroke를 가져온다
    const strokesAll = this.storage.getPageStrokes(pageInfo);
    const strokes = strokesAll.filter(stroke => stroke.brushType !== IBrushType.ERASER);

    //test
    // const testStroke = this.generateA4CornerStrokeForTest(pageInfo);
    // strokes.push(testStroke);

    // 페이지의 stroke를 fabric.Path로 바꾼다.
    this.addStrokePaths(strokes);

    // page refresh
    this.canvasFb.requestRenderAll();

    return true;
  };

  changePage_byStorage = (pageInfo: IPageSOBP, pdfSize: ISize, forceToRefresh: boolean) => {
    return this.changePage(pageInfo, pdfSize, forceToRefresh);
  };

  private generateDotForTest(x: number, y: number): NeoDot {
    const dot = new NeoDot({
      dotType: 2, // moving
      deltaTime: 2,
      time: 0,
      f: 255,
      x,
      y,
    });

    return dot;
  }

  private generateA4CornerStrokeForTest(pageInfo: IPageSOBP): NeoStroke {
    // for debug
    const { section, owner, book, page } = pageInfo;
    const strokeArg: INeoStrokeProps = {
      section,
      owner,
      book,
      page,
      startTime: 0,
      mac: '00:00:00:00:00:00',
      color: 'rgba(0,0,255,255)',
      brushType: IBrushType.PEN,
      thickness: 1,
      status: StrokeStatus.NORMAL,
      h: this._opt.h,
      h_origin: this._opt.h_origin,
    };
    const defaultStroke = new NeoStroke(strokeArg);

    let dot: NeoDot;

    const dot0 = this.generateDotForTest(0, 0);
    defaultStroke.addDot(dot0);

    dot = this.generateDotForTest(88.56, 0);
    defaultStroke.addDot(dot);
    defaultStroke.addDot(dot);

    dot = this.generateDotForTest(88.56, 125.24);
    defaultStroke.addDot(dot);
    defaultStroke.addDot(dot);

    dot = this.generateDotForTest(0, 125.24);
    defaultStroke.addDot(dot);
    defaultStroke.addDot(dot);

    dot = this.generateDotForTest(0, 0);
    defaultStroke.addDot(dot);

    return defaultStroke;
  }

  /**
   * @private
   */
  resetLocalPathArray = () => {
    this.localPathArray = new Array(0);
  };

  resetPageDependentData = () => {
    Object.keys(this.penCursors).forEach(key => {
      const cursor = this.penCursors[key];
      cursor.eraserLastPoint = undefined;
    });
  };

  /**
   * @private
   */
  removeAllPaths = () => {
    if (!this.canvasFb) return;
    this.localPathArray.forEach(path => {
      this.canvasFb.remove(path);
    });

    this.localPathArray = new Array(0);
  };

  /**
   * @private
   */
  removeAllStrokeObject = () => {
    if (this.canvasFb) {
      const objects = this.canvasFb.getObjects();
      const strokes = objects.filter(obj => obj.data === STROKE_OBJECT_ID);

      strokes.forEach(path => {
        this.canvasFb.remove(path);
      });
    }
  };

  removeAllCanvasObject = () => {
    if (this.canvasFb) {
      const objects = this.canvasFb.getObjects();
      const needToClear = objects.filter(obj => obj.data !== 'hps' && obj.data !== 'pt' && obj.name !== 'page_layout');

      this.canvasFb.remove(...needToClear);

      // this.canvasFb.clear();
    }
  };

  /**
   * @private
   * @param {Array<NeoStroke>} strokes
   */
  addStrokePaths = (strokes) => {
    if (!this.canvasFb) return;

    strokes.forEach(stroke => {
      if (stroke.dotArray.length > 0) {
        const path = this.createFabricPathByStorage(stroke, true) as IExtendedPathType;
        this.canvasFb.add(path);
        this.localPathArray.push(path);
      }
    });
  };

  createPathData_arr = (stroke: NeoStroke, pageInfo?: IPageSOBP) => {
    const { dotArray, brushType, thickness } = stroke;
    const pointArray = [];
    
    let isPlate = false;
    if (isSamePage(PlateNcode_1, pageInfo) || isSamePage(PlateNcode_2, pageInfo)) {
      isPlate = true;
    }

    dotArray.forEach(dot => {
      pointArray.push(dot.point);
    });

    let strokeThickness = thickness / 64;
    switch (brushType) {
      case 1:
        strokeThickness *= 5;
        break; 
      default:
        break;
    }

    const pathData_arr = drawPath_arr(pointArray, strokeThickness);

    return pathData_arr;
  };

  createPathDataByStorage = (stroke: NeoStroke) => {
    const { dotArray, brushType, thickness } = stroke;

    const pointArray = [];

    dotArray.forEach(dot => {
      pointArray.push(dot.point);
    });

    let strokeThickness = thickness / 64;
    switch (brushType) {
      case 1:
        strokeThickness *= 5;
        break;
      default:
        break;
    }

    const pathData = drawPath(pointArray, strokeThickness);

    return pathData;
  };

  createPathData = (stroke: NeoStroke, pageInfo: IPageSOBP) => {
    const { dotArray, brushType, thickness } = stroke;

    const pointArray = [];
    dotArray.forEach(dot => {
      pointArray.push(dot.point);
    });
      
    let strokeThickness = thickness / 64;
    switch (brushType) {
      case 1:
        strokeThickness *= 5;
        break;
      default:
        break;
    }

    const pathData = drawPath(pointArray, strokeThickness);

    return pathData;
  };

  createFabricPathByStorage = (stroke: NeoStroke, cache: boolean) => {
    const { color, brushType, key } = stroke;
    const pathData = this.createPathDataByStorage(stroke);

    let opacity = 0;
    switch (brushType) {
      case 0:
        opacity = 1;
        break;
      case 1:
        opacity = 0.3;
        break;
      case 3:
        opacity = 0;
        break;
      default:
        opacity = 1;
        break;
    }

    const pathOption = {
      // stroke: color, //"rgba(0,0,0,255)"
      fill: color,
      color: color,
      opacity: opacity,
      // strokeWidth: 10,
      originX: 'left',
      originY: 'top',
      selectable: false,

      data: STROKE_OBJECT_ID, // neostroke
      evented: true,
      key: key,
      objectCaching: cache,
    };
    const path = new fabric.Path(pathData, pathOption);

    return path;
  };

  createFabricPath = (stroke: NeoStroke, cache: boolean, pageInfo: IPageSOBP) => {
    const { color, brushType, key } = stroke;
    const pathData = this.createPathData(stroke, pageInfo);

    let opacity = 0;
    switch (brushType) {
      case 0:
        opacity = 1;
        break;
      case 1:
        opacity = 0.3;
        break;
      case 3:
        opacity = 0;
        break;
      default:
        opacity = 1;
        break;
    }

    const pathOption = {
      // stroke: color, //"rgba(0,0,0,255)"
      fill: color,
      color: color,
      opacity: opacity,
      // strokeWidth: 10,
      originX: 'left',
      originY: 'top',
      selectable: false,

      data: STROKE_OBJECT_ID, // neostroke
      evented: true,
      key: key,
      objectCaching: cache,
    };
    const path = new fabric.Path(pathData, pathOption);

    return path;
  };

  /**
   * 아래는 마우스로 그림을 그리는 곳 (Pen down)
   * WorkerBase의 abstract 함수를 참조
   *
   * 2021/01/12 PointerEvent도 처리할 수 있도록 추가해야 함
   */
  onTouchStrokePenDown = async (event: MouseEvent) => {
    // const screen_xy = { x: event.clientX, y: event.clientY };

    // const pdf_xy = this.screenToPdfXy(screen_xy);
    // const ncode_xy = this.pdfToNcodeXy(pdf_xy);
    const vp = PenManager.getInstance().virtualPen;

    const timeStamp = Date.now();
    this._vpPenDownTime = timeStamp;
    vp.onPenDown({ timeStamp, penTipMode: 0, penId: vp.mac });

    if (this.pageInfo === undefined) {
      const pageNo = await GridaDoc.getInstance().addBlankPage();
      setActivePageNo(pageNo);
    }
    const { section, owner, book, page } = this.pageInfo;
    vp.onPageInfo({ timeStamp, section, owner, book, page }, false);
  };

  /**
   * 아래는 마우스로 그림을 그리는 곳 (Pen move)
   * WorkerBase의 abstract 함수를 참조
   *
   * 2021/01/12 PointerEvent도 처리할 수 있도록 추가해야 함
   */
  onTouchStrokePenMove = (event: MouseEvent, canvasXy: { x: number, y: number }, force: number) => {
    // const mouse_xy = { x: event.layerX, y: event.layerY };
    // const pdf_xy = this.layerToPdfXy(mouse_xy);
    const ncode_xy = this.pdfToNcodeXy(canvasXy);
    // const _xy = (obj, f=10) => `${Math.floor(obj.x * f) },${Math.floor(obj.y * f) }`;
    // console.warn(`mouse(${_xy(mouse_xy)}) => pdf_xy(${_xy(pdf_xy)}) => ncode_xy(${_xy(ncode_xy, 10)})`);

    const vp = PenManager.getInstance().virtualPen;
    const timeStamp = Date.now();
    const timediff = timeStamp - this._vpPenDownTime;
    const { section, owner, book, page } = this.pageInfo;

    // const DEFAULT_MOUSE_PEN_FORCE = 512;

    vp.onPenMove({
      timeStamp,
      timediff,
      section,
      owner,
      book,
      page,
      ...ncode_xy,
      force: force,
      isFirstDot: false,
    });
  };

  /**
   * 아래는 마우스로 그림을 그리는 곳 (Pen up)
   * WorkerBase의 abstract 함수를 참조
   *
   * 2021/01/12 PointerEvent도 처리할 수 있도록 추가해야 함
   */
  onTouchStrokePenUp = (event: MouseEvent) => {
    const vp = PenManager.getInstance().virtualPen;
    const timeStamp = Date.now();

    vp.onPenUp({ timeStamp });
  };

  onViewSizeChanged = (viewSize: { width: number; height: number }) => {
    this._opt.viewSize = { ...viewSize };
    // console.log(`VIEW SIZE${callstackDepth()} onViewSizeChanged ${this.logCnt++}: ${viewSize.width}, ${viewSize.height}`);

    const zoom = this.calcScaleFactor(this._opt.viewFit, this.offset.zoom);
    this.drawPageLayout();
    this.scrollBoundaryCheck();

    this.zoomToPoint(undefined, zoom);
  };

  onPageSizeChanged = (pageSize: { width: number; height: number }) => {
    this._opt.pageSize = { ...pageSize };
    if (this.pageInfo === undefined || this.pageInfo.section === undefined) return false;

    console.log(
      `VIEW SIZE${callstackDepth()} onPageSizeChanged ${makeNPageIdStr(this.pageInfo)}: ${pageSize.width}, ${pageSize.height} = ${pageSize.width / pageSize.height
      }`
    );
    const zoom = this.calcScaleFactor(this._opt.viewFit, this.offset.zoom);
    this.drawPageLayout();
    this.scrollBoundaryCheck();
    this.zoomToPoint(undefined, zoom);

    // this.onViewSizeChanged(this._opt.viewSize);
    return true;
  };
}
