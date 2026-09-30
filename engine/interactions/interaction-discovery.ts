import type { Page } from "playwright";
import type { PageInteraction } from "../models/page-capture.ts";
const INTERACTIVE_SELECTOR=["a[href]","button","input","select","textarea","[role='button']","[role='link']","[role='tab']","[role='checkbox']","[role='radio']","[role='switch']","[role='menuitem']","[role='option']","[role='combobox']","[aria-controls]"].join(",");
const BLOCKED_ACTION_PATTERN=/\b(delete|destroy|purchase|buy now|checkout|pay|payment|place order|unsubscribe|cancel subscription|sign out|log out|logout)\b/i;
function classify(i: Omit<PageInteraction,"normalizedBounds"|"executionSafety"|"executionReason">): Pick<PageInteraction,"executionSafety"|"executionReason"> {
 if(i.disabled)return{executionSafety:"blocked",executionReason:"The control is disabled."};
 const d=`${i.accessibleName} ${i.visibleText}`.trim();
 if(BLOCKED_ACTION_PATTERN.test(d))return{executionSafety:"blocked",executionReason:"The control appears destructive, transactional, or session-ending."};
 if(i.elementType==="input"&&i.inputType==="file")return{executionSafety:"blocked",executionReason:"File selection requires external data and is not executed automatically."};
 const isFormAction=Boolean(i.formAction)&&((i.elementType==="button"&&(i.inputType==="submit"||i.inputType==="reset"))||(i.elementType==="input"&&["submit","image","reset"].includes(i.inputType??"")));
 if(isFormAction)return{executionSafety:"review",executionReason:"This appears to submit or reset a form. Review it before allowing execution."};
 if(i.href){try{const p=new URL(i.href).protocol;if(!["http:","https:"].includes(p))return{executionSafety:"review",executionReason:`Navigation uses ${p}; review before execution.`};}catch{return{executionSafety:"review",executionReason:"The navigation target could not be validated; review before execution."};}}
 return{executionSafety:"safe",executionReason:"No known side effect was detected."};
}
export async function discoverInteractions(page:Page,documentSize:{width:number;height:number}):Promise<PageInteraction[]>{
 const observed=await page.locator(INTERACTIVE_SELECTOR).evaluateAll((elements)=>{
  function selectorFor(element:Element){if(element.id)return `#${CSS.escape(element.id)}`;const t=element.getAttribute("data-testid");if(t)return `[data-testid="${CSS.escape(t)}"]`;const parts:string[]=[];let c:Element|null=element;while(c&&parts.length<5){let part=c.tagName.toLowerCase();const p=c.parentElement;if(p){const same=Array.from(p.children).filter(x=>x.tagName===c?.tagName);if(same.length>1)part+=`:nth-of-type(${same.indexOf(c)+1})`;}parts.unshift(part);c=p;}return parts.join(" > ");}
  function visibleTextFor(e:Element){if(e instanceof HTMLInputElement)return e.value||e.placeholder||"";return(e.textContent??"").replace(/\s+/g," ").trim().slice(0,300);}
  function nameFor(e:Element,v:string){const a=e.getAttribute("aria-label")?.trim();if(a)return a;const lb=e.getAttribute("aria-labelledby");if(lb){const s=lb.split(/\s+/).map(id=>document.getElementById(id)?.textContent?.trim()??"").filter(Boolean).join(" ");if(s)return s;}if(e instanceof HTMLInputElement&&e.labels?.length){const s=Array.from(e.labels).map(x=>x.textContent?.trim()??"").filter(Boolean).join(" ");if(s)return s;}return e.getAttribute("title")?.trim()||v;}
  return elements.flatMap((e,index)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(!(r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)!==0))return[];const v=visibleTextFor(e),h=e as HTMLElement,href=e instanceof HTMLAnchorElement?e.href:null,disabled=(("disabled" in h)&&Boolean((h as HTMLButtonElement).disabled))||e.getAttribute("aria-disabled")==="true",form=h.closest("form"),inputType=e instanceof HTMLButtonElement||e instanceof HTMLInputElement?e.type||null:null;return[{id:`interaction-${index+1}`,elementType:e.tagName.toLowerCase(),role:e.getAttribute("role"),accessibleName:nameFor(e,v),visibleText:v,href,disabled,formAction:form instanceof HTMLFormElement?form.action||null:null,formMethod:form instanceof HTMLFormElement?form.method||null:null,inputType,locator:{tagName:e.tagName.toLowerCase(),id:e.id||null,name:e.getAttribute("name"),testId:e.getAttribute("data-testid"),selector:selectorFor(e)},bounds:{x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height}}];});
 });
 return observed.map(i=>({...i,...classify(i),normalizedBounds:{xRatio:i.bounds.x/documentSize.width,yRatio:i.bounds.y/documentSize.height,widthRatio:i.bounds.width/documentSize.width,heightRatio:i.bounds.height/documentSize.height}}));
}
