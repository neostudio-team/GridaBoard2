import { Button, Collapse, makeStyles } from "@material-ui/core";
import React, { useState } from "react";
import { languageType } from "../language/language";
import { Clear } from '@material-ui/icons';
import Cookies from "universal-cookie";
import bannerData from "./headerBannerData.json";



const useStyle = makeStyles(theme=>({
  root : {
    height : "64px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    "& > img" : {
      height: "100%",
    }
  },
  clear : {
    position: "absolute",
    right: "20px",
    top: "20px",
    cursor: "pointer",
  }
}));



const HeadBanner = () => {
  const style = useStyle();


  const data = bannerData.ko[0];
  // const bannerData = {
  //   name : "banner_220222",
  //   imgUrl : "/banner/app_top_220222.png",
  //   imgBgColor : "#F6F6F6",
  //   location : "http://store.neosmartpen.com/goods/goods_view.php?goodsNo=418"
  // }

  const cookies = new Cookies();
  const bannerCookie = cookies.get(data.tag);

  
  let _check = false;
  if(languageType === "ko" && !bannerCookie){ //banner는 한국어 일때만 적용
    _check = true;
  }


  const [checked, setChecked] = useState(_check);

  

  const onCloseCallback = (e)=>{
    e.nativeEvent.preventDefault();
    setChecked(false);
    cookies.set(data.tag, true, {
      maxAge: 99999999
    });
  }
  const moveCallback = (e) =>{
    window.open("_blank").location.href= data.link;
  }


  return (
    <Collapse in={checked}>
      <div className={style.root} style={{ backgroundColor:data.bgcolor }} onClick={moveCallback}>
        <img src={data.img}/>
      </div>
      <Clear className={style.clear} onClick={onCloseCallback} />
    </Collapse>
  );
}


export default HeadBanner;
