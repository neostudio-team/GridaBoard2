import {StorageDetailFileData, UserData} from "./enum";


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
    async getFilefromTag(tag:string){
      const res1 = await fetch(`${this.url}/storage/v2/file?tag=${tag}`,{
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

      return filesData.resultElements;
    }
    async getFilefromId(id:number){
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
}

export default Storage;