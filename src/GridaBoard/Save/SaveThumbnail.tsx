import { saveAs } from "file-saver";
import { degrees, PDFDocument, rgb } from 'pdf-lib';
import GridaDoc from "../GridaDoc";
import { InkStorage } from "nl-lib/common/penstorage";
import { isSamePage, drawPath } from "../../nl-lib/common/util";
import { PlateNcode_1, PlateNcode_2 } from "../../nl-lib/common/constants";
import { adjustNoteItemMarginForFilm, getNPaperInfo } from "../../nl-lib/common/noteserver";
import { store } from "../client/pages/GridaBoard";
import * as PdfJs from "pdfjs-dist";
import { clearCanvas } from "nl-lib/common/util";

const makePdfJsDoc = async (loadingTask: any) => {

  return new Promise(resolve => {
    loadingTask.promise.then(pdf => {
      resolve(pdf);
    }, function (e) {
      console.error('error code : ' + e)
    });
  })

  return new Promise(resolve => {
    loadingTask.promise.then(async function (pdfDocument) {
      console.log("# PDF document loaded.");
      
      // Get the first page.
      pdfDocument.getPage(1).then(async function (page) {
        // Render the page on a Node canvas with 100% scale.
        const canvas: any = document.createElement("canvas");
        
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
    })
  })
}

export async function saveThumbnail() {

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
  
  let isPdf = docPage._pdf === undefined ? false : true;

  const inkSt = InkStorage.getInstance();
  for (const [key, NeoStrokes] of inkSt.completedOnPage.entries()) {
    
    if (docPageId !== key) {
      continue;
    }

    const pdfPage = pdfDoc.getPages()[0]
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
      const pageInfo = { section: NeoStrokes[j].section, owner: NeoStrokes[j].owner, book: NeoStrokes[j].book, page: NeoStrokes[j].page }
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
          const pageHeight =currentPage.pageOverview.sizePu.height;
      
          const wRatio = pageWidth / npaperWidth;
          const hRatio = pageHeight / npaperHeight;
          let platePdfRatio = wRatio
          if (hRatio > wRatio) platePdfRatio = hRatio
      
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
            
            const pdf_xy = { x: px, y: py};

            pointArray.push({ x: pdf_xy.x, y: pdf_xy.y, f: dot.f });
          }
        } else {
          for (let k = 0; k < dotArr.length; k++) {
            const dot = dotArr[k];
            const nominator = g * dot.x + h * dot.y + 1;
            const px = (a * dot.x + b * dot.y + c) / nominator;
            const py = (d * dot.x + e * dot.y + f) / nominator;
            
            const pdf_xy = { x: px, y: py};
            
            pointArray.push({ x: pdf_xy.x, y: pdf_xy.y, f: dot.f });
          }
        }
      }

      let strokeThickness = thickness / 64;
      switch (brushType) {
        case 1: strokeThickness *= 5; break;
        default: break;
      }

      const pathData = drawPath(pointArray, strokeThickness);
      pdfPage.moveTo(0, pageHeight);
      pdfPage.drawSvgPath(pathData, {
        color: rgb(
          Number(rgbStrArr[0]) / 255,
          Number(rgbStrArr[1]) / 255,
          Number(rgbStrArr[2]) / 255
        ),
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
  })

  const canvas: any = await document.createElement("canvas");
        
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
 

/** Save Thumbnail as PNG file
  * -----------------------------------------------------------------------------------
  */
  const dataURL = canvas.toDataURL();

  const byteCharacters = atob(dataURL.split(',')[1]);
  const byteNumbers = new ArrayBuffer(byteCharacters.length*2);
  const byteArray = new Uint8Array(byteNumbers);

  for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
  }
  var blob = new Blob([byteArray], {type: 'image/png'});
  saveAs(blob, 'abc.png');

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