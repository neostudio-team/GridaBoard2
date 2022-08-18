import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/rootReducer";
import GridaDoc from "../GridaDoc";
import { NeoPdfDocument } from "nl-lib/common/neopdf";
import { IFileBrowserReturn } from "nl-lib/common/structures";
import { nullNcode } from "nl-lib/common/constants";
import { MixedPageView } from "nl-lib/renderer";
import { PLAYSTATE } from "nl-lib/common/enums";
import { PenManager } from "nl-lib/neosmartpen";
import { makeStyles, Slide, Snackbar, SnackbarContent } from "@material-ui/core";
import InformationButton from "../components/buttons/InformationButton";
import { languageType } from "../language/language";
import getText from 'GridaBoard/language/language';

const useStyle = props=>makeStyles(theme=>({
  root : {
    display: "flex",
    position: "relative",
    flex: 1,
    overflow: "auto",
    flexDirection: "column"
  },
  information : {
    right: "24px",
    bottom: "24px",
    display: "flex",
    position : "fixed",
    zIndex: 100,
    "& > button": {
      marginTop: "16px",
      boxShadow: "2px 0px 24px rgba(0, 0, 0, 0.15), inset 0px 2px 0px rgba(255, 255, 255, 1)",
      borderRadius: "50%",
      display: "block",
      zoom: 1 / props.brZoom,
    }
  }
}));


interface Props {
  handlePdfOpen: (event: IFileBrowserReturn) => void,
}

const ContentsLayer = (props: Props) => {
  const { handlePdfOpen, ...rest } = props;

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [snackbarMsgSuffix, setSnackbarMsgSuffix] = useState("");
  const snackbarType = useSelector((state: RootState) => state.list.snackbar.type);
  const isShowDialog = useSelector((state: RootState) => state.list.dialog.show);

  useEffect(() => {
    switch (snackbarType) {
      case "saveDoc": {
        setSnackbarMsg(getText("saved_successfully"));
        setSnackbarMsgSuffix("");
        setOpenSnackbar(true);
        break;
      }
      default: break;
    }
  }, [snackbarType])

  let pdfPageNo = 1;
  let pageInfos = [nullNcode()];
  let basePageInfo = nullNcode();

  const {zoomStore} = useSelector((state: RootState) =>({
    zoomStore: state.zoomReducer.zoom as number,
  }));

  const rotationTrigger = useSelector((state: RootState) => state.rotate.rotationTrigger);
  const {activePageNo_store} = useSelector((state: RootState) =>({
    activePageNo_store: state.activePage.activePageNo,
  }));
  const brZoom = useSelector((state: RootState) => state.ui.browser.zoom);

  const classes = useStyle({brZoom:brZoom})();
  useEffect(() => {
    if (activePageNo_store !== activePageNo) {
      setLocalActivePageNo(activePageNo_store);
    }
  }, [activePageNo_store])
  //pdf file name을 설정하는건 사용자가 지정한 gridaboard 이름이어야 함. 미지정시에는 '그리다보드1'
  //store에 따로 가지고 있어야 한다

  const [toggleRotation, setToggleRotation] = useState(false);
  const [activePageNo, setLocalActivePageNo] = useState(-1);

  const pdfUrl = undefined as string;
  const pdfFilename = undefined as string;
  let pdf = undefined as NeoPdfDocument;
  let rotation = 0;

  const viewFit_store = useSelector((state: RootState) => state.viewFitReducer.viewFit);

  useEffect(() => {
    if (rotationTrigger !== toggleRotation) {
      setToggleRotation(rotationTrigger);
    }
  }, [rotationTrigger])

  
  if (activePageNo_store >= 0) {
    const doc = GridaDoc.getInstance();
    const page = doc.getPageAt(activePageNo_store)

    if (doc.pages.length !== 0) {
      if (page._pdfPage !== undefined) {
        rotation = page._pdfPage.viewport.rotation;
      } else {
        rotation = page.pageOverview.rotation;
      }
      pdf = page.pdf;
      pdfPageNo = doc.getPdfPageNoAt(activePageNo_store);
      pageInfos = doc.getPageInfosAt(activePageNo_store);
      basePageInfo = doc.getBasePageInfoAt(activePageNo_store);
    }
  }

  const {renderCountNo_store} = useSelector((state: RootState) =>({
    renderCountNo_store: state.activePage.renderCount,
  }));

  const pens = useSelector((state: RootState) => state.appConfig.pens);
  const virtualPen = PenManager.getInstance().virtualPen;

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpenSnackbar(false);
  };


  return (
    <div id="grida-main-view" className={`${classes.root}`}>
      {(languageType === "ko") ? <InformationButton className={classes.information} tutorialMain={1} tutorialSub={1} /> : ""}
      <div id="mixed-viewer-layer" style={{
        position: "relative",
        height: '100%',
        float: "right",
      }}>

        <MixedPageView
          pdf={pdf}
          pdfUrl={pdfUrl} filename={pdfFilename}
          pdfPageNo={pdfPageNo} pens={[...pens, virtualPen]}
          playState={PLAYSTATE.live}
          rotation={rotation}
          isMainView={true}

          pageInfo={pageInfos[0]}
          basePageInfo={basePageInfo}

          parentName={"grida-main-home"}
          viewFit={viewFit_store}
          zoom={zoomStore}
          autoPageChange={true}
          fromStorage={false}
          fitMargin={10}

          activePageNo={activePageNo_store}
          renderCountNo={renderCountNo_store}

          noInfo = {true}
        />
      </div>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        TransitionComponent={Slide}
        onClose={handleClose}
      >
        <SnackbarContent 
          message={
            <React.Fragment>
              <span>{snackbarMsg}</span>
              <span style={{borderBottom: "1px solid"}}>{snackbarMsgSuffix}</span>
            </React.Fragment>
          } 
        />
      </Snackbar>
    </div>
  );
}

export default ContentsLayer;