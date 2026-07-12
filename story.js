const C=LearningCore,$=s=>document.querySelector(s);
const levels=[
 {name:'种子长大了',cards:[['🌱','种下种子'],['🌿','长出嫩芽'],['🌻','开出花朵']]},
 {name:'下雨回家',cards:[['☁️','乌云来了'],['🌧️','开始下雨'],['☂️','撑伞回家']]},
 {name:'做三明治',cards:[['🍞','准备面包'],['🥬','放上蔬菜'],['🥪','做好三明治']]},
 {name:'小鸡出生',cards:[['🥚','鸡蛋摇动'],['🐣','破壳而出'],['🐥','小鸡走路']]},
 {name:'雪人融化',cards:[['⛄','堆好雪人'],['☀️','太阳出来'],['💧','雪人融化']]},
 {name:'小兔洗手',cards:[['👐','手弄脏了'],['🧼','使用肥皂'],['✨','双手干净']],tip:'为什么要使用肥皂？'},
 {name:'准备生日会',cards:[['🎈','布置气球'],['🎂','端上蛋糕'],['🎁','分享礼物'],['🥳','一起庆祝']]},
 {name:'蝴蝶的成长',cards:[['🥚','叶上小卵'],['🐛','变成幼虫'],['🟤','结成蛹'],['🦋','变成蝴蝶']]},
 {name:'去图书馆',cards:[['🎒','整理书包'],['🚌','乘车出发'],['📚','认真阅读'],['🏠','带书回家']]},
 {name:'救助小树',cards:[['🥀','小树口渴'],['🪣','接一桶水'],['💦','给树浇水'],['🌳','小树精神了']],tip:'小树为什么又精神了？'}
];
let level=0,slots=[],selected=null,order=[];const E={progress:$('#progress'),pill:$('#pill'),name:$('#storyName'),strip:$('#strip'),tray:$('#tray'),feedback:$('#feedback'),overlay:$('#overlay'),result:$('#resultText'),next:$('#next')};
function shuffled(n,seed){const a=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){const j=(seed*7+i*3)%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function start(){level=0;C.show('game');load()}
function load(){const l=levels[level];slots=Array(l.cards.length).fill(null);selected=null;order=shuffled(l.cards.length,level+2);E.overlay.classList.remove('show');E.pill.textContent=`第${level+1}关`;E.name.textContent=l.name;C.progress(E.progress,level);render();C.feedback(E.feedback,'先观察图片，再选择第一张。')}
function render(){const l=levels[level];E.strip.style.setProperty('--cards',l.cards.length);E.strip.innerHTML=slots.map((id,i)=>`<button class="story-slot${id===null?'':' filled'}" data-i="${i}">${id===null?`<b style="font-size:20px;color:#9d9270">第${i+1}张</b>`:`${l.cards[id][0]}<small>${l.cards[id][1]}</small>`}</button>`).join('');E.strip.querySelectorAll('button').forEach(b=>b.onclick=()=>place(+b.dataset.i));E.tray.innerHTML=order.map(id=>`<button class="story-card${slots.includes(id)?' used':''}${selected===id?' selected':''}" data-id="${id}" aria-label="${l.cards[id][1]}，点击选择并播报" ${slots.includes(id)?'disabled':''}>${l.cards[id][0]}<small>${l.cards[id][1]}</small></button>`).join('');E.tray.querySelectorAll('button').forEach(b=>b.onclick=()=>{const cardId=+b.dataset.id;selected=cardId;render();C.feedback(E.feedback,`选择了“${l.cards[cardId][1]}”，把它放进故事。`);C.speak(l.cards[cardId][1])})}
function place(i){if(selected===null){if(slots[i]!==null){selected=slots[i];slots[i]=null;render()}return}const old=slots[i];slots[i]=selected;selected=old;render()}
function storyText(){const l=levels[level],steps=l.cards.map(x=>x[1]);const middle=steps.slice(1,-1).map((step,i)=>`${i===0?'接着':'然后'}${step}`).join('，');return `${l.name}。先${steps[0]}，${middle}，最后${steps[steps.length-1]}。`}
function check(){if(slots.every((x,i)=>x===i)){const text=storyText();C.win({overlay:E.overlay,textEl:E.result,text,nextButton:E.next,level,speech:text});return}const i=slots.findIndex((x,j)=>x!==j);C.feedback(E.feedback,`第${i+1}张还不太合适，想想什么事情应该先发生。`,'hint')}
function hint(){const i=slots.findIndex((x,j)=>x!==j);if(i<0)return;const old=slots.indexOf(i);if(old>=0)slots[old]=slots[i];slots[i]=i;selected=null;render();C.feedback(E.feedback,`第${i+1}张是“${levels[level].cards[i][1]}”。`,'good')}
function next(){if(level===9){E.overlay.classList.remove('show');C.show('finish');C.speak('恭喜你成为小小故事家');return}level++;load()}
$('#start').onclick=start;$('#again').onclick=start;$('#home').onclick=()=>C.show('welcome');$('#listen').onclick=()=>C.speak(levels[level].tip||`请想一想，${levels[level].cards[0][1]}之后会发生什么`);$('#reset').onclick=()=>{slots.fill(null);selected=null;render()};$('#hint').onclick=hint;$('#check').onclick=check;E.next.onclick=next;$('#soundW').onclick=$('#soundG').onclick=()=>C.toggle($('#soundW'),$('#soundG'));
