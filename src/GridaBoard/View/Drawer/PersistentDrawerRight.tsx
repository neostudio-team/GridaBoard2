import React, { useEffect } from 'react';
import { makeStyles, useTheme, Theme } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import { BoxProps, Button } from '@material-ui/core';
import DrawerPages from './DrawerPages';
import { RootState } from '../../store/rootReducer';
import { useSelector } from "react-redux";
import AddIcon from '@material-ui/icons/Add';
import GridaDoc, { addBlankPage } from '../../GridaDoc';
import { setActivePageNo } from "../../store/reducers/activePageReducer";
import { scrollToBottom } from '../../../nl-lib/common/util';
import getText from "../../language/language";


const useStyles = props => makeStyles((theme: Theme) => ({
  root: {
    display: 'block',
  },
  drawer: {
    width: props.drawerWidth + "px",
    flexShrink: 0,
  },
  toolbar: theme.mixins.toolbar,
  title: {
    flexGrow: 1,
  },
  hide: {
    display: 'none',
  },
  liner: { 
    height: "1px",
    background: "rgba(255,255,255,1)",
    zoom: 1 / props.brZoom
  },
  drawerHeader: {
    display: 'fixed',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    justifyContent: 'flex-start',
    zIndex: 150,
    height: "56px",
    overflow: "auto",
    "& > button" : {
      position: "fixed",
      zIndex: 1100,
      marginTop: "8px",
      marginLeft: "120px",
      padding: "8px",
      background: "white",
      opacity: 0.8
    }
  },
  dragger: {
    width: "5px",
    padding: "4px 0 0",
    borderTop: "1px solid #ddd",
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  drawerFooter: {
    height: "80px",
    "& > button":{
      marginTop: "74vh",
      position: "fixed",
      flexDirection: "row",
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: "2px 0px 24px rgba(0, 0, 0, 0.15)",
      borderRadius: "60px",
      width: 140,
      height: 40,
      bottom: 24,
      left: 20,
      zIndex: 1100,
      "& > span:first-child" : {
        "& > span": {
          fontSize: "12px"
        },
        "& > svg" : {
          width: "12px",
          height: "12px",
          color: theme.custom.icon.mono[4]
        }
      }
    }
  },
  drawerContainer : {
    overflow: 'auto',
    paddingTop:"14px",
  },
  customizeToolbar : {
    minHeight: "91px"
  },
  drawerPaper : {
    width: props.drawerWidth + "px",
    flexShrink: 0,
    zIndex: 1100,
    background: "rgba(0,0,0,0)", 
    float: "left", 
    display: "flex",
    position: "relative"
  },
  newPage : {
    padding: "60px 50px",
    margin: "10px 24px",
    background: theme.palette.background.paper,
    // border: "1px" + theme.palette.primary.main,
    // borderStyle: "dashed",
    textAlign: "center",
    color: theme.palette.primary.main,
    fontWeight: "bold",
    fontSize: "30px",
    cursor: "pointer",
    "&:hover" : {
      backgroundColor: "rgba(0, 0, 0, 0.1)"
    },
    backgroundImage: `
      repeating-linear-gradient(0deg, ${theme.palette.primary.main}, ${theme.palette.primary.main} 10px, transparent 10px, transparent 20px, ${theme.palette.primary.main} 20px), 
      repeating-linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.main} 10px, transparent 10px, transparent 20px, ${theme.palette.primary.main} 20px), 
      repeating-linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.primary.main} 10px, transparent 10px, transparent 20px, ${theme.palette.primary.main} 20px), 
      repeating-linear-gradient(270deg, ${theme.palette.primary.main}, ${theme.palette.primary.main} 10px, transparent 10px, transparent 20px, ${theme.palette.primary.main} 20px)`,
    backgroundSize: "1px 100%, 100% 1px, 1px 100% , 100% 1px",
    backgroundPosition: "0 0, 0 0, 100% 0, 0 100%",
    backgroundRepeat: "no-repeat"
  }
}));


interface Props extends BoxProps {
  onDrawerResize: (size: number) => void,
  open: boolean,

  noInfo?: boolean,
}

export default function PersistentDrawerRight(props: Props) {
  const brZoom = useSelector((state: RootState) => state.ui.browser.zoom);
  const drawerWidth = useSelector((state: RootState) => state.ui.drawer.width);
  const classes = useStyles({brZoom:brZoom, drawerWidth:drawerWidth})();
  const theme = useTheme();
  const [open, setOpen] = React.useState(props.open);
  const numDocPages = useSelector((state: RootState) => state.activePage.numDocPages)
  // const [handleDrawerClose, setHandleDrawerClose] = React.useState(props.handleDrawerClose);

  // const [drawerWidth, setDrawerWidth] = React.useState(defaultDrawerWidth);
  // const setDrawerWidth = (width: number) => updateDrawerWidth({ width });
  useEffect(() => { setOpen(props.open); }, [props.open]);

  return (
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        transitionDuration={theme.transitions.duration.enteringScreen + (open?50:-100)}
        open={open}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
      {/* <Toolbar className={classes.customizeToolbar} /> */}
        <div id="drawer_content" className={classes.drawerContainer}>
          {numDocPages === 0 ? 
          <div className={classes.newPage} onClick={(e) => addBlankPage()}>
            <AddIcon />
          </div> 
          : null}
          < DrawerPages noInfo={props.noInfo} />
          
          {/* <div className={classes.drawerFooter} >
            <Button variant="contained" color="primary" onClick={(evnet) => addBlankPage(event)} >
              <AddIcon />
              <span >{getText("add_page")}</span>
            </Button>
          </div> */}
        </div>
      </Drawer>
  );
}