import { Button, ClickAwayListener, Grow, makeStyles, MenuItem, MenuList, Paper, Popper, SvgIcon } from '@material-ui/core';
import React, { useState } from 'react';
import getText from 'GridaBoard/language/language';
import { ArrowDropDown, Add } from '@material-ui/icons';
import { useHistory } from 'react-router';
import GridaDoc from '../../../../GridaBoard/GridaDoc';
import { resetGridaBoard, startNewGridaPage } from '../../../BoardListPageFunc';
import { IFileBrowserReturn, IPageSOBP } from '../../../../nl-lib/common/structures';
import ConvertFileLoad from '../../../../GridaBoard/Load/ConvertFileLoad';

const menuStyle = makeStyles(theme => ({
  headerButton: {
    width: '137px',
    height: '40px',
    backgroundColor: theme.palette.primary.main,
    borderRadius: '28px',
    alignItems: 'center',
    '& > button': {
      textTransform: 'initial',
      borderRadius: '60px',
      padding: 0,
      height: '100%',
      borderRight: 'initial !important',
      '&:first-child': {
        width: '90px',
        '& > span > svg': {
          marginRight: '10px',
        },
      },
      '&:last-child': {
        width: '46px',
        paddingright: '6px',
      },
    },
  },
  ButtonBorder : {
    border: "1px solid " + theme.custom.icon.mono[0],
  },
  headerButtonLiner: {
    width: '1px',
    minWidth: '1px',
    minHeight: '1px',
    height: '16px',
    background: theme.custom.white[25],
    borderRadius: '28px !important',
    borderRight: '0px !important',
  },

  buttonStyle: {
    padding: 0,
    minWidth: '0px',
    minHeight: '0px',
  },
  buttonFontStyle: {
    minWidth: '0px',
    fontFamily: 'Roboto',
    fontStyle: 'normal',
    fontWeight: 600,
    lineHeight: '16.41px',
    fontSize: '14px',
    textAlign: 'right',
    letterSpacing: '0.25px',
    color: theme.palette.text.primary,
    '&:hover': {
      color: theme.palette.action.hover,
      fontWeight: 700,
    },
  },
  dropper : {
    marginTop: "8px",
    "& > div" : {
      borderRadius: '12px',
      width: "240px",
      padding: "8px",
      " & > ul":{
        padding: "0px !important",
        "& > li" : {
          height: "40px",
          padding: "8px 12px",
          borderRadius: "8px",
          fontFamily: "Roboto",
          fontStyle: "normal",
          fontWeight: "normal",
          fontSize: "14px",
          lineHeight: "16px",
          letterSpacing: "0.25px",
          "& > svg" : {
            marginRight: "8px",
            color : theme.custom.grey[4]
          }
        },
        "& > li:hover" : {
          fontWeight: "bold",
          background: theme.custom.icon.blue[3],
          color: theme.palette.primary.main,
          "& > svg" : {
            color: theme.palette.primary.main,
          }
        }
      }
    }
  }
}));
const MainNewButton = () => {
  const [open, setOpen] = useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const options = [getText('create_new_board'), getText('import_pdf_pptx')];
  const classes = menuStyle();
  const history = useHistory();

  const handlePdfOpen = async (event: IFileBrowserReturn, pageInfo?: IPageSOBP, basePageInfo?: IPageSOBP) => {
    console.log(event.url);
    if (event.result === 'success') {
      const doc = GridaDoc.getInstance();
      doc._pdfd = [];
      await doc.openPdfFile({ url: event.url, filename: event.file.name }, pageInfo, basePageInfo);
    } else if (event.result === 'canceled') {
      alert(getText('alert_fileOpenCancel'));
    }
  };

  const fileOpenHandler = () => {
    resetGridaBoard();

    const input = document.querySelector('#fileForconvert') as HTMLInputElement;
    input.value = '';
    input.click();
  };

  const startGrida = async () => {
    await startNewGridaPage();

    //이거 하면 contents layer의 useEffect부터 불리고 거기서 이전 activePageNo로 로직이 수행돼서 에러나니까 페이지 바뀌기 전에 activePageNo을 미리 바꿔줘야함
    const path = `/app`;
    history.push(path);

    setOpen(false);
  };

  const handleToggle = () => {
    setOpen(prevOpen => !prevOpen);
  };

  const handleClose = (event: React.MouseEvent<Document, MouseEvent>) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };


  return (
    <React.Fragment>
      <div ref={anchorRef}>
        <Button className={`${classes.headerButton} ${open? classes.ButtonBorder : ""}`} variant="contained" color="primary" onClick={handleToggle}>
          <div style={{ marginRight: '15px' }}>{<Add />}</div>
          <div style={{ marginRight: '16px' }}>{getText('word_New')}</div>
          <div className={classes.headerButtonLiner} style={{ marginRight: '5px' }} />
          <ArrowDropDown />
        </Button>
      </div>
      <Popper className={classes.dropper} open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal style={{ zIndex: 10 }} placement="bottom-end">
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList>
                  {/* map으로 돌릴 경우 onClick에 모든 index가 한번씩 들어옴 */}
                  <MenuItem onClick={startGrida}>
                    <SvgIcon viewBox='-4 -2 24 24'>
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M14 8V18H2V2H8V8H14ZM16 6V8V18C16 19.1046 15.1046 20 14 20H2C0.895431 20 0 19.1046 0 18V2C0 0.895431 0.895431 0 2 0H8H10L16 6ZM10 2.82843L13.1716 6H10V2.82843Z"
                        />
                    </SvgIcon>
                    <span style={{ marginLeft: '8px' }}>{options[0]}</span>
                  </MenuItem>
                  <MenuItem onClick={fileOpenHandler}>
                    <SvgIcon viewBox='-3 -4 24 24'>
                      <path
                        d="M12 8L8 4V7H0V9H8V12L12 8ZM18 14V2C18 1.46957 17.7893 0.960859 17.4142 0.585786C17.0391 0.210714 16.5304 0 16 0H4C3.46957 0 2.96086 0.210714 2.58579 0.585786C2.21071 0.960859 2 1.46957 2 2V5H4V2H16V14H4V11H2V14C2 14.5304 2.21071 15.0391 2.58579 15.4142C2.96086 15.7893 3.46957 16 4 16H16C16.5304 16 17.0391 15.7893 17.4142 15.4142C17.7893 15.0391 18 14.5304 18 14Z"
                      />
                    </SvgIcon>
                    <span style={{ marginLeft: '9px' }}>{options[1]}</span>
                    <ConvertFileLoad handlePdfOpen={handlePdfOpen} isNewLoad={true}/>
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
};

export default MainNewButton;
