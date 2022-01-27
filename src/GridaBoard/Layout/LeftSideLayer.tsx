import React, { useRef, useEffect, useCallback } from "react";
import { RootState } from "../store/rootReducer";
import { useSelector } from "react-redux";
import { makeStyles, Theme, useTheme } from "@material-ui/core";
import PersistentDrawerRight from "../View/Drawer/PersistentDrawerRight";
import { updateDrawerWidth } from "../store/reducers/ui";
import { fileOpenHandler } from "./HeaderLayer";


const useStyle = props => makeStyles(theme=>({
  wrap: {
    display: "flex",
    height:"100%",
    width: props.drawerOpen ? props.drawerWidth + "px" : 0,
    zoom: 1 / props.brZoom,
    zIndex: 1000,
    position:"relative",
    background: theme.custom.white[25]
  },
  arrowRight : {
    display: "flex",
    padding: "8px",
    width: "40px",
    height: "40px",
    top: "8px",
    background: "rgba(255,255,255,0.25)",
    borderRadius: "40px",
    marginLeft: "16px",
    zIndex: 1000
  },
  opener : {
    width: "24px",
    height: "100%",
    position:"absolute",
    background: "rgba(0,0,0,0)",
    borderRight : "rgba(88, 98, 125, 0.15) solid 1px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
  openerHover: {
    "&:hover" : {
      background:"rgba(0,0,0,0.15)",
    }
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: props.drawerWidth + "px",
  }
}));

interface Props {
  drawerOpen: boolean,
}



const LeftSideLayer = (props: Props) => {
  const {drawerOpen} = props;
  // const [drawerOpen, setDrawerOpen] = useState(false);
  const setDrawerWidth = (width: number) => updateDrawerWidth({ width });
  const activePageNo_store = useSelector((state: RootState) => state.activePage.activePageNo);
  
  const onDrawerResize = (size) => {
    setDrawerWidth(size);
  }

  const brZoom = useSelector((state: RootState) => state.ui.browser.zoom);
  const drawerWidth = useSelector((state: RootState) => state.ui.drawer.width);
  const classes = useStyle({brZoom:brZoom, drawerOpen:drawerOpen, drawerWidth:drawerWidth})()
  
  let disabled = true;
  
  if (activePageNo_store !== -1) {
    disabled = false;
  }



  /**
   * Drag And Drop Code
   */
  ///////////////////////////////////////////////

  const dragRef = useRef<HTMLDivElement | null >(null);
  const themes = useTheme<Theme>();

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, [])
  const handleDragOut = useCallback((e) => {
    console.log("Drag Out Layer")
    dragRef.current.style.background = themes.custom.white[25]
    dragRef.current.style.border = themes.palette.action.selected
    e.preventDefault();
    e.stopPropagation();
  }, [])
  const handleDragOver = useCallback((e) => {
    console.log("Drag Over Layer")
    dragRef.current.style.background = themes.custom.icon.blue[3]
    dragRef.current.style.border = "2px solid" + themes.palette.primary.main
    dragRef.current.style.zIndex = "1"
    e.preventDefault();
    e.stopPropagation();
  }, [])
  const handleDrop = useCallback((e) => {
    console.log("Drop to Layer")
    dragRef.current.style.background = themes.custom.white[25]
    dragRef.current.style.border = themes.palette.action.selected
    fileOpenHandler(e.dataTransfer.files)
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, [])
  const initDragEvents = useCallback(() => {
    if(dragRef.current !== null){
      dragRef.current.addEventListener("dragenter", handleDragIn);
      dragRef.current.addEventListener("dragleave", handleDragOut);
      dragRef.current.addEventListener("dragover", handleDragOver);
      dragRef.current.addEventListener("drop", handleDrop);
    }
  }, [handleDragIn, handleDragOut, handleDragOver, handleDrop])

  const resetDragEvents = useCallback(() => {
    if(dragRef.current !== null){
      dragRef.current.addEventListener("dragenter", handleDragIn);
      dragRef.current.addEventListener("dragleave", handleDragOut);
      dragRef.current.addEventListener("dragover", handleDragOver);
      dragRef.current.addEventListener("drop", handleDrop);
    }
  }, [handleDragIn, handleDragOut, handleDragOver, handleDrop])

  useEffect(() => {
    initDragEvents();
    return () => resetDragEvents();
  }, [initDragEvents, resetDragEvents])

  ////////////////////////////////////////////////////////////////
  
  return (
      <div className={classes.wrap} ref={dragRef}>
          <PersistentDrawerRight
            id="show"
            open={drawerOpen} onDrawerResize={onDrawerResize}
            noInfo = {true}
          />
      </div>
  );
}

export default LeftSideLayer;