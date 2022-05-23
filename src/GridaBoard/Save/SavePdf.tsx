import { saveAs } from "file-saver";
import { degrees, PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';

import GridaDoc from "../GridaDoc";

import { InkStorage } from "nl-lib/common/penstorage";
import { drawPath } from "nl-lib/common/util";
import { adjustNoteItemMarginForFilm, getNPaperInfo } from "../../nl-lib/common/noteserver";
import { store } from "../client/pages/GridaBoard";
import { NeoStroke } from "../../nl-lib/common/structures";
import { firebaseAnalytics } from "../util/firebase_config";

const PDF_TO_SCREEN_SCALE = 6.72; // (56/600)*72

// https://pdf-lib.js.org/

export async function savePDF(saveName: string) {
  const filename = saveName;
  const pdfDoc = await makePdfDocument();

  addStrokesOnPage(pdfDoc);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  saveAs(blob, filename);

  firebaseAnalytics.logEvent('save_pdf', {
    event_name: 'save_pdf'
  });
}

export async function makePdfDocument() {
  const doc = GridaDoc.getInstance();
  const docPages = doc.pages;

  let pdfUrl, pdfDoc = undefined;

  const pageInfos = [];
  const basePageInfos = [];

  let i = 0;
  for (const page of docPages) //병렬처리
  {
    pageInfos.push({
      section: page.pageInfos[0].section, 
      owner:  page.pageInfos[0].owner, 
      book: page.pageInfos[0].book,
      page: page.pageInfos[0].page
    });

    basePageInfos.push({
      section:  page.basePageInfo.section,
      owner: page.basePageInfo.owner, 
      book: page.basePageInfo.book, 
      page: page.basePageInfo.page
    });

    if (page.pdf === undefined) {
      //ncode page일 경우
      if (pdfDoc === undefined) {
        pdfDoc = await PDFDocument.create();
      }
      const pdfPage = await pdfDoc.addPage();
      
      // pdf page의 가로 세로를 맞춰준다
      // sizePu는 회전각에 따라 가로 세로가 바뀌기 때문에
      // 랜드스케이프에 맞춰 다시 바꿔준다.
      const {width, height} = page.pageOverview.sizePu;
      const long = (width > height) ? width : height;
      const short = (width > height) ? height : width;
      
      if(page.pageOverview.landscape){
        //가로가 긴거, 세로가 짧은거
        pdfPage.setWidth(long);
        pdfPage.setHeight(short);
      }else{
        //가로가 짧은거, 세로가 긴거
        pdfPage.setWidth(short);
        pdfPage.setHeight(long);
      }
      
      pdfPage.setRotation(degrees(page._rotation));
    }
    else {
      //pdf인 경우
      if (pdfUrl !== page.pdf.url) {
        pdfUrl = page.pdf.url;
        const existingPdfBytes = await fetch(page.pdf.url).then(res => res.arrayBuffer());
        const pdfDocSrc = await PDFDocument.load(existingPdfBytes);

        page.pdf.removedPage.forEach(el => {
          pdfDocSrc.removePage(el);
        });
        /******************* pdfDoc에서 remove를 할경우
         * pageCache에 값이 변하지 않아서 아래 getPages에서 기존의 개수가 그대로 나온다.
         * pageCache는 원래 직접접근 하면 안되는 privite 이지만, 강제로 value를 업데이트 해준다
         * 직접 접근 이외의 방법으로 업데이트가 가능하거나(현재 못찾음)
         * pdf-lib가 업데이트 되어 필요없다면 삭제 필요
         */
        (pdfDocSrc as any).pageCache.value = (pdfDocSrc as any).pageCache.populate();

        if (pdfDoc !== undefined) {
          //ncode 페이지가 미리 생성돼서 그 뒤에다 붙여야하는 경우
          const srcLen = pdfDocSrc.getPages().length;
          const totalPageArr = [];
          for (let i = 0; i<srcLen; i++) {
            totalPageArr.push(i);
          }

          const copiedPages = await pdfDoc.copyPages(pdfDocSrc, totalPageArr);

          for (const copiedPage of copiedPages) {
            const addedPage = await pdfDoc.addPage(copiedPage);
            addedPage.setRotation(degrees(page._rotation));
          }
        } else {
          pdfDoc = pdfDocSrc;
          pdfDoc.getPages()[i++].setRotation(degrees((page._rotation)%360));
        }
      } else {
        pdfDoc.getPages()[i++].setRotation(degrees((page._rotation)%360));
        continue;
      }
    }
  }

  return pdfDoc;
}

export async function findGridaPageObjByStrokeKey(gridaPageObj: {pageNo: number, rotation: number, isPdf: boolean}, key) {
  const docPages = GridaDoc.getInstance().pages;
  for (const docPage of docPages) {
    //page info를 grida doc의 그것과 비교해서 어떤 pdf doc에 stroke를 그릴지 결정
    const { section, owner, book, page } = docPage.basePageInfo;
    const pageId = InkStorage.makeNPageIdStr({ section, owner, book, page });

    if (pageId === key) {
      gridaPageObj.pageNo = docPage.pageNo;
      gridaPageObj.rotation = docPage._rotation

      if (docPage._pdf === undefined) {
        gridaPageObj.isPdf = false;
      }
    }
  }
}

export async function addStrokesOnPage(pdfDoc) {
  const inkSt = InkStorage.getInstance();
  const pages = pdfDoc.getPages();

  for (const [key, NeoStrokes] of inkSt.completedOnPage.entries()) {
    //잉크 스토리지에 저장된 스트로크가 몇번째 페이지인지 안전하게 검사
    const gridaPageObj: {pageNo: number, rotation: number, isPdf: boolean} = {pageNo: 0, rotation: 0, isPdf: true};
    findGridaPageObjByStrokeKey(gridaPageObj, key);

    const page = pages[gridaPageObj.pageNo];

    addStroke(page, NeoStrokes, gridaPageObj.isPdf)
  }
}

export function addStroke(page: PDFPage, NeoStrokes: NeoStroke[], isPdf: boolean) {
  const pageHeight = page.getHeight();
  
  for (let j = 0; j < NeoStrokes.length; j++) {
    const thickness = NeoStrokes[j].thickness;
    const brushType = NeoStrokes[j].brushType;
    const dotArr = NeoStrokes[j].dotArray;
    const rgbStrArr = NeoStrokes[j].color.match(/\d+/g);
    // const stroke_h = NeoStrokes[j].h;
    const stroke_h_origin = NeoStrokes[j].h_origin;
    // const { a, b, c, d, e, f, g, h } = stroke_h;
    // const { a: a0, b: b0, c: c0, d: d0, e: e0, f: f0, g: g0, h: h0 } = stroke_h_origin;
    let opacity = 1;
    if (NeoStrokes[j].brushType === 1) {
      opacity = 0.3;
    }
    const pointArray = [];
    let pageInfo = { section: NeoStrokes[j].section, owner: NeoStrokes[j].owner, book: NeoStrokes[j].book, page: NeoStrokes[j].page }

    if (NeoStrokes[j].isPlate) {
      pageInfo = { section: NeoStrokes[j].plateSection, owner: NeoStrokes[j].plateOwner, book: NeoStrokes[j].plateBook, page: NeoStrokes[j].platePage }
      for (let k = 0; k < dotArr.length; k++) {
        const dot = dotArr[k];
        const noteItem = getNPaperInfo(pageInfo); //plate의 item
        adjustNoteItemMarginForFilm(noteItem, pageInfo);
    
        let npaperWidth = noteItem.margin.Xmax - noteItem.margin.Xmin;
        let npaperHeight = noteItem.margin.Ymax - noteItem.margin.Ymin;
        let plateMode = ""; //landscape(가로 모드), portrait(세로 모드)
    
        if(npaperWidth > npaperHeight){
          plateMode = "landscape";
        }else{
          plateMode = "portrait";
        }
    
        const pageSize = page.getSize()
    
        let pageMode = ""; //page 기본값의 모드
    
        if(pageSize.width > pageSize.height){
          pageMode = "landscape";
        }else{
          pageMode = "portrait";
        }
    
        let addedRotation = 0;
        if(plateMode === pageMode){
          //둘다 같은 모드면 각도 조절이 필요 없음
          addedRotation = 0;
        }else{
          addedRotation = 90;
        }

        let { x, y } = dot;

        const finalRotation = (addedRotation + 0) % 360;
        
        let pageRate = pageSize.width/pageSize.height;
        const plateRate = npaperWidth/npaperHeight;
        
        if(addedRotation === 90) pageRate = 1/pageRate;
        
        // plate에 그렸을때 회전각에 따라 버려지는 좌표가 생김. 그 조정을 해줘야 함
        let addedX = 0, addedY = 0;
        if(plateRate > pageRate){
          // 가로 남음
          addedX = -(npaperWidth - pageRate * npaperHeight);
        }else{
          // 세로 남음
          addedY = -(npaperHeight - npaperWidth / pageRate);
        }
        
        if(dot.point.finalRotation === 90){
          y += addedY;
        }else if(dot.point.finalRotation === 180){
          x += addedX;
          y += addedY;
        }else if(dot.point.finalRotation === 270){
          x += addedX;
        }
    
        //좌표 변환 먼저
        let newX = Math.cos(Math.PI/180 * finalRotation) * x - Math.sin(Math.PI/180 * finalRotation) * y;
        const newY = Math.sin(Math.PI/180 * finalRotation) * x + Math.cos(Math.PI/180 * finalRotation) * y;
        if(finalRotation === 90){
          newX += noteItem.margin.Ymax;
        }
    
        const pageWidth = pageSize.width;
        const pageHeight = pageSize.height;
        
        if(finalRotation === 90 || finalRotation === 270){
          npaperHeight = noteItem.margin.Xmax - noteItem.margin.Xmin;
          npaperWidth = noteItem.margin.Ymax - noteItem.margin.Ymin;
        }
    
        const wRatio = pageWidth / npaperWidth;
        const hRatio = pageHeight / npaperHeight;
        let platePdfRatio = wRatio;
        if (hRatio > wRatio) platePdfRatio = hRatio;
        
        const pdf_x = newX * platePdfRatio;
        const pdf_y = newY * platePdfRatio;
    
        pointArray.push({ x: pdf_x, y: pdf_y, f: dot.f });
      }
    } else {
      if (isPdf) {
        for (let k = 0; k < dotArr.length; k++) {
          const { a, b, c, d, e, f, g, h } = stroke_h_origin;
          const dot = dotArr[k];
          const nominator = g * dot.x + h * dot.y + 1;
          const px = (a * dot.x + b * dot.y + c) / nominator;
          const py = (d * dot.x + e * dot.y + f) / nominator;
          
          const pdf_xy = { x: px, y: py};

          pointArray.push({ x: pdf_xy.x, y: pdf_xy.y, f: dot.f });
        }
      } else {
        for (let k = 0; k < dotArr.length; k++) {
          const { a, b, c, d, e, f, g, h } = stroke_h_origin; //stroke_h;
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
    page.moveTo(0, pageHeight);
    page.drawSvgPath(pathData, {
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

export async function addGraphicAndSavePdf(url: string, saveName: string) {

  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  const { height } = firstPage.getSize()
  firstPage.drawText('This text was added with JavaScript!', {
    x: 5,
    y: height / 2 + 300,
    size: 50,
    font: helveticaFont,
    color: rgb(0.95, 0.1, 0.1),
    rotate: degrees(-45),
  })


  const svgPath =
    'M 0,20 L 100,160 Q 130,200 150,120 C 190,-40 200,200 300,150 L 400,90'

  firstPage.moveTo(100, firstPage.getHeight() - 5)

  firstPage.drawSvgPath(svgPath)



  const pdfBytes = await pdfDoc.save();
  console.log(pdfBytes);

  const blob = new Blob([pdfBytes]);
  saveAs(blob, saveName);

  console.log(firstPage);

}
