import { store } from "../../client/pages/GridaBoard";
import { getBrowserZoomFactor } from "nl-lib/common/util";


//[Define Action Types
const ActionGroup = 'UI';

export const UIActionTypes = Object.freeze({


  SHOW_UI_PROGRESS: `${ActionGroup}.SHOW_UI_PROGRESS`,
  HIDE_UI_PROGRESS: `${ActionGroup}.HIDE_UI_PROGRESS`,
  SHOW_TOAST_MESSAGE: `${ActionGroup}.SHOW_TOAST_MESSAGE`,
  HIDE_TOAST_MESSAGE: `${ActionGroup}.HIDE_TOAST_MESSAGE`,
  SHOW_DIALOG: `${ActionGroup}.SHOW_DIALOG`,
  HIDE_DIALOG: `${ActionGroup}.HIDE_DIALOG`,
  RESET_DIALOG: `${ActionGroup}.RESET_DIALOG`,
  SHOW_PROGRESS_DIALOG: `${ActionGroup}.SHOW_PROGRESS_DIALOG`,
  HIDE_PROGRESS_DIALOG: `${ActionGroup}.HIDE_PROGRESS_DIALOG`,
  UPDATE_PROGRESS_DIALOG: `${ActionGroup}.UPDATE_PROGRESS_DIALOG`,

  UPDATE_DRAWER_WITH: `${ActionGroup}.UPDATE_DRAWER_WITH`,
  UPDATED_SELECTD_PAGE: `${ActionGroup}.UPDATED_SELECTD_PAGE`,

  REPORT_BROWSER_ZOOM: `${ActionGroup}.REPORT_BROWSER_ZOOM`,
  
  SHOW_SHORTCUT: `${ActionGroup}.SHOW_SHORTCUT`,
  SHOW_HELPMENU: `${ActionGroup}.SHOW_HELPMENU`,
  GET_THEME: `${ActionGroup}.GET_THEME`,
  SET_THEME: `${ActionGroup}.SET_THEME`,
  SET_LEFT_DRAWER_OPEN : `${ActionGroup}.SET_LEFT_DRAWER_OPEN`,
  SET_HEADER_OPEN : `${ActionGroup}.SET_HEADER_OPEN`,
  SET_SAVE_OPEN : `${ActionGroup}.SET_SAVE_OPEN`,


  SET_PRINT_progressPercent : `${ActionGroup}.SET_PRINT_progressPercent`,
  SET_PRINT_status : `${ActionGroup}.SET_PRINT_status`,
  SET_PRINT_progressOn : `${ActionGroup}.SET_PRINT_progressOn`,
  SET_PRINT_optionOn : `${ActionGroup}.SET_PRINT_optionOn`,
  SET_PRINT_waitingOn : `${ActionGroup}.SET_PRINT_waitingOn`,
  SHOW_INFORMATION : `${ActionGroup}.SHOW_INFORMATION`
});
//]

//[Action Methods
export const setTheme = (theme: String) => {
  store.dispatch({
    type: UIActionTypes.SET_THEME,
    theme: theme
  });
}
export const reportBrowserZoomFactor = (zoom: number) => {
  store.dispatch({
    type: UIActionTypes.REPORT_BROWSER_ZOOM,
    zoom: zoom
  });

}
export const showShortCut = (show: boolean) => {
  store.dispatch({
    type: UIActionTypes.SHOW_SHORTCUT,
    show: show
  });
}


export const showUIProgressBackdrop = () => {
  store.dispatch({
    type: UIActionTypes.SHOW_UI_PROGRESS
  });
};
export const hideUIProgressBackdrop = () => {
  store.dispatch({
    type: UIActionTypes.HIDE_UI_PROGRESS
  });
};

export const showErrorToast = (message) => {
  store.dispatch({
    type: UIActionTypes.SHOW_TOAST_MESSAGE,
    message: message,
    toastType: 'error'
  });
};
export const showWarningToast = (message) => {
  store.dispatch({
    type: UIActionTypes.SHOW_TOAST_MESSAGE,
    message: message,
    toastType: 'warning'
  });
};
export const showInfoToast = (message) => {
  store.dispatch({
    type: UIActionTypes.SHOW_TOAST_MESSAGE,
    message: message,
    toastType: 'info'
  });
};
export const showSuccessToast = (message) => {
  store.dispatch({
    type: UIActionTypes.SHOW_TOAST_MESSAGE,
    message: message,
    toastType: 'success'
  });
};
export const showMessageToast = (message) => {
  store.dispatch({
    type: UIActionTypes.SHOW_TOAST_MESSAGE,
    message: message,
    toastType: ''
  });
};
export const hideToastMessage = () => {
  store.dispatch({
    type: UIActionTypes.HIDE_TOAST_MESSAGE
  });
};



export const showDialog = (options: { title, message, confirmBtnText, cancelBtnText, isModal, didCloseCallback }) => {
  const { title, message, confirmBtnText, cancelBtnText, isModal, didCloseCallback } = options;
  store.dispatch({
    type: UIActionTypes.SHOW_DIALOG,
    title: title,
    message: message,
    confirmBtnText: confirmBtnText,
    cancelBtnText: cancelBtnText,
    isModal: isModal,
    didCloseCallback: didCloseCallback
  });
};
export const hideDialog = () => {
  store.dispatch({
    type: UIActionTypes.HIDE_DIALOG
  });
};
export const resetDialogConfig = () => {
  store.dispatch({
    type: UIActionTypes.RESET_DIALOG
  });
};


export const showProgressDlg = async (option: { title: string, messages: string }) => {
  store.dispatch({
    type: UIActionTypes.SHOW_PROGRESS_DIALOG,
    title: option.title,
  });
};

export const hideProgressDlg = async () => {
  store.dispatch({
    type: UIActionTypes.HIDE_PROGRESS_DIALOG,
  });
};

export const updateProgressDlg = async (option: { progress: number }) => {
  store.dispatch({
    type: UIActionTypes.UPDATE_PROGRESS_DIALOG,
    progress: option.progress,
  });
}


export const updateDrawerWidth = async (option: { width: number }) => {
  store.dispatch({
    type: UIActionTypes.UPDATE_DRAWER_WITH,
    width: option.width,
  });
}

export const updateSelectedPage = async (option: { pageNo: number }) => {
  store.dispatch({
    type: UIActionTypes.UPDATED_SELECTD_PAGE,
    pageNo: option.pageNo,
  });
}
export const showHelpMenu = (show: boolean, option : {main: number, sub: number}) => {
  store.dispatch({
    type: UIActionTypes.SHOW_HELPMENU,
    show: show,
    main: option.main,
    sub: option.sub
  });
}
export const setleftDrawerOpen = (show:boolean)=>{
  store.dispatch({
    type: UIActionTypes.SET_LEFT_DRAWER_OPEN,
    show : show
  });
}
export const setHeaderOpen = (headerOpen:boolean)=>{
  store.dispatch({
    type: UIActionTypes.SET_HEADER_OPEN,
    headerOpen : headerOpen
  });
}
//]
export const setSaveOpen = (open:boolean)=>{
  store.dispatch({
    type: UIActionTypes.SET_SAVE_OPEN,
    open : open
  });
}
export const setPrintOption = (types:string, data)=>{
  store.dispatch({
    type : UIActionTypes["SET_PRINT_" + types],
    data : data
  })
}

export const showInformation = (open:boolean)=>{
  store.dispatch({
    type : UIActionTypes.SHOW_INFORMATION,
    open : open
  })
}



const defaultDrawerWidth = 180;
// export let g_drawerWidth = defaultDrawerWidth;
const initialState = {
  waiting: {
    circular: false
  },
  toast: {
    show: false,
    message: '',
    toastType: ''
  },
  dialog: {
    show: false,
    title: '',
    message: '',
    confirmBtnText: '',
    cancelBtnText: '',
    okButtonText: '',
    isModal: false,
    didCloseCallback: null
  },
  progress: {
    show: false,
    title: '',
    message: '',
    progress: 0,
  },
  drawer: {
    width: defaultDrawerWidth,
    pageNo: 0,
  },
  browser: {
    zoom: getBrowserZoomFactor(),
  },
  shotcut : {
    show : false
  },
  simpleUiData : {
    leftDrawerOpen : true,
    headerOpen : true,
    saveOpen : false,
    print : {
      progressPercent : 0,
      status : "N/A",
      progressOn : false,
      optionOn : false,
      waitingOn : false
    }
  },
  helpMenu : {
    show : false,
    main : 1,
    sub : 1
  },
  information : true,
  theme : "theme"
}

//[Reducer
export default (state = initialState, action) => {
  switch (action.type) {
    case UIActionTypes.SET_PRINT_progressPercent : {
      return {
        ...state,
        simpleUiData : {
          ...state.simpleUiData,
          print : {
            ...state.simpleUiData.print,
            progressPercent : action.data
          }
        }
      }
    }
    case UIActionTypes.SET_PRINT_status : {
      return {
        ...state,
        simpleUiData : {
          ...state.simpleUiData,
          print : {
            ...state.simpleUiData.print,
            status : action.data
          }
        }
      }
    }
    case UIActionTypes.SET_PRINT_progressOn : {
      return {
        ...state,
        simpleUiData : {
          ...state.simpleUiData,
          print : {
            ...state.simpleUiData.print,
            progressOn : action.data
          }
        }
      }
    }
    case UIActionTypes.SET_PRINT_optionOn : {
      return {
        ...state,
        simpleUiData : {
          ...state.simpleUiData,
          print : {
            ...state.simpleUiData.print,
            optionOn : action.data
          }
        }
      }
    }
    case UIActionTypes.SET_PRINT_waitingOn : {
      return {
        ...state,
        simpleUiData : {
          ...state.simpleUiData,
          print : {
            ...state.simpleUiData.print,
            waitingOn : action.data
          }
        }
      }
    }
    case UIActionTypes.SET_SAVE_OPEN : {
      return {
        ...state,
        simpleUiData : {
          ...state.simpleUiData,
          saveOpen : action.open
        }
      }
    }
    case UIActionTypes.SET_LEFT_DRAWER_OPEN : {
      return {
        ...state,
        simpleUiData : {
          ...state.simpleUiData,
          leftDrawerOpen : action.show
        }
      }
    }
    case UIActionTypes.SET_HEADER_OPEN : {
      return {
        ...state,
        simpleUiData : {
          ...state.simpleUiData,
          headerOpen : action.headerOpen
        }
      }
    }
    case UIActionTypes.SET_THEME: {
      return {
        ...state,
        theme : action.theme
      };
    }
    case UIActionTypes.SHOW_INFORMATION: {
      return {
        ...state,
        information : action.open
      };
    }
    case UIActionTypes.REPORT_BROWSER_ZOOM: {
      return {
        ...state,
        browser: {
          zoom: action.zoom,
        }
      };
    }
    case UIActionTypes.SHOW_SHORTCUT: {
      return {
        ...state,
        shotcut: {
          show: action.show,
        }
      };
    }

    case UIActionTypes.SHOW_UI_PROGRESS: {
      return {
        ...state,
        waiting: {
          circular: true
        }
      };
    }
    case UIActionTypes.HIDE_UI_PROGRESS: {
      return {
        ...state,
        waiting: {
          circular: false
        }
      };
    }
    case UIActionTypes.SHOW_TOAST_MESSAGE: {
      return {
        ...state,
        toast: {
          show: true,
          message: action.message,
          toastType: action.toastType
        }
      }
    }
    case UIActionTypes.HIDE_TOAST_MESSAGE: {
      return {
        ...state,
        toast: {
          show: false,
          message: ''
        }
      }
    }
    case UIActionTypes.SHOW_DIALOG: {
      return {
        ...state,
        dialog: {
          show: true,
          title: action.title,
          message: action.message,
          confirmBtnText: action.confirmBtnText,
          cancelBtnText: action.cancelBtnText,
          isModal: action.isModal,
          didCloseCallback: action.didCloseCallback
        }
      }
    }
    case UIActionTypes.HIDE_DIALOG: {
      return {
        ...state,
        dialog: {
          ...state.dialog,
          show: false
        }
      }
    }
    case UIActionTypes.RESET_DIALOG: {
      return {
        ...state,
        dialog: {
          show: false,
          title: '',
          message: '',
          confirmBtnText: '',
          cancelBtnText: '',
          okButtonText: '',
          isModal: false,
          didCloseCallback: null
        }
      }
    }

    case UIActionTypes.UPDATE_DRAWER_WITH: {
      return {
        ...state,
        drawer: {
          ...state.drawer,
          width: action.width,
        }
      }
    }

    case UIActionTypes.UPDATED_SELECTD_PAGE: {
      return {
        ...state,
        drawer: {
          ...state.drawer,
          pageNo: action.pageNo,
        }
      }
    }
    
    case UIActionTypes.SHOW_HELPMENU: {
      return {
        ...state,
        helpMenu: {
          ...state.helpMenu,
          show: action.show,
          main : action.main,
          sub: action.sub
        }
      };
    }


    default: {
      return state;
    }
  }
};
//]
