import React, {useEffect, useState} from 'react';
import { Redirect } from "react-router-dom";
import Menu from "./Menu";
import { Button, makeStyles, MuiThemeProvider, Theme, SvgIcon } from '@material-ui/core';
import { turnOnGlobalKeyShortCut } from "GridaBoard/GlobalFunctions";
// import {useCookies} from 'react-cookie';
import Cookies from 'universal-cookie';
import "firebase/firestore";
import "firebase/auth";
import { signInWithNDPC } from "GridaBoard/util/NDP_config";
import { useSelector } from 'react-redux';
import { RootState } from 'GridaBoard/store/rootReducer';
import * as neolabTheme from "GridaBoard/theme";
import googleLogo from "GridaBoard/googleLogo.png";
import appleLogo from "GridaBoard/appleLogo.png";
import neolabLogo from "GridaBoard/neolabLogo.png";
import ic_download from "GridaBoard/ic_download.png";
import { default as Slider, Settings, CustomArrowProps } from "react-slick";
import getText, { languageType } from "GridaBoard/language/language";
import OpenNoticePopup from "boardList/layout/OpenNoticePopup"
import NDP from 'NDP-lib';

const useStyle = (theme:Theme) => makeStyles(_theme=>({
  wrap : {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& > div": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      "& > div" : {
        width: "500px",
        height: "610px",
        display : "flex",
        alignItems: "center",
        justifyContent: "center",

      }
    }
  },
  slider : {
    display: "block !important"
  },
  login : {
    border: "1px solid " + theme.custom.grey[3],
    boxSizing: "border-box",
    background: theme.custom.icon.mono[4],
    padding: "64px",
    width: "480px",
    "& > div:first-child" : {
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "bold",
      fontSize: "28px",
      lineHeight: "33px",
      letterSpacing: "0.25px",
      color : theme.palette.text.primary
    },
    "& > div:nth-child(2)":{
      marginTop: "8px",
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "14px",
      lineHeight: "16px",
      letterSpacing: "0.25px",
      color: theme.palette.text.secondary
    },
    "& > .line" : {
      width : "100%",
      display: "flex",
      alignItems : "center",
      justifyContent: "center",
      "& > div" : {
        height : "0px",
        width : "325px",
        borderTop : "1px solid " + theme.custom.grey[3],
        marginTop : "40px",
        marginBottom : "40px",
      }
    }
  },
  downBtns : {
    width: "100%",
    display: "flex",
    alignItems : "center",
    justifyContent: "center",
    flexDirection: "column",

    "& > button" : {
      width: "352px",
      height: "44px",
      borderRadius: "0px",
      fontFamily: "Noto Sans KR",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "12px",
      lineHeight: "17px",
      textTransform: "none",
      
      "&.download": {
        marginTop: "8px",
        color : theme.palette.text.primary,
        border: "1px solid " + theme.custom.icon.mono[2],
        borderRadius: "4px",
        boxSizing: "border-box",
        fontWeight: "700",
        lineHeight: "18px",
      },
      "& > span:first-child" : {
        width: "auto",
        justifyContent: "flex-start",
        "& > img" :{
          marginRight: "26px"
        }
      },
    },
    "& > div:first-of-type" : {
      width : "100%",
      fontFamily: 'Noto Sans CJK KR',
      fontWeight: 400,
      fontStyle: "normal",
      fontSize: "12px",
      lineHeight: "18px",
      letterSpacing: "0.25px",
      color: theme.palette.text.secondary
    }
  },
  loginBtns : {
    marginTop: "40px",
    width: "100%",
    display: "flex",
    alignItems : "center",
    justifyContent: "center",
    flexDirection: "column",

    "& > button" : {
      width: "352px",
      height: "44px",
      borderRadius: "0px",
      fontFamily: "Noto Sans KR",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "12px",
      lineHeight: "17px",
      textTransform: "none",
      
      "&.neolab": {
        background: theme.custom.special["primary10"],
        
        border: "1px solid " + theme.palette.primary.main,
        borderRadius: "4px",
        boxSizing: "border-box",
        color : theme.palette.text.primary,
        fontWeight: "700",
        lineHeight: "18px",
      },
      "& > span:first-child" : {
        width: "auto",
        justifyContent: "flex-start",
        "& > img" :{
          marginRight: "26px"
        }
      },
    },
  },
  terms : {
    fontFamily: "Roboto",
    fontStyle: "normal",
    fontWeight: "normal",
    fontSize: "11px",
    lineHeight: "13px",
    
    textAlign: "center",
    letterSpacing: "-0.75px",
    
    color: theme.palette.text.secondary,
    marginTop: "24px"
  }
}))

const Login = () => {
  turnOnGlobalKeyShortCut(false);
  const cookies = new Cookies();
  const [logined, setLogined] = useState(false);
  
  const selectedTheme = useSelector((state: RootState) => state.ui.theme);
  const theme : Theme = neolabTheme[selectedTheme];
  const classes = useStyle(theme)();


  const openNoticeCookie = cookies.get("openNoticeView");
  let isOpen = false;
  if(openNoticeCookie !== "true"){
    isOpen = true;
  }
  const [openNotice, setOpenNotice] = useState(isOpen);
  
  

  useEffect(()=>{
    NDP.getInstance().onAuthStateChanged(async userId => {
      // user.email
      if(userId !== null){
        //로그인 완료
        console.log("logined", userId);
        const expirationTime = new Date(NDP.getInstance().tokenExpired);
        // const time = expirationTime.getTime() - 3540000; //새로운 expiration time 설정 필요할 때
        // const newExTime = new Date(time);
        cookies.set("user_email", userId, {
          expires: expirationTime
        });
        const user = await NDP.getInstance().User.getUserData();
        localStorage.GridaBoard_userData = JSON.stringify(user);
        
        setLogined(true);
      }
    });
  },[])
  
  
  if(logined){
    
    //로그인시 자동으로 넘기기
    return (<Redirect to="/list" />);

  }

  const termsText = [];
  let tempTerm = getText("signin_agree").split("[%TERM]");
  termsText.push(tempTerm[0]);
  termsText.push("signin_agree_term");
  tempTerm = tempTerm[1].split("[%POLICY]");
  termsText.push(tempTerm[0]);
  termsText.push("signin_agree_policy");
  termsText.push(tempTerm[1]);
  const gotoDownload = ()=>{
    let url = "";
    if(languageType === "ko"){
      url = "https://neolabdev.gitbook.io/neolab-cloud_kr/neolab-cloud/neolab-cloud";
    }else{
      url = "https://neolabdev.gitbook.io/neolab-cloud_en/neolab-cloud/neolab-cloud";
    }
    window.open(url, "_blank", "location=yes, scrollbars=yes, status=yes, noreferrer=yes");
  }

  return (
    <MuiThemeProvider theme={theme}>
    {openNotice ? <OpenNoticePopup setOpenNotice={setOpenNotice} /> : ""}
      <div className={classes.wrap}>
        <div >
          <div className={classes.slider}>
            <CustomSlider />
          </div>
          <div>
            <div className={classes.login}>
              <div>{getText("login_title")}</div>
              <div>{getText("login_subtitle")}</div>
              <div className={classes.loginBtns}>
                {/* <Button onClick = {signInWithGoogle}> <img src={googleLogo} alt="" />{getText("login_withGoogle")}</Button>
                <Button onClick={signInWithApple}> <img src={appleLogo} alt="" />{getText("login_withApple")} </Button> */}
                <Button className={`neolab`} onClick={signInWithNDPC}> <img src={neolabLogo} alt="" />{getText("login_withNDP")} </Button>
              </div>
              <div className="line">
                <div />
              </div>
              <div className={classes.downBtns}>
                <div>
                  {getText("no_NDP")}
                </div>
                <Button className={`download`} onClick={gotoDownload}> <img src={ic_download} alt="" />{getText("helpMenu_download")} </Button>
              </div>
              {/* <div className={classes.terms}>
                {termsText.map((el, idx)=>{
                  if(el === "signin_agree_term"){
                    return <a key={idx} href="https://www.neostudio.io/nlc_termofuse/" target="_blank" rel="noreferrer">{getText(el)}</a>;
                  }else if(el === "signin_agree_policy"){
                    return <a key={idx} href="https://www.neostudio.io/nlc_privacy/" target="_blank" rel="noreferrer">{getText(el)}</a>;
                  }else{
                    return (el);
                  }
                })}
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </MuiThemeProvider>
  );
};

export default Login;



const sliderStyle = makeStyles(theme=>({
  slider : {
		minHeight:"320px",
		"& div" : {
			outline: "none"
		},
    "& > .slick-dots": {//ul
      display: "flex !important",
      height: "56px",
      justifyContent: "center",
      alignItems: "center",
      position: "relative !important",
      bottom: "0px",
      "& > li:first-child" : {
        marginLeft: "0px !important"
      },
      "& > li" : {
        marginLeft: "8px",
        width: "8px",
        height: "8px",
        margin : "0px",
        "& > svg" : {
          width: "8px",
          height: "8px",
        }
      },
      "& > li:not(.slick-active)" : {
        color : theme.custom.grey[3]
      },
      "& > li.slick-active" : {
        color : theme.palette.primary.main
      }
    }
  },
  content : {
    display: "flex !important",
    alignItems: "center",
    flexDirection: "column",

    "& > img": {
      width: "500px",
      height: "360px",
    },
    "& > div.textarea" : {
      width: "430px",
      height: "194px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      "& > div:first-child" : {
        marginTop: "24px",
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "bold",
        fontSize: "24px",
        lineHeight: "28px",
        letterSpacing: "0.25px",
        color: theme.palette.text.primary
      },
      "& > div:nth-child(2)" : {
        marginTop: "16px",
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        fontSize: "14px",
        lineHeight: "16px",
        textAlign: "center",
        letterSpacing: "0.25px",
        whiteSpace: "pre-wrap",
        color: theme.palette.text.secondary
      },
      "& > div:nth-child(3)" : {
        marginTop: "16px",
        display: "flex",
        alignItems: "center",
        // width: "432px",
        
        "& > div:first-child": {//tip
          width: "38px",
          height: "22px",
          background : theme.palette.primary.main,
          color : theme.palette.background.paper,
          borderRadius: "67px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "8px",
          fontFamily: "Roboto",
          fontStyle: "normal",
          fontWeight: "bold",
          fontSize: "12px",
          lineHeight: "14px",
          letterSpacing: "0.25px",
        },
        "& > div:last-child": {
          fontFamily: "Roboto",
          fontStyle: "normal",
          fontWeight: "normal",
          fontSize: "12px",
          lineHeight: "14px",
  
          letterSpacing: "0.25px",
          color : theme.palette.text.primary
        }
      },
    }
  }
}));


const CustomSlider = ()=>{
  const classes = sliderStyle();
	let slider = null as Slider;


  const customPaging= (i:number)=>(
    <SvgIcon viewBox="0 0 8 8">
      <path fillRule="evenodd" clipRule="evenodd" d="M8 4C8 6.209 6.2092 8 3.99986 8C1.79079 8 0 6.209 0 4C0 1.791 1.79079 0 3.99986 0C6.2092 0 8 1.791 8 4Z"/>
    </SvgIcon>
  )
  
	const sliderSettings : Settings = {
		dots: true,
		infinite: false,
    autoplay: true,
		speed: 200,
    autoplaySpeed: 2000,
		slidesToShow: 1,
		slidesToScroll: 1,
		draggable: true,
		arrows: false,
    customPaging: customPaging
    
		// beforeChange: (prev, current) => {
		// afterChange: (current) => {
		// 	setNowView(current)
		// },
	}
  const data = [];
  const idxOrder = [3,1,2];
  for(let i = 0; i < idxOrder.length; i++){
    const nowIdx = idxOrder[i];
    // let tipTitle = getText("login_banner_tipTitle");
    data.push({
      title: getText("login_banner_data" + nowIdx + "_title"),
      text : getText("login_banner_data" + nowIdx + "_text"),
      tipTitle : getText("login_banner_tipTitle"),
      tip: getText("login_banner_data" + nowIdx + "_tip"),
      idx: nowIdx
    })
  }
  return (
    <Slider ref={e=>slider=e} {...sliderSettings} className={classes.slider} >
      {
        data.map((el, idx)=>(
        <div key={idx} className={classes.content}>
          <img src={`/login/title_${el.idx}.png`} alt="" />
          <div className="textarea">
            <div>{el.title}</div>
            <div>{el.text}</div>
            <div>
              <div>{el.tipTitle}</div>
              <div>{el.tip}</div>
            </div>
          </div>
        </div>
      ))}
    </Slider>
    );
}