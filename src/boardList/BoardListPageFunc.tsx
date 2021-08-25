import GridaDoc from 'GridaBoard/GridaDoc';
import { setActivePageNo } from '../GridaBoard/store/reducers/activePageReducer';
import { setDate, setDocName, setIsNewDoc } from '../GridaBoard/store/reducers/docConfigReducer';
import firebase, { secondaryFirebase, auth } from 'GridaBoard/util/firebase_config';
import { IBoardData } from './structures/BoardStructures';
import { MappingStorage } from 'nl-lib/common/mapper';
import { InkStorage } from 'nl-lib/common/penstorage';
import Cookies from 'universal-cookie';
import { degrees, PDFDocument, rgb } from 'pdf-lib';
import { isSamePage, drawPath } from 'nl-lib/common/util';
import { PlateNcode_1, PlateNcode_2 } from 'nl-lib/common/constants';
import { adjustNoteItemMarginForFilm, getNPaperInfo } from 'nl-lib/common/noteserver';
import { store } from 'GridaBoard/client/pages/GridaBoard';
import * as PdfJs from 'pdfjs-dist';
import { clearCanvas } from 'nl-lib/common/util';
import { makeGridaBlob } from 'GridaBoard/Save/SaveGrida';
import { forceUpdateBoardList } from 'GridaBoard/store/reducers/appConfigReducer';
import { showSnackbar } from 'GridaBoard/store/reducers/listReducer';
import { setLoadingVisibility } from 'GridaBoard/store/reducers/loadingCircle';
import getText from "GridaBoard/language/language";

export const resetGridaBoard = async () => {
  const doc = GridaDoc.getInstance();
  doc.pages = [];
  doc._pdfd = [];
  
  MappingStorage.getInstance().resetTemporary();
  InkStorage.getInstance().resetStrokes();

}

export const startNewGridaPage = async () => {
  resetGridaBoard();

  // const pageNo = await GridaDoc.getInstance().addBlankPage();
  // setActivePageNo(pageNo);
  setDocName('undefined');
  setIsNewDoc(true);
}

export const deleteAllFromTrash = async () => {
  const docArr = [];
  const db = secondaryFirebase.firestore();
  const userId = firebase.auth().currentUser.email;

  //delete from db
  await db.collection(userId)
  .get()
  .then(async querySnapshot => {
    querySnapshot.forEach(doc => {
      if (doc.data().dateDeleted > 0) {
        docArr.push(doc.data())
      }
    });
  })


  //delete from storage
  const storageRef = secondaryFirebase.storage().ref();

  let result = 0;

  for await (const el of docArr) {
    const m_sec = getTimeStamp(el.created);
    // const deletedDocId = `${userId}_${el.doc_name}_${m_sec}`;
    const deletedDocId = el.docId;

    await db.collection(userId)
    .doc(deletedDocId).delete().then(() => {
      result = 1;
    }).catch((error) => {
      console.error("error removing document: " , error);
      result = 0;
    });

      
    const thumbnailRef = storageRef.child(`thumbnail/${deletedDocId}.png`);
    thumbnailRef.delete().then(function() {
      // File deleted successfully
    }).catch(function(error) {
      // Uh-oh, an error occurred!
    });

    const gridaRef = storageRef.child(`grida/${deletedDocId}.grida`);
    gridaRef.delete().then(function() {
      // File deleted successfully
    }).catch(function(error) {
      // Uh-oh, an error occurred!
    });

  }

  return result;
}

export const deleteBoardFromLive = async (docItems: IBoardData[]) => {
  const userId = firebase.auth().currentUser.email;
  const db = secondaryFirebase.firestore();

  let result = 0;

  for await (const docItem of docItems) {
    const docName = docItem.doc_name;
    const m_sec = getTimeStamp(docItem.created);
    // const docId = `${userId}_${docName}_${m_sec}`;
    const docId = docItem.docId;

    await db.collection(userId)
    .doc(docId)
    .update({
      dateDeleted : Date.now(),
    }).then(() => {
      result = 1;
    }).catch((error) => {
      console.error("error updating document: ", error);
      result = 0;
    });
  }
  return result;
}

export const deleteBoardsFromTrash = async (docItems: IBoardData[]) => {
  const db = secondaryFirebase.firestore();
  const userId = firebase.auth().currentUser.email;

  let result = 0;
  for await (const docItem of docItems) {
    const docName = docItem.doc_name;
    if (docName === undefined) continue;
    const docId = docItem.docId;
  
    await db.collection(userId)
    .doc(docId)
    .delete()
    .then(() => {
      result = 1;
    }).catch((error) => {
      console.error("error delete document: ", error);
      result = 0;
    });
  }

  return result;
}

export const restoreBoardsFromTrash = async (docItems: IBoardData[]) => {
  const db = secondaryFirebase.firestore();
  const userId = firebase.auth().currentUser.email;

  let result = 0;
  for await (const docItem of docItems) {
    const docName = docItem.doc_name;
    if (docName === undefined) continue;
    const docId = docItem.docId;
  
    await db.collection(userId)
    .doc(docId)
    .update({
      dateDeleted : 0,
    }).then(() => {
      result = 1;
    }).catch((error) => {
      console.error("error updating document: ", error);
      result = 0;
    });
  }

  return result;
}

export const copyBoard = async (docItem: IBoardData) => {
  const db = secondaryFirebase.firestore();
  const userId = firebase.auth().currentUser.email;
  const uid = firebase.auth().currentUser.uid;

  const docName = docItem.doc_name + getText('boardList_copied');
  const numPages = docItem.docNumPages;
  const date = new Date();
  const timeStamp = date.getTime();
  const docId = `${userId}_${docName}_${timeStamp}`;
  
  const storage = secondaryFirebase.storage();
  const storageRef = storage.ref();
  let gridaPath;
  let thumbNailPath;
  try{
    gridaPath = await storageRef.child(`grida/${uid}/${docItem.docId}.grida`).getDownloadURL();
  }catch(e){
   gridaPath = await storageRef.child(`grida/${docItem.docId}.grida`).getDownloadURL();
  }
  try{
    thumbNailPath = await storageRef.child(`thumbnail/${uid}/${docItem.docId}.png`).getDownloadURL();
  }catch(e){
   thumbNailPath = await storageRef.child(`thumbnail/${docItem.docId}.png`).getDownloadURL();
  }

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

    const storageRef = secondaryFirebase.storage().ref();
    const gridaFileName = `${docId}.grida`;
    const gridaRef = storageRef.child(`grida/${uid}/${gridaFileName}`);

    const gridaUploadTask = gridaRef.put(gridaBlob);
    gridaUploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      function (snapshot) {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Grida Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED: // or 'paused'
            console.log('Upload is paused');
            break;
          case firebase.storage.TaskState.RUNNING: // or 'running'
            console.log('Upload is running');
            break;
        }
      },
      function (error) {
        switch (error.code) {
          case 'storage/unauthorized':
            // User doesn't have permission to access the object
            break;
  
          case 'storage/canceled':
            // User canceled the upload
            break;
  
          case 'storage/unknown':
            // Unknown error occurred, inspect error.serverResponse
            break;
        }
      },
      async function () {

        const thumbFileName = `${userId}_${docName}_${timeStamp}.png`;
        const pngRef = storageRef.child(`thumbnail/${uid}/${thumbFileName}`);

        const thumbUploadTask = pngRef.put(imageBlob);
        await thumbUploadTask.on(
          firebase.storage.TaskEvent.STATE_CHANGED,
          function (snapshot) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Thumbnail Upload is ' + progress + '% done');
            switch (snapshot.state) {
              case firebase.storage.TaskState.PAUSED: // or 'paused'
                console.log('Upload is paused');
                break;
              case firebase.storage.TaskState.RUNNING: // or 'running'
                console.log('Upload is running');
                break;
            }
          },
          function (error) {
            switch (error.code) {
              case 'storage/unauthorized':
                // User doesn't have permission to access the object
                break;

              case 'storage/canceled':
                // User canceled the upload
                break;

              case 'storage/unknown':
                // Unknown error occurred, inspect error.serverResponse
                break;
            }
          },
          async function () {
            saveToDB(docName, "thumb_path", "grida_path", date, true, numPages);
          }
        );
      }
    );
  })
}

export const getTimeStamp = (created: {nanoseconds: number, seconds: number}) => {
  const nano_sec = Number(created.nanoseconds) / 1000000;
  let nano_sec_str = nano_sec.toString();
  nano_sec_str = nano_sec_str.padStart(3,'0'); //firstore에서 nano는 3자리 채워서 들어감

  const sec = created.seconds.toString();
  return sec + nano_sec_str;
}

export const fbLogout = () => {
  auth.signOut();
  secondaryFirebase.auth().signOut();
  const cookies = new Cookies();
  cookies.remove('user_email');
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

  return new Promise(resolve => {
    loadingTask.promise.then(async function (pdfDocument) {
      console.log('# PDF document loaded.');

      // Get the first page.
      pdfDocument.getPage(1).then(async function (page) {
        // Render the page on a Node canvas with 100% scale.
        const canvas: any = document.createElement('canvas');

        const viewport = page.getViewport({ scale: 1, rotation: 0 });
        const ctx = canvas.getContext('2d');

        // const canvas = document.createElement("canvas");
        canvas.id = `scratchCanvas`;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        clearCanvas(canvas, ctx);

        const renderContext = {
          canvasContext: ctx,
          transform: [1, 0, 0, 1, 0, 0],
          viewport: viewport,
        };

        await page.render(renderContext).promise; //promise~~~~~~~~~~~~~~~~~~~~~~~SS

        resolve(canvas);
      });
    });
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
    if (docPage._rotation === 90 || docPage._rotation === 270) {
      const tmpWidth = pdfPage.getWidth();
      pdfPage.setWidth(pdfPage.getHeight());
      pdfPage.setHeight(tmpWidth);
    }
  } else {
    const existingPdfBytes = await fetch(docPage.pdf.url).then(res => res.arrayBuffer());
    pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.getPages()[0].setRotation(degrees(docPage._rotation));
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

    const pdfPage = pdfDoc.getPages()[0];
    const pageHeight = pdfPage.getHeight();

    for (let j = 0; j < NeoStrokes.length; j++) {
      const thickness = NeoStrokes[j].thickness;
      const brushType = NeoStrokes[j].brushType;
      const dotArr = NeoStrokes[j].dotArray;
      const rgbStrArr = NeoStrokes[j].color.match(/\d+/g);
      const stroke_h = NeoStrokes[j].h;
      const stroke_h_origin = NeoStrokes[j].h_origin;
      const { a, b, c, d, e, f, g, h } = stroke_h;
      const { a: a0, b: b0, c: c0, d: d0, e: e0, f: f0, g: g0, h: h0 } = stroke_h_origin;
      let opacity = 1;
      if (NeoStrokes[j].brushType === 1) {
        opacity = 0.3;
      }
      const pointArray = [];
      const pageInfo = {
        section: NeoStrokes[j].section,
        owner: NeoStrokes[j].owner,
        book: NeoStrokes[j].book,
        page: NeoStrokes[j].page,
      };
      let isPlate = false;
      if (isSamePage(PlateNcode_1, pageInfo) || isSamePage(PlateNcode_2, pageInfo)) {
        isPlate = true;
      }
      if (isPlate) {
        for (let k = 0; k < dotArr.length; k++) {
          const noteItem = getNPaperInfo(pageInfo); //plate의 item
          adjustNoteItemMarginForFilm(noteItem, pageInfo);

          const currentPage = GridaDoc.getInstance().getPage(store.getState().activePage.activePageNo);

          const npaperWidth = noteItem.margin.Xmax - noteItem.margin.Xmin;
          const npaperHeight = noteItem.margin.Ymax - noteItem.margin.Ymin;

          const pageWidth = currentPage.pageOverview.sizePu.width;
          const pageHeight = currentPage.pageOverview.sizePu.height;

          const wRatio = pageWidth / npaperWidth;
          const hRatio = pageHeight / npaperHeight;
          let platePdfRatio = wRatio;
          if (hRatio > wRatio) platePdfRatio = hRatio;

          const dot = dotArr[k];
          const pdf_x = dot.x * platePdfRatio;
          const pdf_y = dot.y * platePdfRatio;

          pointArray.push({ x: pdf_x, y: pdf_y, f: dot.f });
        }
      } else {
        if (isPdf) {
          for (let k = 0; k < dotArr.length; k++) {
            const dot = dotArr[k];
            const nominator = g0 * dot.x + h0 * dot.y + 1;
            const px = (a0 * dot.x + b0 * dot.y + c0) / nominator;
            const py = (d0 * dot.x + e0 * dot.y + f0) / nominator;

            const pdf_xy = { x: px, y: py };

            pointArray.push({ x: pdf_xy.x, y: pdf_xy.y, f: dot.f });
          }
        } else {
          for (let k = 0; k < dotArr.length; k++) {
            const dot = dotArr[k];
            const nominator = g * dot.x + h * dot.y + 1;
            const px = (a * dot.x + b * dot.y + c) / nominator;
            const py = (d * dot.x + e * dot.y + f) / nominator;

            const pdf_xy = { x: px, y: py };

            pointArray.push({ x: pdf_xy.x, y: pdf_xy.y, f: dot.f });
          }
        }
      }

      let strokeThickness = thickness / 64;
      switch (brushType) {
        case 1:
          strokeThickness *= 5;
          break;
        default:
          break;
      }

      const pathData = drawPath(pointArray, strokeThickness);
      pdfPage.moveTo(0, pageHeight);
      pdfPage.drawSvgPath(pathData, {
        color: rgb(Number(rgbStrArr[0]) / 255, Number(rgbStrArr[1]) / 255, Number(rgbStrArr[2]) / 255),
        opacity: opacity,
        scale: 1,
      });
    }
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

  const viewport = PDF_PAGE.getViewport({ scale: 1, rotation: 0 });
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

export async function saveThumbnail(docName: string) {
  setLoadingVisibility(true);
  const imageBlob = await makeThumbnail();

  /** Save Thumbnail as PNG file
   * -----------------------------------------------------------------------------------
   */
  const storageRef = secondaryFirebase.storage().ref();

  const userId = firebase.auth().currentUser.email;
  const uid = firebase.auth().currentUser.uid;
  const date = new Date();
  const timeStamp = date.getTime();
  setDate(timeStamp.toString());

  const gridaFileName = `${userId}_${docName}_${timeStamp}.grida`;
  const gridaRef = storageRef.child(`grida/${uid}/${gridaFileName}`);

  /** Make & Upload Grida
   * -----------------------------------------------------------------------------------
   */
  const gridaBlob = await makeGridaBlob();

  const gridaUploadTask = gridaRef.put(gridaBlob);
  await gridaUploadTask.on(
    firebase.storage.TaskEvent.STATE_CHANGED,
    function (snapshot) {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Grida Upload is ' + progress + '% done');
      switch (snapshot.state) {
        case firebase.storage.TaskState.PAUSED: // or 'paused'
          console.log('Upload is paused');
          break;
        case firebase.storage.TaskState.RUNNING: // or 'running'
          console.log('Upload is running');
          break;
      }
    },
    function (error) {
      switch (error.code) {
        case 'storage/unauthorized':
          // User doesn't have permission to access the object
          break;

        case 'storage/canceled':
          // User canceled the upload
          break;

        case 'storage/unknown':
          // Unknown error occurred, inspect error.serverResponse
          break;
      }
    },
    async function () {
      const thumbFileName = `${userId}_${docName}_${timeStamp}.png`;
      const pngRef = storageRef.child(`thumbnail/${uid}/${thumbFileName}`);

      const thumbUploadTask = pngRef.put(imageBlob);
      await thumbUploadTask.on(
        firebase.storage.TaskEvent.STATE_CHANGED,
        function (snapshot) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Thumbnail Upload is ' + progress + '% done');
          switch (snapshot.state) {
            case firebase.storage.TaskState.PAUSED: // or 'paused'
              console.log('Upload is paused');
              break;
            case firebase.storage.TaskState.RUNNING: // or 'running'
              console.log('Upload is running');
              break;
          }
        },
        function (error) {
          switch (error.code) {
            case 'storage/unauthorized':
              // User doesn't have permission to access the object
              break;

            case 'storage/canceled':
              // User canceled the upload
              break;

            case 'storage/unknown':
              // Unknown error occurred, inspect error.serverResponse
              break;
          }
          setLoadingVisibility(false);
        },
        async function () {
          saveToDB(docName, "thumb_path", "grida_path", date, false);
        }
      );
    }
  );

  /** Upload thumbnail image using Firebase
   * -----------------------------------------------------------------------------------
   */

  // saveAs(blob, 'abc.png');
}

export async function updateDB(docName: string, thumb_path: string, grida_path: string, date) {
  const doc = GridaDoc.getInstance();

  const db = secondaryFirebase.firestore();
  const userId = firebase.auth().currentUser.email;

  const docId = `${userId}_${docName}_${date}`;

  db.collection(userId)
    .doc(docId)
    .update({
      last_modified: new Date(),
      grida_path: grida_path,
      thumb_path: thumb_path,
      docNumPages: doc.numPages,
    })
    .then(function () {
      console.log(`${docName} is created`);
      setLoadingVisibility(false);
    })
    .catch(error => {
      console.error('Error adding document: ', error);
      setLoadingVisibility(false);
    });
}

export async function saveToDB(docName: string, thumb_path: string, grida_path: string, nowDate: Date, isCopyProcess: boolean, docNumPages?: number) {
  const doc = GridaDoc.getInstance();
  
  const db = secondaryFirebase.firestore();
  const userId = firebase.auth().currentUser.email;

  const docId = `${userId}_${docName}_${nowDate.getTime()}`;

  let numPages = 0;
  if (docNumPages > 0) {
    numPages = docNumPages;
  } else {
    numPages = doc.numPages;
  }

  await db.collection(userId)
    .doc(docId)
    .set({
      category: '0',
      created: nowDate,
      last_modified: nowDate,
      doc_name: docName,
      favorite: false,
      id: userId,
      grida_path: grida_path,
      thumb_path: thumb_path,
      dateDeleted: 0,
      docId : docId,
      docNumPages: numPages,
    })
    .then(function () {
      console.log(`${docName} is created`);
      if (isCopyProcess) {
        store.dispatch(forceUpdateBoardList());
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
    })
    .catch(error => {
      console.error('Error adding document: ', error);
    });
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
