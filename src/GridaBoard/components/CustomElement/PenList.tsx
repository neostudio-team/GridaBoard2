import React, {useEffect, useState} from "react";
import { makeStyles, Theme, Switch, createGenerateClassName, ThemeProvider, Button, Select} from '@material-ui/core';
import {Add} from '@material-ui/icons';
import { useSelector } from "react-redux";
import { RootState } from "../../store/rootReducer";
import getText from "GridaBoard/language/language";
import { setPenListSearchOn } from "../../store/reducers/ui";
import { PenListData } from "../../../NDP-lib/enum";
import NDP from "../../../NDP-lib";
import { showAlert } from "../../store/reducers/listReducer";
import { store } from "../../client/pages/GridaBoard";

const useStyle = makeStyles((theme: Theme) => ({
  wrap : {
    position:"absolute",
    width: "360px",
    height: "440px",
    background : theme.custom.white[90],
    boxShadow: theme.custom.shadows[0],
    borderRadius: "12px",
    marginRight : "0px !important",
    right : "0px",
    display: "flex",
    flexDirection: "column",
  },
  header : {
    width: "100%",
    height: "94px",
    display: "flex",
    flexDirection : "row",
    "& > div:first-child" : {
      width : "72.5%",
      position : "relative",
      "& > div:first-child" : {
        marginLeft : "24px",
        marginTop:"32px",
        "& > div:first-child" : {
          fontFamily: "Noto Sans CJK KR",
          fontStyle: "normal",
          fontWeight: "700",
          fontSize: "20px",
          lineHeight: "30px",
          letterSpacing: "0.25px",
          color : theme.palette.text.primary
        },
        "& > div:nth-child(2)" : {
          fontFamily: "Noto Sans CJK KR",
          fontStyle: "normal",
          fontWeight: "400",
          fontSize: "11px",
          lineHeight: "16px",
          letterSpacing: "0.25px",

          /* White/text/secondary */

          color: theme.palette.text.secondary,
        }
      }
    },
    "& > div:last-child" : {
      width : "27.5%",
      position : "relative",
      "& > div:first-child" : {
        marginLeft: "24px",
        marginTop: "32px",
        "& > .switch": {
          width: "40px",
          height: "24px",
          padding: "0px",
          display: 'flex',
          borderRadius: "60px",
          '&:active': {
            '& .MuiSwitch-thumb': {
              width: "15px",
            },
            '& .MuiSwitch-switchBase.Mui-checked': {
              transform: 'translateX(4px)',
            },
          },
          '& .MuiSwitch-switchBase': {
            padding: "0px",
            paddingLeft: "4px",
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: theme.palette.primary.main,
              },
            },
          },
          '& .MuiSwitch-thumb': {
            boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
            width: "16px",
            height: "16px",
            marginTop: "4px",
            borderRadius: "8px",
            transition: theme.transitions.create(['width'], {
              duration: 200,
            }),
          },
          '& .MuiSwitch-track': {
            borderRadius: 16 / 2,
            opacity: 1,
            backgroundColor: theme.custom.icon.mono[3],
            boxSizing: 'border-box',
          },
        }
      }
    }
  },
  body : {
    width: "100%",
    height: "258px",
    whiteSpace: "pre-wrap",
    display: "flex",
    justifyContent: "center",
    "&.noDevice" : {
      "& > div" : {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop : "58px",
        "& > div" : {
          marginTop: "10px",
          textAlign: "center",
          fontFamily: "'Noto Sans CJK KR'",
          fontStyle: "normal",
          fontWeight: "700",
          fontSize: "12px",
          lineHeight: "18px",
          letterSpacing: "0.25px",

          color: theme.palette.text.disabled
        }
      }
    },
    "&.list" : {
      width : "calc(100% - 16px)",
      marginLeft : "8px",
      alignItems: "center",
      display: "flex",
      flexDirection : "column",
      justifyContent: "flex-start",
      overflowY : "auto",
      overflowX : "hidden",
      "&::-webkit-scrollbar" : {
        width : "4px",
        backgroundColor: "transparent"

      },
      "&::-webkit-scrollbar-thumb" : {
        borderRadius : "88px",
        backgroundColor: theme.custom.grey[5]
      },
      "&::-webkit-scrollbar-track" : {
        background :"white"
      },
      "&::-webkit-scrollbar-thumb:hover" : {

      },
      "&::-webkit-scrollbar-corner" : {

      },
      "& div.penItem" : {
        marginBottom : "8px",
        "& > div" : {
          width : "312px",
          height : "72px",
          display : "flex",
          border: "1px solid " + theme.custom.grey[3],
          borderRadius: "16px",
          justifyContent: "space-between",
          "&.active" : {
            backgroundColor : theme.custom.icon.blue[3],
            border: "1px solid " + theme.palette.primary.main,
          },
          "& > div:first-child" : {
            marginLeft: "16px",
            marginTop: "16px",
            width : "203px",
            height : "40px",
            display: "flex",
            alignItems: "center",
            "& > div" : {
              marginLeft : "8px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              "& > div:first-child" : {
                fontFamily: "Noto Sans CJK KR",
                fontStyle: "normal",
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "21px",
                letterSpacing: "0.25px",
                display: "flex",
                color: theme.palette.text.primary,
                "& > div:first-child" : {
                  marginRight : "4px",
                  maxWidth: "100px",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                },
                "& > div.warn" : {
                  color : theme.palette.error.main
                }
              },
              "& > div:last-child" : {
                fontFamily: "Noto Sans CJK KR",
                fontStyle: "normal",
                fontWeight: 400,
                fontSize: "12px",
                lineHeight: "18px",
                letterSpacing: "0.25px",
                color: theme.palette.text.secondary
              }
            }
          },
          "& > div:last-child" : {
            height : "40px",
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            fontFamily: "Noto Sans CJK KR",
            fontStyle: "normal",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "21px",
            textAlign: "center",
            letterSpacing: "0.25px",
            marginRight: "16px",
            color: theme.palette.text.primary,
            cursor : "pointer"
          }
        }
      }
    }
  },
  footer : {
    width: "100%",
    height: "88px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addDeviceButton : {
    width : "312px",
    height : "40px",
    borderRadius: "60px",
    fontFamily: "Noto Sans CJK KR",
    fontStyle: "normal",
    fontWeight: 700,
    fontSize: "12px",
    lineHeight: "18px",
    letterSpacing: "0.25px",
    "& .text" : {
      marginLeft : "8px"
    },

    "&.MuiButton-contained.Mui-disabled" : {
      color : theme.palette.text.disabled,
      backgroundColor : theme.custom.grey[3],
      "& .add" : {
        color : theme.custom.icon.mono[2]
      }
    }
  }
}));



const PenList = function(props:React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> ) {
  const classes = useStyle();
  const penList = useSelector((state: RootState) => state.ndpClient.penList);
  const isPenControlOwner = useSelector((state: RootState) => state.ndpClient.isPenControlOwner);

  const bluetoothOn = useSelector((state: RootState) => state.ndpClient.bluetoothOn);
  const searchOn = useSelector((state: RootState) => state.ui.simpleUiData.penListSearchOn);

  const [selectItem, setSelectItem] = useState(-1);
  const [localChecker, setlocalChecker] = useState(false);
  /**
   * bluetoothOn=false => 블루투스 비활성화
   * isPenControlOwner=false => 디바이스 비활성화
   * penList.length=0 && isPenControlOwner=true => 디바이스 없음
   * penList.length>0 && isPenControlOwner=true => 디바이스 기본
   * isPenControlOwner=false to true 변경 시 => 디바이스 연결중(고민 필요)(사실 안보일듯)
   */
  let detailType = 0;
  
  if(!bluetoothOn){
    detailType = 0; // 블루투스 비활성화
  }else if(!isPenControlOwner || !searchOn){ // bluetoothOn === true
    detailType = 1; //  디바이스 비활성화
  }else if(penList.length === 0){ // bluetoothOn === true && isPenControlOwner === true
    detailType = 2; // 디바이스 없음
  }else if(penList.length > 0){ // bluetoothOn === true && isPenControlOwner === true
    detailType = 3; // 디바이스 기본
  }

  useEffect(()=>{
    console.log(isPenControlOwner && localChecker);
    if(isPenControlOwner && localChecker){
      setPenListSearchOn(true);
      setlocalChecker(false);
    }else if(!isPenControlOwner){
      setPenListSearchOn(false);
    }
  },[isPenControlOwner, localChecker])

  const changeOnoff = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean)=>{
    if(searchOn){
      setPenListSearchOn(false);
    }else{
      if(!isPenControlOwner){
        showAlert({type:"getPenOwner"});
        setlocalChecker(true);
      }else{
        setPenListSearchOn(true);
      }
    }
  }
  
  return (
    <div className={classes.wrap}>
      <div className={classes.header}>
        <div className="headText">
          <div>
            <div>
              {getText("bluetooth_connect")}
            </div>
            <div>
              {getText("bluetooth_deviceOn")}
            </div> 
          </div>
        </div>
        <div className="headSwitch">
          <div>
            <Switch className="switch" checked={isPenControlOwner && searchOn && bluetoothOn} onChange={changeOnoff} />
          </div>
        </div>
      </div>
      <PenListDetail type={detailType} className={classes.body} penList={penList} selectItem={selectItem} setSelectItem={setSelectItem} />
      <div className={classes.footer}>
        <ConnectDevice className={classes.addDeviceButton} checked={isPenControlOwner && searchOn && bluetoothOn}/>
      </div>
    </div>
  )
}

export default PenList;





const PenListDetail = function(props : {type:number, className:string, penList:Array<PenListData>, selectItem:number, setSelectItem:React.Dispatch<React.SetStateAction<number>> }){
  // console.log(props.penList);
  const {type, penList} = props;
  const {setSelectItem,selectItem} = props;
  if(type === 0){  // 블루투스 비활성화
    return (<div className={`${props.className} noDevice`}>
      <div>
        <BlueToothSvg />
        <div>{getText("bluetooth_checkBluetooth")}</div>
      </div>
    </div>)
  }else if(type === 1){  //  디바이스 비활성화
    return (<div className={`${props.className} noDevice`}>
      <div>
        <ConnectDeviceSvg />
        <div>{getText("bluetooth_turnOnSwich")}</div>
      </div>
    </div>)
  }else if(type === 2){  // 디바이스 없음
    return (<div className={`${props.className} noDevice`}>
      <div>
        <NodeviceSvg />
        <div>{getText("bluetooth_nodevice")}</div>
      </div>
    </div>)
  }else if(type === 3){ // 디바이스 기본
    return (<div className={`${props.className} list`}>
      {penList.map((el,idx)=>{
        return (<PenItem key={idx} idx={idx} penData={el} checked={selectItem===idx} setSelectItem={setSelectItem} />)
      })}
    </div>)
  }
}

const PenItem = (props:{penData:PenListData, idx:number, checked:boolean, setSelectItem:React.Dispatch<React.SetStateAction<number>> })=>{
  const {penData, setSelectItem, checked, idx} = props;

  const disConnect = async ()=>{
    const res = await NDP.getInstance().Client.localClient.emit("penDisconnect",{
      "mac" : penData.mac
    });
  }

  const selectItem = ()=>{
    if(!checked){
      setSelectItem(idx);
    }
  }

  return (<div className={`penItem ${checked ? "active" : ""}`} onClick={selectItem} >
    <div>
      <div>
        <PenItemSvg />
        <div>
          <div>
            <div>
              {penData.name}
            </div>
            <div className={`${penData.battery < 30 ? "warn" : ""}`}>
              ({penData.battery >= 128? getText("bluetooth_chargeBattery") : penData.battery + "%"})
            </div>
          </div>
          <div>
              {penData.mac} 
          </div>
        </div>
      </div>
      <div onClick={disConnect}>
        {getText("bluetooth_disconnect")}
      </div>
    </div>
  </div>)
}




const ConnectDevice = (props:{checked:boolean, className:string})=>{
  const {checked, className} = props;
  const clickEvent = ()=>{
    NDP.getInstance().Client.localClient.emitCmd("penScan");
  }
  return (
    <Button className={`${className}`} variant="contained" color="primary" disabled={!checked} onClick={clickEvent}>
      <Add className={`add`} />
      <div className={`text`}>{getText("bluetooth_connectDevice")}</div>
    </Button>
  )
}










const BlueToothSvg = ()=>{
  return (<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
    <rect opacity="0.5" x="11" y="10" width="76" height="76" rx="38" fill="#E9E9E9"/>
    <g filter="url(#filter0_i_3889_27489)">
    <path fillRule="evenodd" clipRule="evenodd" d="M49.4737 31.3659C48.9159 30.9548 48.1644 30.8843 47.5348 31.184C46.9052 31.4836 46.5067 32.1016 46.5067 32.7781V37.8521V40.1204L50.1979 42.3815V37.8521V36.3771L56.9333 41.3411L52.7143 43.923L56.1547 46.0306L61.144 42.9772C61.653 42.6657 61.972 42.1342 61.9982 41.5538C62.0245 40.9733 61.7548 40.4171 61.2758 40.0641L49.4737 31.3659ZM61.144 53.0228L38.4609 39.1411C37.6346 38.6355 36.5562 38.8759 36.023 39.6846C35.4637 40.5329 35.7185 41.6758 36.5851 42.2062L46.0524 48L36.5851 53.7938C35.7185 54.3242 35.4637 55.4671 36.023 56.3154C36.5562 57.1241 37.6346 57.3645 38.4609 56.8589L46.5067 51.935V63.2219C46.5067 63.8984 46.9052 64.5164 47.5348 64.816C48.1644 65.1157 48.9159 65.0452 49.4737 64.6341L61.2758 55.9359C61.7548 55.5829 62.0245 55.0267 61.9982 54.4462C61.972 53.8658 61.653 53.3343 61.144 53.0228ZM56.9333 54.6589L50.1979 50.537V59.6229L56.9333 54.6589Z" fill="#CFCFCF"/>
    </g>
    <defs>
    <filter id="filter0_i_3889_27489" x="35.7261" y="30" width="26.2739" height="35" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
    <feOffset dy="-1"/>
    <feGaussianBlur stdDeviation="1"/>
    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.369531 0 0 0 0 0.373828 0 0 0 0 0.4125 0 0 0 0.3 0"/>
    <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3889_27489"/>
    </filter>
    </defs>
  </svg>)
}

const ConnectDeviceSvg =()=>{
  return (
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
    <g filter="url(#filter0_d_3865_60625)">
      <rect x="14" y="14" width="68" height="69" rx="4" fill="white"/>
    </g>
    <rect x="21" y="24" width="24" height="5" rx="2.5" fill="#EBEDF0"/>
    <rect x="21" y="68" width="54" height="7" rx="3.5" fill="#688FFF"/>
    <rect opacity="0.7" x="21" y="37" width="54" height="25" rx="3" fill="#E8ECF5"/>
    <mask id="mask0_3865_60625" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="53" y="8" width="36" height="36">
      <circle cx="71" cy="26" r="18" fill="#D9D9D9"/>
    </mask>
    <g mask="url(#mask0_3865_60625)">
      <circle cx="71" cy="26" r="17" fill="white" stroke="#688FFF" strokeWidth="2"/>
      <rect x="62" y="21" width="18" height="11" rx="5.5" fill="#688FFF"/>
      <circle cx="74.5" cy="26.5" r="3.5" fill="white"/>
    </g>
    <defs>
      <filter id="filter0_d_3865_60625" x="7" y="9" width="82" height="83" filterUnits="userSpaceOnUse" colorInterpolation-filters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dy="2"/>
        <feGaussianBlur stdDeviation="3.5"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.570833 0 0 0 0 0.570833 0 0 0 0 0.570833 0 0 0 0.3 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3865_60625"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3865_60625" result="shape"/>
      </filter>
    </defs>
  </svg>)
}

const NodeviceSvg = ()=>{
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
      <g filter="url(#filter0_ii_3865_60496)">
        <rect x="49.8162" y="58.4395" width="11" height="14" transform="rotate(-45 49.8162 58.4395)" fill="#F3F4F4"/>
      </g>
      <g filter="url(#filter1_ii_3865_60496)">
        <rect x="54.7659" y="64.8032" width="13" height="34" rx="4" transform="rotate(-45 54.7659 64.8032)" fill="#5BBAEF"/>
      </g>
      <g filter="url(#filter2_bi_3865_60496)">
        <circle r="25.5" transform="matrix(-1 0 0 1 36.9626 34.5)" fill="#E3F2FF" fillOpacity="0.4"/>
        <circle r="25.5" transform="matrix(-1 0 0 1 36.9626 34.5)" fill="url(#paint0_linear_3865_60496)" fillOpacity="0.4"/>
      </g>
      <g filter="url(#filter3_ii_3865_60496)">
        <path fillRule="evenodd" clipRule="evenodd" d="M36.9626 62C21.7748 62 9.46265 49.6878 9.46265 34.5C9.46265 19.3122 21.7748 7 36.9626 7C52.1505 7 64.4626 19.3122 64.4626 34.5C64.4626 49.6878 52.1505 62 36.9626 62ZM36.9627 57C24.5362 57 14.4627 46.9264 14.4627 34.5C14.4627 22.0736 24.5362 12 36.9627 12C49.3891 12 59.4627 22.0736 59.4627 34.5C59.4627 46.9264 49.3891 57 36.9627 57Z" fill="#F6F7FB"/>
      </g>
      <defs>
        <filter id="filter0_ii_3865_60496" x="49.8162" y="46.2778" width="17.6777" height="22.0611" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-4.38356"/>
          <feGaussianBlur stdDeviation="2.5"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.567042 0 0 0 0 0.548958 0 0 0 0 0.775 0 0 0 1 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3865_60496"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-2.19178"/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
          <feBlend mode="normal" in2="effect1_innerShadow_3865_60496" result="effect2_innerShadow_3865_60496"/>
        </filter>
        <filter id="filter1_ii_3865_60496" x="56.4227" y="53.2676" width="29.9203" height="33.9204" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-5.78388"/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.0991667 0 0 0 0 0.286167 0 0 0 0 0.566667 0 0 0 0.4 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3865_60496"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-2.16896"/>
          <feGaussianBlur stdDeviation="1.44597"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="effect1_innerShadow_3865_60496" result="effect2_innerShadow_3865_60496"/>
        </filter>
        <filter id="filter2_bi_3865_60496" x="9.46265" y="7" width="57" height="57" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feGaussianBlur in="BackgroundImage" stdDeviation="1"/>
          <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_3865_60496"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_3865_60496" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dx="4" dy="5"/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.671441 0 0 0 0 0.846016 0 0 0 0 0.920833 0 0 0 0.15 0"/>
          <feBlend mode="normal" in2="shape" result="effect2_innerShadow_3865_60496"/>
        </filter>
        <filter id="filter3_ii_3865_60496" x="9.46265" y="5" width="55" height="57" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-2"/>
          <feGaussianBlur stdDeviation="1"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.0716667 0 0 0 0 0.136167 0 0 0 0 0.716667 0 0 0 0.3 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3865_60496"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-2.19178"/>
          <feGaussianBlur stdDeviation="0.547945"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="effect1_innerShadow_3865_60496" result="effect2_innerShadow_3865_60496"/>
        </filter>
        <linearGradient id="paint0_linear_3865_60496" x1="43" y1="10" x2="11" y2="42.5" gradientUnits="userSpaceOnUse">
        <stop offset="0.0520833" stopColor="white"/>
        <stop offset="0.668163" stopColor="white"/>
        <stop offset="0.711066" stopColor="white" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

const PenItemSvg = ()=>{
  return (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="2" y="2" width="36" height="36" rx="18" fill="#F1F1FA"/>
    <g filter="url(#filter0_bdii_3865_60642)">
      <path d="M19.4998 11.4542C19.4998 10.896 20.1548 10.5803 20.6079 10.9201L28.7303 17.0114C28.9002 17.1388 28.9998 17.3362 28.9998 17.5455V26.1054C28.9998 26.6635 28.3447 26.9792 27.8916 26.6394L19.7692 20.5481C19.5993 20.4207 19.4998 20.2233 19.4998 20.0141V11.4542Z" fill="white" fillOpacity="0.05"/>
      <path d="M19.4998 11.4542C19.4998 10.896 20.1548 10.5803 20.6079 10.9201L28.7303 17.0114C28.9002 17.1388 28.9998 17.3362 28.9998 17.5455V26.1054C28.9998 26.6635 28.3447 26.9792 27.8916 26.6394L19.7692 20.5481C19.5993 20.4207 19.4998 20.2233 19.4998 20.0141V11.4542Z" fill="#00B3DA" fillOpacity="0.45"/>
      <path d="M19.4998 11.4542C19.4998 10.896 20.1548 10.5803 20.6079 10.9201L28.7303 17.0114C28.9002 17.1388 28.9998 17.3362 28.9998 17.5455V26.1054C28.9998 26.6635 28.3447 26.9792 27.8916 26.6394L19.7692 20.5481C19.5993 20.4207 19.4998 20.2233 19.4998 20.0141V11.4542Z" fill="url(#paint0_linear_3865_60642)" fillOpacity="0.1"/>
    </g>
    <g filter="url(#filter1_bddii_3865_60642)">
      <path d="M10.5142 14.5028C10.5142 14.0842 10.8854 13.7668 11.2908 13.8388L28.4655 16.8892C28.7827 16.9456 29.0142 17.2257 29.0142 17.5532V26.1544C29.0142 26.573 28.6429 26.8904 28.2375 26.8184L11.0628 23.768C10.7456 23.7117 10.5142 23.4316 10.5142 23.1041V14.5028Z" fill="white" fillOpacity="0.03" shapeRendering="crispEdges"/>
      <path d="M10.5142 14.5028C10.5142 14.0842 10.8854 13.7668 11.2908 13.8388L28.4655 16.8892C28.7827 16.9456 29.0142 17.2257 29.0142 17.5532V26.1544C29.0142 26.573 28.6429 26.8904 28.2375 26.8184L11.0628 23.768C10.7456 23.7117 10.5142 23.4316 10.5142 23.1041V14.5028Z" fill="url(#paint1_linear_3865_60642)" fillOpacity="0.4" shapeRendering="crispEdges"/>
      <path d="M10.5142 14.5028C10.5142 14.0842 10.8854 13.7668 11.2908 13.8388L28.4655 16.8892C28.7827 16.9456 29.0142 17.2257 29.0142 17.5532V26.1544C29.0142 26.573 28.6429 26.8904 28.2375 26.8184L11.0628 23.768C10.7456 23.7117 10.5142 23.4316 10.5142 23.1041V14.5028Z" fill="#935EFF" fillOpacity="0.5" shapeRendering="crispEdges"/>
    </g>
    <g filter="url(#filter2_bddii_3865_60642)">
      <path d="M10.5 14.4893C10.5 13.9443 11.1296 13.6341 11.5688 13.9629L19.2354 19.7025C19.4021 19.8272 19.5 20.0221 19.5 20.2289V28.8387C19.5 29.3838 18.8704 29.694 18.4312 29.3652L10.7646 23.6256C10.5979 23.5008 10.5 23.306 10.5 23.0991V14.4893Z" fill="url(#paint2_linear_3865_60642)" fillOpacity="0.2" shapeRendering="crispEdges"/>
      <path d="M10.5 14.4893C10.5 13.9443 11.1296 13.6341 11.5688 13.9629L19.2354 19.7025C19.4021 19.8272 19.5 20.0221 19.5 20.2289V28.8387C19.5 29.3838 18.8704 29.694 18.4312 29.3652L10.7646 23.6256C10.5979 23.5008 10.5 23.306 10.5 23.0991V14.4893Z" fill="#FF7D45" fillOpacity="0.48" shapeRendering="crispEdges"/>
    </g>
    <defs>
    <filter id="filter0_bdii_3865_60642" x="16.4998" y="4.77979" width="18.5" height="25" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feGaussianBlur in="BackgroundImage" stdDeviation="0.075"/>
      <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_3865_60642"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="1.5" dy="-1.5"/>
      <feGaussianBlur stdDeviation="2.25"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.188003 0 0 0 0 0.789731 0 0 0 0 0.920833 0 0 0 0.15 0"/>
      <feBlend mode="normal" in2="effect1_backgroundBlur_3865_60642" result="effect2_dropShadow_3865_60642"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_3865_60642" result="shape"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="-0.5" dy="0.5"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.701961 0 0 0 0 0.854902 0 0 0 0.6 0"/>
      <feBlend mode="normal" in2="shape" result="effect3_innerShadow_3865_60642"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="0.5" dy="-0.5"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0"/>
      <feBlend mode="normal" in2="effect3_innerShadow_3865_60642" result="effect4_innerShadow_3865_60642"/>
    </filter>
    <filter id="filter1_bddii_3865_60642" x="6.76416" y="10.0786" width="29" height="23.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feGaussianBlur in="BackgroundImage" stdDeviation="0.375"/>
      <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_3865_60642"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="1.5" dy="1.5"/>
      <feGaussianBlur stdDeviation="2.625"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.642236 0 0 0 0 0.466667 0 0 0 0 1 0 0 0 0.25 0"/>
      <feBlend mode="normal" in2="effect1_backgroundBlur_3865_60642" result="effect2_dropShadow_3865_60642"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="0.9"/>
      <feGaussianBlur stdDeviation="0.75"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.272601 0 0 0 0 0.0989236 0 0 0 0 0.641667 0 0 0 0.05 0"/>
      <feBlend mode="normal" in2="effect2_dropShadow_3865_60642" result="effect3_dropShadow_3865_60642"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_3865_60642" result="shape"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="-0.5" dy="0.5"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.410816 0 0 0 0 0.185052 0 0 0 0 0.779167 0 0 0 0.2 0"/>
      <feBlend mode="normal" in2="shape" result="effect4_innerShadow_3865_60642"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="0.5" dy="-0.5"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"/>
      <feBlend mode="normal" in2="effect4_innerShadow_3865_60642" result="effect5_innerShadow_3865_60642"/>
    </filter>
    <filter id="filter2_bddii_3865_60642" x="7.5" y="10.8281" width="19.5" height="24.6719" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feGaussianBlur in="BackgroundImage" stdDeviation="0.225"/>
      <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_3865_60642"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="1.5" dy="1.5"/>
      <feGaussianBlur stdDeviation="2.25"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.895833 0 0 0 0 0.402764 0 0 0 0 0.190365 0 0 0 0.32 0"/>
      <feBlend mode="normal" in2="effect1_backgroundBlur_3865_60642" result="effect2_dropShadow_3865_60642"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="3" dy="1.5"/>
      <feGaussianBlur stdDeviation="2.25"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0"/>
      <feBlend mode="normal" in2="effect2_dropShadow_3865_60642" result="effect3_dropShadow_3865_60642"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_3865_60642" result="shape"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="0.5" dy="-0.5"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"/>
      <feBlend mode="normal" in2="shape" result="effect4_innerShadow_3865_60642"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dx="-0.5" dy="0.5"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.458333 0 0 0 0 0.225 0 0 0 0.6 0"/>
      <feBlend mode="normal" in2="effect4_innerShadow_3865_60642" result="effect5_innerShadow_3865_60642"/>
    </filter>
    <linearGradient id="paint0_linear_3865_60642" x1="14.75" y1="20.2499" x2="16.9159" y2="24.3894" gradientUnits="userSpaceOnUse">
      <stop offset="0.0574112" stopColor="white" stopOpacity="0.03"/>
      <stop offset="0.372802" stopColor="white"/>
      <stop offset="0.388381" stopColor="white" stopOpacity="0"/>
    </linearGradient>
    <linearGradient id="paint1_linear_3865_60642" x1="15.4981" y1="13.6772" x2="24.7837" y2="27.1823" gradientUnits="userSpaceOnUse">
      <stop stopColor="white"/>
      <stop offset="0.369792" stopColor="white"/>
      <stop offset="0.369892" stopColor="white" stopOpacity="0"/>
    </linearGradient>
    <linearGradient id="paint2_linear_3865_60642" x1="13.3122" y1="22.7289" x2="10.1638" y2="27.1343" gradientUnits="userSpaceOnUse">
      <stop stopColor="white" stopOpacity="0.7"/>
      <stop offset="0.372802" stopColor="white"/>
      <stop offset="0.388381" stopColor="white" stopOpacity="0"/>
    </linearGradient>
    </defs>
  </svg>
  )
}