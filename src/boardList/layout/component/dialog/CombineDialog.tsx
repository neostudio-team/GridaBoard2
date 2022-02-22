import React from "react";
import { makeStyles, Dialog, DialogProps} from "@material-ui/core";
import { useSelector } from "react-redux";
import { RootState } from "GridaBoard/store/rootReducer";
import { showGroupDialog, hideGroupDialog, changeGroup } from 'GridaBoard/store/reducers/listReducer';
import getText from "GridaBoard/language/language";
import GroupDialog from "./detail/GroupDialog";
import MoveDialog from "./detail/MoveDialog";
import AlertDialog from "./detail/AlertDialog";
import GestureDialog from "./detail/GestureDialog";

const useStyle = makeStyles(theme=>({
  groupDialog : {
    minWidth : "360px",
    maxWidth : "436px",
    minHeight : "255px",
    "& > .title" : {
      marginTop : "40px",
      marginLeft : "10px",
      marginRight : "10px",
    },
    "& > .inputer" : {
      marginTop : "16px",
    },
    "& > .warn" : {
      width: "272px",
      height : "32px",
      fontSize: "12px",
      lineHeight: "14px",
      marginTop: "8px"
    },
  },
  alertDialog: {
    minWidth : "360px",
    maxWidth : "436px",
    minHeight : "215px",
    "& > .title" : {
      marginTop : "40px",
      marginLeft : "10px",
      textAlign: "center",
      marginRight : "10px",
    },
    "& > .warn" : {
      width: "75%",
      height : "40px",
      fontSize: "14px",
      lineHeight: "16px",
      marginTop: "16px",
      display: "flex",
      textAlign : "center",
      justifyContent : "center",
      alignItems : "center",
      whiteSpace : "pre-wrap"
    },
    "& > .noWarnTitle" : {
      marginBottom: "34px",
      marginTop: "70px !important"
    },
  },
 
  gestureDialog: {
    position: "fixed",
    left: "373px",
    top: "91px",
    minWidth: "200px",
    maxWidth: "370px",
    minHeight: "160px",
    maxHeight: "380px",
    background: theme.custom.white[90],
    boxShadow: theme.custom.shadows[0],
    border: "1px solid" + theme.custom.icon.blue[2], 
    borderRadius: "12px",
    wordBreak: "break-all",
    "& > .title" : {
      margin: "16px",
      fontSize: "17px",
      fontFamily: "Noto Sans CJK KR",
      lineHeight: "20px",
    },
    "& > .diaImg" : {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      background: theme.custom.icon.blue[2],
    },
    "& > .sub" : {
      margin: "15px",
      fontSize: "15px",
      fontFamily: "Noto Sans CJK KR",
      lineHeight: "20px",
      whiteSpace : "pre-wrap",
    },
    "& > .footer" : {
      marginTop: "10px",
      marginBottom: "16px",
      width: "100%",
      display: "flex",
      justifyContent: "flex-end",
      "& > button" : {
        height: "40px",
        marginRight: "16px",
        padding: "8px",
        "&:first-child" : {
          border: "1px solid" + theme.custom.icon.mono[2],
        }
      }
    },
  },
  paper : {
    background: theme.custom.white[90],
    boxShadow : theme.custom.shadows[0],
    borderRadius: "12px",
    alignItems: "center",
    wordBreak : "break-all",
    "& > .title" : {
      display: "flex",
      justifyContent : "center",
      alignItems : "center",
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "bold",
      fontSize: "20px",
      lineHeight: "23px",
      letterSpacing: "0.25px",
      color : theme.palette.text.primary
    },
    "& > .inputer" : {
      width: "296px",
      height: "40px",
      border: "1px solid " + theme.custom.grey[3],
      boxSizing: "border-box",
      borderRadius: "8px",
      paddingLeft : "12px",
    },
    "& > .warn" : {
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      display: "flex",
      letterSpacing: "0.25px",
      color : theme.palette.text.secondary,
      marginBottom: "8px",
    },
    "& > .footer" : {
      height: "88px",
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      alignItems : "center",
      padding: "0 24px",
      "& > button" : {
        height : "40px",
        width: "152px",
        boxSizing: "border-box",
        borderRadius: "60px",
        "&:first-child" : {
          border: "1px solid" + theme.custom.icon.mono[2],
        }
      }
    }
  }
}))
interface Props extends  DialogProps {
  test ?: string,
  docsObj ?:{
    docs: any[],
    category: any[],
  }
}


const CombineDialog = (props : Props)=>{
  const { onClose, open , docsObj} = props;
  const classes = useStyle();
  
  const diaType = useSelector((state: RootState) => state.list.dialog.type);

  const closeEvent = (isChange:boolean)=>{
    hideGroupDialog();
    changeGroup(isChange);
  }

  const groupProps = {
    closeEvent : closeEvent,
    open:open,
    type:diaType,
    classes : {
      paper : `${classes.paper}`
    }
  };
  let returnDialog = null;
  if(["newGroup", "changeGroupName", "changeDocName"].includes(diaType)){
    groupProps.classes.paper += `  ${classes.groupDialog}`;
    returnDialog = (<GroupDialog {...groupProps} />);
  }else if(["moveDoc"].includes(diaType)){
    groupProps.classes.paper += `  ${classes.groupDialog}`;
    returnDialog = (<MoveDialog {...groupProps} docsObj={docsObj}/>);
  }else if(["deleteDoc", "logout", "toBoardList", "deletePage", "clearPage", "deleteGroup", "checkCalibration"].includes(diaType)){
    groupProps.classes.paper += `  ${classes.alertDialog}`;
    returnDialog = (<AlertDialog {...groupProps} />);
  }else if(["noticeGesture"].includes(diaType)){
    groupProps.classes.paper = `  ${classes.gestureDialog}`;
    returnDialog = (<GestureDialog {...groupProps} />);
  }

  return returnDialog;
}

export default CombineDialog;