import { sleep } from "nl-lib/common/util";
import { TokenUserData } from "./enum";
import NSocket, { EmitData, SocketReturnData } from "./NSocket";

interface ClientInitData {
    autoConnect : boolean,
    appName : string
}


class Client {
    localClient :NSocket | null = null;
    private serverUrl = "ws://localhost:8899";
    private authStateChangeFunctions:Array<Function> = [];
    private _userId = "";
    accessToken = "";
    autoConnect = false;
    applicationId = -1;
    _resourceOwnerId = "";
    _clientId = "";
    appName = "";
    tyrCount = 0;
    autoCallback:Array<{eventName:string, callback:(data: SocketReturnData) => any}> = [];
    tokenUserData:TokenUserData = {
        "sub":"",
        "aud":"",
        "resourceOwner":"",
        "scope":[""],
        "iss":"",
        "type":"",
        "applicationId":0,
        "exp":0,
        "iat":0,
        "jti":""
    }
    get tokenExp():number{
        return this.tokenUserData.exp * 1000;
    }
    get resourceOwnerId():string{
        return this._resourceOwnerId;
    }
    set resourceOwnerId(val:string) {
        console.error("can not change");
    }
    get clientId():string {
        return this._clientId;
    }
    set clientId(val:string) {
        console.error("can not change");
    }
    get userId():string {
        return this._userId;
    }
    set userId(val:string) {
        console.error("can not change");
    }

    init(initData:ClientInitData){
        this.appName = initData.appName;
        if(initData.autoConnect){
            this.autoConnectStart();
        }
    }
  
    /**
     * 클라이언트(neolabcloud) 자동 연결 함수.
     * 
     * 옵션값의 clientAutoConnect 를 통해 자동 실행 가능
     * 
     */
    async autoConnectStart(){
        this.autoConnect = true;
        return await this.autoTry();
    }
    autoConnectEnd(){
        this.autoConnect = false;
    }
    async connect(){
        if(this.appName === ""){
            console.error("no appName");
            return false;
        }
        const socket = new NSocket(this.serverUrl);
        socket.on("tokenInfo",this.tokenInfoCallback.bind(this));
        socket.on("penControlOwner",this.penControlCallback.bind(this));
        socket.on("tokenUpdate", this.tokenInfoCallback.bind(this));
        this.runAutoOn(socket);
        try{
            await socket.connect();
            await socket.emit("connect", {
                appName : this.appName
            });
        }catch(e){
            return false;
        }

        this.localClient = socket;

        return true;
    }
    async penControlCallback(res:SocketReturnData){
        // {
        //     "cmd": "penControlOwner",
        //     "result": TRUE | FALSE,
        //     "message": "some message"
        //     "data" : {
        //          "ownerName" : "GRIDABOARD | NEOSTUDIOWEB",
        //          "owned" : TRUE | FALSE
        //     }
        // }
        if(res.result){

            return res;
        }else{
            console.error(res.message);
            return ;
        }
    }
    async callChangeFunction(userId:string){
        const changeFunction = this.authStateChangeFunctions.slice(0);
        for(let i = 0; i < changeFunction.length; i++){
            try{
                await changeFunction[i](userId);
            }catch(e){
                console.log(e);
            }
        }
    }
    async tokenInfoCallback(token:SocketReturnData){
        if(token.result){
            const data = token.data;
            const tokenData = data["token"];
            this.accessToken = tokenData.accessToken as string;
            const jwtToken = this.discomposeJWTToken(this.accessToken);
            this._clientId = tokenData.clientID;
            this._resourceOwnerId = tokenData.resourceOwner;
            
            if(new Date(jwtToken.exp * 1000) < new Date()){
                // 토큰을 받았는데, 만료됨, 리프래시 시도후 종료
                this.accessToken = "";
                this._clientId = "";
                this._resourceOwnerId = "";
                this._userId = null as string;
                this.applicationId = -1;
                const ref = await this.refreshToken();

                if(ref){ //리프래시 성공
                    return ;   
                }
                // 기타 이유로 실패시 _userId : null로 콜백
            }

            await this.callChangeFunction(this._userId);

            if(this._userId === null){
                // 토큰 만료
                return -1;
            }else{
                // 정상 로그인
                return this.accessToken as string;
            }
            
        }else{
            console.log(token.message);
            // 클라이언트 로그인 안됨
            await this.callChangeFunction(null);
            return ;
        }
    }
    /**
     * client login 함수
     */
    async getToken(){
        if(this.localClient){
            const getToken = await this.localClient.emitCmd("tokenInfo");
            const token = await this.tokenInfoCallback(getToken);
            console.log(token);

            return token;
        }else{
            return undefined;
        }
    }
    /**
     * 토큰 리프래시 함수
     */
    async refreshToken(){
        if(this.localClient){
            const ref = await this.localClient.emitCmd("tokenExpired");
            return ref.result;
        }else{
            return false;
        }
    }
    /** 
     * copyData에 cmd 데이터가 반드시 있어야 함
    */
    async customEmit(copyData: EmitData){
        if(!this.localClient){
            return "can't find client";
        }
        return await this.localClient.emitFunctional(copyData.cmd, copyData);
    }
    
    async customEmit2(eventName:string, copyData: EmitData){
        if(!this.localClient){
            return "can't find client";
        }
        return await this.localClient.emitFunctional(eventName, copyData);
    }
    onAuthStateChanged(callbackFunction:(userId:string)=>any){
        this.authStateChangeFunctions.push(callbackFunction);
    }
    
    on(eventName : string, callback : (data:SocketReturnData)=>any, client ?: NSocket){
        if(!this.localClient && !client){
            return "can't find client";
        }
        if(client){
            client.on(eventName, callback);
        }else{
            this.localClient.on(eventName, callback);
        }
    }
    off(eventName : string, offData ?: Function | number){ // string, Function | number
        if(!this.localClient){
            return "can't find client";
        }
        this.localClient.off(eventName, offData);
    }
    autoOn(eventName:string, callback: (data:SocketReturnData)=>any){
        this.autoCallback.push({eventName, callback});

        if(this.localClient){
            this.on(eventName, callback);
        }
    }
    runAutoOn(client ?: NSocket){
        for(let i = 0; i < this.autoCallback.length; i++){
            const nowObj = this.autoCallback[i];
            this.on(nowObj.eventName, nowObj.callback, client);
        }
    }



    private discomposeJWTToken(token:string){
        const jwtData = token.split(".");
        const jwtUserData = JSON.parse(Buffer.from(jwtData[1],"base64").toString());
        if(jwtUserData.sub){
            this._userId = jwtUserData.sub;
            this.applicationId = jwtUserData.applicationId;
            this.tokenUserData = jwtUserData as TokenUserData;
        }
        return jwtUserData;
    }

    private async autoTry():Promise<boolean>{
        if(!this.autoConnect) return false;
        // if(this.tyrCount >= 10){
        //     // 10회 시도시 로그인 실패
        //     this.callChangeFunction(null);
        //     this.autoConnect = false;
        //     this.tyrCount = 0;
        //     return ;
        // }
        if(!this.localClient){
            // console.log("retry");
            this.tyrCount++;
            const isConnect = await this.connect();
            
            if(!isConnect){
                await sleep(3000);
                return await this.autoTry();
            }
            return isConnect;
        }else{
            return true;
        }
    }

    async clientOpenCheck(){
        const socket = new NSocket(this.serverUrl);
        try{
            await socket.connect();
        }catch(e){
            return false;
        }

        socket.disConnect();
        return true;
    }
    openClient(){
        if(document.querySelector("#ndp_client_open_iframe") !== null){
            const beforeFrame = document.querySelector("#ndp_client_open_iframe");
            document.body.removeChild(beforeFrame);
        }
        const frame = document.createElement("iframe");
        frame.id = "ndp_client_open_iframe";
        frame.width = "0px";
        frame.height = "0px";
        frame.style.display = "none";
        frame.style.visibility = "hidden";
        document.body.appendChild(frame);
        frame.src = "neolabcloud://";
    }
}

export default Client;

// 클립보드
//  -----------> customEmit 추가


// 네오스튜디오쪽은 NDP 통신 관련

// 라이브 - 서버
// 페이퍼
// 잉크스토어







// 펜정보 불러오기 ( 그리다보드만 )
// var tes = {
//     destination : "/relay/v2/room/{roomId}/user/join",
//     header : {
//         auth : "",
//     },
//     body : {
//       "name": "테스트룸",
//       "type": "Public",
//       "comment": "테스트용",
//       "users": [
//         {
//           "userId": "test_owner@onthelive.kr",
//           "type": "Owner",
//           "name": "test_owner",
//           "nickName": "오너",
//           "email": "test_owner@onthelive.kr"
//         }
//       ]
//     }
// }
// var test2 = {
//     cmd : "test",
//     data : {

//     }
// }