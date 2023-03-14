import 'firebase/auth';
import 'firebase/database';
import Cookies from 'universal-cookie';
import { GridaDB } from 'GridaBoard/util/NDP_config';



export default {}


// const db = secondaryFirebase.firestore();
const db = GridaDB.getInstance();
const cookies = new Cookies();



const objectToArray = (obj)=>{
  const keys = Object.keys(obj);
  const lastKey = Number(keys[keys.length-1]);
  const returnArr = [];
  for(let i = 0; i < lastKey+1; i++){
    returnArr[i] = obj[i];
  }
  return returnArr;
}
const arrayToObject = (array)=>{
  return Object.assign({}, array);
}

const saveCategory = async (categoryData)=>{
  /**
   * 카테고리 저장
   */
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }

  await db.setDoc("categoryData", arrayToObject(categoryData));
}

export const setDefaultCategory = async ()=>{
  /**
   * 카테고리 기본값으로 초기화
   */
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }
  
  const newCategoryData  = {
    0 : ["Unshelved", 0]
  }
  await saveCategory(newCategoryData);


  return objectToArray(newCategoryData);
}


export const getCategoryArray = async () => {
  /**
   * 카테고리 가져오기
   */
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return [];
  }
  
  const res = await db.getDoc("categoryData");

  return objectToArray(res);  
}

export const createCategory = async (categoryName:string)=>{
  /**
   * 카테고리 생성
   */
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }
  
  const dataArr = await getCategoryArray();

  if(dataArr.some((el)=>el[0]===categoryName)){
    console.log("already had");
    return "";
  }else{
    const newData = [...dataArr];
    newData.sort((a,b)=>b[1]-a[1]);

    dataArr.push([categoryName, newData[0][1]+1]);
    await saveCategory(dataArr);

    return categoryName;
  }
};


/**
 * (category name) => new categoryList
 */
 export const deleteCategory = async (selected) => {
  /**
   * 카테고리 삭제
   */
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }

  const selectedIdx = selected[3];
  
  const dataArr = await getCategoryArray();
  
  const nowSortIdx = dataArr[selectedIdx][1];
  dataArr[selectedIdx] = ["",-1];

  for(let i = 0; i < dataArr.length; i++){
    const now = dataArr[i];
    if(now[1] > nowSortIdx)
      now[1] -= 1;
  }


  const docsData = await getDatabase();
  if(docsData !== false){
    docsData.docs.forEach(async el=>{
      if(el.category == selectedIdx){
        await docCategoryChange(el, "0");
      }
    });
  }

  await saveCategory(dataArr);
  return dataArr;
}


export const changeCategoryName = async (prevName:any[], nextName:string) => {
  /**
   * 카테고리 이름 변경
   */
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }
  
  const dataArr = await getCategoryArray();
  console.log(prevName, nextName);
  dataArr[prevName[3]][0] = nextName;
  
  await saveCategory(dataArr);
  return dataArr;
}

export const changeCategorySort = async (selected, type:"up"|"down", alpha:number) => {
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }

  const dataArr = await getCategoryArray();
  // let alpha = 1;
  
  if(type == "up"){
    if(selected[1]-alpha <= 0){
      //최상단(0은 unshelved 고정)
      return false;
    }
    alpha *= -1;

  }else{
    if(selected[1]+alpha >= dataArr.length){
      //맨 마지막
      return false;
    }
    alpha *= 1;
  }


  for(let i = 0; i < dataArr.length; i++){
    if(dataArr[i][1] == dataArr[selected[3]][1] + alpha){
      dataArr[i][1] -= alpha;
    }
  }
  dataArr[selected[3]][1] += alpha;


  await saveCategory(dataArr);
  return true;
}

///////////////////////////////////////////////////////////

export const docCategoryChange = async (doc, categoryKey)=>{
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }

  await db.updateDoc(doc.docId, {
    category : categoryKey
  })
}


export const changeDocName = async (doc, changeName)=>{
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }
  console.log(doc);

  await db.updateDoc(doc.docId, {
    doc_name : changeName
  });
}



///////////////////////////////////////////////////////////

export const getDatabase = async ()=>{
  const userId = cookies.get('user_email');
  if(userId === undefined){
    return false;
  }

  const data = await db.getDocAll();
 
  const newDocs = [];
  let newCategoryData = null;

  for(const key in data){
    if (key === 'categoryData') {
      newCategoryData = objectToArray(data[key]);
    } else {
      newDocs.push(data[key]);
      newDocs[newDocs.length - 1].key = newDocs.length - 1;
    }
  }

  if (newCategoryData === null) {
    newCategoryData = await setDefaultCategory();
  }

  return {
    docs : newDocs,
    category : newCategoryData
  }
}
