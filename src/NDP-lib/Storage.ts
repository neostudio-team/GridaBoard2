import {StorageData, StorageDetailFileData, StorageSaveOption, UserData} from "./enum";


interface StorageInitData {
    accessToken:string,
    url : string
}



class Storage {
    accessToken = "";
    url = "";
    
    async setInit(initData:StorageInitData){
        this.accessToken = initData.accessToken;
        this.url = initData.url;
    }
    async getFileDatafromTag(tag:string):Promise<null | StorageData>{
      const res1 = await fetch(`${this.url}/storage/v2/file?tag=${tag}`,{
        method : "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        }
      });
      const filesData = await res1.json();

      if(filesData.errorCode !== undefined){
        return null;
      }

      return filesData as StorageData;
    }
    async getFileDatafromId(id:number):Promise<null | StorageDetailFileData>{
      const res1 = await fetch(`${this.url}/storage/v2/file/${id}`,{
        method : "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        }
      });
      const filesData = await res1.json();
      console.log(filesData);


      if(filesData.errorCode !== undefined){
        return null;
      }

      return filesData as StorageDetailFileData;
    }
    async getFileFromTag(tag:string, type?:string):Promise<number | Blob | {[key:string]:any, [key:number]:any}>  {
      const data = await this.getFileDatafromTag(tag);

      if(data === null){
        return -1;
      }
      if(data.totalElements !== 1){
        return -2;
      }
      
      const detailData = await this.getFileDatafromId(data.resultElements[0].id);

      const dataUri = detailData.requestUri;

      const file = await fetch(`${dataUri}`,{
          method : "GET",
          headers: {
                'Content-Type': 'application/json'
          }
      });

      let rtData = null;
      if(type === "json" || type === "JSON"){
        rtData = await file.json();

        return rtData;
      }else{
        return await file.blob();
      }
    }
    async getFileFromId(id:number, type?:string):Promise<number | Blob | {[key:string]:any, [key:number]:any}>{
      const data = await this.getFileDatafromId(id);

      if(data === null){
        return 0;
      }

      const dataUri = data.requestUri;

      const file = await fetch(`${dataUri}`,{
          method : "GET",
          headers: {
                'Content-Type': 'application/json'
          }
      });

      let rtData = null;
      if(type === "json" || type === "JSON"){
        rtData = await file.json();

        return rtData;
      }else{
        return await file.blob();
      }
    }

    async saveFile(file:Blob, saveOpt : StorageSaveOption){
      const res = await fetch(`${this.url}/storage/v2/file`, {
        method : "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        },
        body : JSON.stringify(saveOpt)
      });

      const data:StorageDetailFileData = await res.json();
      if((data as any).errorCode) {
        return "error";
      }

      await fetch(`${this.url}/storage/v2/file/${data.id}/state/Uploading`, {
        method : "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        }
      });

      await fetch(`${data.requestUri}`, {
        method : "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        },
        body : file
      });

      await fetch(`${this.url}/storage/v2/file/${data.id}/state/Finished`, {
        method : "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        }
      });

      const checkRes = await fetch(`${this.url}/storage/v2/file/${data.id}`, {
        method : "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        }
      });

      return await checkRes.json() as StorageDetailFileData;
    }
    async deleteFile(id:number){
      const res = await fetch(`${this.url}/storage/v2/file/${id}`, {
        method : "DELETE",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        }
      });
    }
}
// {
//     "id": 37,
//     "name": "test",
//     "fileType": "Normal",
//     "contentType": "text",
//     "mimeType": "text/json",
//     "tag": "test1",
//     "description": "테스트용 파일",
//     "state": "Initialized",
//     "papers": [],
//     "metaData": {},
//     "requestUri": "https://objectstorage.ap-seoul-1.oraclecloud.com/p/7yRE3NvjPr2hu6Gws7XH0NuyQcWbogdV91_E_mG_hGT9CSQbONmoCgiPPClsPC3t/n/cnlkg4dnisfp/b/neolab-ndp-userstorage/o/rinmin1@neolab.net/1547/1663652204282_KbAYjCWwE.json",
//     "expiredDatetime": 1663653164283,
//     "fileName": "test.json"
// }
export default Storage;
