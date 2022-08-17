import React , {useState, useEffect} from "react";
import '../../styles/buttons.css';
import GridaToolTip from "../../styles/GridaToolTip";
import PenManager from "nl-lib/neosmartpen/PenManager";
import { IBrushType, PenEventName } from "nl-lib/common/enums";
import { IconButton, makeStyles, SvgIcon, Theme, Tooltip, TooltipProps } from "@material-ui/core";
import getText from "../../language/language";
import SimpleTooltip from "../SimpleTooltip";
import CustomBadge from "../CustomElement/CustomBadge";

const useStyle = makeStyles(theme => ({
  first : {
    marginLeft: "24px",
  },
  main : {
    color: theme.custom.icon.blue[1],
    marginLeft: "16px",
    padding: "8px",
  },
  selected : {
    color: theme.palette.primary.main,
    background: theme.custom.icon.blue[3],
    padding: "8px",
    borderRadius: "8px"
  }
}));


export default function PenTypeButton () {
  const classes = useStyle();
  

  const manager: PenManager = PenManager.getInstance();
  const [selectedType, setSelectedType] = useState(manager.penRendererType as IBrushType);

  
  const typeChange = ()=>{
    setSelectedType(manager.penRendererType);
  }
  useEffect(() => {
    manager.addEventListener(PenEventName.ON_PEN_TYPE_CHANGED, typeChange);
    return () => {
      manager.removeEventListener(PenEventName.ON_PEN_TYPE_CHANGED, typeChange);
    }
  }, []);
  
  const penType = [
    {
      name: "pen",
      path : "M3.152 18.969a1 1 0 001.244 1.243l11.312-3.363 2.121-2.121 1.414-1.414 2.122-2.122a1 1 0 00-1.415-1.414L17.83 11.9l-1.415 1.415L15 14.728 8.637 8.364 10.05 6.95l1.414-1.415 2.829-2.828a1 1 0 10-1.415-1.414L10.051 4.12 8.637 5.535 6.515 7.657 3.152 18.969zM7.8 10.355l-1.62 5.45 1.379 1.38 5.45-1.62-5.21-5.21zM18 21H3v2h15a1 1 0 100-2z",
      type : IBrushType.PEN,
      shortCut : "Q"
    },
    {
      name: "highlighter",
      path : "M2.697 19.489h4.276l.578-.578 1.147 1.148a1 1 0 001.415 0l2.006-2.007c.076-.076.164-.139.26-.187l5.367-2.683a.999.999 0 00.26-.188l.592-.592 2.121-2.121 1.415-1.415a1 1 0 10-1.415-1.414l-.707.707-6.364-6.364 1.06-1.06a1 1 0 10-1.413-1.415l-1.768 1.768L9.406 5.21l-.593.592a1 1 0 00-.187.26l-2.683 5.366a1 1 0 01-.188.26L3.75 13.695a1 1 0 000 1.414l1.06 1.061-2.465 2.465a.5.5 0 00.353.854zM10.82 6.624l1.414-1.414 6.364 6.363-1.414 1.415-6.364-6.364zm-.115 10.014l-1.3 1.3-3.535-3.536 1.3-1.3a3 3 0 00.561-.78L9.718 8.35l5.74 5.74-3.973 1.986a3 3 0 00-.78.562zM17 21H2v2h15a1 1 0 100-2z",
      type : IBrushType.MARKER,
      shortCut : "R"
    },
    {
      name: "eraser",
      path : "M20.238 10.333l-6.381 6.382-7.071-7.071 6.381-6.382c.371-.37.988-.355 1.38.035l5.656 5.657c.39.391.406 1.008.035 1.38zM3.763 12.667l1.68-1.68 7.03 7.031-4.826-.123-3.849-3.85c-.39-.39-.406-1.007-.035-1.378zm10.202 6.768a1.853 1.853 0 01-1.364.535l-4.904-.125a2.055 2.055 0 01-1.393-.607l-3.85-3.849c-1.171-1.172-1.218-3.024-.105-4.137l9.404-9.404c1.113-1.113 2.965-1.066 4.137.106l5.657 5.657c1.171 1.172 1.219 3.023.106 4.136l-7.688 7.688zM19 21H4v2h15a1 1 0 000-2z",
      type : IBrushType.ERASER,
      shortCut : "E"
    },  
    {
      name: "lasso",
      path : "M9.703 2.265A10.026 10.026 0 0 1 12 2c.79 0 1.559.092 2.297.265a1 1 0 0 1-.458 1.947A8.025 8.025 0 0 0 12 4c-.634 0-1.25.074-1.84.212a1 1 0 1 1-.457-1.947Zm6.18 1.552a1 1 0 0 1 1.376-.324a10.047 10.047 0 0 1 3.248 3.248a1 1 0 1 1-1.7 1.053a8.046 8.046 0 0 0-2.6-2.6a1 1 0 0 1-.325-1.377Zm-7.766 0a1 1 0 0 1-.323 1.376a8.047 8.047 0 0 0-2.6 2.6a1 1 0 1 1-1.7-1.052A10.047 10.047 0 0 1 6.74 3.493a1 1 0 0 1 1.376.324Zm-4.65 5.141a1 1 0 0 1 .745 1.203A8.025 8.025 0 0 0 4 12c0 .634.074 1.25.212 1.84a1 1 0 0 1-1.947.457A10.026 10.026 0 0 1 2 12c0-.79.092-1.559.265-2.297a1 1 0 0 1 1.203-.745Zm17.065 0a1 1 0 0 1 1.203.745a10.068 10.068 0 0 1 0 4.594a1 1 0 0 1-1.947-.458a8.062 8.062 0 0 0 0-3.679a1 1 0 0 1 .744-1.202ZM3.817 15.883a1 1 0 0 1 1.376.323a8.046 8.046 0 0 0 2.6 2.6a1 1 0 0 1-1.052 1.7a10.046 10.046 0 0 1-3.248-3.247a1 1 0 0 1 .324-1.377Zm16.805 1.607a1 1 0 0 0-1.742-.983v.001l-.001.001l-.013.021a6.74 6.74 0 0 1-.338.495a8.41 8.41 0 0 1-.74.857C16.598 16.869 14.995 16 13 16c-2.267 0-4 1.2-4 3s1.733 3 4 3c1.91 0 3.459-.634 4.64-1.415a10.979 10.979 0 0 1 1.118 1.67l.07.136l.015.031l.003.005a1 1 0 0 0 1.809-.853c-.117-.231 0-.001 0-.001l-.002-.002l-.002-.006l-.008-.016a2.82 2.82 0 0 0-.015-.03l-.011-.022a11.486 11.486 0 0 0-.452-.803a12.974 12.974 0 0 0-.981-1.379c.4-.401.714-.783.944-1.09a8.788 8.788 0 0 0 .453-.666c.012-.018.02-.034.027-.045l.009-.015l.003-.005v-.002l.002-.002ZM13 18c1.226 0 2.286.476 3.169 1.145a6.268 6.268 0 0 1-3.17.855C11.268 20 11 19.2 11 19c0-.2.267-1 2-1Z",
      type : IBrushType.LASSO,
      shortCut : "A"
    }
  ];

  return (
    <React.Fragment>
      {penType.map((el,idx)=>(
        <CustomBadge key={idx} badgeContent={el.shortCut}>
        <IconButton className={`${classes.main} ${(idx===0) ? classes.first : ""} ${(selectedType === el.type) ? classes.selected : ""}`}
          onClick={() => manager.setPenRendererType(el.type)} >
          {/* <GridaToolTip open={true} placement="left" tip={{
            head: "Pen Type[Pen]",
            msg: "펜을 선택하는 버튼입니다.",
            tail: "단축키 Q로 선택가능합니다."
          }} title={undefined}> */}
          <SimpleTooltip title={getText(`nav_${el.name}`)}>
            <SvgIcon id="pen_svg_icon">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d={el.path}
              />
            </SvgIcon>
          </SimpleTooltip>
          {/* </GridaToolTip> */}
        </IconButton>
        </CustomBadge>
      ))}

    </React.Fragment>
  );
}