import { fabric } from 'fabric';
import { Point } from 'fabric/fabric-impl';
import { sprintf } from 'sprintf-js';
import { NU_TO_PU, PU_TO_NU } from 'nl-lib/common/constants';
import { ZoomFitEnum } from 'nl-lib/common/enums';
import { calcRotatedH, calcRotatedH90, calcRotatedH180, calcRotatedH270, calcRevH } from 'nl-lib/common/mapper/CoordinateTanslater';
import { InkStorage } from 'nl-lib/common/penstorage';
import { TransformParameters, ISize, IPageSOBP, NeoDot } from 'nl-lib/common/structures';
import { makeNPageIdStr } from 'nl-lib/common/util';
import { PATH_THICKNESS_SCALE } from 'nl-lib/common/util';
import { PDFVIEW_ZOOM_MAX, PDFVIEW_ZOOM_MIN } from '../RendererConstants';
import { setViewFit } from 'GridaBoard/store/reducers/viewFitReducer';

// const timeTickDuration = 20; // ms
// const DISABLED_STROKE_COLOR = "rgba(0, 0, 0, 0.1)";
// const INVISIBLE_STROKE_COLOR = "rgba(255, 255, 255, 0)";
// const INCOMPLETE_STROKE_COLOR = "rgba(255, 0, 255, 0.4)";
// const CURRENT_POINT_STROKE_COLOR = "rgba(255, 255, 255, 1)";

let instanceNum = 0;

/**
 * @enum {string}
 */

export interface IRenderWorkerOption {
  canvasId: string;

  canvas: HTMLCanvasElement;
  // position: { offsetX: number, offsetY: number, zoom: number },
  /** screen width, height in pixel */
  viewSize: ISize;

  /** PDF width, height in PU */
  pageSize: ISize;

  viewFit: ZoomFitEnum;
  fitMargin: number;
  bgColor?: string;
  mouseAction: boolean;
  shouldDisplayGrid: boolean;
  storage?: InkStorage;

  rotation: number;
  h?: TransformParameters;
  h_rev?: TransformParameters;
  h_origin?: TransformParameters;

  autoFocus: boolean;

  onCanvasPositionChanged: (arg: { offsetX; offsetY; zoom }) => void;
}

/**
 * @enum {string}
 */

// const STROKE_OBJECT_ID = "ns";
const GRID_OBJECT_ID = 'g';
const GRID_TEXT_ID = 'tt';

export default abstract class RenderWorkerBase {
  name: string;
  /** canvas element ID */
  // canvasId = "";

  // canvas: HTMLCanvasElement;

  /** background color */
  // bgColor = "rgba(255,255,255,0)";

  /** PdfSize */
  // pageSize: { width: number, height: number } = { width: 0, height: 0 };

  /** parent element size */
  // viewSize: { width: number, height: number } = { width: 0, height: 0 };

  /** <canvas>내의 drawing canvas(fabric canvas)의 offset, 현재는 안 씀 - 2020/11/08*/
  offset: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 1 };

  /** FabricJs canvas */
  canvasFb: fabric.Canvas = null;

  /** mouse에 따라 pan, zoom이 가능한지에 대한 여부 */
  // mouseAction = true;

  /** mouse drag & panning 을 위해 */
  pan: { isDragging: boolean; lastPosX: number; lastPosY: number } = {
    isDragging: false,
    lastPosX: 0,
    lastPosY: 0,
  };

  drawing: { isDragging: boolean; lastPosX: number; lastPosY: number } = {
    isDragging: false,
    lastPosX: 0,
    lastPosY: 0,
  };

  /** pen stroke에 따라 자동 focus를 맞추도록 */
  // autoFocus = true;

  // /** 종이 정보 */
  paperBase = {
    Xmin: 3.12, // code unit
    Ymin: 3.12,
  };

  pageInfo: IPageSOBP;
  //   Mag: 1,

  //   // 0: portratio, 90: landscape
  //   rotation: 0,
  // };

  /** Ncode to Screen scale */
  // nu_to_pu_scale: number;

  /** logical zoom in/out */
  // scale = 1;

  /** zoom fit */
  // viewFit: ZoomFitEnum = ZoomFitEnum.ACTUAL;

  /** determine whether border and grid lines displayed or not */
  // shouldDisplayGrid = true;

  /** animation timer */
  scrollAnimateTimer: number = null;

  zoomAnimateTimer: number = null;

  // h: TransformParameters;
  h: TransformParameters;
  h2: TransformParameters[] = [];
  h2_rev: TransformParameters[] = [];

  h_rev: TransformParameters;

  funcNcodeToPdfXy: (ncodeXY: { x: number; y: number; f?: number }) => { x: number; y: number; f: number };
  funcPdfToNcodeXy: (ncodeXY: { x: number; y: number; f?: number }) => { x: number; y: number; f: number };

  // fitMargin = 0;

  logCnt = 0;

  _opt: IRenderWorkerOption;

  infoTexts: string[] = [];

  /**
   *
   * @param {RenderWorkerOption} options
   */
  constructor(options: IRenderWorkerOption) {
    instanceNum++;
    this.name = 'RenderWorkerBase';

    this.funcNcodeToPdfXy = this.ncodeToPdfXy_default;
    this.h2 = new Array(4);

    if (typeof options.canvasId !== 'string') {
      throw new Error('canvasId should be a string');
    }

    this._opt = { ...options };
    this.canvasFb = null;
    this.initFabricCanvas();
  }

  /**
   * @protected
   */
  initFabricCanvas = () => {
    const size = this._opt.pageSize;

    // let HtmlCanvas = this.canvas.current;
    // const dpr = getDisplayRatio();
    // scaleCanvas(HtmlCanvas);
    const dpr = 1;

    console.log(`Fabric canvas inited: size(${size.width}, ${size.height})`);

    this.canvasFb = new fabric.Canvas(this._opt.canvasId, {
      backgroundColor: this._opt.bgColor,
      selection: false,
      controlsAboveOverlay: false,
      selectionLineWidth: 4,
      width: size.width * dpr,
      height: size.height * dpr,
    });

    const canvasFb = this.canvasFb;

    if (this._opt.mouseAction) {
      canvasFb.on('mouse:down', this.onCanvasMouseDown);
      canvasFb.on('mouse:move', this.onCanvasMouseMove);
      canvasFb.on('mouse:up', this.onCanvasMouseUp);

      canvasFb.on('mouse:wheel', this.onCanvasMouseWheel);
    }

    // this.drawPageLayout();
    // this.scrollBoundaryCheck();
  };

  getPageSize_pu = (): ISize => {
    const { rotation } = this._opt;
    const s: ISize = { ...this._opt.pageSize };
    // if (rotation === 90) {
    //   const temp = s.width;
    //   s.width = s.height;
    //   s.height = temp;
    // }
    // PenBasedRenderer에서 rotation 바뀌면 pdfSize를 바꿔주게 했기 때문에 필요없는 로직

    // console.log(`VIEW SIZE${callstackDepth()} getPageSize_pu ${this.logCnt++}: ${s.width}, ${s.height}`);
    return s;
  };

  // changePage_base(pageInfo: IPageSOBP, pdfSize: ISize, forceToRefresh: boolean): boolean {
  //   this.pageInfo = {...pageInfo};

  //   // console.log("PAGE CHANGE (base)");
  //   // const currPage = this.paperBase;

  //   // 페이지 정보와 scale을 조정한다.
  //   const transform = MappingStorage.getInstance().getNPageTransform(pageInfo);
  //   const h_rev = calcRevH(transform.h);
  //   const leftTop_nu = applyTransform({ x: 0, y: 0 }, h_rev);

  //   this.onPageSizeChanged(pdfSize);
  //   // this.pageSize = { ...pdfSize };
  //   // const width_nu = convertPuToNu(pdfSize.width);
  //   // const height_nu = convertPuToNu(pdfSize.height);

  //   // this.paperBase = {
  //   //   ...pageInfo,
  //   //   margin: {
  //   //     Xmin: leftTop_nu.x,
  //   //     Ymin: leftTop_nu.y,
  //   //     // Xmin: margin.Xmin,
  //   //     // Ymin: margin.Ymin,
  //   //     Xmax: leftTop_nu.x + width_nu,
  //   //     Ymax: leftTop_nu.y + height_nu,
  //   //   },
  //   //   Mag: 1,
  //   //   rotation: this.options.rotation,
  //   // };

  //   // const { Xmin, Ymin, Xmax, Ymax } = this.paperBase.margin;
  //   // const width = Xmax - Xmin;
  //   // const height = Ymax - Ymin;

  //   // console.log(`VIEW SIZE${callstackDepth()} changePage (base):   ${width}, ${height}              ${makeNPageIdStr(this.paperBase as IPageSOBP)}            ${makeNPageIdStr(pageInfo)}`);

  //   // const info = getNPaperInfo(pageInfo);
  //   // const margin = info.margin;

  //   // if (info) {
  //   //   this.paperBase = {
  //   //     ...pageInfo,
  //   //     margin: {
  //   //       Xmin: leftTop_nu.x,
  //   //       Ymin: leftTop_nu.y,
  //   //       // Xmin: margin.Xmin,
  //   //       // Ymin: margin.Ymin,
  //   //       Xmax: margin.Xmax,
  //   //       Ymax: margin.Ymax,
  //   //     },
  //   //     Mag: 1,
  //   //     rotation: this.options.rotation,
  //   //   };
  //   // }

  //   return true;
  // }

  drawInfoText = () => {
    return;
    const canvasFb = this.canvasFb;

    const objects = canvasFb.getObjects();
    const texts = objects.filter(obj => obj.data === GRID_TEXT_ID);

    texts.forEach(obj => {
      this.canvasFb.remove(obj);
    });

    const msg = sprintf(
      'instance:%d, zoom:%.2f, pageInfo:%s, viewSize:(%d,%d) pageSize:(%d,%d)\n',
      instanceNum,
      this.offset.zoom,
      makeNPageIdStr(this.pageInfo),
      Math.round(this._opt.viewSize.width),
      Math.round(this._opt.viewSize.height),

      Math.round(this._opt.pageSize.width),
      Math.round(this._opt.pageSize.height)
    );

    this.infoTexts.unshift(msg);

    const len = this.infoTexts.length;

    for (let i = 0; i < 25 && i < len; i++) {
      const text = new fabric.Text(this.infoTexts[i], {
        left: 10,
        top: 10 + i * 20,
        fill: 'black',
        fontSize: 12,
        data: GRID_TEXT_ID,
      });
      canvasFb.add(text);
    }
  };

  drawPageLayout = () => {
    // console.log(`VIEW SIZE${callstackDepth()} DrawPageLayout`);

    if (!this._opt.shouldDisplayGrid) return;
    const canvasFb = this.canvasFb;

    // 지우기
    if (this.canvasFb) {
      const objects = this.canvasFb.getObjects();
      const strokes = objects.filter(obj => obj.data === GRID_OBJECT_ID);

      strokes.forEach(obj => {
        this.canvasFb.remove(obj);
      });
    }

    // 그리기
    const size = this.getPageSize_pu();
    // console.log(`VIEW SIZE${callstackDepth()} DrawPageLayout: ${size.width}, ${size.height} = ${size.width / size.height}`);

    // console.log(`Grid: scale=${this.nu_to_pu_scale} (width, height)=(${size.width}, ${size.height})`);

    const ratio = 1;

    const rect = new fabric.Rect({
      width: size.width * ratio - 0,
      height: size.height * ratio - 0,
      strokeWidth: 0,
      stroke: 'rgba(0,0,0,1)',
      fill: 'rgb(0,0,0,0)',
      left: size.width * (1 - ratio) * 0.5,
      top: size.height * (1 - ratio) * 0.5,
      // lockMovementX: true,
      // lockMovementY: true,
      selectable: false,
      data: GRID_OBJECT_ID,
      name: 'page_layout',
    });
    canvasFb.add(rect);

    this.drawInfoText();

    // let sw = true;
    // 세로 grid 그리기
    // for (let x = 0; x < size.width; x += size.width / 4) {
    //   let color = 'rgba(0,0,0,0.3)';
    //   if (sw) color = 'rgba(0,0,0,0.8)';
    //   sw = !sw;
    //   const line = new fabric.Line([x, 0, x, size.height], {
    //     strokeWidth: 0.5,
    //     stroke: color,
    //     hasControls: false,
    //     hasBorders: false,
    //     lockMovementX: true,
    //     lockMovementY: true,
    //     data: GRID_OBJECT_ID,
    //     name: 'page_layout',
    //   });

    //   canvasFb.add(line);
    // }

    // 가로 grid 그리기
    // sw = true;
    // for (let y = 0; y < size.height; y += size.height / 4) {
    //   let color = 'rgba(0,0,0,0.3)';
    //   if (sw) color = 'rgba(0,0,0,0.8)';
    //   sw = !sw;
    //   const line = new fabric.Line([0, y, size.width, y], {
    //     strokeWidth: 0.5,
    //     stroke: color,
    //     hasControls: false,
    //     hasBorders: false,
    //     lockMovementX: true,
    //     lockMovementY: true,
    //     data: GRID_OBJECT_ID,
    //     name: 'page_layout',
    //   });

    //   canvasFb.add(line);
    // }
  };

  /**
   * enable/disable mouse drag panning and zoom in/out
   * default: true
   *
   * @public
   * @param {boolean} sw
   */
  enableMouseAction = (sw: boolean) => {
    if (this._opt.mouseAction !== sw) {
      const canvasFb = this.canvasFb;

      if (sw === false) {
        this.onCanvasMouseUp();

        canvasFb.off('mouse:down', this.onCanvasMouseDown);
        canvasFb.off('mouse:move', this.onCanvasMouseMove);
        canvasFb.off('mouse:up', this.onCanvasMouseUp);
        canvasFb.off('mouse:wheel', this.onCanvasMouseWheel);
      } else {
        canvasFb.on('mouse:down', this.onCanvasMouseDown);
        canvasFb.on('mouse:move', this.onCanvasMouseMove);
        canvasFb.on('mouse:up', this.onCanvasMouseUp);
        canvasFb.on('mouse:wheel', this.onCanvasMouseWheel);
      }
    }
    this._opt.mouseAction = sw;
  };

  /**
   * enable/disable auto set focus at current stroke point
   * default: true
   *
   * @public
   * @param {boolean} sw
   */
  enableAutoFocus = (sw: boolean) => {
    this._opt.autoFocus = sw;
  };

  /**
   * @protected
   * @param {Object} opt
   */
  onCanvasMouseDown = (opt: any) => {
    const evt: MouseEvent = opt.e;
    if (this._opt.mouseAction && evt.ctrlKey === true) {
      const canvasFb = this.canvasFb;

      const evt: MouseEvent = opt.e;

      this.pan.isDragging = true;
      this.pan.lastPosX = evt.clientX;
      this.pan.lastPosY = evt.clientY;

      canvasFb.selection = false;
    }

    if (!evt.ctrlKey) {
      // 그리기 시작
      const p = this.canvasFb.getPointer(opt.e);

      // 2021/01/12 PointerEvent도 처리할 수 있도록 추가해야 함
      this.onTouchStrokePenDown(evt);

      // 아래를 추가할 것, 2021/01/12, kitty
      // this.onTouchStrokePenMove(evt);

      this.drawing.isDragging = true;
      this.drawing.lastPosX = p.x;
      this.drawing.lastPosY = p.y;
    }
  };

  abstract onTouchStrokePenDown(event: MouseEvent): void;

  /**
   * @protected
   * @param {Object} opt
   */
  onCanvasMouseMove = (opt: any) => {
    const canvasFb = this.canvasFb;
    const evt: MouseEvent = opt.e;
    if (this._opt.mouseAction && evt.ctrlKey === true) {
      if (this.pan.isDragging) {
        // console.log(`Point ${e.clientX}, ${e.clientY}`);
        // const vpt = canvasFb.viewportTransform;
        this.offset.x += evt.clientX - this.pan.lastPosX;
        this.offset.y += evt.clientY - this.pan.lastPosY;

        this.scrollBoundaryCheck();

        // canvasFb.setViewportTransform(vpt);
        // canvasFb.requestRenderAll();

        this.pan.lastPosX = evt.clientX;
        this.pan.lastPosY = evt.clientY;

        // this.canvasBoundaryCheck();
      }
    }

    if (!evt.ctrlKey) {
      // 그리기 중간
      // 2021/01/12 PointerEvent도 처리할 수 있도록 추가해야 함
      if (this.drawing.isDragging) {
        
        if (!opt.target) {
          return;
        }

        const p = this.canvasFb.getPointer(opt.e);
        // const dx = p.x - this.drawing.lastPosX;
        // const dy = p.y - this.drawing.lastPosY;
        // const distance2 = Math.sqrt(Math.sqrt(dx * dx + dy * dy));
        // const distance = Math.max(1, distance2);
        // const force = 800 / distance;

        this.drawing.lastPosX = p.x;
        this.drawing.lastPosY = p.y;

        this.onTouchStrokePenMove(evt, p, 800);
      }
    }
  };

  abstract onTouchStrokePenMove(event: MouseEvent, canvasXy: { x: number, y: number }, force: number): void;

  reportCanvasChanged = () => {
    const { x: offsetX, y: offsetY, zoom } = this.offset;
    this._opt.onCanvasPositionChanged({ offsetX, offsetY, zoom });
  };

  /**
   * @protected
   * @param {Object} opt
   */
  onCanvasMouseUp = (opt: any = undefined) => {
    const evt: MouseEvent = opt.e;
    if (this.pan.isDragging) {
      const canvasFb = this.canvasFb;
      canvasFb.selection = false;
      this.pan.isDragging = false;
    }

    if (this.drawing.isDragging) {
      // 그리기 끝
      // 2021/01/12 PointerEvent도 처리할 수 있도록 추가해야 함

      this.drawing.isDragging = false;
      this.onTouchStrokePenUp(evt);
    }
  };

  abstract onTouchStrokePenUp(event: MouseEvent): void;

  /**
   * @protected
   * @param {Object} opt
   */
  onCanvasMouseWheel = (opt: any) => {
    setViewFit(ZoomFitEnum.FREE);
    this._opt.viewFit = ZoomFitEnum.FREE;

    const evt: MouseEvent = opt.e;
    if (evt.ctrlKey === true) {
      const delta = opt.e.deltaY;
      let zoom = this.offset.zoom;
      zoom *= 0.9985 ** delta;

      this.setCanvasZoom(zoom, opt);
    }
  };

  scrollBoundaryCheck = () => {
    // const zoom = this.calcScaleFactor(this._opt.viewFit, this.offset.zoom);
    // if (zoom === 0) {
    //   this.reportCanvasChanged();
    //   return false;
    // }

    // if (zoom !== this.offset.zoom) {
    //   this.offset.zoom = zoom;
      // this.zoomToPoint(undefined, zoom);
    // }

    // http://fabricjs.com/fabric-intro-part-5#pan_zoom
    const zoom = this.offset.zoom;
    let offsetX = this.offset.x;
    let offsetY = this.offset.y;

    // const { section, owner, book, page } = this.ncodeSurface;
    // const szPaper = paperInfo.getPaperSize({ section, owner, book, page });

    // const size_pu = {
    //   width: szPaper.width * this.nu_to_pu_scale,
    //   height: szPaper.height * this.nu_to_pu_scale,
    // }

    const pageSize = {
      width: this._opt.pageSize.width * zoom,
      height: this._opt.pageSize.height * zoom,
    };

    let shouldReset = false;

    if (pageSize.width <= this._opt.viewSize.width) {
      offsetX = Math.round((this._opt.viewSize.width - pageSize.width) / 2);
      shouldReset = true;
    } else {
      if (offsetX > 0) {
        offsetX = 0;
        shouldReset = true;
      } else if (offsetX + pageSize.width < this._opt.viewSize.width) {
        offsetX = this._opt.viewSize.width - pageSize.width;
        shouldReset = true;
      }
    }

    if (pageSize.height <= this._opt.viewSize.height) {
      offsetY = Math.round((this._opt.viewSize.height - pageSize.height) / 2);
      shouldReset = true;
    } else {
      if (offsetY > 0) {
        offsetY = 0;
        shouldReset = true;
      } else if (offsetY + pageSize.height < this._opt.viewSize.height) {
        offsetY = this._opt.viewSize.height - pageSize.height;
        shouldReset = true;
      }
    }

    if (shouldReset) {
      this.offset.x = offsetX;
      this.offset.y = offsetY;
    }
    this.reportCanvasChanged();
    return shouldReset;
  };

  /**
   * @protected
   * @param {number} zoom
   * @param {Object} opt
   */
  setCanvasZoom = (zoom: number, opt: any) => {
    const canvasFb = this.canvasFb;

    if (zoom > PDFVIEW_ZOOM_MAX) zoom = PDFVIEW_ZOOM_MAX;
    if (zoom < PDFVIEW_ZOOM_MIN) zoom = PDFVIEW_ZOOM_MIN;

    // const evt: MouseEvent = opt.e;
    // const pt = new fabric.Point(evt.offsetX, evt.offsetY);
    // if (opt) {
      // this.zoomToPoint(undefined, zoom);
    // } else {
      // canvasFb.setZoom(zoom);
    this.zoomToPoint(null, zoom);
    // }

    opt.e.preventDefault();
    opt.e.stopPropagation();
  };

  setCanvasZoomByButton = (zoom: number) => {
    if (zoom > PDFVIEW_ZOOM_MAX) zoom = PDFVIEW_ZOOM_MAX;
    if (zoom < PDFVIEW_ZOOM_MIN) zoom = PDFVIEW_ZOOM_MIN;

    this.offset.zoom = zoom;

    const zoomed_width = Math.round(this._opt.pageSize.width * zoom);
    const zoomed_height = Math.round(this._opt.pageSize.height * zoom);

    this.canvasFb.setZoom(zoom);
    this.canvasFb.setWidth(zoomed_width);
    this.canvasFb.setHeight(zoomed_height);

    this.scrollBoundaryCheck();
  };

  zoomToPoint = (pt: Point, zoom: number, animate = true) => {
    const z1 = this.calcScaleFactor(this._opt.viewFit, zoom);

    let x1 = this.offset.x;
    let y1 = this.offset.y;

    if (pt) {
      const z0 = this.offset.zoom;

      const x0 = this.offset.x;
      const y0 = this.offset.y;
      x1 = (pt.x * (z0 - z1)) / z0 + x0;
      y1 = (pt.y * (z0 - z1)) / z0 + y0;
    }

    const z = zoom;

    this.offset.x = x1;
    this.offset.y = y1;
    this.offset.zoom = z;

    const zoomed_width = Math.round(this._opt.pageSize.width * z);
    const zoomed_height = Math.round(this._opt.pageSize.height * z);

    this.canvasFb.setZoom(z);
    this.canvasFb.setWidth(zoomed_width);
    this.canvasFb.setHeight(zoomed_height);

    // console.log(`VIEW SIZE${callstackDepth()} zoomToPoint: ${oldOffsetZoom} old/new=${oldZoom}(${oldWidth},${oldHeight})/${newZoom}(${newWidth},${newHeight}) zoom=${z} ${zoomed_width}, ${zoomed_height} = ${zoomed_width / zoomed_height}`);
    this.scrollBoundaryCheck();
  };

  /**
   * @protected
   * @param {{x:number, y:number, f?:number}} ncodeXY
   */
  public ncodeToPdfXy_default = (ncodeXY: { x: number; y: number; f?: number }, rotatioinIndep?: boolean) => {
    const { x, y, f } = ncodeXY;
    const { Xmin, Ymin } = this.paperBase;
    const px = (x - Xmin) * NU_TO_PU;
    const py = (y - Ymin) * NU_TO_PU;

    return { x: px, y: py, f };
  };

  protected pdfToNcodeXy_default = (ncodeXY: { x: number; y: number; f?: number }) => {
    const { x, y, f } = ncodeXY;
    const { Xmin, Ymin } = this.paperBase;
    const nx = x * PU_TO_NU + Xmin;
    const ny = y * PU_TO_NU + Ymin;

    return { x: nx, y: ny, f };
  };

  public ncodeToPdfXy_strokeHomography = (ncodeXY: { x: number; y: number; f?: number }, stroke_h: TransformParameters) => {
    const { x, y } = ncodeXY;

    const { a, b, c, d, e, f, g, h } = stroke_h;

    const nominator = g * x + h * y + 1;
    const px = (a * x + b * y + c) / nominator;
    const py = (d * x + e * y + f) / nominator;

    return { x: px, y: py, f: ncodeXY.f };
  };

  protected pdfToNcodeXy_strokeHomography = (ncodeXY: { x: number; y: number; f?: number }, stroke_h_rev: TransformParameters) => {
    const { x, y } = ncodeXY;

    const { a, b, c, d, e, f, g, h } = stroke_h_rev;

    const nominator = 1 / (g * x + h * y + 1);
    const px = (a * x + b * y + c) / nominator;
    const py = (d * x + e * y + f) / nominator;

    return { x: px, y: py, f: ncodeXY.f };
  };

  public ncodeToPdfXy_homography = (ncodeXY: { x: number; y: number; f?: number }) => {
    const { x, y } = ncodeXY;

    const { a, b, c, d, e, f, g, h } = this._opt.h;

    const nominator = g * x + h * y + 1;
    const px = (a * x + b * y + c) / nominator;
    const py = (d * x + e * y + f) / nominator;

    return { x: px, y: py, f: ncodeXY.f };
  };

  protected pdfToNcodeXy_homography = (ncodeXY: { x: number; y: number; f?: number }) => {
    const { x, y } = ncodeXY;

    const { a, b, c, d, e, f, g, h } = this._opt.h_rev;

    const nominator = 1 / (g * x + h * y + 1);
    const px = (a * x + b * y + c) / nominator;
    const py = (d * x + e * y + f) / nominator;

    return { x: px, y: py, f: ncodeXY.f };
  };

  /**
   * @protected
   * @param {{x:number, y:number, f?:number}} ncodeXY
   */
  protected ncodeToPdfXy = (ncodeXY: { x: number; y: number; f?: number }) => {
    const ret = this.funcNcodeToPdfXy(ncodeXY);
    const { x, y, f } = ret;

    return { x: x * PATH_THICKNESS_SCALE, y: y * PATH_THICKNESS_SCALE, f };
  };

  protected pdfToNcodeXy = (pdfXY: { x: number; y: number; f?: number }) => {
    const ret = this.funcPdfToNcodeXy(pdfXY);
    const { x, y, f } = ret;

    return { x: x * PATH_THICKNESS_SCALE, y: y * PATH_THICKNESS_SCALE, f };
  };

  /**
   * @protected
   * @param {{x:number, y:number}} pdfXY
   */
  protected pdfToScreenXy = (pdfXY: { x: number; y: number }) => {
    const { x, y } = pdfXY;

    const canvasFb = this.canvasFb;
    const vpt = canvasFb.viewportTransform;

    // const zoom = this.canvasFb.getZoom();
    // const offset_x = vpt[4];
    // const offset_y = vpt[5];

    const zoom = this.offset.zoom;
    const offset_x = this.offset.x;
    const offset_y = this.offset.y;

    const sx = x * zoom + offset_x;
    const sy = y * zoom + offset_y;

    return { x: sx, y: sy };
  };

  protected layerToPdfXy = (layerXY: { x: number; y: number }) => {
    const { x, y } = layerXY;

    const zoom = this.offset.zoom;

    const px = x / zoom;
    const py = y / zoom;

    return { x: px, y: py };
    // return { x: offset_x, y: offset_y };
  };

  protected screenToPdfXy = (screenXY: { x: number; y: number }) => {
    const { x, y } = screenXY;

    const canvasFb = this.canvasFb;
    const vpt = canvasFb.viewportTransform;

    const zoom = this.offset.zoom;
    // const offset_x = this.offset.x + this._opt.position.offsetX;
    // const offset_y = this.offset.y + this._opt.position.offsetY;

    const px = (x - this.offset.x) / zoom;
    const py = (y - this.offset.y) / zoom;

    return { x: px, y: py };
    // return { x: offset_x, y: offset_y };
  };

  /**
   *
   * @param mode
   * @param szPaper
   * @param currScale
   */
  protected calcScaleFactor(mode: ZoomFitEnum, currScale: number) {
    const szPaper = this._opt.pageSize;
    if (!szPaper.width) return currScale;

    const szCanvas = { ...this._opt.viewSize };
    szCanvas.width -= this._opt.fitMargin;
    szCanvas.height -= this._opt.fitMargin * szCanvas.height / szCanvas.width;

    let scale = 0;
    switch (mode) {
      case ZoomFitEnum.WIDTH:
        scale = szCanvas.width / szPaper.width;
        break;

      case ZoomFitEnum.HEIGHT:
        scale = szCanvas.height / szPaper.height;
        break;

      case ZoomFitEnum.FULL:
        scale = Math.min(szCanvas.width / szPaper.width, szCanvas.height / szPaper.height);
        break;

      case ZoomFitEnum.ACTUAL:
        scale = 1;
        break;

      default:
        scale = currScale;

        break;
    }
    return scale;
  }

  /**
   * @protected
   * @param {{x:number, y:number}} dot
   */
  protected focusToDot = (dot: NeoDot) => {
    if (!this._opt.autoFocus) return;
    const margin_to_go_ratio = 0.25;
    const screen_xy = this.pdfToScreenXy(dot.point);

    let dx = 0,
      dy = 0;
    let shouldScroll = false;

    const offset_x = this.offset.x;
    const offset_y = this.offset.y;

    if (screen_xy.x < 0) {
      // scroll to left
      const target = this._opt.viewSize.width * margin_to_go_ratio;
      dx = target - screen_xy.x;
      shouldScroll = true;
    }

    if (screen_xy.y < 0) {
      // scroll to top
      const target = this._opt.viewSize.height * margin_to_go_ratio;
      dy = target - screen_xy.y;
      shouldScroll = true;
    }

    if (screen_xy.x > this._opt.viewSize.width) {
      // scroll to right
      const target = this._opt.viewSize.width * (1 - margin_to_go_ratio);
      dx = target - screen_xy.x;
      shouldScroll = true;
    }

    if (screen_xy.y > this._opt.viewSize.height) {
      // scroll to bottom
      const target = this._opt.viewSize.height * (1 - margin_to_go_ratio);
      dy = target - screen_xy.y;
      shouldScroll = true;
    }

    if (shouldScroll) {
      const new_offset_x = offset_x + dx;
      const new_offset_y = offset_y + dy;

      this.scrollCanvasToPoint({ x: new_offset_x, y: new_offset_y }, false);
    }
  };

  /**
   *
   * @param {{x:number, y:number}} point
   * @param {boolean} animate
   */
  protected scrollCanvasToPoint = (point: { x: number; y: number }, animate: boolean) => {
    const canvasFb = this.canvasFb;

    if (animate) {
      if (this.scrollAnimateTimer) {
        window.clearInterval(this.scrollAnimateTimer);
        this.scrollAnimateTimer = null;
      }
      let x0 = this.offset.x;
      let y0 = this.offset.y;
      const x1 = point.x;
      const y1 = point.y;

      /** 10 단계 */
      const div = 10;
      const step_x = (x1 - x0) / div;
      const step_y = (y1 - y0) / div;
      let count = 0;

      this.scrollAnimateTimer = window.setInterval(() => {
        x0 += step_x;
        y0 += step_y;
        this.offset.x = x0;
        this.offset.y = y0;

        this.scrollBoundaryCheck();
        canvasFb.requestRenderAll();

        count++;
        if (count === div) {
          window.clearInterval(this.scrollAnimateTimer);
          this.scrollAnimateTimer = null;
          canvasFb.setViewportTransform(canvasFb.viewportTransform);
        }
      }, 20);
    } else {
      this.offset.x = point.x;
      this.offset.y = point.y;

      this.scrollBoundaryCheck();
      canvasFb.requestRenderAll();
      canvasFb.setViewportTransform(canvasFb.viewportTransform);
    }
  };

  setRotation = (rotation: number, pdfSize: { scale: number; width: number; height: number }) => {
    console.log(`RenderWorkerBase: setRotation to ${rotation}`);
    this._opt.rotation = rotation;

    switch (rotation) {
      case 90: {
        this._opt.h = calcRotatedH90(this.h, { width: pdfSize.width, height: pdfSize.height });
        break;
      }
      case 180: {
        this._opt.h = calcRotatedH180(this.h, { width: pdfSize.height, height: pdfSize.width });
        break;
      }
      case 270: {
        this._opt.h = calcRotatedH270(this.h, { width: pdfSize.width, height: pdfSize.height });
        break;
      }
      default: {
        this._opt.h = this.h;
        break;
      }
    }
    this._opt.h_rev = calcRevH(this._opt.h);
  };

  setTransformParameters = (h: TransformParameters, pdfSize_pu: ISize) => {
    this.h = { ...h };
    // this.h_rev = calcRevH(h);
    
    switch (this._opt.rotation) {
      case 90: {
        this._opt.h = calcRotatedH90(this.h, { width: pdfSize_pu.height, height: pdfSize_pu.width });
        break;
      }
      case 180: {
        this._opt.h = calcRotatedH180(this.h, { width: pdfSize_pu.width, height: pdfSize_pu.height });
        break;
      }
      case 270: {
        this._opt.h = calcRotatedH270(this.h, { width: pdfSize_pu.height, height: pdfSize_pu.width });
        break;
      }
      default: {
        this._opt.h = h;
        break;
      }
    }

    this._opt.h_rev = calcRevH(this._opt.h);

    if (h) {
      this.funcNcodeToPdfXy = this.ncodeToPdfXy_homography;
      this.funcPdfToNcodeXy = this.pdfToNcodeXy_homography;
    } else {
      this.funcNcodeToPdfXy = this.ncodeToPdfXy_default;
      this.funcPdfToNcodeXy = this.pdfToNcodeXy_default;
    }
  };
}
