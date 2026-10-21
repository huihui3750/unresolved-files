/* V49: single conversation stream for scripted topics and Gemini. Original story logic unchanged. */
(()=>{'use strict';
const panel=document.querySelector('.testimony'),character=document.querySelector('.v16-character');
const fixed=document.getElementById('interview-fixed-panel'),ai=document.getElementById('interview-ai-panel');
const history=document.getElementById('ai-chat-history'),topics=document.getElementById('topic-list');
const statement=document.getElementById('statement'),feedback=document.getElementById('interrogation-feedback');
if(!panel||!fixed||!ai||!history||!topics||!statement)return;
const log=document.createElement('section');log.id='v49-chat-log';log.setAttribute('role','log');log.setAttribute('aria-label','人物訊問對話紀錄');
const title=document.createElement('h4');title.textContent='訊問紀錄';
const placeholder=document.createElement('p');placeholder.className='v49-placeholder';placeholder.textContent='請選擇話題，或在下方輸入想詢問的問題。';
log.append(title,placeholder);
character.after(log);
const topicHeading=document.createElement('h4');topicHeading.textContent='選擇話題';topics.before(topicHeading);
// Move Gemini's actual chat history into the same conversation panel, preserving its existing listeners.
log.append(history);
const originalParent=fixed.parentElement;
originalParent.insertBefore(topics,ai);
originalParent.insertBefore(document.getElementById('rebuttal'),ai);
originalParent.insertBefore(feedback,ai);
const rebuttal=document.getElementById('rebuttal');
const questionForm=document.getElementById('ai-question-form');
const hint=document.querySelector('.v45-interview-hint');if(hint)hint.textContent='固定話題、自由提問與證物反駁都會記錄在同一份對話中。';
// Keep the original statement node active for game logic, but render its contents as chat bubbles.
fixed.classList.add('v49-hidden-source');
let current='',lastStatement='',lastFeedback='';
const scriptLog=new Map();
function speaker(){return document.getElementById('witness-name')?.textContent||'受訪者'}
function add(role,text,kind){if(!text||text==='尚未選擇證詞。'||text==='請選擇一個話題開始詢問。')return;
 const entry=document.createElement('div');entry.className='v49-message '+(kind||'character');
 const who=document.createElement('small');who.textContent=role;
 const body=document.createElement('p');body.textContent=text;
 entry.append(who,body);log.insertBefore(entry,history);placeholder.hidden=true;
 log.scrollTop=log.scrollHeight;
}
function sync(){const name=speaker();if(name!==current){current=name;lastStatement='';lastFeedback='';
 log.querySelectorAll('.v49-message').forEach(x=>x.remove());placeholder.hidden=false;}
 const st=statement.textContent.trim();if(st&&st!==lastStatement){lastStatement=st;add(name,st,'character')}
 const fb=feedback.textContent.trim();if(fb&&fb!==lastFeedback){lastFeedback=fb;
 if(fb.length>12&&!/已記錄證言|這段證詞可能有矛盾/.test(fb))add('調查紀錄',fb,'system');}
}
// Existing script updates are synchronous. Observe text changes instead of rewriting case rules.
const observer=new MutationObserver(()=>queueMicrotask(sync));
observer.observe(statement,{childList:true,characterData:true,subtree:true});
observer.observe(feedback,{childList:true,characterData:true,subtree:true});
const witnessList=document.getElementById('witness-list');
witnessList?.addEventListener('click',()=>queueMicrotask(sync));
topics.addEventListener('click',e=>{const button=e.target.closest('button');if(!button||button.disabled)return;
 const label=button.textContent.replace(/^[✓•]\s*/, '').trim();add('你','關於「'+label+'」，你能說明嗎？','user');queueMicrotask(sync)});
document.getElementById('submit-rebuttal')?.addEventListener('click',()=>{const select=document.getElementById('rebuttal-evidence');const text=select?.selectedOptions?.[0]?.textContent;
 if(select?.value)add('你','我想出示證物：「'+text+'」。','user');queueMicrotask(sync)});
// One scrolling conversation area; AI bubbles remain in their original log for persistence.
log.addEventListener('DOMNodeInserted',()=>{log.scrollTop=log.scrollHeight});
queueMicrotask(sync);
})();
