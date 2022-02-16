import { makeStyles, Grow, IconButton, Checkbox, Fade, SvgIcon } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import {MoreVert, DeleteOutline} from '@material-ui/icons';
import { getTimeStamp } from '../../../BoardListPageFunc';
import { IBoardData } from '../../../structures/BoardStructures';
import { showDropDown } from 'GridaBoard/store/reducers/listReducer';
import getText from "GridaBoard/language/language";
import firebase, { secondaryFirebase } from 'GridaBoard/util/firebase_config';
import BoardLoadingCircle from 'GridaBoard/Load/BoardLoadingCircle';

interface Props extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  docsList?: Array<any>;
  selectedClass?: string;
  category?: string;
  allCategory?: Object;
  selectedItems?: IBoardData[];
  routeChange?: (idx: number) => void;
  updateSelectedItems?: (el: IBoardData, checked: boolean) => void;
}

const useStyle = makeStyles(theme => ({
  moreBtn: {
    position: 'absolute',
    right: '7px',
    top: '5px',
    zIndex: 1000,
    opacity: 0.78,
    transform: 'scale(1)',
    '& > div:last-child': {
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: '0px',
      right: '0px',
    },
  },
  removeBtnMouseDown: {
    transform: 'scale(0.85) !important',
    color: '#555555',
  },
  selectBtn: {
    position: 'absolute',
    left: '7px',
    top: '5px',
    zIndex: 1000,
    opacity: 0.78,
    transform: 'scale(1)',
  },
  menuItem: {
    minWidth: '130px',
  },
  emptyField : {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "205px",

    "& > svg" : {
      width: "80px",
      height : "80px",
      marginBottom : "20px",
      color : theme.custom.grey[3]
    },
    "& > div": {
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "18px",
      lineHeight: "21px",

      letterSpacing: "0.25px",

      /* White/text/secondary */

      color: theme.palette.text.secondary,

    }

  }
}));
const getThumbNailPath = async (docsList)=>{
  const storage = secondaryFirebase.storage();
  const storageRef = storage.ref();
  const user = firebase.auth().currentUser;
  if(user === null){
    return [];
  }
  const uid = user.uid;

  const pathList = [];
  for(let i = 0; i < docsList.length; i++){
    let thumbNailPath;
    if(docsList[i].thumbNailPath !== undefined){
      thumbNailPath = docsList[i].thumbNailPath;
    }else{
      try{
        thumbNailPath = await storageRef.child(`thumbnail/${uid}/${docsList[i].docId}.png`).getDownloadURL();
      }catch(e){
      thumbNailPath = await storageRef.child(`thumbnail/${docsList[i].docId}.png`).getDownloadURL();
      }
    }
    pathList.push(thumbNailPath);
    docsList[i].thumbNailPath = thumbNailPath;
  }
  return pathList;
}

const GridView = (props: Props) => {
  const classes = useStyle();
  const { selectedClass, ref, routeChange, category, selectedItems, allCategory, ...rest } = props;
  const { docsList } = props;

  const [showMoreBtns, setShowMoreBtns] = useState([]);
  const [showCheckBoxes, setShowCheckBoxes] = useState([]);
  const [forcedToShowCheckBoxes, setForcedToShowCheckBoxes] = useState([]);
  const [forcedNotToShowMoreBtns, setForcedNotToShowMoreBtns] = useState(false);
  const [pathList, setPathList] = useState([]);

  const getData = async ()=>{
    const _pathList = await getThumbNailPath(docsList);
    setPathList(_pathList);
  }
  
  useEffect(()=>{
    getData();
  },[docsList]); 
  useEffect(() => {
    //초기화 
    setPathList([]);
    showMoreBtns.length = 0;
    showCheckBoxes.length = 0;
    forcedToShowCheckBoxes.length = 0;

    for (let i = 0; i < docsList.length; i++) {
      showMoreBtns.push(false);
      showCheckBoxes.push(false);
      forcedToShowCheckBoxes.push(false);
    }
    
    setForcedNotToShowMoreBtns(false);
    getData();
  }, [docsList.length]);

  useEffect(() => {
    if (selectedItems.length === docsList.length) {
      //select all
      const newArr = [...forcedToShowCheckBoxes];
      for (let i = 0; i < newArr.length; i++) {
        newArr[i] = true;
      }
      setShowCheckBoxes(newArr);
      setForcedToShowCheckBoxes(newArr);
    } else if (selectedItems.length === 0) {
      //deselect all
      const newArr = [...forcedToShowCheckBoxes];
      for (let i = 0; i < newArr.length; i++) {
        newArr[i] = false;
      }
      setShowCheckBoxes(newArr);
      setForcedToShowCheckBoxes(newArr);
      setForcedNotToShowMoreBtns(false);
    }

    if (selectedItems.length > 0) {
      const newArr = [...showMoreBtns];
      for (let i = 0; i < newArr.length; i++) {
        newArr[i] = false;
      }
      setShowMoreBtns(newArr);
      setForcedNotToShowMoreBtns(true);
    }
  }, [selectedItems.length]);

  const updateShowBtns = (idx: number, show: boolean) => {
    if (forcedNotToShowMoreBtns === false) {
      const newArr = [...showMoreBtns];
      newArr[idx] = show;
      setShowMoreBtns(newArr);
    }

    if (forcedToShowCheckBoxes[idx] === false) {
      const newArr = [...showCheckBoxes];
      newArr[idx] = show;
      setShowCheckBoxes(newArr);
    }
  };

  const isChecked = keyStr => {
    for (const selectedItem of selectedItems) {
      if (selectedItem.doc_name === undefined) continue;
      const timestamp = getTimeStamp(selectedItem.created);
      const itemKey = selectedItem.doc_name + '_' + timestamp;
      if (keyStr === itemKey) {
        return true;
      }
    }
    return false;
  };

  const updateSelectedItems = (idx: number, el: IBoardData, checked: boolean) => {
    const newArr = [...forcedToShowCheckBoxes];
    newArr[idx] = checked;
    setForcedToShowCheckBoxes(newArr);

    props.updateSelectedItems(el, checked);
  };

  if(docsList.length === 0){
    return (
      <React.Fragment>
        <div className={classes.emptyField}>
          {category === "trash" ? (<DeleteOutline />) : (<SvgIcon>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M18 10v10H6V4h6v6h6zm2-2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2h8l6 6zm-6-3.172L17.172 8H14V4.828z"
            />
          </SvgIcon>)}
          
          
          <div>{category === "trash" ? getText("boardList_emptyTrash") : getText("boardList_emptyContent")}</div>
        </div>
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      {docsList.map((el, idx) => {
        const path = pathList[idx];
        const times = new Date(el.last_modified.seconds * 1000);
        const timestamp = getTimeStamp(el.created);
        const keyStr = el.doc_name + '_' + timestamp;
        const categoryName = allCategory[el.category][0] === 'Unshelved' ? 
          getText("boardList_unshelved").substring(0,5) : allCategory[el.category][0]
        
        return (
          <React.Fragment key={keyStr}>
            <div
              key={keyStr}
              className={`contentItem`}
              onMouseOver={e => updateShowBtns(idx, true)}
              onMouseLeave={e => updateShowBtns(idx, false)}>
              <div style={{ backgroundImage: `url(${path})` }} onClick={() => routeChange(el.key)}>
                <BoardLoadingCircle checked={isChecked(keyStr)} />
              </div>
              <div>
                <div>{el.doc_name}</div>
                <div className="contentData">
                  <div>{`${times.getFullYear()}/${times.getMonth()+1}/${times.getDate()}`}</div>
                  <div />
                  {props.category === 'trash' ? <div>{categoryName}</div> : <div>{el.docNumPages} page</div>}
                </div>
              </div>
              <Grow in={showCheckBoxes[idx]}>
                <div className={classes.selectBtn}>
                  <Checkbox
                    checked={isChecked(keyStr)}
                    color="primary"
                    value={keyStr}
                    onChange={event => updateSelectedItems(idx, el, event.target.checked)}
                  />
                </div>
              </Grow>
              <Fade in={showCheckBoxes[idx]}>
                <div className="hover"  />
              </Fade>
              {selectedItems.includes(el) ? <div className={selectedClass} /> : ''}
              {category === 'trash' ? (
                <Grow in={showMoreBtns[idx]}>
                  <div className={classes.moreBtn}>
                    <IconButton
                      onClick={e => {
                        e.stopPropagation();
                        showDropDown({
                          type: 'trash',
                          event: e,
                          selected: el,
                        });
                      }}>
                      <MoreVert />
                    </IconButton>
                  </div>
                </Grow>
              ) : (
                <Grow in={showMoreBtns[idx]}>
                  <div className={classes.moreBtn}>
                    <IconButton
                      onClick={e => {
                        e.stopPropagation();
                        showDropDown({
                          type: 'docs',
                          event: e,
                          selected: el,
                        });
                      }}>
                      <MoreVert />
                    </IconButton>
                  </div>
                </Grow>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
};

export default GridView;
