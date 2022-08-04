import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress } from '@material-ui/core';
import { useSelector, useDispatch } from 'react-redux';

import "./pen_touch.css";

import { theme } from 'GridaBoard//styles/theme';
import { RootState } from 'GridaBoard//store/rootReducer';
import { hideCalibrationDialog, showCalibrationDialog, updateCalibrationDialog, setCalibrationMode } from 'GridaBoard//store/reducers/calibrationReducer';
import { IPageSOBP, IPoint, IPrintOption } from 'nl-lib/common/structures';
import { NeoPdfDocument, NeoPdfManager } from 'nl-lib/common/neopdf';
import CalibrationData from 'nl-lib/common/mapper/Calibration/CalibrationData';
import { MappingStorage } from 'nl-lib/common/mapper/MappingStorage';
import { isSamePage, makeNPageIdStr } from "nl-lib/common/util";
import { g_defaultPrintOption } from "nl-lib/ncodepod";
import GridaApp from "GridaBoard//GridaApp";
import ConnectButton from "GridaBoard//components/buttons/ConnectButton";
import getText from "GridaBoard//language/language";
import GridaDoc from 'GridaBoard/GridaDoc';
import { isWhiteBoard } from '../../../common/noteserver';
import { setMappingState } from 'GridaBoard/store/reducers/appConfigReducer';
import { store } from 'GridaBoard/client/pages/GridaBoard';
import { showAlert } from 'GridaBoard/store/reducers/listReducer';
import { firebaseAnalytics } from 'GridaBoard/util/firebase_config';

const _penImageUrl = "/icons/image_calibration.png";

const useStyles = makeStyles({
  root: {
    width: '100%',
  },
});

interface IDialogProps {
  filename: string,
  cancelCallback?: (e) => void,
}

const imgWidth = 400;
const imgHeight = 400;
const imgDensity = 2;

const nu = { p0: {x: 0, y: 0} as IPoint, p2: {x: 0, y: 0} as IPoint };
const pu = { p0: {x: 0, y: 0} as IPoint, p2: {x: 0, y: 0} as IPoint };
let pageInfos: IPageSOBP[] = [];

let AlertGuideTitle = "";
let AlertGuideText = "";

const CalibrationDialog = (props: IDialogProps) => {
  const classes = useStyles();
  const [pdf, setPdf] = useState(undefined as NeoPdfDocument);
  const [numPages, setNumPages] = useState(0);
  const [markPosRatio, setMarkPosRatio] = useState({ xr: 0, yr: 0 });
  const [imgSrc, setImgSrc] = useState("//:0");
  const [status, setStatus] = useState("inited");
  const [openAlert, setOpenAlert] = React.useState(false);

  let pageNo = 0;
  let numProgresses = numPages + 1;

  const {calibrationData} = useSelector((state: RootState) => ({
    calibrationData: state.calibrationDataReducer.calibrationData
  }));

  const progress = useSelector((state: RootState) => state.calibration.progress);
  const targetPages = useSelector((state: RootState) => state.calibration.targetPages);

  const url = useSelector((state: RootState) => state.calibration.url);

  const show = useSelector((state: RootState) => state.calibration.show);

  const percent = Math.ceil(progress / numProgresses * 100);
  const imageRef = useRef(null);
  const dialogRef = useRef(null);

  const onPenLinkChanged = e => {
    const app = GridaApp.getInstance();
    app.onPenLinkChanged(e);
  }

  const initState = () => {
    setPdf(undefined);
    setNumPages(0);
    setMarkPosRatio({ xr: 0, yr: 0 });
    setImgSrc("//:0");
    setStatus("inited");
    pageInfos = [];
  }

  const handleOpenAlert = () => {
    setOpenAlert(true);
  };

  const handleCloseAlert = () => {
    setOpenAlert(false);
  };

  const handleClose = (e) => {
    initState();
    hideCalibrationDialog();
  }

  const handleCancel = (e) => {
    hideCalibrationDialog();

    if (props.cancelCallback) {
      props.cancelCallback(e);
    }
  }

  const handlePrevious = (e) => {
    const nextProgress = progress > 0 ? progress - 1 : 0;
    updateCalibrationDialog(nextProgress);
  }

  const handleNext = (e) => {
    const nextProgress = progress < numPages ? progress + 1 : numPages;
    updateCalibrationDialog(nextProgress);
  }

  useEffect(() => {
    if (pdf && targetPages.length > 0) {
      const w = imgWidth * imgDensity;
      const h = imgHeight * imgDensity;
      const markPos = progress < 2 ? progress : 2;
      if (pageNo <= targetPages.length) {
        pdf.getPageThumbnailUrl(pageNo, w, h, "rgb(220,220,220)", true, markPos).then(thumbnail => { //pageNo은 1부터 시작
          setImgSrc(thumbnail.url);
          setMarkPosRatio({ xr: thumbnail.markPos.x / thumbnail.canvas.w, yr: thumbnail.markPos.y / thumbnail.canvas.h });
        });
      }
    }
  }, [progress, status]);


  useEffect(() => {
    if (show) {
      setCalibrationMode(true);
      NeoPdfManager.getInstance().getDocument({
        url: url,
        filename: props.filename,
        purpose: "to be used by CalibrationDialog"
      }).then(loadedPdf => {
        if (loadedPdf) {
          const w = imgWidth * imgDensity;
          const h = imgHeight * imgDensity;
          // loadedPdf.generatePageThumbnails(w, h, "rgb(220,220,220)", true).then(() => {
          setPdf(loadedPdf);
          const t = Array.from({ length: targetPages.length }, (_, i) => i + 1);
          console.log(`calibration: pdf loaded, pages=${t}`)
          setNumPages(t.length);

          updateCalibrationDialog(0);
          setStatus("progress");
          // })
        }
      });
    }
    else {
      initState();
      setCalibrationMode(false);
    }
  }, [show]);

  useEffect(() => {
    if (!(calibrationData.section === -1 && calibrationData.owner === -1 && calibrationData.page === -1 && calibrationData.book === -1)) {
      if (pdf === undefined) {
        return;
      }
      const calibratedPageInfo: IPageSOBP = {
        section: calibrationData.section,
        book: calibrationData.book,
        owner: calibrationData.owner,
        page: calibrationData.page
      };

      let duplicated = false;
      let notSamePageForFirstPage = false;

      pageInfos.forEach((pageInfo) => {
        if (progress === 1) {
          if (!isSamePage(pageInfo, calibratedPageInfo)) {
            notSamePageForFirstPage = true;
            AlertGuideTitle = getText("print_reg_not_samePage");
            AlertGuideText = getText("print_reg_not_samePage_explain");
          }
        }
        if (progress > 1 && isSamePage(pageInfo, calibratedPageInfo)) {
          duplicated = true;
          AlertGuideTitle = getText("print_reg_pageNo_popup_alert_title");
          AlertGuideText = getText("print_reg_pageNo_popup_alert_expalin");
        }
      });

      if (duplicated || notSamePageForFirstPage) {
        handleOpenAlert();
        updateCalibrationDialog(progress);
        return;
      }

      const filename = 'pdf_file_name';
      const pageSize = pdf.getPageSize(pageNo);

      switch (progress) {
        case 0: {
          firebaseAnalytics.logEvent('start_calibration', {
            event_name: 'start_calibration',
            item_id: `${calibrationData.section}_${calibrationData.owner}_${calibrationData.book}`
          });

          nu.p0.x = calibrationData.nu.x;
          nu.p0.y = calibrationData.nu.y;

          pu.p0.x = pageSize.width * 0.1;
          pu.p0.y = pageSize.height * 0.1

          if (isWhiteBoard(calibratedPageInfo)) {
            pu.p0.x = 5 * 72 / 2.54; //왼쪽 위에서 5cm 지점
            pu.p0.y = 5 * 72 / 2.54; 
          }

          pageInfos.push(calibratedPageInfo);
          break;
        }
        case 1: {
          nu.p2.x = calibrationData.nu.x;
          nu.p2.y = calibrationData.nu.y;

          pu.p2.x = pageSize.width * 0.9;
          pu.p2.y = pageSize.height * 0.9;

          if (isWhiteBoard(calibratedPageInfo)) {
            pu.p2.x = pageSize.width - 5 * 72 /2.54; //오른쪽 아래에서 5cm 지점
            pu.p2.y = pageSize.height - 5 * 72 /2.54; 
          }

          break;
        }
        default: {
          pageInfos.push(calibratedPageInfo);
          break;
        } //default end
      } //switch end

      if (progress === numPages) {
        const pdfPagesDesc = {
          url: pdf.url,
          filename: pdf.filename,
          fingerprint: pdf.fingerprint,
          id: pdf.fingerprint + '/1',
          numPages: numPages,
          pageNo: pageNo,
          //이 pageNo은 인쇄할 시 정해진 페이지 수에 따라 생성된 pdf document의 pageNo
          //4장중 2장만 인쇄했다면 2장을 전체로 하는 pageNo인데 지금은 마지막 pageNo만 넘어가고 있어서 의미가 없는듯하다
        }

        const worker = new CalibrationData();
        const mapper = worker.createDocMapperItemOneStep(
          nu, pu, pageInfos, pdfPagesDesc, pdfPagesDesc.filename, numPages, 1, targetPages
        ); 

        const msi = MappingStorage.getInstance();
        msi.registerTemporary(mapper);
        setMappingState("calibrated");

        hideCalibrationDialog();
      }

      updateCalibrationDialog(progress+1);
    } //if end
  }, [calibrationData]);

  useEffect(() => {
    if (pdf) {
      console.log("calibration: pdf loaded");
    }
  }, [pdf]);

  if (!pdf) return (<></>);

  if (pdf && targetPages.length > 0) {
    pageNo = progress > 1 ? progress : 1;
    numProgresses = targetPages.length + 1;
  }

  let x = 2, y = -13;
  if (imageRef.current) {
    const rectDlg = dialogRef.current.getBoundingClientRect();
    const rectImg = imageRef.current.getBoundingClientRect();
    x += rectImg.left - rectDlg.left;
    y += rectImg.top - rectDlg.top;

    x += markPosRatio.xr * imgWidth;
    y += markPosRatio.yr * imgHeight;
  }

  console.log(`[position] x=${x}, y=${y}`)

  const open = show && (pdf !== undefined);
  console.log(`testing: render  imgSrc=${imgSrc.length}`);

  const { filename: propsFilename, cancelCallback: propsCancelCallback, ...rest } = props;

  let calibrationGuide = "";
  switch (progress) {
    case 0: {
      calibrationGuide = getText("print_reg_pageNo_popup_explain1");
      break;
    }
    case 1: {
      calibrationGuide = getText("print_reg_pageNo_popup_explain2");
      break;
    }
    default : {
      calibrationGuide = getText("print_reg_pageNo_popup_success");
      break;
    }
  }

  return (
    <React.Fragment>
      { imgSrc.length > 4 ?
        <Dialog open={open} {...rest} onClose={handleClose}>
          <img className={"pentouch_anim"} style={{ width: "60px", height: "70px", position: "absolute", left: x, top: y }} src={_penImageUrl} />

          <DialogTitle id="form-dialog-title" style={{ float: "left", width: "500px" }}>
            <Box fontSize={20} fontWeight="fontWeightBold" >
              {pageNo !== undefined ? getText("print_reg_pageNo_popup_title").replace("%d", pageNo.toString()) : ""}
              {/* /{numPages} (Step: {progress + 1}/{numProgresses}) */}
            </Box>
          </DialogTitle>

          <DialogContent ref={dialogRef}>
            <Box component="div" className={classes.root}>
              <Box fontSize={16} fontWeight="fontWeightRegular" >{calibrationGuide}</Box>
              <br/>
            </Box>

            {/* 가이드에 없음 */}
            {/* <Box component="div" className={classes.root}>
              <Box fontSize={16} fontWeight="fontWeightRegular" >Processing... {percent}%</Box>
            </Box> */}

            <Box component="div" className={classes.root} style={{ display: "flex", justifyContent: "center" }}>
              <Box borderColor={theme.palette.primary.main} border={1}>
                <img src={imgSrc} style={{ width: imgWidth + "px", height: imgHeight + "px" }} ref={imageRef} />
              </Box>
            </Box>
            <br/>
            <Box component="div" className={classes.root}>
              <Box fontSize={16} fontWeight="fontWeightRegular" >{getText("print_reg_pageNo_popup_warn")}</Box>
            </Box>
          </DialogContent>

          <DialogActions>
            {/* <Button onClick={handlePrevious} color="primary">
              Previous
            </Button>
            <Button onClick={handleNext} color="primary">
              Next
            </Button> */}
            {/* <Button onClick={handleCancel} color="primary">
              Cancel
            </Button> */}
            <ConnectButton onPenLinkChanged={e => onPenLinkChanged(e)} />
          </DialogActions>
        </Dialog>
        : ""
      }

      <Dialog
        open={openAlert}
        onClose={handleCloseAlert}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{AlertGuideTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {AlertGuideText}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAlert} color="primary" autoFocus>
            {getText("print_reg_pageNo_popup_exit")}
          </Button>
        </DialogActions>
      </Dialog>

    </React.Fragment>
  );
}

interface Props extends ButtonProps {
  filename: string,
  handlePdfUrl: any,
  cancelCallback?: (e) => void,
}

export default function CalibrationButton(props: Props) {
  const { handlePdfUrl, ...rest } = props;
  const printOption = g_defaultPrintOption;

  const startCalibration = async (e) => {
    const new_url = await handlePdfUrl();

    const numPages = GridaDoc.getInstance().numPages;
    const targetPages = Array.from({ length: numPages }, (_, i) => i + 1);

    const mappingState = store.getState().appConfig.mappingState;
    switch (mappingState) {
      case "printed": 
      case "calibrated": {
        showAlert({
          type: 'checkCalibration',
          selected: null,
          sub: null,
        });
        break;
      }
      default: {
        if (new_url) {
          const option = {
            url: new_url,
            show: true,
            targetPages: targetPages,
            progress: 0,
            calibrationMode: true,
          };
    
          showCalibrationDialog(option);
        }
        break;
      }
    }


  }

  const activePageNo_store = useSelector((state: RootState) => state.activePage.activePageNo);
  let disabled = true;
  if (activePageNo_store !== -1) {
    disabled = false;
  }

  return (
    <React.Fragment>
      <Button {...rest} onClick={startCalibration} disabled={disabled} >
        {getText("print_reg_pageNo")}
      </Button>
      <CalibrationDialog {...props} />
      {/* { new_url ? <CalibrationDialog {...props, url = new_url} /> : ""} */}
    </React.Fragment>
  );
}