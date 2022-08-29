import {MessageCallbackInterface, MessageSendInterface, UserData} from "./enum";
import * as StompJs from "@stomp/stompjs";
import { EmitData } from "./NSocket";
import { makeUUIDv4 } from "./Util";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const STOMP = StompJs as any;

console.log(StompJs.Client);

export interface SendData {
  mode: string;
  strokeUUID: string;
  page: {
      section: number;
      owner: number;
      bookCode: number;
      pageNumber: number;
      noteUUID ?: string
  };
  stroke: {
      version: number;
      deleteFlag: number;
      writeId ?: string;
      color: number;
      penTipType: number;
      mac ?: string;
      startTime: number;
      thickness ?: number,
      strokeTyp ?: number,
  };
  dotCount: number;
  dots: string;
}

export interface RoomUserData {
  userId : string,
  type : "Owner" | "Member",
  name : string, 
  nickName : string,
  email : string
}

export interface RoomData {
  id : string,
  ownerId : string,
  name : string,
  comment : null,
  entranceUrl : string,
  type : "Public" | "Private",
  state : "Activated" | "Deactivated",
  users : Array<RoomUserData>,
  activatedDatetime : string, // $date-time
  deactivatedDatetime : string // $date-time
}

export interface RoomListResponse {
  totalElements: number,
  resultElements: Array<RoomData>
}

interface RelayInitData {
    userId:string,
    accessToken:string,
    applicationId : number,
    resourceOwnerId : string,
    url : string
}



class Relay {
    userId = "";
    accessToken = "";
    url = "";
    clientId = "";
    applicationId = -1;
    selectedRoomData : RoomData | null = null;
    userData : UserData|null = null;
    userUuid = "";
    relayWS : RelaySocket | undefined = undefined;
    resourceOwnerId = "";
    onPenDownCallback : null | ((mac:string, data:any)=>any) = null
    onPenMoveCallback : null | ((mac:string, data:any)=>any) = null
    onPenUpCallback : null | ((mac:string, data:any)=>any) = null
    private isInit = false;
    
    setInit(initData:RelayInitData){
        this.userId = initData.userId;
        this.accessToken = initData.accessToken;
        this.applicationId = initData.applicationId;
        this.resourceOwnerId = initData.resourceOwnerId;
        this.url = initData.url;
        this.isInit = true;
    }
    async getRoom(){
      if(!this.isInit){
        console.error("is not init. Please log in");
        return false;
      }
      const res = await fetch(`${this.url}/relay/v2/room`,{
        method : "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        }
      });
      const data = await res.json();
      
      return data as RoomListResponse;
    }
    setRoom(roomData:RoomData){
      this.selectedRoomData = roomData;
    }
    getUUid(){
      if(this.userUuid === ""){
        this.userUuid = makeUUIDv4();
      }

      return this.userUuid;
    }
    async connectRoom(){
      if(this.selectedRoomData === null) return false;
      
      const sessionKey = this.getUUid();
      
      this.relayWS = new RelaySocket({
        sessionKey : sessionKey,
        url : `${this.selectedRoomData.entranceUrl}/live/v2/ws?session-key=${sessionKey}&access-token=${this.accessToken}`,
        userId : this.userId,
        applicationId : this.applicationId,
        resourceOwnerId : this.resourceOwnerId,
        roomData : this.selectedRoomData,
        parent : this
      })

      return await this.relayWS.connect();
      // this.client.subscribe(`/topic/${this.userId}-${this.applicationId}-${channelId}`, (e)=>{
    }
    async createRoom(){
      if(!this.isInit){
        return ;
      }

      const bodyData = {
        "name" : "test",
        "type" : "Public",
        "users" : [{
            "userId" : "rinmin1@neolab.net",
            "type" : "Owner",
            "name" : "test"
        }]
      }
      const res = await fetch(`${this.url}/relay/v2/room`,{
        method : "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        },
        body : JSON.stringify(bodyData)
      });
      const data = await res.json();
      
      return data as RoomListResponse;
    }

    
    onPenDown(callback:((mac: string, data: any) => any)){
      this.onPenDownCallback = callback;
    }
    onPenMove(callback:((mac: string, data: any) => any)){
      this.onPenMoveCallback = callback;
    }
    onPenUp(callback:((mac: string, data: any) => any)){
      this.onPenUpCallback = callback;
    }
}

export default Relay;






class RelaySocket {
  client : StompJs.Client | undefined = undefined;
  sessionKey :string;
  url : string;
  userId :string;
  applicationId : number;
  resourceOwnerId: string;
  roomData : RoomData;
  events:{[key:string]:{[key:string] : Function}} = {};
  eventsKey:{[key:string]:number} = {};
  parent : Relay;
  liveStrokeMacName : {[key:string]:string} = {}
  constructor(initData:{sessionKey:string, url:string, userId:string, applicationId:number, roomData:RoomData, resourceOwnerId : string, parent : Relay}){
    this.sessionKey = initData.sessionKey;
    this.url = initData.url;
    this.userId = initData.userId
    this.applicationId = initData.applicationId;
    this.resourceOwnerId = initData.resourceOwnerId;
    this.roomData = initData.roomData;
    this.parent = initData.parent;
  }
  async connect(){
    return new Promise((resolve : (value:boolean) => void, reject : (value:boolean) => void) => {
      this.client = new StompJs.Client({
        brokerURL : this.url
      })
      this.client.debug = (data) => {console.log(data);}
      this.client.onConnect = (frame:StompJs.IFrame)=>{
        resolve(true);
        
        this.connectEvent(frame);
      };
      this.client.onWebSocketClose = (frame:StompJs.IFrame)=>{
        reject(false);
        
        if(this.client) this.client.deactivate();
        this.client = undefined;
      }


      this.client.activate();
    })
  }
  async join(){
    if(!this.client) return ;
    const joinData:MessageSendInterface = {
      "cmd": "JOIN", // CONNECT, JOIN, MESSAGE, DIRECT
      "payload": {
        "type":"application/text",
        "content" : null
      },
      "sender": {
          "id": this.userId,
          "name": "test",
      }
   }
   
    this.client.publish({
      destination: `/live/v2/${this.resourceOwnerId}/${this.applicationId}/channels/${this.roomData.id}/join`,
      headers: {
        'content-type': 'application/JSON'
      },
      body : JSON.stringify(joinData)
    });
  }
  async sendDot(dotData:SendData){
    if(!this.client) return ;
    const Dot:MessageSendInterface = 
    {
        'cmd': "MESSAGE",
        'payload': {
            'type': "application/stroke.dot",
            'content': {
                "mode": "DOWN", // DOWN, MOVE, END
                "strokeUUID": "a8bb7abe-6ec9-1112-123481edac",
                "page": {
                    "section": 1,
                    "owner": 2,
                    "bookCode": 10,
                    "pageNumber": 5,
                    "noteUUID": "sdfsdf-sdfsd3wr-wdf-sdfsdf"    
                },
                "stroke": {
                    "version": 1,
                    "deleteFlag": 0,
                    "writeId": "mrlove1@neolab.net",
                    "color": -16777216,
                    "thickness": 0.2,
                    "penTipType": 0,
                    "strokeType": 3,
                    "mac": "9c:7b:d2:42:07:53",
                    "startTime": 1592802878315,
                },
                "dotCount": 5,
                "dots": "APLbpT1cjzAPLbpT1cjzAPLbpT1cjz"
            }
        },
        'sender': {
            'id': "rinmin1@neolab.net",
            'name': "test"
        }
    }

    this.client.publish({
      "destination" : `/live/v2/neolab/1547/channels/984e4f1f-dd3b-4b9e-9dc9-2ec3714695a6/message`,
          headers: {
            'content-type': 'application/JSON'
          },
        body : JSON.stringify(Dot)
    })
  }

  connectEvent(frame:StompJs.IFrame){
    if(!this.client) return ;
    console.log(frame);
    this.client.subscribe(`/topic/${this.resourceOwnerId}-${this.applicationId}-${this.roomData.id}`, (e:StompJs.IMessage)=>{
        console.log("topic");
        console.log(e);
        const body = JSON.parse(e.body) as MessageCallbackInterface;
        if(body.payload.type === "application/stroke.dot"){
          this.onStroke(body);
        }else{
          this.onTopic(body);
        }
    });
    this.client.subscribe(`/user/topic/error`, (e:StompJs.IMessage)=>{
        console.log("error");
        console.log(e);
    });
    this.client.subscribe(`/user/topic/direct`, (e:StompJs.IMessage)=>{
        console.log("direct");
        console.log(e);
    });
  }
  onStroke(body:EmitData){
    const dotData = body.payload.content;

    console.log(dotData);
    if(dotData.mode === "DOWN"){
      // 스트로크 id로 펜 맥정보 저장
      this.liveStrokeMacName[dotData.strokeUUID] = dotData.stroke.mac;
      if(this.parent.onPenDownCallback) this.parent.onPenDownCallback(dotData.stroke.mac, dotData);
    }else if(dotData.mode === "MOVE"){
      // 맥정보 없으면 (down이 안들어 왔으면) 이상한 상황
      if(this.liveStrokeMacName[dotData.strokeUUID] === undefined) return ;
      if(this.parent.onPenMoveCallback) this.parent.onPenMoveCallback(this.liveStrokeMacName[dotData.strokeUUID], dotData);
    }else if(dotData.mode === "END"){
      // 맥정보 없으면 (down이 안들어 왔으면) 이상한 상황
      if(this.liveStrokeMacName[dotData.strokeUUID] === undefined) return ;
      if(this.parent.onPenUpCallback) this.parent.onPenUpCallback(this.liveStrokeMacName[dotData.strokeUUID], dotData);

      // 맥정보 삭제
      delete this.liveStrokeMacName[dotData.strokeUUID];
    }
  }
  onTopic(body:EmitData){
    const listenKey = body.cmd;
      if(this.events[listenKey]){
          const eventsKey = Object.keys(this.events[listenKey]);
          for(let i = 0; i < eventsKey.length; i++){
              this.events[listenKey][eventsKey[i]](body);
          }
      }
  }
  on(eventName : string, callback : Function){
      if(this.events[eventName] === undefined) this.events[eventName] = {};
      if(this.eventsKey[eventName] === undefined) this.eventsKey[eventName] = 0;

      this.events[eventName][this.eventsKey[eventName]] = callback;

      this.eventsKey[eventName] += 1;

      return this.eventsKey[eventName]-1;
  }
  off(eventName : string, offData ?: Function | number){ // string, Function | number
      if(offData === undefined){
          delete this.events[eventName];
          delete this.eventsKey[eventName];
      }else{
          if(typeof offData === "number"){
              delete this.events[eventName][offData];
          }else if(typeof offData === "function"){
              const nowEvent = this.events[eventName];
              const keys = Object.keys(nowEvent);
              for(let i = 0; i < keys.length; i++){
                  if(nowEvent[keys[i]] === offData){
                      delete nowEvent[keys[i]];
                      break ;
                  }
              }
          }
      }
  }
}



/**
 * 
 * dot 전송 샘플
 * 
 */
//  var data = 
//  {
//      'cmd': "MESSAGE",
//      'payload': {
//          'type': "application/stroke.dot",
//          'content': {
//              "mode": "DOWN", // DOWN, MOVE, END
//              "strokeUUID": "a8bb7abe-6ec9-1112-123481edac",
//              "page": {
//                  "section": 1,
//                  "owner": 2,
//                  "bookCode": 10,
//                  "pageNumber": 5,
//                  "noteUUID": "sdfsdf-sdfsd3wr-wdf-sdfsdf"    
//              },
//              "stroke": {
//                  "version": 1,
//                  "deleteFlag": 0,
//                  "writeId": "mrlove1@neolab.net",
//                  "color": -16777216,
//                  "thickness": 0.2,
//                  "penTipType": 0,
//                  "strokeType": 3,
//                  "mac": "9c:7b:d2:42:07:53",
//                  "startTime": 1592802878315,
//              },
//              "dotCount": 5,
//              "dots": "APLbpT1cjzAPLbpT1cjzAPLbpT1cjz"
//          }
//      },
//      'sender': {
//          'id': "rinmin1@neolab.net",
//          'name': "test"
//      }
//  }
//  if(false){
//    console.log(data);
//  }
//  ndp.Relay.relayWS.client.publish({
//    "destination" : `/live/v2/neolab/1547/channels/984e4f1f-dd3b-4b9e-9dc9-2ec3714695a6/message`,
//        headers: {
//          'content-type': 'application/JSON'
//        },
//      body : JSON.stringify(data)
//  })