const C=LearningCore;
const people=[{e:'🐰',n:'小兔'},{e:'🐻',n:'小熊'},{e:'🦊',n:'小狐狸'},{e:'🐼',n:'小熊猫'}];
const colors=['红色','蓝色','黄色','绿色'];
const levels=[
 {cars:2,sol:[0,null],text:'请把小兔放进红色车厢'},
 {cars:2,sol:[1,0],text:'先把小熊放进红色车厢，再把小兔放进蓝色车厢'},
 {cars:3,sol:[null,2,1],text:'把小狐狸放进蓝色车厢，再把小熊放进黄色车厢'},
 {cars:3,sol:[2,0,1],text:'先送小狐狸去红色车厢，再送小兔去蓝色车厢，最后送小熊去黄色车厢'},
 {cars:3,sol:[1,2,0],text:'小熊坐红色车厢，小狐狸坐蓝色车厢，小兔坐最后一节车厢'},
 {cars:4,sol:[3,null,0,2],text:'先把小熊猫放进红色车厢，再把小兔放进黄色车厢，最后把小狐狸放进绿色车厢'},
 {cars:4,sol:[2,1,3,0],text:'小狐狸第一，小熊第二，小熊猫第三，小兔最后'},
 {cars:4,sol:[1,3,0,2],text:'先送小兔去黄色车厢，再送小熊去红色车厢，然后送小狐狸去绿色车厢，最后送小熊猫去蓝色车厢'},
 {cars:4,sol:[3,0,2,1],text:'小熊猫在最前面，小熊在最后面，小兔在小熊猫后面，小狐狸在小兔后面'},
 {cars:4,sol:[2,3,1,0],text:'请按顺序完成：小狐狸进红色车厢，小熊猫进蓝色车厢，小熊进黄色车厢，小兔进绿色车厢'}
];
let level=0,selected=null,slots=[];
const $=s=>document.querySelector(s),E={progress:$('#progress'),pill:$('#levelPill'),task:$('#task'),train:$('#train'),tray:$('#tray'),feedback:$('#feedback'),overlay:$('#overlay'),result:$('#resultText'),next:$('#next')};
function start(){level=0;C.show('game');load()}
function load(){const l=levels[level];slots=Array(l.cars).fill(null);selected=null;E.overlay.classList.remove('show');E.pill.textContent=`第${level+1}关`;E.task.textContent=level<3?'听语音，把乘客送上车':'记住顺序，完成列车长的任务';C.progress(E.progress,level);render();C.feedback(E.feedback,'先听一听列车长怎么说。');setTimeout(()=>C.speak(l.text),350)}
function render(){const l=levels[level];E.train.style.setProperty('--cars',l.cars);E.train.innerHTML=slots.map((id,i)=>`<button class="train-slot" data-i="${i}"><span class="label">${colors[i]}车厢</span>${id===null?'':people[id].e}</button>`).join('');E.train.querySelectorAll('button').forEach(b=>b.onclick=()=>place(+b.dataset.i));const available=[...new Set(l.sol.filter(x=>x!==null))];E.tray.innerHTML=available.map(id=>`<button class="train-piece${slots.includes(id)?' used':''}${selected===id?' selected':''}" data-id="${id}" ${slots.includes(id)?'disabled':''}>${people[id].e}</button>`).join('');E.tray.querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=+b.dataset.id;render();C.feedback(E.feedback,`选中了${people[selected].n}，点它要坐的车厢。`)})}
function place(i){if(selected===null){if(slots[i]!==null){selected=slots[i];slots[i]=null;render()}return}const old=slots[i];slots[i]=selected;selected=old;render()}
function check(){const sol=levels[level].sol;if(sol.every((x,i)=>x===slots[i])){C.win({overlay:E.overlay,textEl:E.result,text:`你听懂了第${level+1}个列车任务。`,nextButton:E.next,level});return}const wrong=sol.findIndex((x,i)=>x!==slots[i]);C.feedback(E.feedback,`${colors[wrong]}车厢还需要想一想，重听一次吧。`,'hint');E.train.children[wrong]?.classList.add('wrong');C.speak(levels[level].text)}
function hint(){const sol=levels[level].sol,i=sol.findIndex((x,j)=>x!==slots[j]);if(i<0)return;const wanted=sol[i];if(wanted===null){slots[i]=null}else{const old=slots.indexOf(wanted);if(old>=0)slots[old]=slots[i];slots[i]=wanted}selected=null;render();C.feedback(E.feedback,`${colors[i]}车厢安排好了。`,'good')}
function next(){if(level===9){E.overlay.classList.remove('show');C.show('finish');C.speak('恭喜你成为金牌列车长');return}level++;load()}
$('#start').onclick=start;$('#again').onclick=start;$('#home').onclick=()=>C.show('welcome');$('#listen').onclick=()=>C.speak(levels[level].text);$('#reset').onclick=()=>{slots.fill(null);selected=null;render()};$('#hint').onclick=hint;$('#check').onclick=check;E.next.onclick=next;$('#soundW').onclick=$('#soundG').onclick=()=>C.toggle($('#soundW'),$('#soundG'));
