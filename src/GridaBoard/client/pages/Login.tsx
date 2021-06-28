import React, {useState} from 'react';
import { Redirect } from "react-router-dom";
import Menu from "./Menu";
import { Button, makeStyles, MuiThemeProvider, Theme, SvgIcon } from '@material-ui/core';
import { turnOnGlobalKeyShortCut } from "GridaBoard/GlobalFunctions";
// import {useCookies} from 'react-cookie';
import Cookies from 'universal-cookie';
import "firebase/firestore";
import "firebase/auth";
import { signInWithGoogle, auth } from "GridaBoard/util/firebase_config";
import { useSelector } from 'react-redux';
import { RootState } from 'GridaBoard/store/rootReducer';
import * as neolabTheme from "GridaBoard/theme";
import googleLogo from "GridaBoard/googleLogo.png";
import appleLogo from "GridaBoard/appleLogo.png";
import { default as Slider, Settings, CustomArrowProps } from "react-slick";

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
  }
}))

const Login = () => {
  turnOnGlobalKeyShortCut(false);
  const cookies = new Cookies();
  const [logined, setLogined] = useState(false);
  const selectedTheme = useSelector((state: RootState) => state.ui.theme);
  const theme : Theme = neolabTheme[selectedTheme];
  const classes = useStyle(theme)();
  
  const userEmail = cookies.get("user_email");

  if(userEmail !== undefined || logined){
    //로그인시 자동으로 넘기기
    return (<Redirect to="/list" />);
  }
  auth.onAuthStateChanged(user => {
    // user.email
    if(user !== null){
      //로그인 완료
      console.log("logined", user);
      user.getIdTokenResult().then(function(result){
        console.log(new Date(result.expirationTime));
        cookies.set("user_email", user.email, {
          expires: new Date(result.expirationTime)
        });
  
        setLogined(true);
      });

    }
  })
  
  return (
    <MuiThemeProvider theme={theme}>
      <div className={classes.wrap}>
        <div >
          <div className={classes.slider}>
            <CustomSlider />
          </div>
          <div>
            <div className={classes.login}>
              <div>로그인</div>
              <div>그리다보드는 로그인이 필요한 서비스입니다.</div>
              <div className={classes.loginBtns}>
                <Button onClick = {signInWithGoogle}> <img src={googleLogo} alt="" /> Google 로그인 </Button>
                <Button onClick={e=>{alert("apple login")}}> <img src={appleLogo} alt="" />Apple로 로그인 </Button>
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
      width: "480px",
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
        width: "432px",
        
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
  let data = [{
    title: "원격지에서도 효과적인 브레인스토밍",
    text : "스마트펜으로 작성한 아이디어를 실시간으로 공유할 수 있어 팀원들과 효과적인 회의를 진행할 수 있습니다. 회의 후 작성 내용을 그대로 저장해 빠르게 공유할 수도 있습니다.",
    tip: "Zoom, Google Meet 등 다양한 화상회의 서비스에 사용 가능"
  },{
    title: "집중력을 끌어올리는 원격 수업",
    text : "그리다보드에서 출력한 종이로 기록하여 빠르게 수업을 진행할 수 있습니다. 수업 후 수업 내용을 저장해 손쉽게 공유할 수 있도록 지원합니다.",
    tip: "Zoom, Google Meet 등 다양한 화상회의 서비스에 사용 가능"
  }];
  
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
              <div>Tip!</div>
              <div>{el.tip}</div>
            </div>
          </div>
        </div>
      ))}
    </Slider>
    );
}