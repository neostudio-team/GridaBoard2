import React, { useState } from 'react';
import { Button, ClickAwayListener, Grow, makeStyles, MenuItem, MenuList, Paper, Popper } from '@material-ui/core';
import { KeyboardArrowDown } from "@material-ui/icons";
import { useHistory } from 'react-router-dom';
import { showAlert } from '../../store/reducers/listReducer';
import getText from 'GridaBoard/language/language';
import UserInfo from "../CustomElement/UserInfo"
import Cookies from 'universal-cookie';

const useStyle = makeStyles(theme=>({
  menuItem: {
    minWidth: '180px',
    justifyContent: 'center',
    "&:hover": {
      background: theme.custom.icon.blue[3],
      color : theme.palette.primary.main
    },
  },
}))

const ProfileButton = () => {
  const [open, setOpen] = useState(false);
  const history = useHistory();

  const classes = useStyle();
  const anchorRef = React.useRef<HTMLDivElement>(null);
  
  const cookies = new Cookies();
  const userId = cookies.get("user_email");

  // let userId = "";
  // if (auth.currentUser !== null) {
  //   userId = auth.currentUser.email;
  // }

  const handleClose = (event: React.MouseEvent<Document, MouseEvent>) => {
    console.log("!!!!!!!!!!");
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };

  const handleToggle = () => {
    setOpen(prevOpen => !prevOpen);
  };
  

  return (
    <div>
        <div ref={anchorRef} onClick={handleToggle}>
          <Button style={{textTransform: 'none'}}>
            {userId}
            <KeyboardArrowDown/>
          </Button>
        </div>
      <ClickAwayListener onClickAway={handleClose}>
        <Popper open={open} anchorEl={anchorRef.current} role={undefined} placement={'bottom-end'} transition disablePortal >
          {({ TransitionProps }) => (
            <Grow
              {...TransitionProps}>
                <UserInfo />
                {/* <MenuList>
                  <MenuItem className={classes.menuItem} >
                    <div>{getText('profile_logout')}</div>
                  </MenuItem>
                </MenuList> */}
            </Grow>
            )}
          </Popper>
      </ClickAwayListener>
    </div>
  );
}

export default ProfileButton;