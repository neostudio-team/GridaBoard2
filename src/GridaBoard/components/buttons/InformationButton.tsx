import React, {useState} from "react";
import { setHelpMenu } from "../CustomElement/HelpMenu";
import { IconButton, Button, SvgIcon, makeStyles, ClickAwayListener } from '@material-ui/core';
import getText from "../../language/language";
import { useSelector } from "react-redux";
import { RootState } from "../../store/rootReducer";
import { showInformation } from "../../store/reducers/ui";

const useStyle = makeStyles(theme => ({
  icon : {
    background: theme.custom.grey[0],
    width: "40px",
    height: "40px",
    padding: "0",
    "&:hover" : {
      background : theme.custom.grey[0],
    },
    "& > span" : {
      color: "white",
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "24px",
      lineHeight: "28px",
      display: "flex",
      alignItems: "center",
      textAlign: "right",
      letterSpacing: "0.25px"
    }
  },
  dropDown : {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    minWidth: "200px",
    right: "30px",
    bottom: "35px",
    boxShadow: theme.custom.shadows[0],
    borderRadius: "12px",
    zIndex: 10000,
    color : theme.custom.icon.mono[0],
    background: theme.custom.white[90],
    padding: "10px",
    "& > *" : {
      minWidth: "184px",
      height: "40px",
      padding: "0px",
      paddingLeft: "2px",
      justifyContent: "left",
      "&:hover" : {
        color : theme.palette.action.hover,
        background: theme.custom.icon.blue[3]
      },
      "&>span" : {
        height: "40px",
        "&:hover": {
          color : theme.palette.action.hover,
        }
      }
    }
  }
}));
type Props = {
  className : string,
  tutorialMain : number,
  tutorialSub : number,
}

const InformationButton = (props: Props) => {
  const { className, tutorialMain, tutorialSub } = props;
  const [gestureMain, gestureSub] = [3, 1];
  const isOpen = useSelector((state: RootState) => state.ui.information)
  // const [isOpen, setIsOpen] = useState(false);
  const classes = useStyle();
  const selectArr = [
    {
      type : "href",
      title : "go_to_neolab",
      link : "https://labs.neostudio.io/forum/15/"
    },
    {
      type : "href",
      title : "go_to_guide",
      link : "https://neolabdev.gitbook.io/gridaboard/"
    },
    {
      type : "onClick",
      title : "go_to_help",
      event : ()=>{
        showInformation(false);
        // openTutorial();
        setHelpMenu(true, tutorialMain, tutorialSub);
      }
    },
    {
      type: "onClick",
      title: "pen_gesture_guide",
      event : ()=>{
        showInformation(false);
        setHelpMenu(true, gestureMain, gestureSub);
      }
    }
  ]

  function handleClick() {
    showInformation(!isOpen);
  }
  function handleClickAway(){
    showInformation(false);
  }
  return (
    <ClickAwayListener onClickAway={handleClickAway}>
    <div className={className}>
      <IconButton className={classes.icon} onClick={handleClick} >
        ?
      </IconButton>

      {isOpen ? (<div id="fitDrop" className={classes.dropDown}>
        {selectArr.map((el, idx)=>(
            el.type == "href" ? 
            (<Button key={idx} target="_blank" href={el.link}>
                {getText(el.title)}
                {/* {el.title} */}
            </Button>) : 
            (<Button key = {idx} onClick={el.event}>
              {getText(el.title)}
            </Button>)
        ))}
        </div>) : null}
      
    </div>
    </ClickAwayListener>
  );
}

export default InformationButton