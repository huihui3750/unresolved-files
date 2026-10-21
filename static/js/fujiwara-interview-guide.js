/* CASE 001 · V44 訊問引導：僅提供操作引導，不改變劇情與解鎖條件。 */
(()=>{'use strict';
const witnessList=document.getElementById('witness-list');
const form=document.getElementById('ai-question-form');
const input=document.getElementById('ai-question');
const topics=document.getElementById('topic-list');
if(!witnessList||!form||!input||!topics)return;
const prompts={
 mio:['你最後一次看見姊姊是什麼時候？','凜的日記記錄了什麼聲音？','你為什麼決定重新調查？'],
 shizue:['事故當晚你聽見了什麼？','你當時在哪裡？','你對宗一郎的行蹤知道多少？'],
 naoto:['暖氣管線為什麼會發出聲音？','建築圖面上有維修夾層嗎？','你是什麼時候開始在山莊工作的？'],
 souichiro:['東側客房真的只有一個入口嗎？','事故當晚你去過維修區嗎？','你和凜有過帳冊爭執嗎？']
};
const guide=document.createElement('section');guide.className='v44-interview-guide';
const heading=document.createElement('h4');heading.textContent='詢問提示';
const help=document.createElement('p');help.className='v44-help';
const buttons=document.createElement('div');buttons.className='v44-prompts';
const toFixed=document.createElement('button');toFixed.type='button';toFixed.textContent='查看可出示證物的固定話題';
toFixed.addEventListener('click',()=>{topics.scrollIntoView({block:'nearest',behavior:'smooth'});});
guide.append(heading,help,buttons,toFixed);form.before(guide);
const witness=()=>typeof selectedWitness==='string'&&prompts[selectedWitness]?selectedWitness:'mio';
function renderGuide(){
 const id=witness();buttons.replaceChildren();
 help.textContent='自由問答可補充角色觀點，但不會直接解鎖證物或完成反駁。請在固定話題中出示證物。';
 for(const q of prompts[id]){const b=document.createElement('button');b.type='button';b.textContent=q;
 b.addEventListener('click',()=>{input.value=q;input.scrollIntoView({block:'center',behavior:'smooth'});input.focus();});buttons.append(b);}
}
witnessList.addEventListener('click',()=>queueMicrotask(renderGuide));
renderGuide();
})();
