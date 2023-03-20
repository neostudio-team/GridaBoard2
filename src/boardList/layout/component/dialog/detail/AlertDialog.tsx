import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button, Dialog, DialogProps } from "@material-ui/core";
import {createCategory, changeCategoryName, deleteCategory} from "boardList/BoardListPageFunc2";
import { RootState } from "GridaBoard/store/rootReducer";
import { deleteAllFromTrash, deleteBoardFromLive, fbLogout } from "boardList/BoardListPageFunc";
import { forceUpdateBoardList } from "GridaBoard/store/reducers/appConfigReducer";
import { useHistory } from "react-router-dom";
import GridaDoc from "GridaBoard/GridaDoc";
import getText from "GridaBoard/language/language";
import { InkStorage } from "nl-lib/common/penstorage";
import { PageEventName } from "nl-lib/common/enums";
import { changeGroup, showSnackbar } from "GridaBoard/store/reducers/listReducer";
import { setleftDrawerOpen, showMessageToast } from "GridaBoard/store/reducers/ui";
import { showCalibrationDialog } from "GridaBoard/store/reducers/calibrationReducer";
import { makePdfUrl } from "nl-lib/common/util";
import { store } from "GridaBoard/client/pages/GridaBoard";
import { firebaseAnalytics } from "GridaBoard/util/firebase_config";
import NDP from "NDP-lib";

const confirmText = getText('print_popup_yes');
const cancelText = getText('print_popup_no');

const dialogTypes = {
  "deleteDoc" : {
    title : getText('deleteBoard_title'),
    sub : getText('deleteBoard_sub'),
    cancel : cancelText,
    success : confirmText
  },
  "deleteTrash" : {
    title: getText("deleteTrash_title"),
    sub : getText("deleteTras_warn"),
    cancel: cancelText,
    success : confirmText
  },
  "logout" : {
    title : getText('profile_logout_msg'),
    cancel: cancelText,
    success : confirmText
  },
  "toBoardList" : {
    title : getText('toBoardList_title'),
    sub: getText('toBoardList_sub'),
    cancel: cancelText,
    success : confirmText
  },
  "deletePage" : {
    title: getText('deletePage_title'),
    cancel: cancelText,
    success : confirmText
  },
  "clearPage" : {
    title: getText('clearPage_title'),
    cancel: cancelText,
    success : confirmText
  },
  "deleteGroup" : {
    title: getText("deleteGroup_title"),
    sub: getText("deleteGroup_sub"),
    cancel: cancelText,
    success : confirmText
  },
  "checkCalibration" : {
    title: getText("check_calibration"),
    cancel: cancelText,
    success : confirmText
  },
  "getPenOwner" : {
    title : getText('bluetooth_connectDevice'),
    sub: getText('bluetooth_hookPermission'),
    cancel: cancelText,
    success : confirmText
  },
  "lostPenOwner" : {
    title : getText('bluetooth_deviceOff_title'),
    sub: getText('bluetooth_deviceOff_sub'),
    cancel: getText('print_popup_yes'),
    success : null
  }
}
export const onClearPage = () => {
  const doc = GridaDoc.getInstance();
  const activePageNo = store.getState().activePage.activePageNo;
  const pageInfo = doc.getPage(activePageNo).pageInfos[0];
  const inkStorage = InkStorage.getInstance();
  inkStorage.dispatcher.dispatch(PageEventName.PAGE_CLEAR, pageInfo);
  inkStorage.removeStrokeFromPage(pageInfo);
}

interface Props extends  DialogProps {
  type ?: string
  closeEvent ?: (isChange:boolean)=>void
}

const AlertDialog = (props : Props)=>{
  const { open, closeEvent, type,  ...rest } = props;
  const activePageNo = useSelector((state: RootState) => state.activePage.activePageNo);
  const selected = useSelector((state: RootState) => state.list.dialog.selected);
  const subData = useSelector((state: RootState) => state.list.dialog.sub);
  const dispatch = useDispatch();
  const history = useHistory();

  const selectedData = dialogTypes[type];
  console.log(selectedData);

  let subText = selectedData.sub;


  if(type == "deleteDoc"){
    let count = 1;
    if(subData !== null){
      selectedData.title = getText('deleteBoard_title');
      count = subData.data.length;
    }
    selectedData.title = selectedData.title.replace("%d", count);
  }else if(type === "getPenOwner"){
    
    let projectName = "";
    if(store.getState().ndpClient.penControlOwnerData.ownerName === "NEOSTUDIOWEB"){
      projectName = getText("NEOSTUDIO_WEB");
    }else{
      projectName = getText("GRIDABOARD");
    }
    subText = subText.replace("[%NAME]", projectName);
  }


  const success = async ()=>{

    switch (type) {
      case "deleteDoc" : {
        let deleteData = [selected];
        if(subData !== null){
          deleteData = subData.data;
        }
        const result = await deleteBoardFromLive(deleteData);
        
        if (result === 1) {
          forceUpdateBoardList();

          const selectedDocNames: string[] = [];
          for (const doc of subData.data) {
            selectedDocNames.push(doc.doc_name);
          }
          showSnackbar({
            snackbarType : "deleteDoc",
            selectedDocName : selectedDocNames,
            selectedCategory : getText('boardList_trashBin'),
            categoryData : "trash"
          })
        }
        break;
      }
      case "deleteTrash" : {
        const result = await deleteAllFromTrash();
        if (result === 1) {
          forceUpdateBoardList();
        } 
        break;
      }
      case "logout" : {
        fbLogout();
        routeChangeToLogin();
        break;
      }
      case "toBoardList" : {
        routeChangeToBoardList();
        break;
      }
      case "checkCalibration" : {
        const new_url = await makePdfUrl();
        const numPages = GridaDoc.getInstance().numPages;
        const targetPages = Array.from({ length: numPages }, (_, i) => i + 1);

        if (new_url) {
          const option = {
            url: new_url,
            show: true,
            targetPages: targetPages,
            progress: 0,
            calibrationMode: true,
          };
    
          showCalibrationDialog(option);
        }
        break;
      }
      case "deletePage" : {
        if (activePageNo === -1) return ;
        await GridaDoc.getInstance().removePages(activePageNo);
        if(GridaDoc.getInstance()._pages.length === 0){
          setleftDrawerOpen(true);
        }
        showMessageToast(getText("page_deleted"));
        break;
      }
      case "clearPage" : {
        firebaseAnalytics.logEvent(`delete_mouse`, {
          event_name: `delete_mouse`
        });
        onClearPage();
        break;
      }
      case "deleteGroup" : {
        console.log(selected , type);
        await deleteCategory(selected);
        changeGroup(true);
        break;
      }
      case "getPenOwner" : {
        NDP.getInstance().Client.localClient.emitCmd("getPenControl");
        break;
      }
      default: break;
    }
    
    closeEvent(false)
  }

  const routeChangeToLogin = () => {
    const path = `/`;
    history.push(path);
  }

  const routeChangeToBoardList = () => {
    const path = `/list`;
    history.push(path);
  }

  const onKeyPress = (e) => {
    if (e.key === 'Enter') {
      success();
    }
  }

  const isWarn = subText !== undefined;
  console.log(subText);

  return (
    <Dialog
      disableBackdropClick
      onClose={closeEvent}
      {...rest}
      open={open}
      onKeyPress={onKeyPress}
    >
      <div className={`title ${isWarn?"" : "noWarnTitle" }`}>{selectedData.title}</div>
      {isWarn ? (<div className="warn">{subText}</div>) : ""}      
      <div className={`footer ${selectedData.success ? "" : "singleButton"}`}>
        <Button variant="contained" disableElevation color="secondary" onClick={()=>{closeEvent(false)}} >{selectedData.cancel}</Button>
        {selectedData.success ? <Button variant="contained" disableElevation color="primary" onClick={()=>{success()}}>{selectedData.success}</Button> : ""}
      </div>
    </Dialog>);
}


export default AlertDialog;