import React, { useState, useEffect} from 'react';
import '../../styles/main.css';
import PenManager from '../../../nl-lib/neosmartpen/PenManager';
import { ButtonBase, makeStyles, Theme, Tooltip, TooltipProps, ClickAwayListener} from '@material-ui/core';
import { IBrushType, PenEventName } from "nl-lib/common/enums";
import getText from "../../language/language";
import SimpleTooltip from "../SimpleTooltip";
import { useSelector } from 'react-redux';
import { RootState } from '../../store/rootReducer';

const manager: PenManager = PenManager.getInstance();

const useStyles = makeStyles((theme: Theme) => ({
  smallBtn: {
    width: "18px !important", 
    height: "18px !important",
  },
  colorBtn : {
    textAlign: "center",
    padding: "0px",
    transition: "none",
    float: "left"
  },
  colorIcon : {
    marginTop: "0px",
    width: "24px",
    height: "24px",
    borderRadius: "24px",
    "&:hover" : {
      boxShadow: theme.custom.shadows[1]
    },
    "&:pressed" : {
      border: "2px solid var(--gridaboard_cyan)"
    }
  },
  dropColorBtn : {
    marginTop: "8px",
    marginLeft: "22px"
  },
  selectColorBtn : {
    width : "40px",
    height : "40px",
    marginLeft: "16px",
  },
  colorDropDownStyle : {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "4px 4px",
    position: "absolute",
    width: "486px",
    height: "48px",
    background: theme.custom.white[90],
    boxShadow: theme.custom.shadows[0],
    borderRadius: "12px",
    zIndex: 100,
    marginTop: "30px",
    marginLeft: "20px"
  }
}));



  
let btnStyles = [] as React.CSSProperties[];

const ColorButtons = () => {
  const {renderCountNo_store} = useSelector((state: RootState) =>({
    renderCountNo_store: state.activePen.renderCount,
  }));

  const [penType, setPenType] = useState(manager.penRendererType as IBrushType);
  const [color, setColor] = useState(manager.color as string);
  const [isOpen, setIsOpen] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    changeBtnStyles();
    manager.addEventListener(PenEventName.ON_PEN_TYPE_CHANGED, changeColorBtns);
    manager.addEventListener(PenEventName.ON_COLOR_CHANGED, changeColorBtnSelected);

    return () => {
      manager.removeEventListener(PenEventName.ON_PEN_TYPE_CHANGED, changeColorBtns);
      manager.removeEventListener(PenEventName.ON_COLOR_CHANGED, changeColorBtnSelected);
    }
  }, []);
    


  const changeColor = (color: number) => {
    manager.setColor(color);
    setIsOpen(false);
  }

  function handleClick() {
    setIsOpen((prev) => !prev);
  }
  function handleClickAway(){
    setIsOpen(false);
  }

  const changeBtnStyles = () => {
    switch (manager.penRendererType) {
      case IBrushType.PEN: {
        btnStyles = [];
        for (let i = 1; i <= 10; i++) {
          btnStyles.push({
            backgroundColor: manager.pen_colors[i]
          })
        }
        break;
      }
      case IBrushType.MARKER: {
        btnStyles = [];
        for (let i = 1; i <= 10; i++) {
          btnStyles.push({
            backgroundColor: manager.marker_colors[i]
          })
        }
        break;
      }
      default: break;
    }

    changeColorBtnSelected();
  }
  
  const changeColorBtns = () => {
    changeBtnStyles();
    setPenType(manager.penRendererType);
  }

  const changeColorBtnSelected = () => {
    switch (manager.penRendererType) {
      case IBrushType.PEN: {
        let bgColor = "";
        bgColor = manager.color;
        setColor(bgColor) //for re-render
        break;
      }
      case IBrushType.MARKER: {
        let bgColor = "";
        const colorNum = manager.getColorNum(manager.color);
        bgColor = manager.marker_colors[colorNum];
        setColor(bgColor) //for re-render
        break;
      }
      default: break;
    }
  }
  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div>
        <SimpleTooltip title={getText("nav_color")}>
          <ButtonBase className={`${classes.colorBtn} ${classes.selectColorBtn}`} onClick={()=>handleClick()}>
            <div id="" className={`${classes.smallBtn} ${classes.colorIcon}`} style={{"backgroundColor": color }}></div>
            {/* <KeyboardArrowDownRoundedIcon style={{marginLeft: "6px"}}/> */}
          </ButtonBase>
        </SimpleTooltip>
        
        {isOpen ? (
          <div className={`${classes.colorDropDownStyle}`}>
            {(Array.from({length:10},(el,idx)=>idx)).map(el=>{
              return (<ButtonBase key={el} className={`${classes.colorBtn} ${classes.dropColorBtn}`} onClick={() => changeColor((el+1)%10)}>
              <div className={classes.colorIcon} style={btnStyles[el]}></div>
              </ButtonBase>)
            })}
          </div>
          ) : null}
      </div>
    </ClickAwayListener>
  );
}
export default ColorButtons;