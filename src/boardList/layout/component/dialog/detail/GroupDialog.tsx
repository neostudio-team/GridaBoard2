import { Button, Dialog, DialogProps } from "@material-ui/core";
import { hideGroupDialog } from 'GridaBoard/store/reducers/listReducer';
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {createCategory, changeCategoryName, changeDocName} from "boardList/BoardListPageFunc2";
import { RootState } from "GridaBoard/store/rootReducer";
import { forceUpdateBoardList } from "GridaBoard/store/reducers/appConfigReducer";
import getText from "GridaBoard/language/language";

const dialogTypes = {
  "newGroup" : {
    title : getText("boardList_dialog_newGroup_title"),
    placeHolder : getText("boardList_dialog_newGroup_placeHolder"),
    mainWarn  : getText("boardList_dialog_newGroup_mainWarn"),
    selectedType : "group"
  },
  "changeGroupName" : {
    title : getText("boardList_dialog_changeGroupName_title"),
    placeHolder : getText("boardList_dialog_changeGroupName_placeHolder"),
    mainWarn  : getText("boardList_dialog_changeGroupName_mainWarn"),
    selectedType : "group"
  },
  "changeDocName" : {
    title : getText("boardList_dialog_changeDocName_title"),
    placeHolder : getText("boardList_dialog_changeDocName_placeHolder"),
    mainWarn  : getText("boardList_dialog_changeDocName_mainWarn"),
    selectedType : "doc"
  }
};


interface Props extends  DialogProps {
  type ?: string
  closeEvent ?: (isChange:boolean)=>void
}

export const textCheckForGroup = (text:string|false)=>{
  //정규식 조건을 통해서 안될경우 false
  if(text === false) return false;


  const selectedName = text as string;
  if(selectedName.length > 15){
    return false;
  }
  if(selectedName == ""){
    return false;
  }
  if(selectedName.search(/^[. ]/g) !== -1){
    //첫글자가 공백 혹은 .임
    // setWarnOpen(true);
    return false;
  }
  if(selectedName.search(/[^a-zA-Z0-9가-힇ㄱ-ㅎㅏ-ㅣぁ-ゔァ-ヴー々〆〤一-龥0-9.+_\- .]/g) !== -1){
    /**
     * 허용된 문자
     * 알파벳 : a-z , A-Z
     * 한글 : 가-힇, ㄱ-ㅎ, ㅏ-ㅣ
     * 일어 : ぁ-ゔ, ァ-ヴ, ー々〆〤
     * 한자 : 一-龥
     * 숫자 : 0-9
     * 특문 : + _ - 공백 .
     * 
     * 이외의 것이 있을 경우 진입
     */
    return false;
  }

  return text;
}
export const textCheckForDoc = (text:string|false)=>{
  if(text === false) return false;

  
  const selectedName = text as string;
  if(selectedName.length > 20){
    return false;
  }
  if(selectedName == ""){
    return false;
  }
  if(selectedName.search(/^[. ]/g) !== -1){
    //첫글자가 공백 혹은 .임
    // setWarnOpen(true);
    return false;
  }
  if(selectedName.search(/[^a-zA-Z0-9가-힇ㄱ-ㅎㅏ-ㅣぁ-ゔァ-ヴー々〆〤一-龥0-9.+_\- .]/g) !== -1){
    /**
     * 허용된 문자
     * 알파벳 : a-z , A-Z
     * 한글 : 가-힇, ㄱ-ㅎ, ㅏ-ㅣ
     * 일어 : ぁ-ゔ, ァ-ヴ, ー々〆〤
     * 한자 : 一-龥
     * 숫자 : 0-9
     * 특문 : + _ - 공백 .
     * 
     * 이외의 것이 있을 경우 진입
     */
    return false;
  }

  return text;
}
export const createGroup = async (newText:string, closeEvent:(isChange: boolean) => void)=>{
  // createCategory
  const text = textCheckForGroup(newText);

  if(text === false){
    //못만듬
    return false;
  }

  await createCategory(newText as string);

  closeEvent(true);
}
 

const GroupDialog = (props : Props)=>{
  const { open, closeEvent, type, ...rest } = props;
  
  let { placeHolder } = dialogTypes[type];
  const { title, mainWarn, selectedType } = dialogTypes[type];
  
  const defaultValue = useSelector((state: RootState) => state.list.dialog.selected);
  const dispatch = useDispatch();

  let defaultText = "";
  if(defaultValue !== null){
    if(selectedType === "group"){
      defaultText = defaultValue[0];
    }else if(selectedType === "doc"){
      defaultText = defaultValue.doc_name;
    }
  }
  let inputer = null as HTMLInputElement;
  
  const [disabled, setDisabled] = useState(true);

  if(type === "changeGroupName"){
    placeHolder = defaultValue[0];
  }
  const inputChange = (e)=>{
    let cantSave = false;
    let newText:string|false = e.target.value;


    if(newText === defaultText){
      cantSave = true;
    }
    
    if(selectedType === "group"){
      newText = textCheckForGroup(newText);
    }else if(selectedType === "doc"){
      newText = textCheckForDoc(newText);
    }
    if(newText === false)
      cantSave = true;
    
    if(!cantSave && newText != "" && disabled){
      setDisabled(false);
    }else if(cantSave || (newText == "" && !disabled)){
      setDisabled(true);
    }
  }
  const changeGroup = async ()=>{
    let newText:string|false = inputer.value;
    newText = textCheckForGroup(newText);

    if(newText === false){
      //못바꿈
      return false;
    }

    await changeCategoryName(defaultValue, newText as string);

    closeEvent(true);
  }

  const changeDoc = async ()=>{
    let newText:string|false = inputer.value;
    newText = textCheckForDoc(newText);

    if(newText === false){
      //못바꿈
      return false;
    }

    await changeDocName(defaultValue, newText as string);

    closeEvent(false);
    forceUpdateBoardList();
  }

  const save = async ()=>{
    const newText:string|false = inputer.value;
    if(type == "newGroup"){
      await createGroup(newText, closeEvent);
    }else if(type == "changeGroupName"){
      await changeGroup();
    }else if(type == "changeDocName"){
      await changeDoc()
    }
  }

  const onKeyPress = (e) => {
    if (e.key === 'Enter') {
      save();
    }
  }

  return (
  <Dialog
    disableBackdropClick
    onClose={closeEvent}
    {...rest}
    open={open}
    onKeyPress={onKeyPress}
  >
    <div className="title">{title}</div>
    <input ref={(e)=>{inputer=e}} className="inputer" autoFocus placeholder={placeHolder} onChange={inputChange} defaultValue={defaultText} />
    <div className="warn">{mainWarn}</div>
    <div className="footer">
      <Button variant="contained" disableElevation color="secondary" onClick={()=>{closeEvent(false)}} >{getText("save_pdf_popup_cancel")}</Button>
      <Button variant="contained" disableElevation color="primary" disabled={disabled} onClick={()=>{save()}}>{getText("save_pdf_popup_save")}</Button>
    </div>
  </Dialog> );
}


export default GroupDialog;