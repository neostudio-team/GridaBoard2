import $ from 'jquery';
import { fabric } from 'fabric';

import RenderWorkerBase, { IRenderWorkerOption } from './RenderWorkerBase';

import { callstackDepth, drawPath, drawPath_arr, makeNPageIdStr, isSamePage,isPlatePage, uuidv4, drawPath_chiselNip, isSameNcode } from 'nl-lib/common/util';
import { IBrushType, PenEventName } from 'nl-lib/common/enums';
import { IPoint, NeoStroke, NeoDot, IPageSOBP, INeoStrokeProps, StrokeStatus, ISize, TransformParameters } from 'nl-lib/common/structures';
import { INeoSmartpen, IPenToViewerEvent } from 'nl-lib/common/neopen';
import { InkStorage } from 'nl-lib/common/penstorage';
import { PenManager } from 'nl-lib/neosmartpen';
import { adjustNoteItemMarginForFilm, getNPaperInfo, isPUI } from "nl-lib/common/noteserver";
import { MappingStorage } from 'nl-lib/common/mapper/MappingStorage';
import { calcRevH } from 'nl-lib/common/mapper/CoordinateTanslater';
import { applyTransform } from 'nl-lib/common/math/echelon/SolveTransform';
import { nullNcode, PU_TO_NU } from 'nl-lib/common/constants';

import GridaDoc from 'GridaBoard/GridaDoc';
import { setActivePageNo } from 'GridaBoard/store/reducers/activePageReducer';
import { store } from "GridaBoard/client/pages/GridaBoard";
import { setLassoModalPoint, setOnLassoGroup, setOnLassoShift } from '../../../GridaBoard/store/reducers/docConfigReducer';
import { Height } from '@material-ui/icons';
const NUM_HOVER_POINTERS = 6;
const DFAULT_BRUSH_SIZE = 10;
const REMOVE_HOVER_POINTS_INTERVAL = 50; // 50ms
const REMOVE_HOVER_POINTS_WAIT = 20; // 20 * 50ms = 1sec

const STROKE_OBJECT_ID = 'ns';
// const GRID_OBJECT_ID = "g";
const LASSO_OBJECT_ID = "lasso";
const LASSO_GROUP_ID = "lassoGroup"

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
  onLassoGroup: boolean;
  onLassoShift: boolean;
  onLassoMovingByPen: boolean;
  lassoShiftPoint: { x: number, y: number, pointX: number, pointY: number };

  f;
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

    this.onLassoGroup = false;
    // this.onLassoShift = false;
    this.onLassoMovingByPen = false;

    this.changePage(this.pageInfo, options.pageSize, true);
    console.log(`PAGE CHANGE (worker constructor):                             ${makeNPageIdStr(this.pageInfo as IPageSOBP)}`);

    // this.resize({ width: options.width, height: options.height });

    this.f = 0;
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
      case IBrushType.LASSO: {
        cursor = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="currentColor" d="M9.703 2.265A10.026 10.026 0 0 1 12 2c.79 0 1.559.092 2.297.265a1 1 0 0 1-.458 1.947A8.025 8.025 0 0 0 12 4c-.634 0-1.25.074-1.84.212a1 1 0 1 1-.457-1.947Zm6.18 1.552a1 1 0 0 1 1.376-.324a10.047 10.047 0 0 1 3.248 3.248a1 1 0 1 1-1.7 1.053a8.046 8.046 0 0 0-2.6-2.6a1 1 0 0 1-.325-1.377Zm-7.766 0a1 1 0 0 1-.323 1.376a8.047 8.047 0 0 0-2.6 2.6a1 1 0 1 1-1.7-1.052A10.047 10.047 0 0 1 6.74 3.493a1 1 0 0 1 1.376.324Zm-4.65 5.141a1 1 0 0 1 .745 1.203A8.025 8.025 0 0 0 4 12c0 .634.074 1.25.212 1.84a1 1 0 0 1-1.947.457A10.026 10.026 0 0 1 2 12c0-.79.092-1.559.265-2.297a1 1 0 0 1 1.203-.745Zm17.065 0a1 1 0 0 1 1.203.745a10.068 10.068 0 0 1 0 4.594a1 1 0 0 1-1.947-.458a8.062 8.062 0 0 0 0-3.679a1 1 0 0 1 .744-1.202ZM3.817 15.883a1 1 0 0 1 1.376.323a8.046 8.046 0 0 0 2.6 2.6a1 1 0 0 1-1.052 1.7a10.046 10.046 0 0 1-3.248-3.247a1 1 0 0 1 .324-1.377Zm16.805 1.607a1 1 0 0 0-1.742-.983v.001l-.001.001l-.013.021a6.74 6.74 0 0 1-.338.495a8.41 8.41 0 0 1-.74.857C16.598 16.869 14.995 16 13 16c-2.267 0-4 1.2-4 3s1.733 3 4 3c1.91 0 3.459-.634 4.64-1.415a10.979 10.979 0 0 1 1.118 1.67l.07.136l.015.031l.003.005a1 1 0 0 0 1.809-.853c-.117-.231 0-.001 0-.001l-.002-.002l-.002-.006l-.008-.016a2.82 2.82 0 0 0-.015-.03l-.011-.022a11.486 11.486 0 0 0-.452-.803a12.974 12.974 0 0 0-.981-1.379c.4-.401.714-.783.944-1.09a8.788 8.788 0 0 0 .453-.666c.012-.018.02-.034.027-.045l.009-.015l.003-.005v-.002l.002-.002ZM13 18c1.226 0 2.286.476 3.169 1.145a6.268 6.268 0 0 1-3.17.855C11.268 20 11 19.2 11 19c0-.2.267-1 2-1Z"/></svg>`
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
    // const onLassoGroup = store.getState().docConfig.onLassoGroup;
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
    if (isPlatePage(pageInfo)) {
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
        // 문제점: 스트로크가 빠르게 움직이먄 지우개가 제대로 동작하지 않음. -> 빠르게 움직이면 eraserLastPoint와 dot.point의 값이 같게 들어오는데 이를 잡지 못하는 듯
        if (Math.abs(cursor.eraserLastPoint.x - dot.point.x) > 0.1 && Math.abs(cursor.eraserLastPoint.y - dot.point.y) > 0.1) {
          this.eraseOnLine(cursor.eraserLastPoint.x, cursor.eraserLastPoint.y, dot.point.x, dot.point.y, live.stroke, isPlate);
        }
      }
      cursor.eraserLastPoint = { x: dot.point.x, y: dot.point.y };
    } else {
      if (!live.pathObj) {
        const new_pathObj = this.createFabricPath(live.stroke, false, pageInfo);
        live.pathObj = new_pathObj as IExtendedPathType;
        if(this.onLassoGroup){
        // if(onLassoGroup){
          if(!this.lassoGroupBoundCheck(event)){
            this.canvasFb.add(new_pathObj);
          }
        }else{
          this.canvasFb.add(new_pathObj);
        }
      } else {
        const pathData = this.createPathData_arr(live.stroke, pageInfo);
        const pathObj = live.pathObj as fabric.Path;
        pathObj.path = pathData as any;
        this.f++;
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
    // const onLassoGroup = store.getState().docConfig.onLassoGroup;
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
      if(event.stroke.brushType === IBrushType.LASSO){
        if(!this.onLassoGroup){
        // if(!onLassoGroup){
          const new_pathObj = this.createFabricPath(event.stroke, false, this.pageInfo) as IExtendedPathType;
          this.activePathbyLasso(new_pathObj);
          this.localPathArray.push(pathObj);
        }
      }else{
        this.localPathArray.push(pathObj);
      }
    }

    delete this.livePaths[event.strokeKey];
  };

  /**
   *
   * @param {{strokeKey:string, mac:string, stroke, section:number, owner:number, book:number, page:number}} event
   */
  closeLiveStroke_byStorage = (event: IPenToViewerEvent, pageInfo: IPageSOBP) => {
    const new_pathObj = this.createFabricPath(event.stroke, false, pageInfo) as IExtendedPathType;
    // const onLassoGroup = store.getState().docConfig.onLassoGroup;

    if(event.stroke.brushType === IBrushType.LASSO){
      if(!this.onLassoGroup){
      // if(!onLassoGroup){
        this.activePathbyLasso(new_pathObj);
      }
    }else{
      this.canvasFb.add(new_pathObj);
      this.localPathArray.push(new_pathObj);
    }
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

      if (this.pathBoundsNotIncludeEraseLine(pathDataStr, eraserLine)) continue

      // if (this.storage.collisionTest(fabricPath, eraserPath)) {
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

  pathBoundsNotIncludeEraseLine = (pathDataStr, eraserLine) => {
    const targetPath = new fabric.Path(pathDataStr);
    const bound = targetPath.getBoundingRect();
    
    if 
    (
        (eraserLine.x0_pu >= bound.left 
        && eraserLine.x0_pu <= bound.left+bound.width 
        && eraserLine.y0_pu >= bound.top 
        && eraserLine.y0_pu <= bound.top+bound.height) 
      ||
        (eraserLine.x1_pu >= bound.left 
        && eraserLine.x1_pu <= bound.left+bound.width 
        && eraserLine.y1_pu >= bound.top 
        && eraserLine.y1_pu <= bound.top+bound.height)
    )  
      return false
        
    return true
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

    let npaperWidth = noteItem.margin.Xmax - noteItem.margin.Xmin;
    let npaperHeight = noteItem.margin.Ymax - noteItem.margin.Ymin;
    let plateMode = ""; //landscape(가로 모드), portrait(세로 모드)

    if(npaperWidth > npaperHeight){
      plateMode = "landscape";
    }else{
      plateMode = "portrait";
    }

    const currentPage = GridaDoc.getInstance().getPage(store.getState().activePage.activePageNo);

    let pageMode = ""; //page 기본값의 모드

    if(currentPage.pageOverview.landscape){
      pageMode = "landscape";
    }else{
      pageMode = "portrait";
    }

    let addedRotation = 0;
    if(plateMode === pageMode){
      //둘다 같은 모드면 각도 조절이 필요 없음
      addedRotation = 0;
    }else{
      // if(pageMode === "portrait"){
        addedRotation = 90;
      // }
    }
    const finalRotation = (addedRotation + currentPage._rotation) % 360;
     
    const { x, y } = dot;
    //좌표 변환 먼저
    let newX = Math.cos(Math.PI/180 * finalRotation) * x - Math.sin(Math.PI/180 * finalRotation) * y;
    let newY = Math.sin(Math.PI/180 * finalRotation) * x + Math.cos(Math.PI/180 * finalRotation) * y;
    if(finalRotation === 90){
      newX += noteItem.margin.Ymax;
    }else if(finalRotation === 180){
      newX += noteItem.margin.Xmax;
      newY += noteItem.margin.Ymax;      
    }else if(finalRotation === 270){
      newY += noteItem.margin.Xmax;
    }

    const pageWidth = currentPage.pageOverview.sizePu.width;
    const pageHeight =currentPage.pageOverview.sizePu.height;
    
    if(finalRotation === 90 || finalRotation === 270){
      npaperHeight = noteItem.margin.Xmax - noteItem.margin.Xmin;
      npaperWidth = noteItem.margin.Ymax - noteItem.margin.Ymin;
    }

    const wRatio = pageWidth / npaperWidth;
    const hRatio = pageHeight / npaperHeight;
    let platePdfRatio = wRatio
    if (hRatio > wRatio) platePdfRatio = hRatio

    const pdf_x = newX * platePdfRatio;
    const pdf_y = newY * platePdfRatio;

    return {x: pdf_x, y: pdf_y, f: dot.f, finalRotation: finalRotation};
  }

  movePenTracker = (event: IPenToViewerEvent, pageInfo: IPageSOBP) => {
    const cursor = this.penCursors[event.mac];
    if (!cursor) {
      console.log(`ERROR: pen cursor has not been initiated`);
      return;
    }

    let isPlate = false;
    if (isPlatePage(pageInfo)) {
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
    if (isPlatePage(this.currentPageInfo)) {
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

    hps[NUM_HOVER_POINTERS-1].set({ left: pdf_xy.x, top: pdf_xy.y })

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

    cursor.intervalHandle = window.setInterval(function(_cursor){
      const cursor = this.penCursors[e.mac];
      if (!cursor) {
        console.log(`ERROR: pen cursor has not been initiated`);
        clearInterval(_cursor.intervalHandle);
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
    }.bind(this, cursor), REMOVE_HOVER_POINTS_INTERVAL);
  };

  redrawStrokes = (pageInfo: IPageSOBP, isMainView?: boolean) => {
    const activePageNo = store.getState().activePage.activePageNo;
    const activePage = GridaDoc.getInstance().getPageAt(activePageNo);
    if (!activePage) return;
    const activePageInfo = activePage.pageInfos[0];
    /**
     * 현재 문제 this.pageInfo가 undefined로 들아올 때, 아래의 redraw 로직을 타면 첫번째 thumbnail에 직전 작업했던 page의 stroke가 같이 들어감.
     * 그렇다고 아래의 조건에서 this.pageInfo === undefined를 제외시키면 첫번째 thumbnail stroke의 회전이 제대로 동작하지 않음.
     * 9c2678e0e3165c42796acabe6b656cededd156d1 커밋 참고
     * 따라서, this.pageInfo가 undefined로 들어올 때 다른 페이지에서 동작(페이지이동/회전)시 첫번째 썸네일에 stroke가 들어오는 것을 막고,
     * 첫번째 썸네일 페이지에서 회전시 정상적으로 동작되게 하기 위하여 activePageNo가 0(첫번째 thumbnail)일때만 동작하게 해야함
     * 추가로, 현재 들어온 pageInfo와 activePageInfo가 같을때만 동작할 수 있도록 조건을 추가(1->0으로 이동시 activePageNo가 0으로 활성화되면서 로직을 타게됨)
     * 정리: this.pageInfo가 undefined로 들어오면서 작업페이지가 첫번째(0) thumbnail일때만 아래의 로직을 타게 수정하면 된다.
     */
    if (isSamePage(this.pageInfo, pageInfo) || (this.pageInfo === undefined && activePageNo === 0 && isSamePage(pageInfo, activePageInfo))) {
      this.removeAllCanvasObject();
      this.resetLocalPathArray();
      this.resetPageDependentData();

      const strokesAll = this.storage.getPageStrokes(pageInfo);
      // const strokes = strokesAll.filter(stroke => stroke.brushType !== IBrushType.ERASER);
      const strokes = strokesAll.filter(stroke => stroke.brushType !== IBrushType.ERASER && stroke.brushType !== IBrushType.LASSO);

      this.addStrokePaths(strokes, isMainView);
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
    // const strokes = strokesAll.filter(stroke => stroke.brushType !== IBrushType.ERASER);
    const strokes = strokesAll.filter(stroke => stroke.brushType !== IBrushType.ERASER && stroke.brushType !== IBrushType.LASSO);

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

  recoveryAllCanvasObject = () => {
    if (this.localPathArray) {
      this.localPathArray.forEach(path => {
        this.canvasFb.add(path);
      });
    }
  }

  /**
   * @private
   * @param {Array<NeoStroke>} strokes
   */
  addStrokePaths = (strokes, isMainView?: boolean) => {
    if (!this.canvasFb) return;

    strokes.forEach(stroke => {
      if (stroke.dotArray.length > 0) {
        const path = this.createFabricPathByStorage(stroke, true, isMainView) as IExtendedPathType;
        this.canvasFb.add(path);
        this.localPathArray.push(path);
      }
    });
  };

  createPathData_arr = (stroke: NeoStroke, pageInfo?: IPageSOBP) => {
    const { dotArray, brushType, thickness } = stroke;
    const pointArray = [];
    
    let isPlate = false;
    if (isPlatePage(pageInfo)) {
      isPlate = true;
    }

    dotArray.forEach(dot => {
      if(dot.point === undefined){
        dot.point = this.ncodeToPdfXy(dot);
      }
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

  createPathDataByStorage = (stroke: NeoStroke, isMainView?: boolean) => {
    const { dotArray, brushType, thickness } = stroke;

    const pointArray = [];

    const pageInfo = {section: stroke.section, owner: stroke.owner, book: stroke.book, page: stroke.page};

    if (!stroke.isPlate){
      dotArray.forEach(dot => {
        const pt = this.ncodeToPdfXy_strokeHomography(dot, stroke.h);
        pointArray.push(pt);
      });
    } else { //plate인 경우. 이미 변환된 dot.point
      if (isMainView) {
        dotArray.forEach(dot => {
          const radians = fabric.util.degreesToRadians(90) 
          //여기 들어오는 경우는 isMainView가 parameter로 들어오는 경우니까 PenBasedRenderer에서 회전 버튼을 눌러 redrawStrokes가 호출되는 경우 뿐. 90으로 고정해놔도 문제없을듯
          
          //180, 0도로 갈 때는 src, dst를 바꿔줘야하지 않나? 일단 정상동작하니 이대로
          const canvasCenterSrc = new fabric.Point(this._opt.pageSize.width/2, this._opt.pageSize.height/2)
          const canvasCenterDst = new fabric.Point(this._opt.pageSize.height/2, this._opt.pageSize.width/2)

          // 1. subtractEquals
          dot.point.x -= canvasCenterSrc.x;
          dot.point.y -= canvasCenterSrc.y;

          // 2. rotateVector
          const v = fabric.util.rotateVector(dot.point, radians);

          // 3. addEquals
          v.x += canvasCenterDst.x;
          v.y += canvasCenterDst.y;

          dot.point.x = v.x;
          dot.point.y = v.y;

          pointArray.push(dot.point);
        });
      } else {
        dotArray.forEach(dot => {
          pointArray.push(dot.point);
        });
      }
    }

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
      if(dot.point === undefined){
        dot.point = this.ncodeToPdfXy(dot);
      }
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

  createFabricPathByStorage = (stroke: NeoStroke, cache: boolean, isMainView?: boolean) => {
    const { color, brushType, key } = stroke;
    const pathData = this.createPathDataByStorage(stroke, isMainView);

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

    const pathOption = 
    (brushType !== IBrushType.LASSO) ? 
      {
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
      } :
      {
        fill: "transparent", 
        stroke:"black", 
        strokeWidth: 1, 
        strokeDashArray: [10, 5], 
        hasControls: false, 
        data: LASSO_OBJECT_ID, 
        selectable: false, 
        evented: true, 
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

    const pathOption = 
    (brushType !== IBrushType.LASSO) ? 
      {
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
      } :
      {
        fill: "transparent", 
        stroke:"black", 
        strokeWidth: 1, 
        strokeDashArray: [10, 5], 
        hasControls: false, 
        data: LASSO_OBJECT_ID, 
        selectable: false, 
        evented: true, 
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

  removeLassoPath = () => {
    const lassoPath = this.canvasFb.getObjects().filter(object => object.data === LASSO_OBJECT_ID);
    lassoPath.forEach(object =>{
      this.canvasFb.remove(object);
    }) 
  };
  removeLassoObject = () => {
    const lassoObject = this.canvasFb.getObjects().filter(object => object.data === LASSO_OBJECT_ID || object.data === LASSO_GROUP_ID);
    lassoObject.forEach(object =>{
      this.canvasFb.remove(object);
    })
  };

  /**라쏘 오브젝트를 스토리지 등에서 제거하는 함수 */
  removeLassoData = () => {    
    for(let i = 0; i < this.localPathArray.length; i++){
      if(this.localPathArray[i].data === LASSO_OBJECT_ID || this.localPathArray[i].data === LASSO_GROUP_ID){
        this.localPathArray.splice(i, 1);
        i--;
      }
    }

    const activePageNo = store.getState().activePage.activePageNo;
    const docPageInfo = GridaDoc.getInstance().getPage(activePageNo).pageInfos[0];

    const pageId = InkStorage.makeNPageIdStr(docPageInfo);
    const completed = this.storage.completedOnPage.get(pageId);
    //completedOnPage 말고 completed 배열에서도 삭제해야하는 것 아닌가?
    if(completed){
      for(let i = 0; i < completed.length; i++){
        if(completed[i].brushType === IBrushType.LASSO){
          completed.splice(i, 1);
          i--;
        }
      }
    }
    //썸네일 새로고침
    this.storage.dispatcher.dispatch(PenEventName.ON_ERASER_MOVE, {
      section: docPageInfo.section,
      owner: docPageInfo.owner,
      book: docPageInfo.book,
      page: docPageInfo.page,
    });
  };

  /**라쏘 그룹을 생성했을 때, 라쏘 옵션버튼이 모인 모달창의 위치를 반환하는 함수 */
  lassoModalPopUp = (lassoGroup: fabric.Group) => {
    const offset = this.offset;
    const groupCooMT = lassoGroup.oCoords.mt;

    const lassoModalPoint = { x: groupCooMT.x * offset.zoom - 48, y: groupCooMT.y * offset.zoom - 48};
    setLassoModalPoint(lassoModalPoint);
  }

  /**fabricPath가 그려졌을 때, 기존 stroke와의 영역체크 후, 라쏘 그룹 생성하는 함수 */
  activePathbyLasso = (lassoPath: fabric.Path) => {
    const activePageNo = store.getState().activePage.activePageNo;
    const docPageInfo = GridaDoc.getInstance().getPage(activePageNo).pageInfos[0];
    this.redrawStrokes(docPageInfo);
    
    this.canvasFb.add(lassoPath);
    
    const pathGroup = new fabric.Group([], {data: LASSO_GROUP_ID, originX: "left", originY: "top", hasControls: false, borderDashArray: [10, 5], });
    
    const strokePath = this.canvasFb.getObjects().filter(object => object.data === STROKE_OBJECT_ID);
    
    for(let i = 0; i < strokePath.length; i++){
      if(lassoPath.intersectsWithObject(strokePath[i])){
        strokePath[i].setOptions({stroke: "blue", strokeWidth: 5, opacity: 0.2, name: (strokePath[i].opacity === 0.3) ? "marker" : null});
        pathGroup.addWithUpdate(strokePath[i]);
        this.canvasFb.remove(strokePath[i]);
      }
    }
    
    if(pathGroup.getObjects().length > 0){
      this.lassoModalPopUp(pathGroup);
    
      this.onLassoGroup = true;
      setOnLassoGroup(true);
      // lassoPath.setOptions({visiblqe: false});
      // strokeGroup.addWithUpdate(lassoPath);
      this.removeLassoPath();
      this.canvasFb.add(pathGroup);
      this.canvasFb.setActiveObject(pathGroup);
      this.canvasFb.requestRenderAll();
    }else{
      this.removeLassoPath();
    }
  };
  
  /**라쏘 그룹을 클릭해 이동 시 혹은 회전 시, 스토리지 등에 보관된 stroke의 좌표값 업데이트하는 함수*/
  updatePathData = (updatePath: IExtendedPathType, event: IPenToViewerEvent, rotation: number, centerPoint: fabric.Point) => {
    const { section, owner, book, page } = event.stroke;
    let pageInfo = {
      section: section,
      book: book,
      owner: owner,
      page: page,
    };
    
    let isPlate = false;
    if (isPlatePage(pageInfo)) {
      const activePageNo = store.getState().activePage.activePageNo;
      const docPageInfo = GridaDoc.getInstance().getPage(activePageNo).pageInfos[0];
      pageInfo = docPageInfo;
      isPlate = true;
    }

    const pageId = InkStorage.makeNPageIdStr(pageInfo);
    const completed = this.storage.completedOnPage.get(pageId);
    
    let shiftX;
    let shiftY;
    let shiftPointX;
    let shiftPointY;
    
    if(this.lassoShiftPoint){
      shiftX = this.lassoShiftPoint.x;
      shiftY = this.lassoShiftPoint.y;
      shiftPointX = this.lassoShiftPoint.pointX;
      shiftPointY = this.lassoShiftPoint.pointY;
    }
      
    for(let i = 0; i < this.localPathArray.length; i++){
      if(updatePath.key === this.localPathArray[i].key){
        this.localPathArray.splice(i, 1, updatePath);
      }
    }

    if(completed){
      for(let i = 0; i < completed.length; i++){
        if(updatePath.key === completed[i].key){
          completed[i].dotArray.forEach(dot => {
            if(this.lassoShiftPoint){
              dot.x += shiftX;
              dot.y += shiftY;
              dot.point.x += shiftPointX;
              dot.point.y += shiftPointY;
              if(isPlate && !completed[i].isPlate){
                console.log("여길 어떻게 처리해야하나");
              }
            }
            if(rotation !== 0){
              this.rotateDotPoint(dot, rotation, centerPoint);
            }
          })
        }
      }
    }
    this.canvasFb.add(updatePath);
    updatePath.setCoords();
  };

  /**라쏘 그룹 영역 밖을 클릭 시, 생성된 라쏘 그룹을 해체하는 함수 */
  unGroupPath = (group: fabric.Group, event: IPenToViewerEvent) => {
    const currentLassoRotation = group.angle;
    const centerPoint = group.getCenterPoint();

    group.forEachObject((object: IExtendedPathType) => {
      if (object.data === STROKE_OBJECT_ID){
        group.removeWithUpdate(object);
        object.setOptions({stroke: null, strokeWidth: null, opacity: object.name !== "marker" ? 1 : 0.3});
        if(this.lassoShiftPoint || currentLassoRotation !== 0){
          object.rotate(currentLassoRotation);
          this.updatePathData(object, event, currentLassoRotation, centerPoint);
        }else{
          this.canvasFb.add(object);
        }
      }
    });
    this.onLassoGroup = false;
    setOnLassoGroup(false);
    setLassoModalPoint({x:0, y:0});
    this.onLassoMovingByPen = false;
    delete this.lassoShiftPoint;
  };

  /**라쏘 그룹을 클릭해 이동 시, 이동 좌표 값을 보관하는 함수 */
  lassoShiftCheck = (event: IPenToViewerEvent) => {
    const onLassoShift = store.getState().docConfig.onLassoShift;
    if(onLassoShift){
    // if (this.onLassoShift) {
      const firstDot = event.stroke.dotArray[0];
      const lastDot = event.stroke.dotArray[event.stroke.dotArray.length-1];

      const shiftX = lastDot.x - firstDot.x;
      const shiftY = lastDot.y - firstDot.y;
      const shiftPointX = lastDot.point.x - firstDot.point.x;
      const shiftPointY = lastDot.point.y - firstDot.point.y;

      //종이, 플레이트, 마우스 간의 ncodeXY 이동 좌표의 문제
      //플레이트의 회전 문제
      //현재 플레이트를 이용하고, 플레이트에서 작성된 스트로크가 아닐 경우
      if(event.stroke.isPlate){
        //ncodeToPdfXy_plate에서 하는 것처럼 추가각도와 현페이지각도를 구하고
        //현페이지 WH, 플레이트 WH로 비율을 구한다음에
        //플레이트용 XY를 노트용 XY로 비율에 맞춰 변환시키고,
        //플레이트용 XY가 90도가 더해진상황에서 나오는 것이니, 
        //노트용 XY에 90도를 뺀 값을 대입시키면 된다?
        console.log("여기서 처리하는 게 정답인가");
      }
      
      //연속적으로 동일 라쏘그룹을 두 번 이동할 경우
      if(this.lassoShiftPoint){
        this.lassoShiftPoint.x += shiftX;
        this.lassoShiftPoint.y += shiftY;
        this.lassoShiftPoint.pointX += shiftPointX;
        this.lassoShiftPoint.pointY += shiftPointY;
      }else{
        this.lassoShiftPoint = { x: shiftX, y: shiftY, pointX: shiftPointX, pointY: shiftPointY };
      }
      // this.onLassoShift = false;
      setOnLassoShift(false);
    }
  };

  /**mouse down-move-up로 동작하도록 설계된 fabric(_setupCurrentTransform)에서는
   * pen down-move에 대응하지 못하므로, 라쏘 그룹을 펜으로 움직이기 위해, 
   * 펜의 좌표값에 따라 라쏘 그룹의 위치를 변환하는 함수  */
  movingLassobyPen = (event: IPenToViewerEvent) => {
    if(this.onLassoMovingByPen){
      const lassoGroup = this.canvasFb.getObjects().filter(object => object.data === LASSO_GROUP_ID)[0];
  
      const penDownPointX = event.dot.point.x;
      const penDownPointY = event.dot.point.y;
  
      if(lassoGroup && penDownPointX !== 0 && penDownPointY !== 0){
        lassoGroup.setPositionByOrigin(new fabric.Point(penDownPointX, penDownPointY), "center", "center");
        // lassoGroup.setCoords();
      }
    }
  }

  /**라쏘 그룹 이후에 들어오는 fabricPath가 그룹 영역 안인지, 밖인지 확인하는 함수 */
  lassoGroupBoundCheck = (event: IPenToViewerEvent) => {
    const lassoGroup = this.canvasFb.getObjects().filter(object => object.data === LASSO_GROUP_ID)[0];
        
    if(lassoGroup){
      const penDownPointX = event.dot.point.x;
      const penDownPointY = event.dot.point.y;
      
      if(!(penDownPointX >= lassoGroup.left 
        && penDownPointX <= lassoGroup.left + lassoGroup.width
        && penDownPointY >= lassoGroup.top
        && penDownPointY <= lassoGroup.top + lassoGroup.height)){
        this.unGroupPath(lassoGroup as fabric.Group, event);
        this.removeLassoObject();
        this.removeLassoData();
        this.canvasFb.requestRenderAll();
        return false;
      }else{
        //라쏘로 만든 그룹 오브젝트가 있고, 라쏘펜 포인트가 그 안쪽에 찍힐 경우
        if(event.mac !== PenManager.getInstance().virtualPen.mac){
          //가상펜(마우스)이 아닐 경우
          this.onLassoMovingByPen = true;

          const originPointX = lassoGroup.left;
          const originPointY = lassoGroup.top;
          const originXY = this.pdfToNcodeXy({ x: originPointX, y: originPointY });

          lassoGroup.setPositionByOrigin(new fabric.Point(penDownPointX, penDownPointY), "center", "center");

          const shiftPointX = lassoGroup.left;
          const shiftPointY = lassoGroup.top;
          const shiftXY = this.pdfToNcodeXy({ x: shiftPointX, y: shiftPointY });
    
          this.lassoShiftPoint = {
            x: shiftXY.x - originXY.x,
            y: shiftXY.y - originXY.y,
            pointX: shiftPointX - originPointX,
            pointY: shiftPointY - originPointY
          }
        }
        // this.onLassoShift = true;
        setOnLassoShift(true);
        return true; 
      }
    }
    this.onLassoGroup = false;
    setOnLassoGroup(false);
    return false;
  };

  /**라쏘 옵션 중 회전버튼을 눌렀을 때의, 회전 종료시 회전변환을 위한 함수 */
  rotateDotPoint = (dot: NeoDot, degree: number, centerPoint: fabric.Point) => {
    const radians = fabric.util.degreesToRadians(degree);
    
    const groupObjectCenterPoint = centerPoint;

    dot.point.x -= groupObjectCenterPoint.x;
    dot.point.y -= groupObjectCenterPoint.y;

    const v = fabric.util.rotateVector(dot.point, radians);

    v.x += groupObjectCenterPoint.x;
    v.y += groupObjectCenterPoint.y;

    dot.point.x = v.x;
    dot.point.y = v.y;

    const newXY = this.pdfToNcodeXy({x: dot.point.x, y: dot.point.y})
    dot.x = newXY.x;
    dot.y = newXY.y;
  }


  /**라쏘 옵션 중 회전버튼을 눌렀을 때의, 회전 종료 전까지 회전을 위한 함수 */
  rotateLasso = () => {
    const lassoGroup = this.canvasFb.getObjects().filter(object => object.data === LASSO_GROUP_ID)[0] as fabric.Group;
    const groupAngle = (lassoGroup.angle + 90) % 360;
    lassoGroup.rotate(groupAngle);    
  
    this.canvasFb.requestRenderAll();
  };

  
  /**라쏘 옵션 중 삭제버튼을 눌렀을 때의, 삭제를 위한 함수 */
  deleteLasso = () => {
    const lassoGroup = this.canvasFb.getObjects().filter(object => object.data === LASSO_GROUP_ID)[0] as fabric.Group;
    
    const activePageNo = store.getState().activePage.activePageNo;
    const docPageInfo = GridaDoc.getInstance().getPage(activePageNo).pageInfos[0];
    const pageId = InkStorage.makeNPageIdStr(docPageInfo);
    const completed = this.storage.completedOnPage.get(pageId);
    
    lassoGroup.forEachObject((object: IExtendedPathType) => {
      const idxlocal = this.localPathArray.findIndex(ns => ns.key === object.key);
      const idxstorage = completed.findIndex(ns => ns.key === object.key);

      this.localPathArray.splice(idxlocal, 1);
      completed.splice(idxstorage, 1);
    })
    this.canvasFb.remove(lassoGroup);
    this.removeLassoData();

    this.storage.dispatcher.dispatch(PenEventName.ON_ERASER_MOVE, {
      section: docPageInfo.section,
      owner: docPageInfo.owner,
      book: docPageInfo.book,
      page: docPageInfo.page,
    });
    this.onLassoGroup = false;
    setOnLassoGroup(false);
    this.onLassoMovingByPen = false;
    delete this.lassoShiftPoint;
  }


  lassoPaste = (event) => {
    const cbData = event.clipboardData;
    for(let i = 0; i < cbData.items.length; i++){
      const cbDataItem = cbData.items[i];
      const type = cbDataItem.type;

      if (type.indexOf("image") != -1) {
        const imageData = cbDataItem.getAsFile();
        const imageURL = window.webkitURL.createObjectURL(imageData);

        const img = document.createElement("img");
        img.src = imageURL;
        document.getElementById("drawer_content").appendChild(img);

        console.log("create", imageURL);

        // window.webkitURL.revokeObjectURL(imageURL);

        console.log("revoke", imageURL);
      }
    }
  }
  clipCanvasbyLasso = (path) => {
    const clipPath = new fabric.Polygon(path);
    this.canvasFb.clipPath = clipPath;
  }
}
