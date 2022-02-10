import React, { Component } from 'react';
import { Typography } from "@material-ui/core";
import { CSSProperties } from '@material-ui/core/styles/withStyles';

import { MAX_RENDERER_PIXELS } from "../RendererConstants";
import { MixedViewProps } from '../MixedPageView';
import { NeoPdfDocument, NeoPdfPage } from 'nl-lib/common/neopdf';
import { PDF_DEFAULT_DPI } from 'nl-lib/common/constants';
import { makeNPageIdStr } from "nl-lib/common/util";

interface PageProps extends MixedViewProps {
  // pdf: PdfJs.PDFDocumentProxy,
  // pdf: NeoPdfDocument,

  position: { offsetX: number, offsetY: number, zoom: number },
  // pdfCanvas: CSSProperties,
}

interface PageState {
  status: string,
  // page: PdfJs.PDFPageProxy | null,
  page: NeoPdfPage,
  imgSrc: string,

  renderCount: number,

  pdf: NeoPdfDocument,
  pdfPageNo: number,
  
  pdfNumPages : number,
  zoom: number,
}

type IBackRenderedStatus = {
  result: boolean,
  px_width: number,
  px_height: number,


}

export default class NeoPdfPageView extends Component<PageProps, PageState> {
  state: PageState = {
    status: 'N/A',
    page: null,
    imgSrc: URL.createObjectURL(new Blob()),
    renderCount: 0,

    pdf: undefined,
    pdfPageNo: -1,
    pdfNumPages : 0,
    zoom: this.props.position?.zoom,
  };

  canvas: HTMLCanvasElement | null = null;

  inRendering = false;

  // renderTask: PdfJs.PDFRenderTask = null;
  renderTask: any = null;

  backPlane = {
    canvas: document.createElement("canvas"),
    inited: false,
    nowRendering: false,
    prevZoom: 0,
    zoomQueue: [] as number[],
    size: { result: false, px_width: 0, px_height: 0 },
  };

  zoomQueue: number[] = [];

  lastPdfFingerprint = "";
  pdfPageNo = -1;

  componentDidMount() {
    const { pdf, pdfPageNo } = this.props;

    // this.setState({ pdf, pdfPageNo });
    // this.loadPage(pdf, pdfPageNo);
  }

  shouldComponentUpdate(nextProps: PageProps, nextState: PageState) {
    // dumpDiffPropsAndState(`State PageView ${this.props.pdfPageNo}:`, this.props, nextProps, this.state, nextState);
    const retVal = false;

    let pdfChanged = nextProps.pdf !== this.state.pdf;
    if ((!!nextProps.pdf) && (!!this.state.pdf)) pdfChanged = pdfChanged || (nextProps.pdf.fingerprint !== this.state.pdf.fingerprint);
    const pdfPageNoChanged = nextProps.pdfPageNo !== this.state.pdfPageNo;
    const pdfMaxChanged = nextProps.pdf !== undefined && nextProps.pdf.numPages !== this.state.pdfNumPages;
    
    if (pdfChanged || pdfPageNoChanged || pdfMaxChanged) {
      this.setState({ pdf: nextProps.pdf, pdfPageNo: nextProps.pdfPageNo , pdfNumPages: (nextProps.pdf === undefined? 1 : nextProps.pdf.numPages)});
      this.loadPage(nextProps.pdf, nextProps.pdfPageNo);
    }

    // rendering을 새로 해야 한다면

    const zoomChanged = nextProps.position.zoom !== this.props.position.zoom;
    if (zoomChanged) {
      this.setState({ zoom: nextProps.position.zoom });
    }

    const rotationChanged = nextProps.rotation !== this.props.rotation;

    // const loaded = nextState.page !== this.state.page;
    // const loaded = nextState.status === "loaded" && (this.state.status !== nextState.status);
    const loaded = nextState.page !== this.state.page;
    if (loaded && nextState.page.pageNo !== -1) {
      // console.log(`*State PageView ${nextProps.pdfPageNo}:* LOADED ${this.state.page?.pageNo} => ${nextState.page?.pageNo}, zoom ${nextState.zoom}, status=${this.state.status} => ${nextState.status}`);
      if (nextState.page && nextProps.pdf && nextState.zoom > 0)
        this.renderPage(nextState.page, nextState.zoom, nextState.pdfPageNo, nextProps.pdf.fingerprint, rotationChanged);
    }

    if (this.state.zoom !== nextState.zoom && nextState.page && nextState.page.pageNo !== -1 && nextProps.pdf) {
      // console.log(`*State PageView ${nextProps.pdfPageNo}:* ZOOM CHANGED ${nextState.zoom}, status=${this.state.status} => ${nextState.status}`);
      this.renderPage(nextState.page, nextState.zoom, nextState.pdfPageNo, nextProps.pdf.fingerprint, rotationChanged);
    }

    if (rotationChanged && nextState.page && nextState.page.pageNo !== -1) { 
      nextState.page.viewport.rotation = nextProps.rotation;
      this.renderPage(nextState.page, nextState.zoom, nextState.pdfPageNo, nextProps.pdf.fingerprint, rotationChanged);
    }

    if(pdfChanged && !nextProps.pdf){
      this.setState({ renderCount: this.state.renderCount + 1 });
    } 

    const rendered = this.state.renderCount !== nextState.renderCount;
    // console.log(`*State PageView ${nextProps.pdfPageNo}:* rendered=${rendered}  this.state.status=${this.state.status} => ${nextState.status}`);
    return rendered;
  }


  scaleCanvas(canvas: HTMLCanvasElement, width: number, height: number, zoom: number) {
    // assume the device pixel ratio is 1 if the browser doesn't specify it
    const devicePixelRatio = window.devicePixelRatio || 1;
    const context = canvas.getContext('2d') as any;

    // determine the 'backing store ratio' of the canvas context
    const backingStoreRatio =
    (
      context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatio ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio || 1
    );

    // determine the actual ratio we want to draw at
    const pdfCssRatio = 96 / 72;
    let ratio = devicePixelRatio * pdfCssRatio * zoom / backingStoreRatio;

    // 최대값을 설정하자
    if (width * height * ratio * ratio > MAX_RENDERER_PIXELS) {
      ratio = Math.sqrt(MAX_RENDERER_PIXELS / width / height);
    }

    const px_width = Math.floor(width * ratio);
    const px_height = Math.floor(height * ratio);

    // set the 'real' canvas size to the higher width/height
    canvas.width = px_width;
    canvas.height = px_height;

    // ...then scale it back down with CSS
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // scale the drawing context so everything will work at the higher ratio
    context.scale(ratio, ratio);

    return { ratio, px: { width: px_width, height: px_height }, css: { width, height } };
  }

  timeOut = (n) => {
    return new Promise(resolve => { setTimeout(() => { resolve(true); }, n); });
  }


  pfp = (pdf: NeoPdfDocument) => {
    if (pdf) return pdf.fingerprint;
    return "N/A";
  }

  setCanvasRef = (canvas: HTMLCanvasElement) => {
    // console.log(`*State PageView ${this.props.pdfPageNo}:* setCanvasRef`);
    this.canvas = canvas;
  };

  loadPage = async (pdf: NeoPdfDocument, pageNo: number) => {
    this.backPlane.inited = false;

    if (!pdf) {
      this.setState({ status: 'N/A' });
      this.lastPdfFingerprint = "";
      return;
    }


    if (pageNo > pdf.numPages) {
      console.error("PDF 페이지의 범위를 넘은 페이지를 렌더링하려고 합니다.");
      pageNo = pdf.numPages;
    }

    if (this.pdfPageNo === pageNo && this.state.pdfNumPages === pdf.numPages && this.lastPdfFingerprint === pdf.fingerprint) {
      console.log(`PDFVIEWER, LOAD  same doc/page`)
      return;
    }

    // console.log(`PDFVIEWER, LOAD  fingerprint= ${pdf.fingerprint}`)

    this.setState({ status: 'loading' });
    const page = await pdf.getPageAsync(pageNo);
    this.lastPdfFingerprint = pdf.fingerprint;
    this.pdfPageNo = pageNo;

    this.backPlane.inited = false;
    this.setState({ page, status: 'loaded' });
  }

  renderToCanvasSafe = async (page: NeoPdfPage, dpi: number, zoom: number, fingerprint: string) => {
    // if (this.backPlane.nowRendering && this.renderTask) {
    //   const renderTask = this.renderTask;
    //   renderTask.cancel();
    //   await renderTask;
    // }
    return this.renderToCanvas(page, dpi, zoom, fingerprint);
  }

  renderToCanvas = async (page: NeoPdfPage, dpi: number, zoom: number, fingerprint: string): Promise<IBackRenderedStatus> => {


    const PRINT_RESOLUTION = dpi * zoom;
    const PRINT_UNITS = PRINT_RESOLUTION / PDF_DEFAULT_DPI;
    const viewport: any = page.getViewport({ scale: 1, rotation: page.viewport.rotation });

    const px_width = Math.floor(viewport.width * PRINT_UNITS);
    const px_height = Math.floor(viewport.height * PRINT_UNITS);

    const retVal = {
      result: false,
      px_width, px_height,
      fingerprint,
      pdfPageNo: page.pageNo,
    };

    if (!px_width || !px_height) return retVal;

    const canvas = document.createElement("canvas");
    canvas.width = px_width;
    canvas.height = px_height;

    const ctx = canvas.getContext('2d');
    try {
      this.backPlane.nowRendering = true;
      const renderContext = {
        canvasContext: ctx,
        transform: [PRINT_UNITS, 0, 0, PRINT_UNITS, 0, 0],
        viewport: page.getViewport({ scale: 1, rotation: viewport.rotation }),
        intent: "print"
      };
      this.renderTask = page.render(renderContext);
      await this.renderTask.promise;
      if (this.lastPdfFingerprint !== fingerprint) {
        retVal.result = false;
        return retVal;
      }

      // this.backPlane.canvas = document.createElement("canvas");
      const destCanvas = this.backPlane.canvas;
      destCanvas.width = canvas.width;
      destCanvas.height = canvas.height;

      const destCtx = destCanvas.getContext("2d");
      destCtx.fillStyle = "#fff";
      destCtx.fillRect(0, 0, destCanvas.width, destCanvas.height);
      destCtx.drawImage(canvas, 0, 0);

      this.backPlane.prevZoom = zoom;
      retVal.result = true;
      this.backPlane.size = { ...retVal };

      this.renderTask = null;
    }
    catch (e) {
      this.renderTask = null;
      this.backPlane.nowRendering = false;
    }

    return retVal;
  }

  renderPage = async (page: NeoPdfPage, zoom: number, pdfPageNo: number, fingerprint: string, rotationChagned: boolean) => {
    this.setState({ status: 'rendering check canvas' });
    if (!this.canvas) {
      console.log(`*State PageView ${pdfPageNo}:* CANVAS NOT FOUND`);
      return;
    }

    if (fingerprint !== this.lastPdfFingerprint) {
      console.log(`*State PageView ${pdfPageNo}:* NOT SAME DOCUMENT`);
      return;
    }

    if (pdfPageNo !== this.pdfPageNo) {
      console.log(`*State PageView ${pdfPageNo}:* NOT SAME PAGE`);
      return;
    }

    // console.log(`BACKPLANE RENDERPAGE start`)

    this.setState({ status: 'rendering' });

    //아래 viewport의 rotation은 설정안해줘도 된다고 생각했는데 안해주면 문제생긴다
    const viewport: any = page.getViewport({ scale: 1, rotation: page.viewport.rotation });
    const { width, height } = viewport;
    const canvas = this.canvas;
    const size = { width, height };
    const ret = this.scaleCanvas(canvas, size.width, size.height, zoom);
    const dpi = canvas.width / zoom / size.width * 72;

    let noLazyUpdate = false;
    if (!this.backPlane.inited) {
      // console.log(`PDFVIEWER, BACKPLANE DRAWING start fingerprint=${fingerprint} / ${this.lastPdfFingerprint}`)

      const result = await this.renderToCanvasSafe(page, dpi, zoom, fingerprint);
      // console.log(`PDFVIEWER, BACKPLANE DRAWING end fingerprint=${fingerprint} / ${this.lastPdfFingerprint}`)
      this.backPlane.inited = result.result;
      this.backPlane.size = { ...result };
      noLazyUpdate = true;
    }

    const displaySize = { width, height };
    const { px_width, px_height } = this.backPlane.size;

    const ctx = canvas.getContext('2d');
    const dw = ret.px.width / ret.ratio;
    const dh = ret.px.height / ret.ratio;

    ctx.drawImage(this.backPlane.canvas, 0, 0, px_width, px_height, 0, 0, dw, dh);
    this.setState({ renderCount: this.state.renderCount + 1, status: 'rendered' });

    // Lazy update
    if ((!noLazyUpdate && this.backPlane.prevZoom !== zoom) || rotationChagned) {
      // console.log(`BACKPLANE RENDERPAGE lazy start`);

      this.zoomQueue.push(zoom);
      await this.timeOut(200);

      const lastZoom = this.zoomQueue[this.zoomQueue.length - 1];
      this.zoomQueue = this.zoomQueue.splice(1);
      if (
        (lastZoom && zoom !== lastZoom) ||
        (!rotationChagned && zoom == this.backPlane.prevZoom) ||
        fingerprint !== this.lastPdfFingerprint ||
        pdfPageNo !== this.pdfPageNo
      ) {
        return;
      }

      const result = await this.renderToCanvasSafe(page, dpi, zoom, fingerprint);
      if (result.result) {
        // this.backPlane.size = { ...result };

        // console.log(`PDFVIEWER, LAZY fingerprint=${fingerprint} / ${this.lastPdfFingerprint}`)
        const { px_width, px_height } = result;
        ctx.drawImage(this.backPlane.canvas, 0, 0, px_width, px_height, 0, 0, dw, dh);
        this.zoomQueue = [];
        this.setState({ renderCount: this.state.renderCount + 1, status: 'lazy-rendered' });
      }
      else {
        // console.log(`lazy back plane CANCELLED`)
      }
      // console.log(`BACKPLANE RENDERPAGE lazy end`);
    }
    // console.log(`BACKPLANE RENDERPAGE end`)
  }


  render = () => {
    const { status } = this.state;
    const pageCanvas: CSSProperties = {
      position: "absolute",
      zoom: 1,
      left: 0,
      top: 0,
      width: 600,
      // background: "#fff"
      visibility: status === "N/A" ? "hidden" : "visible", 
    }

    const shadowStyle: CSSProperties = {
      color: "#088",
      textShadow: "-1px 0 2px #fff, 0 1px 2px #fff, 1px 0 2px #fff, 0 -1px 2px #fff",
    }
    return (

      <div style={pageCanvas} id={`pdf-page ${status}`} >
        <div style={pageCanvas}  >
          <canvas ref={this.setCanvasRef} />
        </div>

        {!this.props.noInfo ?
          < div id={`${this.props.parentName}-info`} style={pageCanvas} >
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
          <Typography style={{ ...shadowStyle, fontSize: 16 }}>PDFViewer </Typography>

            <br /> &nbsp; &nbsp;
          <Typography style={{ ...shadowStyle, fontSize: 10 }}>Page(state):</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, }}> {makeNPageIdStr(this.props.pageInfo)} </Typography>

            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>Page(property):</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, }}> {makeNPageIdStr(this.props.pageInfo)} </Typography>


            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>Base(property):</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {makeNPageIdStr(this.props.basePageInfo)} </Typography>

            <br /> &nbsp; &nbsp;
            <Typography style={{ ...shadowStyle, fontSize: 10 }}>pdfPageNo:</Typography>
            <Typography style={{ ...shadowStyle, fontSize: 14, fontStyle: "initial" }}> {this.props.pdfPageNo} </Typography>

          </div >

          : ""}
      </div>
    );
  }
}

