import { DialogContent, makeStyles, TextField } from '@material-ui/core';
import { LensTwoTone } from '@material-ui/icons';
import React, { useState } from 'react';
import { store } from '../client/pages/GridaBoard';
import getText from "../language/language";


type Props = {
  onTextAreaChange: (pdfName) => void;
  saveType:string;
}

const useStyles = makeStyles({
  textArea: {
    outline: "none",
    width: "100%",
    textAlign: "center",
    height: "30px",
    marginBottom: "20px",
  }
});

const PdfDialogTextArea = (props: Props) => {
  const {saveType, ...rest} = props;
  const classes = useStyles();
  let textRef = null as HTMLElement;
  const isNewDoc = store.getState().docConfig.isNewDoc;
  let isNewLoadFileName = "";
  if(isNewDoc && saveType == "overwrite"){
    if(store.getState().docConfig.docName !== "undefined"){
      isNewLoadFileName = store.getState().docConfig.docName;
    }
  }
  const [pdfName, setPdfName] = useState(isNewLoadFileName);

  const onChange = (e) => {
    let pdfName = e.target.value;

    //이름 설정시 바로 특정 문자만 사용할 수 있도록 수정
    const checkAllow = pdfName.match(/[^a-zA-Z0-9가-힇ㄱ-ㅎㅏ-ㅣぁ-ゔァ-ヴー々〆〤一-龥0-9.+_\-.]/g);
    if(checkAllow !== null){
      const newName = pdfName.split(checkAllow[0]);
      pdfName = newName[0] + newName[1];
      textRef.querySelector("input").value = pdfName;
    }

    setPdfName(pdfName);
  };
  
  props.onTextAreaChange(pdfName);

  return (
    <DialogContent>
      <TextField
        autoFocus
        margin="dense"
        placeholder={saveType !== "thumb" ? getText("save_"+saveType+"_popup_holder") : "마음대로 저장"}
        type="text"
        name="title"
        value={pdfName}
        onChange={onChange}
        className={classes.textArea}
        ref={ref=>textRef=ref}
        label={getText("save_"+saveType+"_popup_name")}
        variant="outlined"
      />
    </DialogContent>
  );
}

export default PdfDialogTextArea;