import { makeStyles, Button, IconButton} from '@material-ui/core';
import { relative } from 'node:path';
import React, { useEffect, useState } from 'react';
import getText from "GridaBoard/language/language";
import { AccessTime, DeleteOutline, Add, MoreVert } from '@material-ui/icons';
const useStyle = makeStyles(theme=>({
  wrap : {
    background : theme.custom.white[50],
    borderRight: "1px solid " + theme.custom.grey[3],
    width : "321px",
    display : "flex",
    flexDirection: "column",
  },
  recentGroup : {
    marginTop : "16px",
    position : "relative",
    width : "320px",
    display: "flex",
    alignItems : "center",
    justifyContent : "center",
    flexDirection: "column",
    "& > div" : {
      paddingLeft : "8px",
      display: "flex",
      width: "100%",
      height : "56px",
      alignItems: "center",
      cursor : "pointer",
      "&:hover" : {
        backgroundColor: "rgba(18, 18, 18, 0.04)"
      },
      "& > *:first-child" : {
        margin: "16px",
        color : theme.custom.grey[4]
      },
      "& > *:nth-child(2)" : {
        fontStyle: "normal",
        fontWeight: "normal",
        fontSize: "16px",
        lineHeight: "19px",
        letterSpacing: "0.25px",
        height: "20px",
        color : theme.palette.text.primary
      }
    }
  },
  mainGroup : {
    position : "relative",
    width : "320px",
    display: "flex",
    alignItems : "center",
    justifyContent : "center",
    flexDirection: "column",
    "& > div" : {
      paddingRight: "24px",
      paddingLeft: "32px",
      height : "48px",
      width : "100%",
      display: "flex",
      alignItems : "center",
      justifyContent : "space-between",
      color : theme.custom.icon.mono[0],
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "16px",
      lineHeight: "19px",
      letterSpacing: "0.25px",
      "&:not(&:first-child)":{
        cursor : "pointer",
      },
      "&:hover:not(&:first-child)" : {
        backgroundColor: "rgba(18, 18, 18, 0.04)"
      },
      "&:first-child": {
        color : theme.palette.text.disabled,
        fontSize: "14px",
        lineHeight: "16px",
        "&:hover" : {
          backgroundColor: ""
        },
      }
    }
  },
  addGroup: {
    border : "1px solid " + theme.custom.icon.mono[2],
    padding : "6px 4px",
    paddingRight : "13px",
    "& > span:first-child" : {
      textTransform: "initial",
      "&> *:first-child":{
        marginRight: "6px"
      }
    }
  },
  selected : {
    background : "rgba(104, 143, 255, 0.1)",
    cursor : "context-menu !important",
    "&:hover" : {
      backgroundColor: "rgba(104, 143, 255, 0.1) !important"
    },
  }
}));
interface Props extends  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  selected ?: string
  // categoryList ?: Array<{name:string, count:number}>,
  category ?: Object,
  categoryKey ?: Array<string>
  selectCategory ?: (select:string|number)=>void
}

const Leftside = (props : Props)=>{
  const classes = useStyle();
  const selected = props.selected;
  const keyList = props.categoryKey;

  const selectCategory = (select)=>{
    if(select == selected) return ;

    props.selectCategory(select);
  }

  return (
    <div className={classes.wrap}>
      <div className={classes.recentGroup}>
        {["recent","trash"].map(el=>(
          <div key={el} onClick={e=>selectCategory(el)} className={selected === el? classes.selected : "" }>
            {el == "recent" ? <AccessTime /> : <DeleteOutline />}
            <span>{getText(`boardList_${el}`)}</span>
          </div>))}
      </div>
      <Liner />
      <div className={classes.mainGroup}>
        <div>
          <span>
            {getText("boardList_groupTitle")}
          </span>
          <Button className={classes.addGroup} variant="contained" color="secondary" disableElevation>
            <Add />
            <span>{getText("boardList_add")}</span>
          </Button>
        </div>
        {keyList.map(el=>{
          let title = el === "none" ? getText("boardList_unshelved").replace("%d", props.category[el]) : el + ` (${props.category[el]})`;
          return (
          <div key={el} onClick={e=>selectCategory(el)} className={selected === el? classes.selected : "" }>
            <span>{title}</span>
            {el !== "none" ? (
              <IconButton onClick={(e)=>{e.stopPropagation(); alert(123)}}><MoreVert /></IconButton>
            ) : ""}
          </div>
          );
        })}
      </div>
      <Liner />
    </div>
  );
}

export default Leftside;




const LinerStyle = makeStyles(theme=>({
  default : {
    position: "relative",
    width : "320px",
    height : "33px",
    display: "flex",
    alignItems : "center",
    justifyContent : "center",
    "& > div" : {
      width: "264px",
      height : "1px",
      background : theme.custom.grey[3]
    }
  }
}));
type linerProps = {
  className ?: string
}
const Liner = (props : linerProps)=>{
  const classes = LinerStyle();
  return (<div className={`${classes.default} ${props.className}`}><div></div></div>)
}