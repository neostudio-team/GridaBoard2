import React from 'react';
import '../../styles/main.css';
import Tooltip, { TooltipProps } from '@material-ui/core/Tooltip';
import { Box, InputBase, Theme, Typography, withStyles } from '@material-ui/core';
import GridaToolTip from '../../styles/GridaToolTip';
import Button from '@material-ui/core/Button';
import Pagination from '@material-ui/lab/Pagination';
import GridaDoc from '../../GridaBoard/GridaDoc';
import { InkStorage } from '../../nl-lib/common/penstorage';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { setActivePageNo } from '../../store/reducers/activePageReducer';
import { RootState } from '../../store/rootReducer';
import { connect, useSelector } from "react-redux";
import { makeNPageIdStr } from '../../nl-lib/common/util';
// import { State } from '@popperjs/core';

interface Props {
  numPages?: number,
  drawerWidth?: number,

  renderCount?: number,

  onSelectPage?: (pageNo: number) => void,

  activePageNo?: number,
  noInfo?: boolean,
  // pageNo: number
}

interface State {
  name: string;
}

const inputStyle = {
  padding: "0px",
  margin: "0px",
  border: "0px",
  minWidth: "24px",
  fontSize: "14px"
}

const buttonStyle = {
  minWidth: "36px",
  padding: "0px"
}

const pageStyle = {
  outline: 0,
  border: 0
} as React.CSSProperties;

class PageNumbering extends React.Component<Props, State> {
  
  render() {
    const { numPages, drawerWidth } = this.props;
    // const pn = this.props.pageNo;


    if (numPages < 1) return null;

    const doc = GridaDoc.getInstance();
    const pages = doc.pages;
    const inkStorage = InkStorage.getInstance();

    // const [page, setPage] = React.useState();
    // const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    //   setPage(value);
    // }
    // let pdfPageNo = 1;
    // let pdf = undefined;

    // const activePageNo = useSelector((state: RootState) => state.activePage.activePageNo);

    // const page = doc.getPageAt(pn)
    // if (activePageNo >= 0) {
    //   // pdfUrl = doc.getPdfUrlAt(pn);
    //   // pdfFilename = doc.getPdfFilenameAt(pn);
    //   // pdfFingerprint = doc.getPdfFingerprintAt(pn);
    //   pdfPageNo = doc.getPdfPageNoAt(pn);
    //   pdf = page.pdf;
    // }

    const handleMouseDown = e => {
      console.log('handle');
      const idToken = e.target.id.split('-');
      const pageNo = Number(idToken[2]); // pageNo 에 NaN이 들어감
      setActivePageNo(pageNo);
    };

    return (
      // <div className="navbar-menu d-flex justify-content-center align-items-center neo_shadow">
      <React.Fragment>
        <Box style={{ margin: 10 }}>
          <h5>index:{this.props.activePageNo} (#{this.props.activePageNo + 1}/{numPages})</h5>
        </Box>
        {/* {pages.map((page, i) => */}
        <Pagination count={numPages} color="secondary" className="btn btn-neo" style={pageStyle} 
        // key={i} 
        onMouseDown={e => handleMouseDown(e)}  />
        {/* )}  */}
        {/* <div id={`thumbnail-pageInfo-${pn}`} style={{ position: "absolute", margin: 0, padding: 0, right: 0, left: 0, top: 0, height: "100%", zIndex: 999 }}>
          {!this.props.noInfo
            ? <Typography style={{ color: "#f00" }}> {makeNPageIdStr(page.pageInfos[0])}</Typography>
            : <Typography style={{ color: "rgba(0,0,0,255)" }}> {makeNPageIdStr(page.pageInfos[0])}</Typography>
          }
        </div> */}
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state: RootState) => ({
  numPages: state.activePage.numDocPages,
  drawerWidth: state.ui.drawer.width,
  renderCount: state.activePage.renderCount,
  activePageNo: state.activePage.activePageNo,

});

export default connect(mapStateToProps)(PageNumbering);