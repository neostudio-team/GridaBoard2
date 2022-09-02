import firebase from "firebase";
import NDP from "NDP-lib";
import React from "react";
import { SocketReturnData } from "NDP-lib/NSocket";
import { setIsPenControlOwner, setPenList } from "../store/reducers/ndpClient";
import { penControlOwner, PenListData } from "NDP-lib/enum";
import { showAlert } from "../store/reducers/listReducer";
import { store } from "../client/pages/GridaBoard";
import PenManager from "nl-lib/neosmartpen/PenManager";
import { INeoSmartpen } from "../../nl-lib/common/neopen";
import { DeviceTypeEnum, PenEventName } from "../../nl-lib/common/enums";
import GridaApp from "../GridaApp";
import { DPI_TO_UNIT } from "../../nl-lib/common/constants";
import { makePenEvent, PenCommEventEnum } from "../../nl-lib/neosmartpen/pencomm/pencomm_event";





const ndp = new NDP({
  appName : "GRIDABOARD"
});
ndp.setShare();

(window as any).ndp = ndp;
(window as any).test3 = showAlert;
(window as any).test4 = PenManager;

ndp.Client.autoOn("penControlOwner",(res: SocketReturnData)=>{
  if(res.result){
    const data = res.data as penControlOwner;
    setIsPenControlOwner(data);
    if(!data.owned){
      showAlert({type : "lostPenOwner"});
    }
  }
});
ndp.Client.autoOn("penListUpdate",(res: SocketReturnData)=>{
  if(res.result){
    const data = res.data;
    penControl(data.penList);
  }
});
ndp.Client.autoOn("sendDot", (res:SocketReturnData)=>{
  const bluetoothOn = store.getState().ndpClient.bluetoothOn;
  const searchOn = store.getState().ui.simpleUiData.penListSearchOn;
  if(res.result && bluetoothOn && searchOn){
    const dotData = res.data;
    if(dotData.dotType === "DOWN"){
      // const dot = {
      //   "mac":"9c:7b:d2:05:56:0d",
      //   "dotType":"DOWN",
      //   "section":3,
      //   "owner":1013,
      //   "book":2,
      //   "page":2,
      //   "time":1662014802985,
      //   "dot":{
      //     "nTimeDelta":0,
      //     "force":0.126760557,
      //     "x":47.19,
      //     "y":18.02,
      //     "tx":0,
      //     "ty":0,
      //     "rotation":0
      //   }
      // }
      const nowPen = PenManager.getInstance().getPen(dotData.mac);
      if(!nowPen) return ;
  
      
      const timeStamp = dotData.time;
      nowPen.penDownTime = timeStamp;
      const e = makePenEvent(nowPen.deviceType, PenCommEventEnum.PEN_DOWN, { penTipMode: 0, timeStamp, penId: nowPen.id });
      nowPen.onPenDown(e);
  
      const { section, owner, book, page } = dotData;
      nowPen.onPageInfo({ timeStamp, section, owner, book, page }, false);
    }else if(dotData.dotType === "MOVE"){
      // const dot = {
      //   "mac":"9c:7b:d2:05:56:0d",
      //   "dotType":"MOVE",
      //   "section":3,
      //   "owner":1013,
      //   "book":2,
      //   "page":2,
      //   "time":1662014802993,
      //   "dot":{
      //     "nTimeDelta":8,
      //     "force":0.746478856,
      //     "x":47.11,
      //     "y":18.04,
      //     "tx":0,
      //     "ty":0,
      //     "rotation":0
      //   }
      // }
      const nowPen = PenManager.getInstance().getPen(dotData.mac);
      if(!nowPen) return ;
      
      const timeStamp = dotData.time;
      const timediff = timeStamp - nowPen.penDownTime;
      const { section, owner, book, page } = dotData;
  
      const ncode_xy = {
        x : dotData.dot.x,
        y : dotData.dot.y
      }
      // const DEFAULT_MOUSE_PEN_FORCE = 512;
  
      nowPen.onPenMove({
        timeStamp,
        timediff,
        section,
        owner,
        book,
        page,
        ...ncode_xy,
        force: dotData.dot.force * 850,
        isFirstDot: false
      });
    }else if(dotData.dotType === "UP"){
      // const dot = {
      //   book: 2,
      //   dot: {nTimeDelta: 0, force: 0.265258223, x: 41.54, y: 16.49, tx: 0, ty: 0, rotation: 0},
      //   dotType: "UP",
      //   mac: "9c:7b:d2:05:56:0d",
      //   owner: 1013,
      //   page: 2,
      //   section: 3,
      //   time: 1662014805686
      // }
      const nowPen = PenManager.getInstance().getPen(dotData.mac);
      console.log(dotData.dotType, nowPen);
      if(!nowPen) return ;
      const timeStamp = dotData.time;
  
      nowPen.onPenUp({ timeStamp });
    }else if(dotData.dotType === ""){
      // const data = {
      //   book: 2,
      //   dot:{
      //     force: 0,
      //     nTimeDelta: 34,
      //     rotation: 0,
      //     tx: 0,
      //     ty: 0,
      //     x: 56.83,
      //     y: 17.18,
      //   },
      //   dotType: "",
      //   mac: "9c:7b:d2:89:00:7c",
      //   owner: 1013,
      //   page: 2,
      //   section: 3,
      //   time: 981,
      // }
      const nowPen = PenManager.getInstance().getPen(dotData.mac);
      if(!nowPen) return ;

      const {x, y, force} = dotData.dot;
      const timeStamp = dotData.time;
      const timediff = timeStamp - nowPen.penDownTime;
      nowPen.penDownTime = timeStamp;
      const e = makePenEvent(DeviceTypeEnum.PEN, PenCommEventEnum.PEN_MOVE_HOVER, { x, y, force, timediff, timeStamp: nowPen.penDownTime });
      nowPen.hoverSOBP = {
        time: Date.now() - 10000, 
        isHover:true,
        section : dotData.section,
        owner : dotData.owner,
        book : dotData.book,
        page : dotData.page
      }
      if(nowPen.hoverSOBP.isHover && Date.now() - nowPen.hoverSOBP.time > 1000){
        const pageInfoEvent = makePenEvent(
          nowPen.deviceType, 
          PenCommEventEnum.PAGE_INFO_HOVER, 
          { section : nowPen.hoverSOBP.section, owner : nowPen.hoverSOBP.owner, book : nowPen.hoverSOBP.book, page : nowPen.hoverSOBP.page, timeStamp: nowPen.penDownTime }
        );
        nowPen.hoverSOBP.time = Date.now();
        nowPen.onPageInfo(pageInfoEvent, true);
      }

      nowPen.onHoverMove(e);
    }
  }
})

const penControl = (penList:PenListData[])=>{
  const onPenLinkChanged = (e)=>{
    const app = GridaApp.getInstance();
    app.onPenLinkChanged(e);
  }
  const penManager = PenManager.getInstance();


  const beforePenList = store.getState().ndpClient.penList;
  
  const lostPenList = beforePenList.filter(el=> !penList.find(el2=>el2.mac===el.mac));
  const newPenList = penList.filter(el=> !beforePenList.find(el2=>el2.mac===el.mac));

  // 사라진 펜 데이터 삭제
  for(let i = 0; i < lostPenList.length; i++){
    const nowMac = lostPenList[i].mac;
    penManager.deletePen(nowMac);
  }

  for(let i = 0; i < newPenList.length; i++){
    const newPenData = newPenList[i];
    const newPen: INeoSmartpen = penManager.createPen();

    newPen.addEventListener(PenEventName.ON_CONNECTED, onPenLinkChanged);
    newPen.addEventListener(PenEventName.ON_DISCONNECTED, onPenLinkChanged);

    newPen.connect({
      mac : newPenData.mac,
      penType : DeviceTypeEnum.PEN
    });
  }

  setPenList(penList);
}




ndp.Client.autoConnectStart();

NDP.getInstance().onAuthStateChanged(async userId => {
  // user.email
  const data = await NDP.getInstance().Client.localClient.emitCmd("getPenList");
  if(data.result){
    penControl(data.data.penList);
  }
});
export const signInWithNDPC = async () => {

  NDP.getInstance().Client.getToken();
}
export default firebase;