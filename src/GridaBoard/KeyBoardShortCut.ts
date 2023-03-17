
// 2020-12-09 현재 구현되어 있는 기능까지 단축키 완성(추가 구현된 기능 넣고 다른 버튼들 단축키 지정하기)

import { store } from "./client/pages/GridaBoard";
import { IBrushType, ZoomFitEnum } from "nl-lib/common/enums";
import PenManager from "nl-lib/neosmartpen/PenManager";
import { setActivePageNo } from "./store/reducers/activePageReducer";
import GridaDoc, {addBlankPage} from "./GridaDoc";
import { setViewFit } from "./store/reducers/viewFitReducer";
import { setZoomStore } from "./store/reducers/zoomReducer";
import { setRotationTrigger } from "./store/reducers/rotate";
import { showAlert } from "./store/reducers/listReducer";
import { PEN_THICKNESS } from '../nl-lib/common/enums';
import $ from "jquery";
import { setPointerTracer } from "./store/reducers/pointerTracer";
import { setleftDrawerOpen, setSaveOpen, showShortCut } from './store/reducers/ui';
import { onToggleRotate } from "./components/buttons/RotateButton";
import { fileOpenHandler } from "./Layout/HeaderLayer";
import { startPrint } from "../nl-lib/ncodepod/NcodePrint/PrintNcodedPdfButton";
import { scrollToThumbnail } from "../nl-lib/common/util/functions";
import { setGestureMode, setHideCanvasMode } from "./store/reducers/gestureReducer";
import { firebaseAnalytics } from "./util/firebase_config";

/* 
let _isCtrl = false;
let _isAlt = false;
let _isShift = false;

export function KeyBoardShortCut_keyup(evt: KeyboardEvent) {
  if (evt.defaultPrevented) {
    return; // Should do nothing if the default action has been cancelled
  }
  const isCtrl = evt.ctrlKey, isAlt = evt.altKey, isShift = evt.shiftKey;


  const cmd = (isCtrl ? 1 : 0) | (isAlt ? 2 : 0) | (isShift ? 4 : 0) | (evt.metaKey ? 8 : 0);

  console.log(`key up cmd=${cmd} ==> code=${evt.code}  key => ${evt.key}`);

}
 */

export default function KeyBoardShortCut(evt: KeyboardEvent) {
  if (evt.defaultPrevented) {
    return; // Should do nothing if the default action has been cancelled
  }
  const isCtrl = evt.ctrlKey, isAlt = evt.altKey, isShift = evt.shiftKey;

  const cmd = (isCtrl ? 1 : 0) | (isAlt ? 2 : 0) | (isShift ? 4 : 0) | (evt.metaKey ? 8 : 0);

  console.log(evt);
  // console.log(`key down cmd=${cmd} ==> code=${evt.code}  key => ${evt.key}`); 
  let code = evt.code;

  if(code === ""){
    // neolab cloud event
    code = evt.key;
  }
  if (cmd == 0 || (isShift && evt.key === "+")) {
    switch (code) {
      case "Digit0":
      case "Numpad0":
      case "Digit1":
      case "Numpad1":
      case "Digit2":
      case "Numpad2":
      case "Digit3":
      case "Numpad3":
      case "Digit4":
      case "Numpad4":
      case "Digit5":
      case "Numpad5":
      case "Digit6":
      case "Numpad6":
      case "Digit7":
      case "Numpad7":
      case "Digit8":
      case "Numpad8":
      case "Digit9":
      case "Numpad9":
        {
          if(code.indexOf("Numpad") === -1){
            const color_num = evt.keyCode - 0x30;
            PenManager.getInstance().setColor(color_num);
          }
        }

        break;

      case "KeyA": // a
        // setPenThickness(1);
        break;

      case "KeyB": // b
        PenManager.getInstance().setThickness(PEN_THICKNESS.THICKNESS5);
        break;

      case "KeyC": // c
        PenManager.getInstance().setThickness(PEN_THICKNESS.THICKNESS3);
        break;

      case "KeyD": // d
        // setPenThickness(3);
        showAlert({
          type: "deletePage",
          selected: null,
        })
        break;

      case "KeyE": // e
        // setPenType(PenType.ERASER);
        PenManager.getInstance().setPenRendererType(IBrushType.ERASER);
        break;

      case "KeyF": // f
        // setPenThickness(4);
        break;

      case "KeyG": // g
        // setPenThickness(5);
        break;

      case "KeyH": // h
        // onBtn_fitHeight();
        setViewFit(ZoomFitEnum.HEIGHT);
        break;
      case "KeyL":{ //L
        const activePageNo = store.getState().activePage.activePageNo;
        const leftDrawerOpen = store.getState().ui.simpleUiData.leftDrawerOpen;
        if(activePageNo === -1) break ;
        setleftDrawerOpen(!leftDrawerOpen);
        break;
      }
      case "KeyP":{ // P
        evt.preventDefault(); //web 기본 탭 기능 정지
        const activePageNo = store.getState().activePage.activePageNo;
        //페이지가 하나도 없으면 인쇄 못함
        if(activePageNo === -1) break;

        startPrint();
        break;
  
      }
      case "KeyQ": // q
        // setPenType(PenType.PEN);
        PenManager.getInstance().setPenRendererType(IBrushType.PEN);
        break;

      case "KeyR": // r
        PenManager.getInstance().setPenRendererType(IBrushType.MARKER);
        break;

      case "KeyS":{ // s => pdf save기능
        evt.preventDefault(); //web 기본 탭 기능 정지
        const activePageNo = store.getState().activePage.activePageNo;
        //페이지가 하나도 없으면 저장 못함
        if(activePageNo === -1) break;
        setSaveOpen(true);
        break;
      }
      case "KeyT": {// t
          const isTrace = store.getState().pointerTracer.isTrace;
          store.dispatch(setPointerTracer(!isTrace));
          break;
        }

      case "KeyV": // v
        // onBtn_fitPaper();
        PenManager.getInstance().setThickness(PEN_THICKNESS.THICKNESS4);
        break;

      case "KeyW": // w
        setViewFit(ZoomFitEnum.WIDTH);
        break;
      case "KeyX" : {
        PenManager.getInstance().setThickness(PEN_THICKNESS.THICKNESS2);
        break;
      }
      case "KeyY" : {
        const activePageNo = store.getState().activePage.activePageNo;
        if(activePageNo === -1) return ;

        showAlert({
          type: "clearPage",
          selected: null,
        })
        break;
      }
      case "KeyZ" : {
        PenManager.getInstance().setThickness(PEN_THICKNESS.THICKNESS1);
        break;
      }
      case "Tab": {// <TAB>
        evt.preventDefault(); //web 기본 탭 기능 정지
        firebaseAnalytics.logEvent(`rotate_page_mouse`, {
          event_name: `rotate_page_mouse`
        });
        onToggleRotate();
        break;
      }

      // page up
      // case "Keypageup":
      case "ArrowLeft": {// 키보드 ←  
        console.log("111111111111111111111111111");
        if(document.querySelector("#grida-main-view").clientHeight < (document.querySelector("#grida-main-view") as HTMLElement).offsetHeight){
          //하단 스크롤 존재
          return ;
        }
        const activePageNo = store.getState().activePage.activePageNo;
        if (activePageNo <= 0) {
          return;
        }
        setActivePageNo(activePageNo-1);
        scrollToThumbnail(activePageNo-1, evt);
        firebaseAnalytics.logEvent(`prev_page_mouse`, {
          event_name: `prev_page_mouse`
        });
        break;
      }
      // page down
      // case "pagedown":
      case "ArrowRight": {// →  
        if(document.querySelector("#grida-main-view").clientHeight < (document.querySelector("#grida-main-view") as HTMLElement).offsetHeight){
          //하단 스크롤 존재
          return ;
        }
        const activePageNo = store.getState().activePage.activePageNo;
        const numDocPages = store.getState().activePage.numDocPages;
        if (activePageNo === numDocPages-1) {
          return;
        }
        setActivePageNo(activePageNo+1);
        scrollToThumbnail(activePageNo+1, evt);
        firebaseAnalytics.logEvent(`next_page_mouse`, {
          event_name: `next_page_mouse`
        });
        break;
      }

      case "Equal" : {
        if(isShift){
          setViewFit(ZoomFitEnum.FREE);
          const zoom = store.getState().zoomReducer.zoom;
          const delta = -100;
          const newZoom = zoom * 0.9985 ** delta
          setZoomStore(newZoom);
        }

        break;
      }
      case "NumpadAdd": {
        setViewFit(ZoomFitEnum.FREE);
        const zoom = store.getState().zoomReducer.zoom;
        const delta = -100;
        const newZoom = zoom * 0.9985 ** delta
        setZoomStore(newZoom);
        break;
      }

      case "Minus" :
      case "NumpadSubtract": {
        setViewFit(ZoomFitEnum.FREE);
        const zoom = store.getState().zoomReducer.zoom;
        const delta = 100;
        const newZoom = zoom * 0.9985 ** delta
        setZoomStore(newZoom);
        break;
      }
      case "Escape" : {
        const activePageNo = store.getState().activePage.activePageNo;
        if(activePageNo === -1) break ;
        setleftDrawerOpen(false);
        break ;
      }

    }
  } else if (cmd == 4) {
    switch (evt.key) {
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
        // togglePenStrokeVisible(evt.keyCode - 0x30);
        break;
      case "0":
        // toggleAllStrokesVisible();
        break;
    }
    switch (code){
      case "KeyG" : { // shift + G 제스처 기능 온오프
        evt.preventDefault(); //web 기본 오픈 기능 강제 스탑
        setGestureMode(!store.getState().gesture.gestureMode);
        break ;
      }
      case "KeyH" : { // shift + H 필기 숨기기
        evt.preventDefault(); //web 기본 오픈 기능 강제 스탑
        setHideCanvasMode(!store.getState().gesture.hideCanvasMode);
        break ;
      }
      case "KeyN" : { // shift + N 새 페이지
        evt.preventDefault(); //web 기본 오픈 기능 강제 스탑
        console.log("%cADD PAGE : 키보드 숏컷", "color:red;font-size:25px")
        addBlankPage();
        break ;
      }
    }
  } else if (cmd == 1) {
    switch (code) {
      case "KeyO":{ // ctrl-o
        evt.preventDefault(); //web 기본 오픈 기능 강제 스탑
        fileOpenHandler("");
        break;
      }
      case "KeyZ": // ctrl-Z
        // onBtnUndo();
        break;

      case "KeyY": // ctrl-Z
        // onBtnRedo();
        break;

      // ctrl - page up
      case "Home": {
        const pageNo = 0;
        setActivePageNo(pageNo);

        // onPrevPage();
        break;
      }

      // ctrl - page down
      case "End": {
        const doc = GridaDoc.getInstance();
        const pageNo = doc.numPages - 1;
        setActivePageNo(pageNo);

        // onPrevPage();
        break;
      }

      case "Equal" : 
      case "NumpadAdd": 
      case "Minus" :
      case "NumpadSubtract": {
        evt.cancelBubble = true;
        evt.returnValue = false;
        break;
      }
    }
  } else if(cmd == 2){
    switch (evt.key.toLocaleLowerCase()) {
      case "alt" : {
        evt.preventDefault(); //web 기본 오픈 기능 강제 스탑
        showShortCut(!store.getState().ui.shotcut.show);
        break; 
      }
    }
  }

  // if (handled) {
  //   evt.preventDefault();
  // }
}
