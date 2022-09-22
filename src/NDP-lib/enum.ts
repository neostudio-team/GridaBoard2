
export type clientIdType = "google" | "apple" | "ndp";


export interface AuthorizationToken {
    client_id: string,
    access_token: string, // JWT Token
    refresh_token: string,
    token_type: string  // "Bearer"
}

export interface TokenUserData {
    sub:string,
    aud:string,
    resourceOwner:string,
    scope: Array<string>,
    iss:string,
    type:string,
    applicationId: number,
    exp:number,
    iat:number,
    jti:string
}



interface LocalDateTime {
    nano: number,
    dayOfYear: number,
    dayOfWeek: string,
    month: string,
    dayOfMonth: number,
    year: number,
    monthValue: number,
    hour: number,
    minute: number,
    second: number,
    chronology: {
        calendarType: string,
        id: string
    }
}
type GenderType = "MALE" | "FEMALE" | "ETC";

export interface UserData {
    id : string,
    name : string,
    email : string,
    birthday : string,
    gender : GenderType,
    nationality : string,
    pictureUrl : string,
    visitCount : number,
    lastVisitDate : LocalDateTime,
    allowedPushMessage : boolean,
    canShare : boolean,
    extra : string
}


export interface Stroke {
    version : number,
    strokeUUID : string,
    deleteFlag : number,
    writeId : string,
    color : number,
    thickness : number,
    penTipType : number,
    strokeType : number,
    mac : string,
    startTime : number,
    updated : number,
    dotCount : number,
    dots : string,
}

export interface Page {
    section : number,
    owner : number,
    bookCode : number,
    pageNumber : number,
    strokes : Array<Stroke>,
    noteUUID : string
}

export interface InkExtra {
    extraKey : string,
    extraValue : string
}

type postMimeType = "application/vnd.neolab.ndp2.stroke+json";

export interface PostInkBody {
    extras ?: Array<InkExtra>,
    pages : Array<Page>,
    mimeType : postMimeType
}







/**
 * 
 * paper enum
 */



export interface PaperListResponseTransfer {
    kind : string,
    totalElements : number,
    resultElements : Array<PaperResponseTransfer>
}

export interface PaperResponseTransfer {
    id : string,
    section : number,
    owner : number,
    bookCode : number,
    pageNumber : number,
    x1 : number,
    y1 : number,
    x2 : number,
    y2 : number,
    cropMarginLeft : number,
    cropMarginRight : number,
    cropMarginTop : number,
    cropMarginBottom : number,
    pageType : string,
    accessScope : string,
    tag : string,
    paperGroupId : string,
    status : string,
    attachments : Array<PaperAttachmentResponseTransfer>,
    properties : Array<IdTagResponseTransfer>,
    createdAt : number,
    modifiedAt : number
}

export interface PaperAttachmentResponseTransfer {
    id : number,
    paperId : string,
    originalName : string,
    mimeType : string,
    tag : string,
    status : string,
    size : number,
    downloadUri : string,
    createdAt : number,
    modifiedAt : number
}

export interface IdTagResponseTransfer {
    id : number,
    tag : string
}

export interface PaperGroupResponseTransfer{
    id : string,
    section : number,
    owner : number,
    bookCode : number,
    pageStart : number,
    pageEnd : number,
    title : string,
    tag : string,
    accessScope : string,
    expireDate : number,
    status : string,
    progressStatus : string,
    type : string,
    papers : Array<PaperBaseInfoResponseTransfer>,
    attachments : Array<PaperGroupAttachmentResponseTransfer>,
    properties : Array<IdTagResponseTransfer>,
    createdAt : number,
    modifiedAt : number,
}

export interface PaperBaseInfoResponseTransfer {
    id : string,
    section : number,
    owner : number,
    bookCode : number,
    pageNumber : number
}
export interface PaperGroupAttachmentResponseTransfer {
    id : number,
    paperGroupId : string,
    originalName : string,
    mimeType : string,
    tag : string,
    status : string,
    size : number,
    downloadUri : string,
    createdAt : number,
    modifiedAt : number
}


export interface PenListData {
    battery: number,
    mac: string,
    name: string
}

export interface penControlOwner {
    ownerName : "GRIDABOARD" | "NEOSTUDIOWEB", 
    owned : boolean
}
/**
 * Relay enum
 */

type MessagePayloadTypeText = "application/text";
type MessagePayloadTypeStroke = "application/stroke.dot" | "application/stroke.line";
type MessagePayloadTypeStrokeKey = "application/stroke.dot.key" | "application/stroke.line.key";
type MessagePayloadTypeControl = "application/control";
type MessagePayloadTypeDirect = "application/direct";
type MessagePayloadTypeMultimedia = "application/url.link" | "url.image" | "url.video" | "url.sound" | "url.file";
type MessagePayLoadType = MessagePayloadTypeText | MessagePayloadTypeStroke | MessagePayloadTypeStrokeKey | MessagePayloadTypeControl | MessagePayloadTypeDirect | MessagePayloadTypeMultimedia;

type MessageCmdType = "CONNECT" | "JOIN" | "MESSAGE" | "DIRECT";
export interface MessageCallbackInterface {
    cmd : MessageCmdType, // CONNECT, JOIN, MESSAGE, DIRECT
    payload : {
       type : MessagePayLoadType,
       content ?: null | string | DotData | any /* media나 다른것에서 어떻게 올지 모름 */
    },
    sender : {
       id : string,
       sessionKey : string,
       name : string,
       resourceOwnerId : string,
       applicationId : string,
       type : string,
    },
    receiver ?: {
       id : string,
       sessionKey : string,
       name : string,
    },
    createdDate : number
 }

 export interface MessageSendInterface {
     cmd : MessageCmdType, // CONNECT, JOIN, MESSAGE, DIRECT
     payload : {
        type : MessagePayLoadType,
        content : null | string | DotData | any /* media나 다른것에서 어떻게 올지 모름 */
     },
     sender : {
        id : string,
        name : string,
     },
     receiver ?: {
        id : string,
        sessionKey : string,
        name : string,
     }
  }
 

export interface DotData {
    mode: penTypeMode, // DOWN, MOVE, END
    strokeUUID : string,
    dotCount : number,
    dots : string,
    page ?: {
        section: number,
        owner: number,
        bookCode: number,
        pageNumber: number,
        noteUUID: string
    },
    stroke ?: {
        version: number,
        deleteFlag: number,
        writeId: string,
        color: number,
        thickness: number,
        penTipType: number,
        strokeType: number,
        mac: string,
        startTime: number
    }
}


export type penTypeMode = "DOWN" | "MOVE" | "END";

export const penType:{
    [key:string]:penTypeMode,
    [key:number]:penTypeMode
} = {
    DOWN : "DOWN",
    MOVE : "MOVE",
    END : "END",
    0 : "DOWN",
    1 : "MOVE",
    2 : "END",
}

export interface StorageData {
    kind: string,
    totalElements: number,
    resultElements: Array<{
        id : number,
        name : string,
        fileType : string,
        size : number,
        contentType : string,
        mimeType : string,
        tag : string,
        description : string,
        state : string,
        papers : Array<any>,
        metaData : {
            [key: number] : any,
            [key: string] : any
        },
        fileName : string
    }>
  }

export interface StorageDetailFileData {
    contentType : string,
    description : string,
    expiredDatetime : number,
    fileName : string,
    fileType : string,
    id : number,
    metaData : {
        [key: number] : any,
        [key: string] : any
    },
    mimeType : string,
    name : string,
    papers : Array<any>,
    requestUri : string,
    state : string,
    tag : string,
  }

  
export interface StorageSaveOption {
    name : string,
    fileName : string,
    fileType : string,
    contentType ?: string,
    mimeType : string,
    tag ?: string,
    description :string,
    papers ?: Array<string>,
    metaData ?: {[key:string]:any, [key:number]:any}
    
  }