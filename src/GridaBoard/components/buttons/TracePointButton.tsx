import React from "react";
import '../../styles/buttons.css';
import { useSelector, useDispatch } from 'react-redux';
import { setPointerTracer } from '../../store/reducers/pointerTracer';
import $ from "jquery";
import { RootState } from '../../store/rootReducer';
import { IconButton, makeStyles, SvgIcon, Theme, Tooltip, TooltipProps } from '@material-ui/core';
import GridaToolTip from "../../styles/GridaToolTip";
import getText from "../../language/language";
import SimpleTooltip from "../SimpleTooltip";

const pointerStyle = {
  marginLeft: "12px",
  padding: "8px"
  // backgroundColor: "white"
} as React.CSSProperties;

const TracePointButton = () => {
  const isTrace = useSelector((state: RootState) => state.pointerTracer.isTrace)
  const dispatch = useDispatch();

  const setEnable = (sw: boolean) => {
    if (sw) {
      const $elem = $("#btn_tracepoint").find(".c2");
      $elem.addClass("checked");
      $('#btn_tracepoint').css('background', 'white');
      $('#tracer_svg_icon').css('color', '#688FFF');
    } else {
      const $elem = $("#btn_tracepoint").find(".c2");
      $elem.removeClass("checked");
      $('#btn_tracepoint').css('background', 'none');
      $('#tracer_svg_icon').css('color', '#58627D');
    }
  }

  const onTogglePointerTracer = () => {
    dispatch(setPointerTracer(!isTrace));
    setEnable(!isTrace);
  }

  setEnable(isTrace);

  return (
    <IconButton id="btn_tracepoint" style={pointerStyle} onClick={() => onTogglePointerTracer()}>
      {/* <GridaToolTip open={true} placement="left" tip={{
          head: "Trace Point",
          msg: "펜의 위치를 화면에 보여주는 버튼입니다.",
          tail: "단축키 Q로 선택가능합니다."
        }} title={undefined}> */}
        <SimpleTooltip title={getText("nav_pointer")}>
          <SvgIcon id="tracer_svg_icon" className="c2 checked">
            <path
              d="M9.012 13L5.04 16.002c-.994.88-1.133 2.12-.994 3 .13 1 .904 2.22 1.987 2.68 1.56.67 3.07.22 4.013-.76l8.9-7.92c1.848-1.38.994-4-.993-4h-5.96l7.41-4.39c.438-.32.616-.79.596-1.24C19.939 2.67 19.402 2 18.549 2h-.06c-.347 0-.675.11-.973.29L5.04 9c-.805.46-1.053 1.24-.994 2 .05 1.03.736 2 1.987 2h2.98zM5.04 18.502c0-.663.261-1.299.727-1.768a2.475 2.475 0 013.512 0 2.509 2.509 0 010 3.536 2.475 2.475 0 01-3.512 0 2.509 2.509 0 01-.727-1.768z"
            />
          </SvgIcon>
        </SimpleTooltip>
      {/* </GridaToolTip> */}
    </IconButton>
  );
}
export default TracePointButton;