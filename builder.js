const C=LearningCore,$=s=>document.querySelector(s);
const names={circle:'圆形',ellipse:'椭圆形',square:'正方形',rect:'长方形',triangle:'三角形'};
const P=(t,x,y,w,h,r=0)=>({t,x,y,w,h,r});
const levels=[
 {name:'小房子',icon:'🏠',p:[P('square',32,47,36,36),P('triangle',27,13,46,35),P('rect',46,60,11,23)]},
 {name:'小树',icon:'🌳',p:[P('circle',29,8,42,42),P('circle',18,29,36,36),P('circle',48,30,34,34),P('rect',45,57,12,32)]},
 {name:'小汽车',icon:'🚗',p:[P('rect',20,40,60,26),P('square',36,18,28,28),P('circle',25,59,17,17),P('circle',59,59,17,17)]},
 {name:'雪人',icon:'⛄',p:[P('circle',34,8,32,32),P('circle',27,37,46,46),P('triangle',61,20,16,12),P('circle',43,18,5,5),P('circle',55,18,5,5)]},
 {name:'小火箭',icon:'🚀',p:[P('rect',38,25,24,48),P('triangle',38,2,24,25),P('triangle',25,58,18,23,-18),P('triangle',57,58,18,23,18),P('circle',44,36,12,12)]},
 {name:'机器人',icon:'🤖',p:[P('square',32,3,36,36),P('rect',28,40,44,37),P('rect',15,43,11,29),P('rect',74,43,11,29),P('rect',35,76,11,20),P('rect',54,76,11,20)]},
 {name:'帆船',icon:'⛵',p:[P('triangle',25,10,34,52),P('triangle',57,20,23,40),P('rect',49,8,4,65),P('triangle',23,65,58,22,180)]},
 {name:'小猫脸',icon:'🐱',p:[P('ellipse',27,22,46,55),P('triangle',27,6,22,25,-10),P('triangle',53,6,22,25,10),P('circle',40,42,6,6),P('circle',56,42,6,6)]},
 {name:'城堡',icon:'🏰',p:[P('rect',16,30,25,55),P('rect',59,30,25,55),P('rect',39,47,22,38),P('triangle',14,9,29,25),P('triangle',57,9,29,25),P('ellipse',46,66,8,14)]},
 {name:'欢乐列车',icon:'🚂',p:[P('rect',18,38,54,34),P('rect',55,20,25,52),P('rect',25,20,12,22),P('circle',22,64,18,18),P('circle',57,64,18,18),P('triangle',5,47,18,25,-90)]}
];
let level=0,placed=[],selected=null;const E={progress:$('#progress'),pill:$('#pill'),name:$('#buildName'),target:$('#target'),build:$('#build'),palette:$('#palette'),feedback:$('#feedback'),overlay:$('#overlay'),result:$('#resultText'),next:$('#next')};
function style(p){return `left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;transform:rotate(${p.r}deg)`}
function start(){level=0;C.show('game');load()}
function load(){placed=Array(levels[level].p.length).fill(false);selected=null;E.overlay.classList.remove('show');E.pill.textContent=`第${level+1}关`;E.name.textContent=levels[level].name;E.overlay.querySelector('.result-icon').textContent=levels[level].icon;C.progress(E.progress,level);render();C.feedback(E.feedback,'先选一种积木，再点右边相同形状的虚线位置。')}
function render(){const l=levels[level];E.target.innerHTML=l.p.map(p=>`<i class="geo ${p.t} target" style="${style(p)}"></i>`).join('');E.build.innerHTML=l.p.map((p,i)=>`<button aria-label="${names[p.t]}位置" data-i="${i}" class="geo ${p.t} outline${placed[i]?' filled':''}" style="${style(p)}"></button>`).join('');E.build.querySelectorAll('button').forEach(b=>b.onclick=()=>place(+b.dataset.i));const types=[...new Set(l.p.map(p=>p.t))];E.palette.innerHTML=types.map(t=>`<button data-t="${t}" class="shape-button${selected===t?' selected':''}"><i class="palette-icon ${t}"></i>${names[t]}</button>`).join('');E.palette.querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.t;render();C.feedback(E.feedback,`选中了${names[selected]}，在右边找相同的虚线。`)})}
function place(i){if(placed[i])return;if(!selected){C.feedback(E.feedback,'请先在下方选择一种积木。','hint');return}const need=levels[level].p[i].t;if(selected===need){placed[i]=true;render();C.feedback(E.feedback,`${names[need]}放对了！`,'good')}else{C.feedback(E.feedback,`这里需要${names[need]}，不是${names[selected]}。`,'hint');C.speak(`这里需要${names[need]}`)}}
function check(){if(placed.every(Boolean)){const counts={};levels[level].p.forEach(p=>counts[p.t]=(counts[p.t]||0)+1);const desc=Object.entries(counts).map(([t,n])=>`${n}个${names[t]}`).join('、');C.win({overlay:E.overlay,textEl:E.result,text:`${levels[level].name}用了${desc}。`,nextButton:E.next,level});return}C.feedback(E.feedback,`还缺少${placed.filter(x=>!x).length}块积木，仔细看看虚线。`,'hint')}
function hint(){const i=placed.findIndex(x=>!x);if(i<0)return;placed[i]=true;selected=null;render();C.feedback(E.feedback,`帮你放好了一块${names[levels[level].p[i].t]}。`,'good')}
function next(){if(level===9){E.overlay.classList.remove('show');C.show('finish');C.speak('恭喜你成为金牌图形建筑师');return}level++;load()}
$('#start').onclick=start;$('#again').onclick=start;$('#home').onclick=()=>C.show('welcome');$('#listen').onclick=()=>{const left=levels[level].p.filter((_,i)=>!placed[i]);const counts={};left.forEach(p=>counts[p.t]=(counts[p.t]||0)+1);C.speak(`还需要${Object.entries(counts).map(([t,n])=>`${n}个${names[t]}`).join('、')}`)};$('#reset').onclick=load;$('#hint').onclick=hint;$('#check').onclick=check;E.next.onclick=next;$('#soundW').onclick=$('#soundG').onclick=()=>C.toggle($('#soundW'),$('#soundG'));
