import { makeStyles, Checkbox, Button } from "@material-ui/core";
import React, {useState} from "react";
import openNoticePopup_background from "../openNoticePopup2_background.png";
import openNoticePopup_visual from "../openNoticePopup2_visual.png";
import CloseIcon from '@material-ui/icons/Close';
import Cookies from 'universal-cookie';
import getText, { languageType } from "GridaBoard/language/language"

const useStyle = makeStyles(theme=>({
  wrap : {
    width: "100%",
    height: "100%",
    position: "absolute",
    background : "rgba(0,0,0,0.5)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& > div" : {
      position: "relative",
      width: "640px",
      height: "465px",
      borderRadius : "12px",
      background: "#E9E9E9",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      "& > div.upper": {
        height: "400px",
      },
      "& > div.bottom": {
        marginTop: "1px",
        height: "64px",
      }
    }
  },
  upper: {
    "& > div:nth-child(1)" : {
      marginTop: "48px",
      fontFamily: "Noto Sans CJK KR",
      fontStyle: "normal",
      fontWeight: "900",
      fontSize: "28px",
      lineHeight: "32px",
      textAlign: "center",
      letterSpacing: "0.25px",
      color: "#654EF5",
      whiteSpace: "pre-wrap",
    },
    "& > div:nth-child(2)" : {
      marginTop : "24px",


      fontFamily: "Noto Sans KR",
      fontStyle: "normal",
      fontWeight: "400",
      fontSize: "12px",
      lineHeight: "16px",
      /* or 127% */
      
      textAlign: "center",
      letterSpacing: "0.25px",
      
      color: "#666666",
      
      opacity: "0.85",
      whiteSpace: "pre-wrap",
    },
    "& > div:nth-child(3)" : {
      marginTop: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      "& > button" : {
        width: "133px",
        height: "45px",
        background: "#654EF5",
        borderRadius: "27px",
        color: "#FFFFFF",
        fontFamily: 'Noto Sans CJK KR',
        fontStyle: "normal",
        fontWeight: "700",
        fontSize: "14px",
        lineHeight: "21px",
        letterSpacing: "0.25px",
      }
    },
    "& > div:nth-child(4)" : {
      marginTop: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  bottom : {
    background: "#F5F5F5",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",

    "& > input" : {
      width: "40px",
      height: "40px",
      marginLeft : "12px",
      color: "#CFCFCF",
      '&$checked': {
        color: "#CFCFCF",
      },
    },
    "& > span" : {
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "12px",
      lineHeight: "14px",
      /* identical to box height */

      letterSpacing: "0.25px",


      color: theme.palette.text.secondary,

    }

  },
  end : {
    position: "absolute",
    right: "20px",
    top: "20px",
    cursor: "pointer",
  }
}))

type Props = {
  setOpenNotice : (bool:boolean) => void
}

const OpenNoticePopup = (props:Props)=>{
  const {setOpenNotice} = props;
  const classes = useStyle();

  const [isCheck, setIsCheck] = useState(false)
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsCheck(event.target.checked);
  }
  const handelEnd = ()=>{
    if(isCheck){
      const cookies = new Cookies();
      cookies.set(`openNoticeView`, true, {
        maxAge: 99999999
      });
    }
    setOpenNotice(false);
  }
  const gotoDetail = ()=>{
    let url = "";
    if(languageType === "ko"){
      url = "https://neolabdev.gitbook.io/neolab-cloud_kr";
    }else{
      url = "https://neolabdev.gitbook.io/neolab-cloud_en";
    }
    window.open("_blank").location.href= url;
  }

  return (
  <div className={classes.wrap}>
    <div>
      <div className={`upper ${classes.upper}`} style={{background:`url(${openNoticePopup_background})`}}>
        <div>{getText("openNotice_title")}</div>
        <div>{getText("openNotice_subTitle")}</div>
        <div><Button onClick={gotoDetail}>{getText("openNotice_button")}</Button></div>
        <div><img src={openNoticePopup_visual} alt="" /></div>
      </div>
      <div className={`bottom ${classes.bottom}`}>
        <Checkbox checked={isCheck} onChange={handleChange} color="primary" /> 
        <span>{getText("openNotice_end")}</span>
      </div>
      <CloseIcon className={classes.end} onClick={handelEnd} />
    </div>
  </div>)
}



export default OpenNoticePopup;
