import React, {useState} from "react";
import HeadBanner from "./HeadBanner";
import HeaderLayer from "./HeaderLayer";
import NavLayer from "./NavLayer";
import LeftSideLayer from "./LeftSideLayer";
import ContentsLayer from "./ContentsLayer";
import { ButtonProps, AppBar, makeStyles, Collapse, Button, IconButton } from "@material-ui/core";
import { IFileBrowserReturn } from "nl-lib/common/structures";
import {FirstPage, LastPage} from '@material-ui/icons';
import PenLogWindow from "../debugging/PenLogWindow";
import TestButton from "../components/buttons/TestButton";
import CustomBadge from "../components/CustomElement/CustomBadge";
import clsx from 'clsx';
import { useSelector } from "react-redux";
import { RootState } from "../store/rootReducer";
import RotateButton from "../components/buttons/RotateButton";
import PageClearButton from "../components/buttons/PageClearButton";
import PageDeleteButton from "../components/buttons/PageDeleteButton";
import SimpleTooltip from "../components/SimpleTooltip";
import { setleftDrawerOpen } from "../store/reducers/ui";

/**
 *
 */
interface Props extends ButtonProps {
  handlePdfOpen: (event: IFileBrowserReturn) => void,
}

const useStyles = makeStyles((theme) => {
  return ({
    wrap : {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    },
    main : {
      background: theme.custom.black[5],
      display: "flex", 
      flex: 1, 
      flexDirection: "row-reverse", 
      justifyContent: "flex-start", 
      height:"calc(100% - 300px)"
    },
    headerViewBtn : {
      zIndex: 0,
      height:"24px",
      borderBottom : "rgba(0,0,0,0.05) solid 1px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      "&:hover" : {
        background: "rgba(0,0,0,0.15)",
      }
    },
    headerViewOn : {
      "width": "0",
      "height": "0",
      borderLeft: "10px solid transparent",
      borderRight: "10px solid transparent",
      borderBottom: `5px solid ${theme.custom.icon.mono[1]}`
    },
    headerViewOff : {
      "width": "0",
      "height": "0",
      borderLeft: "10px solid transparent",
      borderRight: "10px solid transparent",
      borderTop: `5px solid ${theme.custom.icon.mono[1]}`
    },
    headerCollapse:{
      background: theme.custom.white[50]
    },
    tool: {
      width: "56px",
      height: "100%",
      borderRight : "rgba(88, 98, 125, 0.15) solid 1px",
    },
    opener : {
      width: "56px",
      height: "56px",
      background: "#58627D",
      color: "#ffffff",
      // borderRight : "rgba(88, 98, 125, 0.15) solid 1px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    },
    pageOptions: {
      display: "flex",
      flexDirection: "column",
      width: "56px",
      height: "56px",
      alignItems: "center",
    },
  })
});

// style={{"--appBar-height":"0px"}}
const ViewLayer = (props: Props) => {
  const classes = useStyles();
  const [isView, setHeaderView] = useState(true); //헤더 뷰
  const [debugOpen, setDebugOpen] = useState(false);
  // const [drawerOpen, setDrawerOpen] = useState(true);
  const drawerOpen = useSelector((state: RootState) => state.ui.simpleUiData.leftDrawerOpen);

  const activePageNo_store = useSelector((state: RootState) => state.activePage.activePageNo);

  const handlePenLogWindow = () => {
    setDebugOpen(!debugOpen);
  }

  const hideHeader = () => {
    setHeaderView((prev)=>!prev);
  }

  const handleDrawerOpen = () => {
    if(activePageNo_store === -1) return ;
    setleftDrawerOpen(!drawerOpen);
    // setDrawerOpen((prev)=>!prev);
  };

  const hiddenTest = true;

  return (
    <div className={classes.wrap}>
      <HeadBanner />
      <AppBar position="relative" color="transparent" elevation={0}> 
        <Collapse in={isView} className={classes.headerCollapse} timeout={0}>
          <HeaderLayer {...props} handlePenLogWindow={handlePenLogWindow} hidden={hiddenTest} />
        </Collapse>
          <NavLayer {...props} hideHeader={hideHeader}/>
      </AppBar>
      <div className={classes.main}>
        <ContentsLayer {...props}/>
        <LeftSideLayer {...props} drawerOpen={drawerOpen}/>

        <div className={classes.tool}>

          <div className={classes.opener} onClick={handleDrawerOpen}>
            <CustomBadge badgeContent={`L`}>
              <IconButton disabled={false}>
                {drawerOpen? (<FirstPage style={{color: "#ffffff"}}/>) : (<LastPage style={{color: "#ffffff"}}/>)}
              </IconButton>
            </CustomBadge>
          </div>

          <div className={classes.pageOptions}>
            
              <CustomBadge badgeContent={`TAB`}>
                <RotateButton disabled={activePageNo_store === -1} />
              </CustomBadge>

              <CustomBadge badgeContent={`Y`}>
                <PageClearButton disabled={activePageNo_store === -1} />
              </CustomBadge>

              <CustomBadge badgeContent={`D`}>
                <PageDeleteButton disabled={activePageNo_store === -1} />
              </CustomBadge>
          </div>

        </div>

      </div>

      <PenLogWindow open={debugOpen} hidden={hiddenTest}/>

    </div>
  );
}

export default ViewLayer;
