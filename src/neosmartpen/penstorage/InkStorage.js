import "../types";
import { initStroke, strokeAddDot, closeStroke } from "./neostroke";
import Dispatcher from "./EventSystem";
import { PenEventName } from "../pencomm/neosmartpen";

/** @type {InkStorage} */
let _storage_instance = null;




export default class InkStorage {
  /** @type {InkStorage} */
  // static instance;
  constructor() {
    if (_storage_instance) return _storage_instance;

    /** @type {Array.<NeoStroke>} */
    this.completed = [];            // completed strokes

    /** @type {Map.<string, NeoStroke>} - sourceKey ("uuid" + "mac") ==> Stroke */
    this.realtime = new Map();    // realtime strokes (incompleted strokes)

    /** @type {Map.<string, Array.<NeoStroke>>} - (pageId) ==> ({penId : NeoStroke[]}) */
    this.completedOnPage = new Map();

    /** @type {Map.<string, Map.<string,NeoStroke> >} - (pageId) ==> ({strokeKey : NeoStroke}) */
    this.realtimeOnPage = new Map();

    _storage_instance = this;

    this.dispatcher = new Dispatcher();

    /** @type {{section:number, book:number, owner:number, page:number}} */
    this.lastPageInfo = { section: -1, book: -1, owner: -1, page: -1 };

  }

  static getInstance() {
    if (_storage_instance) return _storage_instance;

    _storage_instance = new InkStorage();
    return _storage_instance;
  }

  /**
   * @public
   * @param {string} eventName 
   * @param {function} listener 
   * @param {{mac:string}} filter
   */
  addEventListener(eventName, listener, filter) {
    this.dispatcher.on(eventName, listener, filter);
    console.log("bound", listener);
  }

  /**
   * @public
   * @param {string} eventName 
   * @param {function} listener 
   */
  removeEventListener(eventName, listener) {
    this.dispatcher.off(eventName, listener);
  }


  /**
   * @public
   * @param {{section:number, owner:number, book:number, page:number}} pageInfo 
   * @return {Array.<NeoStroke>}
   */
  getPageStrokes(pageInfo) {
    const { section, book, owner, page } = pageInfo;
    const pageId = this.getPageId(section, book, owner, page);

    let completed = this.completedOnPage;
    let arr = completed.get(pageId);
    if (arr) return arr;

    return [];
  }

  /**
   * @public
   * @param {{section:number, owner:number, book:number, page:number}} pageInfo 
   * @return {Array.<NeoStroke>}
   */
  getPageStrokes_live(pageInfo) {
    const { section, book, owner, page } = pageInfo;
    const pageId = this.getPageId(section, book, owner, page);


    /** @type {Map.<string, Map>} - (pageId) ==> (strokeKey ==> NeoStroke) */
    let realtime = this.realtimeOnPage;

    /** @type {Map.<string, NeoStroke>} - (strokeKey) ==> (NeoStroke) */
    let penStrokesMap = realtime.get(pageId);

    if (penStrokesMap) {
      /** @type {Array.<NeoStroke>} */
      let arr = [];
      penStrokesMap.forEach((value, key) => {
        arr.push(value);
      });

      return arr;
    }

    return [];
  }

  /**
   * @public
   * @return {{section:number, owner:number, book:number, page:number}}
   */
  getLastPageInfo() {
    return this.lastPageInfo;
  }


  /**
   * @private
   * @param {NeoStroke} stroke
   */
  addCompletedToPage(stroke) {
    const { section, book, owner, page } = stroke;
    const pageId = this.getPageId(section, book, owner, page);
    // console.log( `add completed: ${mac},  ${pageId} = ${section}.${book}.${owner}.${page} `);

    // stroke에 점이 하나라도 있어야 옮긴다.
    if (stroke.dotArray.length > 0) {
      // 배열이 없으면 만들어 준다.

      /** @type {Map.<string, Array.<NeoStroke>>} - (pageId) ==> (NeoStroke[]) */
      let completed = this.completedOnPage;
      if (!completed.has(pageId)) {
        completed.set(pageId, new Array(0));
      }

      // 배열에 넣는다.
      /** @type {Array.<NeoStroke>} */
      let arr = completed.get(pageId);
      arr.push(stroke);

      this.lastPageInfo = { section, book, owner, page };
      // console.log(completed);
    }
  }

  /**
   * @private
   * @param {NeoStroke} stroke
   */
  addRealtimeToPage(stroke) {
    const { section, book, owner, page, key } = stroke;
    let pageId = this.getPageId(section, book, owner, page);


    /** @type {Map.<string, Map>} - (pageId) ==> (strokeKey ==> NeoStroke) */
    let realtime = this.realtimeOnPage;
    if (!realtime.has(pageId)) realtime.set(pageId, new Map());

    /** @type {Map.<string, NeoStroke>} - (strokeKey) ==> (NeoStroke) */
    let penStrokesMap = realtime.get(pageId);

    const strokeKey = key;
    penStrokesMap.set(strokeKey, stroke);
  }

  /**
   * @private
   * @param {NeoStroke} stroke
   */
  removeFromRealtime(stroke) {
    const { section, book, owner, page, key } = stroke;
    let pageId = this.getPageId(section, book, owner, page);

    /** @type {Map.<string, Map>} - (pageId) ==> (strokeKey ==> NeoStroke) */
    let realtime = this.realtimeOnPage;
    if (realtime.has(pageId)) {
      /** @type {Map.<string, NeoStroke>} - (strokeKey) ==> (NeoStroke) */
      let penStrokesMap = realtime.get(pageId);

      const strokeKey = key;
      penStrokesMap.delete(strokeKey);
    }

    this.realtime[key] = null;
  }

  /**
   * @private
   * @param {number} section
   * @param {number} book
   * @param {number} owner
   * @param {number} page
   */
  getPageId(section, book, owner, page) {
    return `${section}.${book}.${owner}.${page}`;
  }


  /**
   * create realtime stroke, wait for "appendDot", ..., "closeStroke"
   * @public
   * @param {string} mac
   * @param {number} time
   *
   * @return {NeoStroke} strokeKey
   */
  openStroke(mac, time, penType, penColor) {
    // let stroke = new NeoStroke(mac);

    let stroke = initStroke(-1 /* section */, -1 /* owner */, -1 /*book */, -1 /* page */, time, mac);
    stroke.color = penColor;
    stroke.thickness = 1;     // kitty
    stroke.penTipMode = 0;    // kitty

    // stroke.init(section, owner, book, page, startTime);

    let strokeKey = stroke.key;
    if (this.realtime[strokeKey]) this.realtime[strokeKey] = null;
    this.realtime[strokeKey] = stroke;

    // hand the event
    this.dispatcher.dispatch(PenEventName.ON_PEN_DOWN, { strokeKey, mac, time, stroke });

    return stroke;
  }


  /**
   * create realtime stroke, wait for "appendDot", ..., "closeStroke"
   * @public
   * @param {string} strokeKey
   * @param {number} owner
   * @param {number} book
   * @param {number} page
   * @param {number} time
   */
  setStrokeInfo(strokeKey, section, owner, book, page, time) {
    let stroke = this.realtime[strokeKey];
    stroke.section = section;
    stroke.owner = owner;
    stroke.book = book;
    stroke.page = page;

    this.addRealtimeToPage(stroke);

    // hand the event
    this.dispatcher.dispatch(PenEventName.ON_PEN_PAGEINFO, { strokeKey, mac: stroke.mac, stroke, section, owner, book, page, time });
  }

  /**
   * 
   * @param {string} strokeKey 
   * @return {NeoStroke}
   */
  getRealTimeStroke(strokeKey) {
    /** @type {NeoStroke} */
    let stroke = this.realtime[strokeKey];
    if (!stroke) {
      console.error(`stroke was not initiated`);
      return null;
    }

    return stroke;
  }


  /**
   * add dot to the stroke opened
   * @public
   * @param {string} strokeKey
   * @param {NeoDot} dot
   */
  appendDot(strokeKey, dot) {
    /** @type {NeoStroke} */
    let stroke = this.realtime[strokeKey];
    if (!stroke) {
      console.error(`stroke was not initiated`);
      console.error(dot);
      return;
    }

    // stroke.addDot(dot);
    strokeAddDot(stroke, dot);

    // hand the event
    this.dispatcher.dispatch(PenEventName.ON_PEN_MOVE, { strokeKey, mac: stroke.mac, stroke, dot });
  }

  /**
   * close stroke to move to "completed"
   * @public
   * @param {string} strokeKey
   */
  closeStroke(strokeKey) {
    /** @type {NeoStroke} */
    let stroke = this.realtime[strokeKey];
    if (!stroke) {
      console.error(`stroke was not initiated`);
      return;
    }

    // stroke.close();
    closeStroke(stroke);

    this.completed.push(stroke);

    this.addCompletedToPage(stroke);
    this.removeFromRealtime(stroke);

    // hand the event
    const { mac, section, owner, book, page } = stroke;
    this.dispatcher.dispatch(PenEventName.ON_PEN_UP, { strokeKey, mac, stroke, section, owner, book, page });
  }

  getState() {
    /** @type {Object} */
    let strokesCountPage = {};
    this.completedOnPage.forEach((strokes, pageId) => {
      strokesCountPage[pageId] = strokes.length;
    });

    let stokresCountRealtime = {};
    this.realtimeOnPage.forEach((strokeMap, pageId) => {

      let dotCount = {};
      strokeMap.forEach((stroke, strokeKey) => {
        dotCount[strokeKey] = stroke.dotCount;
      });

      stokresCountRealtime[pageId] = {
        stroke_count: strokeMap.size,
        dot_count: dotCount,
      };
    });
  }
}