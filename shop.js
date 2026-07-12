const C=LearningCore,$=s=>document.querySelector(s);
const goods=[{e:'🍎',n:'苹果'},{e:'🍌',n:'香蕉'},{e:'🥕',n:'胡萝卜'},{e:'🍓',n:'草莓'}];
const levels=[
 {want:[2,0,0,0],text:'请买2个苹果'},
 {want:[0,3,0,0],text:'请买3根香蕉'},
 {want:[1,0,2,0],text:'请买1个苹果和2根胡萝卜'},
 {want:[0,2,0,3],text:'请买2根香蕉和3颗草莓'},
 {want:[2,1,2,0],text:'请买2个苹果、1根香蕉和2根胡萝卜'},
 {want:[1,2,0,3],text:'请买1个苹果、2根香蕉和3颗草莓'},
 {want:[3,0,2,1],text:'小兔要3个苹果，小鹿要2根胡萝卜，再给小鸟1颗草莓'},
 {want:[2,2,2,0],text:'请让苹果、香蕉和胡萝卜一样多，每种都买2个'},
 {want:[1,3,2,1],text:'请买3根香蕉，胡萝卜比香蕉少1根，再买1个苹果和1颗草莓'},
 {want:[2,1,3,2],text:'购物挑战：2个苹果、1根香蕉、3根胡萝卜和2颗草莓'}
];
let level=0,basket=[];const E={progress:$('#progress'),pill:$('#pill'),task:$('#task'),note:$('#note'),shelf:$('#shelf'),basket:$('#basket'),feedback:$('#feedback'),overlay:$('#overlay'),result:$('#resultText'),next:$('#next')};
function start(){level=0;C.show('game');load()}
function load(){basket=[];E.overlay.classList.remove('show');E.pill.textContent=`第${level+1}关`;E.task.textContent=level<4?'数清商品，完成清单':'听懂数量关系，完成清单';E.note.textContent=levels[level].text;C.progress(E.progress,level);render();C.feedback(E.feedback,'点商品就能放进购物篮。');setTimeout(()=>C.speak(levels[level].text),350)}
function render(){E.shelf.innerHTML=goods.map((g,i)=>`<button class="shop-item" data-id="${i}">${g.e}<b>${g.n}</b></button>`).join('');E.shelf.querySelectorAll('button').forEach(b=>b.onclick=()=>{basket.push(+b.dataset.id);renderBasket()});renderBasket()}
function renderBasket(){E.basket.innerHTML=basket.map((id,i)=>`<button aria-label="拿出${goods[id].n}" data-i="${i}" style="border:0;background:transparent;font-size:40px">${goods[id].e}</button>`).join('');E.basket.querySelectorAll('button').forEach(b=>b.onclick=()=>{basket.splice(+b.dataset.i,1);renderBasket()})}
function counts(){return goods.map((_,i)=>basket.filter(x=>x===i).length)}
function check(){const now=counts(),want=levels[level].want;if(now.every((n,i)=>n===want[i])){C.win({overlay:E.overlay,textEl:E.result,text:`购物篮里一共有${basket.length}件商品。`,nextButton:E.next,level});return}const i=want.findIndex((n,j)=>n!==now[j]);const msg=now[i]<want[i]?`${goods[i].n}还少${want[i]-now[i]}个。`:`${goods[i].n}多了${now[i]-want[i]}个，可以点购物篮把它拿出来。`;C.feedback(E.feedback,msg,'hint');C.speak(msg)}
function hint(){const now=counts(),want=levels[level].want,i=want.findIndex((n,j)=>n!==now[j]);if(i<0)return;if(now[i]<want[i])basket.push(i);else basket.splice(basket.lastIndexOf(i),1);renderBasket();C.feedback(E.feedback,`${goods[i].n}的数量更接近清单啦。`,'good')}
function next(){if(level===9){E.overlay.classList.remove('show');C.show('finish');C.speak('恭喜你成为森林超市小达人');return}level++;load()}
$('#start').onclick=start;$('#again').onclick=start;$('#home').onclick=()=>C.show('welcome');$('#listen').onclick=()=>C.speak(levels[level].text);$('#reset').onclick=()=>{basket=[];renderBasket()};$('#hint').onclick=hint;$('#check').onclick=check;E.next.onclick=next;$('#soundW').onclick=$('#soundG').onclick=()=>C.toggle($('#soundW'),$('#soundG'));
