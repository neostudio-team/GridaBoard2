import React, {useState} from 'react';
import { Redirect } from "react-router-dom";
import Menu from "./Menu";
import { Button, makeStyles, MuiThemeProvider, Theme, SvgIcon } from '@material-ui/core';
import { turnOnGlobalKeyShortCut } from "GridaBoard/GlobalFunctions";
// import {useCookies} from 'react-cookie';
import Cookies from 'universal-cookie';
import "firebase/firestore";
import "firebase/auth";
import { signInWithGoogle, signInWithApple, auth, secondaryAuth, signInWith} from "GridaBoard/util/firebase_config";
import { useSelector } from 'react-redux';
import { RootState } from 'GridaBoard/store/rootReducer';
import * as neolabTheme from "GridaBoard/theme";
import googleLogo from "GridaBoard/googleLogo.png";
import appleLogo from "GridaBoard/appleLogo.png";
import { default as Slider, Settings, CustomArrowProps } from "react-slick";
import getText from "GridaBoard/language/language";
import OpenNoticePopup from "boardList/layout/OpenNoticePopup"

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
      
      "&:first-child": {
        background: theme.custom.icon.mono[4],
        
        border: "1px solid " + theme.custom.icon.mono[2],
        boxSizing: "border-box",
        color : theme.palette.text.primary,
      },

      "&:nth-child(2)": {
        marginTop: "8px",
        color : theme.custom.icon.mono[4],
        background : theme.custom.icon.mono[0],
      },
      "& > span:first-child" : {
        width: "174px",
        justifyContent: "flex-start",
        "& > img" :{
          marginRight: "34px"
        }
      },
    }
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
  const [logined2, setLogined2] = useState(false);
  
  const selectedTheme = useSelector((state: RootState) => state.ui.theme);
  const theme : Theme = neolabTheme[selectedTheme];
  const classes = useStyle(theme)();
  
  // const userEmail = cookies.get("user_email");

  auth.onAuthStateChanged(user => {
    // user.email
    if(user !== null){
      //로그인 완료
      console.log("logined", user);
      user.getIdTokenResult().then(function(result){
        const expirationTime = new Date(result.expirationTime)
        // const time = expirationTime.getTime() - 3540000; //새로운 expiration time 설정 필요할 때
        // const newExTime = new Date(time);
        cookies.set("user_email", user.email, {
          expires: expirationTime
        });
        localStorage.GridaBoard_userData = JSON.stringify(user);
        
        if(secondaryAuth.currentUser === null){
          signInWith(user).then(()=>{
            setLogined(true);
          });
        }else{
          setLogined(true);
        }
      });
    }
  });
  
  
  if(logined){
    console.log(auth.currentUser);
    console.log(secondaryAuth.currentUser);
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

  return (
    <MuiThemeProvider theme={theme}>
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
                <Button onClick = {signInWithGoogle}> <img src={googleLogo} alt="" />{getText("login_withGoogle")}</Button>
                <Button onClick={signInWithApple}> <img src={appleLogo} alt="" />{getText("login_withApple")} </Button>
              </div>
              <div className={classes.terms}>
                {termsText.map(el=>{
                  if(el === "signin_agree_term"){
                    return <a href="https://www.neostudio.io/nlc_termofuse/" target="_blank" rel="noreferrer">{getText(el)}</a>;
                  }else if(el === "signin_agree_policy"){
                    return <a href="https://www.neostudio.io/nlc_privacy/" target="_blank" rel="noreferrer">{getText(el)}</a>;
                  }else{
                    return (el);
                  }
                })}
              </div>
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
  for(let i = 0; i < 2; i++){
    data.push({
      title: getText("login_banner_data" + (i+1) + "_title"),
      text : getText("login_banner_data" + (i+1) + "_text"),
      tip: getText("login_banner_data" + (i+1) + "_tip")
    })
  }
  
  return (
    <Slider ref={e=>slider=e} {...sliderSettings} className={classes.slider} >
      {
        data.map((el, idx)=>(
        <div key={idx} className={classes.content}>
          <img src={`/login/title_${idx+1}.png`} alt="" />
          <div className="textarea">
            <div>{el.title}</div>
            <div>{el.text}</div>
            <div>
              <div>{getText("login_banner_tipTitle")}</div>
              <div>{el.tip}</div>
            </div>
          </div>
        </div>
      ))}
    </Slider>
    );
}