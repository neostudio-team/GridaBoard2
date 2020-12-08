import React from "react";
import { InkStorage, PenEventName, } from "../..";

import StorageRenderWorker, { ZoomFitEnum } from "./StorageRenderWorker";
// import { Paper } from "@material-ui/core";
import { PenManager } from "../../index";
import { uuidv4 } from "../../utils/UtilsFunc";
import { IPageSOBP } from "../../../NcodePrintLib/DataStructure/Structures";


type Props = {
  pageId,
  scale,
  width,
  height,

}

type State = {
  renderer: StorageRenderWorker;
  pageId: string;
  sizeUpdate: number;

  penEventCount: number;
  strokeCount: number;
  liveDotCount: number;

  pageInfo: IPageSOBP;

  viewFit: ZoomFitEnum;

  scale: number;
}

/**
 * 스토리지와 자동으로 연결되는 renderer 
 * TO DO: 2020/11/05
 *    1)  현재는 연결된 모든 펜들의 stroke가 나오게 되어 있는데, 
 *        pen의 ID로 filtering할 수 있도록 property를 넣을 수 있게 할 것
 * 
 *    2)  본 컴포는트는 Storage에서 Event를 받아 rendering하는 것이므로,
 *        Pen에서 realtime으로 event를 받아 rendering하는 별도의 component를 만들 것
 */
class StorageRenderer extends React.Component<Props, State> {
  state = {
    /** @type {StorageRenderWorker} */
    renderer: null,
    pageId: "",

    // rect: {
    //   x: 0,
    //   y: 0,
    //   width: 88.58 * 8 / 600 * 72,
    //   height: 125.28 * 8 / 600 * 72,
    // },
    sizeUpdate: 0,

    penEventCount: 0,
    strokeCount: 0,
    liveDotCount: 0,

    pageInfo: {
      section: -1,
      owner: -1,
      book: -1,
      page: -1,
    },

    scale: 1,

    viewFit: ZoomFitEnum.WIDTH,
  };

  canvasRef;
  myRef;

  inkStorage;
  canvasId;

  size;

  constructor(props) {
    super(props);
    // kitty
    this.canvasRef = React.createRef();
    this.myRef = React.createRef();

    const { pageId, scale } = props;
    let inkStorage = props.inkStorage;

    if (!inkStorage) {
      inkStorage = InkStorage.getInstance();
    }

    this.inkStorage = inkStorage;

    this.state = {
      pageId,
      scale,
      ...this.state
    };

    // // 실시간 데이터 전송을 위해, penStorage와 view를 연결한다.
    if (this.inkStorage) {
      const filter = { mac: null };
      inkStorage.addEventListener(PenEventName.ON_PEN_DOWN, this.onLivePenDown.bind(this), filter);
      inkStorage.addEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo.bind(this), filter);
      inkStorage.addEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove.bind(this), filter);
      inkStorage.addEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp.bind(this), filter);
    }

    this.canvasId = uuidv4();
  }


  /**
   * @public
   * @param {NeoSmartpen} pen 
   */
  listenPenEvent(pen) {
    pen.addEventListener(PenEventName.ON_PEN_DOWN, this.onLivePenDown.bind(this));
    pen.addEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo.bind(this));
    pen.addEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove.bind(this));
    pen.addEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp.bind(this));
  }

  /**
   * @public
   * @param {NeoSmartpen} pen 
   */
  ignorePenEvent(pen) {
    pen.removeEventListener(PenEventName.ON_PEN_DOWN, this.onLivePenDown.bind(this));
    pen.removeEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo.bind(this));
    pen.removeEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove.bind(this));
    pen.removeEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp.bind(this));
  }

  /**
   * 
   * @param {{strokeKey:string, mac:string, time:number, stroke:NeoStroke}} event 
   */
  onLivePenDown = (event) => {
    // console.log(event);
    if (this.state.renderer) {
      this.state.renderer.createLiveStroke(event);
    }
  }

  /**
   * 
   * @param {{strokeKey:string, mac:string, stroke:NeoStroke, section:number, owner:number, book:number, page:number}} event 
   */
  onLivePenPageInfo = (event) => {
    const { penEventCount } = this.state;
    const { section, owner, book, page } = event;

    this.setState({
      penEventCount: penEventCount + 1,
      pageInfo: { section, owner, book, page }
    });

    const inkStorage = this.inkStorage;
    if (inkStorage) {
      const pageStrokesCount = inkStorage.getPageStrokes(event).length;
      this.setState({ strokeCount: pageStrokesCount });
    }

    if (this.state.renderer) {
      this.state.renderer.changePage(section, owner, book, page, false);
    }
    // console.log(event);
  }


  /**
   * 
   * @param {{strokeKey:string, mac:string, stroke:NeoStroke, dot:NeoDot}} event 
   */

  onLivePenMove = (event) => {
    if (this.state.renderer) {
      this.state.renderer.pushLiveDot(event);
    }
    // const { liveDotCount } = this.state;

    // this.setState({ liveDotCount: liveDotCount + 1 });
    // console.log(event);
  }

  /**
   * 
   * @param {{strokeKey:string, mac:string, stroke, section:number, owner:number, book:number, page:number}} event 
   */
  onLivePenUp = (event) => {
    if (this.state.renderer) {
      this.state.renderer.closeLiveStroke(event);
    }

    // const { penEventCount, inkStorage } = this.state;
    // this.setState({ penEventCount: penEventCount + 1 });
    // if (inkStorage) {
    //   let pageStrokesCount = inkStorage.getPageStrokes(event).length;
    //   this.setState({ strokeCount: pageStrokesCount });
    // }
    // console.log(event);
  }



  /**
   * @return {{section:number, owner:number, book:number, page:number}}
   */
  getPageIdNumbers() {
    /** @type {Array.<string>} */
    const numbers = this.state.pageId.split(".");

    const section = parseInt(numbers[0]);
    const owner = parseInt(numbers[1]);
    const book = parseInt(numbers[2]);
    const page = parseInt(numbers[3]);

    return {
      section, owner, book, page
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    const ret_val = true;

    return ret_val;
  }

  initRenderer(size) {
    const {
      scale,
      width,
      height
    } = this.props;

    const rect = { x: 0, y: 0, width, height };
    // const { rect } = this.state;
    // const page = pages.filter((p) => p.pageNumber === pageId)[0];

    const inkStorage = this.inkStorage;
    const options = {
      canvasName: this.canvasId,
      storage: inkStorage,
      viewFit: this.state.viewFit,
    };

    const renderer = new StorageRenderWorker(options);

    // let bg_header = EXAM_FILE_RESOURCES[tab_value].bg_img_header;
    // let bgurl = window.location.origin + bg_header + pageId + ".jpg";
    // // let bgurl = window.location.origin + "/img/3_27_1089_" + pageId + ".jpg";

    renderer.setCanvas(size, "");

    // renderer.setPage(page);
    renderer.preparePage(rect, size, scale);
    // renderer.setSeekHandeler(this.props.seekHandler);
    this.setState({ renderer: renderer });
  }

  componentDidMount() {
    const node = this.myRef.current;
    if (node) {

      const parentHeight = node.offsetHeight;
      const parentWidth = node.offsetWidth;

      console.log(`(width, height) = (${parentHeight}, ${parentWidth})`);
    }

    const size = this.size;
    const { pageId, width, height } = this.props;

    const rect = { x: 0, y: 0, width, height };

    // const page = pages.filter((p) => p.pageNumber === pageId)[0];
    console.log("Draw Stroke size", pageId, "canvas size", size, "rect", rect);

    this.initRenderer(this.size);
    window.addEventListener("resize", this.resizeListener);


    // penManager에 연결 
    const penManager = PenManager.getInstance();
    penManager.registerRenderContainer(this);
  }

  resizeListener = () => {
    this.setState({ sizeUpdate: this.state.sizeUpdate + 1 });

    // const { classes, scaleType, scale } = this.props;
    const { scale, width, height } = this.props;


    const rect = { x: 0, y: 0, width, height };
    // const { rect } = this.state;
    // const { penEventCount } = this.state;
    this.size = this.getSize(scale, rect);

    if (this.state.renderer) {
      // console.log("render resize", this.size)
      this.state.renderer.resize(this.size);
    }
  };

  // getSize_old = (scale, rect) => {


  //   const vertical_margin = 0;
  //   const horizontal_margin = 0; // left 200, right 200

  //   const pageHeight = window.innerHeight - vertical_margin;
  //   let h = pageHeight - 20; // for divider
  //   let w = window.innerWidth - horizontal_margin;

  //   h = h * scale;
  //   w = (h * rect.width) / rect.height;
  //   // scale to width

  //   console.log("!!!!!!!!!", w, h, rect.height, rect.width);
  //   console.log(this);

  //   let size = {
  //     w: w,
  //     h: h,
  //   };

  //   return size;
  // };

  getSize = (scale, rect) => {
    const size = {
      width: rect.width,
      height: rect.height,
    };

    return size;
  };

  componentWillUnmount() {
    // this.state.renderer.stopInterval();
    window.removeEventListener("resize", this.resizeListener);

    // penManager에 연결 해제
    const penManager = PenManager.getInstance();
    penManager.unregisterRenderContainer(this);

    // ink storage와 연결 해제
    // // 실시간 데이터 전송을 위해, penStorage와 view를 연결한다.
    if (this.inkStorage) {
      const inkStorage = this.inkStorage;

      inkStorage.removeEventListener(PenEventName.ON_PEN_DOWN, this.onLivePenDown.bind(this));
      inkStorage.removeEventListener(PenEventName.ON_PEN_PAGEINFO, this.onLivePenPageInfo.bind(this));
      inkStorage.removeEventListener(PenEventName.ON_PEN_MOVE, this.onLivePenMove.bind(this));
      inkStorage.removeEventListener(PenEventName.ON_PEN_UP, this.onLivePenUp.bind(this));
    }


  }

  render() {
    // const { classes, scaleType, scale } = this.props;
    const { scale, width, height } = this.props;
    const { section, owner, book, page } = this.state.pageInfo;

    const rect = { x: 0, y: 0, width, height };
    // const { rect } = this.state;
    const { penEventCount } = this.state;
    this.size = this.getSize(scale, rect);

    return (
      <div id="replayContainer" ref={this.myRef}>
        <h1>StorageRenderer</h1><h2>{section}.{owner}.{book}.{page}:{penEventCount}</h2>
        <canvas id={this.canvasId} ref={this.canvasRef} style={{ height: this.size.height, width: this.size.width }} />
      </div>
    );
  }
}

// StorageRenderer.propTypes = propTypes;
// StorageRenderer.defaultProps = defaultProps;

// export default withStyles(styles)(StorageRenderer);
export default StorageRenderer;