const groups = [
 ["Living room","હોલ",["1 Sofa|૧ સોફા","1 Tea table|૧ ટીપોઇ"]],
 ["Master bedroom (big)","મોટો બેડ રૂમ",["Double bed (1)|૧ ડબલ બેડ પલંગ","Side table (1)|૧ સાઈડ ટેબલ","Big cupboard, 4 doors + dressing table (6 keys)|મોટું કપાટ, ૪ બારણાં, ડ્રેસિંગ ટેબલ, ચાવી નંગ ૬","Mattress (1)|૧ ગાદલું"]],
 ["Guest bedroom (small)","મહેમાનનો રૂમ",["Double bed (1)|૧ ડબલ બેડ","Side table (1)|૧ સાઈડ ટેબલ","Small cupboard, 4 doors + dressing table (3 keys)|નાનું કપાટ, ૪ બારણાં, ડ્રેસિંગ ટેબલ, ચાવી નંગ ૩","Mattress (1)|૧ ગાદલું"]],
 ["Kitchen","રસોડું",["Gas connection with rubber pipe|ગેસ કનેક્શન, રબર ની પાઇપ","Gas stove, 2 burners, 1 lighter|ગેસની સગડી, બે બર્નર, એક લાઇટર","Kitchen drawers|રસોડામાં ખાનાં"]],
 ["Electrical","ઇલેક્ટ્રિકલ સાધનો",["5 fans|૫ પંખા","5 tube lights|૫ ટ્યુબ લાઇટ","3 small tube lights (bulbs)|૩ નાની ટ્યુબ લાઇટ (બલ્બ)","Geyser (1)|૧ ગીઝર","RO machine (1)|૧ આરઓ મશીન","All electric switches working|બધી ઇલેક્ટ્રિક સ્વિચ કામ કરે છે","Fridge (1)|૧ ફ્રિજ","Air conditioner (1)|૧ એર કંડીશન"]],
 ["Other","અન્ય",["Anything else in the flat|અન્ય"]],
 ["Cleaning","સફાઈ",["House cleaned|ઘરમાં સફાઈ કરેલ છે (હા / ના)"]]
];
const keys = [["Main door","મેઇન દરવાજો",2],["Bedroom doors (1+1)","બેડ રૂમ દરવાજા",2],["Big cupboard","મોટું કપાટ",6],["Small cupboard","નાનું કપાટ",3]];
const bills = ["Electric meter photo recorded","Gas meter photo recorded","Electric bills taken back from tenant","Gas bills taken back from tenant","Tax bills taken back from tenant"];
const billEntries = scope => bills.flatMap((label,index)=>index<2 ? [] :
 [[index,scope==="in"&&index>=2?["Last electric bill copy to tenant","Last gas bill copy to tenant","Last tax bill copy to tenant"][index-2]:label]]);
const billField = (scope,index) => scope==="in"?"billCopy"+index:"bill"+index;
const reasons = ["Damaged","Missing","Not working","Dirty or stained","Incomplete","Other"];
const steps = ["Collect tenant details and Aadhaar","Agree rent, deposit and dates","Draft contract and tenant review","Collect deposit","Make the final contract copy","Signing at the lawyer office","Police verification","Send final copies","Hand over the flat"];
const limitLabels = {rent:"Default rent ₹",minimum:"Minimum rent ₹",months:"Deposit months",hike:"Rent hike after 11 months %",limit:"Discretionary deduction limit ₹",gasRate:"Gas rate ₹ per unit"};
const moveOutLabels = {outDeposit:"Move-out deposit paid ₹",electricRate:"Electricity rate ₹ per unit"};
const contactFields = [["landlord","Landlord name"],["age","Landlord age","number"],["landAddress","Landlord address","textarea"],["phone","Landlord WhatsApp","tel"],["gpay","Landlord G-Pay","tel"],["supervisor","Supervisor name"]];
const settings = {rent:8500,minimum:8500,months:2,hike:5,limit:2000,gasRate:43.95};
let activeFlat = "B-102";
const state = {out:{},in:{},settings:{}};
const hosted = document.documentElement.hasAttribute("data-shared");
const pagesDemo = !hosted && location.hostname.endsWith(".github.io");
try { if(!hosted)Object.assign(state,JSON.parse(localStorage.getItem("b102-desk-v1") || "{}")); } catch {}
const app = document.querySelector("#app");
const esc = value => String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const extracted = {};
const get = (scope,id) => extracted[scope+":"+id] ?? state[scope][id] ?? (scope==="settings" ? settings[id] ?? "" : "");
const num = val => Math.max(0,Number(val)||0);
const money = val => (val < 0 ? "−" : "") + "₹" + Math.abs(val).toLocaleString("en-IN",{maximumFractionDigits:2});
const fmt = val => val ? val.split("-").reverse().join("/") : "";
const act = (text,cmd,cls="") => '<button type="button" class="'+cls+'" data-action="'+cmd+'">'+text+'</button>';
const link = (text,href,cls="") => '<a class="button '+cls+'" href="#'+href+'">'+text+'</a>';
const card = (title,body,cls="") => '<section class="card '+cls+'"><h3>'+title+'</h3>'+body+'</section>';
const fields = (...body) => '<div class="fields">'+body.join("")+'</div>';
const field = (scope,id,label,type="text",fallback="",attrs="") => {
 const val=esc(get(scope,id) || (get(scope,id)===0 ? 0 : fallback));
 const binding=' data-field="'+scope+":"+id+'" '+attrs;
 return '<label class="field"><span>'+label+'</span>'+(type==="textarea" ? '<textarea'+binding+'>'+val+'</textarea>' : '<input type="'+type+'" value="'+val+'"'+binding+(type==="number"?' min="0" step="any"':'')+'>')+'</label>';
};
const check = (s,id,label) => '<label class="check"><input type="checkbox" data-field="'+s+':'+id+'" '+(get(s,id)?"checked":"")+'><span>'+label+'</span></label>';
const readOnly = (label,value,id="") => '<label class="field"><span>'+label+'</span><input readonly value="'+esc(value)+'"'+(id?' id="'+id+'"':'')+'></label>';
const inspectionSize = scope => itemEntries.length + 3 + billEntries(scope).length;
const progress = (v,max) => '<progress aria-label="Completion" value="'+v+'" max="'+max+'"></progress>';
const title = (heading,description) => '<div class="intro"><div class="eyebrow">Flat '+activeFlat+' · Bakrol, Anand</div><h1>'+heading+'</h1><p class="muted">'+description+'</p></div>';
const notice = (msg,warn=false) => '<div class="notice '+(warn?'warn':'')+'">'+msg+'</div>';
const itemEntries = groups.flatMap(([group,,items],g)=>items.map((item,i)=>({group,id:"i"+g+"-"+i,name:item.split("|")[0]})));
const note = (s,id) => get(s,id+"reason")==="Other" ? get(s,id+"note") : get(s,id+"reason");
function count(s) {
 const extra=["electric","gas","counted",...billEntries(s).map(([i])=>billField(s,i))];
 return itemEntries.filter(({id})=>get(s,id)).length + extra.filter(id=>get(s,id)!=="" && get(s,id)!==false).length;
}
function terms() {
 const rent=num(get("settings","rent"));
 const deposit=Math.round(rent*num(get("settings","months"))*100)/100;
 const start=get("in","start"), override=get("in","end");
 let end=override;
 if(start && !end){
  const [y,m,d]=start.split("-").map(Number);
  const target=new Date(Date.UTC(y,m-1+11,1));
  const lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  target.setUTCDate(Math.min(d,lastDay)-1);
  end=target.toISOString().slice(0,10);
 }
 return {rent,deposit,start,end,needs:rent<num(get("settings","minimum"))};
}
function settlement() {
 const deposit=num(get("settings","outDeposit"));
 const rate=num(get("settings","electricRate"));
 const gasRate=num(get("settings","gasRate"));
 const rent=num(get("settings","rent")), days=Number(get("out","noticeDays"));
 const period=Number.isInteger(days)&&days>=2&&days<=30;
 const noticeRent=period ? Math.round(days*rent/30*100)/100 : 0;
 const utilities=[["Electricity","electric",rate],["Gas","gas",gasRate]].map(([name,key,price])=>{
  const from=get("out",key+"Previous"),to=get("out",key);
  const units=from!=="" && to!=="" ? Math.max(0,Number(to)-Number(from)) : 0;
  return {name,amount:Math.round((units+Number.EPSILON)*price),note:from!=="" && to!=="" ? from+" → "+to+" · "+Number(units.toFixed(5))+" units × "+money(price):""};
 });
 const damages=itemEntries.filter(({id})=>get("out",id)==="issue").map(({id,name,group})=>({name:group+" · "+name,amount:Math.round(num(get("out",id+"cost"))),note:note("out",id)}));
 const others=(state.out.others||[]).map(row=>({name:row.name||"Other deduction",amount:Math.round(num(row.amount))}));
 const rows=[...utilities,{name:"Notice rent",amount:noticeRent,note:period ? days+" days × "+money(rent)+" ÷ 30":""},...damages,...others];
 const total=Math.round(rows.reduce((sum,row)=>sum+row.amount,0)*100)/100, discretionary=[...damages,...others].reduce((sum,row)=>sum+row.amount,0);
 const missing=Object.keys(moveOutLabels).filter(key=>get("settings",key)==="").map(key=>moveOutLabels[key]);
 return {deposit,rate,gasRate,utilities,damages,rows,total,noticeRent,discretionary,missing,balance:Math.round((deposit-total)*100)/100,needs:discretionary>num(get("settings","limit"))||total>deposit};
}
function save(){
 if(window.deskShared?.enabled){window.deskShared.save();return;}
 try {localStorage.setItem("b102-desk-v1",JSON.stringify(state));}
 catch {toast("Browser storage is unavailable or full. Changes are available in this tab.");}
}
let timer;
function toast(msg){document.querySelector("#toast").textContent=msg;clearTimeout(timer);timer=setTimeout(()=>document.querySelector("#toast").textContent="",5500);}
function home(){
 const s=settlement(), t=terms(), done=stepsDone().filter(Boolean).length;
 const closed=get("out","agreed")&&get("out","paid")&&(!s.needs||get("out","approved"));
 const tasks=[s.needs&&!get("out","approved")&&"Approve the move-out deposit settlement.",t.needs&&!get("in","termsApproved")&&"Approve the new tenant terms.",get("in","signDate")&&!get("in","signed")&&"Attend signing on "+fmt(get("in","signDate"))+" at "+(get("in","office")||"the lawyer office")+"."].filter(Boolean);
 return title(activeFlat+" Handover Desk","Inspect the flat, settle the deposit and prepare for the next tenant.")+
 '<div class="grid">'+['<section class="card"><div class="spread"><h2>Move-out</h2><span class="pill">'+(closed?"Closed":count("out")+" of "+inspectionSize("out"))+'</span></div><p>'+esc(get("out","name")||"Outgoing tenant")+'</p>'+progress(count("out"),inspectionSize("out"))+'<p class="spread"><span>Deductions <b>'+money(s.total)+'</b></span><span>'+balanceLabel(s)+' <b>'+money(Math.abs(s.balance))+'</b></span></p>'+link("Open move-out","out","primary full")+'</section>',
 '<section class="card"><div class="spread"><h2>Move-in</h2><span class="pill">'+done+' of 9</span></div><p>'+esc(get("in","name")||"Incoming tenant")+(t.start?" · from "+fmt(t.start):"")+'</p>'+progress(done,9)+'<p>Next: <b>'+esc(steps[stepsDone().indexOf(false)]||"Complete")+'</b></p>'+link("Open move-in","in","primary full")+'</section>',
 card("Landlord needs to act on",tasks.length?"<ul>"+tasks.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>":"<p>Nothing right now.</p>"),
 card("You decide alone when",'<p>Rent is at least '+money(num(get("settings","minimum")))+', with '+esc(get("settings","months"))+' months’ deposit.</p><p>Damage, cleaning and other deductions are within '+money(num(get("settings","limit")))+'.</p>',"soft")].join("")+'</div>'+act("Send status to landlord on WhatsApp","share:status","share full");
}
function upload(s,id,label,accept,camera=false){
 return '<label class="field"><span>'+label+'</span><input type="file" data-upload="'+s+':'+id+'" accept="'+accept+'" '+(camera?'capture="environment"':'')+'></label>';
}
function tenantOut(){
 return card("Tenant leaving",fields(upload("out","contract","Upload contract to extract tenant details","application/pdf,image/*,.txt"),field("out","name","Full name"),field("out","phone","Mobile for WhatsApp","tel"),field("out","vacate","Date of vacating","date"),readOnly("Rent",money(num(get("settings","rent")))))+importReview("out","contract"));
}
function importReview(s,id){
 const val=get(s,id+"Text");
 return val?'<details><summary>Review extracted text</summary>'+field(s,id+"Text","Extracted text","textarea")+act("Fill available fields",s+":parse:"+id)+'</details>':"";
}
function checklist(s) {
 return card("Inspection progress",'<div class="spread"><b data-count="'+s+'">'+count(s)+' of '+inspectionSize(s)+' done</b><span class="muted">'+itemEntries.filter(({id})=>get(s,id)==="issue").length+' issues</span></div>'+progress(count(s),inspectionSize(s)),"soft")+
 '<div class="grid">'+groups.map(([name,gu,items],g)=>card('<span class="spread">'+name+' <small lang="gu">'+gu+'</small></span>',items.map((item,i)=>{
 const [en,gu]=item.split("|"),id="i"+g+"-"+i, status=get(s,id);
 const buttons=["ok","issue"].map(choice=>'<button class="'+choice+(status===choice?' selected':'')+'" aria-pressed="'+(status===choice)+'" data-action="'+s+':mark:'+id+':'+choice+'">'+(choice==="ok"?"OK":"Issue")+'</button>').join("");
 const select='<label class="field"><span>Reason</span><select data-field="'+s+':'+id+'reason"><option value="">Choose a reason</option>'+reasons.map(r=>'<option '+(get(s,id+"reason")===r?"selected":"")+'>'+r+'</option>').join("")+'</select></label>';
 return '<div class="line">'+en+'<small lang="gu">'+gu+'</small><div class="actions">'+buttons+'</div>'+(status==="issue"?'<div class="issue-fields">'+fields(select,s==="out"?field(s,id+"cost","Cost to deduct ₹","number"):"",get(s,id+"reason")==="Other"?field(s,id+"note","Describe the issue","textarea"):"")+'</div>':"")+'</div>';
 }).join(""))).join("")+
 card("Keys · total 13",keys.map(([en,gu,max],i)=>'<div class="line"><div>'+en+'</div><small lang="gu">'+gu+'</small><div class="row">'+act("−",s+":key:"+i+":-1")+'<b>'+num(get(s,"key"+i))+'</b><small>of '+max+'</small>'+act("+",s+":key:"+i+":1")+'</div></div>').join("")+'<p><strong>Keys counted: '+keys.reduce((a,_,i)=>a+num(get(s,"key"+i)),0)+' of 13</strong></p>'+check(s,"counted","I counted the keys"))+
 card(s==="out"?"Meters and bills":"Meters and papers",["electric","gas"].map((id,i)=>'<div class="line">'+fields(field(s,id,i===0?"Electric meter reading (kWh)":"Gas meter reading","number"),upload(s,id,"Take or upload meter photo","image/*",true))+ (get(s,id+"Time")?'<p class="muted">'+(get(s,id+"CameraTime")?"Photo captured ":"Photo added ")+''+esc(new Date(get(s,id+"Time")).toLocaleString())+'</p>':"")+(get(s,id+"Text")?'<small>OCR: '+esc(get(s,id+"Text"))+'</small><small>Compare the reading with the meter before exporting.</small>'+(get(s,id+"Suggestion")?act("Use OCR reading "+esc(get(s,id+"Suggestion")),s+":meter:"+id):"")+'':"")+(meterPhoto(s,id))+'</div>').join("")+billEntries(s).map(([i,label])=>check(s,billField(s,i),label)).join(""))+'</div>';
}
const photos={};
const uploadTokens={};
function meterPhoto(s,id){
 return photos[s+id]?'<img class="photo" alt="'+(id==="electric"?"Electricity meter":"Gas meter")+' photo" src="'+photos[s+id]+'">':"";
}
const balanceLabel = s=>s.balance<0?"Amount due from tenant":"Refund to tenant";
function missingInputs(s){
 return s.missing.length?notice("Ask the landlord to set "+esc(s.missing.join(" and "))+" before issuing the settlement.",true):"";
}
function totals(s){return '<div class="card total spread"><div>'+balanceLabel(s)+'<br><small>Deductions '+money(s.total)+'</small></div><strong>'+money(Math.abs(s.balance))+'</strong></div>';}
function deductions(){
 const s=settlement();
 const settingAmount=key=>get("settings",key)===""?"Not set":money(num(get("settings",key)));
 const utility=(id,i,label,rate)=>card(label,fields(field("out",id+"Previous","Last paid unit","number"),readOnly("Exit reading",get("out",id)),readOnly("Rate per unit",settingAmount(rate)))+'<p class="muted" data-utility="'+i+'"></p>');
 const days='<label class="field"><span>Period (days)</span><select data-field="out:noticeDays"><option value="">No rent deduction</option>'+Array.from({length:29},(_,i)=>{
  const day=i+2;
  return '<option value="'+day+'" '+(Number(get("out","noticeDays"))===day?"selected":"")+'>'+day+'</option>';
 }).join("")+'</select></label>';
 return missingInputs(s)+'<div class="grid">'+card("Deposit held",readOnly("Deposit paid",settingAmount("outDeposit")))+
 utility("electric",0,"Electricity","electricRate")+
 utility("gas",1,"Gas","gasRate")+
 card("Rent to deduct",fields(days,readOnly("Amount",money(s.noticeRent),"notice-amount")))+
 card("Damage and cleaning",s.damages.map(row=>'<p class="spread"><span>'+esc(row.name)+'</span><b>'+money(row.amount)+'</b></p>').join("")+(s.damages.length?"":"<p class='muted'>No checklist issues entered.</p>")+link("Edit in checklist","out"))+
 card("Other deductions",(state.out.others||[]).map((row,i)=>'<div class="line">'+fields(field("out","other"+i+"name","What for","text",row.name),field("out","other"+i+"amount","Amount ₹","number",row.amount))+act("Remove","out:remove:"+i)+'</div>').join("")+act("+ Add deduction","out:add"))+'</div><div id="live-total">'+totals(s)+'</div>'+link("Next: final refund","out/refund","primary full");
}
function statement(s){
 return '<table class="settlement"><tbody><tr><th>Deposit held</th><th>'+money(s.deposit)+'</th></tr>'+s.rows.filter(r=>r.amount||r.note).map(r=>'<tr><td>'+esc(r.name)+(r.note?'<br><small>'+esc(r.note)+'</small>':"")+'</td><td>'+money(-r.amount)+'</td></tr>').join("")+'<tr><th>Total deductions</th><th>'+money(-s.total)+'</th></tr><tr><th>'+balanceLabel(s)+'</th><th>'+money(Math.abs(s.balance))+'</th></tr></tbody></table>';
}
function refund(){
 const s=settlement();
 return missingInputs(s)+'<div class="grid">'+card("Final settlement",'<p class="muted">'+esc(get("out","name")||"Outgoing tenant")+(get("out","vacate")?" · vacated "+fmt(get("out","vacate")):"")+'</p>'+statement(s))+
 '<div>'+(s.needs?card("Landlord OK needed",notice("Discretionary deductions are "+money(s.discretionary)+". Approval is needed when they exceed "+money(num(get("settings","limit")))+" or total deductions exceed the deposit.",true)+act("Ask landlord on WhatsApp","share:approval","share full")+(window.deskShared?.enabled?"<p>"+(get("out","approved")?"Approved by landlord":"Awaiting landlord approval in the app")+"</p>":check("out","approved","Landlord replied OK"))):"")+
 card("Send the statement",'<div class="actions">'+act("Save protocol as PDF","print:out","primary")+act("Send protocol via WhatsApp","share:out","share")+'</div><p class="muted">Choose Save as PDF in the print dialog, then attach the saved file in WhatsApp.</p>')+
 card("Close the move-out",check("out","agreed","Tenant agreed the statement")+check("out","paid","Refund paid to tenant")+field("out","refunded","Date refunded","date"))+'</div></div>';
}
function outPage(tab) {
 return title("Move-out","Check the flat, calculate deductions and prepare the final settlement.")+
 '<div class="tabs">'+[["","Checklist"],["/deductions","Deductions"],["/refund","Refund"]].map(([path,name],i)=>'<a class="'+(tab===path.slice(1)?"active":"")+'" href="#out'+path+'">'+(i+1)+' '+name+'</a>').join("")+'</div>'+
 (tab==="deductions"?deductions():tab==="refund"?refund():tenantOut()+checklist("out")+link("Next: deductions","out/deductions","primary full"));
}
function stepsDone(){
 const g=id=>get("in",id),t=terms();
 return [g("name")&&g("address")&&g("phone")&&g("idReceived"),t.start&&(!t.needs||g("termsApproved")),g("draftDate")&&g("reviewDate"),g("depositPaid"),g("printed"),g("signDate")&&g("signTime")&&g("office")&&g("signed"),g("policeDate")&&g("policeRef")&&g("policeDone"),g("originals")&&g("copy"),g("handed")&&count("in")===inspectionSize("in")].map(Boolean);
}
const rentAgreementTemplate = "The Party of the LICENSOR (First Party): {{landlord}}, aged {{ownerAge}} years, having Resident at: {{ownerAddress}}.\n\n(Herein called the \"Licensor\" Which expression shall, unless excluded by or repugnant to the content included his heirs, successor executors, administrators, legal representation and assignors) of the ONE PART\n\nThe Party of the LICENSEE: (Second Party): {{tenant}}, aged {{age}}, Occupation: {{job}}, Residing at {{address}}. Aadhar No. {{aadhaar}}.\n\n(herein called the \"Licensee\" Which expression shall, unless excluded by or repugnant to the content included his heirs, successor executors, administrators, legal representation and assignors) of the OTHER PART”.\n\nWhereas the Party of the LICENSOR (First Party) is an owner of the Premise at: {{flat}}, Aastha Apartment, Nr Shantikunj Society, Bakrol, Ta & Dist. Anand, and Gujarat.\n\nNOW THE DEED WITNESS AS FOLLOWS:\n\n(A) OCCUPATIONAL CHARGES: The LICENSEE shall pay the LICENSOR Rs. {{rent}}/- (Rupees {{rentWords}} only) per month as occupational charges for the above-mentioned premise. The occupational charges will be increase by mutual understanding between the licensee and Licensor every year. The said occupational charges are to be paid by the licensee to the Licensor between {{dueFrom}} to {{dueTo}} of every month.\n\n(B) SECURITY DEPOSIT: The licensee has agreed to pay the Licensor an amount of Rs. {{deposit}}/- (Rupees {{depositWords}} only) as a security deposit without bearing any interest towards damages and dues etc. which shall be refunded without interest by the Licensor on receiving the said premise in good condition.\n\n(C) DATE OF OCCUPATION & VALIDITY OF CONTRACT: The Rent Agreement is valid for a period of 11 month from {{start}} TO {{end}} FOR (11 Months) only.\n\n(D) NOTICE PERIOD: In an event when the licensee wishes to hand over. The possession of the premises occupied by them, licensee shall have to give One Month Notice in advance of such intention. Similarly, the Licensor also will have an option to get the premise vacated by giving ONE MONTH notice.\n\n(E) REPAIRS The said premises are given on rent with full furniture. If there is any lost, breakage or out of condition the charges for the said articles and furniture will be borne by the tenant. The licensee shall maintain the premise in good condition and will not cause any damage thereto, if any damage in cause to the premises or any part thereof by the licensee or his servants or agents the same will be made good by the licensee at the cost of the license either by the cost of rectifying the damage or by paying compensation as carry out any work of structure repair or additions or alteration to the said premises. The licensee shall not create any nuisance or annoyance to the people in the neighbourhood and no illegal Item or contraband items and not permitted goods by law in the premises.\n\n1 Air Conditioners, 1 Electric Geyser, 1 Fridge, 1 R.O Water Purifier, Wardrobes, 2 beds with mattresses, 1 sofa, full furniture in kitchen, 5 Fans and 5 Tube Lights. All items are in good condition and are to be returned in usual condition at the time of vacating the flat. If any item will be lost or goes out of order or is broken then the tenant will bear its cost.\n\n(F) ELECTRICITY AND OTHERS: Licensee will pay Municipal Tax, Monthly maintenance, Gas and Electricity bills of his consumption regularly during the agreement period without default and keep proof for the same taken possession.\n\n(G) After the period of 11 months, contract agreement terminates automatically and the licensee shall hand over the vacant possession. However, if both the parties agree, the Rent agreement may be renewed on for additional 11 months as may be agreed a future. There will be appreciation of {{hike}}% after 11 months\n\n(H) It is agreed between parties that the premise shall be used by Residential Purpose only.\n\n(I) It has been agreed between the parties that the licensee shall make the use and occupation of licensee itself and for and authorized representative and shall not sublet or assign its rights to any other party, or in favour of any party or partnership firm and shall maintain the premise free from all encumbrances.\n\n(J) The licensee shall permit the LICENSOR and or his agent at all reasonable time, subject to his convenience, during the duration of this lease, to inspect the premise. Prior information/intimation must be given before visiting the premise.\n\n(K) The licensee shall not store or keep or bring any illegal / dangerous material/item as per the prevailing laws of state of Gujarat & country into the premise which may be injurious to the premise/neighbours. Etc.\n\n(L) The licensee is not entitled to do any business activities from the premises.\n\n(M) The licensee agreed to abide all the rules and regulation of the social order.\n\n(N) On the expiration of the term or period of the license, the licensee shall handover vacant and peaceful possession of the licensed premises to the licensor in the same condition in which the menses now exist. The licensee, occupation of the premises after such termination, will be deemed to be that of a trespasser.\n\n(O) All or any dispute regarding this contract or occupancy shall be first settled mutually, if necessary by mutually agreed arbitration and the jurisdiction shall be Anand only.\n\n(P) The Rent agreement Valid only for 11 months (Eleven months only) It witness where of the parties have signed this on {{signDay}} the day of {{signMonth}}.\n\nDate: {{signDate}}\n\nPlace: {{office}}\n\nSignature of the first party's (LICENSOR) _________________________\n\nSignature of the second party (LICENSEE) __________________________";

function amountInWords(amount){
 const small=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
 const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
 function integerWords(n){
  if(n<20)return small[n];
  if(n<100)return tens[Math.floor(n/10)]+(n%10?" "+small[n%10]:"");
  const [unit,label]=[[10000000,"Crore"],[100000,"Lakh"],[1000,"Thousand"],[100,"Hundred"]].find(([unit])=>n>=unit);
  return integerWords(Math.floor(n/unit))+" "+label+(n%unit?" "+integerWords(n%unit):"");
 }
 const paise=Math.round(amount*100);
 return integerWords(Math.floor(paise/100))+(paise%100?" and "+integerWords(paise%100)+" Paise":"");
}
function rentDue(){
 const from=Number(get("in","dueFrom")), to=Number(get("in","dueTo"));
 return Number.isInteger(from)&&Number.isInteger(to)&&from>=1&&from<=to&&to<=31 ? [from,to] : [1,5];
}
function agreement(){
 const t=terms(), sign=get("in","signDate");
 const [dueFrom,dueTo]=rentDue();
 const values={
  flat:activeFlat,landlord:get("settings","landlord"),ownerAge:get("settings","age"),ownerAddress:get("settings","landAddress"),
  tenant:get("in","name"),age:get("in","age"),job:get("in","job"),address:get("in","address"),aadhaar:get("in","aadhaarNumber"),
  rent:t.rent.toLocaleString("en-IN"),rentWords:amountInWords(t.rent),
  deposit:t.deposit.toLocaleString("en-IN"),depositWords:amountInWords(t.deposit),dueFrom,dueTo,
  start:fmt(t.start),end:fmt(t.end),hike:get("settings","hike"),signDate:fmt(sign),office:get("in","office"),
  signDay:sign?Number(sign.slice(8,10)):"",
  signMonth:sign?new Date(sign+"T00:00:00Z").toLocaleDateString("en-IN",{month:"long",year:"numeric",timeZone:"UTC"}):""
 };
 return rentAgreementTemplate.replace(/\{\{(\w+)\}\}/g,(_,key)=>values[key]!==""&&values[key]!=null?values[key]:"________________");
}
function lawyerMapUrl(){
 const value=String(get("in","officeCoordinates")).trim();
 const query=value.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
 const coordinates=query&&Math.abs(Number(query[1]))<=90&&Math.abs(Number(query[2]))<=180 ? query.slice(1).join(",") : "";
 const destination=coordinates||String(get("in","office")).trim();
 return destination?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(destination):"";
}
function moveIn(tab) {
 if(tab==="checklist")return title("Move-in checklist","Record the condition of the flat when the tenant takes possession.")+link("Back to move-in","in")+checklist("in")+card("Hand over the flat",check("in","handed","Flat handed over to tenant")+'<div class="actions">'+act("Save protocol as PDF","print:in","primary")+act("Send protocol to tenant via WhatsApp","share:in","share")+'</div>');
 const t=terms(), done=stepsDone();
 const f=(id,label,type,def)=>field("in",id,label,type,def), c=(id,label)=>check("in",id,label);
 const parts=[
 upload("in","aadhaar","Upload Aadhaar photo or PDF","image/*,application/pdf")+
 fields(f("name","Full name as on Aadhaar"),f("phone","Mobile for WhatsApp","tel"),f("age","Age","number"),
  '<div class="field-stack">'+f("job","Occupation")+field("in","employerProof","Employer ID Proof (optional)","text","","maxlength=\"150\"")+'</div>',
  f("address","Permanent address as on Aadhaar","textarea"),
  field("in","aadhaarNumber","Aadhaar number (current tab only)","text","","inputmode=\"numeric\" maxlength=\"12\" autocomplete=\"off\""))+
 c("idReceived","Aadhaar front and back received")+c("portrait","Passport photo received")+c("employer","Employer details noted"),
 fields(f("start","Agreement starts","date"),f("end","End date override","date"),readOnly("Monthly rent",money(t.rent)),readOnly("Deposit",money(t.deposit)),readOnly("Rent due",rentDue().join(" to ")+" of each month"))+'<p class="muted" id="term-end"></p>'+notice('<span id="term-warning"></span>',true)+act("Ask landlord on WhatsApp","share:terms","share")+(window.deskShared?.enabled?"<p>"+(get("in","termsApproved")?"Approved by landlord":t.needs?"Awaiting landlord approval in the app":"")+"</p>":c("termsApproved","Landlord replied OK")),
 '<div class="agreement" data-agreement>'+esc(agreement())+'</div><div class="actions">'+act("Save draft as PDF","print:draft","primary")+act("Send Draft to Tenant via WhatsApp","share:draft","share")+'</div>'+fields(f("draftDate","Draft sent on","date"),f("reviewDate","Tenant replied OK on","date")),
 '<p id="payment-summary"></p><p>Landlord GPay <strong>'+esc(get("settings","phone")||"Ask the landlord to add their phone number")+'</strong></p>'+c("depositPaid","Deposit received in landlord account"),
 c("printed","Final agreement printed")+c("idAttached","Aadhaar copy attached")+c("portraitAttached","Tenant photo attached")+c("employerAttached","Employer ID attached (optional)")+'<div class="actions">'+upload("in","final","Select lawyer-approved final PDF","application/pdf")+act("Download final PDF","download:final","primary")+act("Send final agreement to tenant via WhatsApp","share:final","share")+'</div><p class="muted">The selected file stays in this tab. Attach it in the tenant chat.</p>',
 fields(f("signDate","Date","date"),f("signTime","Time","time"),f("office","Lawyer office"),field("in","officeCoordinates","Google Maps coordinates (optional)","text","","placeholder=\"Latitude, longitude\""))+'<div class="actions"><a class="button" id="lawyer-map" target="_blank" rel="noopener noreferrer" hidden>Open lawyer’s office in Google Maps</a>'+act("Invite tenant on WhatsApp","share:invite","share")+act("Invite landlord on WhatsApp","share:landinvite","share")+'</div>'+c("confirmed","Landlord and tenant both confirmed")+c("signed","Both signed"),
 fields(upload("in","police","Upload police verification PDF or photo","image/*,application/pdf"),f("policeDate","Submitted on","date"),f("policeRef","Acknowledgement number"))+c("policeDone","Verification certificate received"),
 c("originals","Original contract and police certificate sent to landlord")+c("copy","Copy given to tenant")+f("copiesDate","Date","date"),
 '<p>'+count("in")+' of '+inspectionSize("in")+' done</p>'+progress(count("in"),inspectionSize("in"))+link("Open handover checklist","in/checklist","primary full")
 ];
 const open=new Set([...app.querySelectorAll("details[data-step][open]")].map(el=>el.dataset.step));
 return title("Move-in","Prepare the agreement, arrange signing and hand over the flat.")+
 card("New tenant",'<div class="spread"><b>'+esc(get("in","name")||"Incoming tenant")+'</b><span class="pill">'+done.filter(Boolean).length+' of 9</span></div>'+progress(done.filter(Boolean).length,9),"soft")+
 steps.map((label,i)=>'<details data-step="'+i+'" '+(open.has(String(i))?"open":"")+'><summary><span class="step">'+(i+1)+'</span>'+label+' <span class="pill '+(done[i]?"good":"")+'">'+(done[i]?"Done":"To do")+'</span></summary>'+parts[i]+'</details>').join("");
}
function settingsPage(){
 const local=!window.deskShared?.enabled;
 return title("Information","Landlord and supervisor details for the handover.")+
 '<div class="grid">'+card("Landlord and supervisor",fields(...contactFields.map(([id,label,type])=>
  local?field("settings",id,label,type):readOnly(label,get("settings",id) || "Not provided"))))+
 card("Standing instructions",local?fields(...Object.entries({...limitLabels,...moveOutLabels}).map(([id,label])=>field("settings",id,label,"number"))):
  '<dl>'+Object.entries({...limitLabels,...moveOutLabels}).map(([id,label])=>'<dt>'+label+'</dt><dd>'+esc(get("settings",id)===""?"Not set":get("settings",id))+'</dd>').join("")+'</dl>')+'</div>';
}
function render(){
 if(hosted&&!window.deskShared?.enabled){app.textContent="Connecting to Handover Desk…";return;}
 if(window.deskShared?.render())return;
 const [page,tab=""]=location.hash.slice(1).split("/");
 const screens={out:()=>outPage(tab),in:()=>moveIn(tab),settings:settingsPage,home};
 document.querySelectorAll("nav a").forEach(a=>a.classList.toggle("active",a.hash==="#"+(screens[page]?page:"home")));
 app.innerHTML=(screens[page]||home)();
 live();
}
function live(){
 const s=settlement(),t=terms();
 const total=app.querySelector("#live-total");
 if(total)total.innerHTML=totals(s);
 const amount=app.querySelector("#notice-amount");
 if(amount)amount.value=money(s.noticeRent);
 app.querySelectorAll("[data-utility]").forEach(el=>{
  const i=Number(el.dataset.utility), key=i===0?"electric":"gas";
  const previous=get("out",key+"Previous"), reading=get("out",key);
  el.textContent=previous!=="" && reading!=="" && Number(reading)<Number(previous) ? "Exit reading is lower than the last paid unit. Check the figures." : "Rate "+money(i===0?s.rate:s.gasRate)+" per unit · Amount "+money(s.utilities[i].amount);
 });
 const end=app.querySelector("#term-end");
 if(end){
  end.textContent=t.end?"Ends "+fmt(t.end)+".":"";
  const warning=app.querySelector("#term-warning");
  warning.parentElement.hidden=!t.needs;
  warning.textContent="These terms fall outside the standing instructions.";
  app.querySelector("[data-action='share:terms']").hidden=!t.needs;
  const approval=app.querySelector("[data-field='in:termsApproved']");
  if(approval)approval.closest("label").hidden=!t.needs;
  app.querySelector("#payment-summary").textContent="Deposit "+money(t.deposit);
  app.querySelector("[data-agreement]").textContent=agreement();
  const map=app.querySelector("#lawyer-map"), url=lawyerMapUrl();
  map.hidden=!url;
  if(url)map.href=url;
  else map.removeAttribute("href");
  [...app.querySelectorAll("[data-step] summary .pill")].forEach((badge,i)=>{
   const done=stepsDone()[i];
   badge.textContent=done?"Done":"To do";
   badge.classList.toggle("good",done);
  });
 }
 for (const el of app.querySelectorAll("[data-count]")){
  const n=count(el.dataset.count);
  el.textContent=n+" of "+inspectionSize(el.dataset.count)+" done";
  el.parentElement.nextElementSibling.value=n;
 }
}
function fileDownload(blob,name){
 const a=document.createElement("a"),url=URL.createObjectURL(blob);
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function setField(el){
 const [s,id]=el.dataset.field.split(":");
 const other=/^other(\d+)(name|amount)$/.exec(id);
 const value=el.type==="checkbox"?el.checked:el.value;
 if(other)state.out.others[Number(other[1])][other[2]]=value;
 else if(id==="contractText")extracted[s+":"+id]=value;
 else if(s==="in"&&id==="aadhaarNumber"){
  el.value=value.replace(/\D/g,"").slice(0,12);
  extracted["in:aadhaarNumber"]=el.value;
  live();
  return;
 }
 else state[s][id]=value;
 if(s==="out"&&!["approved","agreed","paid","refunded"].includes(id)&&(/cost$/.test(id)||other||/^(deposit|noticeDays|noticeRent|period|electric|gas|billAmount|billUnits)/.test(id))){
  state.out.approved=false;
 }
 if(s==="in"&&["start","end"].includes(id))state.in.termsApproved=false;
 save();
 live();
}
app.addEventListener("input",e=>{if(e.target.dataset.field)setField(e.target);});
app.addEventListener("change",e=>{
 if(e.target.dataset.field && e.target.tagName==="SELECT")render();
 if(e.target.dataset.upload && e.target.files[0])handleUpload(e.target.dataset.upload,e.target.files[0]);
});
let finalFile;
function parseDate(raw){
 if(!raw)return "";
 const val=raw.trim();
 let match=/^(\d{4})-(\d{2})-(\d{2})/.exec(val), iso;
 if(match)iso=match[0];
 else if((match=/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/.exec(val)))iso=match[3]+"-"+match[2].padStart(2,"0")+"-"+match[1].padStart(2,"0");
 else if(/\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}/.test(val)){
  const d=new Date(val);
  if(!Number.isNaN(Number(d)))iso=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 }
 if(!iso)return "";
 const d=new Date(iso+"T00:00:00Z");
 return !Number.isNaN(Number(d))&&d.toISOString().startsWith(iso)?iso:"";
}
function fillBlankFields(scope,values){
 const empty=Object.entries(values).filter(([key,value])=>value!==""&&value!=null&&!get(scope,key));
 for(const [key,value] of empty)state[scope][key]=value;
 return empty.length;
}
function parseDetails(s,id){
 const raw=get(s,id+"Text");
 const match=rx=>raw.match(rx)?.[1]?.trim()||"";
 return fillBlankFields(s,{
  name:match(/(?:tenant(?: full)? name|name of (?:the )?tenant|licensee name|^full name|^name)\s*[:–-]\s*([^\n]+)/im)||match(/party of the licensee[^\n]*?\):\s*([^,\n]+)/i),
  phone:match(/(?:tenant|licensee)[ \t]+(?:mobile|phone|telephone|contact)(?:[ \t]+(?:no\.?|number))?[ \t]*[:–-]?[ \t]*(\+?\d[\d ()-]{8,}\d)/i)||
   match(/^(?:mobile|phone|telephone)(?:[ \t]+(?:no\.?|number))?[ \t]*[:–-]?[ \t]*(\+?\d[\d ()-]{8,}\d)/im)
 });
}
function importAadhaar(raw){
 const text=raw.replace(/[૦-૯०-९]/g,digit=>String("૦૧૨૩૪૫૬૭૮૯०१२३४५६७८९".indexOf(digit)%10));
 const match=rx=>text.match(rx)?.[1]?.trim()||"";
 const birthDate=parseDate(match(/(?:\bDOB\b|Date of Birth)[ \t]*[:–-]?[ \t]*([^\n]+)/i));
 const today=new Date();
 let age;
 if(birthDate){
  const [,month,day]=birthDate.split("-").map(Number);
  const birthdayPending=(today.getMonth()+1)*100+today.getDate()<month*100+day;
  age=today.getFullYear()-Number(birthDate.slice(0,4))-Number(birthdayPending);
 }
 const values={
  name:match(/^[ \t]*(?:full name|name)[ \t]*[:–-][ \t]*([^\n]+)/im)||
   match(/^[ \t]*([A-Za-z][A-Za-z .'-]{2,})[ \t]*\r?\n[^\n]*(?:\bDOB\b|date of birth|\bYOB\b|year of birth)/im),
  address:match(/\baddress[ \t]*[:–-][ \t]*([\s\S]+?)(?=\n\s*(?:\d{4}[ -]?\d{4}[ -]?\d{4}|VID\s*:|Aadhaar|Unique Identification|\b(?:phone|mobile)\b)|$)/i).replace(/\s*[\r\n]+\s*/g," "),
  phone:match(/\b(?:mobile|phone)(?:[ \t]+(?:no\.?|number))?[ \t]*[:–-]?[ \t]*(\+?\d[\d ()-]{8,}\d)/i),
  age:age>=0&&age<=130?String(age):""
 };
 const numbers=[...new Set([...text.matchAll(/(?:^|[^\w])(\d{4}[ -]?\d{4}[ -]?\d{4})(?!\w)/g)].map(match=>match[1].replace(/\D/g,"")))];
 const hasNumber=numbers.length===1&&!get("in","aadhaarNumber");
 if(hasNumber)extracted["in:aadhaarNumber"]=numbers[0];
 return fillBlankFields("in",values)+Number(hasNumber);
}
async function handleUpload(binding,file){
 const [s,id]=binding.split(":");
 if(id==="final"){finalFile=file;toast(file.name+" ready to download or attach.");return;}
 if(pagesDemo && !file.name.toLowerCase().endsWith(".txt")){
  toast("Document and photo extraction require the shared server. Enter sample details manually.");
  return;
 }
 const meter=id==="electric"||id==="gas";
 const captured=new Date().toISOString();
 const token=Symbol();
 uploadTokens[binding]=token;
 if(meter){
  if(photos[s+id])URL.revokeObjectURL(photos[s+id]);
  photos[s+id]=URL.createObjectURL(file);
  state[s][id+"Time"]=captured;state[s][id+"CameraTime"]=false;
  state[s][id+"Text"]="";state[s][id+"Suggestion"]="";
  save();render();
 }
 toast("Reading "+(meter?"meter photo":"document")+"…");

 try{
  let result;
  if(file.name.toLowerCase().endsWith(".txt"))result={text:await file.text()};
  else {
   const format=file.name.toLowerCase().split(".").pop();
   const response=await fetch("/read/"+format,{method:"POST",body:file});
   if(!response.headers.get("Content-Type")?.includes("application/json"))throw Error("Start the local server to use document and photo extraction.");
   result=await response.json();
   if(!response.ok)throw Error(result.error);
  }
  if(uploadTokens[binding]!==token)return;
  if(meter)state[s][id+"Text"]=result.text;
  else if(id==="contract")extracted[s+":"+id+"Text"]=result.text;
  if(meter){
   const lines=result.text.split("\n").map(x=>x.trim());
   const withUnits=lines.map(line=>line.match(/\b(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:kwh|m[³3])(?:\s|$)/i)?.[1]).filter(Boolean);
   const candidates=[...new Set((withUnits.length?withUnits:lines.map(line=>
    line.match(/^(?:reading\s*[:=-]?\s*)?(\d{1,8}(?:[.,]\d{1,4})?)$/i)?.[1]).filter(Boolean)).map(value=>value.replace(",",".")))];
   if(candidates.length===1){
    state[s][id+"Suggestion"]=candidates[0];
    if(!get(s,id)){
     state[s][id]=candidates[0];
     if(s==="out")state.out.approved=false;
    }
   }
   if(result.captured){state[s][id+"Time"]=result.captured;state[s][id+"CameraTime"]=true;}
   toast(candidates.length===1?"Compare the suggested reading with the photo.":"Review the photo and enter the meter reading.");
  } else if(id==="aadhaar"){
   toast(importAadhaar(result.text)?"Review the Aadhaar details filled in the form.":"Enter any missing Aadhaar details manually.");
  } else if(id==="police"){
   const references=[...result.text.matchAll(/\b(?:acknowledg(?:e)?ment|application)[ \t]*(?:no\.?|number|id|reference)?[ \t]*[:#–-]?[ \t]*(?:\r?\n[ \t]*)?([A-Z0-9]+(?:[/_-][A-Z0-9]+)*)/gi)]
    .map(match=>match[1]).filter(value=>/\d/.test(value)&&value.length>=4);
   const ref=[...new Set(references)];
   if(ref.length===1){
    const filled=fillBlankFields("in",{policeRef:ref[0]});
    toast(filled?"Acknowledgement number filled. Check it against the certificate.":"Check the existing acknowledgement number against the uploaded certificate.");
   }else toast("Enter the acknowledgement number from the certificate.");
  } else toast(parseDetails(s,id)?"Matched empty fields filled. Review them against the original.":"Review the extracted text and complete the fields manually.");
  save();render();
 }catch(error){if(uploadTokens[binding]===token)toast(error.message||"Extraction failed. Enter the details manually.");}
}
function whatsapp(phone,text){
 let digits=String(phone).replace(/\D/g,"");
 if(digits.length===10)digits="91"+digits;
 if(!/^\d{10,15}$/.test(digits)){toast("Enter a valid WhatsApp number first.");return;}
 window.open("https://wa.me/"+digits+"?text="+encodeURIComponent(text),"_blank","noopener,noreferrer");
}
function share(kind){
 const s=settlement(),t=terms(),out=kind==="out";
 if(out&&s.missing.length){toast("Ask the landlord to enter the deposit and electricity rate before sending the protocol.");return;}
 const signer=get("settings","supervisor");
 const name=get(out?"out":"in","name");
 const summary=activeFlat+" · Aastha Apartment\n"+(name?name+"\n":"")+"Deposit: "+money(s.deposit)+"\n"+s.rows.filter(r=>r.amount).map(r=>r.name+": "+money(r.amount)).join("\n")+"\nTotal deductions: "+money(s.total)+"\n"+balanceLabel(s)+": "+money(Math.abs(s.balance))+".";
 const invite=[get("in","signDate"),get("in","signTime"),get("in","office")];
 if(["invite","landinvite"].includes(kind)&&invite.some(x=>!x)){toast("Enter the signing date, time and lawyer office first.");return;}
 const mapUrl=lawyerMapUrl();
 const signing="Please confirm the signing appointment for "+activeFlat+" on "+fmt(invite[0])+" at "+invite[1]+" (local time, India), at "+invite[2]+"."+(mapUrl?"\n"+mapUrl:"");
 const messages={out:summary+"\nPlease review the attached handover protocol.",in:"Please review the attached "+activeFlat+" move-in handover protocol and confirm the recorded condition.",draft:"Please review the attached "+activeFlat+" draft rent agreement and reply with any changes.",final:"Please find the final rent agreement for "+activeFlat+" attached."+(invite.every(Boolean)?"\n"+signing:""),invite:signing,landinvite:signing,approval:"Please confirm the settlement for "+activeFlat+".\n"+summary,terms:"Please approve the "+activeFlat+" terms: rent "+money(t.rent)+", deposit "+money(t.deposit)+".",status:activeFlat+" status\nMove-out checklist: "+count("out")+"/"+inspectionSize("out")+"\n"+balanceLabel(s)+": "+money(Math.abs(s.balance))+"\nMove-in: "+stepsDone().filter(Boolean).length+"/9 complete."};
 const landlord=["status","approval","terms","landinvite"].includes(kind);
 whatsapp(get(landlord?"settings":out?"out":"in","phone"),messages[kind]+(signer?"\n"+signer:""));
}
function printDoc(kind){
 const panel=document.querySelector("#print");
 const previous=document.title;
 if(kind==="out"&&settlement().missing.length){toast("Ask the landlord to enter the deposit and electricity rate before saving the protocol.");return;}
 if(kind==="draft"){
  document.title=activeFlat+" Draft Rent Agreement";
  panel.innerHTML="<h1>Draft Rent Agreement</h1><p>For review before signing</p><div class='agreement'>"+esc(agreement())+"</div>";
 } else {
  const s=kind, label=s==="out"?"Move-out":"Move-in";
  document.title=activeFlat+" "+label+" Handover Protocol";
  const outgoing=s==="out";
  const completed=id=>get(s,id)?"Confirmed":"Pending";
  panel.innerHTML="<h1>"+label+" Handover Protocol</h1><p>Flat "+activeFlat+" · Aastha Apartment · Bakrol, Anand</p>"+
   (outgoing?"<p>Landlord: "+esc(get("settings","landlord")||"Not provided")+"<br>Supervisor: "+esc(get("settings","supervisor")||"Not provided")+"</p>":"")+
   "<p>Tenant: "+esc(get(s,"name")||"Not provided")+" · "+esc(get(s,"phone")||"Mobile not provided")+"</p>"+
   (outgoing?"<p>Date vacated: "+esc(fmt(get(s,"vacate"))||"Pending")+" · Rent: "+money(num(get("settings","rent")))+"</p><h2>Final settlement</h2>"+
    statement(settlement())+"<p>Landlord approval: "+(!settlement().needs?"Within standing limits":get(s,"approved")?"Approved":"Pending")+
    "<br>Tenant agreement: "+completed("agreed")+" · Refund paid: "+completed("paid")+
    (get(s,"refunded")?" · "+esc(fmt(get(s,"refunded"))):"")+"</p>":
    "<p>Contract: "+esc(fmt(get(s,"start")))+" to "+esc(fmt(terms().end))+"</p>")+
   "<h2>Inspection</h2><table class='settlement'>"+itemEntries.map(({id,group,name})=>"<tr><td>"+esc(group+" · "+name)+"</td><td>"+esc(get(s,id)==="issue"?"Issue"+(note(s,id)?" · "+note(s,id):""):get(s,id)==="ok"?"OK":"Pending")+"</td></tr>").join("")+"</table>"+
   "<h2>Keys, meters and bills</h2><p>"+keys.map(([name,,max],i)=>esc(name)+" "+num(get(s,"key"+i))+"/"+max).join(" · ")+" · "+(get(s,"counted")?"Count confirmed":"Count pending")+"</p>"+
   ["electric","gas"].map(id=>"<div class='line'><p>"+(id==="electric"?"Electricity":"Gas")+": "+esc(get(s,id)||"Pending")+(get(s,id+"Time")?" · "+esc(new Date(get(s,id+"Time")).toLocaleString()):"")+
    (outgoing?"<br>Last paid unit: "+esc(get(s,id+"Previous")||"Pending")+" · Rate per unit: "+money(num(get("settings",id==="electric"?"electricRate":"gasRate"))):"")+
    "</p>"+(outgoing?meterPhoto(s,id):"")+"</div>").join("")+
   "<ul>"+billEntries(s).map(([i,label])=>"<li>"+label+": "+completed(billField(s,i))+"</li>").join("")+"</ul><p>Tenant signature ____________________ &nbsp;&nbsp; Supervisor signature ____________________</p>";

 }
 window.print();
 document.title=previous;
}
app.addEventListener("click",e=>{
 const button=e.target.closest("[data-action]");
 if(!button)return;
 const [scope,cmd,id,value]=button.dataset.action.split(":");
 if(scope==="share"){share(cmd);return;}
 if(scope==="print"){printDoc(cmd);return;}
 if(scope==="download"){if(finalFile)fileDownload(finalFile,finalFile.name);else toast("Select the lawyer-approved PDF first.");return;}
 if(cmd==="mark"){state[scope][id]=get(scope,id)===value?"":value;if(scope==="out")state.out.approved=false;}
 if(cmd==="key"){state[scope]["key"+id]=Math.max(0,Math.min(keys[id][2],num(get(scope,"key"+id))+Number(value)));}
 if(cmd==="meter"){state[scope][id]=get(scope,id+"Suggestion");if(scope==="out")state.out.approved=false;}
 
 if(cmd==="add")(state.out.others??=[]).push({name:"",amount:""});
 if(cmd==="remove"){state.out.others.splice(Number(id),1);state.out.approved=false;}
 if(cmd==="parse")toast(parseDetails(scope,id)?"Matched empty fields filled.":"No fields matched.");
 save();render();
});
window.addEventListener("hashchange",()=>{app.replaceChildren();render();window.scrollTo(0,0);});
render();






