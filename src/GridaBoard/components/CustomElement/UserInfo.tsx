import React from "react";
import { showAlert } from "../../store/reducers/listReducer";
import getText from "GridaBoard/language/language";
import { Button, IconButton, makeStyles, SvgIcon } from "@material-ui/core";

const useStyle = makeStyles(theme=>({
  wrap : {
    marginRight: "0px !important",
    width: "360px",
    height: "403px",
    background : theme.custom.white[90],
    boxShadow: theme.custom.shadows[0],
    borderRadius : "12px",
    display: "flex",
    alignItems: "center",
    flexDirection: "column"
  },
  liner : {
    width: "328px",
    height: "1px",
    background : theme.custom.grey[3],
    margin: "12px 0px"
  },
  userInfo : {
    width: "328px",
    height: "207px",
    margin: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    "& > div:first-child" : {
      marginTop: "40px",
      width: "72px",
      height: "72px",
      backgroundPositionY: 'center',
      backgroundPositionX: 'center',
      borderRadius: "36px",
      marginBottom : "24px",
    },
    "& > div:nth-child(2)": {
      color: theme.palette.text.primary,
      fontStyle: "normal",
      fontWeight: "bold",
      fontSize: "20px",
      lineHeight: "23px",
      letterSpacing: "0.25px",
    },
    "& > div:nth-child(3)": {
      minHeight: "32px",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "14px",
      lineHeight: "16px",
      letterSpacing: "0.25px",
      color: theme.palette.text.secondary,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }
  },
  logout : {
    width: "328px",
    height: "40px",
    background: theme.custom.icon.mono[4],
    border: "1px solid "+ theme.custom.icon.mono[2],
    boxSizing: "border-box",
    borderRadius: "60px",
    fontFamily: "Roboto",
    fontStyle: "normal",
    fontWeight: "bold",
    fontSize: "12px",
    lineHeight: "14px",
    letterSpacing: "0.25px",
    textTransform: "none",
    color: theme.palette.text.secondary
  },
  terms: {
    display: "flex",
    flexDirection: "column",

    "& > div" : {
      display: "flex",
      width: "344px",
      height: "40px",
      alignItems: "center",
      padding: "12px",
      justifyContent: "space-between",
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "16px",
      lineHeight: "19px",
      letterSpacing: "0.25px",
      "& > button":{
        marginRight: "8px",
        width: "40px",
        height: "40px",
        "& > span > svg" : {
          marginRight : "0px",
          color : theme.custom.grey[4]
        }
      }
      // "& > svg": {
      //   marginRight: "8px",
      //   color: theme.custom.grey[4]
      // }
    }
  }
}))

const UserInfo = ()=>{
  const userData = JSON.parse(localStorage.GridaBoard_userData);
  const classes = useStyle();
  // default_user_img
  const userImg = userData.profileImageUrl === null ? "/default_user_img.png" : userData.profileImageUrl;
  const cloudOpen = () => {
    let frame = null;
    if(document.querySelector("#cloudOpener") !== null){
      document.body.removeChild(document.querySelector("#cloudOpener"));
    }
      frame = document.createElement("iframe");
    frame.id = "cloudOpener";
    frame.src = "neolabcloud://";
    frame.style.display="hidden";
    document.body.appendChild(frame);
  };

  // getText('profile_logout')
  return (
  <div className={classes.wrap}>
    <div className={classes.userInfo}>
      <div style={{backgroundImage:"url('"+userImg+"')"}} />
      <div>{userData.name}</div>
      <div>{userData.id}</div>
    </div>
    <Button className={classes.logout} onClick={cloudOpen}>
      {getText('open_neolabcloud')}
    </Button>
    <div className={classes.liner}/>
    <div className={classes.terms}>
      <div>
        {getText('signin_agree_policy')}<IconButton onClick={e=>{window.open("_blank").location.href="https://www.neostudio.io/nlc_privacy/";}} ><ActionLinkLine /></IconButton>
      </div>
      <div>
        {getText('signin_agree_term')}<IconButton onClick={e=>{window.open("_blank").location.href="https://www.neostudio.io/nlc_termofuse/";}}><ActionLinkLine /></IconButton>
      </div>
    </div>
  </div>)
}


export default UserInfo;


const ActionLinkLine = ()=>{
  return (
  <SvgIcon>
    <path d="M20 11C19.7348 11 19.4804 11.1054 19.2929 11.2929C19.1054 11.4804 19 11.7348 19 12V18C19 18.2652 18.8946 18.5196 18.7071 18.7071C18.5196 18.8946 18.2652 19 18 19H6C5.73478 19 5.48043 18.8946 5.29289 18.7071C5.10536 18.5196 5 18.2652 5 18V6C5 5.73478 5.10536 5.48043 5.29289 5.29289C5.48043 5.10536 5.73478 5 6 5H12C12.2652 5 12.5196 4.89464 12.7071 4.70711C12.8946 4.51957 13 4.26522 13 4C13 3.73478 12.8946 3.48043 12.7071 3.29289C12.5196 3.10536 12.2652 3 12 3H6C5.20435 3 4.44129 3.31607 3.87868 3.87868C3.31607 4.44129 3 5.20435 3 6V18C3 18.7956 3.31607 19.5587 3.87868 20.1213C4.44129 20.6839 5.20435 21 6 21H18C18.7956 21 19.5587 20.6839 20.1213 20.1213C20.6839 19.5587 21 18.7956 21 18V12C21 11.7348 20.8946 11.4804 20.7071 11.2929C20.5196 11.1054 20.2652 11 20 11Z"/>
    <path d="M16 5H17.58L11.29 11.28C11.1963 11.373 11.1219 11.4836 11.0711 11.6054C11.0203 11.7273 10.9942 11.858 10.9942 11.99C10.9942 12.122 11.0203 12.2527 11.0711 12.3746C11.1219 12.4964 11.1963 12.607 11.29 12.7C11.383 12.7937 11.4936 12.8681 11.6154 12.9189C11.7373 12.9697 11.868 12.9958 12 12.9958C12.132 12.9958 12.2627 12.9697 12.3846 12.9189C12.5064 12.8681 12.617 12.7937 12.71 12.7L19 6.42V8C19 8.26522 19.1054 8.51957 19.2929 8.70711C19.4804 8.89464 19.7348 9 20 9C20.2652 9 20.5196 8.89464 20.7071 8.70711C20.8946 8.51957 21 8.26522 21 8V4C21 3.73478 20.8946 3.48043 20.7071 3.29289C20.5196 3.10536 20.2652 3 20 3H16C15.7348 3 15.4804 3.10536 15.2929 3.29289C15.1054 3.48043 15 3.73478 15 4C15 4.26522 15.1054 4.51957 15.2929 4.70711C15.4804 4.89464 15.7348 5 16 5V5Z"/>
  </SvgIcon>
    )
}