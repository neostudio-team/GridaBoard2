import React from "react";
import { makeStyles, Theme, Switch, createGenerateClassName, ThemeProvider} from '@material-ui/core';
import { useSelector } from "react-redux";
import { RootState } from "../../store/rootReducer";
import getText from "GridaBoard/language/language";
import { setPenListSearchOn } from "../../store/reducers/ui";

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
    "&.bluetoothOff" : {
      display: "flex",
      justifyContent: "center",
      "& > div" : {
        justifyContent: "center",
        flexDirection: "column",
        alignItems: "center",
        marginTop : "58px",
        "& > div" : {
          marginTop: "10px",
        }
      }
    }
  },
  footer : {
    width: "100%",
    height: "88px",
  }
}));



const PenList = function(props:React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> ) {
  const classes = useStyle();
  const penList = useSelector((state: RootState) => state.ndpClient.penList);
  const isPenControlOwner = useSelector((state: RootState) => state.ndpClient.isPenControlOwner);

  const bluetoothOn = useSelector((state: RootState) => state.ndpClient.bluetoothOn);
  const searchOn = useSelector((state: RootState) => state.ui.simpleUiData.penListSearchOn);
  /**
   * bluetoothOn=false => 블루투스 비활성화
   * isPenControlOwner=false => 디바이스 비활성화
   * penList.length=0 && isPenControlOwner=true => 디바이스 없음
   * penList.length>0 && isPenControlOwner=true => 디바이스 기본
   * isPenControlOwner=false to true 변경 시 => 디바이스 연결중(고민 필요)(사실 안보일듯)
   */
  let detailType = 0;
  console.log(!isPenControlOwner, searchOn);
  let onoff = false;
  if(!bluetoothOn){
    detailType = 0; // 블루투스 비활성화
  }else if(!isPenControlOwner || !searchOn){ // bluetoothOn === true
    detailType = 1; //  디바이스 비활성화
  }else if(penList.length === 0){ // bluetoothOn === true && isPenControlOwner === true
    detailType = 2; // 디바이스 없음
  }else if(penList.length > 0){ // bluetoothOn === true && isPenControlOwner === true
    detailType = 3; // 디바이스 기본
  }

  const changeOnoff = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean)=>{
    console.log(checked);
    if(searchOn){
      setPenListSearchOn(false);
    }else{
      if(isPenControlOwner){
        setPenListSearchOn(true);
      }else{
        // GAEMY TODO : 오너 가져오기 작업
        alert("need owner")
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
            <Switch className="switch" checked={searchOn && bluetoothOn} onChange={changeOnoff} />
          </div>
        </div>
      </div>
      <PenListDetail type={detailType} className={classes.body} penList={penList} />
      <div className={classes.footer}>

      </div>
    </div>
  )
}

export default PenList;





const PenListDetail = function(props : {type:number, className:string, penList:any}){
  if(props.type === 0){  // 블루투스 비활성화
    return (<div className={`${props.className} bluetoothOff`}>
      <div>
        <BlueToothSvg />
        <div>{getText("bluetooth_checkBluetooth")}</div>
      </div>
    </div>)
  }else if(props.type === 1){  //  디바이스 비활성화
    return (<div className={`${props.className} deviceOff`}>
      111111111111
    </div>)
  }else if(props.type === 2){  // 디바이스 없음
    return (<div className={`${props.className} noDevice`}>
      222222222222
    </div>)
  }else if(props.type === 3){ // 디바이스 기본
    const {penList} = props;
    return (<div className={`${props.className} list`}>
      333333333
    </div>)
  }
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