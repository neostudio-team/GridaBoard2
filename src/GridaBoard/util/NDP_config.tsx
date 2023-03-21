import firebase from "firebase";
import NDP from "NDP-lib";
import React from "react";
import { SocketReturnData } from "NDP-lib/NSocket";
import { setIsPenControlOwner, setPenList } from "../store/reducers/ndpClient";
import { penControlOwner, PenListData, StorageSaveOption } from "NDP-lib/enum";
import { showAlert } from "../store/reducers/listReducer";
import { store } from "../client/pages/GridaBoard";
import PenManager from "nl-lib/neosmartpen/PenManager";
import { INeoSmartpen } from "../../nl-lib/common/neopen";
import { DeviceTypeEnum, PenEventName } from "../../nl-lib/common/enums";
import GridaApp from "../GridaApp";
import { DPI_TO_UNIT } from "../../nl-lib/common/constants";
import { makePenEvent, PenCommEventEnum } from "../../nl-lib/neosmartpen/pencomm/pencomm_event";
import Storage from "NDP-lib/Storage";
import { AirlineSeatReclineExtra } from "@material-ui/icons";
import { languageType } from "../language/language";







const ndp = new NDP({
  appName : "GRIDABOARD"
});
ndp.setShare();

const ndpCheck = async ()=>{
  const isOpen = await ndp.getGatewayStatus();
  if(isOpen.status !== "ENABLE"){
    if(languageType === "ko"){
      alert(isOpen[`message_kr`]);
    }else{
      alert(isOpen[`message_en`]);
    }
  }
  // if(!isOpen){
  //   alert("서비스 사용 불가");
  // }
}

ndpCheck();

(window as any).ndp = ndp;
(window as any).NDP = NDP;
(window as any).test3 = showAlert;
(window as any).test4 = PenManager;

ndp.Client.autoOn("penControlOwner",(res: SocketReturnData)=>{
  if(res.result){
    const data = res.data as penControlOwner;
    
    if(!data.owned && store.getState().ndpClient.isPenControlOwner){
      showAlert({type : "lostPenOwner"});
    }
    setIsPenControlOwner(data);
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
      const nowPen = PenManager.getInstance().getPen(dotData.mac);
      if(!nowPen) return ;
  
      
      const timeStamp = dotData.time;
      nowPen.penDownTime = timeStamp;
      const e = makePenEvent(nowPen.deviceType, PenCommEventEnum.PEN_DOWN, { penTipMode: 0, timeStamp, penId: nowPen.id });
      nowPen.onPenDown(e);
  
      const { section, owner, book, page } = dotData;
      nowPen.onPageInfo({ timeStamp, section, owner, book, page }, false);
    }else if(dotData.dotType === "MOVE"){
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
      const nowPen = PenManager.getInstance().getPen(dotData.mac);
      console.log(dotData.dotType, nowPen);
      if(!nowPen) return ;
      const timeStamp = dotData.time;
  
      nowPen.onPenUp({ timeStamp });
    }else if(dotData.dotType === "HOVER"){ 
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
  console.log(penList);
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


const timer = setTimeout(()=>{
  ndp.Client.getToken();
},5000)


ndp.Client.autoConnectStart();

NDP.getInstance().onAuthStateChanged(async userId => {
  if(userId !== null){
    const data = await NDP.getInstance().Client.localClient.emitCmd("getPenList");
    if(data.result){
      penControl(data.data.penList);
    }
  }
});

NDP.getInstance().onAuthStateChanged(async userId => {
  console.log(userId);
  clearTimeout(timer);
  if(userId !== null){
    GridaDB.getInstance().setInit();
  }
});




export const signInWithNDPC = async () => {
  if(NDP.getInstance().Client.localClient) {
    const logined = await NDP.getInstance().Client.getToken();
    console.log(logined);
    if(logined === undefined){
      // TODO GAEMY : 경고문 추가
      alert("클라이언트 로그인 필요")
    }else if(logined === -1){
      await NDP.getInstance().Client.refreshToken();
    }
  } else {
    NDP.getInstance().Client.openClient();
  }
}
export default firebase;



let gridaShare = undefined as GridaDB;
export class GridaDB {
  storage : Storage;
  dbData : {[key:string]:any,[key:number]:any} = {};
  isInit = false;
  dbFileDataId : number;

  waitForInit:Array<Function> = [];
  constructor(){
    if(gridaShare !== undefined) return gridaShare;

  }
  async initWait(){
    await new Promise((res,rej)=>{
      this.waitForInit.push(res);
    })
  }
  async setInit(){
    this.storage = NDP.getInstance().Storage;
    
    await this.dbSet();
    
    this.isInit = true;

    for(let i = 0; i< this.waitForInit.length; i++){
      this.waitForInit[i]();
    }
  }


  async getDoc(id){
    if(!this.isInit) await this.initWait();

    let rtData = null;
    if(this.dbData[id]){
      rtData = clone(this.dbData[id]);
    }

    return rtData;
  }
  async getDocAll(){
    if(!this.isInit) await this.initWait();

    return clone(this.dbData);
  }
  async deleteDoc(id){
    if(!this.isInit) await this.initWait();

    if(this.dbData[id]){
      delete this.dbData[id];
    }
  }
  async updateDoc(id, data:{[key:string]:any, [key:number]:any}){
    if(!this.isInit) await this.initWait();
    if(this.dbData[id]){
      this.dbData[id] = Object.assign(this.dbData[id], data);
    }else{
      return false;
    }
    
    await this.dbFileUpdate();
    return true;
  }

  async setDoc(id:string|number, data:{[key:string]:any,[key:number]:any}){
    if(!this.isInit) await this.initWait();
    this.dbData[id] = data;

    await this.dbFileUpdate();
  }


  async getFilePath(tag:string){
    if(!this.isInit) await this.initWait();
    const dbFileData = await this.storage.getFileDatafromTag(tag);
    
    let fileId = null as number;
    if(dbFileData === null){
      return null;
    }else if(dbFileData.totalElements === 1){
      fileId = dbFileData.resultElements[0].id;
    }else{
      fileId = dbFileData.resultElements[dbFileData.totalElements-1].id;
    }

    const file = await this.storage.getFileDatafromId(fileId);

    return {
      url : file.requestUri,
      expiredDatetime : file.expiredDatetime
    };
  }
  async getFile(tag:string, type ?: string) {
    if(!this.isInit) await this.initWait();
    const requestUri = (await this.getFilePath(tag)).url;
    

    const file = await fetch(`${requestUri}`,{
      method : "GET",
      headers: {
            'Content-Type': 'application/json'
      }
    });

    if(type === "json"){
      return await file.json();
    }else{
      return await file.blob();
    }
  }
  async deleteFile(tag:string){
    if(!this.isInit) await this.initWait();
    const fileData = await this.storage.getFileDatafromTag(tag);
    
    let fileId = null as number;
    if(fileData === null){
      return false;
    }else if(fileData.totalElements === 1){
      fileId = fileData.resultElements[0].id;
    }else{
      fileId = fileData.resultElements[fileData.totalElements-1].id;
    }

    await this.storage.deleteFile(fileId);

    return true;
  }
  async saveGrida(file:Blob, fileName : string, path:string){
    if(!this.isInit) await this.initWait();

    const fileNameArr = fileName.split(".");
    fileNameArr.pop();
    const name = fileNameArr.join(".");

    await this.saveFile(file,{
      name : name,
      fileName : fileName,
      fileType : "Normal",
      contentType : "text",
      mimeType : "text/json",
      tag : path,
      description : "gridaboard format file"
    });
  }
  async savePng(file:Blob, fileName : string, path:string){
    if(!this.isInit) await this.initWait();

    const fileNameArr = fileName.split(".");
    fileNameArr.pop();
    const name = fileNameArr.join(".");

    await this.saveFile(file,{
      name : name,
      fileName : fileName,
      fileType : "Normal",
      contentType : "image",
      mimeType : "image/png",
      tag : path,
      description : "gridaboard thumbnail png"
    });
  }
  async saveFile(file:Blob, opt:StorageSaveOption){
    const saveData = await this.storage.saveFile(file, opt);
  }





  
  async dbSet(){
    let dbFileData = await this.storage.getFileDatafromTag("gridaBoardDB");
    let newDB = null;

    console.log(dbFileData);
    if(dbFileData === null){
      newDB = await this.newDbSet();
      dbFileData = await this.storage.getFileDatafromTag("gridaBoardDB");
    }

    if(dbFileData.totalElements > 1){// data too many : something wrong
      let currectId = -1;
      dbFileData.resultElements.forEach((el)=>{
        if(el.id > currectId) currectId = el.id;
      })

      newDB = await this.storage.getFileFromId(currectId);
      this.dbFileDataId = currectId;
      
    }else{
      newDB = await this.storage.getFileFromId(dbFileData.resultElements[0].id);
      this.dbFileDataId = dbFileData.resultElements[0].id;
    }

    newDB = JSON.parse(await (newDB as Blob).text());

    this.dbData = newDB;
  }
  async newDbSet(){
    const DBJSON = {};
    
    const dataBlob = await this.saveDB(DBJSON);

    return dataBlob;
  }
  async dbFileUpdate(){
    const beforeDbId = this.dbFileDataId;

    await this.saveDB(this.dbData);
    this.deleteDB(beforeDbId);
  }
  async saveDB(dbData){
    const data = JSON.stringify(dbData, null, 4);

    const dataBlob = new Blob([data], {type:"text/json"});
    const beforeId = this.dbFileDataId;


    const saveData = await this.storage.saveFile(dataBlob, {
      name : "gridaBoardDB",
      fileName : "gridaBoardDB.json",
      fileType : "Normal",
      contentType : "text",
      mimeType : "text/json",
      tag : "gridaBoardDB",
      description : "gridaboard default Database file"
    });
    if(saveData !== "error"){
      this.dbFileDataId = saveData.id;
    }
    return dataBlob;
  }
  async deleteDB(id:number){
    this.storage.deleteFile(id);
  }
  static getInstance(){
      if(gridaShare) return gridaShare as GridaDB;

      else{
          gridaShare = new GridaDB();
          return gridaShare;
      }
  }
}


(window as any).GridaDB = GridaDB;

export const encode = function( s ) {
	const out = [];
	for ( let i = 0; i < s.length; i++ ) {
		out[i] = s.charCodeAt(i);
	}
	return new Uint8Array( out );
}


const clone = (data)=> JSON.parse(JSON.stringify(data));


