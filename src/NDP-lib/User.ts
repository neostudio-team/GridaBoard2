import {UserData} from "./enum";


interface UserInitData {
    userId:string,
    accessToken:string,
    url : string,
    clientId : string
}



class User {
    userId = "";
    accessToken = "";
    url = "";
    clientId = "";
    userData : UserData|null = null;
    
    async setInit(initData:UserInitData){
        this.userId = initData.userId;
        this.accessToken = initData.accessToken;
        this.clientId = initData.clientId;

        this.url = initData.url;
    }
    /** 
     * 로그인 이후, user 정보를 불러오는 함수
    */
    async getUserData(){
      if(this.userData !== null){
        return this.userData;
      }

      console.log(`${this.url}/user/v2/users/${this.userId}/profile?clientId=${this.clientId}`);
      console.log(this.accessToken);

      const res = await fetch(`${this.url}/user/v2/users/${this.userId}/profile?clientId=${this.clientId}`,{
        method : "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${this.accessToken}`
        }
      });
      const data = await res.json();
      
      this.userData = data as UserData;

      return this.userData;
    }
}

export default User;