let CODE = `// 해당 파일은, 디플로이시 자동으로 새로 작성되므로, config.js 파일을 직접 수정하지 말것.`;
const fs = require('fs');


const fileName = "package.json";
let jsFileName = "gridaConfig.js";

let packs = fs.readFileSync(fileName);


packs = JSON.parse(packs);


console.log(packs.version);


CODE += `
window.GRIDA_VERSION = "${packs.version}";
console.log("%cGRIDA_VERSION : " + window.GRIDA_VERSION, "color:#FF9999;font-size:25px");
`


fs.writeFile("./src/"+jsFileName, CODE, (err) => {
  if (err) throw err
  console.log('Dev firebase.json Saved!')
})
console.log("config update");