import React, { useState, useRef } from "react";
import { PLAYSTATE, MixedPageView } from "../neosmartpen";
import { IconButton, makeStyles, createStyles, CssBaseline, Typography, Fade, Paper, Grow } from "@material-ui/core";
import '../styles/main.css'
import PUIController from '../components/PUIController';
import { Theme } from '@material-ui/core';
import clsx from 'clsx';
import { useSelector } from "react-redux";
import { turnOnGlobalKeyShortCut } from "../GridaBoard/GlobalFunctions";
import PersistentDrawerRight, { g_drawerWidth } from "./PersistentDrawerRight";
import MenuIcon from '@material-ui/icons/Menu';
import ButtonLayer from "./ButtonLayer";
import { g_hiddenFileInputBtnId, onFileInputChanged, onFileInputClicked } from "../NcodePrintLib/NeoPdf/FileBrowser";
import { theme } from "../styles/theme";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex"
    },

    hide: {
      display: 'none',
    },
  }),
);



const Home = () => {
  const pageRef: React.RefObject<MixedPageView> = useRef();
  const [num_pens, setNumPens] = useState(0);
  const [pens, setPens] = useState(new Array(0));
  const [isRotate, setRotate] = useState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(g_drawerWidth);
  const [rightMargin, setRightMargin] = useState(0);


  const pdfUrl = useSelector((state) => {
    console.log(state.pdfInfo);
    return state.pdfInfo.url;
  });
  const pdfFilename = useSelector((state) => {
    console.log(state.pdfInfo);
    return state.pdfInfo.filename;
  });



  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const onDrawerResize = (width) => {
    setDrawerWidth(width);
  }

  const classes = useStyles();
  console.log(g_drawerWidth);



  //https://css-tricks.com/controlling-css-animations-transitions-javascript/

  let mainStyle = {
    flexGrow: 1,
    // padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginRight: 0,
  };

  if (drawerOpen) {
    mainStyle = {
      flexGrow: 1,
      // padding: theme.spacing(3),
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginRight: g_drawerWidth,
    }
  }

  const aaa = (e) => {
    console.log(e);

  }

  return (
    <div className={classes.root}>
      {/* <CssBaseline /> */}
      <main style={mainStyle} onAnimationEnd={aaa} onAnimationEndCapture={aaa} onAnimationStart={aaa}>
        <div style={{ position: "absolute", top: 0, left: 0 }}>
          <nav id="uppernav" className="navbar navbar-light bg-transparent" style={{ float: "left", zIndex: 3 }}>
            <a id="grida_board" className="navbar-brand" href="#">Grida board
          <small id="neo_smartpen" className="text-muted">
                <span data-l10n-id="by_neosmart_pen"> by Neo smartpen </span>
              </small>
            </a>
          </nav>
        </div>

        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: drawerOpen ? g_drawerWidth : 0 }}>
          <ButtonLayer />
        </div>

        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: drawerOpen ? g_drawerWidth : 0 }}>
          <MixedPageView pdfUrl={pdfUrl} filename={pdfFilename} pageNo={1} scale={1} playState={PLAYSTATE.live} pens={pens} ref={pageRef} rotation={0} />
        </div>
      </main >

      {/* Drawer 구현 */}
      <div id="drawer-icon"
        style={{ position: "absolute", right: 10, top: 0, zIndex: 4 }}
      >
        <IconButton
          style={{ position: "absolute", right: 10, top: 0, zIndex: 4 }}
          color="inherit"
          aria-label="open drawer"
          edge="end"
          onClick={handleDrawerOpen}
        // className={clsx(drawerOpen && classes.hide)}
        >
          <MenuIcon />
        </IconButton>
        <PersistentDrawerRight open={drawerOpen} handleDrawerClose={handleDrawerClose} onDrawerResize={onDrawerResize} />
      </div>
      <input type="file" id={g_hiddenFileInputBtnId} onChange={onFileInputChanged} onClick={onFileInputClicked} style={{ display: "none" }} name="pdf" accept="application/pdf" />
      <input type="file" id={"pdf_file_append"} onChange={onFileInputChanged} onClick={onFileInputClicked} style={{ display: "none" }} name="pdf" accept="application/pdf" />
    </div >
  );
};


// const mapStateToProps = (state) => {
//   const ret = {
//     fil: state.pdfInfo.filename,
//   };
//   return ret;
// };

// const mapDispatchToProps = (dispatch) => ({
//   increment: () => dispatch(incrementAction()),
//   decrement: () => dispatch(decrementAction())
// });


// export default connect(mapStateToProps)(Home);



declare global {
  interface Window {
    _pui: any;
  }
}

(function (window) {
  const pui = new PUIController('./3_1013_1116_Grida.nproj');

  window._pui = [];
  window._pui.push(pui);
  console.log(window._pui);

  turnOnGlobalKeyShortCut(true);

})(window);


export default Home;
