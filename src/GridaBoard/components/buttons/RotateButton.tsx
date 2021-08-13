import React,{ useState } from "react";
import '../../styles/buttons.css';
import { RootState } from '../../store/rootReducer';
import { setRotationTrigger } from '../../store/reducers/rotate';
import { useSelector } from 'react-redux';
import GridaDoc from "../../GridaDoc";
import { IconButton, IconButtonProps, makeStyles, SvgIcon } from "@material-ui/core";
import { RotateRight } from "@material-ui/icons";
import SimpleTooltip2 from "../SimpleTooltip2";
import getText from 'GridaBoard/language/language';
import { store } from "GridaBoard/client/pages/GridaBoard";

export const onToggleRotate = () => {
  const activePageNo = store.getState().activePage.activePageNo;
  const rotationTrigger = store.getState().rotate.rotationTrigger;
  const doc = GridaDoc.getInstance();
  
  if(activePageNo === -1) return ;

  setRotationTrigger(!rotationTrigger);

  const page = doc.getPageAt(activePageNo);

  if (page._pdfPage !== undefined) {
    if (page._pdfPage.viewport.rotation >= 270) {
      page._pdfPage.viewport.rotation = 0;
    } else {
      page._pdfPage.viewport.rotation += 90;
    }
  }

  if (page.pageOverview.rotation >= 270) {
    page._rotation = 0;
  } else {
    page._rotation += 90;
  }

  // setIsVertical((prev)=>!prev);

  const tmp = page.pageOverview.sizePu.width ;
  page.pageOverview.sizePu.width = page.pageOverview.sizePu.height;
  page.pageOverview.sizePu.height = tmp;
}

const RotateButton = (props: IconButtonProps) => {
  // const doc = GridaDoc.getInstance();
  // // const [isVertical, setIsVertical] = useState(true);
  // const rotationTrigger = useSelector((state: RootState) => state.rotate.rotationTrigger);
  // const activePageNo_store = useSelector((state: RootState) => state.activePage.activePageNo);

  
  const pathArr = [
    /* vertical */ "M8.733 9v13h9.534V9H8.733zm-.866-2C7.388 7 7 7.448 7 8v15c0 .552.388 1 .867 1h11.266c.479 0 .867-.448.867-1V8c0-.552-.388-1-.867-1H7.867z",
    /* horizon */ "M8 20.267h13v-9.534H8v9.534zm-2 .866c0 .479.448.867 1 .867h15c.552 0 1-.388 1-.867V9.867C23 9.388 22.552 9 22 9H7c-.552 0-1 .388-1 .867v11.266z"
  ];

    // <GridaToolTip open={true} placement="left" tip={{
    //     head: "Rotate",
    //     msg: "종이 또는 스마트 플레이트의 입력이 회전되어 반영될지 아닐지를 선택합니다.",
    //     tail: "TAB 가로쓰기/세로쓰기 전환"
    //   }} title={undefined}>
  return (
    <IconButton onClick={onToggleRotate} {...props}>
      <SimpleTooltip2 title={getText('sideMenu_rotate')}>
        <RotateRight/>
      </SimpleTooltip2>
    </IconButton>
  );
}

export default RotateButton;