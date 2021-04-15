import React, { useState } from "react";
import '../styles/main.css'
import { makeStyles, MuiThemeProvider } from '@material-ui/core/styles';
import * as neolabTheme from '../theme';

import PUIController from '../components/PUIController';
import { turnOnGlobalKeyShortCut } from "../GlobalFunctions";
import ViewLayer from "../Layout/ViewLayer";
import { updateDrawerWidth } from "../store/reducers/ui";
import GridaDoc from "../GridaDoc";

import {
  NeoPdfManager,
  openFileBrowser2, g_hiddenFileInputBtnId, onFileInputChanged, onFileInputClicked
} from "nl-lib/common/neopdf";
import { IPageSOBP, IFileBrowserReturn, IGetNPageTransformType } from "nl-lib/common/structures";
import { useBeforeunload } from 'react-beforeunload';
import getText from "../language/language";

const useStyle = makeStyles(theme=>({
  rootDiv :{
    width: "100vw",
    height: "100vh",
    background: theme.palette.background.default
  }
}));

const Home = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [autoLoadOptions, setAutoLoadOptions] = useState(undefined as IGetNPageTransformType);
  const [loadConfirmDlgOn, setLoadConfirmDlgOn] = useState(false);
  const [loadConfirmDlgStep, setLoadConfirmDlgStep] = useState(0);
  const [noMoreAutoLoad, setNoMoreAutoLoad] = useState(false);

  const [activePageNo, setLocalActivePageNo] = useState(-1);
  const [pageWidth, setPageWidth] = useState(0);
  const pdfUrl = undefined as string;
  const pdfFilename = undefined as string;

  const setDrawerWidth = (width: number) => updateDrawerWidth({ width });
  const classes = useStyle();

  useBeforeunload(() => "변경사항이 저장되지 않을 수 있습니다."); //edge, chrome에선 broswer 내장 dialog box의 string을 return하여 보여줌

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const onDrawerResize = (size) => {
    setDrawerWidth(size);
  }

  const handlePageWidthNeeded = (width: number) => {
    setPageWidth(width);
  }

  /**
   * PDF 추가 로드 step 1) 페이지 변화 검출
   * @param pageInfo - 펜에서 들어온 페이지, PDF의 시작 페이지가 아닐수도 있다
   * @param found - 위의 pageInfo에 따라 발견된 mapping table 내의 item 정보 일부
   */

  /**
   * PDF 추가 로드 step 2) 다이얼로그 표시
   * @param found
   * @param pageInfo - found에 의해 결정된 PDF의 첫 페이지에 해당하는 pageInfo
   */
  const handleFileLoadNeeded = (found: IGetNPageTransformType, pageInfo: IPageSOBP, basePageInfo: IPageSOBP) => {
    const url = found.pdf.url;

    if (url.indexOf("blob:http") > -1) {
      setAutoLoadOptions({ ...found, pageInfo, basePageInfo });
      setLoadConfirmDlgStep(0);
      setLoadConfirmDlgOn(true);
    }
    else {
      // 구글 드라이브에서 파일을 불러오자
    }
    return;
  }

  /**
   * PDF 추가 로드 step 3) 다이얼로그 표시
   * @this autoLoadOption - IGetNPageTransformType.pageInfo에 PDF의 첫페이지가 들어 있다
   */
  const handleAppendFileOk = async () => {
    setLoadConfirmDlgOn(false);

    const url = autoLoadOptions.pdf.url;
    if (url.indexOf("blob:http") < 0)
      return { result: "fail", status: "not a local file, please load the file from google drive" }

    console.log(`try to load file: ${autoLoadOptions.pdf.filename}`);

    // 여기서 펜 입력은 버퍼링해야 한다.
    const selectedFile = await openFileBrowser2();
    console.log(selectedFile.result);

    if (selectedFile.result === "success") {
      const { url, file } = selectedFile;

      const doc = await NeoPdfManager.getInstance().getDocument({ url, filename: file.name, purpose: "test fingerprint" });
      if (doc.fingerprint === autoLoadOptions.pdf.fingerprint) {
        doc.destroy();
        handlePdfOpen({ result: "success", url, file }, autoLoadOptions.pageInfo, autoLoadOptions.basePageInfo);

        return { result: "success", status: "same fingerprint" }
      }
      else {
        doc.destroy();
        setLoadConfirmDlgStep(1);
        setLoadConfirmDlgOn(true);

        return { result: "fail", status: "same fingerprint" }
      }
      // setPdfUrl(url);
      // setPdfFilename(filename);
    }
    else if (selectedFile.result === "canceled") {
      setLoadConfirmDlgStep(1);
      setLoadConfirmDlgOn(true);
      return { result: "fail", status: "file open canceled" }
    }
  }

  /**
   * PDF 추가 로드 step 4) 다이얼로그에서 OK를 눌렀을 때
   * @param event
   * @param pageInfo - PDF의 시작 페이지
   */
  const handlePdfOpen = async (event: IFileBrowserReturn, pageInfo?: IPageSOBP, basePageInfo?: IPageSOBP) => {
    console.log(event.url)
    if (event.result === "success") {
      const doc = GridaDoc.getInstance();
      await doc.openPdfFile({ url: event.url, filename: event.file.name }, pageInfo, basePageInfo);

    }
    else if (event.result === "canceled") {
      alert(getText("alert_fileOpenCancel"));
    }
  };

  const handleNoMoreAutoLoad = () => {
    setNoMoreAutoLoad(true);
    setLoadConfirmDlgOn(false);
  }

  const handleCancelAutoLoad = () => {
    setLoadConfirmDlgOn(false);
  }

  //https://css-tricks.com/controlling-css-animations-transitions-javascript/

  console.log(`HOME: docPageNo:${activePageNo}, pdfUrl=${pdfUrl}`);
  
  return (
    <div className={classes.rootDiv}>
      <ViewLayer id="view-layer" handlePdfOpen={handlePdfOpen} style={{display: "flex"}}/>
      <input type="file" id={g_hiddenFileInputBtnId} onChange={onFileInputChanged} onClick={onFileInputClicked} style={{ display: "none" }} name="pdf" accept=".pdf,.grida" />
    </div>
  );
};

declare global {
  interface Window {
    _pui: any;
  }
}

(function (window) {
  const pui_grida = new PUIController('./nproj/3_1013_1116_Grida.nproj');
  const pui_smart = new PUIController("./nproj/SmartClassKit_Controller.nproj");
  const pui_paper = new PUIController("./nproj/papertube_controller_171117.nproj");

  window._pui = [];
  window._pui.push(pui_grida);
  window._pui.push(pui_smart);
  window._pui.push(pui_paper);

  turnOnGlobalKeyShortCut(true);
})(window);

let tx = 0;
let ty = 0;
let scale = 1;

document.addEventListener('wheel', function(e) {
  const box = document.getElementById('view-layer');
  if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      const s = Math.exp(-e.deltaY / 100);
      scale *= s;
  } else {
      const direction = 1; //natural.checked ? -1 : 1;
      tx += e.deltaX * direction;
      ty += e.deltaY * direction;
  }
  // var transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
  // box.style.webkitTransform = transform;
  // box.style.transform = transform;
}, {
  passive: false // Add this
});

window.onclick = function(event) {
  if(!event.target.parentNode || event.target.parentNode.matches === undefined) return ;

  // if (!event.target.matches('.backgroundDropDown')) {
  //   const background = document.getElementById("backgroundDrop");
  //   background.style.display = 'none'
  // }

  if (!event.target.matches('.fitDropDown')) {
    const fit = document.getElementById("fitDrop");
    fit.style.display = 'none'
  }
}

export default Home;
