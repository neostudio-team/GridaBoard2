import GridaDoc from 'GridaBoard/GridaDoc';
import { setActivePageNo, setDocNumPages, setUrlAndFilename } from '../GridaBoard/store/reducers/activePageReducer';
import { setDate, setDocId, setDocName, setIsNewDoc } from '../GridaBoard/store/reducers/docConfigReducer';
import { IBoardData } from './structures/BoardStructures';
import { MappingStorage, PdfDocMapper } from 'nl-lib/common/mapper';
import { InkStorage } from 'nl-lib/common/penstorage';
import Cookies from 'universal-cookie';
import { degrees, PDFDocument, rgb } from 'pdf-lib';
import { store } from 'GridaBoard/client/pages/GridaBoard';
import * as PdfJs from 'pdfjs-dist';
import { clearCanvas, sleep } from 'nl-lib/common/util';
import { makeGridaBlob } from 'GridaBoard/Save/SaveGrida';
import { forceUpdateBoardList } from 'GridaBoard/store/reducers/appConfigReducer';
import { showSnackbar } from 'GridaBoard/store/reducers/listReducer';
import { setLoadingVisibility } from 'GridaBoard/store/reducers/loadingCircle';
import getText from "GridaBoard/language/language";
import { addStroke } from '../GridaBoard/Save/SavePdf';
import { useHistory } from 'react-router-dom';
import { GridaDB } from 'GridaBoard/util/NDP_config';


const db = GridaDB.getInstance();
const cookies = new Cookies();


export const resetGridaBoard = async () => {
  const doc = GridaDoc.getInstance();
  setActivePageNo(-1);
  doc.pages = [];
  doc._pdfd = [];
  setDocNumPages(0);
  setUrlAndFilename(undefined, undefined);
  
  MappingStorage.getInstance().resetTemporary();
  InkStorage.getInstance().resetStrokes();

}

export const startNewGridaPage = async () => {
  resetGridaBoard();

  setDocName('undefined');
  setDocId("undefined");
  setIsNewDoc(true);
  setDocNumPages(0);
}

export const deleteAllFromTrash = async () => {
  /**
   * DB에서 휴지통에 있는 모든 파일 완전 삭제
   */
 
  const docArr = [];

  //delete from db
  const data = await db.getDocAll();
  
  for(const key in data){
    const doc = data[key];
    if (doc.dateDeleted > 0) {
      docArr.push(doc)
    }
  }

  let result = 0;

  for await (const el of docArr) {
    const deletedDocId = el.docId;

    await db.deleteDoc(deletedDocId);

    result = 1;
      
    const thumbnailPath = `${deletedDocId}.png`;
    await db.deleteFile(thumbnailPath);


    const gridaPath = `${deletedDocId}.grida`;
    await db.deleteFile(gridaPath);
  }

  return result;
}

export const deleteBoardFromLive = async (docItems: IBoardData[]) => {
  /**
   * 선택한 보드 리스트를 휴지통으로 이동
   */
  let result = 0;

  for await (const docItem of docItems) {
    const docId = docItem.docId;

    await db.updateDoc(docId, {
      dateDeleted : Date.now()
    });
    result = 1;
  }

  return result;
}

export const deleteBoardsFromTrash = async (docItems: IBoardData[]) => {
  /**
   * 휴지통에서 선택한 보드 리스트를 완전 삭제
   */
  let result = 0;
  for await (const docItem of docItems) {
    const docName = docItem.doc_name;
    if (docName === undefined) continue;
    const docId = docItem.docId;
  
    await db.deleteDoc(docId);
    result = 1;

    try{
      const thumbnailPath = `${docId}.png`;
      await db.deleteFile(thumbnailPath);
      
      const gridaPath = `${docId}.grida`;
      await db.deleteFile(gridaPath);
      result = 1;
    }catch(e){
      result = 0;
      console.log(e);
    }
  }

  return result;
}

export const restoreBoardsFromTrash = async (docItems: IBoardData[]) => {
  /**
   * 휴지통에서 선택한 보드 리스트를 복구
   */
  let result = 0;
  for await (const docItem of docItems) {
    const docName = docItem.doc_name;
    if (docName === undefined) continue;
    const docId = docItem.docId;
  
    await db.updateDoc(docId, {
      dateDeleted : 0,
    });
    
    result = 1;
  }

  return result;
}

export const copyBoard = async (docItem: IBoardData) => {
  /**
   * 선택한 보드 리스트를 복제
   */
  setLoadingVisibility(true);
  const userId = cookies.get('user_email');
  const docName = docItem.doc_name + getText('boardList_copied');
  const numPages = docItem.docNumPages;
  const date = new Date();
  const timeStamp = date.getTime();
  const docId = `${userId}_${docName}_${timeStamp}`;
  
  const gridaPath = (await db.getFilePath(`${docItem.docId}.grida`)).url;
  const thumbNailPath = (await db.getFilePath(`${docItem.docId}.png`)).url;
  
  let imageBlob;
  await fetch(thumbNailPath)
  .then(res => { return res.blob(); })
  .then(async data => {
    imageBlob = data;
  })

  await fetch(gridaPath)
  .then(res => res.json())
  .then(async data => {
    const gridaStr = JSON.stringify(data);
    const gridaBlob = new Blob([gridaStr], { type: 'application/json' });

    const gridaFileName = `${docId}.grida`;
    // const gridaPath = `${gridaFileName}`;

    await db.saveGrida(gridaBlob,gridaFileName, gridaFileName);

    const thumbFileName = `${docId}.png`;
    // const pngPath = `${thumbFileName}`;

    await db.savePng(imageBlob, thumbFileName, thumbFileName);

    saveToDB(docName, date, true, numPages);
  })
}

export const getTimeStamp = (created: number) => {
  // const nano_sec = Number(created.nanoseconds) / 1000000;
  // let nano_sec_str = nano_sec.toString();
  // nano_sec_str = nano_sec_str.padStart(3,'0'); //firstore에서 nano는 3자리 채워서 들어감

  // const sec = created.seconds.toString();
  // return sec + nano_sec_str;
}

export const fbLogout = () => {
  /**
   * 로그아웃
   */ 
  // auth.signOut();
  // secondaryFirebase.auth().signOut();
  // const cookies = new Cookies();
  // cookies.remove('user_email');
};


const makePdfJsDoc = async (loadingTask: any) => {
  return new Promise(resolve => {
    loadingTask.promise.then(
      pdf => {
        resolve(pdf);
      },
      function (e) {
        console.error('error code : ' + e);
      }
    );
  });
};

export async function makeThumbnail() {
  let pdfDoc = undefined;
  const doc = GridaDoc.getInstance();
  const docPages = doc.pages;

  const docPage = docPages[0];

  /** Make the first page of pdf doc
   * -----------------------------------------------------------------------------------
   */
  if (docPage.pdf === undefined) {
    if (pdfDoc === undefined) {
      pdfDoc = await PDFDocument.create();
    }
    const pdfPage = await pdfDoc.addPage();
    const {width, height} = docPage.pageOverview.sizePu;
    const long = (width > height) ? width : height;
    const short = (width > height) ? height : width;
    
    if(docPage.pageOverview.landscape){
      //가로가 긴거, 세로가 짧은거
      pdfPage.setWidth(long);
      pdfPage.setHeight(short);
    }else{
      //가로가 짧은거, 세로가 긴거
      pdfPage.setWidth(short);
      pdfPage.setHeight(long);
    }
    
    pdfPage.setRotation(degrees(docPage._rotation));
  } else {
    const existingPdfBytes = await fetch(docPage.pdf.url).then(res => res.arrayBuffer());
    pdfDoc = await PDFDocument.load(existingPdfBytes);

    docPage.pdf.removedPage.forEach(el => {
      pdfDoc.removePage(el);
    });
    (pdfDoc as any).pageCache.value = (pdfDoc as any).pageCache.populate();

    pdfDoc.getPages()[0].setRotation(degrees((docPage._rotation)%360));
  }

  /** Add strokes on the first page
   * -----------------------------------------------------------------------------------
   */
  const { section, owner, book, page } = docPage.basePageInfo;
  const docPageId = InkStorage.makeNPageIdStr({ section, owner, book, page });

  const isPdf = docPage._pdf === undefined ? false : true;

  const inkSt = InkStorage.getInstance();
  for (const [key, NeoStrokes] of inkSt.completedOnPage.entries()) {
    if (docPageId !== key) {
      continue;
    }

    const page = pdfDoc.getPages()[0];

    addStroke(page, NeoStrokes, isPdf);
  }

  /** Render pdf on canvas by PdfJs
   * -----------------------------------------------------------------------------------
   */
  const pdfBytes = await pdfDoc.save();
  const blob1 = new Blob([pdfBytes], { type: 'image/png' });
  const myUrl = await URL.createObjectURL(blob1);

  const loadingTask = await PdfJs.getDocument(myUrl);

  const pdfJsDoc: any = await makePdfJsDoc(loadingTask);

  let PDF_PAGE: PdfJs.PDFPageProxy;
  await pdfJsDoc.getPage(1).then(page => {
    PDF_PAGE = page;
  });

  const canvas: any = await document.createElement('canvas');

  const viewport = PDF_PAGE.getViewport({ scale: 1 });
  const ctx = canvas.getContext('2d');

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  clearCanvas(canvas, ctx);

  const renderContext = {
    canvasContext: ctx,
    transform: [1, 0, 0, 1, 0, 0],
    viewport: viewport,
  };

  await PDF_PAGE.render(renderContext).promise;


/** Make Image Blob and Return
   * -----------------------------------------------------------------------------------
   */
  const dataURL = canvas.toDataURL();

  const byteCharacters = atob(dataURL.split(',')[1]);
  const byteNumbers = new ArrayBuffer(byteCharacters.length * 2);
  const byteArray = new Uint8Array(byteNumbers);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  const imageBlob = new Blob([byteArray], { type: 'image/png' });

  return imageBlob;
  
/** Sample Code for thumbnail layout
  * -----------------------------------------------------------------------------------
  const canvas2 = document.createElement("canvas");
  canvas2.id = `1234`;
  canvas2.width = 800;
  canvas2.height = 800;
  const ctx2 = canvas2.getContext('2d');
  clearCanvas(canvas2, ctx2, 'rgb(220,220,220)');
  
  const src = { width: 595, height: 800 };
  const dx = (800 - src.width) / 2;
  const dy = (800 - src.height) / 2;
  
  ctx2.drawImage(canvas, 0, 0);
  
  const dataURL = canvas.toDataURL();
  const imageData = ctx2.getImageData(0, 0, 800, 800);
  
  const canvas1 = document.createElement("canvas");
  const uuid = uuidv4();
  canvas1.id = `scratchCanvas`;
  canvas1.width = 800;
  canvas1.height = 800;
  const ctx1 = canvas1.getContext('2d');
  ctx1.putImageData(imageData, 0, 0);
  */
}

export async function saveGridaToDB(docName: string) {
  /**
   * 파일 업로드. 그리다 파일 올리고, 썸네일 올리고 디비를 올린다.
   */
  setLoadingVisibility(true);
  const imageBlob = await makeThumbnail();

  /** Save Thumbnail as PNG file
   * -----------------------------------------------------------------------------------
   */
  const userId = cookies.get('user_email');
  const date = new Date();
  const timeStamp = date.getTime();
  setDate(timeStamp.toString());

  const gridaFileName = `${userId}_${docName}_${timeStamp}.grida`;
  // const gridaPath = `grida/${gridaFileName}`;

  /** Make & Upload Grida
   * -----------------------------------------------------------------------------------
   */
  const gridaBlob = await makeGridaBlob();

  await db.saveGrida(gridaBlob, gridaFileName, gridaFileName);

  const thumbFileName = `${userId}_${docName}_${timeStamp}.png`;
  // const pngPath = `thumbnail/${thumbFileName}`;

  await db.savePng(imageBlob, thumbFileName, thumbFileName);
  

  saveToDB(docName, date, false);

  return gridaFileName;
  /** Upload thumbnail image using Firebase
   * -----------------------------------------------------------------------------------
   */

  // saveAs(blob, 'abc.png');
}

export async function updateDB(docId: string, thumb_path: string, grida_path: string, date) {
  /**
   * 디비 데이터 업데이트
   */
  const doc = GridaDoc.getInstance();

  // const docId = `${userId}_${docName}_${date}`;

  await db.updateDoc(docId,{
    last_modified: new Date(),
    grida_path: grida_path,
    thumb_path: thumb_path,
    docNumPages: doc.numPages,
  })

  setLoadingVisibility(false);
}

export async function saveToDB(docName: string, nowDate: Date, isCopyProcess: boolean, docNumPages?: number) {
  /**
   * 디비 데이터 생성
   */
  const doc = GridaDoc.getInstance();
  
  const userId = cookies.get('user_email');

  const docId = `${userId}_${docName}_${nowDate.getTime()}`;

  let numPages = 0;
  if (docNumPages > 0) {
    numPages = docNumPages;
  } else {
    numPages = doc.numPages;
  }

  await db.setDoc(docId,{
    category: '0',
    created: nowDate,
    last_modified: nowDate,
    doc_name: docName,
    favorite: false,
    id: userId,
    dateDeleted: 0,
    docId : docId,
    docNumPages: numPages
  });

  console.log(`${docName} is created`);
  if (isCopyProcess) {
    forceUpdateBoardList();
    showSnackbar({
      snackbarType : "copyDoc",
      selectedDocName : [docName],
      selectedCategory : ""
    });
  } else {
    showSnackbar({
      snackbarType :"saveDoc",
      selectedDocName: [docName],
    });
  }
  setLoadingVisibility(false);
}

export const getThumbNailPath = async (docsList)=>{
  /**
   * 독스 리스트를 통해 썸네일 uri 리스트 가져오기
   */  
  const pathList = [];
  for(let i = 0; i < docsList.length; i++){
    if(docsList[i].thumbNailPath === undefined || docsList[i].thumbNailPath.expiredDatetime < new Date()){
      docsList[i].thumbNailPath = await db.getFilePath(`${docsList[i].docId}.png`);
    }

    if(docsList[i].thumbNailPath !== null){
      pathList.push(docsList[i].thumbNailPath.url);
    }
  }
  return pathList;
}

export const overwrite = async () => {
  setLoadingVisibility(true);
  /**
   * 현재 보고 있는 페이지 덮어 쓰기
   */

  //1. 썸네일 새로 만들기
  const imageBlob = await makeThumbnail();

  //2. grida 새로 만들기
  const gridaBlob = await makeGridaBlob();

  //3. thumbnail, last_modifed, grida 업데이트
  const docId = store.getState().docConfig.docId;
  const date = store.getState().docConfig.date;

  const gridaFileName = `${docId}.grida`; // `${userId}_${docName}_${date}.grida`;

  // const gridaPath = `grida/${gridaFileName}`;

  await db.saveGrida(gridaBlob, gridaFileName, gridaFileName);

  const thumbFileName = `${docId}.png`; // `${userId}_${docName}_${date}.png`;
  // const pngPath = `thumbnail/${thumbFileName}`;


  await db.savePng(imageBlob, thumbFileName, thumbFileName);

  await updateDB(docId, "thumb_path", "grida_path", date);
}



export const routeChange = async (nowDocs, historyCallback ?: Function) => {
  /**
   * 그리다 파일 열기
   */

  await resetGridaBoard();
  if (nowDocs.dateDeleted !== 0) {
    return false;
  }
  if(historyCallback){
    await historyCallback();
  }

  GridaDoc.getInstance()._pages = [];

  const gridaFile = await db.getFile(`${nowDocs.docId}.grida`, "json");

  await jsonToOpen(gridaFile, nowDocs.doc_name);
    
  setDocName(nowDocs.doc_name);
  setDocId(nowDocs.docId);
  setIsNewDoc(false);

  const m_sec = new Date(nowDocs.created).getTime();
  setDate(m_sec.toString());
};

export const jsonToOpen = async (data, fileName:string)=>{
  const pdfRawData = data.pdf.pdfInfo.rawData;
  const neoStroke = data.stroke;

  const pageInfos = data.pdf.pdfInfo.pageInfos;
  const basePageInfos = data.pdf.pdfInfo.basePageInfos;

  // pdf의 url을 만들어 주기 위해 rawData를 blob으로 만들어 createObjectURL을 한다
  const rawDataBuf = new ArrayBuffer(pdfRawData.length*2);
  const rawDataBufView = new Uint8Array(rawDataBuf);
  for (let i = 0; i < pdfRawData.length; i++) {
    rawDataBufView[i] = pdfRawData.charCodeAt(i);
  }
  const blob = new Blob([rawDataBufView], {type: 'application/pdf'});
  const url = await URL.createObjectURL(blob);

  const completed = InkStorage.getInstance().completedOnPage;
  completed.clear();

  const gridaArr = [];
  const pageId = []

  for (let i = 0; i < neoStroke.length; i++) {
    pageId[i] = InkStorage.makeNPageIdStr(neoStroke[i][0]);
    if (!completed.has(pageId[i])) {
      completed.set(pageId[i], new Array(0));
    }

    gridaArr[i] = completed.get(pageId[i]);
    for (let j = 0; j < neoStroke[i].length; j++){
      gridaArr[i].push(neoStroke[i][j]);
    }
  }

  const doc = GridaDoc.getInstance();
  doc.pages = [];
  
  if (data.mapper !== undefined) {
    const mapping = new PdfDocMapper(data.mapper.id, data.mapper.pagesPerSheet)
    
    mapping._arrMapped = data.mapper.params;

    const msi = MappingStorage.getInstance();
    msi.registerTemporary(mapping);
  }

  await doc.openGridaFile(
    { url: url, filename: fileName },
    pdfRawData,
    neoStroke,
    pageInfos,
    basePageInfos
  );
}

//div screenshot sample

// let div = $('#mixed-viewer-layer')[0]
// html2canvas(div).then(function(canvas) {
//   var image = canvas.toDataURL();
//   console.log(image);

//   var byteString = atob(image.split(',')[1]);
//   var mimeString = image.split(',')[0].split(':')[1].split(';')[0]

//   var ab = new ArrayBuffer(byteString.length);

//   // create a view into the buffer
//   var ia = new Uint8Array(ab);

//   // set the bytes of the buffer to the correct values
//   for (var i = 0; i < byteString.length; i++) {
//       ia[i] = byteString.charCodeAt(i);
//   }

//   // write the ArrayBuffer to a blob, and you're done
//   var blob = new Blob([ab], {type: mimeString});
//   saveAs(blob, 'sample.png');
