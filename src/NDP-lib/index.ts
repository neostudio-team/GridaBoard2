
import Auth from "./Auth";
import User from "./User";
import Relay from "./Relay";
import Client from "./Client";
import InkStore from "./InkStore";
import Paper from "./Paper";
import Storage from "./Storage";
// import {clientIdType, AuthorizationToken, TokenUserData} from "./enum";

// old test server : https://ndp-dev.onthe.live:5443
// new test server : https://llorqt3rofirq76mqwrlexseh4.apigateway.ap-seoul-1.oci.customer-oci.com
// live server server : https://router.neolab.net
let NdpDefaultRouter;

if(window.ndpSetting === "dev"){
    NdpDefaultRouter = "https://ndp-dev.onthe.live:5443"; //;"https://llorqt3rofirq76mqwrlexseh4.apigateway.ap-seoul-1.oci.customer-oci.com";
}else{ // window.ndpSetting === "live"
    NdpDefaultRouter = "https://router.neolab.net";
}


let isShared = false;
let shared :NDP|undefined;

interface NDPinit {
    googleClientId ?: string,
    googleClientSecret ?: string,
    appleClientId ?: string,
    appleClientSecret ?: string,
    ndpClientId ?: string,
    ndpClientSecret ?: string,
    googleRedirectUri ?: string,
    appleRedirectUri ?: string,
    ndpRedirectUri ?: string,
    // redirectUri를 공유하고 싶다면 redirectUri 에다가만 넣으면 됨
    redirectUri ?: string,
    applicationId ?: number,
    resourceOwnerId ?: string,
    clientAutoConnect ?: boolean,
    appName ?: string
}
class NDP {
    Auth : Auth = new Auth();
    User : User = new User();
    Relay : Relay = new Relay();
    Client : Client = new Client();
    InkStore : InkStore = new InkStore();
    Paper: Paper = new Paper();
    Storage: Storage = new Storage();
    
    loginType:"client" | "auth" | null = null;
    url:{[type:string]:string} = {};
    accessToken = "";
    clientId = "";
    applicationId =  -1;
    resourceOwnerId = "";
    isReady = false;
    userId = "";
    
    private gatewayStateChangeFunctions:Array<Function> = [];
    private authStateChangeFunctions:Array<Function> = [];

    constructor (initData?:NDPinit){
        // 기본적으로 동적으로 생성해서 사용하나, 프로젝트 내에서 단 하나의 NDP class를 이용하고 싶다면 setShare를 이용하여 단일화 시킬 수 있다.
        // TODO : 기본 조건을 단일화로 할지 고민
        
        if(isShared && shared !== undefined) return shared;

        if(initData !== undefined){
            this.init(initData);
        }
    }

    async init(initData:NDPinit){
        this.applicationId = initData.applicationId ?? -1;
        this.resourceOwnerId = initData.resourceOwnerId ?? "";


        this.Client.init({
            autoConnect : initData.clientAutoConnect ?? false,
            appName : initData.appName ?? ""
        })
        //client Login시
        this.Client.onAuthStateChanged(async (userId:string)=>{
            this.clientId = this.Client.clientId;
            this.applicationId = this.Client.applicationId;
            this.accessToken = this.Client.accessToken;
            this.resourceOwnerId = this.Client.resourceOwnerId;
            if(this.userId !== null && userId !== null)
                await this.getGateway();
            
            await this.setInitDataAfterLogin("client", userId);
        })

        if(this.applicationId !== -1 && this.resourceOwnerId !== ""){
            await this.getGateway();

            this.Auth.init({
                googleClientId : initData.googleClientId,
                googleClientSecret : initData.googleClientSecret,
                appleClientId : initData.appleClientId,
                appleClientSecret : initData.appleClientSecret,
                ndpClientId : initData.ndpClientId,
                ndpClientSecret : initData.ndpClientSecret,
                googleRedirectUri : initData.googleRedirectUri,
                appleRedirectUri : initData.appleRedirectUri,
                ndpRedirectUri : initData.ndpRedirectUri,
                redirectUri : initData.redirectUri
            });
            // Auth login시
            this.Auth.onAuthStateChanged(async (userId:string)=>{
                this.clientId = this.Auth.clientIds[this.Auth.usedType];
                this.accessToken = this.Auth.tokenData.access_token;
    
                await this.setInitDataAfterLogin("auth", userId);
            })
        }
    }
    private async setInitDataAfterLogin(type:"client" | "auth", userId:string){
        if(type === "auth" && this.applicationId === -1){
            console.error("직접 로그인 사용을 원할 경우 init시 applicationId 가 필요합니다.");
        }
        const beforeUserId = this.userId;

        this.userId = userId;
        this.loginType = type;
        
        if(this.userId !== null){
            this.Relay.setInit({
                userId,
                accessToken: this.accessToken,
                applicationId : this.applicationId,
                resourceOwnerId : this.resourceOwnerId,
                url : this.url.RELAY
            });
            this.InkStore.setInit({
                userId,
                accessToken: this.accessToken,
                url : this.url.INK
            });
            this.Paper.setInit({
                accessToken: this.accessToken,
                url : this.url.PAPER
            });
            this.Storage.setInit({
                accessToken : this.accessToken,
                url : this.url.STORAGE
            })
            await this.User.setInit({
                userId,
                accessToken: this.accessToken,
                clientId : this.clientId,
                url : this.url.USER
            });
        }
        if(beforeUserId !== this.userId){
            const changeFunction = this.authStateChangeFunctions.slice(0);
            for(let i = 0; i < changeFunction.length; i++){
                try{
                    await changeFunction[i](this.userId);
                }catch(e){
                    console.log(e);
                }
            }
            if(this.userId !== null)
                this.authStateChangeFunctions = [];
        }else if(beforeUserId !== null && beforeUserId === this.userId){
            // 토큰 업데이트

        }
    }


    onAuthStateChanged(callbackFunction:(userId:string)=>any){
        // this.authStateChangeFunctions.push(callbackFunction);
        // this.Auth.onAuthStateChanged(callbackFunction);
        // this.Client.onAuthStateChanged(callbackFunction);
        this.authStateChangeFunctions.push(callbackFunction);
    }


    onGatewayReady(callback:Function){
        this.gatewayStateChangeFunctions.push(callback);
    }
    async getGateway(){
        if(this.applicationId === -1 || this.resourceOwnerId === ""){
            console.error("applicationId 혹은 resourceOwnerId가 존재하지 않습니다.");
            return ;
        }

        const getUrl = await fetch(`${NdpDefaultRouter}/gateway/v2/router/client?applicationId=${this.applicationId}&resourceOwnerId=${this.resourceOwnerId}`,{
            method : "GET",
            headers: {
            'Content-Type': 'application/json',
            }
        });
        const urlData =  await getUrl.json();
        this.url.server = urlData.url;

        const server = await fetch(`${this.url.server}/gateway/v2/server?applicationId=${this.applicationId}&resourceOwnerId=${this.resourceOwnerId}`,{
            method : "GET",
            headers: {
            'Content-Type': 'application/json',
            }
        })
        const res = await server.json();
            
        for(let i = 0; i < res.resultElements.length; i++){
            const obj = res.resultElements[i];
            this.url[obj.type] = obj.url;
        }

        this.isReady = true;
        
        this.Auth.setUrl(this.url.AUTH,this.url.USER);

        for(let i = 0 ; i < this.gatewayStateChangeFunctions.length; i++){
            this.gatewayStateChangeFunctions[i]();
        }
    }
    async getGatewayStatus(){
        type StatusData = {
            "kind": string,
            "totalElements": number,
            "resultElements": Array<{
                "name": string,
                "status": "ENABLE" | "DISABLE",
                "message": string
            }>
        };
        const getstatus = await fetch(`${NdpDefaultRouter}/gateway/v2/status`,{
            method : "GET",
            headers: {
            'Content-Type': 'application/json',
            }
        });
        const statusData:StatusData = await getstatus.json() as StatusData;
        
        let nowData = null;

        for(let i = 0; i < statusData.totalElements; i++){
            if(statusData.resultElements[i].name === "grida-board"){
                
                nowData = statusData.resultElements[i];
                break ;
            }
        }

       return nowData;
    }
    // 사용 편의성을 위해 getInstance 호출시 즉시 share 생성
    static getInstance(){
        if(isShared) return shared as NDP;

        else{
            const ndp = new NDP();
            ndp.setShare();

            return shared as NDP;
        }
    }
    setShare(){
        isShared = true;
        shared = this;
    }
    unsetShare(){
        isShared = false;
        shared = undefined;
    }

    get tokenExpired():number{
        if(this.loginType === "client"){
            return this.Client.tokenExp;
        }else if(this.loginType === "auth"){
            return this.Auth.tokenExp;
        }else{
            return -1;
        }
    }
}

export default NDP;

