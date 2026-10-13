/* Gemini 自由詢問：各人物獨立對話，請求超時可重試，不影響本地通關。 */
(()=>{'use strict';
const form=document.getElementById('ai-question-form');if(!form)return;
const history=document.getElementById('ai-chat-history'),status=document.getElementById('ai-status');
const question=document.getElementById('ai-question'),send=document.getElementById('ai-send');
const STORE='fujiwara_chat_v35';let logs={};try{const saved=JSON.parse(localStorage.getItem(STORE)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))logs=saved}catch{}let busy=false,lastCharacter='';
const fixedTab=document.getElementById('interview-fixed-tab'),aiTab=document.getElementById('interview-ai-tab');
const fixedPanel=document.getElementById('interview-fixed-panel'),aiPanel=document.getElementById('interview-ai-panel');
function showMode(mode){const ai=mode==='ai';fixedPanel.hidden=ai;aiPanel.hidden=!ai;fixedTab.setAttribute('aria-selected',String(!ai));aiTab.setAttribute('aria-selected',String(ai));}
fixedTab.addEventListener('click',()=>showMode('fixed'));aiTab.addEventListener('click',()=>showMode('ai'));showMode('fixed');
function character(){return typeof selectedWitness==='string'?selectedWitness:'mio'}
function label(id){return typeof WITNESSES==='object'&&WITNESSES[id]?WITNESSES[id].name:'受訪者'}
function append(id,role,message){(logs[id]??=[]).push({role,message});try{localStorage.setItem(STORE,JSON.stringify(logs))}catch{}if(character()===id)render()}
function render(){const id=character();if(lastCharacter!==id){lastCharacter=id;status.textContent='目前正在詢問：'+label(id)}history.replaceChildren();for(const entry of logs[id]||[]){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=entry.role+'：';p.className='ai-bubble '+(entry.role==='你'?'ai-user':'ai-character');p.append(strong,document.createTextNode(entry.message));history.append(p)}history.scrollTop=history.scrollHeight}
const witnessList=document.getElementById('witness-list');witnessList?.addEventListener('click',()=>queueMicrotask(render));
form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;
 const id=character(),name=label(id),text=question.value.trim();if(!text||text.length>400)return;
 busy=true;send.disabled=true;status.textContent='正在等待 '+name+' 回答……';append(id,'你',text);question.value='';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch('/api/fujiwara/interview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({character:id,question:text}),signal:controller.signal});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'詢問失敗');
 append(id,name,data.answer||'（沒有收到回答）');
 let added=0;for(const note of data.key_testimonies||[]){
  if(typeof state!=='undefined'&&Array.isArray(state.notes)&&note.id&&note.title&&note.body&&!state.notes.some(n=>n.id===note.id)){
   state.notes.push({id:note.id,title:note.title,body:note.body});added++;
  }
 }
 if(added&&typeof window.refreshFujiwaraCase==='function')window.refreshFujiwaraCase();
 status.textContent=added?'關鍵證言已記入調查手札（待查證）。':'對話已記錄；正式證物與推理仍需調查。';
 }catch(error){const msg=error.name==='AbortError'?'詢問逾時，請稍後重試。':(error.message||'連線失敗');append(id,'系統',msg);status.textContent=msg}
 finally{clearTimeout(timeout);busy=false;send.disabled=false;question.focus()}
});render();
})();
