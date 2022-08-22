
const excelToJson = require('convert-excel-to-json');
const fs = require("fs");
const url = "./src/GridaBoard/language/";

const codes = ["ko", "en", "ja", "tw", "de", "es"]; //5, 6, 7, 8, 9, 10번에 각각 들어있음

const readFile = fs.readFileSync(url + "textData.xlsx" );
const excelFile = excelToJson({
  source: readFile, // fs.readFileSync return a Buffer
  columnToKey: {
    B: 'tag',
    C: 'key',
    F: codes[0],
    G: codes[1],
    H: codes[2],
    I: codes[3],
    J: codes[4],
    K: codes[5],
  }
});


let data = {};
codes.forEach((el)=>{
  data[el] = {};
})
let table = excelFile.string;
let startI = 0;
for(let i = 0; i < table.length;i++){
  if(table[i].tag == "tag"){
    startI = i;
    break ;
  }
}

for(let i = startI; i < table.length; i++){
  let now = table[i];
  for(let j = 0; j < codes.length; j++){
    let key = codes[j];
    if(now[key] != undefined){
      data[key][now.key] = now[key];
    }
  }
}

fs.writeFileSync(url + "textData.json", JSON.stringify(data, null, 4));


const helpExcel = excelToJson({
  source: readFile, // fs.readFileSync return a Buffer
  columnToKey: {
    A: 'tag',
    B: 'title',
    C: 'mainExplain',
    D: 'sub',
    E: 'subtitle',
    F: 'subtext',
    G: 'link'
  }
});
delete helpExcel.string;

data = {};
for(let key in helpExcel){
  let language = key.split("_")[1];
  data[language] = {};
  let textData = data[language];
  
  let nowObj = null;
  let nowSub = null;
  helpExcel[key].forEach((el,idx)=>{
    if(idx == 0){
    }else{
      if (el.tag !== undefined) {
          if (textData[el.tag] === undefined) textData[el.tag] = {};
          nowObj = textData[el.tag];
      }
      if (el.title !== undefined) {
          nowObj.title = el.title;
      }
      if (el.mainExplain !== undefined) {
          nowObj.mainExplain = el.mainExplain;
      }
      if (el.sub !== undefined) {
          if (nowObj.sub === undefined) nowObj.sub = [];
          nowSub = {};
          nowObj.sub.push(nowSub);
          nowSub.title = el.sub;
          nowSub.text = [];
      }
      const newSubText = {};
      newSubText.subtitle = el.subtitle;
      newSubText.subtext = el.subtext;
      if(el.link !== undefined){
        newSubText.link = el.link;
      }else{
        newSubText.link = null;
      }
      nowSub.text.push(newSubText);
    }
  })
}

let helpUrl = "./src/GridaBoard/components/helpMenu/"
fs.writeFileSync(helpUrl + "textData.json", JSON.stringify(data, null, 4));

console.log("transform text xlsx to text json");