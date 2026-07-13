import { DOMAINS, FIXED_STORIES } from "./data/stories.js";

const STORAGE={history:"playmori.story.history.v1",favorites:"playmori.story.favorites.v1"};
const readStorage=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const writeStorage=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
const state={domain:"all",history:readStorage(STORAGE.history,[]),favorites:new Set(readStorage(STORAGE.favorites,[])),currentStory:null};
const domainMap=new Map(DOMAINS.map(domain=>[domain.id,domain]));
const $=selector=>document.querySelector(selector);
const elements={filters:$("#domainFilters"),grid:$("#storyGrid"),count:$("#storyCount"),form:$("#storyForm"),event:$("#event"),eventCount:$("#eventCount"),formError:$("#formError"),generateButton:$("#generateButton"),apiStatus:$("#apiStatus"),historyList:$("#historyList"),clearHistory:$("#clearHistory"),dialog:$("#readerDialog"),readerDomain:$("#readerDomain"),readerTitle:$("#readerTitle"),readerGoal:$("#readerGoal"),readerStory:$("#readerStory"),readerQuestions:$("#readerQuestions"),readerAction:$("#readerAction"),readerTip:$("#readerTip"),favoriteButton:$("#favoriteButton")};

function domainForStory(story){
  if(domainMap.has(story.domain))return domainMap.get(story.domain);
  return DOMAINS.find(item=>story.domain?.includes(item.short))||DOMAINS[3];
}
function createFilter(domain){
  const button=document.createElement("button");button.type="button";button.className=`domain-filter${state.domain===domain.id?" active":""}`;
  button.innerHTML=`<i style="background:${domain.color}">${domain.mark}</i><span>${domain.label}</span>`;
  button.addEventListener("click",()=>{state.domain=domain.id;renderFilters();renderStories()});return button;
}
function renderFilters(){elements.filters.replaceChildren(...DOMAINS.map(createFilter))}
function createStoryCard(story,index=0){
  const domain=domainForStory(story),card=document.createElement("button");card.type="button";card.className="story-card";card.style.setProperty("--domain",domain.color);card.style.animationDelay=`${Math.min(index,8)*55}ms`;
  const meta=document.createElement("div");meta.className="story-card-meta";meta.innerHTML=`<span class="story-card-domain">${domain.label}</span><span>${story.age||"个性故事"} · ${story.duration||"约5分钟"}</span>`;
  const title=document.createElement("h3");title.textContent=story.title;const summary=document.createElement("p");summary.textContent=story.summary;
  const footer=document.createElement("footer");footer.innerHTML=`<span>${state.favorites.has(story.id)?"♥ 已收藏":"打开故事"}</span><span>↗</span>`;
  card.append(meta,title,summary,footer);card.addEventListener("click",()=>openStory(story));return card;
}
function renderStories(){const stories=state.domain==="all"?FIXED_STORIES:FIXED_STORIES.filter(story=>story.domain===state.domain);elements.count.textContent=`${stories.length} 篇`;elements.grid.replaceChildren(...stories.map(createStoryCard))}
function renderHistory(){
  if(!state.history.length){const empty=document.createElement("div");empty.className="empty-history";empty.textContent="还没有个性故事。把今天发生的一件小事写下来吧。";elements.historyList.replaceChildren(empty);elements.clearHistory.hidden=true;return}
  elements.clearHistory.hidden=false;elements.historyList.replaceChildren(...state.history.map(story=>{const item=document.createElement("button");item.type="button";item.className="history-item";const copy=document.createElement("div"),domain=domainForStory(story);copy.innerHTML=`<p>${domain.label} · ${new Date(story.createdAt).toLocaleDateString("zh-CN")}</p>`;const title=document.createElement("h3");title.textContent=story.title;copy.append(title);const arrow=document.createElement("span");arrow.textContent="↗";item.append(copy,arrow);item.addEventListener("click",()=>openStory(story));return item}))
}
function openStory(story){
  state.currentStory=story;const domain=domainForStory(story);elements.dialog.style.setProperty("--domain",domain.color);elements.readerDomain.textContent=`${domain.label} · ${story.source==="ai"?"为孩子写下":story.age}`;elements.readerTitle.textContent=story.title;elements.readerGoal.textContent=`给大人看的成长目标：${story.learningGoal}`;
  elements.readerStory.replaceChildren(...story.story.map(text=>{const p=document.createElement("p");p.textContent=text;return p}));elements.readerQuestions.replaceChildren(...story.questions.map(text=>{const li=document.createElement("li");li.textContent=text;return li}));elements.readerAction.textContent=story.action;elements.readerTip.textContent=`给大人的提示：${story.parentTip}`;updateFavoriteButton();elements.dialog.showModal();elements.dialog.querySelector(".reader-paper").scrollTop=0;
}
function updateFavoriteButton(){const saved=state.currentStory&&state.favorites.has(state.currentStory.id);elements.favoriteButton.classList.toggle("saved",saved);elements.favoriteButton.textContent=saved?"♥ 已收藏这个故事":"♡ 收藏这个故事"}
function toggleFavorite(){if(!state.currentStory)return;state.favorites.has(state.currentStory.id)?state.favorites.delete(state.currentStory.id):state.favorites.add(state.currentStory.id);writeStorage(STORAGE.favorites,[...state.favorites]);updateFavoriteButton();renderStories()}
async function checkApi(){
  try{const response=await fetch("/api/health");if(!response.ok)throw new Error();const data=await response.json();elements.apiStatus.className=`api-status ${data.deepseekConfigured?"ready":"missing"}`;elements.apiStatus.querySelector("span").textContent=data.deepseekConfigured?`故事写作服务已就绪 · ${data.model}`:"DeepSeek Key 尚未配置，固定故事仍可阅读"}
  catch{elements.apiStatus.className="api-status missing";elements.apiStatus.querySelector("span").textContent="请使用 npm start 启动，AI 生成功能才能使用"}
}
function setGenerating(active){elements.generateButton.disabled=active;elements.generateButton.querySelector(".button-label").textContent=active?"正在写故事…":"写下这个故事";elements.generateButton.querySelector(".button-mark").textContent=active?"···":"✦"}
async function submitStory(event){
  event.preventDefault();elements.formError.textContent="";const data=Object.fromEntries(new FormData(elements.form));if((data.event||"").trim().length<8){elements.formError.textContent="请用至少 8 个字描述最近发生的事情。";elements.event.focus();return}
  setGenerating(true);try{const response=await fetch("/api/stories/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error||"故事生成失败，请稍后再试");state.history=[result.story,...state.history.filter(item=>item.id!==result.story.id)].slice(0,12);writeStorage(STORAGE.history,state.history);renderHistory();openStory(result.story)}catch(error){elements.formError.textContent=error.message}finally{setGenerating(false)}
}
document.querySelectorAll("[data-scroll]").forEach(button=>button.addEventListener("click",()=>document.getElementById(button.dataset.scroll)?.scrollIntoView({behavior:"smooth"})));
$("#closeReader").addEventListener("click",()=>elements.dialog.close());elements.dialog.addEventListener("click",event=>{if(event.target===elements.dialog)elements.dialog.close()});elements.favoriteButton.addEventListener("click",toggleFavorite);elements.form.addEventListener("submit",submitStory);elements.event.addEventListener("input",()=>{elements.eventCount.textContent=`${elements.event.value.length} / 500`});elements.clearHistory.addEventListener("click",()=>{if(!confirm("清空当前设备上生成的故事记录吗？"))return;state.history=[];writeStorage(STORAGE.history,state.history);renderHistory()});
renderFilters();renderStories();renderHistory();checkApi();
