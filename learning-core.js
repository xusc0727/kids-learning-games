window.LearningCore={
  sound:true,
  speak(text){if(!this.sound||!("speechSynthesis" in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="zh-CN";u.rate=.78;u.pitch=1.1;speechSynthesis.speak(u)},
  tone(){if(!this.sound)return;[523,659,784].forEach((f,i)=>setTimeout(()=>{try{const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.setValueAtTime(.09,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.22);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.23)}catch(_){}},i*105))},
  show(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.querySelector(`#${name}`).classList.add('active');scrollTo({top:0,behavior:'smooth'})},
  progress(el,level,total=10){el.innerHTML=Array.from({length:total},(_,i)=>`<i class="${i<level?'done':i===level?'now':''}"></i>`).join('')},
  feedback(el,text,type=''){el.textContent=text;el.className=`feedback${type?` ${type}`:''}`},
  toggle(...buttons){this.sound=!this.sound;if(!this.sound&&'speechSynthesis'in window)speechSynthesis.cancel();buttons.forEach(b=>{b.textContent=this.sound?(b.classList.contains('circle')?'🔊':'🔊 声音开着'):(b.classList.contains('circle')?'🔇':'🔇 声音关了')})},
  win({overlay,textEl,text,nextButton,level,total=10,speech='做得好，这一关完成啦'}){this.tone();textEl.textContent=text;nextButton.querySelector('span').textContent=level===total-1?'领取奖章':'下一关';setTimeout(()=>{overlay.classList.add('show');this.speak(speech)},350)}
};
