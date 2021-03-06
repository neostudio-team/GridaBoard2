import React, {useState} from "react";
import { useSelector } from "react-redux";
import { makeStyles, Paper, Typography, Grow } from "@material-ui/core";

import GridaDoc from "../../GridaDoc";
import { RootState } from "../../store/rootReducer";
import { setActivePageNo } from '../../store/reducers/activePageReducer';

import { MixedPageView } from "nl-lib/renderer";
import { makeNPageIdStr } from "nl-lib/common/util";
import { PLAYSTATE, ZoomFitEnum } from "nl-lib/common/enums";
import { nullNcode } from "nl-lib/common/constants";
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';

const DEFAULT_THUMBNAIL_SIDE_MARGIN = 5;

const useStyle = makeStyles(theme => ({
  paper : {
    margin: `10px ${DEFAULT_THUMBNAIL_SIDE_MARGIN}px`,
    overflow: "hidden",
    position: "relative"
  },
  mixedViewer : {
    position: "absolute",
    margin: 0,
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
  removeBtn : {
    position: "absolute",
    right: "7px",
    top : "5px",
    zIndex: 1000,
    opacity: 0.78,
    transform: "scale(1)",
    "& > div:last-child": {
      width:"100%",
      height: "100%",
      position: "absolute",
      top: "0px",
      right: "0px",
    }
  },
  removeBtnMouseDown : {
    transform: "scale(0.85) !important",
    color: "#555555"
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

  const handleMouseDown = (pageNo:number) => {
    setActivePageNo(pageNo);
  };

  const pageOverview = page.pageOverview;
  const sizePu = pageOverview.sizePu;
  const pageInfo = page.pageInfos[0];

  const wh_ratio = sizePu.width / sizePu.height;

  const height = (drawerWidth - DEFAULT_THUMBNAIL_SIDE_MARGIN*2) / wh_ratio;
  const playState = PLAYSTATE.live;
  let isMouseDown = false;

  // console.log(`thumbnail - ${pn}: pageNo: ${pdfPageNo} pdf: ${pdf} pdfUrl: ${pdfUrl} fingerprint: ${pdfFingerprint} `)
  return (
    <Paper key={props.key} className={classes.paper} onClick={e => handleMouseDown(pn)} elevation={3} style={{ height: height }} onMouseOver={e=>{setShowDeleteBtn(false)}} onMouseLeave={e=>setShowDeleteBtn(false)}>
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
      <Grow in={showDeleteBtn}>
        <div className={classes.removeBtn}>
          <DeleteForeverIcon />
          <div
        onMouseDown={e=>{
          isMouseDown = true;
          e.currentTarget.parentElement.classList.add(classes.removeBtnMouseDown);
        }}
        onMouseUp={e=>{
          if(!isMouseDown) return ;
          isMouseDown = false;
          e.currentTarget.parentElement.classList.remove(classes.removeBtnMouseDown);

          GridaDoc.getInstance().removePages(pn);
        }}
        onMouseOut={e=>{
          isMouseDown = false;
          e.currentTarget.parentElement.classList.remove(classes.removeBtnMouseDown);
        }}></div>
        </div>
      </Grow>
      <div className={classes.debuggerInfo}>
        {!props.noInfo
          ? <Typography style={{ color: "#f00" }}> {makeNPageIdStr(page.pageInfos[0])}</Typography>
          : ""
        }
      </div>
    </Paper>
  )
}

export default ThumbnailItem;