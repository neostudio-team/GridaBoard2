import { Button, makeStyles } from '@material-ui/core';
import React from 'react';
import { useDispatch } from 'react-redux';
import { forceUpdateBoardList } from '../../../../GridaBoard/store/reducers/appConfigReducer';
import { deleteAllFromTrash } from '../../../BoardListPageFunc';
import getText from 'GridaBoard/language/language';
import { showAlert } from 'GridaBoard/store/reducers/listReducer';

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
  headerButtonLiner: {
    width: '1px',
    minWidth: '1px',
    minHeight: '1px',
    height: '16px',
    background: theme.custom.white[25],
    borderRadius: '28px !important',
    borderRight: '0px !important',
  },
  menuItem: {
    minWidth: '130px',
  },
  buttonStyle: {
    padding: 0,
    minWidth: '0px',
    minHeight: '0px',
  },
}));

const MainTrashButton  = () => {
  const classes = menuStyle();
  const dispatch = useDispatch();

  const clearTrash = async () => {
    // const result = await deleteAllFromTrash();
    showAlert({
      type:"deleteTrash"
    });
    // if (result === 1) {
      // dispatch(forceUpdateBoardList()); 
      //useDispatch를 functional component에서만 쓸 수 있어서 deleteAllFromTrash와 합치지 못함
      //useDispatch로 dispatch 하지 않으면(ex. store.dispatch) BoardList에서 useSelector가 동작안함
    // } 
  }
  return (
    <React.Fragment>
      <Button className={classes.headerButton} variant="contained" color="primary" onClick={clearTrash}>
        <div>{getText('empty_trash')}</div>
      </Button>
    </React.Fragment>
  );
};

export default MainTrashButton;
