
import { Button, Dialog, DialogProps, makeStyles, SvgIcon } from "@material-ui/core";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "GridaBoard/store/rootReducer";
import { Clear, Add } from '@material-ui/icons';
import { textCheckForGroup, createGroup } from "./GroupDialog";
import { forceUpdateBoardList } from "GridaBoard/store/reducers/appConfigReducer";
import { IBoardData } from "boardList/structures/BoardStructures";
import { docCategoryChange } from "boardList/BoardListPageFunc2";
import { changeGroup, showSnackbar } from 'GridaBoard/store/reducers/listReducer';
import getText from "GridaBoard/language/language";


const useStyle = makeStyles(theme=>({
  paper : {
    background: theme.custom.white[90],
    boxShadow : theme.custom.shadows[0],
    borderRadius: "12px",
    alignItems: "center",
    width : "520px",
    height : "416px",
    "& > .header" : {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width : "472px",
      marginTop : "22px",
      "& > div:first-child": {
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "bold",
        fontSize: "20px",
        lineHeight: "23px",
        letterSpacing: "0.25px",
        color : theme.palette.text.primary
      },
      "& > button" : {
        padding: "0px",
        minWidth : "0px"
      }
    },
    "& > .subtitle" : {
      width: "472px",
      marginTop: "7px",
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "11px",
      lineHeight: "13px",
      letterSpacing: "0.25px",
      
      
      color: theme.palette.text.secondary
    },
    "& > .content" : {
      background : theme.custom.white[90],
      display : "flex",
      width : "472px",
      height : "240px",
      alignItems : "flex-start",
      flexDirection : "column",
      marginTop : "22px",
      overflowX : "hidden",
      overflowY: "auto"
    },
    "& > .footer" : {
      display : "flex",
      justifyContent : "flex-end",
      width : "100%",
      height : "88px",
      padding : "0 24px",
      alignItems : "center",
      "& > button:first-child" : {
        padding: "0px",
        display : "flex",
        alignItems: "center",
        "& > span > div:last-child" : {
          fontFamily: "Roboto",
          fontStyle: "normal",
          fontWeight: "normal",
          fontSize: "12px",
          lineHeight: "14px",
          letterSpacing: "0.25px",
          marginLeft : "8px",
        }
      },
      "& > div:nth-child(1)" : {
        "& > button" : {
          width: "71px",
          height: "40px",
          borderRadius: "60px",
          fontFamily: "Roboto",
          fontStyle: "normal",
          fontWeight: "bold",
          fontSize: "12px",
          lineHeight: "14px",
          "&:first-child" : {
            boxSizing: "border-box",
            background : theme.custom.icon.mono[4],
            border : "1px solid " + theme.custom.icon.mono[2],
            marginRight : "8px",
          }

        }
      }
    }
  },
  contentItems : {
    display: "flex",
    width: "100%",
    minHeight : "40px",
    justifyContent: "space-between",
    alignItems: "center",
    cursor : "pointer",

    "& > div:first-child" : {
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "14px",
      lineHeight: "16px",
      letterSpacing: "0.25px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      marginLeft: "16px",
      color : theme.palette.text.primary
    },
    "& > *:last-child" : {
      marginRight : "16px",
      color : theme.palette.primary.main
    }
  },
  selectedItem : {
    background : theme.custom.icon.blue[3],
    cursor : "context-menu !important",
    "& > div:first-child" : {
      fontWeight: "bold !important",
      color : theme.palette.primary.main + " !important",
    },
    "&:hover" : {
      backgroundColor: theme.custom.icon.blue[3] + " !important"
    },
  },
  newCategoryDiv : {
    display:"flex",
    minHeight: "40px",
    height : "40px",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    "& > input" :{
      width: "456px",
      height: "100%",
      background : theme.custom.icon.mono[4],
      border : "1px solid " + theme.custom.icon.mono[0],
      boxSizing : "border-box",
      borderRadius : "8px",
      padding: "11px 12px",
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "14px",
      lineHeight: "16px",
      letterSpacing: "0.25px",
      color : theme.palette.text.primary
    },
    "& > .disable" : {
      border : `1px solid ${theme.palette.error.main} !important` 
    },
  },
  newCategoryWarn : {
    display:"flex",
    minHeight: "40px",
    width: "100%",
    justifyContent : "center",
    "& > div" : {
      width : "450px",
      height : "14px",
      marginTop: "8px",
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "12px",
      lineHeight: "14px",
      /* identical to box height */
      
      display: "flex",
      alignItems: "center",
      letterSpacing: "0.25px",
      justifyContent : "flex-start",
      color: theme.palette.error.main
    }
  },
  hidden : {
    visibility : "hidden",
  }
}))

interface Props extends  DialogProps {
  type ?: string
  closeEvent ?: (isChange:boolean)=>void,
  docsObj :{
    docs: any[],
    category: any[],
  }
}
const changeCategory = async (docs:Array<IBoardData>, selectCategory:Array<any>)=>{
  for(let i = 0; i < docs.length; i++){
      await docCategoryChange(docs[i], selectCategory[3]);
  }
}


const MoveDialog = (props: Props)=>{
  const { open, closeEvent, type, docsObj, classes, ...rest } = props;
  const categoryData = docsObj.category.filter(el=>el[1]!=-1);
  const selected = useSelector((state: RootState) => state.list.dialog.selected);
  const dispatch = useDispatch();

  console.log(categoryData);
  let defaultCategory = -1;
  if(selected.length === 1){
    defaultCategory = selected[0].category;
  }else if(!selected.some(el=>el.category != selected[0].category)){
    defaultCategory = selected[0].category;
  }

  const [nowSelect, setSelect] = useState(categoryData.findIndex(el=>el[3] == defaultCategory));
  const moveClasses = useStyle();


  let inputer = null as HTMLInputElement;
  const [createNewVisible, setCreateNewVisible] = useState(false);
  const [createNewDisable, setCreateNewDisible] = useState(false);
  
  const [disabled, setDisabled] = useState(true);
  const categoryUpdate = (val:boolean)=>{
    setCreateNewDisible(false);
    setCreateNewVisible(false);
    changeGroup(true);
  }
  
  const enterCheck = async (e)=>{
    if(e.key !== "Enter") return ;
    await createGroup(inputer.value, categoryUpdate)
  }
  const inputChange = (e)=>{
    let cantSave = false;
    let newText:string|false = e.target.value;

    console.log(newText);
    newText = textCheckForGroup(newText);

    if(newText === false)
      cantSave = true;
    
      console.log(!cantSave , newText != "" , createNewDisable)
    if(!cantSave && newText != "" && createNewDisable){
      setCreateNewDisible(false);
    }else if(cantSave || (newText == "" && !createNewDisable)){
      setCreateNewDisible(true);
    }

  }

  const selectCategory = (selectCategoryIdx)=>{
    const nowData = categoryData[selectCategoryIdx];
    if(nowSelect === selectCategoryIdx) return ;

    if(defaultCategory == nowData[3] && !disabled){
      setDisabled(true);
    }else if(disabled){
      setDisabled(false);
    }

    setSelect(selectCategoryIdx);
  }
  const save = async ()=>{
    const nowData = categoryData[nowSelect];
    await changeCategory(selected, nowData);
    
    closeEvent(false);
    dispatch(forceUpdateBoardList());
    
    const selectedDocNames: string[] = [];
    for (const doc of selected) {
      selectedDocNames.push(doc.doc_name);
    }

    showSnackbar({
      snackbarType: "moveDoc",
      selectedDocName: selectedDocNames,
      selectedCategory: nowData[0],
      categoryData : nowData
    });
  }
  
  const onKeyPress = (e) => {
    if (e.key === 'Enter') {
      save();
    }
  }

  return (<Dialog
    disableBackdropClick
    onClose={closeEvent}
    classes={{
      paper : `${moveClasses.paper}`
    }}
    {...rest}
    open={open}
    onKeyPress={onKeyPress}
  >
    <div className="header">
      <div>{getText("boardList_filemove_title")}</div>
      <Button onClick={(e)=>{closeEvent(false)}}><Clear /></Button>
    </div>
    <div className="subtitle">
      {getText("boardList_filemove_subTitle")}
    </div>
    <div className="content">
      {categoryData.map((el,idx)=>{
        return (<div key={idx} onClick={e=>selectCategory(idx)} className={`${moveClasses.contentItems} ${idx === nowSelect ? moveClasses.selectedItem: ""}`}>
            <div>
              {el[0] === "Unshelved" ?
                getText("boardList_unshelved").replace("%d", el[2]) :
                el[0] + ` (${el[2]})`
              }
            </div>
            { nowSelect === idx ? 
            <SvgIcon>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M18.71 7.21a1 1 0 00-1.42 0l-7.45 7.46-3.13-3.14A1.023 1.023 0 005.29 13l3.84 3.84a1.001 1.001 0 001.42 0l8.16-8.16a1 1 0 000-1.47z"
              />
          </SvgIcon> : ""}
          </div>)
      })}
      {createNewVisible ? (
      <div className={`${moveClasses.newCategoryDiv}`}>
        <input ref={(e)=>{inputer=e}} onKeyUp={enterCheck} className={`${createNewDisable? "disable" : ""}`} autoFocus defaultValue={`Untitle Group`} onChange={inputChange} />

      </div>
      ):""}
      
      {createNewDisable && createNewVisible ? (
      <div className={moveClasses.newCategoryWarn}>
        <div>{getText("boardList_filemove_warn")}</div>
      </div>) : ""}
    </div>
    <div className="footer">
      {/* <Button onClick={e=>{setCreateNewVisible(prev=>!prev)}}>
        <Add />
        <div>{getText("boardList_filemove_add")}</div>  
      </Button> */}
      <div>
        <Button variant="contained" disableElevation color="secondary" onClick={()=>{closeEvent(false)}} >{getText("save_grida_popup_cancel")}</Button>
        <Button variant="contained" disableElevation color="primary" disabled={disabled} onClick={()=>{save()}}>{getText("save_saveAs_popup_save")}</Button>
      </div>
    </div>
  </Dialog>);
};

export default MoveDialog;