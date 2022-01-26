import React, { useCallback, useEffect, useState } from "react";
import lottie from "lottie-web";
import lottieFile from "./tmp.json"
import { Button, Dialog, DialogProps } from "@material-ui/core";
import CloseIcon from '@material-ui/icons/Close';
import getText from "GridaBoard/language/language";
import Cookies from "universal-cookie";
import { ArrowDropUp } from "@material-ui/icons";

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
  
  const [containerEl, setContainerEl] = useState();
  useEffect(() => {
    lottie.loadAnimation({
      container: containerEl,
      renderer: "svg",
      loop: true,
      autoplay:true,
      animationData: lottieFile
    });
    return () => lottie.stop();
  }, [containerEl])
  
  const handleRef = useCallback(
    (el) => {
      if(el){
        setContainerEl(el);
      }
    },
    [setContainerEl]
  )

  const cancel = () => {
    closeEvent(false)
    const cookies = new Cookies();
    cookies.set("openNoticeGesture", true, {
      maxAge: 15
    });
  }

  const success = () => {
    console.log("더 알아본다")
  }

  const onKeyPress = (e) => {
    if (e.key === 'Enter') {
      success();
    }
  }

  return (
    <>
      <ArrowDropUp className="arrow" style={{position:"fixed", left:"484.3px", top:"100px", zIndex:1200, fontSize:"40px", color:"#CED3E2"}}/>
      <Dialog
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
        <div className="lottie" ref={handleRef}/>
        <div className="sub">{sub}</div>
        <div className="footer">
          <Button variant="contained" disableElevation color="secondary" onClick={()=>{cancel()}} >{cancelBtn}</Button>
          <Button variant="contained" disableElevation color="primary" onClick={()=>{success()}}>{successBtn}</Button>        
        </div>
      </Dialog>
    </>
  );
};

export default GestureDialog;