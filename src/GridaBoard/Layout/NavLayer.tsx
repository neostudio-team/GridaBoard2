import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import GridaDoc from "../GridaDoc";

import { makeNPageIdStr } from "nl-lib/common/util";

import { g_defaultPrintOption } from "nl-lib/ncodepod";

import { MappingStorage } from "nl-lib/common/mapper";
import { NoteServerClient } from "nl-lib/common/noteserver";

import PenTypeButton from "../components/buttons/PenTypeButton";
import ThicknessButton from "../components/buttons/ThicknessButton";
import TracePointButton from "../components/buttons/TracePointButton";
import ColorButtons from "../components/navbar/ColorButtons";
import FitButton from "../components/buttons/FitButton";
import PageNumbering from "../components/navbar/PageNumbering";
import { Collapse, IconButton, makeStyles, Typography } from "@material-ui/core";
import CustomBadge from "../components/CustomElement/CustomBadge"
import { ArrowDropDown, ArrowDropUp } from "@material-ui/icons";
import BoardNewButton from "../components/buttons/BoardNewButton";
import { RootState } from "../store/rootReducer";
import GestureButton from "../components/buttons/GestureButton";
import HideCanvasButton from "../components/buttons/HideCanvasButton";
import getText from "nl-lib/../GridaBoard/language/language";

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
    backgroundColor: theme.custom.white[50],
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
  },
  headerViewBtn : {
    zIndex: 0,
    height:"24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonLiner: {
    width: '1px',
    minWidth: '1px',
    minHeight: '1px',
    height: '15px',
    background: theme.custom.grey[1],
    borderRadius: '4px !important',
    borderRight: '0px !important',
  },
  shapeCircleFilled: {
    width: "24px",
    height: "24px",
    padding: "8px"
  },
  shapeCircle: {
    width: "8px",
    height: "8px",
    borderRadius: "8px",
    backgroundColor: props.gestureDisable ? "#4EE4A5" : theme.palette.primary.main
  },
  caption: {
    padding: "4px",
    color: "#121212",
    fontFamily: "Noto Sans CJK KR",
    fontStyle: "normal",
    fontWeight: "bold",
    fontSize: "11px",
    lineHeight: "16px",
    letterSpacing: "0.25px"
  }
}));

const printBtnId = "printTestButton";
const printOption = g_defaultPrintOption;

const getNoteInfo = (event) => {
  // let url = "http://nbs.neolab.net/v1/notebooks/attributes?device=android";
  const note_info = new NoteServerClient();
  // note_info.getNoteInfo({});
};

interface Props {
  hideHeader: () => void,
}

const NavLayer = (props: Props) => {
  const [num_pens, setNumPens] = useState(0);
  const [mapViewDetail, setMapViewDetail] = useState(0);
  const [docViewDetail, setDocViewDetail] = useState(0);
  const [isCollapsed, setCollapsed] = useState(false);
  
  const gestureDisable = useSelector((state: RootState) => state.gesture.gestureDisable);
  const brZoom = useSelector((state: RootState) => state.ui.browser.zoom);
  const classes = useStyle({brZoom:brZoom, gestureDisable:gestureDisable})();
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

  const HeaderController = (props)=>{
    return (
    <div className={classes.headerViewBtn} onClick={props.hideHeader}> 
      <IconButton aria-label="open drawer" onClick={() => { setCollapsed(prev => !prev) }} >
        {!isCollapsed? (<ArrowDropUp />) : (<ArrowDropDown />)}
      </IconButton>
    </div>);
  }

  return (
    <div className={classes.navStyle}>
        <div>
          <BoardNewButton />
          <div className={classes.headerButtonLiner} style={{marginLeft: '16px'}} />
          <PenTypeButton />

          <CustomBadge badgeContent={`1~0`}>
            <ColorButtons />
          </CustomBadge>
          
          <CustomBadge badgeContent={`Z~B`}>
            <ThicknessButton />
          </CustomBadge>
          
          <div className={classes.headerButtonLiner} style={{marginLeft: '16px', marginRight: '16px'}} />
          <CustomBadge badgeContent={`T`}>
            <TracePointButton />
          </CustomBadge>
          <CustomBadge badgeContent={`Shift-H`}>
            <HideCanvasButton />
          </CustomBadge>

          <div className={classes.headerButtonLiner} style={{marginLeft: '16px'}} />
          {gestureDisable ? "" : 
            (<CustomBadge badgeContent={`Shift-G`}>
              <GestureButton />
            </CustomBadge>)
          }
        </div>

        <div>
          {/* <PageNumbering /> */}
        </div>

        <div>
          <div className={classes.shapeCircleFilled}>
            <div className={classes.shapeCircle}></div>
          </div>
          <Typography className={classes.caption}>
            {gestureDisable ? getText("nav_page_mode") : getText("nav_plate_mode")}
          </Typography>
          <div className={classes.headerButtonLiner} style={{marginLeft: '16px'}} />
          <FitButton />
          <HeaderController {...props} /> 
        </div>
    </div>
  );
}

export default NavLayer;

