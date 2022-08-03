import { PostInkBody, Page } from "./enum";


interface InkInitData {
    userId:string,
    accessToken:string,
    url : string
}

export type getStrokeType = "upload" | "stroke" | "extra";



class InkStore {
    userId = "";
    accessToken = "";
    url = "";
    isInit = false;
    
    async setInit(initData:InkInitData){
        this.userId = initData.userId;
        this.accessToken = initData.accessToken;
        this.url = initData.url;

        this.isInit = true;
    }
    
    // /**
    //  * @description  `타입`의 시간을 기준으로 유저의 start time 이후에 해당하는 Stroke 모두 반환
    //  * @param type  `upload` | `stroke`
    //  * @param startTime  UTC Timestamp 형태의 시간값 
    //  */
    // async getStroke(type:"upload" | "stroke", startTime:number):Promise<string>;

    // /**
    //  * @description `타입`의 시간을 기준으로 유저의 start time,endTime에 해당하는 Stroke 모두 반환
    //  * @param type  `upload` | `stroke`
    //  * @param type  UTC Timestamp 형태의 시간값 
    //  * @param startTime  UTC Timestamp 형태의 시간값 
    //  */
    //  async getStroke(type:"upload" | "stroke", startTime:number, endTime:number):Promise<string>;

    //  /**
    //   * @description 사용자의 extras 의 key와 value가 모두 일치하는 stroke 모두 반환
    //   * @param type  extra
    //   * @param type  UTC Timestamp 형태의 시간값 
    //   * @param startTime  UTC Timestamp 형태의 시간값 
    //   */
    // async getStroke(type:"extra", extraKey:string, extraValue:string):Promise<string>;
     

    /**
     * @description UserId에 해당하는 Page를 모두 반환
     */
    async getStroke():Promise<Array<Page>>;
    async getStroke(type?:getStrokeType,sub1?:any,sub2?:any){
        if(this.userId === ""){
            console.error("need init");
            return ;
        }
        let params = `/inkstore/v2/stroke/${this.userId}`;

        if(type !== undefined){
            if(type === "extra"){
                if(sub1 === undefined || sub2 === undefined){
                    console.error("need extraKey and extarValue");
                    return ;
                }
                params += `/extra/extraKey=${sub1}&extraValue=${sub2}`;
            }else{
                if(sub1 === undefined){
                    console.error("need startTime");
                    return ;
                }
                params += `/${type}-time?startTime=${sub1}`;
                if(sub2 !== undefined){
                    params += `&endTime=${sub2}`;
                }
            }
        }



        const data = await this.getData(this.url + params) as Array<Page>;
        console.log(data);
        return data;
    }

    /**
     * @description 사용자의 extras 의 key와 value가 모두 일치하는 stroke 모두 반환
     * @param extraKey  
     * @param extraValue  
     */
    getStrokeByExtra = async (extraKey:string, extraValue:string):Promise<Array<Page> | void> => (this as any).getStroke("extra", extraKey, extraValue);

    /**
    * @description 서버의 업로드 시간을 기준으로 유저의 start time,endTime에 해당하는 Stroke 모두 반환
    * @param startTime  UTC Timestamp 형태의 시간값 
    * @param endTime  UTC Timestamp 형태의 시간값 
    */
    getStrokeByUpload = async(startTime:number, endTime?:number):Promise<Array<Page> | void> => (this as any).getStroke("upload", startTime, endTime);

    /**
     * @description 스트로크의 시간을 기준으로 유저의 start time,endTime에 해당하는 Stroke 모두 반환
     * @param startTime  UTC Timestamp 형태의 시간값 
     * @param endTime  UTC Timestamp 형태의 시간값 
     */
    getStrokeByStroke = async(startTime:number, endTime?:number):Promise<Array<Page> | void> => (this as any).getStroke("stroke", startTime, endTime);
   
    
    /**
     * @description NoteId에 해당하는 Stroke를 모두 반환
     */
    async getNoteStroke(noteId:string):Promise<Array<Page>>;

    async getNoteStroke(noteId:string, type?:getStrokeType, sub1?:any, sub2?:any){
        if(this.userId === ""){
            console.error("need init");
            return ;
        }else if(noteId === ""){
            console.error("need noteId")
            return ;
        }
        let params = `/inkstore/v2/stroke/${this.userId}/note/${noteId}`;

        if(type !== undefined){
            if(type === "extra"){
                if(sub1 === undefined || sub2 === undefined){
                    console.error("need extraKey and extarValue");
                    return ;
                }
                params += `/extra/extraKey=${sub1}&extraValue=${sub2}`;
            }else{
                if(sub1 === undefined){
                    console.error("need startTime");
                    return ;
                }
                params += `/${type}-time?startTime=${sub1}`;
                if(sub2 !== undefined){
                    params += `&endTime=${sub2}`;
                }
            }
        }

        const data = await this.getData(this.url + params) as Array<Page>;
        return data;
    }
 
    /**
     * @description 노트의 extras 의 key와 value가 모두 일치하는 stroke 모두 반환
     * @param extraKey  
     * @param extraValue  
     */
    getNoteStrokeByExtra = async (noteId:string, extraKey:string, extraValue:string):Promise<Array<Page> | void> => (this as any).getNoteStroke(noteId, "extra", extraKey, extraValue);

     /**
     * @description 서버에 업로드된 시간을 기준으로 노트의 start time,endTime에 해당하는 Stroke 모두 반환
     * @param startTime  UTC Timestamp 형태의 시간값 
     * @param endTime  UTC Timestamp 형태의 시간값 
     */
    getNoteStrokeByUpload = async(noteId:string, startTime:number, endTime?:number):Promise<Array<Page> | void> => (this as any).getNoteStroke(noteId, "upload", startTime, endTime);
 
     /**
      * @description 스트로크의 시간을 기준으로 노트의 start time,endTime에 해당하는 Stroke 모두 반환
      * @param startTime  UTC Timestamp 형태의 시간값 
      * @param endTime  UTC Timestamp 형태의 시간값 
      */
    getNoteStrokeByStroke = async(noteId:string, startTime:number, endTime?:number):Promise<Array<Page> | void> => (this as any).getNoteStroke(noteId, "stroke", startTime, endTime);
    
    async postStroke(body:PostInkBody){
        const res = await fetch(this.url + "/inkstore/v2/stroke/" + this.userId, {
            method : "POST",
            headers: {
              'Content-Type': 'application/json',
              'Authorization' : `Bearer ${this.accessToken}`
            },
            body : JSON.stringify(body)
          });
          const data = await res.json() as any;

        return data;
    }
 

    private async getData(url:string){
        console.log(url)
        const res = await fetch(url, {
            method : "GET",
            headers: {
              'Content-Type': 'application/json',
              'Authorization' : `Bearer ${this.accessToken}`
            }
          });
          const data = await res.json() as any;

        return data;
    }
}

export default InkStore;