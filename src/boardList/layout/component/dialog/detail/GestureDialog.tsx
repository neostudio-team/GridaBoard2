import React, { useCallback, useEffect, useState } from "react";
import { Button, Dialog, DialogProps } from "@material-ui/core";
import CloseIcon from '@material-ui/icons/Close';
import getText from "GridaBoard/language/language";
import Cookies from "universal-cookie";
import { ArrowDropUp } from "@material-ui/icons";
import { setHelpMenu } from "GridaBoard/components/CustomElement/HelpMenu";

interface Props extends  DialogProps {
  type ?: string
  closeEvent ?: (isChange:boolean)=>void
}
const dialogTypes = {
  "noticeGesture" : {
    title : getText('notice_gesture_title'),
    sub : getText('notice_gesture_explain'),
    cancelBtn : getText('notice_gesture_cancel'),
    successBtn : getText('notice_gesture_success')
  }
}
const GestureDialog = (props: Props)=>{
  const { open, closeEvent, type,  ...rest } = props;
  const { title, sub, cancelBtn, successBtn } = dialogTypes[type];
  
  const [gestureMain, gestureSub] = [3, 1];
  const gestureDialogImage = "/helpImg/ko/main3/sub2/0.png";

  const cancel = () => {
    closeEvent(false);
    const cookies = new Cookies();
    cookies.set("openNoticeGesture", true, {
      maxAge: 99999999
    });
  }

  const success = () => {
    closeEvent(false);
    const cookies = new Cookies();
    cookies.set("openNoticeGesture", true, {
      maxAge: 99999999
    });
    setHelpMenu(true, gestureMain, gestureSub);
  }

  const onKeyPress = (e) => {
    if (e.key === 'Enter') {
      success();
    }
  }

  return (
    <div>
      <ArrowDropUp className="arrow" style={{position:"fixed", left:"557.3px", top:"100px", zIndex:1200, fontSize:"40px", color:"#CED3E2"}}/>
      <Dialog
        disableBackdropClick
        onClose={closeEvent}
        {...rest}
        open={open}
        onKeyPress={onKeyPress}
        hideBackdrop={true}
      >
        <div className="title">
          {title}   
          <CloseIcon className="close" onClick={()=>{cancel()}}/>
        </div>
        <div className="diaImg">
          <img src={gestureDialogImage}/>
        </div>
        <div className="sub">{sub}</div>
        <div className="footer">
          <Button variant="contained" disableElevation color="secondary" onClick={()=>{cancel()}} >{cancelBtn}</Button>
          <Button variant="contained" disableElevation color="primary" onClick={()=>{success()}}>{successBtn}</Button>        
        </div>
      </Dialog>
    </div>
  );
};

export default GestureDialog;