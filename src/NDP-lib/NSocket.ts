export type SocketReturnData = {
    result : boolean,
    cmd: string,
    message ?: string,
    data : {
        [key:string]:any,
        [key:number]:any
    }
}
export type EmitData = {
    cmd: string,
    [key:string] : any
}
class NSocket {
    url = "";
    protocols : string | string[] | undefined = undefined;
    socket :WebSocket|undefined = undefined;
    events:{[key:string]:{[key:string] : (data:SocketReturnData)=>any}} = {};
    eventsKey:{[key:string]:number} = {};

    constructor(url:string, protocols ?: string | string[] | undefined){
        this.url = url;
        this.protocols = protocols;
    }

    async connect(url ?: string, protocols?: string | string[] | undefined){
        if(url !== undefined) this.url = url;
        if(protocols !== undefined) this.protocols = protocols;
        return new Promise((resolve: (value: unknown) => void, reject: (reason?: any) => void) => {
            if(this.url === ""){
                reject("connect need url");
            }
            const socket = new WebSocket(this.url, this.protocols);
            
            socket.onopen = ()=>{
                this.socket = socket;
                this.socket.onmessage = this.onmessage.bind(this);
                this.socket.onerror = this.connectError.bind(this);
                resolve("soccess");
            }
            socket.onerror = () => {
                reject("fail");
            }
        })
    }
    connectError(ev: Event){
        console.log(ev);
    }
    disConnect(){
        this.socket?.close();
    }
    onmessage(event:MessageEvent<any>){
        try{
            const data = JSON.parse(event.data) as SocketReturnData;


            const key = data.cmd;

            this.callbackOne(key, data);
        }catch(e){
            console.log(e);
        }
        
    }
    callbackOne(listenKey:string, data:SocketReturnData){
        if(this.events[listenKey]){
            const eventsKey = Object.keys(this.events[listenKey]);
            for(let i = 0; i < eventsKey.length; i++){
                this.events[listenKey][eventsKey[i].toString()](data);
            }
        }
    }
    on(eventName : string, callback : (data:SocketReturnData)=>any){
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
    async emitFunctional(eventName : string, data : EmitData){
        return new Promise((resolve: (value: SocketReturnData) => void, reject: (reason?: any) => void) => {
            if(this.socket === undefined){
                reject("webSocket is not connected");
            }
            const eventCallbackFunction = (data:SocketReturnData)=>{
                this.off(eventName, eventCallbackFunction);
                resolve(data);
            }
            this.on(eventName, eventCallbackFunction);

            this.socket?.send(JSON.stringify(data));
        })
    }
    async emitCmd(eventType : string){
        return new Promise((resolve: (value: SocketReturnData) => void, reject: (reason?: any) => void) => {
            if(this.socket === undefined){
                reject("webSocket is not connected");
            }
            const eventCallbackFunction = (data:SocketReturnData)=>{
                this.off(eventType, eventCallbackFunction);
                resolve(data);
            }
            this.on(eventType, eventCallbackFunction)
            
            const sendData = {
                "cmd" : eventType
            };
            this.socket?.send(JSON.stringify(sendData));
        }) 
    }
    async emit(cmd : string, data: {[key:string]:any,[key:number]:any}){
        return new Promise((resolve: (value: SocketReturnData) => void, reject: (reason?: any) => void) => {
            if(this.socket === undefined){
                reject("webSocket is not connected");
            }
            const eventCallbackFunction = (data:SocketReturnData)=>{
                this.off(cmd, eventCallbackFunction);
                resolve(data);
            }
            this.on(cmd, eventCallbackFunction)
            
            const sendData = {
                "cmd" : cmd,
                "data" : data
            };
            this.socket?.send(JSON.stringify(sendData));
        })
    }
}

export default NSocket;