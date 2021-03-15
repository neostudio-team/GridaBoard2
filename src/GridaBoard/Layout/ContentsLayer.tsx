import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/rootReducer";
import GridaDoc from "../GridaDoc";
import { NeoPdfDocument } from "../../nl-lib/common/neopdf";
import { IFileBrowserReturn } from "../../nl-lib/common/structures";

import { nullNcode } from "../../nl-lib/common/constants";
import { MixedPageView } from "../../nl-lib/renderer";
import { PLAYSTATE } from "../../nl-lib/common/enums";
import { PenManager } from "../../nl-lib/neosmartpen";
import PageNumbering from "../../components/navbar/PageNumbering";
import RotateButton from "../../components/buttons/RotateButton";
import GridaToolTip from "../../styles/GridaToolTip";
import { IconButton, Popover } from "@material-ui/core";
import HelpIcon from '@material-ui/icons/Help';
import $ from "jquery";

const localStyle = {
  display: "flex",
  flex: 1,
  overflow: "auto",
  flexDirection: "column",
} as React.CSSProperties;

const pageNumberingStyle = {
  width: "171px",
  height: "46px",
  background: "rgba(255,255,255,0.25)",
  boxShadow: "rgba(156,156,156,0.48)",
  borderRadius: "100px",
  zIndex: 1500,
  position: "absolute",
  bottom: 5,
  left: "calc(50%)",
} as React.CSSProperties;

const rotateStyle = {
  position: "absolute",
  zIndex: 1900,
  top: "calc(13%)",
  left: "calc(97%)"
} as React.CSSProperties;

const dropdownStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  padding: "8px",
  position: "relative",
  width: "240px",
  height: "176px",
  background: "rgba(255,255,255,0.9)",
  boxShadow: "2px 2px 2px rgba(0, 0, 0, 0.25)",
  borderRadius: "12px",
} as React.CSSProperties;

const dropContentsStyle = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  padding: "4px 12px",
  position: "static",
  width: "224px",
  left: "calc(50% - 224px / 2)",
  top: "8px",
  marginTop: "8px"
} as React.CSSProperties;

interface Props {
  handlePdfOpen: (event: IFileBrowserReturn) => void,
}

const ContentsLayer = (props: Props) => {
  const { handlePdfOpen, ...rest } = props;

  const [pageWidth, setPageWidth] = useState(0);

  const rotationTrigger = useSelector((state: RootState) => state.rotate.rotationTrigger);
  const {activePageNo_store} = useSelector((state: RootState) =>({
    activePageNo_store: state.activePage.activePageNo,
  }));
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
  let pdfPageNo = 1;
  let rotation = 0;
  let pageInfos = [nullNcode()];
  let basePageInfo = nullNcode();
  let pdfFingerprint = undefined as string;

  const viewFit_store = useSelector((state: RootState) => state.viewFitReducer.viewFit);

  useEffect(() => {
    if (rotationTrigger !== toggleRotation) {
      setToggleRotation(rotationTrigger);
    }
  }, [rotationTrigger])

  useEffect(() => {
    if (activePageNo_store !== activePageNo) {
      setLocalActivePageNo(activePageNo_store);
    }
  }, [activePageNo_store])

  if (activePageNo_store >= 0) {
    const doc = GridaDoc.getInstance();
    const page = doc.getPageAt(activePageNo_store)
    if (page._pdfPage !== undefined) {
      rotation = page._pdfPage.viewport.rotation;
    } else {
      rotation = page.pageOverview.rotation;
    }
    pdf = page.pdf;

    pdfFingerprint = doc.getPdfFingerprintAt(activePageNo_store);
    pdfPageNo = doc.getPdfPageNoAt(activePageNo_store);
    pageInfos = doc.getPageInfosAt(activePageNo_store);
    basePageInfo = doc.getBasePageInfoAt(activePageNo_store);
  }

  const {renderCountNo_store} = useSelector((state: RootState) =>({
    renderCountNo_store: state.activePage.renderCount,
  }));

  const pens = useSelector((state: RootState) => state.appConfig.pens);
  const virtualPen = PenManager.getInstance().virtualPen;
  
  const handlePageWidthNeeded = (width: number) => {
    setPageWidth(width);
  }

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  $('#customer').hover(function() {
    $(this).removeAttr("color")
    $(this).css("color", "rgba(104,143,255,1)")
  },function() {
    $(this).css("color", "rgba(18,18,18,1)")
  });

  $('#shortcut').hover(function() {
    $(this).css("color", "rgba(104,143,255,1)")
  },function() {
    $(this).css("color", "rgba(18,18,18,1)")
  });

  $('#tutorial').hover(function() {
    $(this).css("color", "rgba(104,143,255,1)")
  },function() {
    $(this).css("color", "rgba(18,18,18,1)")
  });

  $('#faq').hover(function() {
    $(this).css("color", "rgba(104,143,255,1)")
  },function() {
    $(this).css("color", "rgba(18,18,18,1)")
  });

  return (
    <div id="main" style={localStyle}>
      <div style={rotateStyle}>
        <RotateButton />
      </div>
      <div>
      <GridaToolTip open={true} placement="top-start" tip={{
        head: "Helper",
        msg: "도움말 기능들을 보여줍니다.",
        tail: "키보드 버튼 ?로 선택 가능합니다"
      }} title={undefined}>
          <IconButton id="help_btn" onClick={handleClick} aria-describedby={id} style={{
            position: "absolute",
            zIndex: 1900,
            top: "calc(94%)",
            left: "calc(97%)"
          }}>
            <HelpIcon fontSize="large" 
              style={{
              zIndex: 1500,
              padding: 0,
            }}/>
          </IconButton>
      </GridaToolTip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
      >
        <div style={dropdownStyle}>
          <a id="customer" href="#" style={{textDecoration: "none", color: "rgba(18,18,18,1)"}}>
            <div style={dropContentsStyle}>
              <a>고객센터</a>
            </div>
          </a>
          <a id="shortcut" href="#" style={{textDecoration: "none", color: "rgba(18,18,18,1)"}}>
            <div style={dropContentsStyle}>
              <a>단축키 안내</a>
            </div>
          </a>
          <a id="tutorial" href="#" style={{textDecoration: "none", color: "rgba(18,18,18,1)"}}>
            <div style={dropContentsStyle}>
              <a>튜토리얼</a>
            </div>
          </a>
          <a id="faq" href="#" style={{textDecoration: "none", color: "rgba(18,18,18,1)"}}>
            <div style={dropContentsStyle}>
              <a>FAQ</a>
            </div>
          </a>
        </div>
      </Popover>
      </div>
      <div id="mixed-viewer-layer" style={{ 
        position: "relative",
        height: '100%',
        float: "right",
        // flexDirection: "row-reverse", 
        // justifyContent: "flex-start"
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
          autoPageChange={true}
          fromStorage={false}
          fitMargin={100}
          
          activePageNo={activePageNo_store}
          handlePageWidthNeeded = {(width) => handlePageWidthNeeded(width)}

          renderCountNo={renderCountNo_store}

          noInfo = {true}
        />
      </div>
      <div style={pageNumberingStyle}>
          <PageNumbering />
      </div>
    </div>
  );
}

export default ContentsLayer;