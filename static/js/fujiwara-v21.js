/* V21 visual-only enhancement: does not alter investigation state or save format. */
(()=>{'use strict';
 const portrait=document.getElementById('v16-portrait');
 const scene=document.getElementById('v17-stage-portrait');
 const panel=document.querySelector('.v17-stage-panel');
 const title=document.getElementById('v17-scene-title');
 const statement=document.getElementById('statement');
 if(!portrait||!scene||!panel)return;
 const pulse=(el)=>{if(!el)return;el.classList.remove('v21-enter');void el.offsetWidth;el.classList.add('v21-enter')};
 new MutationObserver(()=>pulse(scene)).observe(scene,{attributes:true,attributeFilter:['data-speaker']});
 if(title)new MutationObserver(()=>{scene.dataset.emotion=title.textContent||'';pulse(panel)}).observe(title,{childList:true,characterData:true,subtree:true});
 if(statement)new MutationObserver(()=>{portrait.classList.add('v21-speaking');window.clearTimeout(portrait._v21Timer);portrait._v21Timer=window.setTimeout(()=>portrait.classList.remove('v21-speaking'),650)}).observe(statement,{childList:true,characterData:true,subtree:true});
})();
