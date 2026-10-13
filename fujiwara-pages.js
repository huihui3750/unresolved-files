(()=>{'use strict';
const pages=['investigate','interview','evidence','deduction','report'];
const labels={investigate:'點擊場景物品蒐集線索，底部可切換調查地點。',interview:'選擇人物與話題，利用證物指出證詞矛盾。',evidence:'查看線索板並關聯證物；右下角手札在所有頁面皆可使用。',deduction:'蒐集足夠證物後依序完成六項推理。',report:'完成六項推理並前往書房質問宗一郎後，才能取得結案報告。'};
const main=document.querySelector('#case-main'), nav=document.querySelector('#case-page-nav');if(!main||!nav)return;
const finale=document.querySelector('.finale'), ending=document.querySelector('#ending');
const report=document.createElement('section');report.className='case-page-report';report.dataset.casePage='report';report.innerHTML='<h2>結案報告</h2><p id="case-report-placeholder">調查尚未結束。完成六項推理並在書房提出最後質問後，結案內容將顯示於此。</p>';
main.append(report);
// Keep #ending inside its original section until game render; move it into report once, then render continues to update the same node.
if(ending)report.append(ending);
let current='';
function show(page,push){page=pages.includes(page)?page:'investigate';current=page;
 document.querySelectorAll('[data-case-page]').forEach(el=>{el.hidden=el.dataset.casePage!==page});
 nav.querySelectorAll('[data-page]').forEach(a=>{if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 const guide=document.querySelector('#case-page-guide');if(guide)guide.textContent=labels[page];
 const placeholder=document.querySelector('#case-report-placeholder');if(placeholder&&ending)placeholder.hidden=!ending.hidden;
 if(push){const u=new URL(location.href);u.searchParams.set('page',page);history.pushState({page},'',u)}
 window.scrollTo({top:0,behavior:'instant'});
}
nav.addEventListener('click',e=>{const a=e.target.closest('[data-page]');if(!a)return;e.preventDefault();show(a.dataset.page,true)});
window.addEventListener('popstate',()=>show(new URLSearchParams(location.search).get('page'),false));
// Game renders and updates ending independently; synchronize report placeholder on subsequent changes.
if(ending){new MutationObserver(()=>{const p=document.querySelector('#case-report-placeholder');if(p)p.hidden=!ending.hidden}).observe(ending,{attributes:true,attributeFilter:['hidden']});}
// When a conclusion is unlocked, keep it in the report tab and automatically switch to it.
if(ending){new MutationObserver(()=>{if(!ending.hidden&&current!=='report')show('report',true)}).observe(ending,{attributes:true,attributeFilter:['hidden']});}
show(new URLSearchParams(location.search).get('page'),false);
})();
