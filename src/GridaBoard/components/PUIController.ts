import $ from 'jquery';
import { store } from "GridaBoard/client/pages/GridaBoard";
import { IBrushType, PageEventName, PEN_THICKNESS, ZoomFitEnum } from 'nl-lib/common/enums';
import PenManager from 'nl-lib/neosmartpen/PenManager';
import { setViewFit } from 'GridaBoard/store/reducers/viewFitReducer';
import { setZoomStore } from 'GridaBoard/store/reducers/zoomReducer';
import { setActivePageNo } from 'GridaBoard/store/reducers/activePageReducer';
import { setPointerTracer } from 'GridaBoard/store/reducers/pointerTracer';
import GridaDoc from '../GridaDoc';
import { InkStorage } from 'nl-lib/common/penstorage';


// 2020-12-09 현재 구현되어 있는 부분까지 PUI 완성(페이지 넘어가는 부분과 스트로크 찍히는 오류 수정할 것)
export default class PUIController {
  _ready: Promise<unknown>;
  _owner: number;
  _section: number;
  _book: number;
  _startPage: number;
  _pages: any[];
  _symbols: any[];

  constructor(url) {
    /** @type {Promise} */
    this._ready = this.getPuiXML(url);

    /** @type {number} */
    this._owner = 0;

    /** @type {number} */
    this._section = 0;

    /** @type {number} */
    this._book = 0;

    /** @type {number} */
    this._startPage = 0;

    /** @type {Array.<number>} */
    this._pages = [];

    /** @type {Array.<{pageDelta:number, type:string, left:number, top:number, width:number, height:number, command:string}>} */
    this._symbols = [];
  }

  get ready() {
      return this._ready;
  }

  getPuiXML(url) {
    const self = this;

    return new Promise(function (resolve, reject) {
      $.ajax({
        type: "GET",
        dataType: "xml",
        url: url,
        success: function (xml) {
          console.log(xml);
          // page 정보
          const $bookXml = $(xml).find("book");
          const section = parseInt($bookXml.find("section").text());
          const owner = parseInt($bookXml.find("owner").text());
          const book = parseInt($bookXml.find("code").text());
          const startPage = parseInt($bookXml.find("start_page").text());

          const $pagesXml = $(xml).find("pages");
          const numPages = parseInt($pagesXml.attr("count"));

          self._owner = owner;
          self._section = section;
          self._book = book;
          self._startPage = startPage;
          self._pages = [];

          let i;
          for (i = 0; i < numPages; i++) self._pages.push(startPage + i);

          // symbol 정보
          const xmlData = $(xml).find("symbol");
          const listLength = xmlData.length;

          self._symbols = [];

          $(xmlData).each(function () {
            const pageDelta = parseInt($(this).attr("page"));
            const type = $(this).attr("type"); // 여기서는 Rectangle만 취급한다.
            const left = parseFloat($(this).attr("x"));
            const top = parseFloat($(this).attr("y"));
            const width = parseFloat($(this).attr("width"));
            const height = parseFloat($(this).attr("height"));

            const command = $(this).find("command").attr("param");

            const puiSymbol = {
              pageDelta,
              type,
              left,
              top,
              width,
              height,
              command,
            };
            self._symbols.push(puiSymbol);
          });

          self._symbols.sort(function (a, b) {
            const ax = a.top * 10000 + a.left;
            const bx = b.top * 10000 + b.left;

            return ax - bx;
          });

          resolve(true);
        },
        error: function (error) {
          resolve(false);
        },
        // complete: function () { },
      });
    });
  }

  m(val) {
    return Math.round(val * 10) / 10;
  }

  getCommand(owner, book, page, x, y) {
    if (owner != this._owner || book != this._book) return null;
    const pageDelta = page - this._startPage;
    if (this._pages.findIndex((elem) => elem == page) < 0) return null;

    let i;

    for (i = 0; i < this._symbols.length; i++) {
      const sym = this._symbols[i];

      const x1 = sym.left / 72; // inch
      const x2 = (sym.left + sym.width) / 72; // inch
      const y1 = sym.top / 72;
      const y2 = (sym.top + sym.height) / 72;

      const xx = (x * 56) / 600;
      const yy = (y * 56) / 600;

      if (sym.pageDelta == pageDelta) {
        if (x1 < xx && xx < x2 && y1 < yy && yy < y2) {
          const m = this.m;
          console.log(`(${m(xx)}, ${m(yy)}) in (${m(x1)}, ${m(y1)})-(${m(x2)}, ${m(y2)}) ==> ${sym.command}`);
          return sym.command;
        }
      }
    }

    return null;
  }

  /**
   *
   * @param {string} cmd
   */
  static executeCommand(cmd) {

    const page_num = $('#page_input').val() - 1

    switch (cmd) {
      case "strokesize_1":
      case "0.1": //lamy
        PenManager.getInstance().setThickness(PEN_THICKNESS.THICKNESS1);
        break;

      case "strokesize_2":
      case "0.5": //lamy
        PenManager.getInstance().setThickness(PEN_THICKNESS.THICKNESS3);
        break;

      case "strokesize_3":
      case "1.7": //lamy
        PenManager.getInstance().setThickness(PEN_THICKNESS.THICKNESS5);
        break;

      case "pen":
        PenManager.getInstance().setPenRendererType(IBrushType.PEN); 
        break;

      case "highlighter":
        PenManager.getInstance().setPenRendererType(IBrushType.MARKER);
        break;

      case "erase_brush":
        PenManager.getInstance().setPenRendererType(IBrushType.ERASER);
        break;

      case "#FFE5E5E5": //LG
      case "white":
        PenManager.getInstance().setColor(1)
        break;

      case "#FF000000": //BK
      case "black":
        PenManager.getInstance().setColor(3)
        break;

      case "#FFAAAAAA": // DG
      case "#AAAAAA": //lamy
        PenManager.getInstance().setColor(2)
        break;

      case "#FFFFD001": // YE
      case "yellow":
        PenManager.getInstance().setColor(8)
        break;

      case "#FFFF6500": // OR
        PenManager.getInstance().setColor(9)
        break;

      case "#FFFF0200": // RED
      case "red":
        PenManager.getInstance().setColor(0)
        break;

      case "#FF00ABEB": // BLU
      case "lightblue":
        PenManager.getInstance().setColor(6)
        break;

      case "#FF3CDD00": // GRN
      case "green":
        PenManager.getInstance().setColor(7)
        break;

      case "#FF6C00E2": // PPL
        PenManager.getInstance().setColor(4)
        break;

      case "#FF012EE2": // NAVY
        PenManager.getInstance().setColor(5)
        break;

      case "pointer": {
        const isTrace = store.getState().pointerTracer.isTrace;
        store.dispatch(setPointerTracer(!isTrace));

        const $elem = $(`#${"btn_tracepoint"}`);
        if (!isTrace) {
          const $elem = $("#btn_tracepoint").find(".c2");
          $elem.addClass("checked");
          $('#btn_tracepoint').css('background', 'white');
          $('#tracer_svg_icon').css('color', '#688FFF');
        } else {
          const $elem = $("#btn_tracepoint").find(".c2");
          $elem.removeClass("checked");
          $('#btn_tracepoint').css('background', 'none');
          $('#tracer_svg_icon').css('color', '#58627D');
        }
        break;
      }
      case "erase_all": {
        const activePageNo = store.getState().activePage.activePageNo;
        const doc = GridaDoc.getInstance();
        const pageInfo = doc.getPage(activePageNo).pageInfos[0];
    
        const inkStorage = InkStorage.getInstance();
        inkStorage.dispatcher.dispatch(PageEventName.PAGE_CLEAR, pageInfo);
        inkStorage.removeStrokeFromPage(pageInfo);
        break;
      }
      case "menu_grida":
        break;
      
      case "fit":
        setViewFit(ZoomFitEnum.WIDTH);
        break;

      case "full":
        setViewFit(ZoomFitEnum.HEIGHT);
        break;

      case "full_screen":
        setViewFit(ZoomFitEnum.WIDTH);
        break;

      case "zoom_in": {
        setViewFit(ZoomFitEnum.FREE);
        const zoom = store.getState().zoomReducer.zoom;
        const delta = -100;
        const newZoom = zoom * 0.9985 ** delta
        setZoomStore(newZoom);
        break;
      }
      case "zoom_out": {
        setViewFit(ZoomFitEnum.FREE);
        const zoom = store.getState().zoomReducer.zoom;
        const delta = 100;
        const newZoom = zoom * 0.9985 ** delta
        setZoomStore(newZoom);
        break;
      }
      case "previous": {
        const activePageNo = store.getState().activePage.activePageNo
        if (activePageNo === 0) {
          return;
        }
        setActivePageNo(activePageNo-1);
        break;
      }
      case "next": {
        const activePageNo = store.getState().activePage.activePageNo;
        const numDocPages = store.getState().activePage.numDocPages;
        if (activePageNo === numDocPages-1) {
          return;
        }
        setActivePageNo(activePageNo+1);
        break;
      }
    }
  }
}
