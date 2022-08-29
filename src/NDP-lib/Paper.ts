import {PaperGroupResponseTransfer, PaperListResponseTransfer, UserData} from "./enum";


interface paperInit {
    accessToken:string,
    url : string
}



class Paper {
    accessToken = "";
    url = "";
    
    async setInit(initData:paperInit){
        this.accessToken = initData.accessToken;
        this.url = initData.url;
    }
    /** 
     * @description 단일 페이지 불러오기
    */
    async getPage(section:number, owner:number, book:number, page :number){
        const res = await fetch(`${this.url}/paperhub/v2/paper?section=${section}&owner=${owner}&bookCode=${book}&page=${page}`,{          
            method : "GET",
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${this.accessToken}`
            }
        })
        const data = await res.json();
      
        return data as PaperListResponseTransfer;
    }

    /** 
     * @description 책단위 불러오기
     * 
     * thumbnail등이 여기 있다.
    */
    async getBook(section:number, owner:number, book:number){
        const res = await fetch(`${this.url}/paperhub/v2/papergroup?section=${section}&owner=${owner}&bookCode=${book}`,{          
            method : "GET",
            headers: {
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${this.accessToken}`
            }
        })
        const data = await res.json();
      
        return data as PaperGroupResponseTransfer;
    }
}

export default Paper;