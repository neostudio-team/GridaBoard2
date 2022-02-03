import { Button, ClickAwayListener, Grow, makeStyles, MenuItem, MenuList, Paper, Popper } from '@material-ui/core';
import React, { useState } from 'react';
import getText from 'GridaBoard/language/language';
 import { ArrowDropDown, Add } from '@material-ui/icons';
import GridaDoc, { addBlankPage } from 'GridaBoard/GridaDoc';
import { IFileBrowserReturn, IPageSOBP } from 'nl-lib/common/structures';
import ConvertFileLoad from 'GridaBoard/Load/ConvertFileLoad';
import { scrollToThumbnail } from '../../../nl-lib/common/util';
import { setActivePageNo } from '../../store/reducers/activePageReducer';
import { firebaseAnalytics } from '../../util/firebase_config';
import CustomBadge from '../CustomElement/CustomBadge';

const menuStyle = makeStyles(theme => ({
  headerButton: {
    width: '73px',
    height: '40px',
    marginLeft: '24px',
    borderRadius: '4px',
    borderColor: theme.custom.icon.mono[2],
    borderWidth: '1px',
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
  headerButtonLiner: {
    width: '1px',
    minWidth: '1px',
    minHeight: '1px',
    height: '15px',
    background: theme.custom.grey[1],
    borderRadius: '4px !important',
    borderRight: '0px !important',
  },
  menuItem: {
  },
}));

const BoardNewButton = () => {
  const [open, setOpen] = useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const options = [getText('add_page'), getText('add_pdf_pptx')];
  const classes = menuStyle();

  const handlePdfOpen = async (event: IFileBrowserReturn, pageInfo?: IPageSOBP, basePageInfo?: IPageSOBP) => {
    console.log(event.url);
    if (event.result === 'success') {
      const doc = GridaDoc.getInstance();
      await doc.openPdfFile({ url: event.url, filename: event.file.name }, pageInfo, basePageInfo);
    } else if (event.result === 'canceled') {
      alert(getText('alert_fileOpenCancel'));
    }
  };

  const fileOpenHandler = () => {
    const input = document.querySelector('#fileForconvert') as HTMLInputElement;
    input.value = '';
    input.click();
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

  const addBlankPageAndSub = async (event) => {
    const pageNo = await addBlankPage();
    scrollToThumbnail(pageNo);
    setOpen(false);

    firebaseAnalytics.logEvent('new_page', {
      event_name: 'new_page'
    });
  }

  return (
    <React.Fragment>
      <div ref={anchorRef}>
        <CustomBadge badgeContent={`Shift-N`}>
          <Button className={classes.headerButton} variant="outlined" onClick={handleToggle}>
            <div style={{ marginLeft: '13px' }}>{<Add />}</div>
            <div className={classes.headerButtonLiner} style={{margin: '3px'}} />
            <div style={{ marginRight: "15px"}}><ArrowDropDown /></div>
          </Button>
        </CustomBadge>
      </div>
      <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal style={{ zIndex: 10, width: 500 }}>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
              borderRadius: '12px',
              height: '96px',
              width: '240px',
              marginLeft: '20px',
              marginTop: '5px'
            }}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList>
                  {/* map으로 돌릴 경우 onClick에 모든 index가 한번씩 들어옴 */}
                  <MenuItem className={classes.menuItem} onClick={addBlankPageAndSub}>
                    <span style={{ marginLeft: '10px' }}>{options[0]}</span>
                  </MenuItem>
                  <MenuItem className={classes.menuItem} onClick={fileOpenHandler}>
                    <span style={{ marginLeft: '10px' }}>{options[1]}</span>
                    <ConvertFileLoad handlePdfOpen={handlePdfOpen} />
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

export default BoardNewButton;
