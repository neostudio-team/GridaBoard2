import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import GridaDoc from "../GridaDoc";

import { makeNPageIdStr } from "nl-lib/common/util";

import { g_defaultPrintOption } from "nl-lib/ncodepod";

import { MappingStorage } from "nl-lib/common/mapper";
import { NoteServerClient } from "nl-lib/common/noteserver";

import KeyboardArrowDownRoundedIcon from '@material-ui/icons/KeyboardArrowDownRounded';
import PenTypeButton from "../components/buttons/PenTypeButton";
import ThicknessButton from "../components/buttons/ThicknessButton";
import TracePointButton from "../components/buttons/TracePointButton";
import ColorButtons from "../components/navbar/ColorButtons";
import BackgroundButton from "../components/buttons/BackgroundButton";
import FitButton from "../components/buttons/FitButton";
import PageNumbering from "../components/navbar/PageNumbering";
import { RootState } from "../store/rootReducer";
import { makeStyles } from "@material-ui/core";
import CustomBadge from "../components/CustomElement/CustomBadge"

const useStyle = props => makeStyles(theme => ({
  navStyle : {
    display: "flex",
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    height: "50px",
    zIndex: 1,
    zoom: 1 / props.brZoom,
    "&>div":{
      display: "inline-flex",
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
    },
    "&>div:nth-child(2)":{
      position: "relative",
      left: "-6%",
    }
  }
}));

const printBtnId = "printTestButton";
const printOption = g_defaultPrintOption;

const getNoteInfo = (event) => {
  // let url = "http://nbs.neolab.net/v1/notebooks/attributes?device=android";
  const note_info = new NoteServerClient();
  // note_info.getNoteInfo({});
};

const NavLayer = () => {
  const [num_pens, setNumPens] = useState(0);
  const [mapViewDetail, setMapViewDetail] = useState(0);
  const [docViewDetail, setDocViewDetail] = useState(0);
  const brZoom = useSelector((state: RootState) => state.ui.browser.zoom);
  const classes = useStyle({brZoom:brZoom})();
  const badgeInVisible = !useSelector((state: RootState) => state.ui.shotcut.show);

  let mapJson = {} as any;
  if (mapViewDetail) {
    const msi = MappingStorage.getInstance();
    const data = JSON.parse(JSON.stringify(msi._data));
    const arrDocMap = data.arrDocMap;

    arrDocMap.forEach(map => {
      if (mapViewDetail === 1) {
        const splitted = map.id.match(/^.+\/(.*)$/i);
        const pagesPerSheet = parseInt(splitted[1]);
        map["pagesPerSheet"] = pagesPerSheet;
        map["printPageInfo.sum"] = makeNPageIdStr(map.printPageInfo);
        map["basePageInfo.sum"] = makeNPageIdStr(map.basePageInfo);
        delete map.url;
        delete map.id;
        delete map.params;
        delete map.fingerprint;
        delete map.printPageInfo;
        delete map.basePageInfo;

      }
    });

    mapJson = data;
  }

  const docJson = { pdf: [], pages: [] };
  const doc = GridaDoc.getInstance();

  for (let i = 0; i < doc._pdfd.length; i++) {
    const p = doc._pdfd[i];
    const obj = {
      pdf: p.pdf,
      filename: p.pdf.filename,
      fingerprint: p.fingerprint,
      pdfOpenInfo: p.pdfOpenInfo,
      startPageInDoc: p.startPageInDoc,       // starting from 0
      endPageInDoc: p.endPageInDoc,         // starting from 0
      pdfToNcodeMap: p.pdfToNcodeMap,
    };
    docJson.pdf.push(obj);
  }

  for (let i = 0; i < doc.numPages; i++) {
    const p = doc._pages[i];
    const { _pdfPageNo, _pageToNcodeMaps } = p;
    const pageInfo = _pageToNcodeMaps[0].pageInfo;
    const basePageInfo = _pageToNcodeMaps[0].basePageInfo;
    const obj = {
      _pdfPageNo,
      _pageToNcodeMaps,
      pageInfo: makeNPageIdStr(pageInfo),
      basePageInfo: makeNPageIdStr(basePageInfo),

    }
    docJson.pages.push(obj);
  }


  return (
    <div className={classes.navStyle}>
      <div>
        <PenTypeButton />

        <CustomBadge badgeContent={`1~0`}>
          <ColorButtons />
        </CustomBadge>
        
        <CustomBadge badgeContent={`Z~B`}>
          <ThicknessButton />
        </CustomBadge>

        <CustomBadge badgeContent={`T`}>
          <TracePointButton />
        </CustomBadge>
      </div>

      <div>
        <PageNumbering />
      </div>

      <div>
        <BackgroundButton />

        <FitButton />
      </div>


      {/* 매핑 정보 살펴보기 */}
      {/* <div style={{ fontSize: "20px", fontWeight: "bold" }}>
        <Button variant="contained" color="primary"
          onClick={(event) => setMapViewDetail((mapViewDetail + 1) % 3)} >
          <Box fontSize={14} fontWeight="fontWeightBold" >매핑 테이블</Box>
        </Button>
      </div>

      { mapViewDetail
        ? <Paper style={{ position: "absolute", top: 100, minWidth: 800, maxHeight: 800, overflow: 'auto' }}>
          <ReactJson src={mapJson}
            displayDataTypes={false}
            name={"MappingStorage._data"} collapsed={4} theme="monokai" />
        </Paper>
        : ""}

      <div style={{ flex: 1 }}> </div> */}
      {/* GridaDoc 내부 */}
      {/* <div style={{ fontSize: "20px", fontWeight: "bold" }}>
        <Button variant="contained" color="primary"
          onClick={(event) => setDocViewDetail((docViewDetail + 1) % 2)} >
          <Box fontSize={14} fontWeight="fontWeightBold" >GridaDoc</Box>
        </Button>
      </div>

      { docViewDetail
        ? <Paper style={{ position: "absolute", top: 100, minWidth: 800, maxHeight: 800, overflow: 'auto' }}>
          <ReactJson src={docJson}
            displayDataTypes={false}
            name={"MappingStorage._data"} collapsed={3} theme="monokai" />
        </Paper>
        : ""}

      <div style={{ flex: 1 }}> </div> */}
      {/* 공책 정보 가져오기 테스트 버튼 */}
      {/* <div style={{ flex: 1 }}> </div> */}

      {/* 공책 정보 가져오기 테스트 버튼 */}
      {/* <div style={{ fontSize: "20px", fontWeight: "bold" }}>
        <Button variant="outlined" color="primary" onClick={(event) => getNoteInfo(event)} >
          <Box fontSize={14} fontWeight="fontWeightBold" >공책 정보 받아오기(현재 실패)</Box>
        </Button>
      </div>
      <div style={{ flex: 1 }}> </div> */}

      {/* 이미지 버튼 테스트 */}
      {/* <NeoImage src="/icons/icon_trash_n.png" /> */}

      {/* 인쇄 테스트 버튼 */}
      {/* <div style={{ fontSize: "20px", fontWeight: "bold" }}>
        <PrintPdfButton variant="contained" color="primary"
          id={printBtnId}
          url={pdfUrl}
          filename={pdfFilename}
          printOption={printOption}
          reportProgress={undefined} printOptionCallback={undefined}>
          <Box fontSize={14} fontWeight="fontWeightBold" >인쇄 시험 (인쇄 옵션 창을 띄울것)</Box>
        </PrintPdfButton>
      </div>
      <div style={{ flex: 1 }}> </div> */}


      {/* High-speed 인쇄 테스트 버튼 */}
      {/* <div style={{ fontSize: "20px", fontWeight: "bold" }}>
        <PrintNcodedPdfButton variant="contained" color="primary"
          id={printBtnId}
          url={pdfUrl} filename={pdfFilename}
          handkeTurnOnAppShortCutKey={turnOnGlobalKeyShortCut}
          // printOption={printOption}
          reportProgress={undefined} printOptionCallback={undefined}>
          <Box fontSize={14} fontWeight="fontWeightBold" >Ncode PDF</Box>
        </PrintNcodedPdfButton>
      </div>
      <div style={{ flex: 1 }}> </div> */}


      {/* 칼리브레이션 */}
      {/* <CalibrationButton url={pdfUrl} filename={pdfFilename} printOption={printOption} cancelCallback={undefined}>
        <Box fontSize={14} fontWeight="fontWeightBold" >Calibration</Box>
      </CalibrationButton> */}


      {/* 매핑 정보 지우기 버튼 */}
      {/* <div style={{ fontSize: "20px", fontWeight: "bold" }}>
        <ClearLocalMappingButton variant="contained" color="secondary" >
          <Box fontSize={14} fontWeight="fontWeightBold" >매핑정보 지우기</Box>
        </ClearLocalMappingButton>
      </div>
      <div style={{ flex: 1 }}> </div> */}

      {/* [신] 인쇄 옵션 다이얼로그 테스트 버튼 */}
      {/* <div style={{ fontSize: "14px" }}>
        <OptionDialogButton
          printOption={printOption}
          handkeTurnOnAppShortCutKey={turnOnGlobalKeyShortCut}
        >

          <Box fontSize={14} fontWeight="fontWeightBold" >신규, 인쇄옵션</Box>
        </OptionDialogButton>
      </div>

      <div style={{ flex: 1 }}> </div> */}

      {/* 구글 업로드 테스트 버튼 */}
      {/* <Upload />
      <div style={{ flex: 1 }}> </div>
      <GoogleBtn />
      <div style={{ flex: 11 }}> </div> */}
    </div>
  );
}

export default NavLayer;
