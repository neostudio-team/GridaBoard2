import React from 'react';
import { createStyles, IconButton, InputBase, MenuItem, Select, SvgIcon, withStyles, Button, Snackbar } from '@material-ui/core';
import getText from "GridaBoard/language/language";
import { IBoardData } from "../../../structures/BoardStructures";
import { OpenInBrowser, DeleteOutline, Restore } from '@material-ui/icons';
import { showAlert, showGroupDialog } from 'GridaBoard/store/reducers/listReducer';
import { copyBoard, routeChange } from '../../../BoardListPageFunc';
import { useHistory } from 'react-router-dom';

const BootstrapInput = withStyles((theme) =>
  createStyles({
    root: {
      width : "160px",
      height : "40px",
      'label + &': {
        marginTop: theme.spacing(3),
      },
    },
    input: {
      borderRadius: 4,
      position: 'relative',
      backgroundColor: theme.palette.background.paper,
      border: '1px solid '+theme.custom.icon.mono[2],
      fontSize: 16,
      padding: '10px 26px 10px 12px',
      transition: theme.transitions.create(['border-color', 'box-shadow']),
      // Use the system font instead of the default Roboto font.
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      '&:focus': {
        borderRadius: 4,
        borderColor: '#80bdff',
        boxShadow: '0 0 0 0.2rem rgba(0,123,255,.25)',
      },
    },
  }),
)(InputBase);

interface Props extends  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  listOrderChange ?: (event)=>void,
  listViewType ?: (val)=>void,
  orderBy ?: number,
  selectedItems ?: Array<IBoardData>,
  selected ?: string,
  deleteForeverBtnClick ?: () => void,
  restoreBtnClick ?: () => void,
}

const MainNavSelector = (props : Props)=>{
  const {listOrderChange, listViewType, deleteForeverBtnClick, restoreBtnClick, orderBy, selectedItems, selected, ...rest } = props;

  
  let viewType = 0;
  if(selected === "trash"){
    if(selectedItems.length !== 0)  viewType = 3;
    else  viewType = 4;
  }else if(selectedItems.length == 1) viewType = 1;
  else if(selectedItems.length > 1) viewType = 2;


  return (
    <React.Fragment>
      {viewType==0? <ListSelectType listViewType={listViewType} listOrderChange={listOrderChange} orderBy={orderBy} />
      : (
        viewType === 3? <TrashNav deleteForeverBtnClick={deleteForeverBtnClick} restoreBtnClick={restoreBtnClick} /> : 
        viewType === 4? ("") :
        <CheckedNav viewType={viewType} selectedItems={selectedItems} />
      )
      }
    </React.Fragment>)
}

export default MainNavSelector;


type listSelectProps = {
  listViewType : (val:any)=>void,
  listOrderChange ?: (event)=>void,
  orderBy ?: number,
}

const ListSelectType = (props:listSelectProps)=>{
  const { listViewType, listOrderChange, orderBy} = props;

  const orderList = [{
    // name : "lastOpened",
    title : getText("boardList_byUpdateDate"),
    value : 0
  },{
    // name : "lastMake",
    title : getText("boardList_byName"),
    value : 1
  }];

  const viewList = [{
    name: "grid",
    path : "M5 5H9V9H5V5ZM3 11V3H11V11H3ZM15 5H19V9H15V5ZM13 11V3H21V11H13ZM9 15H5V19H9V15ZM3 13V21H11V13H3ZM15 15H19V19H15V15ZM13 21V13H21V21H13Z"
  },{
    name: "list",
    path : "M3 4H21V6H3V4ZM3 11H21V13H3V11ZM21 18H3V20H21V18Z"
  }];
  return (
  <div className="listNav">
    <Select
      onChange={listOrderChange}
      defaultValue={0}
      value={orderBy}
      MenuProps={{
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "left",
        },
        transformOrigin: {
          vertical: "top",
          horizontal: "left",
        },
        getContentAnchorEl: null,
      }}
      input={<BootstrapInput />}
    >
      {orderList.map(el=>(<MenuItem value={el.value} key={el.value}>{el.title}</MenuItem>))}
      
    </Select>
    <div>
      {/* {viewList.map(el=>(<IconButton key={el.name} onClick={e=>listViewType(el.name)}>
        <SvgIcon>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d={el.path}
          />
        </SvgIcon>
      </IconButton>))} */}
      
    </div>
  </div>);
}



type checkedNavProp = {
  viewType ?: number
  selectedItems ?: Array<IBoardData>
}

const langtype = {
  "open" : getText("boardList_gridView_menu_open"),
  "nameChange" : getText("boardList_gridView_menu_changeName"),
  "copy" : getText("boardList_gridView_menu_copy"),
  "delete" : getText("categoryMenu_delete"),
  "move" : getText("boardList_gridView_menu_move")
}
const CheckedNav = (props: checkedNavProp)=>{
  const {viewType, selectedItems, ...rest} = props;
  const history = useHistory();
  console.log(selectedItems);

  const clickEvent = async (e, title)=>{
    if(title === "delete"){
      showAlert({
        type:"deleteDoc",
        selected:selectedItems[0],
        sub:{
          data : selectedItems
        }
      });
    }else if(title === "open"){
      await routeChange(selectedItems[0], async ()=>{
        const path = `/app`;
        await history.push(path);
      });
    }else if(title === "nameChange"){
      showGroupDialog({
        type:"changeDocName",
        selected: selectedItems[0]
      });
    }else if(title === "copy"){
      copyBoard(selectedItems[0]); //하나만 선택됐을때 활성화되는 버튼
    }else if(title === "move"){
      showGroupDialog({
        type:"moveDoc",
        selected: selectedItems,
      });
    }
  }

  const items = [
    {
      title : "open",
      itemType : "icon",
      item : (<OpenInBrowser />),
      type : [1]
    },{
      title : "nameChange",
      itemType : "svg",
      item : "M15.586 3a2 2 0 012.828 0L21 5.586a2 2 0 010 2.828l-12 12A2 2 0 017.586 21H5a2 2 0 01-2-2v-2.586A2 2 0 013.586 15l12-12zm-.172 3L18 8.586 19.586 7 17 4.414 15.414 6zm1.172 4L14 7.414l-9 9V19h2.586l9-9z",
      type : [1]
    },{
      title : "copy",
      itemType : "svg",
      item : "M4 3h11v2H6v13H4V3zm4 4h12v14H8V7zm2 2v10h8V9h-8z",
      type : [1]
    },{
      title : "delete",
      itemType : "icon",
      item : (<DeleteOutline />),
      type : [1,2]
    },{
      title : "move",
      itemType : "svg",
      item : "M20 18H4V8h16v10zM12 6l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16c1.11 0 2-.89 2-2V8a2 2 0 00-2-2h-8zm-1 8v-2h4V9l4 4-4 4v-3h-4z",
      type : [1,2]
    },
  ];

  return (
  <div className="checkedNav">
    {items.filter(el=>el.type.includes(viewType)).map((el,idx)=> (
      <Button key={idx} onClick={e=>clickEvent(e, el.title )}>
        {el.itemType === "icon" ? el.item :
        (<SvgIcon>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d={el.item as string}
          />
        </SvgIcon>)
        }
        <span>{langtype[el.title]}</span>
      </Button>)
    )}
  </div>
  );
}


type trashProp = {
  deleteForeverBtnClick ?: () => void,
  restoreBtnClick ?: () => void
}

const TrashNav = (props:trashProp)=>{
  const {deleteForeverBtnClick, restoreBtnClick} = props;
  
  return (
      <div className="checkedNav">
        <Button onClick={deleteForeverBtnClick}>
            <DeleteOutline/><span>{getText('deleteForeverBtn')}</span>
          </Button> 
        <Button onClick={restoreBtnClick}>
          <Restore /><span>{getText('restoreBtn')}</span>
        </Button>
      </div>
    )
}