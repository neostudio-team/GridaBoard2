import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { NavLink, Redirect, useHistory } from 'react-router-dom';
import { Backdrop, CircularProgress, IconButton, makeStyles, MuiThemeProvider, Snackbar } from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";
import CloseIcon from "@material-ui/icons/Close";

// import App from "../shared/App";
import { theme as them } from "../../styles/theme";
import * as neolabTheme from '../../theme';
import configureStore, {RootStore} from "../../store/configureStore";
import { RootState } from '../../store/rootReducer';

import GridaApp from "../../GridaApp";
import { hideToastMessage, hideUIProgressBackdrop, reportBrowserZoomFactor, showUIProgressBackdrop } from "../../store/reducers/ui";
import { fetchGzippedFile, getBrowserZoomFactor } from "nl-lib/common/util";
import { g_paperType, g_paperType_default } from "nl-lib/common/noteserver";
import Home from "../../View/Home";
import LoadingCircle from "../../Load/LoadingCircle";
import { turnOnGlobalKeyShortCut } from "../../GlobalFunctions";
import CombineDialog from 'boardList/layout/component/dialog/CombineDialog';
import Cookies from "universal-cookie";
import { MappingStorage } from "nl-lib/common/mapper/MappingStorage";
import { showNoticeGestureDialog } from "../../store/reducers/listReducer";
import NDP from "../../../NDP-lib";



// const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
// export const store = createStore(rootReducer, composeEnhancers(applyMiddleware(thunk)));

export const store:RootStore = configureStore();

// export const store = configureStore();
const useStyle = makeStyles(theme=>({
    backdrop: {
      zIndex: theme.zIndex.drawer + 5,
      color: theme.palette.primary.main,
    },
})); 


const handleToastClose = (e) => {
  console.log(e);
  hideToastMessage();
}
const renderToastMessage = () => {
  let isAlertToast = false;
  const toast = useSelector((state: RootState) => state.ui.toast);
  

  if (toast.toastType === "error" || toast.toastType === "warning" || toast.toastType === "info" || toast.toastType === "success") {
    isAlertToast = true;
  }
  return (
    <Snackbar
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      message={toast.message}
      open={toast.show}
      autoHideDuration={3000}
      onClose={handleToastClose}
      action={
        <React.Fragment>
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleToastClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </React.Fragment>
      }
    >
      {isAlertToast ? (
        <MuiAlert
          style={{
            color: them.palette.getContrastText(
              them.palette[toast.toastType].main
            ),
          }}
          onClose={handleToastClose}
          elevation={6}
          variant="filled"
          severity={toast.toastType}
        >
          {toast.message}
        </MuiAlert>
      ) : null}
    </Snackbar>
  );
}


const GridaBoard = () => {
  const [paperInfoInited, setPaperInfoInited] = useState(false);
  const [theme, settheme] = useState(neolabTheme.theme);
  const classes = useStyle();
  useEffect(() => {
    if (!paperInfoInited) {
      // showUIProgressBackdrop();
      fetchGzippedFile("./nbs_v2.json.gz").then(async (nbs) => {
        if (nbs.length > 10) {
          g_paperType.definition = JSON.parse(nbs);
        }

        for (const key in g_paperType_default) {
          if (!Object.prototype.hasOwnProperty.call(g_paperType.definition, key)) {
            g_paperType.definition[key] = g_paperType_default[key];
          }
        }
        // hideUIProgressBackdrop(); 
        setPaperInfoInited(true);
      }
      ).catch((e) => {
        g_paperType.definition = g_paperType_default;
        hideUIProgressBackdrop();
      });
    }
  }, [paperInfoInited]);


  const rootState = store.getState() as RootState;
  const shouldWait = useSelector((state: RootState) => state.ui.waiting.circular);
  const isShowDialog = useSelector((state: RootState) => state.list.dialog.show);

  const cookies = new Cookies();
  const userId = cookies.get('user_email');
  const history = useHistory();
  const [forsedUpdate, setForsedUpdate] = useState(0);

  let forsedWait = false;
  if (userId === undefined) {
    //로그인으로 자동으로 넘기기
    forsedWait = true;
    useEffect(()=>{
      const checkClient = async ()=>{
        if(!(await NDP.getInstance().Client.clientOpenCheck())){
          //클라이언트 연결 안됨, 바로 로그인
            location.replace("/");
        }else{
          NDP.getInstance().onAuthStateChanged(async userId => {
            // user.email
            if(userId !== null){
              //로그인 완료
              console.log("logined", userId);
              const expirationTime = new Date(NDP.getInstance().tokenExpired);
              cookies.set("user_email", userId, {
                expires: expirationTime
              });
              const user = await NDP.getInstance().User.getUserData();
              localStorage.GridaBoard_userData = JSON.stringify(user);
              setForsedUpdate(forsedUpdate+1);
            } else {
              location.replace("/");
            }
          });
        }
      }
      
      checkClient();
      
    },[])
  }

 
  
  const isPageMode = useSelector((state: RootState) => state.gesture.isPageMode);
  useEffect(()=>{
    const cookies = new Cookies();
    const openNoticeCookie = cookies.get("openNoticeGesture");
    if(openNoticeCookie !== "true" && !isPageMode){
      showNoticeGestureDialog("noticeGesture");
    }
  },[isPageMode])
  


  turnOnGlobalKeyShortCut(true);

  return (
    <React.Fragment>
      {/* 임시 네비 버튼 */}
      {/* <NavLink exact to="/about"> About </NavLink>
      <NavLink exact to="/"> Home </NavLink> */}
      {/* 임시 네비 버튼 */}
      <LoadingCircle />
      <MuiThemeProvider theme={theme}>
        {/* {paperInfoInited ?
        <Home /> : <></>} */}
        <Home />

        <Backdrop className={classes.backdrop} open={shouldWait || forsedWait} >
          <CircularProgress color="inherit" />
        </Backdrop>
        <CombineDialog open={isShowDialog} />


        {renderToastMessage()}
      </MuiThemeProvider>
    </React.Fragment>
  );
}


// const onTest = (e) => {
//   console.log(e);
// }

// const onChange = (e) => {
//   console.log(e);
// }


// (function () {
//   const elem = document.getElementById("pdf_file_append") as HTMLInputElement;
//   elem.addEventListener("click", onTest);
//   elem.addEventListener("change", onChange);
// })();

(function () {
  window.visualViewport.addEventListener("resize", viewportHandler);
  const msi = MappingStorage.getInstance();
  msi.loadMappingInfo();

  const app = GridaApp.getInstance();
  app.start();
})();



function viewportHandler(event) {
  const brZoom = getBrowserZoomFactor();

  // console.warn(`window scale =${event.target.scale}  browser zoom=${brZoom}`);
  reportBrowserZoomFactor(brZoom);
  // // NOTE: This doesn't actually work at time of writing
  // if (event.target.scale > 3) {
  //   document.body.classList.remove("hide-text");
  // } else {
  //   document.body.classList.add("hide-text");
  // }
}



export default GridaBoard;
