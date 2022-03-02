import { Button, Collapse, makeStyles } from "@material-ui/core";
import React, { useState } from "react";
import { languageType } from "GridaBoard/language/language";
import { Clear } from '@material-ui/icons';
import Cookies from "universal-cookie";



const useStyle = makeStyles(theme=>({
  root : {
    height : "120px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor : "pointer",
    "& > img" : {
      height: "100%",
      borderRadius : "8px"
    }
  }
}));



const SideBanner = () => {
  const style = useStyle();


  const data = {
    tag : "banner_220222",
    img : "/banner/list_footer_220222.png",
    bgcolor : "#F6F6F6",
    link : "http://store.neosmartpen.com/goods/goods_view.php?goodsNo=418"
  }

  const cookies = new Cookies();

  
  let _check = false;
  if(languageType === "ko"){ //banner는 한국어 일때만 적용
    _check = true;
  }


  const moveCallback = (e) =>{
    window.open("_blank").location.href= data.link;
  }


  return (
    <div>
      {_check ? (<div className={style.root} onClick={moveCallback}>
        <img src={data.img}/>
      </div>) : ""}
    </div>
  );
}


export default SideBanner;
