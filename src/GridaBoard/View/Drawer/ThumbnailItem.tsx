import React, {useEffect, useState} from "react";
import { useSelector } from "react-redux";
import { makeStyles, Paper, Typography, Grow } from "@material-ui/core";

import GridaDoc from "../../GridaDoc";
import { RootState } from "../../store/rootReducer";
import { setActivePageNo } from '../../store/reducers/activePageReducer';

import { MixedPageView } from "nl-lib/renderer";
import { makeNPageIdStr } from "nl-lib/common/util";
import { PLAYSTATE, ZoomFitEnum } from "nl-lib/common/enums";
import { nullNcode } from "nl-lib/common/constants";
import { SvgIcon } from '@material-ui/core';

const DEFAULT_THUMBNAIL_SIDE_MARGIN = 26;

const useStyle = makeStyles(theme => ({
  paper : {
    margin: `10px 0px`,
    marginLeft: "40px",
    marginRight: "26px",
    overflow: "hidden",
    position: "relative"
  },
  mixedViewer : {
    position: "absolute",
    margin: "0",
    padding: 0,
    right: 0,
    left: 0,
    top: 0,
    height: "100%",
    borderWidth: 3,
    border: 'solid',
    borderColor: "rgb(255, 255,255)"
  },
  selected : {
    borderColor : "rgb(0, 0, 0)"
  },
  debuggerInfo : {
    position: "absolute",
    margin: 0,
    padding: 0,
    right: 0,
    left: 0,
    top: 0,
    height: "100%",
    zIndex: 999 
  },
  pageNumber: {
    float: "left", 
    width: "23.58px",
    marginLeft: "8.28px",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "16.41px",
    fontFamily: "Roboto",
    textAlign: "right",
  },
  iconContainer : {
    display: "flex", 
    height: "100%",
    justifyContent: "center", 
    alignItems: "center", 
  },
  hidecanvasSvgIcon : {
    position: "absolute",
    width: "40px",
    height: "40px",
    color: "rgba(88, 98, 125, 0.25)",
    zIndex: 1000,
    opacity: 0.78,
  }
}));
interface Props {
  pageNo: number,
  key: string | number,

  active: boolean,

  noInfo?: boolean,
}

const ThumbnailItem = (props: Props) => {
  const classes = useStyle();
  const pn = props.pageNo;
  
  const doc = GridaDoc.getInstance();

  const drawerWidth = useSelector((state: RootState) => state.ui.drawer.width);
  const activePageNo = useSelector((state: RootState) => state.activePage.activePageNo);

  const renderCountNo = useSelector((state: RootState) => state.activePage.renderCount);

  const hideCanvasMode = useSelector((state: RootState) => state.gesture.hideCanvasMode);

  const [showDeleteBtn, setShowDeleteBtn] = useState(false);

  const pdfUrl = undefined;
  const pdfFilename = undefined;
  const pdfFingerprint = undefined;
  let pdfPageNo = 1;
  let pdf = undefined;
  let rotation = 0;
  let basePageInfo = nullNcode();
  const page = doc.getPageAt(pn)
  
  if (activePageNo >= 0) {
    pdfPageNo = doc.getPdfPageNoAt(pn);
    pdf = page.pdf;
    if (page._pdfPage !== undefined) {
      rotation = page._pdfPage.viewport.rotation;
    } else {
      rotation = page.pageOverview.rotation;
    }
    basePageInfo = page.basePageInfo;
  }

  const pageOverview = page.pageOverview;
  const sizePu = pageOverview.sizePu;
  const pageInfo = page.pageInfos[0];

  const moveToThumbnailScroll = (pageNo:number) => {
    const thumbnail= document.getElementById("thumbnail - " + pageNo + " -mixed_view");
    thumbnail.scrollIntoView({block: "center", behavior: "smooth"});
  }
  
  const handleMouseDown = (pageNo:number) => {
    setActivePageNo(pageNo);
    moveToThumbnailScroll(pageNo);
  };

  const wh_ratio = sizePu.width / sizePu.height;

  const width = (drawerWidth - (DEFAULT_THUMBNAIL_SIDE_MARGIN*2 + 14 + 17)); //14: 페이지 넘버 추가되며 생긴 왼쪽 여백, 17: 스크롤바를 위한 추가 여백
  const height = width / wh_ratio;

  const playState = PLAYSTATE.live;

  // console.log(`thumbnail - ${pn}: pageNo: ${pdfPageNo} pdf: ${pdf} pdfUrl: ${pdfUrl} fingerprint: ${pdfFingerprint} `)
  return (
    <React.Fragment>
    <div id="thumbnail"> 
      <div className={classes.pageNumber}>{pn+1}</div>
      <Paper key={props.key} className={classes.paper} onClick={e => handleMouseDown(pn)} elevation={3} style={{ width: width, height: height }} >
        <div className={`${classes.mixedViewer} ${(activePageNo === pn? classes.selected:"")}`}>
          <MixedPageView  
            pdf={pdf}
            pdfUrl={pdfUrl} filename={pdfFilename}
            pdfPageNo={pdfPageNo}
            playState={playState} pens={[]}
            rotation={rotation}
            isMainView={false}

            pageInfo={pageInfo}
            basePageInfo={basePageInfo}

            parentName={`thumbnail - ${pn} `}
            viewFit={ZoomFitEnum.FULL}
            autoPageChange={false}
            fromStorage={true}
            fitMargin={5}
            // fixed
            noInfo

            activePageNo={activePageNo}

            renderCountNo={renderCountNo}
          />
        </div>

        {hideCanvasMode ? 
          <div className={classes.iconContainer}>
            <SvgIcon id="" className={classes.hidecanvasSvgIcon}>
              <path
                d="M19.97 21.385l-3.356-3.356c-1.448.66-3.023.991-4.614.973-1.64.02-3.263-.334-4.746-1.035a10.073 10.073 0 01-3.041-2.282A10.498 10.498 0 012.1 12.316l-.1-.314.105-.316a10.786 10.786 0 013.516-4.651L3 4.414l1.413-1.412 16.969 16.969-1.41 1.414h-.002zM7.036 8.451a8.574 8.574 0 00-2.919 3.551 8.308 8.308 0 007.883 5 9.308 9.308 0 003.087-.5l-1.8-1.8c-.4.196-.84.299-1.287.3a3.02 3.02 0 01-3-3c0-.447.103-.888.3-1.29L7.036 8.451zm12.816 7.161l-1.392-1.391a8.596 8.596 0 001.423-2.219 8.3 8.3 0 00-7.883-5c-.247 0-.495.009-.735.026L9.5 5.261c.822-.176 1.66-.263 2.5-.259 1.64-.02 3.263.334 4.746 1.035 1.15.56 2.181 1.335 3.041 2.282.912.977 1.63 2.12 2.113 3.365l.1.318-.105.316a10.427 10.427 0 01-2.042 3.3l-.001-.006z"
              />
            </SvgIcon>
          </div> :
          ""}

        <div className={classes.debuggerInfo}>
          {!props.noInfo
            ? <Typography style={{ color: "#f00" }}> {makeNPageIdStr(page.pageInfos[0])}</Typography>
            : ""
          }
        </div>
        
      </Paper>
      </div>
    </React.Fragment>
  )
}

export default ThumbnailItem;