import React, { useState } from 'react';
import { Button, makeStyles, ClickAwayListener, IconButton } from '@material-ui/core';
// import LoadGrida from "../Load/LoadGrida";
import ConvertFileLoad from '../Load/ConvertFileLoad';
import GridaDoc from '../GridaDoc';
import { PDFDocument } from 'pdf-lib';
import ConnectButton from '../components/buttons/ConnectButton';
import GridaApp from '../GridaApp';
// import ManualCalibration from "../components/navbar/ManualCalibration";
import { g_defaultPrintOption, PrintNcodedPdfButton } from 'nl-lib/ncodepod';
import SavePdfDialog from '../Save/SavePdfDialog';
// import { FileBrowserButton } from "nl-lib/common/neopdf";
import { IFileBrowserReturn } from 'nl-lib/common/structures';
import { useSelector } from 'react-redux';
import { RootState } from '../store/rootReducer';
import { turnOnGlobalKeyShortCut } from '../GlobalFunctions';
import getText from '../language/language';
import { CalibrationButton } from 'nl-lib/ncodepod';
import CustomBadge from '../components/CustomElement/CustomBadge';
import LogoSvg from '../logo.svg';
import TestButton from '../components/buttons/TestButton';
import { useHistory } from 'react-router';
import SimpleTooltip from '../components/SimpleTooltip';
import { KeyboardArrowDown } from '@material-ui/icons';
import { auth } from 'GridaBoard/util/firebase_config';
import ProfileButton from '../components/buttons/ProfileButton';
import { showAlert } from '../store/reducers/listReducer';
import { setSaveOpen } from '../store/reducers/ui';

const useStyles = props =>
  makeStyles(theme => ({
    dropdownBtn: {
      width: '200px',
      height: '40px',
      padding: '4px 12px',
      display: 'flex',
      justifyContent: 'left',
      '&:hover': {
        background: theme.custom.icon.blue[3],
        color: theme.palette.action.hover,
      },
    },
    buttonStyle: {
      padding: 0,
      minWidth: '0px',
      minHeight: '0px',
    },
    calibration: {
      background: theme.custom.white[50],
      border: '1px solid #CFCFCF',
      boxSizing: 'border-box',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'Roboto',
      padding: '8px',
      textTransform: 'none',
    },
    buttonFontStyle: {
      minWidth: '0px',
      fontFamily: 'Roboto',
      fontStyle: 'normal',
      fontWeight: 400,
      lineHeight: '16.41px',
      fontSize: '14px',
      textAlign: 'right',
      letterSpacing: '0.25px',
      color: '#666666',
      '&:hover': {
        color: theme.palette.action.hover,
        fontWeight: 700,
      },
    },
    saveDropdownStyle: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: '8px',
      position: 'absolute',
      background: theme.custom.icon.mono[4],
      boxShadow: theme.custom.shadows[0],
      borderRadius: '12px',
      zIndex: 10000,
      marginTop: '21px',
      marginLeft: '-1px',
    },
    headerButtons: {
      display: 'flex',
      flexDirection: 'column',
      flexFlow: 'column',
    },
    headerStyle: {
      display: 'flex',
      zIndex: 2,
      position: 'relative',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      height: '72px',
      zoom: 1 / props.brZoom,
      backdropFilter: 'blur(4px)',
      '& > div': {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        margin: '0 24px',
      },
      '& > div > div': {
        //캘리브 제외하고 전부
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        // alignItems: "center",
      },
      '& > div:first-child > div': {
        //앞에 애들 전부
        marginLeft: '24px',
        marginRight: '24px',
        padding: '10px',
      },
      '& > div:last-child > div': {
        //연결버튼 + 구버전버튼
        marginLeft: '16px',
      },
      '& > div > div > div': {
        display: 'flex',
        flexDirection: 'row',
      },
      '& > div > div > div:first-child': {
        //문서 제목
        fontWeight: 700,
        fontSize: '18px',
      },
      '& > div > div > div:last-child > div': {
        //파일 수정 보기 기타등등
        marginRight: '24px',
      },
    },
    headerLineV: {
      width: '1px',
      height: '15px',
      background: theme.custom.icon.mono[3],
    },
    changeUrlStyle: {
      justifyContent: 'center',
      background: theme.custom.white[50],
      border: '1px solid #CFCFCF',
      boxSizing: 'border-box',
      borderRadius: '4px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '3px',
      '& > span': {
        fontSize: '12px',
        lineHeight: '14px',
        padding: '5px',
        fontWeight: 500,
      },
    },
    imgStyle: {
      borderRadius: '8px',
    },
    badge: {
      background: theme.custom.icon.mono[1],
      color: theme.custom.icon.mono[4],
    },
  }));

const printBtnId = 'printTestButton';
const printOption = g_defaultPrintOption;

interface Props {
  handlePdfOpen: (event: IFileBrowserReturn) => void;
  handlePenLogWindow: () => void;
  hidden: boolean;
}

export function fileOpenHandler() {
  const input = document.querySelector('#fileForconvert') as HTMLInputElement;
  input.value = '';
  input.click();
}

const HeaderLayer = (props: Props) => {
  const { handlePdfOpen, ...rest } = props;

  const [pdfUrl, setPdfUrl] = useState(undefined as string);
  const [pdfFilename, setPdfFilename] = useState(undefined as string);

  const docName = useSelector((state: RootState) => state.docConfig.docName);


  const makePdfUrl = async () => {
    const doc = GridaDoc.getInstance();
    const docPages = doc.pages;
    let isPdfEdited = false;

    let pdfUrl,
      pdfDoc = undefined;

    for (const page of docPages) {
      if (page.pdf === undefined) {
        //ncode page일 경우
        isPdfEdited = true; //여긴 무조건 pdf를 새로 만들어야 하는 상황
        if (pdfDoc === undefined) {
          pdfDoc = await PDFDocument.create();
        }
        const pageWidth = page.pageOverview.sizePu.width;
        const pageHeight = page.pageOverview.sizePu.height;
        const pdfPage = await pdfDoc.addPage([pageWidth, pageHeight]);
        if (page._rotation === 90 || page._rotation === 270) {
          const tmpWidth = pdfPage.getWidth();
          pdfPage.setWidth(pdfPage.getHeight());
          pdfPage.setHeight(tmpWidth);
        }
      } else {
        //pdf인 경우
        if (pdfUrl !== page.pdf.url) {
          pdfUrl = page.pdf.url;
          const existingPdfBytes = await fetch(page.pdf.url).then(res => res.arrayBuffer());
          const pdfDocSrc = await PDFDocument.load(existingPdfBytes);
          page.pdf.removedPage.forEach(el => {
            pdfDocSrc.removePage(el);
          });
          /******************* pdfDoc에서 remove를 할경우
           * pageCache에 값이 변하지 않아서 아래 getPages에서 기존의 개수가 그대로 나온다.
           * pageCache는 원래 직접접근 하면 안되는 privite 이지만, 강제로 value를 업데이트 해준다
           * 직접 접근 이외의 방법으로 업데이트가 가능하거나(현재 못찾음)
           * pdf-lib가 업데이트 되어 필요없다면 삭제 필요
           */
          (pdfDocSrc as any).pageCache.value = (pdfDocSrc as any).pageCache.populate();

          if (pdfDoc !== undefined) {
            //ncode 페이지가 미리 생성돼서 그 뒤에다 붙여야하는 경우
            isPdfEdited = true; //여기 들어오면 pdf가 여러개든지 pdf가 편집된 상황이다.

            const srcLen = pdfDocSrc.getPages().length;
            const totalPageArr = [];
            for (let i = 0; i < srcLen; i++) {
              totalPageArr.push(i);
            }

            const copiedPages = await pdfDoc.copyPages(pdfDocSrc, totalPageArr);

            for (const copiedPage of copiedPages) {
              await pdfDoc.addPage(copiedPage);
            }
          } else {
            pdfDoc = pdfDocSrc;
          }
        } else {
          continue;
        }
      }
    }

    if (!isPdfEdited) {
      //pdf가 편집되지 않았으면 새로운 createObjectURL 할 필요 없음
      return pdfUrl;
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    const url = await URL.createObjectURL(blob);
    return url;
  };

  const onPenLinkChanged = e => {
    const app = GridaApp.getInstance();
    app.onPenLinkChanged(e);
  };

  const activePageNo_store = useSelector((state: RootState) => state.activePage.activePageNo);

  const brZoom = useSelector((state: RootState) => state.ui.browser.zoom);
  const badgeInVisible = !useSelector((state: RootState) => state.ui.shotcut.show);

  const classes = useStyles({ brZoom })();

  const HeaderLine = () => {
    return <div className={classes.headerLineV} />;
  };

  console.log(`browser zoom level changed = ${brZoom}`);

  let disabled = true;
  if (activePageNo_store !== -1) {
    disabled = false;
  }

  // const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const isSaveOpen = useSelector((state: RootState) => state.ui.simpleUiData.saveOpen);

  const handleClickSave = () => {
    setSaveOpen(true);
  };

  const handleClickExport = () => {
    setIsExportOpen(true);
  };

  const handleClickSaveAway = () => {
    setSaveOpen(false);
  };

  const handleClickExportAway = () => {
    setIsExportOpen(false);
  };

  const handlePenLogWindow = () => {
    props.handlePenLogWindow();
  };

  const toBoardList = async () => {
    showAlert({
      type: 'toBoardList',
      selected: null,
      sub: null,
    });
  };

  const [debugOpen, setDebugOpen] = useState(false);

  return (
    <React.Fragment>
      <div id="header" className={`${classes.headerStyle}`}>
        <div>
          <SimpleTooltip title={getText('gridaBoard_home')}>
            <IconButton>
              <img src={LogoSvg} className={classes.imgStyle} onClick={toBoardList}></img>
            </IconButton>
          </SimpleTooltip>
          <div>
            <div>{docName}</div> {/* & > div > div > div:first-child */}
            <div>
              {' '}
              {/* & > div > div > div:last-child */}
              <ClickAwayListener onClickAway={handleClickSaveAway}>
                <div>
                  <CustomBadge badgeContent={`S`}>
                    <Button
                      className={`${classes.buttonStyle} ${classes.buttonFontStyle}`}
                      onClick={handleClickSave}
                      disabled={disabled}>
                      {getText('save_file')}
                    </Button>
                  </CustomBadge>
                  {isSaveOpen ? (
                    <div className={`${classes.saveDropdownStyle}`}>
                      <SavePdfDialog saveType="saveAs" handleClickSaveAway={handleClickSaveAway} />
                      <SavePdfDialog saveType="overwrite" handleClickSaveAway={handleClickSaveAway} disabled={disabled}/>
                    </div>
                  ) : null}
                </div>
              </ClickAwayListener>
              <ClickAwayListener onClickAway={handleClickExportAway}>
                <div>
                  <Button
                    className={`${classes.buttonStyle} ${classes.buttonFontStyle}`}
                    onClick={handleClickExport}
                    disabled={disabled}>
                    {getText('export_file')}
                  </Button>
                  {isExportOpen ? (
                    <div className={`${classes.saveDropdownStyle}`}>
                      <SavePdfDialog saveType="pdf" handleClickSaveAway={handleClickExportAway} />
                      <SavePdfDialog saveType="grida" handleClickSaveAway={handleClickExportAway} />
                    </div>
                  ) : null}
                </div>
              </ClickAwayListener>
              <div>
                <CustomBadge badgeContent={`Ctrl-O`}>
                  <Button
                    className={`loadDropDown ${classes.buttonStyle} ${classes.buttonFontStyle}`}
                    onClick={fileOpenHandler}>
                    {getText('load_file')}
                    <ConvertFileLoad handlePdfOpen={handlePdfOpen} />
                  </Button>
                </CustomBadge>
              </div>
              <div>
                <CustomBadge badgeContent={`P`}>
                  <PrintNcodedPdfButton
                    id="prin tBtn"
                    className={` ${classes.buttonStyle}  ${classes.buttonFontStyle}`}
                    handkeTurnOnAppShortCutKey={turnOnGlobalKeyShortCut}
                    url={pdfUrl}
                    filename={pdfFilename}
                    handlePdfUrl={makePdfUrl}
                    disabled={disabled}
                  />
                </CustomBadge>
              </div>
              <div>
                <CalibrationButton
                  className={`${classes.buttonStyle}  ${classes.buttonFontStyle}`}
                  filename={pdfFilename}
                  handlePdfUrl={makePdfUrl}
                />
              </div>
            </div>
          </div>

          <div>
            <TestButton className={`${classes.buttonStyle}`} onClick={e => handlePenLogWindow()} hidden={props.hidden} />
          </div>
        </div>

        <div>
          <div>
            <ConnectButton className={`${classes.buttonStyle}`} onPenLinkChanged={e => onPenLinkChanged(e)} />
          </div>
          {/* <HeaderLine />
          
          <InformationBtn /> */}
          <HeaderLine />

          <ProfileButton />

          {/* <div>
            <Button href="https://gridaboard-v1-30576.web.app/" className={`${classes.buttonStyle} ${classes.changeUrlStyle}`}>
              {getText("go_to_old")}
            </Button>
          </div> */}
          {/* <div>구글 이메일</div>
          <KeyboardArrowDownRoundedIcon /> */}
        </div>
      </div>
      <div style={{ height: '1px', background: 'rgba(255,255,255,1)', zoom: 1 / brZoom }}></div>
    </React.Fragment>
  );
};

export default HeaderLayer;
