import React from "react";
import { makeStyles, Theme } from '@material-ui/core';
import { useSelector } from "react-redux";
import { RootState } from "../../store/rootReducer";

const useStyle = makeStyles((theme: Theme) => ({
  wrap : {
    position:"absolute",
    width: "360px",
    height: "440px",
    background : theme.custom.white[90],
    boxShadow: theme.custom.shadows[0],
    borderRadius: "12px",
    marginRight : "0px !important",
    right : "0px"
  }
}));

2
const PenList = function(props:React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> ) {
  const penList = useSelector((state: RootState) => state.ndpClient.penList);
  const isPenControlOwner = useSelector((state: RootState) => state.ndpClient.isPenControlOwner);

  /**
   * isPenControlOwner=false => 디바이스 비활성화
   * penList.length=0 && isPenControlOwner=true => 디바이스 없음
   * penList.length>0 && isPenControlOwner=true => 디바이스 기본
   * isPenControlOwner=false to true 변경 시 => 디바이스 연결중(고민 필요)(사실 안보일듯)
   * 디바이스 블투 off 데이터 받아오는거 고민필요
   */
  
  const classes = useStyle();
  return (
    <div className={classes.wrap}>123123123</div>
  )
}

export default PenList;