import React, { useEffect, useState } from "react";
import App from "../shared/App";
import { Provider } from "react-redux";
import { theme } from "../styles/theme";
import {
  Backdrop,
  CircularProgress,
  // Backdrop,
  // Button,
  // CircularProgress,
  // Dialog,
  // DialogActions,
  // DialogContent,
  // DialogContentText,
  // DialogTitle,
  // Fade,
  IconButton,
  MuiThemeProvider,
  Snackbar,
} from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";
import CloseIcon from "@material-ui/icons/Close";

import configureStore from "../store/configureStore";
import { RootState } from '../store/rootReducer';
import GridaDoc from "../GridaBoard/GridaDoc";
import { IFileBrowserReturn } from "../NcodePrintLib/NcodePrint/PrintDataTypes";
import GridaApp from "../GridaBoard/GridaApp";
import { hideUIProgressBackdrop, showUIProgressBackdrop } from "../store/reducers/ui";
import { fetchGzippedFile } from "../NcodePrintLib/NcodeSurface/NcodeFetcher";
import { g_paperType, g_paperType_default } from "../NcodePrintLib/NcodeSurface/NcodeSurfaceDataJson";
import { sleep } from "../NcodePrintLib/UtilFunc";



// const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
// export const store = createStore(rootReducer, composeEnhancers(applyMiddleware(thunk)));

export const store = configureStore();

// export const store = configureStore();


const handleToastClose = (e) => {
  console.log(e);
}
const renderToastMessage = () => {
  let isAlertToast = false;
  const rootState = store.getState() as RootState;
  const toast = rootState.ui.toast;

  if (toast.toastType === "error" || toast.toastType === "warning" || toast.toastType === "info" || toast.toastType === "success") {
    isAlertToast = true;
  }
  return (
    <Snackbar
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
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
            color: theme.palette.getContrastText(
              theme.palette[toast.toastType].main
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


const Root = () => {
  const [paperInfoInited, setPaperInfoInited] = useState(false);
  useEffect(() => {
    if (!paperInfoInited) {
      showUIProgressBackdrop();
      fetchGzippedFile("./nbs_v2.json.gz").then(async (nbs) => {
        // await sleep(10000);
        g_paperType.definition = JSON.parse(nbs);
        hideUIProgressBackdrop();
        setPaperInfoInited(true);
      }
      ).catch((e) => {
        g_paperType.definition = g_paperType_default;
        hideUIProgressBackdrop();
      });


    }
  }, [paperInfoInited]);

  const styles = {
    routerWrapper: {
      position: "absolute",
      width: "100%",
      height: "100%",
    },
    backdrop: {
      zIndex: theme.zIndex.drawer + 5,
      color: theme.palette.primary.main,
    },
  };



  const rootState = store.getState() as RootState;
  const shouldWait = rootState.ui.waiting.circular;

  return (
    <Provider store={store}>
      <MuiThemeProvider theme={theme}>
        <App theme={theme} />

        <Backdrop style={styles.backdrop} open={shouldWait} >
          <CircularProgress color="inherit" />
        </Backdrop>


        {renderToastMessage()}
      </MuiThemeProvider>
    </Provider>
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
  const app = GridaApp.getInstance();
  app.start();
})();




export default Root;
