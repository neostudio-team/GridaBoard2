import React from 'react';
import { Button, ButtonProps } from '@material-ui/core';

import { openFileBrowser } from "./FileBrowser";
import { IFileBrowserReturn } from '../structures';
import { NeoToolTip } from '../ui';
import $ from "jquery";


interface Props extends ButtonProps {
  handlePdfOpen: (event: IFileBrowserReturn) => void,
}


const FileBrowserButton = (props: Props) => {
  const { handlePdfOpen, ...rest } = props;
  
  async function fileOpenHandler() {
    const selectedFile = await openFileBrowser();
    console.log(selectedFile.result);

    FunLoadingBarStart();

    if (selectedFile.result === "success") {
      const { url, file } = selectedFile;
      if (handlePdfOpen) {
        handlePdfOpen({ result: "success", url, file });
        // FunLoadingBarEnd();
      }
    } else {
      if (handlePdfOpen) {
        handlePdfOpen({ result: "canceled", url: null, file: null, });
      }
    }

    
  }

  function FunLoadingBarStart() {
    var backHeight = $(document).height(); //뒷 배경의 상하 폭
    var backWidth = window.document.body.clientWidth; //뒷 배경의 좌우 폭
    var backGroundCover = "<div id='back'></div>"; //뒷 배경을 감쌀 커버
    var loadingBarImage = ''; //가운데 띄워 줄 이미지
    loadingBarImage += "<div id='loadingBar'>";
    loadingBarImage += " <img src='loading.png'/>"; //로딩 바 이미지
    loadingBarImage += "</div>";
    $('body').append(backGroundCover).append(loadingBarImage);
    $('#back').css({ 'width': backWidth, 'height': backHeight, 'opacity': '0.3' });
    $('#back').show();
    $('#loadingBar').show();
  }
  
  $(document).ready(function(){
    $('.load_drop_down').hover(
      function(event){
        $(this).addClass('hover');
        $(this).css("color", "rgba(104,143,255,1)");
        $(this).css("background", "rgba(232,236,245,1)");
      },
      function(){
        $(this).removeClass('hover');
        $(this).css("color", "rgba(18,18,18,1)");
        $(this).css("background", "rgba(255,255,255,0.9)");
      }
    );
  });

  return (
    <div>
      {/* <NeoToolTip open={true} placement="top" tip={{
        head: "PDF File Open",
        msg: "배경으로 쓸 PDF 파일을 엽니다. 스마트 플레이트로 조작하거나, 인쇄하여 덧필기할 수 있습니다.",
        tail: "키보드 버튼 Ctrl + O으로 이동 가능합니다"
      }} title={undefined}> */}
        <Button {...rest} onClick={fileOpenHandler} id="btn_file_open" className="load_drop_down" type="button"
          style={{
            width: "200px", height: "40px", padding: "4px 12px"
          }}>
          <span style={{marginLeft: "-44px"}}>파일 업로드(.pdf)</span>
          {props.children}
        </Button>
      {/* </NeoToolTip> */}
    </div>
  );
}

export default FileBrowserButton;
